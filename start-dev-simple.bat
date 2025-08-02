@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo    ZK-Agent Development Environment
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
    ) else (
        echo [ERROR] .env.example file not found
        pause
        exit /b 1
    )
) else (
    echo [OK] .env file exists
)

echo.
echo [INFO] Installing dependencies...

REM Install frontend dependencies
echo [INFO] Installing frontend dependencies...
pnpm install
if %errorLevel% neq 0 (
    echo [ERROR] Frontend dependencies installation failed
    pause
    exit /b 1
)
echo [OK] Frontend dependencies ready

REM Setup Python virtual environment
echo [INFO] Setting up Python virtual environment...
cd backend
if not exist ".venv" (
    python -m venv .venv
    if %errorLevel% neq 0 (
        echo [ERROR] Python virtual environment creation failed
        cd ..
        pause
        exit /b 1
    )
)

REM Install Python dependencies
echo [INFO] Installing Python dependencies...
call .venv\Scripts\activate.bat
pip install -r requirements.txt
if %errorLevel% neq 0 (
    echo [ERROR] Python dependencies installation failed
    cd ..
    pause
    exit /b 1
)
cd ..
echo [OK] Python dependencies ready

echo.
echo [INFO] Initializing database...

REM Generate Prisma client and push schema
pnpm run db:generate
pnpm run db:push

echo.
echo [INFO] Starting services...

REM Start Python backend
echo [INFO] Starting Python backend service...
start "ZK-Agent Backend" cmd /k "cd /d %PROJECT_ROOT%backend && call .venv\Scripts\activate.bat && python main.py"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start Next.js frontend
echo [INFO] Starting Next.js frontend service...
start "ZK-Agent Frontend" cmd /k "cd /d %PROJECT_ROOT% && pnpm run dev"

echo [OK] Services starting...
echo.
echo ========================================
echo    ZK-Agent Development Environment Ready
echo ========================================
echo.
echo Service URLs:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8000
echo.
echo [INFO] Opening browser...
timeout /t 5 /nobreak >nul
start http://localhost:3000

echo [SUCCESS] Development environment is ready!
echo.
pause