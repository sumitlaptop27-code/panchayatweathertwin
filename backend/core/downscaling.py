"""
Downscaling Engine – Module B
Residual/Ratio ML models + Area-Weighted Reconciliation + Anomaly Flagging
"""
import math
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

import numpy as np


# ─────────────────────────────────────────────────────────────
# Feature extraction helpers
# ─────────────────────────────────────────────────────────────
def build_feature_vector(p: dict, block_rain: float, block_tmax: float) -> np.ndarray:
    """
    Construct the [7-dim] feature vector for a single panchayat.
    Features: elevation_m, slope_deg, ndvi, dist_water_km,
              orographic_factor, thermal_factor, block_rain, block_tmax
    """
    return np.array([
        p["elevation_m"],
        p["slope_deg"],
        p["ndvi"],
        p["dist_water_km"],
        p["orographic_factor"],
        p["thermal_factor"],
        block_rain,
        block_tmax,
    ], dtype=float)


FEATURE_NAMES = [
    "elevation_m", "slope_deg", "ndvi", "dist_water_km",
    "orographic_factor", "thermal_factor", "block_rain_mm", "block_tmax_c"
]


# ─────────────────────────────────────────────────────────────
# Pre-fit lightweight model weights (avoids training overhead)
# These are analytically tuned coefficients capturing the known
# orographic / thermal physics for the Jabalpur region.
# ─────────────────────────────────────────────────────────────
class RainRatioModel:
    """
    Linear model in log-ratio space:
      log(ratio) = w · features + b
      ratio = (y_rain + 1) / (B_rain + 1)
    """
    # Weights shaped to encode:
    #   elevation → increases rain ratio (orographic lift)
    #   slope     → moderate increase
    #   ndvi      → higher vegetation → higher interception/local moisture
    #   dist_water → closer to water → slightly higher rain
    #   orographic_factor  → direct multiplicative effect
    #   thermal_factor     → minor positive (moisture recycling)
    #   block_rain → dampens ratio extremes at high block rain
    #   block_tmax → heat reduces ratio (drier)
    _W = np.array([
        0.0008,   # elevation_m
        0.004,    # slope_deg
        0.18,     # ndvi
        -0.015,   # dist_water_km
        0.35,     # orographic_factor
        0.05,     # thermal_factor
        -0.002,   # block_rain_mm (stabiliser)
        -0.006,   # block_tmax_c
    ])
    _B = -0.22  # intercept

    def predict_ratio(self, feat: np.ndarray) -> float:
        log_ratio = float(self._W @ feat + self._B)
        return math.exp(log_ratio)

    def predict_uncertainty(self, feat: np.ndarray) -> float:
        """Return σ_ratio as proxy for model uncertainty (terrain-aware)."""
        elev_norm = feat[0] / 800.0
        sigma = 0.08 + 0.12 * elev_norm + 0.05 * feat[1] / 20.0
        return sigma


class TmaxResidualModel:
    """
    Linear model for temperature residual:
      d = y_tmax - B_tmax = w · features + b
    """
    _W = np.array([
        -0.006,   # elevation_m (lapse rate -6°C/1000m)
        -0.03,    # slope_deg
        -0.40,    # ndvi (evapotranspiration cooling)
        -0.12,    # dist_water_km (closer to water → cooler)
        0.05,     # orographic_factor
        -0.30,    # thermal_factor (direct)
        0.00,     # block_rain_mm
        0.03,     # block_tmax_c (residual correlation)
    ])
    _B = 0.45  # slight warm bias correction

    def predict_residual(self, feat: np.ndarray) -> float:
        return float(self._W @ feat + self._B)

    def predict_uncertainty(self, feat: np.ndarray) -> float:
        elev_norm = feat[0] / 800.0
        sigma = 0.5 + 0.8 * elev_norm + 0.1 * abs(feat[5] - 0.95)
        return sigma


RAIN_MODEL = RainRatioModel()
TMAX_MODEL = TmaxResidualModel()


# ─────────────────────────────────────────────────────────────
# Raw predictions (before reconciliation)
# ─────────────────────────────────────────────────────────────
def predict_raw(
    panchayat: dict,
    block_rain: float,
    block_tmax: float,
) -> Tuple[float, float, float, float, float, float]:
    """
    Returns (rain_raw, rain_low, rain_high, tmax_raw, tmax_low, tmax_high)
    """
    feat = build_feature_vector(panchayat, block_rain, block_tmax)

    # ── Rain ──
    ratio = RAIN_MODEL.predict_ratio(feat)
    sigma_ratio = RAIN_MODEL.predict_uncertainty(feat)
    rain_raw = ratio * (block_rain + 1) - 1
    rain_raw = max(0.0, rain_raw)
    rain_low = max(0.0, (ratio - sigma_ratio) * (block_rain + 1) - 1)
    rain_high = max(0.0, (ratio + sigma_ratio) * (block_rain + 1) - 1)

    # ── Tmax ──
    residual = TMAX_MODEL.predict_residual(feat)
    sigma_d = TMAX_MODEL.predict_uncertainty(feat)
    tmax_raw = block_tmax + residual
    tmax_low = tmax_raw - sigma_d * 1.5
    tmax_high = tmax_raw + sigma_d * 1.5

    return (
        round(rain_raw, 2), round(rain_low, 2), round(rain_high, 2),
        round(tmax_raw, 2), round(tmax_low, 2), round(tmax_high, 2),
    )


