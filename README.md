# Panchayat WeatherTwin — SIH26074

> **Downscaling weather forecasts from Block level to Gram Panchayat level for agro-meteorological advisory services**
> 
> Region: Jabalpur District, Madhya Pradesh | Pilot: 35 Gram Panchayats across 3 contrasting blocks

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+ (3.13 tested)
- Node.js 18+

### 1-Command Launch (Windows)
```bat
run.bat
```

### Manual Launch

**Backend (Terminal 1):**
```powershell
cd backend
python data/generate_data.py    # Generate panchayat fingerprints
python data/generate_rules.py   # Generate advisory rules
python -m uvicorn main:app --reload --port 8000
```

**Frontend (Terminal 2):**
```powershell
cd frontend
npm install
npm run dev
```

- **Frontend:** http://localhost:5173  
- **Backend API:** http://localhost:8000  
- **Swagger Docs:** http://localhost:8000/docs

---

## 📁 Project Structure

```
sih mvp2/
├── backend/
│   ├── main.py                  # FastAPI app, all endpoints
│   ├── requirements.txt
│   ├── adapters/
│   │   └── weather.py           # Pluggable weather ingestion (demo/open_meteo/imd_mock)
│   ├── core/
│   │   ├── downscaling.py       # ML models + reconciliation + anomaly detection
│   │   └── validation.py        # Scorecard generator
│   ├── advisory/
│   │   └── engine.py            # Rule engine + DRAFT/APPROVE workflow
│   └── data/
│       ├── generate_data.py     # Panchayat fingerprint generator
│       ├── generate_rules.py    # Advisory rules generator
│       ├── panchayats.json      # Generated: 35 panchayat fingerprints
│       ├── panchayats.geojson   # Generated: GeoJSON polygons
│       ├── advisory_rules.json  # Generated: ICAR/KVK rule table
│       └── feedback.csv         # Farmer ground-truth log (auto-created)
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Main app (header, map, tabbed panel)
│   │   ├── api.js               # API service layer
│   │   ├── i18n.js              # English/Hindi translations
│   │   ├── utils.js             # Color scales, formatters
│   │   └── components/
│   │       ├── WeatherMap.jsx        # Leaflet choropleth map
│   │       ├── PanchayatInspector.jsx # Forecast details + baselines
│   │       ├── AgrometStudio.jsx     # Officer advisory console
│   │       ├── FarmerFeedback.jsx    # Farmer ground-truth input
│   │       └── ValidationScorecard.jsx # MAE/RMSE bar charts
│   └── package.json
├── run.bat                      # Windows launcher
└── run.sh                       # Unix launcher
```

---

## 🏗️ Architecture

### Module A: Data & Fingerprints
- 35 Gram Panchayats across 3 blocks: **Kundam** (hilly/forest), **Panagar** (flat plains), **Bargi** (riverine/reservoir)
- Static features: elevation, slope, NDVI, distance to water, lat/lon, area weights
- Area weights sum to 1.0 per block (conservation constraint)
- GeoJSON polygons for Leaflet rendering

### Module B: Downscaling Engine
- **Rain model**: Ratio-based (`r = (y+1)/(B+1)`) with orographic lift physics
- **Tmax model**: Residual-based (`d = y - B`) with lapse rate and thermal buffering
- **Reconciliation**: Area-weighted conservation guarantee (`Σ w_p × y_p ≡ B ±1e-5`)
- **Anomaly detection**: Robust z-score against 4 nearest neighbours (|z|≥2.5 + gap threshold)
- **Explainability**: Top-2 feature contributors per panchayat

### Module C: Advisory Engine
- ICAR/KVK rule lookup table (9 rules for Soybean + Wheat)
- Workflow: `DRAFT → EDIT → APPROVE → Dispatch`
- SMS preview with 160-char limit enforcement
- Hindi + English bilingual advisories

### Module D: FastAPI Endpoints
| Endpoint | Description |
|----------|-------------|
| `GET /api/blocks` | List 3 pilot blocks with forecasts |
| `GET /api/panchayats` | Full downscaled forecast (JSON or GeoJSON) |
| `GET /api/advisories` | List all advisories |
| `POST /api/advisories/{id}/approve` | Approve an advisory |
| `POST /api/advisories/{id}/edit` | Edit SMS text |
| `POST /api/advisories/{id}/dispatch` | Simulate SMS dispatch |
| `POST /api/feedback/rain` | Farmer ground-truth feedback |
| `GET /api/feedback/log` | View feedback log |
| `GET /api/validation-scorecard` | MAE/RMSE scorecard by terrain |

---

## 🌐 Weather Adapter

Switch adapter via query param: `?adapter=demo|open_meteo|imd_mock`

- **`demo`** (default): Fully seeded offline data — works without internet
- **`open_meteo`**: Live Open-Meteo API (free, no key required)
- **`imd_mock`**: Simulates bias-corrected IMD-style data

---

## ⚠️ Disclaimer
This is a **prototype demonstration** for SIH26074. All data is synthetic/derived from physics-based models. It is **not** an operational IMD forecast and should not be used for real agricultural decisions.
