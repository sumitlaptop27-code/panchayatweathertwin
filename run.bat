@echo off
echo.
echo ============================================================
echo   Panchayat WeatherTwin - SIH26074
echo   Jabalpur District, Madhya Pradesh
echo ============================================================
echo.

:: ── Generate data ──
echo [1/3] Generating panchayat fingerprints and advisory rules...
cd /d "%~dp0backend"
python data\generate_data.py
python data\generate_rules.py
echo.

:: ── Start backend ──
echo [2/3] Starting FastAPI backend on http://localhost:8000 ...
start "WeatherTwin Backend" cmd /k "python -m uvicorn main:app --reload --port 8000"
timeout /t 3 /nobreak >nul

:: ── Start frontend ──
echo [3/3] Starting Vite frontend on http://localhost:5173 ...
cd /d "%~dp0frontend"
if not exist node_modules (
    echo Installing frontend dependencies...
    call npm install
)
start "WeatherTwin Frontend" cmd /k "npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo ✓ Backend:  http://localhost:8000
echo ✓ Frontend: http://localhost:5173
echo ✓ API Docs: http://localhost:8000/docs
echo.
echo Press any key to exit this launcher (servers keep running in their windows)
pause >nul
