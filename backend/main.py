"""
Panchayat WeatherTwin – FastAPI Backend
SIH Problem Statement: SIH26074
"""
import csv
import json
from datetime import datetime, date
from pathlib import Path
from typing import List, Optional

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Local modules
from adapters.weather import get_block_forecast
from core.downscaling import (
    predict_raw, reconcile, classify_confidence,
    flag_anomaly, explain_rain_deviation, explain_tmax_deviation,
    compute_baselines,
)
from core.validation import generate_truth, build_validation_scorecard
from advisory.engine import (
    generate_advisories, get_all_advisories,
    approve_advisory, edit_advisory, simulate_sms_dispatch,
)

# ─────────────────────────────────────────────────
# Data paths
# ─────────────────────────────────────────────────
DATA_DIR = Path(__file__).parent / "data"
PANCHAYATS_PATH = DATA_DIR / "panchayats.json"
GEOJSON_PATH = DATA_DIR / "panchayats.geojson"
FEEDBACK_PATH = DATA_DIR / "feedback.csv"

# ─────────────────────────────────────────────────
# FastAPI app
# ─────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    global PANCHAYATS, GEOJSON
    PANCHAYATS = _load_panchayats()
    GEOJSON = _load_geojson()

    # Pre-seed feedback CSV header
    if not FEEDBACK_PATH.exists():
        FEEDBACK_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(FEEDBACK_PATH, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                "timestamp", "panchayat_id", "panchayat_name",
                "rained", "amount_mm", "farmer_note", "lat", "lon"
            ])

    # Pre-generate advisories for all blocks using demo data day-0
    for block in BLOCKS_INFO:
        fc = get_block_forecast(block["block_id"], day_index=0, adapter="demo")
        generate_advisories(
            block_id=block["block_id"],
            block_name=block["block_name"],
            block_rain=fc["block_rain_mm"],
            block_tmax=fc["block_tmax_c"],
        )

    print("[OK] Panchayat WeatherTwin API ready")
    yield  # App runs here


