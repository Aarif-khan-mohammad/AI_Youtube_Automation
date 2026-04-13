@echo off
echo Starting WealthFlip...
echo.

echo [1/2] Starting Python Media Backend on port 8000...
start "Python Backend" cmd /k "cd /d %~dp0 && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Next.js Frontend on port 3000...
start "Next.js Frontend" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo Both servers starting...
echo Python API: http://localhost:8000
echo Next.js App: http://localhost:3000
echo.
pause
