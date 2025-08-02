#!/usr/bin/env pwsh
# ZK-Agent 项目清理和规范化脚本
# 用于清理冗余目录和文件，统一项目架构

Write-Host "🚀 开始 ZK-Agent 项目架构清理和规范化..." -ForegroundColor Green

# 设置错误处理
$ErrorActionPreference = "Stop"

# 项目根目录
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "📁 项目根目录: $ProjectRoot" -ForegroundColor Blue

# 1. 备份重要文件
Write-Host "\n📦 第一步: 备份重要文件..." -ForegroundColor Yellow

$BackupDir = "backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null

# 备份 frontend/src 目录
if (Test-Path "frontend/src") {
    Write-Host "  备份 frontend/src 目录..." -ForegroundColor Cyan
    Copy-Item -Path "frontend/src" -Destination "$BackupDir/frontend-src" -Recurse -Force
}

# 备份 src 目录
if (Test-Path "src") {
    Write-Host "  备份 src 目录..." -ForegroundColor Cyan
    Copy-Item -Path "src" -Destination "$BackupDir/src" -Recurse -Force
}

Write-Host "  ✅ 备份完成: $BackupDir" -ForegroundColor Green

# 2. 分析和对比代码
Write-Host "\n🔍 第二步: 分析代码差异..." -ForegroundColor Yellow

# 检查 FastGPTChatInterface 组件
if (Test-Path "frontend/src/components/chat/FastGPTChatInterface.tsx") {
    Write-Host "  发现重复组件: FastGPTChatInterface.tsx" -ForegroundColor Red
    
    # 检查主项目中是否有类似组件
    $MainChatComponents = Get-ChildItem -Path "components/chat" -Filter "*chat*.tsx" -Recurse -ErrorAction SilentlyContinue
    if ($MainChatComponents) {
        Write-Host "    主项目中存在聊天组件:" -ForegroundColor Cyan
        $MainChatComponents | ForEach-Object { Write-Host "      - $($_.FullName)" -ForegroundColor Gray }
    }
}

# 检查 ReactFlowWorkflowEditor 组件
if (Test-Path "frontend/src/components/workflow/ReactFlowWorkflowEditor.tsx") {
    Write-Host "  发现重复组件: ReactFlowWorkflowEditor.tsx" -ForegroundColor Red
    
    # 检查主项目中是否有类似组件
    $MainWorkflowComponents = Get-ChildItem -Path "components" -Filter "*workflow*.tsx" -Recurse -ErrorAction SilentlyContinue
    if ($MainWorkflowComponents) {
        Write-Host "    主项目中存在工作流组件:" -ForegroundColor Cyan
        $MainWorkflowComponents | ForEach-Object { Write-Host "      - $($_.FullName)" -ForegroundColor Gray }
    }
}

# 检查 workflowStore
if (Test-Path "frontend/src/stores/workflowStore.ts") {
    Write-Host "  发现状态管理文件: workflowStore.ts" -ForegroundColor Red
    
    # 检查主项目中是否有类似状态管理
    $MainStores = Get-ChildItem -Path "." -Filter "*store*.ts" -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*frontend/src*" }
    if ($MainStores) {
        Write-Host "    主项目中存在状态管理文件:" -ForegroundColor Cyan
        $MainStores | ForEach-Object { Write-Host "      - $($_.FullName)" -ForegroundColor Gray }
    }
}

# 3. 清理空目录
Write-Host "\n🧹 第三步: 清理空目录..." -ForegroundColor Yellow

# 检查 src 目录是否只包含 .gitkeep 文件
if (Test-Path "src") {
    $SrcFiles = Get-ChildItem -Path "src" -Recurse -File | Where-Object { $_.Name -ne ".gitkeep" }
    if ($SrcFiles.Count -eq 0) {
        Write-Host "  删除空的 src 目录..." -ForegroundColor Cyan
        Remove-Item -Path "src" -Recurse -Force
        Write-Host "  ✅ 已删除 src 目录" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  src 目录包含有效文件，跳过删除" -ForegroundColor Yellow
        $SrcFiles | ForEach-Object { Write-Host "      - $($_.FullName)" -ForegroundColor Gray }
    }
}

# 4. 处理重复组件
Write-Host "\n🔄 第四步: 处理重复组件..." -ForegroundColor Yellow

# 创建迁移报告
$MigrationReport = @()

if (Test-Path "frontend/src/components") {
    Write-Host "  分析 frontend/src/components 目录..." -ForegroundColor Cyan
    
    # 获取所有组件文件
    $FrontendComponents = Get-ChildItem -Path "frontend/src/components" -Filter "*.tsx" -Recurse
    
    foreach ($Component in $FrontendComponents) {
        $RelativePath = $Component.FullName.Replace("$ProjectRoot\\", "")
        $ComponentName = $Component.BaseName
        
        # 检查主项目中是否存在同名组件
        $MainComponent = Get-ChildItem -Path "components" -Filter "$ComponentName.tsx" -Recurse -ErrorAction SilentlyContinue
        
        if ($MainComponent) {
            $MigrationReport += [PSCustomObject]@{
                Component = $ComponentName
                FrontendPath = $RelativePath
                MainPath = $MainComponent.FullName.Replace("$ProjectRoot\\", "")
                Action = "需要对比和合并"
                Status = "重复"
            }
            Write-Host "    ⚠️  重复组件: $ComponentName" -ForegroundColor Yellow
        } else {
            $MigrationReport += [PSCustomObject]@{
                Component = $ComponentName
                FrontendPath = $RelativePath
                MainPath = "不存在"
                Action = "可以迁移到主项目"
                Status = "独有"
            }
            Write-Host "    ✅ 独有组件: $ComponentName" -ForegroundColor Green
        }
    }
}