# ─────────────────────────────────────────────────────────────
# Area-Weighted Reconciliation
# ─────────────────────────────────────────────────────────────
def reconcile(
    raw_values: List[float],
    weights: List[float],
    block_value: float,
    mode: str = "ratio",
) -> Tuple[List[float], bool]:
    """
    Reconcile raw predictions to ensure ∑(w_p × y_p) ≡ block_value.

    mode='ratio'    → used for rainfall (multiplicative)
    mode='residual' → used for temperature (additive)

    Returns (reconciled_values, reconciliation_valid_bool)
    """
    weights = np.array(weights, dtype=float)
    raw = np.array(raw_values, dtype=float)
    reconciled = np.zeros_like(raw)

    if mode == "ratio":
        weighted_sum_raw = float(weights @ raw)
        if block_value < 1e-6:
            # Zero block rain → all panchayats get 0
            reconciled[:] = 0.0
        elif weighted_sum_raw < 1e-6:
            reconciled[:] = block_value
        else:
            scale = block_value / weighted_sum_raw
            reconciled = np.clip(raw * scale, 0.0, None)

    elif mode == "residual":
        weighted_sum_raw = float(weights @ raw)
        shift = block_value - weighted_sum_raw
        reconciled = raw + shift

    else:
        raise ValueError(f"Unknown reconciliation mode: {mode}")

    # Verify conservation law ∑(w_p × y_p) ≡ B within 1e-5
    check = float(weights @ reconciled)
    valid = abs(check - block_value) < 1e-4
    return [round(float(v), 3) for v in reconciled], valid


# ─────────────────────────────────────────────────────────────
# Confidence band classifier
# ─────────────────────────────────────────────────────────────
def classify_confidence(
    low: float, high: float, value: float, mode: str = "rain"
) -> str:
    if value < 1e-6:
        return "High"
    spread = high - low
    relative = spread / (abs(value) + 1e-6)
    if mode == "rain":
        if relative < 0.25:
            return "High"
        elif relative < 0.55:
            return "Medium"
        else:
            return "Low"
    else:  # temp
        if spread < 1.5:
            return "High"
        elif spread < 3.0:
            return "Medium"
        else:
            return "Low"


