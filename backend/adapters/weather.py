"""
Weather ingestion adapters.
Supports: 'demo' (fully seeded offline), 'open_meteo' (live API), 'imd_mock'
"""
import math
import random
from datetime import date, timedelta
from typing import Optional

import httpx

# ─────────────────────────────────────────────
# Block baseline forecasts (Block-level, 7-day)
# ─────────────────────────────────────────────
DEMO_FORECASTS = {
    "MP-JBP-01": {  # Kundam – hilly/forest
        "block_rain_mm": [22.5, 8.0, 34.0, 0.0, 12.0, 18.5, 5.5],
        "block_tmax_c": [29.2, 31.0, 27.8, 33.5, 32.1, 28.9, 30.4],
    },
    "MP-JBP-02": {  # Panagar – flat plains
        "block_rain_mm": [14.0, 4.5, 25.0, 0.0, 7.5, 12.0, 3.0],
        "block_tmax_c": [33.8, 35.2, 31.5, 37.0, 35.8, 32.6, 34.1],
    },
    "MP-JBP-03": {  # Bargi – riverine
        "block_rain_mm": [18.0, 6.0, 29.5, 0.0, 10.0, 15.0, 4.5],
        "block_tmax_c": [31.5, 33.0, 29.2, 35.0, 33.8, 30.5, 32.0],
    },
}


def get_block_forecast(
    block_id: str,
    day_index: int = 0,
    adapter: str = "demo",
    date_str: Optional[str] = None,
) -> dict:
    """
    Returns block-level forecast dict:
        { block_id, block_rain_mm, block_tmax_c, source, date }
    adapter: 'demo' | 'open_meteo' | 'imd_mock'
    """
    target_date = date_str or str(date.today() + timedelta(days=day_index))

    if adapter == "demo":
        return _demo_adapter(block_id, day_index, target_date)
    elif adapter == "open_meteo":
        return _open_meteo_adapter(block_id, day_index, target_date)
    elif adapter == "imd_mock":
        return _imd_mock_adapter(block_id, day_index, target_date)
    else:
        raise ValueError(f"Unknown adapter: {adapter}")


# ─────────────────────────────────────────────────
# Demo adapter (deterministic seeded data)
# ─────────────────────────────────────────────────
def _demo_adapter(block_id: str, day_index: int, target_date: str) -> dict:
    fc = DEMO_FORECASTS.get(block_id, {})
    rain = fc.get("block_rain_mm", [10.0] * 7)
    tmax = fc.get("block_tmax_c", [32.0] * 7)
    idx = day_index % len(rain)
    return {
        "block_id": block_id,
        "block_rain_mm": rain[idx],
        "block_tmax_c": tmax[idx],
        "source": "demo",
        "date": target_date,
    }


# ─────────────────────────────────────────────────
# Open-Meteo adapter (live, no API key required)
# ─────────────────────────────────────────────────
BLOCK_COORDS = {
    "MP-JBP-01": (23.05, 80.30),
    "MP-JBP-02": (23.28, 79.75),
    "MP-JBP-03": (22.98, 79.92),
}


def _open_meteo_adapter(block_id: str, day_index: int, target_date: str) -> dict:
    lat, lon = BLOCK_COORDS.get(block_id, (23.18, 79.95))
    start = date.today().isoformat()
    end = (date.today() + timedelta(days=6)).isoformat()
    url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        f"&daily=precipitation_sum,temperature_2m_max"
        f"&timezone=Asia%2FKolkata"
        f"&start_date={start}&end_date={end}"
    )
    try:
        resp = httpx.get(url, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        idx = min(day_index, len(data["daily"]["time"]) - 1)
        return {
            "block_id": block_id,
            "block_rain_mm": data["daily"]["precipitation_sum"][idx] or 0.0,
            "block_tmax_c": data["daily"]["temperature_2m_max"][idx] or 32.0,
            "source": "open_meteo",
            "date": data["daily"]["time"][idx],
        }
    except Exception as e:
        # Graceful fallback to demo on network errors
        print(f"[open_meteo] Error: {e} – falling back to demo")
        return _demo_adapter(block_id, day_index, target_date)


# ─────────────────────────────────────────────────
# IMD mock adapter (simulates bias-corrected IMD data)
# ─────────────────────────────────────────────────
def _imd_mock_adapter(block_id: str, day_index: int, target_date: str) -> dict:
    base = _demo_adapter(block_id, day_index, target_date)
    rng = random.Random(hash((block_id, day_index, "imd")) % (2**32))
    # IMD mock adds a small systematic bias
    base["block_rain_mm"] = round(base["block_rain_mm"] * rng.uniform(0.9, 1.15), 1)
    base["block_tmax_c"] = round(base["block_tmax_c"] + rng.uniform(-0.5, 0.8), 1)
    base["source"] = "imd_mock"
    return base
