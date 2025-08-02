#!/usr/bin/env pwsh
# ZK-Agent 项目主规范化脚本
# 整合所有规范化流程，确保项目架构一致性和代码质量

Write-Host "🚀 ZK-Agent 项目全面规范化开始..." -ForegroundColor Green -BackgroundColor Black
Write-Host "=" * 80 -ForegroundColor Green

# 设置错误处理
$ErrorActionPreference = "Stop"

# 项目根目录
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "📁 项目根目录: $ProjectRoot" -ForegroundColor Blue
Write-Host "⏰ 开始时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Blue

# 检查脚本目录
$ScriptsDir = Join-Path $ProjectRoot "scripts"
if (-not (Test-Path $ScriptsDir)) {
    Write-Host "❌ 脚本目录不存在: $ScriptsDir" -ForegroundColor Red
    exit 1
}

# 定义规范化步骤
$StandardizationSteps = @(
    @{
        Name = "项目清理和规范化"
        Script = "project-cleanup-and-standardization.ps1"
        Description = "清理冗余目录和文件，统一项目架构"
        Icon = "🧹"
    },
    @{
        Name = "TypeScript 配置规范化"
        Script = "typescript-config-standardization.ps1"
        Description = "统一 TypeScript 配置，确保路径映射一致性"
        Icon = "🔧"
    },
    @{
        Name = "代码质量规范化"
        Script = "code-quality-standardization.ps1"
        Description = "检查代码质量，修复格式和规范问题"
        Icon = "🎯"
    },
    @{
        Name = "文档规范化"
        Script = "documentation-standardization.ps1"
        Description = "整理文档结构，消除重复和冗余"
        Icon = "📚"
    },
    @{
        Name = "智能化质量保障体系集成"
        Script = "integrate-quality-system.ps1"
        Description = "集成架构符合度评估和实时质量监控系统"
        Icon = "🏗️"
    }
)

# 创建总体报告目录
$ReportsDir = "standardization-reports-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $ReportsDir -Force | Out-Null
Write-Host "📊 报告目录: $ReportsDir" -ForegroundColor Blue

# 初始化总体报告
$MasterReport = @{
    ProjectName = "ZK-Agent"
    StartTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    ProjectRoot = $ProjectRoot
    ReportsDirectory = $ReportsDir
    Steps = @()
    Summary = @{
        TotalSteps = $StandardizationSteps.Count
        CompletedSteps = 0
        FailedSteps = 0
        Warnings = 0
        Errors = 0
    }
    Recommendations = @()
    NextActions = @()
}

Write-Host "\n📋 规范化计划:" -ForegroundColor Yellow
for ($i = 0; $i -lt $StandardizationSteps.Count; $i++) {
    $Step = $StandardizationSteps[$i]
    Write-Host "  $($i + 1). $($Step.Icon) $($Step.Name)" -ForegroundColor Cyan
    Write-Host "     $($Step.Description)" -ForegroundColor Gray
}

Write-Host "\n" + "=" * 80 -ForegroundColor Green

