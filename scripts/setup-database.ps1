<#
.SYNOPSIS
    ZK-Agent数据库自动化设置脚本

.DESCRIPTION
    此脚本用于自动创建和初始化ZK-Agent项目的PostgreSQL数据库
    支持Windows PowerShell环境

.PARAMETER Action
    执行的操作: setup, test, reset

.PARAMETER DatabaseName
    数据库名称，默认为 zk_agent

.EXAMPLE
    .\setup-database.ps1 -Action setup
    .\setup-database.ps1 -Action test
    .\setup-database.ps1 -Action reset -DatabaseName zk_agent

.NOTES
    作者: ZK-Agent Team
    日期: 2025-01-27
    要求: PostgreSQL 12+ 和 psql 命令行工具
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("setup", "test", "reset", "help")]
    [string]$Action = "setup",
    
    [Parameter(Mandatory=$false)]
    [string]$DatabaseName = "zk_agent",
    
    [Parameter(Mandatory=$false)]
    [string]$DatabaseHost = "localhost",
    
    [Parameter(Mandatory=$false)]
    [int]$Port = 5432,
    
    [Parameter(Mandatory=$false)]
    [string]$Username = "postgres",
    
    [Parameter(Mandatory=$false)]
    [string]$Password = "123456"
)

# 颜色输出函数
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# 检查PostgreSQL服务状态
function Test-PostgreSQLService {
    Write-ColorOutput "🔍 检查PostgreSQL服务状态..." "Cyan"
    
    $service = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
    if ($service) {
        if ($service.Status -eq "Running") {
            Write-ColorOutput "✅ PostgreSQL服务正在运行" "Green"
            return $true
        } else {
            Write-ColorOutput "⚠️  PostgreSQL服务未运行，尝试启动..." "Yellow"
            try {
                Start-Service $service.Name
                Write-ColorOutput "✅ PostgreSQL服务启动成功" "Green"
                return $true
            } catch {
                Write-ColorOutput "❌ 无法启动PostgreSQL服务: $($_.Exception.Message)" "Red"
                return $false
            }
        }
    } else {
        Write-ColorOutput "❌ 未找到PostgreSQL服务，请确保PostgreSQL已正确安装" "Red"
        return $false
    }
}

# 检查psql命令是否可用
function Test-PSQLCommand {
    Write-ColorOutput "🔍 检查psql命令..." "Cyan"
    
    try {
        $null = Get-Command psql -ErrorAction Stop
        Write-ColorOutput "✅ psql命令可用" "Green"
        return $true
    } catch {
        Write-ColorOutput "❌ psql命令不可用，请确保PostgreSQL客户端工具已安装并添加到PATH" "Red"
        Write-ColorOutput "💡 提示: 通常位于 C:\Program Files\PostgreSQL\[版本]\bin\" "Yellow"
        return $false
    }
}

# 测试数据库连接
function Test-DatabaseConnection {
    param(
        [string]$TestDbName = "postgres"
    )
    
    Write-ColorOutput "🔍 测试数据库连接..." "Cyan"
    
    $env:PGPASSWORD = $Password
    $testCommand = "psql -h $DatabaseHost -p $Port -U $Username -d $TestDbName -c 'SELECT version();' -t"
    
    try {
        $result = Invoke-Expression $testCommand 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "✅ 数据库连接成功" "Green"
            Write-ColorOutput "📊 PostgreSQL版本: $($result.Trim().Split(',')[0])" "Cyan"
            return $true
        } else {
            Write-ColorOutput "❌ 数据库连接失败" "Red"
            return $false
        }
    } catch {
        Write-ColorOutput "❌ 数据库连接测试失败: $($_.Exception.Message)" "Red"
        return $false
    } finally {
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}

