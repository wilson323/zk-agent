# ZK-Agent 项目质量检查脚本
param(
    [switch]$Full,
    [switch]$Security,
    [switch]$Performance,
    [switch]$CodeQuality,
    [switch]$Fix,
    [string]$OutputPath = "quality-reports"
)

$ErrorActionPreference = "Continue"

# 颜色输出函数
function Write-Success { param([string]$Message) Write-Host $Message -ForegroundColor Green }
function Write-Warning { param([string]$Message) Write-Host $Message -ForegroundColor Yellow }
function Write-Error { param([string]$Message) Write-Host $Message -ForegroundColor Red }
function Write-Info { param([string]$Message) Write-Host $Message -ForegroundColor Cyan }

# 创建报告目录
function Initialize-ReportDirectory {
    if (!(Test-Path $OutputPath)) {
        New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
        Write-Info "创建报告目录: $OutputPath"
    }
}

# 代码质量检查
function Test-CodeQuality {
    Write-Info "开始代码质量检查..."
    
    $issues = @()
    $reportFile = Join-Path $OutputPath "code-quality-report.json"
    
    # 检查console.log
    try {
        if (Test-Path "app") {
            $consoleFiles = Get-ChildItem -Path "app" -Recurse -Include "*.tsx", "*.ts", "*.jsx", "*.js" -ErrorAction SilentlyContinue
            $consoleCount = 0
            $affectedFiles = @()
            
            foreach ($file in $consoleFiles) {
                $content = (Get-Content $file.FullName -ErrorAction SilentlyContinue) -join "`n"
                if ($content -and $content -match "console\.(log|debug)") {
                    $matches = [regex]::Matches($content, "console\.(log|debug)")
                    $consoleCount += $matches.Count
                    $affectedFiles += $file.Name
                }
            }
            
            if ($consoleCount -gt 0) {
                $issues += @{
                    Type = "CodeQuality"
                    Severity = "Medium"
                    Category = "调试代码"
                    Count = $consoleCount
                    Description = "发现 $consoleCount 个console语句需要清理"
                    Files = $affectedFiles | Sort-Object -Unique
                }
                Write-Warning "发现 $consoleCount 个console语句"
            }
        }
    }
    catch {
        Write-Warning "检查console语句时出错: $($_.Exception.Message)"
    }
    
    # 检查localStorage使用
    try {
        if (Test-Path "app") {
            $storageFiles = Get-ChildItem -Path "app" -Recurse -Include "*.tsx", "*.ts" -ErrorAction SilentlyContinue
            $storageCount = 0
            $affectedFiles = @()
            
            foreach ($file in $storageFiles) {
                $content = (Get-Content $file.FullName -ErrorAction SilentlyContinue) -join "`n"
                if ($content -and $content -match "localStorage\.(setItem|getItem)") {
                    $matches = [regex]::Matches($content, "localStorage\.(setItem|getItem)")
                    $storageCount += $matches.Count
                    $affectedFiles += $file.Name
                }
            }
            
            if ($storageCount -gt 0) {
                $issues += @{
                    Type = "Security"
                    Severity = "Medium"
                    Category = "数据存储"
                    Count = $storageCount
                    Description = "发现 $storageCount 个localStorage直接使用，建议使用安全的存储方案"
                    Files = $affectedFiles | Sort-Object -Unique
                }
                Write-Warning "发现 $storageCount 个localStorage使用"
            }
        }
    }
    catch {
        Write-Warning "检查localStorage使用时出错: $($_.Exception.Message)"
    }
    
    # 生成报告
    $report = @{
        Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        TotalIssues = $issues.Count
        HighSeverity = ($issues | Where-Object { $_.Severity -eq "High" }).Count
        MediumSeverity = ($issues | Where-Object { $_.Severity -eq "Medium" }).Count
        LowSeverity = ($issues | Where-Object { $_.Severity -eq "Low" }).Count
        Issues = $issues
    }
    
    $report | ConvertTo-Json -Depth 10 | Out-File $reportFile -Encoding UTF8
    Write-Success "代码质量报告已生成: $reportFile"
    
    return $issues
}

