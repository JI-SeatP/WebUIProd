@echo off
title WebUIProd Dev Server Restart (TEST)

echo ========================================
echo   WebUIProd Dev Server Restart (TEST)
echo ========================================
echo   API:    http://127.0.0.1:3001  (Express / SQL)
echo   UI:     http://127.0.0.1:5174  (Vite test_env)
echo   DB:     TS_SEATPL / TS_SEATPL_EXT
echo ========================================
echo.

:: ── Step 1: Kill API server on port 3001 ──────────────────────────────────────
echo [1/4] Stopping API server on port 3001...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001 " ^| findstr "LISTENING"') do (
    echo        Found PID %%a - stopping...
    taskkill /PID %%a /F >nul 2>&1
    echo        Stopped.
)
echo.

:: ── Step 2: Kill Vite test_env on port 5174 ───────────────────────────────────
echo [2/4] Stopping Vite test_env on port 5174...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5174 " ^| findstr "LISTENING"') do (
    echo        Found PID %%a - stopping...
    taskkill /PID %%a /F >nul 2>&1
    echo        Stopped.
)
echo.

:: Brief pause so ports are fully released before restarting
timeout /t 2 /nobreak >nul

:: ── Step 3: Start Express API server ──────────────────────────────────────────
echo [3/4] Starting API server (server/api.cjs)...
start "WebUIProd API :3001" cmd /k "cd /d %~dp0 && node server/api.cjs"
echo.

:: ── Step 4: Start Vite test_env on port 5174 ──────────────────────────────────
echo [4/4] Starting Vite test_env on port 5174...
start "WebUIProd Vite :5174 (test_env)" cmd /k "cd /d %~dp0 && node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5174"
echo.

echo ========================================
echo   Both servers starting...
echo   Open: http://127.0.0.1:5174
echo ========================================
echo.