# 检查数据库是否存在
function Test-DatabaseExists {
    param(
        [string]$DbName
    )
    
    Write-ColorOutput "🔍 检查数据库 '$DbName' 是否存在..." "Cyan"
    
    $env:PGPASSWORD = $Password
    $checkCommand = "psql -h $DatabaseHost -p $Port -U $Username -d postgres -t -c `"SELECT 1 FROM pg_database WHERE datname='$DbName';`""
    
    try {
        $result = Invoke-Expression $checkCommand 2>$null
        $exists = $result.Trim() -eq "1"
        
        if ($exists) {
            Write-ColorOutput "✅ 数据库 '$DbName' 已存在" "Green"
        } else {
            Write-ColorOutput "ℹ️  数据库 '$DbName' 不存在" "Yellow"
        }
        
        return $exists
    } catch {
        Write-ColorOutput "❌ 检查数据库存在性失败: $($_.Exception.Message)" "Red"
        return $false
    } finally {
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}

# 创建数据库
function New-Database {
    param(
        [string]$DbName
    )
    
    Write-ColorOutput "🔨 创建数据库 '$DbName'..." "Cyan"
    
    $env:PGPASSWORD = $Password
    $createCommand = "psql -h $DatabaseHost -p $Port -U $Username -d postgres -c `"CREATE DATABASE `"`"$DbName`"`";`""
    
    try {
        $result = Invoke-Expression $createCommand 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "✅ 数据库 '$DbName' 创建成功" "Green"
            return $true
        } else {
            if ($result -like "*already exists*") {
                Write-ColorOutput "ℹ️  数据库 '$DbName' 已存在" "Yellow"
                return $true
            } else {
                Write-ColorOutput "❌ 创建数据库失败: $result" "Red"
                return $false
            }
        }
    } catch {
        Write-ColorOutput "❌ 创建数据库失败: $($_.Exception.Message)" "Red"
        return $false
    } finally {
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}

# 初始化数据库结构
function Initialize-DatabaseSchema {
    param(
        [string]$DbName
    )
    
    Write-ColorOutput "🔧 初始化数据库结构..." "Cyan"
    
    $scriptPath = Join-Path $PSScriptRoot "init-zk-agent-db.sql"
    
    if (-not (Test-Path $scriptPath)) {
        Write-ColorOutput "❌ 初始化脚本不存在: $scriptPath" "Red"
        return $false
    }
    
    $env:PGPASSWORD = $Password
    $initCommand = "psql -h $DatabaseHost -p $Port -U $Username -f `"$scriptPath`""
    
    try {
        Write-ColorOutput "📄 执行初始化脚本: $scriptPath" "Cyan"
        $result = Invoke-Expression $initCommand 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "✅ 数据库结构初始化成功" "Green"
            return $true
        } else {
            Write-ColorOutput "❌ 数据库结构初始化失败: $result" "Red"
            return $false
        }
    } catch {
        Write-ColorOutput "❌ 数据库结构初始化失败: $($_.Exception.Message)" "Red"
        return $false
    } finally {
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}

# 删除数据库
function Remove-Database {
    param(
        [string]$DbName
    )
    
    Write-ColorOutput "🗑️  删除数据库 '$DbName'..." "Yellow"
    
    $confirmation = Read-Host "确认删除数据库 '$DbName'? (y/N)"
    if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
        Write-ColorOutput "❌ 操作已取消" "Yellow"
        return $false
    }
    
    $env:PGPASSWORD = $Password
    $dropCommand = "psql -h $DatabaseHost -p $Port -U $Username -d postgres -c `"DROP DATABASE IF EXISTS `"`"$DbName`"`";`""
    
    try {
        $result = Invoke-Expression $dropCommand 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "✅ 数据库 '$DbName' 删除成功" "Green"
            return $true
        } else {
            Write-ColorOutput "❌ 删除数据库失败: $result" "Red"
            return $false
        }
    } catch {
        Write-ColorOutput "❌ 删除数据库失败: $($_.Exception.Message)" "Red"
        return $false
    } finally {
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}

