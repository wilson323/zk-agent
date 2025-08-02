@echo off
setlocal enabledelayedexpansion

REM ====================================
REM ZK-Agent Development Environment Startup Script
REM ====================================
REM Features:
REM - Auto check and install dependencies
REM - Create and initialize database
REM - Start Next.js frontend service
REM - Start Python backend service
REM - Start Redis cache service
REM - Provide health check and status monitoring
REM ====================================

echo.
echo ========================================
echo    ZK-Agent Development Environment
echo ========================================
echo.

REM Check admin privileges (optional for development)
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [WARNING] Running without administrator privileges
    echo [INFO] Some features may require elevated permissions
) else (
    echo [OK] Running with administrator privileges
)

REM Set project root directory
set "PROJECT_ROOT=%~dp0"
cd /d "%PROJECT_ROOT%"

echo [INFO] Project root: %PROJECT_ROOT%
echo.

REM ====================================
REM Environment Check
REM ====================================
echo [STEP 1/8] Checking development environment...

REM Check Node.js
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Node.js not installed, please install Node.js 18+
    echo Download: https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js installed

REM Check Python
python --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Python not installed, please install Python 3.11+
    echo Download: https://www.python.org/downloads/
    pause
    exit /b 1
)
echo [OK] Python installed

REM Check pnpm
pnpm --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [WARNING] pnpm not installed, installing...
    npm install -g pnpm
    if %errorLevel% neq 0 (
        echo [ERROR] pnpm installation failed
        pause
        exit /b 1
    )
)
echo [OK] pnpm installed

REM Check Docker (optional)
docker --version >nul 2>&1
if %errorLevel% equ 0 (
    echo [OK] Docker installed
) else (
    echo [WARNING] Docker not installed (optional)
)

echo.

REM ====================================
REM Environment Variables
REM ====================================
echo [STEP 2/8] Configuring environment variables...

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

REM ====================================
REM Dependencies Installation
REM ====================================
echo [STEP 3/8] Installing dependencies...

REM Install frontend dependencies
echo [INFO] Installing frontend dependencies...
if not exist "node_modules" (
    pnpm install
    if %errorLevel% neq 0 (
        echo [ERROR] Frontend dependencies installation failed
        pause
        exit /b 1
    )
) else (
    echo [INFO] Checking for updates...
    pnpm install
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

REM Activate virtual environment and install dependencies
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

REM ====================================
REM Database Initialization
REM ====================================
echo [STEP 4/8] Initializing database...

REM Check if using Docker
docker ps >nul 2>&1
if %errorLevel% equ 0 (
    echo [INFO] Starting Docker database services...
    docker-compose up -d postgres redis
    if %errorLevel% equ 0 (
        echo [OK] Docker services started
        
        REM Wait for database to be ready
        echo [INFO] Waiting for database to be ready...
        timeout /t 10 /nobreak >nul
        
        REM Run database migrations
        echo [INFO] Running database migrations...
        pnpm run db:generate
        pnpm run db:push
        
        if %errorLevel% equ 0 (
            echo [OK] Database initialized
        ) else (
            echo [WARNING] Database migration may have failed
        )
    ) else (
        echo [WARNING] Docker services failed to start
    )
) else (
    echo [INFO] Using local database configuration
    pnpm run db:generate
    pnpm run db:push
    
    if %errorLevel% equ 0 (
        echo [OK] Database initialized
    ) else (
        echo [WARNING] Database initialization may have failed
    )
)

echo.

REM ====================================
REM Quality Check
REM ====================================
echo [STEP 5/8] Running quality check...

if exist "scripts\quality-check.ps1" (
    powershell -ExecutionPolicy Bypass -File "scripts\quality-check.ps1"
    if %errorLevel% equ 0 (
        echo [OK] Quality check passed
    ) else (
        echo [WARNING] Quality issues found, check reports
    )
) else (
    echo [WARNING] Quality check script not found
)

echo.

REM ====================================
REM Start Services
REM ====================================
echo [STEP 6/8] Starting services...

REM Start Python backend
echo [INFO] Starting Python backend service...
start "ZK-Agent Backend" cmd /k "cd /d %PROJECT_ROOT%backend && call .venv\Scripts\activate.bat && python main.py"

REM Wait a moment for backend to start
timeout /t 5 /nobreak >nul

REM Start Next.js frontend
echo [INFO] Starting Next.js frontend service...
start "ZK-Agent Frontend" cmd /k "cd /d %PROJECT_ROOT% && pnpm run dev"

echo [OK] Services starting...
echo.

REM ====================================
REM Health Check
REM ====================================
echo [STEP 7/8] Performing health check...

REM Wait for services to start
echo [INFO] Waiting for services to start...
timeout /t 15 /nobreak >nul

REM Check frontend service
echo [INFO] Checking frontend service...
curl -s -o nul -w "%%{http_code}" http://localhost:3000 --connect-timeout 5 >temp_status.txt 2>nul
if exist temp_status.txt (
    set /p HTTP_STATUS=<temp_status.txt
    if "!HTTP_STATUS!"=="200" (
        echo [OK] Frontend service is running
    ) else (
        echo [WARNING] Frontend service may not be ready yet
    )
    del temp_status.txt >nul 2>&1
) else (
    echo [WARNING] Cannot check frontend service status
)

REM Check backend service
echo [INFO] Checking backend service...
curl -s -o nul -w "%%{http_code}" http://localhost:8000/health --connect-timeout 5 >temp_status.txt 2>nul
if exist temp_status.txt (
    set /p HTTP_STATUS=<temp_status.txt
    if "!HTTP_STATUS!"=="200" (
        echo [OK] Backend service is running
    ) else (
        echo [WARNING] Backend service may not be ready yet
    )
    del temp_status.txt >nul 2>&1
) else (
    echo [WARNING] Cannot check backend service status
)

echo.

REM ====================================
REM Completion
REM ====================================
echo [STEP 8/8] Startup complete!
echo.
echo ========================================
echo    ZK-Agent Development Environment Ready
echo ========================================
echo.
echo Service URLs:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8000
echo   Database: http://localhost:5555 (Prisma Studio)
echo.
echo Common Commands:
echo   pnpm run dev          - Start frontend only
echo   npm run backend:dev   - Start backend only
echo   npm run db:studio     - Open database management
echo   npm run quality:check - Run quality check
echo.
echo Log Locations:
echo   Frontend: Console output
echo   Backend:  backend/logs/
echo   Database: Docker container logs
echo.
echo Tips:
echo   - Use Ctrl+C to stop services
echo   - Check logs if services fail to start
echo   - Run check-dev-status.bat to diagnose issues
echo   - Use stop-dev.bat to stop all services
echo.

REM Open browser
echo [INFO] Opening browser...
start http://localhost:3000

echo [SUCCESS] Development environment is ready!
echo.
pause