# 安全检查
function Test-Security {
    Write-Info "开始安全检查..."
    
    $securityIssues = @()
    $reportFile = Join-Path $OutputPath "security-report.json"
    
    # 检查环境变量文件
    if (Test-Path ".env") {
        Write-Warning "发现.env文件，检查是否包含敏感信息..."
        $envContent = (Get-Content ".env" -ErrorAction SilentlyContinue) -join "`n"
        if ($envContent -and $envContent -match "(password|secret|key|token)\s*=\s*[^\s]+") {
            $securityIssues += @{
                Type = "Configuration"
                Severity = "High"
                Description = ".env文件包含敏感信息"
                File = ".env"
            }
        }
    }
    
    # 生成安全报告
    $securityReport = @{
        Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        TotalIssues = $securityIssues.Count
        Issues = $securityIssues
    }
    
    $securityReport | ConvertTo-Json -Depth 10 | Out-File $reportFile -Encoding UTF8
    Write-Success "安全检查报告已生成: $reportFile"
    
    return $securityIssues
}

# 性能检查
function Test-Performance {
    Write-Info "开始性能检查..."
    
    $performanceIssues = @()
    $reportFile = Join-Path $OutputPath "performance-report.json"
    
    # 检查大图片文件
    try {
        $imageFiles = Get-ChildItem -Recurse -File -Include "*.png", "*.jpg", "*.jpeg" -ErrorAction SilentlyContinue | Where-Object { $_.Length -gt 500KB }
        if ($imageFiles) {
            $performanceIssues += @{
                Type = "Images"
                Severity = "Low"
                Description = "发现 $($imageFiles.Count) 个大图片文件建议优化"
                Files = $imageFiles | ForEach-Object { @{Path=$_.Name; Size=$_.Length} }
            }
            Write-Warning "发现 $($imageFiles.Count) 个大图片文件"
        }
    }
    catch {
        Write-Warning "检查图片文件时出错: $($_.Exception.Message)"
    }
    
    # 生成性能报告
    $performanceReport = @{
        Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        TotalIssues = $performanceIssues.Count
        Issues = $performanceIssues
    }
    
    $performanceReport | ConvertTo-Json -Depth 10 | Out-File $reportFile -Encoding UTF8
    Write-Success "性能检查报告已生成: $reportFile"
    
    return $performanceIssues
}

# 自动修复功能
function Invoke-AutoFix {
    param([array]$Issues)
    
    Write-Info "开始自动修复..."
    
    $fixedCount = 0
    
    foreach ($issue in $Issues) {
        if ($issue.Category -eq "调试代码" -and $issue.Files) {
            foreach ($fileName in $issue.Files) {
                $files = Get-ChildItem -Path "app" -Recurse -Name $fileName -ErrorAction SilentlyContinue
                foreach ($file in $files) {
                    $fullPath = Join-Path "app" $file
                    if (Test-Path $fullPath) {
                        Write-Info "清理文件中的console语句: $fullPath"
                        try {
                            $content = (Get-Content $fullPath -ErrorAction SilentlyContinue) -join "`n"
                            if ($content) {
                                $newContent = $content -replace "console\.(log|warn|error|debug)\([^)]*\);?\s*", ""
                                $newContent = $newContent -replace "\n\s*\n\s*\n", "`n`n"
                                if ($newContent -ne $content) {
                                    Set-Content $fullPath $newContent -Encoding UTF8
                                    Write-Success "已清理文件: $fullPath"
                                    $fixedCount++
                                }
                            }
                        }
                        catch {
                            Write-Warning "清理文件失败: $fullPath - $($_.Exception.Message)"
                        }
                    }
                }
            }
        }
    }
    
    Write-Success "自动修复完成，共修复 $fixedCount 个问题"
    return $fixedCount
}

