#!/usr/bin/env pwsh
# TypeScript 配置规范化脚本
# 统一 tsconfig.json 配置，确保路径映射和模块解析的一致性

Write-Host "🔧 开始 TypeScript 配置规范化..." -ForegroundColor Green

# 设置错误处理
$ErrorActionPreference = "Stop"

# 项目根目录
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "📁 项目根目录: $ProjectRoot" -ForegroundColor Blue

# 1. 分析现有 TypeScript 配置
Write-Host "\n🔍 第一步: 分析现有 TypeScript 配置..." -ForegroundColor Yellow

$TsConfigFiles = Get-ChildItem -Path "." -Filter "tsconfig*.json" -Recurse | Where-Object { $_.FullName -notlike "*node_modules*" }

Write-Host "  发现 TypeScript 配置文件:" -ForegroundColor Cyan
$TsConfigFiles | ForEach-Object { 
    $RelativePath = $_.FullName.Replace("$ProjectRoot\\", "")
    Write-Host "    - $RelativePath" -ForegroundColor Gray 
}

# 2. 备份现有配置
Write-Host "\n📦 第二步: 备份现有配置..." -ForegroundColor Yellow

$BackupDir = "typescript-config-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null

foreach ($TsConfig in $TsConfigFiles) {
    $RelativePath = $TsConfig.FullName.Replace("$ProjectRoot\\", "")
    $BackupPath = Join-Path $BackupDir $TsConfig.Name
    $BackupSubDir = Join-Path $BackupDir (Split-Path -Parent $RelativePath)
    
    if ($RelativePath.Contains("\\") -and -not (Test-Path $BackupSubDir)) {
        New-Item -ItemType Directory -Path $BackupSubDir -Force | Out-Null
        $BackupPath = Join-Path $BackupSubDir $TsConfig.Name
    }
    
    Copy-Item -Path $TsConfig.FullName -Destination $BackupPath -Force
    Write-Host "  备份: $RelativePath" -ForegroundColor Cyan
}

Write-Host "  ✅ 配置备份完成: $BackupDir" -ForegroundColor Green

# 3. 创建标准化的 tsconfig.json
Write-Host "\n⚙️ 第三步: 创建标准化配置..." -ForegroundColor Yellow

# 主 tsconfig.json 配置
$MainTsConfig = @{
    compilerOptions = @{
        target = "ES2020"
        lib = @("dom", "dom.iterable", "ES6")
        allowJs = $true
        skipLibCheck = $true
        strict = $true
        noEmit = $true
        esModuleInterop = $true
        module = "esnext"
        moduleResolution = "bundler"
        resolveJsonModule = $true
        isolatedModules = $true
        jsx = "preserve"
        incremental = $true
        plugins = @(
            @{
                name = "next"
            }
        )
        baseUrl = "."
        paths = @{
            "@/*" = @("./app/*", "./components/*", "./lib/*")
            "@/components/*" = @("./components/*")
            "@/lib/*" = @("./lib/*")
            "@/app/*" = @("./app/*")
            "@/backend/*" = @("./backend/*")
            "@/docs/*" = @("./docs/*")
            "@/types/*" = @("./types/*")
            "@/utils/*" = @("./utils/*")
            "@/hooks/*" = @("./hooks/*")
            "@/contexts/*" = @("./contexts/*")
            "@/services/*" = @("./services/*")
        }
    }
    include = @(
        "next-env.d.ts",
        "**/*.ts",
        "**/*.tsx",
        ".next/types/**/*.ts",
        "app/**/*",
        "components/**/*",
        "lib/**/*",
        "contexts/**/*",
        "hooks/**/*",
        "types/**/*",
        "utils/**/*"
    )
    exclude = @(
        "node_modules",
        "backend",
        "frontend/src",
        "src",
        "dist",
        "build",
        ".next",
        "out"
    )
}

# 保存主配置
$MainTsConfig | ConvertTo-Json -Depth 10 | Out-File -FilePath "tsconfig.json" -Encoding UTF8
Write-Host "  ✅ 创建主 tsconfig.json" -ForegroundColor Green

# 4. 创建开发环境配置
Write-Host "\n🛠️ 第四步: 创建开发环境配置..." -ForegroundColor Yellow

$DevTsConfig = @{
    extends = "./tsconfig.json"
    compilerOptions = @{
        noUnusedLocals = $false
        noUnusedParameters = $false
        sourceMap = $true
    }
    include = @(
        "next-env.d.ts",
        "**/*.ts",
        "**/*.tsx",
        ".next/types/**/*.ts"
    )
}

$DevTsConfig | ConvertTo-Json -Depth 10 | Out-File -FilePath "tsconfig.dev.json" -Encoding UTF8
Write-Host "  ✅ 创建 tsconfig.dev.json" -ForegroundColor Green

