@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM ====================================
REM ZK-Agent 开发环境重启脚本
REM ====================================
REM 功能说明：
REM - 快速停止所有开发服务
REM - 重新启动开发环境
REM - 跳过依赖安装以加快重启速度
REM ====================================

echo.
echo ========================================
echo    ZK-Agent 开发环境重启脚本
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
REM 停止现有服务
REM ====================================
echo %YELLOW%[STEP 1/3]%RESET% 停止现有服务...

echo %BLUE%停止前端和后端服务...%RESET%

REM 停止Node.js进程
for /f "tokens=5" %%i in ('netstat -ano ^| findstr ":3000"') do (
    taskkill /pid %%i /f >nul 2>&1
)

REM 停止Python进程
for /f "tokens=5" %%i in ('netstat -ano ^| findstr ":8000"') do (
    taskkill /pid %%i /f >nul 2>&1
)

REM 等待进程完全停止
timeout /t 3 /nobreak >nul

echo %GREEN%✓%RESET% 现有服务已停止
echo.

REM ====================================
REM 快速健康检查
REM ====================================
echo %YELLOW%[STEP 2/3]%RESET% 快速健康检查...

REM 检查数据库连接
echo %BLUE%检查数据库连接...%RESET%
npm run db:health-check >nul 2>&1
if %errorLevel% neq 0 (
    echo %YELLOW%警告: 数据库连接异常，尝试重新连接...%RESET%
    
    REM 如果使用Docker，重启数据库服务
    docker --version >nul 2>&1
    if %errorLevel% equ 0 (
        echo %BLUE%重启Docker数据库服务...%RESET%
        docker-compose restart postgres redis >nul 2>&1
        timeout /t 5 /nobreak >nul
    )
) else (
    echo %GREEN%✓%RESET% 数据库连接正常
)

REM 清理缓存
echo %BLUE%清理开发缓存...%RESET%
if exist ".next" rmdir /s /q ".next" >nul 2>&1
if exist "backend\__pycache__" rmdir /s /q "backend\__pycache__" >nul 2>&1
echo %GREEN%✓%RESET% 缓存已清理

echo.

REM ====================================
REM 重新启动服务
REM ====================================
echo %YELLOW%[STEP 3/3]%RESET% 重新启动服务...

REM 启动Python后端服务
echo %BLUE%启动后端服务...%RESET%
start "ZK-Agent Backend" cmd /k "cd /d %PROJECT_ROOT%backend && call .venv\Scripts\activate.bat && python main.py"

REM 等待后端启动
echo %BLUE%等待后端服务启动...%RESET%
timeout /t 5 /nobreak >nul

REM 启动前端服务
echo %BLUE%启动前端服务...%RESET%
start "ZK-Agent Frontend" cmd /k "cd /d %PROJECT_ROOT% && pnpm dev"

REM 等待前端启动
echo %BLUE%等待前端服务启动...%RESET%
timeout /t 8 /nobreak >nul

echo.

REM ====================================
REM 快速验证
REM ====================================
echo %BLUE%验证服务状态...%RESET%

REM 检查端口占用
netstat -ano | findstr ":3000" >nul 2>&1
if %errorLevel% equ 0 (
    echo %GREEN%✓%RESET% 前端服务 (端口3000) 运行中
) else (
    echo %YELLOW%警告: 前端服务可能还在启动中%RESET%
)

netstat -ano | findstr ":8000" >nul 2>&1
if %errorLevel% equ 0 (
    echo %GREEN%✓%RESET% 后端服务 (端口8000) 运行中
) else (
    echo %YELLOW%警告: 后端服务可能还在启动中%RESET%
)

echo.

REM ====================================
REM 重启完成
REM ====================================
echo %GREEN%========================================%RESET%
echo %GREEN%    ZK-Agent 开发环境重启完成！%RESET%
echo %GREEN%========================================%RESET%
echo.
echo %BLUE%服务地址：%RESET%
echo   前端服务: %GREEN%http://localhost:3000%RESET%
echo   后端API:  %GREEN%http://localhost:8000%RESET%
echo   API文档:  %GREEN%http://localhost:8000/docs%RESET%
echo.
echo %BLUE%重启耗时：%RESET% 约15-20秒
echo %BLUE%提示：%RESET% 如果服务未正常启动，请使用 start-dev.bat 完整启动
echo.

REM 打开浏览器（可选）
set /p "OPEN_BROWSER=是否打开浏览器? (y/N): "
if /i "%OPEN_BROWSER%"=="y" (
    echo %BLUE%正在打开浏览器...%RESET%
    start http://localhost:3000
)

echo.
echo %GREEN%重启完成，继续愉快的开发吧！%RESET%
echo.

pause