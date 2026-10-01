"""
Panchayat Fingerprint Generator for Jabalpur District, Madhya Pradesh.
Generates deterministic synthetic data for 3 blocks with realistic terrain fingerprints.
Run this script once to produce panchayats.json and panchayats.geojson.
"""
import json
import math
import random
from pathlib import Path

# ──────────────────────────────────────────────
# SEED for full determinism
# ──────────────────────────────────────────────
RNG = random.Random(42)

# ──────────────────────────────────────────────
# Block definitions (LGD codes are illustrative)
# ──────────────────────────────────────────────
BLOCKS = [
    {
        "block_id": "MP-JBP-01",
        "block_name": "Kundam",
        "block_name_hi": "कुंडम",
        "terrain": "hilly_forest",
        "center_lat": 23.05,
        "center_lon": 80.30,
        "lgd_code": 482001,
        # Terrain fingerprint ranges
        "elevation_range": (550, 820),
        "slope_range": (8, 22),
        "ndvi_range": (0.55, 0.85),
        "dist_water_range": (1.5, 8.0),
        "area_range": (12, 28),
        "n_panchayats": 12,
    },
    {
        "block_id": "MP-JBP-02",
        "block_name": "Panagar",
        "block_name_hi": "पनागर",
        "terrain": "flat_plains",
        "center_lat": 23.28,
        "center_lon": 79.75,
        "lgd_code": 482002,
        "elevation_range": (380, 430),
        "slope_range": (0, 4),
        "ndvi_range": (0.25, 0.55),
        "dist_water_range": (3.0, 15.0),
        "area_range": (18, 40),
        "n_panchayats": 12,
    },
    {
        "block_id": "MP-JBP-03",
        "block_name": "Bargi",
        "block_name_hi": "बरगी",
        "terrain": "riverine_reservoir",
        "center_lat": 22.98,
        "center_lon": 79.92,
        "lgd_code": 482003,
        "elevation_range": (390, 480),
        "slope_range": (2, 10),
        "ndvi_range": (0.40, 0.70),
        "dist_water_range": (0.2, 4.5),
        "area_range": (10, 22),
        "n_panchayats": 11,
    },
]

# ──────────────────────────────────────────────
# Panchayat name pools (English + Hindi)
# ──────────────────────────────────────────────
KUNDAM_NAMES = [
    ("Amarpur", "अमरपुर"), ("Bheempur", "भीमपुर"), ("Chandpur", "चंदपुर"),
    ("Devgaon", "देवगाँव"), ("Eklauta", "एकलौता"), ("Fulwari", "फुलवारी"),
    ("Ghansore", "घनसोर"), ("Hardunia", "हरदुनिया"), ("Itwa", "इटवा"),
    ("Jhiriya", "झिरिया"), ("Kolua", "कोलुआ"), ("Lalbagh", "लालबाग"),
]
PANAGAR_NAMES = [
    ("Amlai", "अमलाई"), ("Bhatera", "भटेरा"), ("Chhapri", "छपरी"),
    ("Dhanpuri", "धनपुरी"), ("Ekaiya", "एकैया"), ("Fagunia", "फगुनिया"),
    ("Ghunwa", "घुनवा"), ("Hirapur", "हिरापुर"), ("Indrapur", "इंद्रपुर"),
    ("Jamtara", "जमतारा"), ("Khamaria", "खमरिया"), ("Lalpur", "लालपुर"),
]
BARGI_NAMES = [
    ("Amkhera", "अमखेरा"), ("Banjari", "बंजारी"), ("Chandeli", "चंदेली"),
    ("Dhangoan", "धनगवाँ"), ("Ekatpur", "एकटपुर"), ("Fatehpur", "फतेहपुर"),
    ("Gotitoria", "गोतिटोरिया"), ("Hanumantiya", "हनुमंतिया"), ("Imliya", "इमलिया"),
    ("Jharnakachhar", "झरनाकचार"), ("Kadwai", "कडवाई"),
]

NAMES_MAP = {
    "MP-JBP-01": KUNDAM_NAMES,
    "MP-JBP-02": PANAGAR_NAMES,
    "MP-JBP-03": BARGI_NAMES,
}


def _rng_uniform(lo, hi):
    return round(RNG.uniform(lo, hi), 4)


def _rng_int(lo, hi):
    return RNG.randint(lo, hi)