# 5. 创建生产环境配置
$ProdTsConfig = @{
    extends = "./tsconfig.json"
    compilerOptions = @{
        noUnusedLocals = $true
        noUnusedParameters = $true
        sourceMap = $false
    }
    exclude = @(
        "node_modules",
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.spec.ts",
        "**/*.spec.tsx",
        "tests",
        "__tests__",
        "backend",
        "frontend/src",
        "src"
    )
}

$ProdTsConfig | ConvertTo-Json -Depth 10 | Out-File -FilePath "tsconfig.prod.json" -Encoding UTF8
Write-Host "  ✅ 创建 tsconfig.prod.json" -ForegroundColor Green

# 6. 创建测试环境配置
$TestTsConfig = @{
    extends = "./tsconfig.json"
    compilerOptions = @{
        types = @("jest", "node", "@testing-library/jest-dom")
        esModuleInterop = $true
        allowSyntheticDefaultImports = $true
    }
    include = @(
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.spec.ts",
        "**/*.spec.tsx",
        "tests/**/*",
        "__tests__/**/*"
    )
}

$TestTsConfig | ConvertTo-Json -Depth 10 | Out-File -FilePath "tsconfig.test.json" -Encoding UTF8
Write-Host "  ✅ 创建 tsconfig.test.json" -ForegroundColor Green

# 7. 更新 Next.js 配置
Write-Host "\n⚡ 第五步: 检查 Next.js 配置..." -ForegroundColor Yellow

if (Test-Path "next.config.js") {
    Write-Host "  发现 next.config.js，检查路径配置..." -ForegroundColor Cyan
    
    # 读取现有配置
    $NextConfigContent = Get-Content "next.config.js" -Raw
    
    # 检查是否包含路径映射
    if ($NextConfigContent -notlike "*webpack*" -or $NextConfigContent -notlike "*alias*") {
        Write-Host "  ⚠️  Next.js 配置可能需要更新路径映射" -ForegroundColor Yellow
    } else {
        Write-Host "  ✅ Next.js 配置包含路径映射" -ForegroundColor Green
    }
} else {
    Write-Host "  未找到 next.config.js" -ForegroundColor Gray
}

# 8. 验证配置
Write-Host "\n✅ 第六步: 验证 TypeScript 配置..." -ForegroundColor Yellow

# 检查 TypeScript 是否安装
try {
    $TscVersion = & npx tsc --version 2>$null
    Write-Host "  TypeScript 版本: $TscVersion" -ForegroundColor Green
    
    # 验证主配置
    Write-Host "  验证 tsconfig.json..." -ForegroundColor Cyan
    $TscCheck = & npx tsc --noEmit --project tsconfig.json 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ tsconfig.json 配置有效" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  tsconfig.json 配置可能有问题:" -ForegroundColor Yellow
        Write-Host "$TscCheck" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ⚠️  无法验证 TypeScript 配置，请确保已安装 TypeScript" -ForegroundColor Yellow
}

# 9. 生成配置报告
Write-Host "\n📊 第七步: 生成配置报告..." -ForegroundColor Yellow

$ConfigReport = @{
    Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    BackupDirectory = $BackupDir
    CreatedConfigs = @(
        "tsconfig.json",
        "tsconfig.dev.json",
        "tsconfig.prod.json",
        "tsconfig.test.json"
    )
    PathMappings = $MainTsConfig.compilerOptions.paths
    Recommendations = @(
        "删除冗余的 TypeScript 配置文件",
        "更新所有导入语句使用新的路径映射",
        "运行 'npm run type-check' 验证类型",
        "更新 IDE 设置以使用新的 tsconfig.json",
        "检查 Next.js 配置的路径映射"
    )
}

$ReportPath = "typescript-config-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
$ConfigReport | ConvertTo-Json -Depth 10 | Out-File -FilePath $ReportPath -Encoding UTF8

Write-Host "  ✅ 配置报告已保存: $ReportPath" -ForegroundColor Green

# 10. 显示摘要
Write-Host "\n📋 配置摘要:" -ForegroundColor Green
Write-Host "  备份目录: $BackupDir" -ForegroundColor Cyan
Write-Host "  创建的配置文件:" -ForegroundColor Cyan
$ConfigReport.CreatedConfigs | ForEach-Object { Write-Host "    - $_" -ForegroundColor Gray }
Write-Host "  配置报告: $ReportPath" -ForegroundColor Cyan

# 11. 下一步建议
Write-Host "\n🎯 下一步建议:" -ForegroundColor Green
Write-Host "  1. 运行 'npm run type-check' 验证配置" -ForegroundColor Cyan
Write-Host "  2. 更新 package.json 脚本使用新配置" -ForegroundColor Cyan
Write-Host "  3. 更新导入语句使用路径映射 (@/...)" -ForegroundColor Cyan
Write-Host "  4. 配置 IDE 使用新的 tsconfig.json" -ForegroundColor Cyan
Write-Host "  5. 删除旧的冗余配置文件" -ForegroundColor Cyan

Write-Host "\n✅ TypeScript 配置规范化完成!" -ForegroundColor Green