app = FastAPI(
    title="Panchayat WeatherTwin API",
    description="SIH26074 – Downscaling weather forecasts to Gram Panchayat level for agromet advisory services",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────
# Load static data
# ─────────────────────────────────────────────────
def _load_panchayats() -> List[dict]:
    if not PANCHAYATS_PATH.exists():
        # Auto-generate if missing
        import subprocess, sys
        subprocess.run(
            [sys.executable, str(DATA_DIR / "generate_data.py")],
            check=True, cwd=str(DATA_DIR)
        )
    with open(PANCHAYATS_PATH, encoding="utf-8") as f:
        return json.load(f)


def _load_geojson() -> dict:
    if not GEOJSON_PATH.exists():
        return {"type": "FeatureCollection", "features": []}
    with open(GEOJSON_PATH, encoding="utf-8") as f:
        return json.load(f)


PANCHAYATS: List[dict] = []
GEOJSON: dict = {}
BLOCKS_INFO = [
    {"block_id": "MP-JBP-01", "block_name": "Kundam", "block_name_hi": "कुंडम", "terrain": "hilly_forest"},
    {"block_id": "MP-JBP-02", "block_name": "Panagar", "block_name_hi": "पनागर", "terrain": "flat_plains"},
    {"block_id": "MP-JBP-03", "block_name": "Bargi", "block_name_hi": "बरगी", "terrain": "riverine_reservoir"},
]





# ─────────────────────────────────────────────────
# Helper: run full downscaling for a block
# ─────────────────────────────────────────────────
def _downscale_block(
    block_id: str,
    day_index: int = 0,
    adapter: str = "demo",
) -> dict:
    fc = get_block_forecast(block_id, day_index=day_index, adapter=adapter)
    block_rain = fc["block_rain_mm"]
    block_tmax = fc["block_tmax_c"]

    block_panchayats = [p for p in PANCHAYATS if p["block_id"] == block_id]
    weights = [p["area_weight"] for p in block_panchayats]

    # Step 1: raw predictions
    raw_rains, raw_tmaxs = [], []
    rain_lows, rain_highs, tmax_lows, tmax_highs = [], [], [], []

    for p in block_panchayats:
        rr, rl, rh, tr, tl, th = predict_raw(p, block_rain, block_tmax)
        raw_rains.append(rr)
        rain_lows.append(rl)
        rain_highs.append(rh)
        raw_tmaxs.append(tr)
        tmax_lows.append(tl)
        tmax_highs.append(th)

    # Step 2: reconciliation
    rec_rains, rec_valid_rain = reconcile(raw_rains, weights, block_rain, mode="ratio")
    rec_tmaxs, rec_valid_tmax = reconcile(raw_tmaxs, weights, block_tmax, mode="residual")
    reconciliation_valid = rec_valid_rain and rec_valid_tmax

    # Weighted sums for badge
    ws_rain = sum(w * r for w, r in zip(weights, rec_rains))
    ws_tmax = sum(w * t for w, t in zip(weights, rec_tmaxs))

    # Step 3: anomaly flags (run on all panchayats in block)
    anomalies = [
        flag_anomaly(i, block_panchayats, rec_rains, rec_tmaxs)
        for i in range(len(block_panchayats))
    ]

    # Step 4: build result rows
    results = []
    for i, p in enumerate(block_panchayats):
        baselines = compute_baselines(p, PANCHAYATS, block_rain, block_tmax)
        truth = generate_truth(p, block_rain, block_tmax)
        confidence_rain = classify_confidence(rain_lows[i], rain_highs[i], rec_rains[i], "rain")
        confidence_tmax = classify_confidence(tmax_lows[i], tmax_highs[i], rec_tmaxs[i], "temp")
        rain_explain = explain_rain_deviation(p, block_rain, rec_rains[i])
        tmax_explain = explain_tmax_deviation(p, block_tmax, rec_tmaxs[i])

        results.append({
            "panchayat_id": p["panchayat_id"],
            "lgd_code": p["lgd_code"],
            "name": p["name"],
            "name_hi": p["name_hi"],
            "block_id": p["block_id"],
            "block_name": p["block_name"],
            "block_name_hi": p["block_name_hi"],
            "terrain": p["terrain"],
            "lat": p["lat"],
            "lon": p["lon"],
            "elevation_m": p["elevation_m"],
            "slope_deg": p["slope_deg"],
            "ndvi": p["ndvi"],
            "dist_water_km": p["dist_water_km"],
            "area_weight": p["area_weight"],
            # Downscaled values
            "rain_mm": rec_rains[i],
            "rain_low_mm": round(rain_lows[i], 2),
            "rain_high_mm": round(rain_highs[i], 2),
            "tmax_c": rec_tmaxs[i],
            "tmax_low_c": round(tmax_lows[i], 2),
            "tmax_high_c": round(tmax_highs[i], 2),
            # Block-level baseline
            "block_rain_mm": block_rain,
            "block_tmax_c": block_tmax,
            # Baselines comparison
            "baselines": baselines,
            # Anomalies
            "anomaly": anomalies[i],
            # Confidence
            "confidence_rain": confidence_rain,
            "confidence_tmax": confidence_tmax,
            # Explainability
            "rain_explanation": rain_explain,
            "tmax_explanation": tmax_explain,
            # Synthetic truth for validation
            "truth": truth,
        })

    return {
        "block_id": block_id,
        "block_rain_mm": block_rain,
        "block_tmax_c": block_tmax,
        "forecast_date": fc["date"],
        "source": fc["source"],
        "reconciliation_valid": reconciliation_valid,
        "weighted_sum_rain_mm": round(ws_rain, 4),
        "weighted_sum_tmax_c": round(ws_tmax, 4),
        "panchayats": results,
    }


# ─────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────

@app.get("/api/blocks")
async def get_blocks():
    """List the 3 pilot blocks in Jabalpur District."""
    enriched = []
    for b in BLOCKS_INFO:
        fc = get_block_forecast(b["block_id"], day_index=0, adapter="demo")
        enriched.append({
            **b,
            "block_rain_mm": fc["block_rain_mm"],
            "block_tmax_c": fc["block_tmax_c"],
            "forecast_date": fc["date"],
            "n_panchayats": sum(1 for p in PANCHAYATS if p["block_id"] == b["block_id"]),
        })
    return JSONResponse({"blocks": enriched})


@app.get("/api/panchayats")
async def get_panchayats(
    block_id: Optional[str] = Query(None, description="Filter by block_id"),
    day_index: int = Query(0, ge=0, le=6),
    adapter: str = Query("demo", description="Weather adapter: demo|open_meteo|imd_mock"),
    format: str = Query("json", description="Response format: json|geojson"),
):
    """
    Return downscaled forecast for all panchayats (optionally filtered by block).
    Includes reconciliation badge, baselines, anomalies, and explainability.
    """
    if block_id and block_id not in [b["block_id"] for b in BLOCKS_INFO]:
        raise HTTPException(status_code=404, detail=f"Block '{block_id}' not found")

    target_blocks = [block_id] if block_id else [b["block_id"] for b in BLOCKS_INFO]
    all_results = []
    reconciliation_summary = {}

    for bid in target_blocks:
        block_data = _downscale_block(bid, day_index=day_index, adapter=adapter)
        all_results.extend(block_data["panchayats"])
        reconciliation_summary[bid] = {
            "block_rain_mm": block_data["block_rain_mm"],
            "block_tmax_c": block_data["block_tmax_c"],
            "weighted_sum_rain_mm": block_data["weighted_sum_rain_mm"],
            "weighted_sum_tmax_c": block_data["weighted_sum_tmax_c"],
            "reconciliation_valid": block_data["reconciliation_valid"],
            "forecast_date": block_data["forecast_date"],
            "source": block_data["source"],
        }

    if format == "geojson":
        # Merge forecast data into GeoJSON properties
        result_map = {r["panchayat_id"]: r for r in all_results}
        features = []
        for feat in GEOJSON.get("features", []):
            pid = feat["properties"]["panchayat_id"]
            if pid in result_map:
                r = result_map[pid]
                features.append({
                    **feat,
                    "properties": {
                        **feat["properties"],
                        "rain_mm": r["rain_mm"],
                        "tmax_c": r["tmax_c"],
                        "confidence_rain": r["confidence_rain"],
                        "anomaly_rain": r["anomaly"]["anomaly_rain"],
                    },
                })
        return JSONResponse({
            "type": "FeatureCollection",
            "features": features,
            "reconciliation": reconciliation_summary,
        })

    return JSONResponse({
        "panchayats": all_results,
        "reconciliation": reconciliation_summary,
        "total": len(all_results),
    })


@app.get("/api/advisories")
async def list_advisories(block_id: Optional[str] = None):
    """List all advisories (DRAFT and APPROVED)."""
    return JSONResponse({"advisories": get_all_advisories(block_id=block_id)})


@app.post("/api/advisories/{advisory_id}/approve")
async def approve(advisory_id: str, officer: str = "AgroMet Officer"):
    adv = approve_advisory(advisory_id, officer=officer)
    if not adv:
        raise HTTPException(status_code=404, detail="Advisory not found")
    return JSONResponse(adv)


@app.post("/api/advisories/{advisory_id}/edit")
async def edit(advisory_id: str, request: Request):
    body = await request.json()
    adv = edit_advisory(
        advisory_id,
        new_text_en=body.get("advice_en"),
        new_text_hi=body.get("advice_hi"),
        new_sms_en=body.get("sms_en"),
        new_sms_hi=body.get("sms_hi"),
    )
    if not adv:
        raise HTTPException(status_code=404, detail="Advisory not found")
    return JSONResponse(adv)


@app.post("/api/advisories/{advisory_id}/dispatch")
async def dispatch_sms(advisory_id: str):
    result = simulate_sms_dispatch(advisory_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return JSONResponse(result)


# ─────────────────────────────────────────────────
# Farmer Feedback endpoint
# ─────────────────────────────────────────────────
class FeedbackPayload(BaseModel):
    panchayat_id: str
    panchayat_name: str
    rained: bool
    amount_mm: Optional[float] = None
    farmer_note: Optional[str] = ""
    lat: Optional[float] = None
    lon: Optional[float] = None


@app.post("/api/feedback/rain")
async def submit_feedback(payload: FeedbackPayload):
    """Farmer ground-truth feedback: 'Did it rain today?'"""
    row = [
        datetime.utcnow().isoformat(),
        payload.panchayat_id,
        payload.panchayat_name,
        "Yes" if payload.rained else "No",
        payload.amount_mm or "",
        payload.farmer_note or "",
        payload.lat or "",
        payload.lon or "",
    ]
    with open(FEEDBACK_PATH, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(row)

    return JSONResponse({
        "success": True,
        "message": "Feedback recorded. Thank you!",
        "panchayat_id": payload.panchayat_id,
        "rained": payload.rained,
        "timestamp": row[0],
    })


@app.get("/api/feedback/log")
async def get_feedback_log(limit: int = 50):
    """Get the ground-truth feedback log."""
    if not FEEDBACK_PATH.exists():
        return JSONResponse({"entries": []})
    entries = []
    with open(FEEDBACK_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            entries.append(row)
    return JSONResponse({"entries": entries[-limit:], "total": len(entries)})


# ─────────────────────────────────────────────────
# Validation Scorecard endpoint
# ─────────────────────────────────────────────────
@app.get("/api/validation-scorecard")
async def get_validation_scorecard(
    day_index: int = Query(0, ge=0, le=6),
    adapter: str = Query("demo"),
):
    """
    Held-out validation scorecard:
    WeatherTwin vs Block-Copy vs IDW, grouped by terrain type.
    """
    all_results = []
    for block in BLOCKS_INFO:
        bd = _downscale_block(block["block_id"], day_index=day_index, adapter=adapter)
        all_results.extend(bd["panchayats"])

    scorecard = build_validation_scorecard(PANCHAYATS, all_results)
    return JSONResponse({"scorecard": scorecard, "day_index": day_index})


# ─────────────────────────────────────────────────
# Health check
# ─────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "service": "Panchayat WeatherTwin",
        "sih_id": "SIH26074",
        "panchayats_loaded": len(PANCHAYATS),
        "timestamp": datetime.utcnow().isoformat(),
    }
