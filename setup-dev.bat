@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo    ZK-Agent Development Setup
echo ========================================
echo.

REM Set project root directory
set "PROJECT_ROOT=%~dp0"
cd /d "%PROJECT_ROOT%"

echo [INFO] Project root: %PROJECT_ROOT%
echo.

REM Check .env file
echo [STEP 1/4] Checking environment configuration...
if not exist ".env" (
    if exist ".env.example" (
        echo [INFO] Copying .env.example to .env
        copy ".env.example" ".env" >nul
        echo [OK] .env file created
    ) else (
        echo [ERROR] .env.example file not found
        pause
        exit /b 1
    )
) else (
    echo [OK] .env file exists
)

echo.
echo [STEP 2/4] Installing frontend dependencies...
echo [INFO] This may take a few minutes...

REM Clean install frontend dependencies
if exist "node_modules" (
    echo [INFO] Cleaning existing node_modules...
    rmdir /s /q node_modules
)

if exist "package-lock.json" (
    del package-lock.json
)

echo [INFO] Installing with pnpm...
pnpm install
if %errorLevel% neq 0 (
    echo [ERROR] Frontend dependencies installation failed
    echo [INFO] Trying with npm...
    npm install
    if %errorLevel% neq 0 (
        echo [ERROR] npm installation also failed
        pause
        exit /b 1
    )
)
echo [OK] Frontend dependencies installed

echo.
echo [STEP 3/4] Setting up Python backend...
cd backend

REM Remove existing virtual environment
if exist ".venv" (
    echo [INFO] Cleaning existing virtual environment...
    rmdir /s /q .venv
)

echo [INFO] Creating Python virtual environment...
python -m venv .venv
if %errorLevel% neq 0 (
    echo [ERROR] Failed to create virtual environment
    echo [INFO] Make sure Python 3.8+ is installed
    cd ..
    pause
    exit /b 1
)

echo [INFO] Installing Python dependencies...
call .venv\Scripts\activate.bat
pip install --upgrade pip
pip install -r requirements.txt
if %errorLevel% neq 0 (
    echo [ERROR] Python dependencies installation failed
    cd ..
    pause
    exit /b 1
)
cd ..
echo [OK] Python backend setup complete

echo.
echo [STEP 4/4] Initializing database...
echo [INFO] Generating Prisma client...
pnpm run db:generate
if %errorLevel% neq 0 (
    echo [WARNING] Prisma generate failed, but continuing...
)

echo [INFO] Pushing database schema...
pnpm run db:push
if %errorLevel% neq 0 (
    echo [WARNING] Database push failed, but continuing...
)

echo.
echo ========================================
echo    Setup Complete!
echo ========================================
echo.
echo [SUCCESS] ZK-Agent development environment is ready!
echo.
echo Next steps:
echo   1. Run quick-start.bat to start services
echo   2. Or run start-dev.bat for full startup with checks
echo.
echo Service URLs (after starting):
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8000
echo.
echo [INFO] You can now start the development environment!
echo.
pause