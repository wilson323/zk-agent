@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM ====================================
REM ZK-Agent 开发环境状态检查脚本
REM ====================================
REM 功能说明：
REM - 检查所有开发服务运行状态
REM - 验证数据库连接
REM - 显示端口占用情况
REM - 检查依赖和配置
REM - 生成状态报告
REM ====================================

echo.
echo ========================================
echo    ZK-Agent 开发环境状态检查
echo ========================================
echo.

REM 设置颜色输出
for /f "tokens=*" %%i in ('echo prompt $E^| cmd') do set "ESC=%%i"
set "GREEN=%ESC%[32m"
set "RED=%ESC%[31m"
set "YELLOW=%ESC%[33m"
set "BLUE=%ESC%[34m"
set "CYAN=%ESC%[36m"
set "RESET=%ESC%[0m"

REM 设置项目根目录
set "PROJECT_ROOT=%~dp0"
cd /d "%PROJECT_ROOT%"

echo %BLUE%[INFO]%RESET% 项目根目录: %PROJECT_ROOT%
echo %BLUE%[INFO]%RESET% 检查时间: %date% %time%
echo.

REM ====================================
REM 系统环境检查
REM ====================================
echo %CYAN%========== 系统环境检查 ==========%RESET%
echo.

REM 检查Node.js
echo %BLUE%Node.js:%RESET%
node --version >nul 2>&1
if %errorLevel% equ 0 (
    for /f "delims=" %%i in ('node --version') do echo   版本: %GREEN%%%i%RESET%
    echo   状态: %GREEN%✓ 已安装%RESET%
) else (
    echo   状态: %RED%✗ 未安装%RESET%
)

REM 检查Python
echo %BLUE%Python:%RESET%
python --version >nul 2>&1
if %errorLevel% equ 0 (
    for /f "delims=" %%i in ('python --version') do echo   版本: %GREEN%%%i%RESET%
    echo   状态: %GREEN%✓ 已安装%RESET%
) else (
    echo   状态: %RED%✗ 未安装%RESET%
)

REM 检查pnpm
echo %BLUE%pnpm:%RESET%
pnpm --version >nul 2>&1
if %errorLevel% equ 0 (
    for /f "delims=" %%i in ('pnpm --version') do echo   版本: %GREEN%%%i%RESET%
    echo   状态: %GREEN%✓ 已安装%RESET%
) else (
    echo   状态: %RED%✗ 未安装%RESET%
)

REM 检查Docker
echo %BLUE%Docker:%RESET%
docker --version >nul 2>&1
if %errorLevel% equ 0 (
    for /f "tokens=3" %%i in ('docker --version') do echo   版本: %GREEN%%%i%RESET%
    echo   状态: %GREEN%✓ 已安装%RESET%
    
    REM 检查Docker服务状态
    docker ps >nul 2>&1
    if %errorLevel% equ 0 (
        echo   服务: %GREEN%✓ 运行中%RESET%
    ) else (
        echo   服务: %YELLOW%⚠ 未运行%RESET%
    )
) else (
    echo   状态: %YELLOW%⚠ 未安装%RESET%
)

echo.

REM ====================================
REM 项目配置检查
REM ====================================
echo %CYAN%========== 项目配置检查 ==========%RESET%
echo.

REM 检查.env文件
echo %BLUE%.env配置:%RESET%
if exist ".env" (
    echo   状态: %GREEN%✓ 已存在%RESET%
    
    REM 检查关键配置项
    findstr /c:"DATABASE_URL" .env >nul 2>&1
    if %errorLevel% equ 0 (
        echo   数据库: %GREEN%✓ 已配置%RESET%
    ) else (
        echo   数据库: %RED%✗ 未配置%RESET%
    )
    
    findstr /c:"OPENAI_API_KEY" .env >nul 2>&1
    if %errorLevel% equ 0 (
        echo   OpenAI: %GREEN%✓ 已配置%RESET%
    ) else (
        echo   OpenAI: %YELLOW%⚠ 未配置%RESET%
    )
) else (
    echo   状态: %RED%✗ 不存在%RESET%
    if exist ".env.example" (
        echo   模板: %GREEN%✓ .env.example存在%RESET%
    ) else (
        echo   模板: %RED%✗ .env.example不存在%RESET%
    )
)

