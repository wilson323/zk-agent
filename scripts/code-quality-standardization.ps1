#!/usr/bin/env pwsh
# 代码质量和规范检查脚本
# 统一代码格式、检查代码质量、确保项目规范一致性

Write-Host "🎯 开始代码质量和规范检查..." -ForegroundColor Green

# 设置错误处理
$ErrorActionPreference = "Stop"

# 项目根目录
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "📁 项目根目录: $ProjectRoot" -ForegroundColor Blue

# 1. 检查代码质量工具配置
Write-Host "\n🔍 第一步: 检查代码质量工具配置..." -ForegroundColor Yellow

$QualityTools = @{
    "ESLint" = @{
        ConfigFiles = @(".eslintrc.js", ".eslintrc.json", ".eslintrc.yml", "eslint.config.js")
        PackageCheck = "eslint"
        Found = $false
    }
    "Prettier" = @{
        ConfigFiles = @(".prettierrc", ".prettierrc.json", ".prettierrc.js", "prettier.config.js")
        PackageCheck = "prettier"
        Found = $false
    }
    "Husky" = @{
        ConfigFiles = @(".husky")
        PackageCheck = "husky"
        Found = $false
    }
    "lint-staged" = @{
        ConfigFiles = @(".lintstagedrc", ".lintstagedrc.json")
        PackageCheck = "lint-staged"
        Found = $false
    }
}

# 检查配置文件
foreach ($Tool in $QualityTools.Keys) {
    $ToolConfig = $QualityTools[$Tool]
    
    foreach ($ConfigFile in $ToolConfig.ConfigFiles) {
        if (Test-Path $ConfigFile) {
            $QualityTools[$Tool].Found = $true
            Write-Host "  ✅ 发现 $Tool 配置: $ConfigFile" -ForegroundColor Green
            break
        }
    }
    
    if (-not $QualityTools[$Tool].Found) {
        Write-Host "  ❌ 未发现 $Tool 配置" -ForegroundColor Red
    }
}

# 检查 package.json 中的依赖
if (Test-Path "package.json") {
    $PackageJson = Get-Content "package.json" | ConvertFrom-Json
    $AllDeps = @{}
    
    if ($PackageJson.dependencies) {
        $PackageJson.dependencies.PSObject.Properties | ForEach-Object { $AllDeps[$_.Name] = $_.Value }
    }
    if ($PackageJson.devDependencies) {
        $PackageJson.devDependencies.PSObject.Properties | ForEach-Object { $AllDeps[$_.Name] = $_.Value }
    }
    
    Write-Host "\n  检查 package.json 依赖:" -ForegroundColor Cyan
    foreach ($ToolName in $QualityTools.Keys) {
        $PackageCheck = $QualityTools[$ToolName].PackageCheck
        if ($AllDeps.ContainsKey($PackageCheck)) {
            $Version = $AllDeps[$PackageCheck]
            Write-Host "    ✅ ${ToolName}: ${Version}" -ForegroundColor Green
        } else {
            Write-Host "    ❌ ${ToolName}: 未安装" -ForegroundColor Red
        }
    }
}

# 2. 运行代码格式检查
Write-Host "\n🎨 第二步: 运行代码格式检查..." -ForegroundColor Yellow

# Prettier 检查
if ($QualityTools["Prettier"].Found) {
    Write-Host "  运行 Prettier 检查..." -ForegroundColor Cyan
    try {
        $PrettierCheck = & npx prettier --check "**/*.{ts,tsx,js,jsx,json,md}" --ignore-path .gitignore 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ Prettier 格式检查通过" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  发现格式问题:" -ForegroundColor Yellow
            Write-Host "$PrettierCheck" -ForegroundColor Gray
            
            # 自动修复格式问题
            Write-Host "  🔧 自动修复格式问题..." -ForegroundColor Cyan
            & npx prettier --write "**/*.{ts,tsx,js,jsx,json,md}" --ignore-path .gitignore
            Write-Host "  ✅ 格式问题已修复" -ForegroundColor Green
        }
    } catch {
        Write-Host "  ❌ Prettier 检查失败: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "  ⚠️  Prettier 未配置，跳过格式检查" -ForegroundColor Yellow
}

# 3. 运行 ESLint 检查
Write-Host "\n🔍 第三步: 运行 ESLint 检查..." -ForegroundColor Yellow