# 执行规范化步骤
for ($i = 0; $i -lt $StandardizationSteps.Count; $i++) {
    $Step = $StandardizationSteps[$i]
    $StepNumber = $i + 1
    $ScriptPath = Join-Path $ScriptsDir $Step.Script
    
    Write-Host "\n$($Step.Icon) 步骤 $StepNumber/$($StandardizationSteps.Count): $($Step.Name)" -ForegroundColor Yellow -BackgroundColor DarkBlue
    Write-Host "📄 脚本: $($Step.Script)" -ForegroundColor Cyan
    Write-Host "📝 描述: $($Step.Description)" -ForegroundColor Cyan
    Write-Host "-" * 60 -ForegroundColor Gray
    
    $StepReport = @{
        StepNumber = $StepNumber
        Name = $Step.Name
        Script = $Step.Script
        StartTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Status = "Running"
        Duration = $null
        Output = @()
        Errors = @()
        GeneratedFiles = @()
    }
    
    $StepStartTime = Get-Date
    
    try {
        if (Test-Path $ScriptPath) {
            Write-Host "▶️  执行脚本: $ScriptPath" -ForegroundColor Green
            
            # 执行脚本并捕获输出
            $ScriptOutput = & PowerShell -File $ScriptPath 2>&1
            
            if ($LASTEXITCODE -eq 0 -or $null -eq $LASTEXITCODE) {
                $StepReport.Status = "Completed"
                $MasterReport.Summary.CompletedSteps++
                Write-Host "✅ 步骤完成: $($Step.Name)" -ForegroundColor Green
            } else {
                $StepReport.Status = "Failed"
                $StepReport.Errors += "脚本执行失败，退出代码: $LASTEXITCODE"
                $MasterReport.Summary.FailedSteps++
                Write-Host "❌ 步骤失败: $($Step.Name)" -ForegroundColor Red
            }
            
            # 保存脚本输出
            $StepReport.Output = $ScriptOutput | ForEach-Object { $_.ToString() }
            
            # 查找生成的报告文件
            $GeneratedReports = Get-ChildItem -Path "." -Filter "*report*.json" -File | Where-Object {
                $_.LastWriteTime -gt $StepStartTime
            }
            
            foreach ($Report in $GeneratedReports) {
                $ReportDestination = Join-Path $ReportsDir $Report.Name
                Move-Item -Path $Report.FullName -Destination $ReportDestination -Force
                $StepReport.GeneratedFiles += $Report.Name
                Write-Host "📊 移动报告: $($Report.Name) -> $ReportsDir" -ForegroundColor Cyan
            }
            
        } else {
            $StepReport.Status = "Skipped"
            $StepReport.Errors += "脚本文件不存在: $ScriptPath"
            $MasterReport.Summary.Warnings++
            Write-Host "⚠️  跳过步骤: 脚本文件不存在" -ForegroundColor Yellow
        }
        
    } catch {
        $StepReport.Status = "Error"
        $StepReport.Errors += $_.Exception.Message
        $MasterReport.Summary.Errors++
        Write-Host "💥 步骤错误: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    $StepEndTime = Get-Date
    $StepReport.Duration = ($StepEndTime - $StepStartTime).TotalSeconds
    $StepReport.EndTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    $MasterReport.Steps += $StepReport
    
    Write-Host "⏱️  步骤耗时: $([Math]::Round($StepReport.Duration, 2)) 秒" -ForegroundColor Gray
    Write-Host "-" * 60 -ForegroundColor Gray
}

# 收集所有生成的文件
Write-Host "\n📁 收集生成的文件..." -ForegroundColor Yellow

$GeneratedFiles = @{
    "配置文件" = @()
    "报告文件" = @()
    "文档文件" = @()
    "备份目录" = @()
}

# 查找新生成的配置文件
$NewConfigFiles = Get-ChildItem -Path "." -Include "tsconfig*.json", "*.config.js", ".eslintrc*", ".prettierrc*" -File | Where-Object {
    $_.LastWriteTime -gt (Get-Date).AddHours(-1)
}
$GeneratedFiles["配置文件"] = $NewConfigFiles | ForEach-Object { $_.Name }

# 查找报告目录中的文件
if (Test-Path $ReportsDir) {
    $ReportFiles = Get-ChildItem -Path $ReportsDir -File
    $GeneratedFiles["报告文件"] = $ReportFiles | ForEach-Object { $_.Name }
}

# 查找新生成的文档文件
$NewDocFiles = Get-ChildItem -Path "." -Include "*.md" -File | Where-Object {
    $_.LastWriteTime -gt (Get-Date).AddHours(-1) -and
    $_.Name -like "*INDEX*" -or $_.Name -like "*TEMPLATE*" -or $_.Name -like "*STANDARDS*"
}
$GeneratedFiles["文档文件"] = $NewDocFiles | ForEach-Object { $_.Name }

# 查找备份目录
$BackupDirs = Get-ChildItem -Path "." -Directory | Where-Object {
    $_.Name -like "*backup*" -and $_.LastWriteTime -gt (Get-Date).AddHours(-1)
}
$GeneratedFiles["备份目录"] = $BackupDirs | ForEach-Object { $_.Name }

# 显示生成的文件
foreach ($Category in $GeneratedFiles.Keys) {
    $Files = $GeneratedFiles[$Category]
    if ($Files.Count -gt 0) {
        Write-Host "  $Category ($($Files.Count) 个):" -ForegroundColor Cyan
        $Files | ForEach-Object {
            Write-Host "    - $_" -ForegroundColor Gray
        }
    }
}

# 生成建议和下一步行动
Write-Host "\n🎯 生成建议和下一步行动..." -ForegroundColor Yellow

# 基于执行结果生成建议
if ($MasterReport.Summary.FailedSteps -gt 0) {
    $MasterReport.Recommendations += "检查失败的步骤并手动修复问题"
    $MasterReport.NextActions += "查看错误日志并解决失败的规范化步骤"
}

if ($MasterReport.Summary.Warnings -gt 0) {
    $MasterReport.Recommendations += "检查警告信息并评估是否需要手动处理"
}

# 通用建议
$MasterReport.Recommendations += @(
    "运行完整的测试套件验证更改",
    "检查所有生成的配置文件",
    "更新 IDE 设置以使用新的配置",
    "提交更改到版本控制系统",
    "更新团队开发文档"
)

$MasterReport.NextActions += @(
    "运行 'npm run test' 验证功能",
    "运行 'npm run type-check' 验证 TypeScript 配置",
    "运行 'npm run lint' 验证代码质量",
    "检查并删除不需要的备份文件",
    "更新 README.md 文档"
)

# 完成总体报告
$MasterReport.EndTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$MasterReport.TotalDuration = ((Get-Date) - (Get-Date $MasterReport.StartTime)).TotalMinutes
$MasterReport.GeneratedFiles = $GeneratedFiles

# 保存主报告
$MasterReportPath = Join-Path $ReportsDir "master-standardization-report.json"
$MasterReport | ConvertTo-Json -Depth 10 | Out-File -FilePath $MasterReportPath -Encoding UTF8

# 创建可读的摘要报告
$SummaryReport = @"
# ZK-Agent 项目规范化摘要报告

**生成时间:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
**项目路径:** $ProjectRoot
**总耗时:** $([Math]::Round($MasterReport.TotalDuration, 2)) 分钟

## 📊 执行摘要

- **总步骤数:** $($MasterReport.Summary.TotalSteps)
- **完成步骤:** $($MasterReport.Summary.CompletedSteps)
- **失败步骤:** $($MasterReport.Summary.FailedSteps)
- **警告数量:** $($MasterReport.Summary.Warnings)
- **错误数量:** $($MasterReport.Summary.Errors)

## 📋 执行步骤

"@

foreach ($Step in $MasterReport.Steps) {
    $StatusIcon = switch ($Step.Status) {
        "Completed" { "✅" }
        "Failed" { "❌" }
        "Error" { "💥" }
        "Skipped" { "⚠️" }
        default { "❓" }
    }
    
    $SummaryReport += @"

### $StatusIcon $($Step.Name)

- **状态:** $($Step.Status)
- **耗时:** $([Math]::Round($Step.Duration, 2)) 秒
- **生成文件:** $($Step.GeneratedFiles.Count) 个

"@
    
    if ($Step.Errors.Count -gt 0) {
        $SummaryReport += "**错误:**\n"
        foreach ($ErrorMsg in $Step.Errors) {
            $SummaryReport += "- $ErrorMsg\n"
        }
    }
}

$SummaryReport += @"

## 📁 生成的文件

"@

foreach ($Category in $GeneratedFiles.Keys) {
    $Files = $GeneratedFiles[$Category]
    if ($Files.Count -gt 0) {
        $SummaryReport += "### $Category\n\n"
        foreach ($File in $Files) {
            $SummaryReport += "- $File\n"
        }
        $SummaryReport += "\n"
    }
}

$SummaryReport += @"
## 🎯 建议

"@

foreach ($Recommendation in $MasterReport.Recommendations) {
    $SummaryReport += "- $Recommendation\n"
}

$SummaryReport += @"

## 📝 下一步行动

"@

foreach ($Action in $MasterReport.NextActions) {
    $SummaryReport += "- $Action\n"
}

$SummaryReport += @"

---

**报告目录:** $ReportsDir
**详细报告:** master-standardization-report.json
"@

$SummaryReportPath = Join-Path $ReportsDir "STANDARDIZATION_SUMMARY.md"
$SummaryReport | Out-File -FilePath $SummaryReportPath -Encoding UTF8

# 显示最终摘要
Write-Host "\n" + "=" * 80 -ForegroundColor Green
Write-Host "🎉 ZK-Agent 项目规范化完成!" -ForegroundColor Green -BackgroundColor Black
Write-Host "=" * 80 -ForegroundColor Green

Write-Host "\n📊 执行摘要:" -ForegroundColor Yellow
Write-Host "  总耗时: $([Math]::Round($MasterReport.TotalDuration, 2)) 分钟" -ForegroundColor Cyan
Write-Host "  完成步骤: $($MasterReport.Summary.CompletedSteps)/$($MasterReport.Summary.TotalSteps)" -ForegroundColor $(if ($MasterReport.Summary.CompletedSteps -eq $MasterReport.Summary.TotalSteps) { "Green" } else { "Yellow" })
Write-Host "  失败步骤: $($MasterReport.Summary.FailedSteps)" -ForegroundColor $(if ($MasterReport.Summary.FailedSteps -eq 0) { "Green" } else { "Red" })
Write-Host "  警告数量: $($MasterReport.Summary.Warnings)" -ForegroundColor $(if ($MasterReport.Summary.Warnings -eq 0) { "Green" } else { "Yellow" })
Write-Host "  错误数量: $($MasterReport.Summary.Errors)" -ForegroundColor $(if ($MasterReport.Summary.Errors -eq 0) { "Green" } else { "Red" })

Write-Host "\n📁 生成的文件:" -ForegroundColor Yellow
Write-Host "  报告目录: $ReportsDir" -ForegroundColor Cyan
Write-Host "  摘要报告: STANDARDIZATION_SUMMARY.md" -ForegroundColor Cyan
Write-Host "  详细报告: master-standardization-report.json" -ForegroundColor Cyan

Write-Host "\n🎯 立即行动:" -ForegroundColor Yellow
Write-Host "  1. 查看摘要报告: $SummaryReportPath" -ForegroundColor Cyan
Write-Host "  2. 运行测试验证: npm run test" -ForegroundColor Cyan
Write-Host "  3. 检查类型: npm run type-check" -ForegroundColor Cyan
Write-Host "  4. 代码质量检查: npm run lint" -ForegroundColor Cyan
Write-Host "  5. 提交更改: git add . && git commit -m 'feat: 项目架构规范化'" -ForegroundColor Cyan

if ($MasterReport.Summary.FailedSteps -gt 0 -or $MasterReport.Summary.Errors -gt 0) {
    Write-Host "\n⚠️  注意: 发现失败或错误，请检查详细报告" -ForegroundColor Yellow -BackgroundColor Red
} else {
    Write-Host "\n✅ 所有规范化步骤成功完成!" -ForegroundColor Green -BackgroundColor Black
}

Write-Host "\n" + "=" * 80 -ForegroundColor Green