REM 检查依赖安装
echo %BLUE%依赖安装:%RESET%
if exist "node_modules" (
    echo   前端依赖: %GREEN%✓ 已安装%RESET%
) else (
    echo   前端依赖: %RED%✗ 未安装%RESET%
)

if exist "backend\.venv" (
    echo   Python虚拟环境: %GREEN%✓ 已创建%RESET%
    
    REM 检查Python依赖
    if exist "backend\.venv\Lib\site-packages" (
        echo   Python依赖: %GREEN%✓ 已安装%RESET%
    ) else (
        echo   Python依赖: %YELLOW%⚠ 可能未完全安装%RESET%
    )
) else (
    echo   Python虚拟环境: %RED%✗ 未创建%RESET%
)

echo.

REM ====================================
REM 服务运行状态检查
REM ====================================
echo %CYAN%========== 服务运行状态 ==========%RESET%
echo.

REM 检查端口占用
echo %BLUE%端口占用情况:%RESET%

REM 检查3000端口（前端）
netstat -ano | findstr ":3000" >nul 2>&1
if %errorLevel% equ 0 (
    echo   端口3000 (前端): %GREEN%✓ 运行中%RESET%
    for /f "tokens=5" %%i in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
        echo     进程ID: %%i
    )
) else (
    echo   端口3000 (前端): %RED%✗ 未运行%RESET%
)

REM 检查8000端口（后端）
netstat -ano | findstr ":8000" >nul 2>&1
if %errorLevel% equ 0 (
    echo   端口8000 (后端): %GREEN%✓ 运行中%RESET%
    for /f "tokens=5" %%i in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
        echo     进程ID: %%i
    )
) else (
    echo   端口8000 (后端): %RED%✗ 未运行%RESET%
)

REM 检查5432端口（PostgreSQL）
netstat -ano | findstr ":5432" >nul 2>&1
if %errorLevel% equ 0 (
    echo   端口5432 (数据库): %GREEN%✓ 运行中%RESET%
) else (
    echo   端口5432 (数据库): %YELLOW%⚠ 未运行或使用Docker%RESET%
)

REM 检查6379端口（Redis）
netstat -ano | findstr ":6379" >nul 2>&1
if %errorLevel% equ 0 (
    echo   端口6379 (Redis): %GREEN%✓ 运行中%RESET%
) else (
    echo   端口6379 (Redis): %YELLOW%⚠ 未运行或使用Docker%RESET%
)

echo.

REM ====================================
REM Docker服务检查
REM ====================================
echo %CYAN%========== Docker服务状态 ==========%RESET%
echo.

docker --version >nul 2>&1
if %errorLevel% equ 0 (
    echo %BLUE%Docker容器状态:%RESET%
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>nul | findstr -v "CONTAINER"
    if %errorLevel% neq 0 (
        echo   %YELLOW%⚠ 无运行中的容器%RESET%
    )
    
    echo.
    echo %BLUE%Docker Compose服务:%RESET%
    docker-compose ps 2>nul
    if %errorLevel% neq 0 (
        echo   %YELLOW%⚠ 无Docker Compose服务运行%RESET%
    )
) else (
    echo %YELLOW%⚠ Docker未安装，跳过检查%RESET%
)

echo.

REM ====================================
REM 数据库连接检查
REM ====================================
echo %CYAN%========== 数据库连接检查 ==========%RESET%
echo.

echo %BLUE%数据库连接测试:%RESET%
npm run db:health-check >nul 2>&1
if %errorLevel% equ 0 (
    echo   状态: %GREEN%✓ 连接正常%RESET%
) else (
    echo   状态: %RED%✗ 连接失败%RESET%
)

REM 检查Prisma状态
echo %BLUE%Prisma状态:%RESET%
if exist "prisma\schema.prisma" (
    echo   Schema: %GREEN%✓ 存在%RESET%
) else (
    echo   Schema: %RED%✗ 不存在%RESET%
)

if exist "node_modules\.prisma" (
    echo   生成文件: %GREEN%✓ 已生成%RESET%
) else (
    echo   生成文件: %YELLOW%⚠ 未生成%RESET%
)

echo.

REM ====================================
REM 服务健康检查
REM ====================================
echo %CYAN%========== 服务健康检查 ==========%RESET%
echo.