# 5. 清理根目录重复文档
Write-Host "\n📄 第五步: 清理根目录重复文档..." -ForegroundColor Yellow

# 查找重复的报告文件
$ReportFiles = Get-ChildItem -Path "." -Filter "*report*.json" -File
if ($ReportFiles.Count -gt 0) {
    Write-Host "  发现报告文件:" -ForegroundColor Cyan
    $ReportFiles | ForEach-Object { Write-Host "    - $($_.Name)" -ForegroundColor Gray }
    
    # 创建 reports 目录
    if (-not (Test-Path "reports")) {
        New-Item -ItemType Directory -Path "reports" -Force | Out-Null
    }
    
    # 移动报告文件
    foreach ($ReportFile in $ReportFiles) {
        Move-Item -Path $ReportFile.FullName -Destination "reports/" -Force
        Write-Host "    移动: $($ReportFile.Name) -> reports/" -ForegroundColor Cyan
    }
}

# 查找备份文件
$BackupFiles = Get-ChildItem -Path ".github/workflows" -Filter "*.backup.*" -File -ErrorAction SilentlyContinue
if ($BackupFiles.Count -gt 0) {
    Write-Host "  发现GitHub Actions备份文件:" -ForegroundColor Cyan
    $BackupFiles | ForEach-Object { Write-Host "    - $($_.Name)" -ForegroundColor Gray }
    
    # 创建备份目录
    if (-not (Test-Path ".github/workflows/backup")) {
        New-Item -ItemType Directory -Path ".github/workflows/backup" -Force | Out-Null
    }
    
    # 移动备份文件
    foreach ($BackupFile in $BackupFiles) {
        if ($BackupFile.Directory.Name -ne "backup") {
            Move-Item -Path $BackupFile.FullName -Destination ".github/workflows/backup/" -Force
            Write-Host "    移动: $($BackupFile.Name) -> .github/workflows/backup/" -ForegroundColor Cyan
        }
    }
}

# 6. 生成清理报告
Write-Host "\n📊 第六步: 生成清理报告..." -ForegroundColor Yellow

$CleanupReport = @{
    Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    BackupDirectory = $BackupDir
    ComponentMigration = $MigrationReport
    CleanedDirectories = @()
    MovedFiles = @()
    Recommendations = @()
}

# 添加建议
if ($MigrationReport | Where-Object { $_.Status -eq "重复" }) {
    $CleanupReport.Recommendations += "需要手动对比重复组件的代码差异"
    $CleanupReport.Recommendations += "合并重复组件的功能到主项目"
    $CleanupReport.Recommendations += "删除 frontend/src 目录"
}

if ($MigrationReport | Where-Object { $_.Status -eq "独有" }) {
    $CleanupReport.Recommendations += "将独有组件迁移到主项目的 components 目录"
}

$CleanupReport.Recommendations += "更新 TypeScript 路径配置"
$CleanupReport.Recommendations += "运行测试确保功能正常"
$CleanupReport.Recommendations += "更新文档和 README"

# 保存报告
$ReportPath = "cleanup-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
$CleanupReport | ConvertTo-Json -Depth 10 | Out-File -FilePath $ReportPath -Encoding UTF8

Write-Host "  ✅ 清理报告已保存: $ReportPath" -ForegroundColor Green

# 7. 显示摘要
Write-Host "\n📋 清理摘要:" -ForegroundColor Green
Write-Host "  备份目录: $BackupDir" -ForegroundColor Cyan
Write-Host "  发现重复组件: $($MigrationReport | Where-Object { $_.Status -eq '重复' } | Measure-Object | Select-Object -ExpandProperty Count)" -ForegroundColor Yellow
Write-Host "  发现独有组件: $($MigrationReport | Where-Object { $_.Status -eq '独有' } | Measure-Object | Select-Object -ExpandProperty Count)" -ForegroundColor Green
Write-Host "  清理报告: $ReportPath" -ForegroundColor Cyan

# 8. 下一步建议
Write-Host "\n🎯 下一步建议:" -ForegroundColor Green
Write-Host "  1. 查看清理报告: $ReportPath" -ForegroundColor Cyan
Write-Host "  2. 对比重复组件的代码差异" -ForegroundColor Cyan
Write-Host "  3. 手动合并有价值的功能" -ForegroundColor Cyan
Write-Host "  4. 删除 frontend/src 目录" -ForegroundColor Cyan
Write-Host "  5. 更新配置文件和导入路径" -ForegroundColor Cyan
Write-Host "  6. 运行测试验证功能" -ForegroundColor Cyan

Write-Host "\n✅ 项目架构清理完成!" -ForegroundColor Green
Write-Host "\n⚠️  注意: 请手动检查备份文件并确认删除重复组件" -ForegroundColor Yellow