def generate_panchayats():
    """Generate all panchayat fingerprints."""
    panchayats = []
    lgd_counter = 482100

    for block in BLOCKS:
        bid = block["block_id"]
        names = NAMES_MAP[bid]
        n = block["n_panchayats"]

        # Generate raw area weights, normalize so sum = 1.0 within block
        areas = [_rng_uniform(*block["area_range"]) for _ in range(n)]
        total_area = sum(areas)
        weights = [round(a / total_area, 6) for a in areas]
        # Correct last weight to ensure exact sum = 1.0
        weights[-1] = round(1.0 - sum(weights[:-1]), 6)

        for i in range(n):
            en_name, hi_name = names[i]
            # Scatter panchayat centers around block center
            lat = block["center_lat"] + _rng_uniform(-0.18, 0.18)
            lon = block["center_lon"] + _rng_uniform(-0.20, 0.20)

            elev = _rng_uniform(*block["elevation_range"])
            slope = _rng_uniform(*block["slope_range"])
            ndvi = _rng_uniform(*block["ndvi_range"])
            dist_w = _rng_uniform(*block["dist_water_range"])

            # Orographic rainfall multiplier (hilly -> higher rain)
            orographic_factor = 1.0 + (elev - 400) / 1000.0
            # Thermal mass factor (water proximity -> lower Tmax)
            thermal_factor = 1.0 - max(0, (5.0 - dist_w) / 50.0)

            lgd_counter += 1
            rec = {
                "panchayat_id": f"{bid}-P{i+1:02d}",
                "lgd_code": lgd_counter,
                "name": en_name,
                "name_hi": hi_name,
                "block_id": bid,
                "block_name": block["block_name"],
                "block_name_hi": block["block_name_hi"],
                "terrain": block["terrain"],
                "lat": round(lat, 5),
                "lon": round(lon, 5),
                "elevation_m": round(elev, 1),
                "slope_deg": round(slope, 2),
                "ndvi": round(ndvi, 3),
                "dist_water_km": round(dist_w, 2),
                "area_sqkm": round(areas[i], 2),
                "area_weight": weights[i],
                "orographic_factor": round(orographic_factor, 4),
                "thermal_factor": round(thermal_factor, 4),
            }
            panchayats.append(rec)

    return panchayats


def generate_geojson(panchayats):
    """Generate a GeoJSON FeatureCollection with simple bounding-box polygons."""
    features = []
    HALF_DEG = 0.055  # ~6 km half-width

    for p in panchayats:
        lat, lon = p["lat"], p["lon"]
        # Slight variance per panchayat for visual variety
        hw = HALF_DEG * _rng_uniform(0.6, 1.0)
        hh = HALF_DEG * _rng_uniform(0.6, 1.0)
        coords = [
            [lon - hw, lat - hh],
            [lon + hw, lat - hh],
            [lon + hw, lat + hh],
            [lon - hw, lat + hh],
            [lon - hw, lat - hh],
        ]
        feature = {
            "type": "Feature",
            "properties": {
                "panchayat_id": p["panchayat_id"],
                "lgd_code": p["lgd_code"],
                "name": p["name"],
                "name_hi": p["name_hi"],
                "block_id": p["block_id"],
                "block_name": p["block_name"],
                "terrain": p["terrain"],
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [coords],
            },
        }
        features.append(feature)

    return {"type": "FeatureCollection", "features": features}


if __name__ == "__main__":
    out_dir = Path(__file__).parent
    panchayats = generate_panchayats()

    # Save JSON fingerprints
    with open(out_dir / "panchayats.json", "w", encoding="utf-8") as f:
        json.dump(panchayats, f, ensure_ascii=False, indent=2)
    print(f"[OK] Saved {len(panchayats)} panchayat fingerprints -> panchayats.json")

    # Save GeoJSON
    geojson = generate_geojson(panchayats)
    with open(out_dir / "panchayats.geojson", "w", encoding="utf-8") as f:
        json.dump(geojson, f, ensure_ascii=False, indent=2)
    print(f"[OK] Saved GeoJSON -> panchayats.geojson")

    # Quick sanity: verify area weights sum to 1.0 per block
    from collections import defaultdict
    sums = defaultdict(float)
    for p in panchayats:
        sums[p["block_id"]] += p["area_weight"]
    for bid, s in sums.items():
        assert abs(s - 1.0) < 1e-4, f"Weight sum error in {bid}: {s}"
    print("[OK] Area-weight constraint verified (sum=1.0 per block)")