echo %BLUE%HTTP服务检查:%RESET%

REM 检查前端服务
echo   前端服务 (http://localhost:3000):
curl -s -o nul -w "%%{http_code}" http://localhost:3000 --connect-timeout 5 >temp_status.txt 2>nul
if exist temp_status.txt (
    set /p HTTP_STATUS=<temp_status.txt
    if "!HTTP_STATUS!"=="200" (
        echo     状态: %GREEN%✓ 正常 (HTTP 200)%RESET%
    ) else if "!HTTP_STATUS!"=="000" (
        echo     状态: %RED%✗ 无法连接%RESET%
    ) else (
        echo     状态: %YELLOW%⚠ HTTP !HTTP_STATUS!%RESET%
    )
    del temp_status.txt >nul 2>&1
) else (
    echo     状态: %RED%✗ 检查失败%RESET%
)

REM 检查后端服务
echo   后端服务 (http://localhost:8000):
curl -s -o nul -w "%%{http_code}" http://localhost:8000/health --connect-timeout 5 >temp_status.txt 2>nul
if exist temp_status.txt (
    set /p HTTP_STATUS=<temp_status.txt
    if "!HTTP_STATUS!"=="200" (
        echo     状态: %GREEN%✓ 正常 (HTTP 200)%RESET%
    ) else if "!HTTP_STATUS!"=="000" (
        echo     状态: %RED%✗ 无法连接%RESET%
    ) else (
        echo     状态: %YELLOW%⚠ HTTP !HTTP_STATUS!%RESET%
    )
    del temp_status.txt >nul 2>&1
) else (
    echo     状态: %RED%✗ 检查失败%RESET%
)

echo.

REM ====================================
REM 日志和报告检查
REM ====================================
echo %CYAN%========== 日志和报告 ==========%RESET%
echo.

echo %BLUE%日志目录:%RESET%
if exist "logs" (
    echo   状态: %GREEN%✓ 存在%RESET%
    for /f %%i in ('dir /b logs 2^>nul ^| find /c /v ""') do echo   文件数: %%i
) else (
    echo   状态: %YELLOW%⚠ 不存在%RESET%
)

echo %BLUE%质量报告:%RESET%
if exist "quality-reports" (
    echo   状态: %GREEN%✓ 存在%RESET%
    for /f %%i in ('dir /b quality-reports 2^>nul ^| find /c /v ""') do echo   报告数: %%i
) else (
    echo   状态: %YELLOW%⚠ 不存在%RESET%
)

echo.

REM ====================================
REM 总结和建议
REM ====================================
echo %CYAN%========== 状态总结 ==========%RESET%
echo.

REM 计算总体状态
set "ISSUES=0"
set "WARNINGS=0"

REM 检查关键服务
netstat -ano | findstr ":3000" >nul 2>&1
if %errorLevel% neq 0 set /a ISSUES+=1

netstat -ano | findstr ":8000" >nul 2>&1
if %errorLevel% neq 0 set /a ISSUES+=1

if not exist ".env" set /a ISSUES+=1
if not exist "node_modules" set /a ISSUES+=1
if not exist "backend\.venv" set /a ISSUES+=1

REM 显示总体状态
if %ISSUES% equ 0 (
    echo %GREEN%🎉 开发环境状态良好！%RESET%
    echo %GREEN%   所有关键服务正常运行%RESET%
) else if %ISSUES% lss 3 (
    echo %YELLOW%⚠ 开发环境部分异常%RESET%
    echo %YELLOW%   发现 %ISSUES% 个问题，建议检查%RESET%
) else (
    echo %RED%❌ 开发环境存在问题%RESET%
    echo %RED%   发现 %ISSUES% 个问题，需要修复%RESET%
)

echo.
echo %BLUE%快速操作命令:%RESET%
echo   启动环境: %GREEN%start-dev.bat%RESET%
echo   停止环境: %GREEN%stop-dev.bat%RESET%
echo   重启环境: %GREEN%restart-dev.bat%RESET%
echo   质量检查: %GREEN%npm run quality:check%RESET%
echo   数据库管理: %GREEN%npm run db:studio%RESET%
echo.

echo %GREEN%检查完成！%RESET%
echo.

pause