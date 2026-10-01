# Panchayat WeatherTwin – Startup Script
# SIH26074 | Jabalpur District, Madhya Pradesh

set -e

echo ""
echo "============================================================"
echo "  Panchayat WeatherTwin - SIH26074"
echo "  Jabalpur District, Madhya Pradesh"
echo "============================================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Generate data ──
echo "[1/3] Generating panchayat fingerprints..."
cd "$SCRIPT_DIR/backend"
python data/generate_data.py
python data/generate_rules.py
echo ""

# ── Start backend ──
echo "[2/3] Starting FastAPI backend on http://localhost:8000 ..."
python -m uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
sleep 2

# ── Start frontend ──
echo "[3/3] Starting Vite frontend on http://localhost:5173 ..."
cd "$SCRIPT_DIR/frontend"
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✓ Backend:  http://localhost:8000"
echo "✓ Frontend: http://localhost:5173"
echo "✓ API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"

# Cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
