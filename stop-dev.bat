@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM ====================================
REM ZK-Agent 开发环境停止脚本
REM ====================================
REM 功能说明：
REM - 停止前端Next.js服务
REM - 停止Python后端服务
REM - 停止Docker服务（如果使用）
REM - 清理临时文件和进程
REM ====================================

echo.
echo ========================================
echo    ZK-Agent 开发环境停止脚本
echo ========================================
echo.

REM 设置颜色输出
for /f "tokens=*" %%i in ('echo prompt $E^| cmd') do set "ESC=%%i"
set "GREEN=%ESC%[32m"
set "RED=%ESC%[31m"
set "YELLOW=%ESC%[33m"
set "BLUE=%ESC%[34m"
set "RESET=%ESC%[0m"

REM 设置项目根目录
set "PROJECT_ROOT=%~dp0"
cd /d "%PROJECT_ROOT%"

echo %BLUE%[INFO]%RESET% 项目根目录: %PROJECT_ROOT%
echo.

REM ====================================
REM 停止Node.js进程
REM ====================================
echo %YELLOW%[STEP 1/4]%RESET% 停止前端服务...

echo %BLUE%查找Next.js进程...%RESET%
for /f "tokens=2" %%i in ('tasklist /fi "imagename eq node.exe" /fo csv ^| findstr "next"') do (
    echo %BLUE%停止进程 %%i...%RESET%
    taskkill /pid %%i /f >nul 2>&1
)

REM 停止所有监听3000端口的进程
for /f "tokens=5" %%i in ('netstat -ano ^| findstr ":3000"') do (
    echo %BLUE%停止端口3000进程 %%i...%RESET%
    taskkill /pid %%i /f >nul 2>&1
)

echo %GREEN%✓%RESET% 前端服务已停止
echo.

REM ====================================
REM 停止Python进程
REM ====================================
echo %YELLOW%[STEP 2/4]%RESET% 停止后端服务...

echo %BLUE%查找Python后端进程...%RESET%
for /f "tokens=2" %%i in ('tasklist /fi "imagename eq python.exe" /fo csv ^| findstr "main.py"') do (
    echo %BLUE%停止进程 %%i...%RESET%
    taskkill /pid %%i /f >nul 2>&1
)

REM 停止所有监听8000端口的进程
for /f "tokens=5" %%i in ('netstat -ano ^| findstr ":8000"') do (
    echo %BLUE%停止端口8000进程 %%i...%RESET%
    taskkill /pid %%i /f >nul 2>&1
)

REM 停止uvicorn进程
for /f "tokens=2" %%i in ('tasklist /fi "imagename eq python.exe" /fo csv ^| findstr "uvicorn"') do (
    echo %BLUE%停止uvicorn进程 %%i...%RESET%
    taskkill /pid %%i /f >nul 2>&1
)

echo %GREEN%✓%RESET% 后端服务已停止
echo.

REM ====================================
REM 停止Docker服务
REM ====================================
echo %YELLOW%[STEP 3/4]%RESET% 停止Docker服务...

docker --version >nul 2>&1
if %errorLevel% equ 0 (
    echo %BLUE%停止Docker Compose服务...%RESET%
    docker-compose down >nul 2>&1
    if %errorLevel% equ 0 (
        echo %GREEN%✓%RESET% Docker服务已停止
    ) else (
        echo %YELLOW%警告: Docker服务停止失败或未运行%RESET%
    )
) else (
    echo %YELLOW%跳过: Docker未安装%RESET%
)

echo.

REM ====================================
REM 清理临时文件
REM ====================================
echo %YELLOW%[STEP 4/4]%RESET% 清理临时文件...

REM 清理Next.js缓存
if exist ".next" (
    echo %BLUE%清理Next.js缓存...%RESET%
    rmdir /s /q ".next" >nul 2>&1
    echo %GREEN%✓%RESET% Next.js缓存已清理
)

REM 清理Python缓存
if exist "backend\__pycache__" (
    echo %BLUE%清理Python缓存...%RESET%
    rmdir /s /q "backend\__pycache__" >nul 2>&1
    echo %GREEN%✓%RESET% Python缓存已清理
)

REM 清理临时日志（保留重要日志）
if exist "logs\temp" (
    echo %BLUE%清理临时日志...%RESET%
    rmdir /s /q "logs\temp" >nul 2>&1
    echo %GREEN%✓%RESET% 临时日志已清理
)

REM 清理node_modules/.cache
if exist "node_modules\.cache" (
    echo %BLUE%清理Node.js缓存...%RESET%
    rmdir /s /q "node_modules\.cache" >nul 2>&1
    echo %GREEN%✓%RESET% Node.js缓存已清理
)

echo.

REM ====================================
REM 最终检查
REM ====================================
echo %BLUE%最终检查服务状态...%RESET%

REM 检查端口占用
set "PORT_3000_USED=false"
set "PORT_8000_USED=false"

netstat -ano | findstr ":3000" >nul 2>&1
if %errorLevel% equ 0 (
    set "PORT_3000_USED=true"
    echo %YELLOW%警告: 端口3000仍被占用%RESET%
)

netstat -ano | findstr ":8000" >nul 2>&1
if %errorLevel% equ 0 (
    set "PORT_8000_USED=true"
    echo %YELLOW%警告: 端口8000仍被占用%RESET%
)

if "%PORT_3000_USED%"=="false" if "%PORT_8000_USED%"=="false" (
    echo %GREEN%✓%RESET% 所有服务端口已释放
)

echo.

REM ====================================
REM 停止完成
REM ====================================
echo %GREEN%========================================%RESET%
echo %GREEN%    ZK-Agent 开发环境停止完成！%RESET%
echo %GREEN%========================================%RESET%
echo.
echo %BLUE%已停止的服务：%RESET%
echo   %GREEN%✓%RESET% 前端Next.js服务 (端口3000)
echo   %GREEN%✓%RESET% 后端Python服务 (端口8000)
echo   %GREEN%✓%RESET% Docker服务 (如果使用)
echo   %GREEN%✓%RESET% 临时文件已清理
echo.
echo %BLUE%提示：%RESET%
echo - 数据库数据已保留
echo - 配置文件未被修改
echo - 使用 start-dev.bat 可重新启动服务
echo.

if "%PORT_3000_USED%"=="true" (
    echo %YELLOW%注意: 如果端口3000仍被占用，请手动结束相关进程%RESET%
    echo %YELLOW%命令: netstat -ano ^| findstr ":3000"%RESET%
    echo.
)

if "%PORT_8000_USED%"=="true" (
    echo %YELLOW%注意: 如果端口8000仍被占用，请手动结束相关进程%RESET%
    echo %YELLOW%命令: netstat -ano ^| findstr ":8000"%RESET%
    echo.
)

echo %GREEN%开发环境已安全停止！%RESET%
echo.

pause