if ($QualityTools["ESLint"].Found) {
    Write-Host "  运行 ESLint 检查..." -ForegroundColor Cyan
    try {
        $EslintCheck = & npx eslint "**/*.{ts,tsx,js,jsx}" --ignore-path .gitignore --max-warnings 0 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ ESLint 检查通过" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  发现代码质量问题:" -ForegroundColor Yellow
            Write-Host "$EslintCheck" -ForegroundColor Gray
            
            # 尝试自动修复
            Write-Host "  🔧 尝试自动修复..." -ForegroundColor Cyan
            & npx eslint "**/*.{ts,tsx,js,jsx}" --ignore-path .gitignore --fix
            
            # 再次检查
            $EslintRecheck = & npx eslint "**/*.{ts,tsx,js,jsx}" --ignore-path .gitignore --max-warnings 0 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✅ 问题已自动修复" -ForegroundColor Green
            } else {
                Write-Host "  ⚠️  仍有问题需要手动修复" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "  ❌ ESLint 检查失败: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "  ⚠️  ESLint 未配置，跳过代码质量检查" -ForegroundColor Yellow
}

# 4. 检查导入路径规范
Write-Host "\n📦 第四步: 检查导入路径规范..." -ForegroundColor Yellow

$ImportIssues = @()

# 查找所有 TypeScript/JavaScript 文件
$CodeFiles = Get-ChildItem -Path "." -Include "*.ts", "*.tsx", "*.js", "*.jsx" -Recurse | Where-Object { 
    $_.FullName -notlike "*node_modules*" -and 
    $_.FullName -notlike "*.next*" -and 
    $_.FullName -notlike "*dist*" -and
    $_.FullName -notlike "*build*"
}

Write-Host "  检查 $($CodeFiles.Count) 个代码文件..." -ForegroundColor Cyan

foreach ($File in $CodeFiles) {
    try {
        $Content = (Get-Content $File.FullName -ErrorAction Stop) -join "`n"
    } catch {
        Write-Host "  ⚠️  无法读取文件: $($File.FullName)" -ForegroundColor Yellow
        continue
    }
    $RelativePath = $File.FullName.Replace("$ProjectRoot\\", "")
    
    # 简化的导入检查
    if ($Content -match "\.\.\./\.\./") {
        $ImportIssues += [PSCustomObject]@{
            File = $RelativePath
            Issue = "深层相对路径导入"
            ImportPath = "../../.."
            Suggestion = "考虑使用路径映射 (@/...)"
        }
    }
    
    # 简化的导入检查 - 检查是否使用了路径映射
    if ($Content -match "components/" -and $Content -notmatch "@/components") {
        $ImportIssues += [PSCustomObject]@{
            File = $RelativePath
            Issue = "未使用路径映射"
            ImportPath = "components/*"
            Suggestion = "使用 @/components 替代 components"
        }
    }
    if ($Content -match "lib/" -and $Content -notmatch "@/lib") {
        $ImportIssues += [PSCustomObject]@{
            File = $RelativePath
            Issue = "未使用路径映射"
            ImportPath = "lib/*"
            Suggestion = "使用 @/lib 替代 lib"
        }
    }
}

if ($ImportIssues.Count -gt 0) {
    Write-Host "  ⚠️  发现 $($ImportIssues.Count) 个导入路径问题:" -ForegroundColor Yellow
    $ImportIssues | ForEach-Object {
        Write-Host "    $($_.File): $($_.Issue) - $($_.ImportPath)" -ForegroundColor Gray
    }
} else {
    Write-Host "  ✅ 导入路径规范检查通过" -ForegroundColor Green
}

# 5. 检查代码重复
Write-Host "\n🔄 第五步: 检查代码重复..." -ForegroundColor Yellow

$DuplicateComponents = @()
$ComponentNames = @{}

# 查找所有组件文件
$ComponentFiles = Get-ChildItem -Path "." -Include "*.tsx" -Recurse | Where-Object { 
    $_.FullName -notlike "*node_modules*" -and 
    $_.FullName -notlike "*.next*" -and
    $_.BaseName -cmatch "^[A-Z]" # 组件文件通常以大写字母开头
}

foreach ($Component in $ComponentFiles) {
    $ComponentName = $Component.BaseName
    $RelativePath = $Component.FullName.Replace("$ProjectRoot\\", "")
    
    if ($ComponentNames.ContainsKey($ComponentName)) {
        $DuplicateComponents += [PSCustomObject]@{
            ComponentName = $ComponentName
            ExistingPath = $ComponentNames[$ComponentName]
            DuplicatePath = $RelativePath
        }
    } else {
        $ComponentNames[$ComponentName] = $RelativePath
    }
}

if ($DuplicateComponents.Count -gt 0) {
    Write-Host "  ⚠️  发现 $($DuplicateComponents.Count) 个重复组件:" -ForegroundColor Yellow
    $DuplicateComponents | ForEach-Object {
        Write-Host "    $($_.ComponentName):" -ForegroundColor Gray
        Write-Host "      - $($_.ExistingPath)" -ForegroundColor Gray
        Write-Host "      - $($_.DuplicatePath)" -ForegroundColor Gray
    }
} else {
    Write-Host "  ✅ 未发现重复组件" -ForegroundColor Green
}

# 6. 检查未使用的文件
Write-Host "\n🗑️ 第六步: 检查未使用的文件..." -ForegroundColor Yellow

# 这里可以集成更复杂的未使用文件检测逻辑
# 目前只检查明显的临时文件和备份文件
$UnusedFiles = Get-ChildItem -Path "." -Recurse | Where-Object {
    ($_.Name -like "*.backup.*" -or 
     $_.Name -like "*.old" -or 
     $_.Name -like "*.tmp" -or 
     $_.Name -like "*~") -and
    $_.FullName -notlike "*node_modules*"
}

if ($UnusedFiles.Count -gt 0) {
    Write-Host "  ⚠️  发现 $($UnusedFiles.Count) 个可能未使用的文件:" -ForegroundColor Yellow
    $UnusedFiles | ForEach-Object {
        $RelativePath = $_.FullName.Replace("$ProjectRoot\\", "")
        Write-Host "    - $RelativePath" -ForegroundColor Gray
    }
} else {
    Write-Host "  ✅ 未发现明显的未使用文件" -ForegroundColor Green
}

# 7. 生成代码质量报告
Write-Host "\n📊 第七步: 生成代码质量报告..." -ForegroundColor Yellow

$QualityReport = @{
    Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    ToolsStatus = $QualityTools
    ImportIssues = $ImportIssues
    DuplicateComponents = $DuplicateComponents
    UnusedFiles = $UnusedFiles | ForEach-Object { $_.FullName.Replace("$ProjectRoot\\", "") }
    Summary = @{
        TotalFiles = $CodeFiles.Count
        ImportIssues = $ImportIssues.Count
        DuplicateComponents = $DuplicateComponents.Count
        UnusedFiles = $UnusedFiles.Count
    }
    Recommendations = @()
}

# 添加建议
if ($ImportIssues.Count -gt 0) {
    $QualityReport.Recommendations += "修复导入路径问题，使用统一的路径映射"
}

if ($DuplicateComponents.Count -gt 0) {
    $QualityReport.Recommendations += "合并或删除重复组件"
}

if ($UnusedFiles.Count -gt 0) {
    $QualityReport.Recommendations += "清理未使用的文件"
}

if (-not $QualityTools["ESLint"].Found) {
    $QualityReport.Recommendations += "配置 ESLint 进行代码质量检查"
}

if (-not $QualityTools["Prettier"].Found) {
    $QualityReport.Recommendations += "配置 Prettier 进行代码格式化"
}

if (-not $QualityTools["Husky"].Found) {
    $QualityReport.Recommendations += "配置 Husky 进行 Git hooks"
}

$QualityReport.Recommendations += "运行完整的测试套件"
$QualityReport.Recommendations += "更新文档和 README"

$ReportPath = "code-quality-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
$QualityReport | ConvertTo-Json -Depth 10 | Out-File -FilePath $ReportPath -Encoding UTF8

Write-Host "  ✅ 代码质量报告已保存: $ReportPath" -ForegroundColor Green

# 8. 显示摘要
Write-Host "\n📋 代码质量摘要:" -ForegroundColor Green
Write-Host "  检查文件数: $($CodeFiles.Count)" -ForegroundColor Cyan
Write-Host "  导入路径问题: $($ImportIssues.Count)" -ForegroundColor $(if ($ImportIssues.Count -gt 0) { "Yellow" } else { "Green" })
Write-Host "  重复组件: $($DuplicateComponents.Count)" -ForegroundColor $(if ($DuplicateComponents.Count -gt 0) { "Yellow" } else { "Green" })
Write-Host "  未使用文件: $($UnusedFiles.Count)" -ForegroundColor $(if ($UnusedFiles.Count -gt 0) { "Yellow" } else { "Green" })
Write-Host "  质量报告: $ReportPath" -ForegroundColor Cyan

# 9. 下一步建议
Write-Host "\n🎯 下一步建议:" -ForegroundColor Green
Write-Host "  1. 查看质量报告: $ReportPath" -ForegroundColor Cyan
Write-Host "  2. 修复导入路径问题" -ForegroundColor Cyan
Write-Host "  3. 处理重复组件" -ForegroundColor Cyan
Write-Host "  4. 清理未使用的文件" -ForegroundColor Cyan
Write-Host "  5. 配置缺失的代码质量工具" -ForegroundColor Cyan
Write-Host "  6. 运行完整测试套件" -ForegroundColor Cyan

Write-Host "\n✅ 代码质量检查完成!" -ForegroundColor Green