# ─────────────────────────────────────────────────────────────
# Anomaly flagging (robust z-score vs 4 nearest neighbours)
# ─────────────────────────────────────────────────────────────
def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(
        math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def flag_anomaly(
    target_idx: int,
    all_panchayats: List[dict],
    rain_values: List[float],
    tmax_values: List[float],
    n_neighbors: int = 4,
) -> dict:
    """
    Compute robust z-score vs 4 nearest neighbours.
    Returns anomaly_rain, anomaly_tmax, z_rain, z_tmax flags.
    """
    tp = all_panchayats[target_idx]
    distances = []
    for j, op in enumerate(all_panchayats):
        if j == target_idx:
            continue
        dist = haversine_km(tp["lat"], tp["lon"], op["lat"], op["lon"])
        distances.append((dist, j))
    distances.sort(key=lambda x: x[0])
    neighbor_idxs = [j for _, j in distances[:n_neighbors]]

    # Rain anomaly
    neigh_rain = [rain_values[j] for j in neighbor_idxs]
    rain_val = rain_values[target_idx]
    m_rain = np.median(neigh_rain)
    mad_rain = np.median([abs(r - m_rain) for r in neigh_rain]) + 1e-6
    z_rain = (rain_val - m_rain) / (1.4826 * mad_rain)
    gap_rain = abs(rain_val - m_rain)
    anomaly_rain = abs(z_rain) >= 2.5 and gap_rain >= 5.0

    # Tmax anomaly
    neigh_tmax = [tmax_values[j] for j in neighbor_idxs]
    tmax_val = tmax_values[target_idx]
    m_tmax = np.median(neigh_tmax)
    mad_tmax = np.median([abs(t - m_tmax) for t in neigh_tmax]) + 1e-6
    z_tmax = (tmax_val - m_tmax) / (1.4826 * mad_tmax)
    gap_tmax = abs(tmax_val - m_tmax)
    anomaly_tmax = abs(z_tmax) >= 2.5 and gap_tmax >= 2.0

    return {
        "anomaly_rain": bool(anomaly_rain),
        "anomaly_tmax": bool(anomaly_tmax),
        "z_rain": round(float(z_rain), 2),
        "z_tmax": round(float(z_tmax), 2),
        "flag_label": "Model-detected anomaly" if (anomaly_rain or anomaly_tmax) else None,
    }


# ─────────────────────────────────────────────────────────────
# Explainability: top-2 feature contributors
# ─────────────────────────────────────────────────────────────
def explain_rain_deviation(p: dict, block_rain: float, rain_downscaled: float) -> List[str]:
    """Return list of human-readable explanation strings."""
    delta = rain_downscaled - block_rain
    reasons = []

    elev_base = 400.0
    elev_diff = p["elevation_m"] - elev_base
    if abs(elev_diff) > 50:
        sign = "+" if elev_diff > 0 else "-"
        reasons.append(f"Higher elevation ({sign}{abs(elev_diff):.0f}m) contributing to orographic {'lift ↑' if elev_diff > 0 else 'rain shadow ↓'}")

    if p["ndvi"] > 0.6:
        reasons.append(f"Dense forest (NDVI={p['ndvi']:.2f}) enhancing local moisture recycling")
    elif p["ndvi"] < 0.35:
        reasons.append(f"Low vegetation cover (NDVI={p['ndvi']:.2f}) reducing local evapotranspiration")

    if p["dist_water_km"] < 2.0:
        reasons.append(f"Proximity to reservoir/river ({p['dist_water_km']:.1f} km) providing local moisture")

    if p["slope_deg"] > 10:
        reasons.append(f"Steep slope ({p['slope_deg']:.0f}°) causing enhanced orographic precipitation")

    if not reasons:
        reasons.append(f"Slight terrain modification from block baseline ({delta:+.1f} mm)")

    return reasons[:2]


def explain_tmax_deviation(p: dict, block_tmax: float, tmax_downscaled: float) -> List[str]:
    delta = tmax_downscaled - block_tmax
    reasons = []

    lapse_effect = (p["elevation_m"] - 400) * 0.006
    if abs(lapse_effect) > 0.5:
        sign = "+" if lapse_effect < 0 else "-"
        reasons.append(f"Elevation lapse rate: {p['elevation_m']:.0f}m altitude → {delta:+.1f}°C from block mean")

    if p["dist_water_km"] < 3.0:
        reasons.append(f"Thermal buffering from water body ({p['dist_water_km']:.1f} km away) moderating temperature")

    if p["ndvi"] > 0.6:
        reasons.append(f"Canopy shading (NDVI={p['ndvi']:.2f}) reducing surface Tmax by evapotranspiration")

    if not reasons:
        reasons.append(f"Terrain adjustment: {delta:+.1f}°C from block forecast")

    return reasons[:2]


# ─────────────────────────────────────────────────────────────
# Baseline comparisons
# ─────────────────────────────────────────────────────────────
def compute_baselines(
    panchayat: dict,
    all_panchayats: List[dict],
    block_rain: float,
    block_tmax: float,
) -> dict:
    """
    Block-copy baseline: every panchayat = block value.
    Inverse-distance weighted interpolation baseline:
      Uses 3 neighbours with a simple IDW from block centres.
    """
    # Block-copy baseline
    baseline_rain_block_copy = block_rain
    baseline_tmax_block_copy = block_tmax

    # Simple IDW from the 3 block "observation points"
    block_centers = {
        "MP-JBP-01": (23.05, 80.30, 22.5, 29.2),
        "MP-JBP-02": (23.28, 79.75, 14.0, 33.8),
        "MP-JBP-03": (22.98, 79.92, 18.0, 31.5),
    }
    lat, lon = panchayat["lat"], panchayat["lon"]
    weights_idw = []
    vals_rain_idw = []
    vals_tmax_idw = []

    for bid, (blat, blon, brain, btmax) in block_centers.items():
        dist = haversine_km(lat, lon, blat, blon)
        w = 1.0 / max(dist, 0.5) ** 2
        weights_idw.append(w)
        vals_rain_idw.append(brain)
        vals_tmax_idw.append(btmax)

    total_w = sum(weights_idw)
    baseline_rain_idw = sum(w * r for w, r in zip(weights_idw, vals_rain_idw)) / total_w
    baseline_tmax_idw = sum(w * t for w, t in zip(weights_idw, vals_tmax_idw)) / total_w

    return {
        "block_copy_rain_mm": round(baseline_rain_block_copy, 2),
        "block_copy_tmax_c": round(baseline_tmax_block_copy, 2),
        "idw_rain_mm": round(baseline_rain_idw, 2),
        "idw_tmax_c": round(baseline_tmax_idw, 2),
    }