# 生成综合报告
function New-ComprehensiveReport {
    param(
        [array]$CodeQualityIssues,
        [array]$SecurityIssues,
        [array]$PerformanceIssues
    )
    
    $reportFile = Join-Path $OutputPath "comprehensive-quality-report.md"
    
    $cqHigh = ($CodeQualityIssues | Where-Object { $_.Severity -eq "High" }).Count
    $cqMedium = ($CodeQualityIssues | Where-Object { $_.Severity -eq "Medium" }).Count
    $cqLow = ($CodeQualityIssues | Where-Object { $_.Severity -eq "Low" }).Count
    
    $secHigh = ($SecurityIssues | Where-Object { $_.Severity -eq "High" }).Count
    $secMedium = ($SecurityIssues | Where-Object { $_.Severity -eq "Medium" }).Count
    $secLow = ($SecurityIssues | Where-Object { $_.Severity -eq "Low" }).Count
    
    $perfHigh = ($PerformanceIssues | Where-Object { $_.Severity -eq "High" }).Count
    $perfMedium = ($PerformanceIssues | Where-Object { $_.Severity -eq "Medium" }).Count
    $perfLow = ($PerformanceIssues | Where-Object { $_.Severity -eq "Low" }).Count
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    $report = @"
# ZK-Agent 项目质量检查综合报告

**生成时间**: $timestamp
**检查范围**: 代码质量 + 安全性 + 性能

## 📊 问题统计

| 类别 | 高危 | 中危 | 低危 | 总计 |
|------|------|------|------|------|
| 代码质量 | $cqHigh | $cqMedium | $cqLow | $($CodeQualityIssues.Count) |
| 安全性 | $secHigh | $secMedium | $secLow | $($SecurityIssues.Count) |
| 性能 | $perfHigh | $perfMedium | $perfLow | $($PerformanceIssues.Count) |

## 🔍 详细问题列表

### 代码质量问题
"@
    
    foreach ($issue in $CodeQualityIssues) {
        $report += "`n- **$($issue.Category)** [$($issue.Severity)]: $($issue.Description)"
    }
    
    $report += "`n`n### 安全问题"
    foreach ($issue in $SecurityIssues) {
        $report += "`n- **$($issue.Type)** [$($issue.Severity)]: $($issue.Description)"
    }
    
    $report += "`n`n### 性能问题"
    foreach ($issue in $PerformanceIssues) {
        $report += "`n- **$($issue.Type)** [$($issue.Severity)]: $($issue.Description)"
    }
    
    $report += @"

## 📋 改进建议

### 立即处理（高危）
1. 修复所有安全漏洞
2. 清理硬编码密钥
3. 修复SQL注入风险

### 短期改进（中危）
1. 清理调试代码
2. 优化localStorage使用
3. 压缩大文件
4. 优化数据库查询

### 长期优化（低危）
1. 图片压缩优化
2. 代码结构重构
3. 性能监控实施

## 🔧 修复命令

```powershell
# 自动修复部分问题
.\scripts\quality-check.ps1 -Fix

# 重新检查
.\scripts\quality-check.ps1 -Full
```

---
*报告由ZK-Agent质量检查脚本自动生成*
"@
    
    $report | Out-File $reportFile -Encoding UTF8
    Write-Success "综合报告已生成: $reportFile"
}

# 主函数
function Main {
    Write-Info "=== ZK-Agent 项目质量检查 ==="
    $startTime = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Write-Info "开始时间: $startTime"
    
    # 初始化报告目录
    Initialize-ReportDirectory
    
    $allIssues = @()
    $codeQualityIssues = @()
    $securityIssues = @()
    $performanceIssues = @()
    
    # 执行检查
    if ($Full -or $CodeQuality -or (!$Security -and !$Performance)) {
        $codeQualityIssues = Test-CodeQuality
        $allIssues += $codeQualityIssues
    }
    
    if ($Full -or $Security) {
        $securityIssues = Test-Security
        $allIssues += $securityIssues
    }
    
    if ($Full -or $Performance) {
        $performanceIssues = Test-Performance
        $allIssues += $performanceIssues
    }
    
    # 自动修复
    if ($Fix -and $allIssues.Count -gt 0) {
        Invoke-AutoFix -Issues $allIssues
    }
    
    # 生成综合报告
    if ($Full -or ($CodeQuality -and $Security -and $Performance)) {
        New-ComprehensiveReport -CodeQualityIssues $codeQualityIssues -SecurityIssues $securityIssues -PerformanceIssues $performanceIssues
    }
    
    # 输出总结
    Write-Info "`n=== 检查完成 ==="
    Write-Info "总问题数: $($allIssues.Count)"
    $highCount = ($allIssues | Where-Object { $_.Severity -eq 'High' }).Count
    $mediumCount = ($allIssues | Where-Object { $_.Severity -eq 'Medium' }).Count
    $lowCount = ($allIssues | Where-Object { $_.Severity -eq 'Low' }).Count
    Write-Info "高危问题: $highCount"
    Write-Info "中危问题: $mediumCount"
    Write-Info "低危问题: $lowCount"
    Write-Info "报告目录: $OutputPath"
    
    if ($allIssues.Count -eq 0) {
        Write-Success "🎉 未发现质量问题！"
    } else {
        Write-Warning "⚠️  发现 $($allIssues.Count) 个问题需要处理"
    }
}

# 执行主函数
Main