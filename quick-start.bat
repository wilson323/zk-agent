@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo    ZK-Agent Quick Start
echo ========================================
echo.

REM Set project root directory
set "PROJECT_ROOT=%~dp0"
cd /d "%PROJECT_ROOT%"

echo [INFO] Project root: %PROJECT_ROOT%
echo.

REM Check .env file
if not exist ".env" (
    if exist ".env.example" (
        echo [INFO] Copying .env.example to .env
        copy ".env.example" ".env" >nul
        echo [WARNING] Please configure .env file with your settings
    )
)

echo [INFO] Starting services...
echo.

REM Start Python backend
echo [INFO] Starting Python backend service...
if exist "backend\.venv\Scripts\activate.bat" (
    start "ZK-Agent Backend" cmd /k "cd /d %PROJECT_ROOT%backend && call .venv\Scripts\activate.bat && python main.py"
) else (
    echo [WARNING] Python virtual environment not found
    echo [INFO] Please run setup-dev.bat first to install dependencies
)

REM Wait a moment
timeout /t 3 /nobreak >nul

REM Start Next.js frontend
echo [INFO] Starting Next.js frontend service...
if exist "node_modules" (
    start "ZK-Agent Frontend" cmd /k "cd /d %PROJECT_ROOT% && pnpm run dev"
) else (
    echo [WARNING] Node modules not found
    echo [INFO] Please run setup-dev.bat first to install dependencies
)

echo.
echo ========================================
echo    Services Starting
echo ========================================
echo.
echo Service URLs:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8000
echo.
echo [INFO] Opening browser in 10 seconds...
timeout /t 10 /nobreak >nul
start http://localhost:3000

echo [INFO] Services are starting up...
echo [INFO] If services don't start, run setup-dev.bat first
echo.
pause