# 显示帮助信息
function Show-Help {
    Write-ColorOutput "🚀 ZK-Agent 数据库设置工具" "Cyan"
    Write-ColorOutput "" "White"
    Write-ColorOutput "用法:" "Yellow"
    Write-ColorOutput "  .\setup-database.ps1 -Action <action> [参数]" "White"
    Write-ColorOutput "" "White"
    Write-ColorOutput "操作:" "Yellow"
    Write-ColorOutput "  setup   - 完整设置数据库（检查、创建、初始化）" "White"
    Write-ColorOutput "  test    - 测试数据库连接" "White"
    Write-ColorOutput "  reset   - 重置数据库（删除并重新创建）" "White"
    Write-ColorOutput "  help    - 显示此帮助信息" "White"
    Write-ColorOutput "" "White"
    Write-ColorOutput "参数:" "Yellow"
    Write-ColorOutput "  -DatabaseName  数据库名称 (默认: zk_agent)" "White"
    Write-ColorOutput "  -Host          数据库主机 (默认: localhost)" "White"
    Write-ColorOutput "  -Port          数据库端口 (默认: 5432)" "White"
    Write-ColorOutput "  -Username      数据库用户 (默认: postgres)" "White"
    Write-ColorOutput "  -Password      数据库密码 (默认: 123456)" "White"
    Write-ColorOutput "" "White"
    Write-ColorOutput "示例:" "Yellow"
    Write-ColorOutput "  .\setup-database.ps1 -Action setup" "White"
    Write-ColorOutput "  .\setup-database.ps1 -Action test -DatabaseName zk_agent" "White"
    Write-ColorOutput "  .\setup-database.ps1 -Action reset" "White"
}

# 主函数
function Main {
    Write-ColorOutput "🚀 ZK-Agent 数据库设置工具" "Cyan"
    Write-ColorOutput "=================================" "Cyan"
    Write-ColorOutput "" "White"
    
    switch ($Action.ToLower()) {
        "setup" {
            Write-ColorOutput "📋 执行完整数据库设置..." "Cyan"
            
            # 检查前置条件
            if (-not (Test-PostgreSQLService)) { return }
            if (-not (Test-PSQLCommand)) { return }
            if (-not (Test-DatabaseConnection)) { return }
            
            # 检查数据库是否存在
            $exists = Test-DatabaseExists -DbName $DatabaseName
            
            if (-not $exists) {
                # 创建数据库
                if (-not (New-Database -DbName $DatabaseName)) { return }
            }
            
            # 初始化数据库结构
            if (Initialize-DatabaseSchema -DbName $DatabaseName) {
                Write-ColorOutput "" "White"
                Write-ColorOutput "🎉 数据库设置完成!" "Green"
                Write-ColorOutput "📊 数据库信息:" "Cyan"
                Write-ColorOutput "   名称: $DatabaseName" "White"
                Write-ColorOutput "   主机: ${Host}:${Port}" "White"
                Write-ColorOutput "   用户: $Username" "White"
                Write-ColorOutput "" "White"
                Write-ColorOutput "💡 现在可以运行以下命令测试连接:" "Yellow"
                Write-ColorOutput "   node scripts/test-db-connection.js test" "White"
            }
        }
        
        "test" {
            Write-ColorOutput "🧪 测试数据库连接..." "Cyan"
            
            if (Test-PostgreSQLService -and Test-PSQLCommand) {
                if (Test-DatabaseConnection) {
                    $exists = Test-DatabaseExists -DbName $DatabaseName
                    if ($exists) {
                        Write-ColorOutput "" "White"
                        Write-ColorOutput "✅ 数据库 '$DatabaseName' 连接测试成功!" "Green"
                    } else {
                        Write-ColorOutput "" "White"
                        Write-ColorOutput "⚠️  数据库 '$DatabaseName' 不存在，请运行 setup 操作" "Yellow"
                    }
                }
            }
        }
        
        "reset" {
            Write-ColorOutput "🔄 重置数据库..." "Yellow"
            
            # 检查前置条件
            if (-not (Test-PostgreSQLService)) { return }
            if (-not (Test-PSQLCommand)) { return }
            if (-not (Test-DatabaseConnection)) { return }
            
            # 删除数据库
            if (Remove-Database -DbName $DatabaseName) {
                # 重新创建数据库
                if (New-Database -DbName $DatabaseName) {
                    # 初始化数据库结构
                    if (Initialize-DatabaseSchema -DbName $DatabaseName) {
                        Write-ColorOutput "" "White"
                        Write-ColorOutput "🎉 数据库重置完成!" "Green"
                    }
                }
            }
        }
        
        "help" {
            Show-Help
        }
        
        default {
            Write-ColorOutput "❌ 未知操作: $Action" "Red"
            Show-Help
        }
    }
}

# 执行主函数
Main