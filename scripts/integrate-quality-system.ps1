<#
.SYNOPSIS
    集成智能化质量保障体系到ZK-Agent项目

.DESCRIPTION
    此脚本将智能化质量保障体系集成到现有的项目规范化流程中，
    包括安装依赖、配置系统、设置自动化流程等。

.PARAMETER ProjectPath
    项目根路径，默认为当前目录

.PARAMETER EnableRealTimeMonitoring
    是否启用实时监控，默认为true

.PARAMETER EnableAutoReporting
    是否启用自动报告生成，默认为true

.PARAMETER ReportingInterval
    报告生成间隔（分钟），默认为60

.EXAMPLE
    .\integrate-quality-system.ps1
    使用默认配置集成质量保障体系

.EXAMPLE
    .\integrate-quality-system.ps1 -ProjectPath "C:\MyProject" -EnableRealTimeMonitoring $false
    在指定路径集成，禁用实时监控

.NOTES
    Author: ZK-Agent Team
    Version: 1.0.0
    Created: 2024-01-24
#>

param(
    [Parameter(Mandatory = $false)]
    [string]$ProjectPath = (Get-Location).Path,
    
    [Parameter(Mandatory = $false)]
    [bool]$EnableRealTimeMonitoring = $true,
    
    [Parameter(Mandatory = $false)]
    [bool]$EnableAutoReporting = $true,
    
    [Parameter(Mandatory = $false)]
    [int]$ReportingInterval = 60
)

# 设置错误处理
$ErrorActionPreference = "Stop"

# 脚本开始时间
$StartTime = Get-Date

# 日志函数
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogMessage = "[$Timestamp] [$Level] $Message"
    
    switch ($Level) {
        "ERROR" { Write-Host $LogMessage -ForegroundColor Red }
        "WARN" { Write-Host $LogMessage -ForegroundColor Yellow }
        "SUCCESS" { Write-Host $LogMessage -ForegroundColor Green }
        default { Write-Host $LogMessage -ForegroundColor White }
    }
}

# 检查Node.js和npm
function Test-NodeEnvironment {
    Write-Log "检查Node.js环境..."
    
    try {
        # 检查Node.js
        $nodeCheck = & node --version 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Node.js未安装或无法执行"
        }
        Write-Log "Node.js版本: $nodeCheck" "SUCCESS"
        
        # 检查npm（使用更简单的方法）
        try {
            $npmOutput = & npm --version 2>&1
            # 查找版本号模式
            $versionPattern = $npmOutput | Where-Object { $_ -match '^\d+\.\d+\.\d+' }
            if ($versionPattern) {
                Write-Log "npm版本: $versionPattern" "SUCCESS"
            } else {
                # 如果有输出但没有找到版本号，可能是警告信息，尝试获取最后一行
                $lastLine = ($npmOutput | Where-Object { $_.Trim() -ne "" } | Select-Object -Last 1)
                if ($lastLine -match '\d+\.\d+\.\d+') {
                    Write-Log "npm版本: $lastLine" "SUCCESS"
                } else {
                    Write-Log "npm可用但版本信息不明确: $lastLine" "WARN"
                }
            }
        } catch {
            throw "npm检查失败: $($_.Exception.Message)"
        }
        
        return $true
    }
    catch {
        Write-Log "Node.js环境检查失败: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

# 安装必要的依赖
function Install-Dependencies {
    Write-Log "安装质量保障体系依赖..."
    
    $packageJsonPath = Join-Path $ProjectPath "package.json"
    
    if (-not (Test-Path $packageJsonPath)) {
        Write-Log "初始化npm项目..."
        Set-Location $ProjectPath
        npm init -y | Out-Null
    }
    
    # 读取现有的package.json
    $packageJson = Get-Content $packageJsonPath | ConvertFrom-Json
    
    # 定义需要安装的依赖
    $dependencies = @{
        "chokidar" = "^3.5.3"
        "commander" = "^11.0.0"
        "chalk" = "^5.3.0"
        "ora" = "^7.0.1"
        "inquirer" = "^9.2.0"
    }
    
    $devDependencies = @{
        "@types/node" = "^20.0.0"
        "typescript" = "^5.0.0"
        "ts-node" = "^10.9.0"
    }
    
    # 更新package.json
    if (-not $packageJson.dependencies) {
        $packageJson | Add-Member -Type NoteProperty -Name "dependencies" -Value @{}
    }
    if (-not $packageJson.devDependencies) {
        $packageJson | Add-Member -Type NoteProperty -Name "devDependencies" -Value @{}
    }
    
    # 添加依赖
    foreach ($dep in $dependencies.GetEnumerator()) {
        $packageJson.dependencies | Add-Member -Type NoteProperty -Name $dep.Key -Value $dep.Value -Force
    }
    
    foreach ($dep in $devDependencies.GetEnumerator()) {
        $packageJson.devDependencies | Add-Member -Type NoteProperty -Name $dep.Key -Value $dep.Value -Force
    }
    
    # 添加脚本
    if (-not $packageJson.scripts) {
        $packageJson | Add-Member -Type NoteProperty -Name "scripts" -Value @{}
    }
    
    $packageJson.scripts | Add-Member -Type NoteProperty -Name "quality:evaluate" -Value "ts-node scripts/quality-cli.ts evaluate" -Force
    $packageJson.scripts | Add-Member -Type NoteProperty -Name "quality:monitor" -Value "ts-node scripts/quality-cli.ts monitor" -Force
    $packageJson.scripts | Add-Member -Type NoteProperty -Name "quality:report" -Value "ts-node scripts/quality-cli.ts report" -Force
    $packageJson.scripts | Add-Member -Type NoteProperty -Name "quality:scan" -Value "ts-node scripts/quality-cli.ts scan" -Force
    $packageJson.scripts | Add-Member -Type NoteProperty -Name "quality:init" -Value "ts-node scripts/quality-cli.ts init" -Force
    
    # 保存package.json
    $packageJson | ConvertTo-Json -Depth 10 | Set-Content $packageJsonPath
    
    # 安装依赖
    Write-Log "安装npm依赖..."
    Set-Location $ProjectPath
    npm install | Out-Null
    
    Write-Log "依赖安装完成" "SUCCESS"
}

# 创建TypeScript配置
function Setup-TypeScriptConfig {
    Write-Log "配置TypeScript..."
    
    $tsconfigPath = Join-Path $ProjectPath "tsconfig.json"
    
    if (-not (Test-Path $tsconfigPath)) {
        $tsconfigContent = @"
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": [
    "lib/**/*",
    "scripts/**/*",
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts"
  ]
}
"@
        
        Set-Content -Path $tsconfigPath -Value $tsconfigContent -Encoding UTF8
        Write-Log "TypeScript配置文件已创建" "SUCCESS"
    } else {
        Write-Log "TypeScript配置文件已存在" "INFO"
    }
}

# 初始化质量保障体系配置
function Initialize-QualityConfig {
    Write-Log "初始化质量保障体系配置..."
    
    $configDir = Join-Path $ProjectPath "config"
    if (-not (Test-Path $configDir)) {
        New-Item -ItemType Directory -Path $configDir -Force | Out-Null
    }
    
    $configPath = Join-Path $configDir "architecture-compliance.config.json"
    
    if (-not (Test-Path $configPath)) {
        # 检测项目类型
        $packageJsonPath = Join-Path $ProjectPath "package.json"
        $techStack = "mixed"
        
        if (Test-Path $packageJsonPath) {
            try {
                $packageJson = Get-Content $packageJsonPath | ConvertFrom-Json
                $allDeps = @{}
                
                if ($packageJson.dependencies) {
                    $packageJson.dependencies.PSObject.Properties | ForEach-Object {
                        $allDeps[$_.Name] = $_.Value
                    }
                }
                
                if ($packageJson.devDependencies) {
                    $packageJson.devDependencies.PSObject.Properties | ForEach-Object {
                        $allDeps[$_.Name] = $_.Value
                    }
                }
                
                if ($allDeps.ContainsKey("react")) { $techStack = "react" }
                elseif ($allDeps.ContainsKey("vue")) { $techStack = "vue" }
                elseif ($allDeps.ContainsKey("@angular/core")) { $techStack = "angular" }
                elseif ($allDeps.ContainsKey("express") -or $allDeps.ContainsKey("koa")) { $techStack = "node" }
            }
            catch {
                Write-Log "无法检测技术栈，使用默认配置" "WARN"
            }
        }
        
        $projectName = Split-Path $ProjectPath -Leaf
        
        $defaultConfig = @{
            version = "1.0.0"
            projectInfo = @{
                name = $projectName
                type = $techStack
                phase = "development"
            }
            architecturePatterns = @{
                cleanArchitecture = @{
                    enabled = $true
                    strictness = "medium"
                    layerValidation = @{
                        presentation = @{ allowedDependencies = @("application") }
                        application = @{ allowedDependencies = @("domain", "infrastructure") }
                        domain = @{ allowedDependencies = @() }
                        infrastructure = @{ allowedDependencies = @("domain") }
                    }
                }
                domainDrivenDesign = @{
                    enabled = $true
                    aggregateValidation = $true
                    valueObjectValidation = $true
                    repositoryPatternValidation = $true
                }
                microservices = @{
                    enabled = $false
                    serviceIndependenceCheck = $true
                    communicationPatternValidation = $true
                }
                cqrs = @{
                    enabled = $false
                    commandQuerySeparation = $true
                    eventSourcingValidation = $false
                }
            }
            qualityThresholds = @{
                overallScore = 85
                layeredArchitectureCompliance = 85
                domainModelPurity = 80
                serviceBoundaryClarity = 75
                dependencyInversionCompliance = 80
            }
            qualityMetrics = @{
                codeQuality = @{ target = 95; weight = 0.3 }
                testCoverage = @{ target = 90; weight = 0.25 }
                performance = @{ target = 85; weight = 0.2 }
                security = @{ target = 100; weight = 0.25 }
            }
            realTimeMonitoring = @{
                enabled = $EnableRealTimeMonitoring
                evaluationDelay = 2000
                watchPatterns = @("**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx")
                ignorePatterns = @("**/node_modules/**", "**/dist/**", "**/build/**")
            }
            adaptiveThresholds = @{
                enabled = $true
                projectPhase = "development"
                teamSize = "medium"
                techStack = $techStack
            }
        }
        
        $defaultConfig | ConvertTo-Json -Depth 10 | Set-Content $configPath -Encoding UTF8
        Write-Log "质量保障体系配置文件已创建: $configPath" "SUCCESS"
    } else {
        Write-Log "质量保障体系配置文件已存在" "INFO"
    }
}

# 创建报告目录
function Setup-ReportDirectories {
    Write-Log "创建报告目录..."
    
    $reportDirs = @(
        "reports",
        "reports/real-time",
        "reports/compliance",
        "reports/quality",
        "reports/debt"
    )
    
    foreach ($dir in $reportDirs) {
        $fullPath = Join-Path $ProjectPath $dir
        if (-not (Test-Path $fullPath)) {
            New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
            Write-Log "创建目录: $dir" "SUCCESS"
        }
    }
    
    # 创建.gitignore条目（如果不存在）
    $gitignorePath = Join-Path $ProjectPath ".gitignore"
    $gitignoreContent = ""
    
    if (Test-Path $gitignorePath) {
        $gitignoreContent = Get-Content $gitignorePath -Raw
    }
    
    $reportIgnorePattern = "reports/"
    if ($gitignoreContent -notmatch [regex]::Escape($reportIgnorePattern)) {
        Add-Content -Path $gitignorePath -Value "`n# Quality Assurance Reports`n$reportIgnorePattern" -Encoding UTF8
        Write-Log "已更新.gitignore文件" "SUCCESS"
    }
}

# 集成到现有的规范化脚本
function Integrate-WithExistingScripts {
    Write-Log "集成到现有规范化流程..."
    
    $masterScriptPath = Join-Path $ProjectPath "scripts\master-standardization.ps1"
    
    if (Test-Path $masterScriptPath) {
        try {
            $masterScript = Get-Content $masterScriptPath -Raw
            
            # 检查是否已经集成
            if ($masterScript -notmatch "quality-cli") {
                # 在脚本末尾添加质量保障体系调用
                $qualityIntegration = @"

# ============================================================================
# 智能化质量保障体系集成
# ============================================================================

Write-Host "开始执行架构符合度评估..." -ForegroundColor Cyan
try {
    if (Test-Path "scripts\quality-cli.ts") {
        # 执行架构符合度评估
        & npm run quality:evaluate
        
        # 生成质量报告
        & npm run quality:report --format html
        
        Write-Host "✅ 架构符合度评估完成" -ForegroundColor Green
    } else {
        Write-Host "⚠️ 质量保障体系未安装，跳过架构评估" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "❌ 架构符合度评估失败: `$(`$_.Exception.Message)" -ForegroundColor Red
    `$script:HasErrors = `$true
}
"@
                
                Add-Content -Path $masterScriptPath -Value $qualityIntegration -Encoding UTF8
                Write-Log "已集成到主规范化脚本" "SUCCESS"
            } else {
                Write-Log "主规范化脚本已包含质量保障体系" "INFO"
            }
        }
        catch {
            Write-Log "集成到主规范化脚本失败: $($_.Exception.Message)" "WARN"
        }
    } else {
        Write-Log "主规范化脚本不存在，跳过集成" "WARN"
    }
}

# 创建快速启动脚本
function Create-QuickStartScript {
    Write-Log "创建快速启动脚本..."
    
    $quickStartPath = Join-Path $ProjectPath "scripts\quality-quick-start.ps1"
    
    $quickStartContent = @"
<#
.SYNOPSIS
    快速启动智能化质量保障体系

.DESCRIPTION
    此脚本提供快速启动质量保障体系的便捷方式

.EXAMPLE
    .\quality-quick-start.ps1
    启动完整的质量保障体系

.NOTES
    Author: ZK-Agent Team
    Version: 1.0.0
#>

param(
    [Parameter(Mandatory = `$false)]
    [string]`$Action = "evaluate",
    
    [Parameter(Mandatory = `$false)]
    [string]`$Format = "console"
)

`$ErrorActionPreference = "Stop"

Write-Host "🚀 启动智能化质量保障体系..." -ForegroundColor Cyan

try {
    switch (`$Action.ToLower()) {
        "evaluate" {
            Write-Host "执行架构符合度评估..." -ForegroundColor Yellow
            & npm run quality:evaluate -- --format `$Format
        }
        "monitor" {
            Write-Host "启动实时监控..." -ForegroundColor Yellow
            & npm run quality:monitor
        }
        "report" {
            Write-Host "生成质量报告..." -ForegroundColor Yellow
            & npm run quality:report -- --format `$Format
        }
        "scan" {
            Write-Host "执行代码质量扫描..." -ForegroundColor Yellow
            & npm run quality:scan
        }
        "init" {
            Write-Host "初始化质量保障体系..." -ForegroundColor Yellow
            & npm run quality:init
        }
        default {
            Write-Host "未知操作: `$Action" -ForegroundColor Red
            Write-Host "可用操作: evaluate, monitor, report, scan, init" -ForegroundColor Yellow
            exit 1
        }
    }
    
    Write-Host "✅ 操作完成" -ForegroundColor Green
}
catch {
    Write-Host "❌ 操作失败: `$(`$_.Exception.Message)" -ForegroundColor Red
    exit 1
}
"@
    
    Set-Content -Path $quickStartPath -Value $quickStartContent -Encoding UTF8
    Write-Log "快速启动脚本已创建: $quickStartPath" "SUCCESS"
}

# 创建VS Code配置
function Setup-VSCodeIntegration {
    Write-Log "配置VS Code集成..."
    
    $vscodeDir = Join-Path $ProjectPath ".vscode"
    if (-not (Test-Path $vscodeDir)) {
        New-Item -ItemType Directory -Path $vscodeDir -Force | Out-Null
    }
    
    # 创建任务配置
    $tasksPath = Join-Path $vscodeDir "tasks.json"
    $tasksConfig = @{
        version = "2.0.0"
        tasks = @(
            @{
                label = "Quality: Evaluate Architecture"
                type = "npm"
                script = "quality:evaluate"
                group = "build"
                presentation = @{
                    echo = $true
                    reveal = "always"
                    focus = $false
                    panel = "shared"
                }
                problemMatcher = @()
            },
            @{
                label = "Quality: Start Monitoring"
                type = "npm"
                script = "quality:monitor"
                group = "build"
                presentation = @{
                    echo = $true
                    reveal = "always"
                    focus = $false
                    panel = "shared"
                }
                problemMatcher = @()
                isBackground = $true
            },
            @{
                label = "Quality: Generate Report"
                type = "npm"
                script = "quality:report"
                group = "build"
                presentation = @{
                    echo = $true
                    reveal = "always"
                    focus = $false
                    panel = "shared"
                }
                problemMatcher = @()
            }
        )
    }
    
    $tasksConfig | ConvertTo-Json -Depth 10 | Set-Content $tasksPath -Encoding UTF8
    Write-Log "VS Code任务配置已创建" "SUCCESS"
    
    # 创建启动配置
    $launchPath = Join-Path $vscodeDir "launch.json"
    if (-not (Test-Path $launchPath)) {
        $launchConfig = @{
            version = "0.2.0"
            configurations = @(
                @{
                    name = "Debug Quality CLI"
                    type = "node"
                    request = "launch"
                    program = "`${workspaceFolder}/scripts/quality-cli.ts"
                    args = @("evaluate", "--verbose")
                    runtimeArgs = @("-r", "ts-node/register")
                    env = @{
                        NODE_ENV = "development"
                    }
                    console = "integratedTerminal"
                    internalConsoleOptions = "neverOpen"
                }
            )
        }
        
        $launchConfig | ConvertTo-Json -Depth 10 | Set-Content $launchPath -Encoding UTF8
        Write-Log "VS Code启动配置已创建" "SUCCESS"
    }
}

# 运行初始评估
function Run-InitialEvaluation {
    Write-Log "运行初始架构符合度评估..."
    
    try {
        Set-Location $ProjectPath
        
        # 编译TypeScript文件
        Write-Log "编译TypeScript文件..."
        & npx tsc --noEmit
        
        # 运行初始评估
        Write-Log "执行初始评估..."
        & npm run quality:evaluate
        
        Write-Log "初始评估完成" "SUCCESS"
    }
    catch {
        Write-Log "初始评估失败: $($_.Exception.Message)" "WARN"
        Write-Log "可以稍后手动运行: npm run quality:evaluate" "INFO"
    }
}

# 生成集成报告
function Generate-IntegrationReport {
    $endTime = Get-Date
    $duration = $endTime - $StartTime
    
    $reportPath = Join-Path $ProjectPath "QUALITY_SYSTEM_INTEGRATION.md"
    
    $reportContent = @"
# 智能化质量保障体系集成报告

**集成时间:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**项目路径:** $ProjectPath
**集成耗时:** $($duration.TotalMinutes.ToString("F2")) 分钟

## 集成内容

### ✅ 已完成的集成项目

1. **依赖安装**
   - 安装了必要的npm依赖包
   - 配置了TypeScript环境
   - 添加了质量保障相关的npm脚本

2. **配置文件**
   - 创建了架构符合度配置文件
   - 配置了TypeScript编译选项
   - 设置了VS Code集成

3. **目录结构**
   - 创建了报告输出目录
   - 设置了.gitignore规则
   - 建立了完整的文件组织结构

4. **脚本集成**
   - 集成到现有规范化流程
   - 创建了快速启动脚本
   - 配置了VS Code任务

### 🎯 质量保障体系功能

- **架构符合度评估**: 实时检测架构模式符合度
- **实时监控**: 文件变更时自动触发评估
- **可视化报告**: 生成HTML、JSON、Markdown格式报告
- **自适应阈值**: 根据项目阶段和团队规模调整标准
- **技术债务分析**: 量化技术债务并提供重构建议

### 📊 配置参数

- **实时监控**: $(if ($EnableRealTimeMonitoring) { "启用" } else { "禁用" })
- **自动报告**: $(if ($EnableAutoReporting) { "启用" } else { "禁用" })
- **报告间隔**: $ReportingInterval 分钟
- **技术栈**: 自动检测
- **项目阶段**: development

## 使用方法

### 命令行使用

```bash
# 执行架构符合度评估
npm run quality:evaluate

# 启动实时监控
npm run quality:monitor

# 生成HTML报告
npm run quality:report

# 执行代码质量扫描
npm run quality:scan

# 初始化配置
npm run quality:init
```

### PowerShell快速启动

```powershell
# 快速评估
.\scripts\quality-quick-start.ps1 -Action evaluate

# 启动监控
.\scripts\quality-quick-start.ps1 -Action monitor

# 生成报告
.\scripts\quality-quick-start.ps1 -Action report -Format html
```

### VS Code集成

1. 打开命令面板 (Ctrl+Shift+P)
2. 选择 "Tasks: Run Task"
3. 选择相应的质量保障任务

## 配置文件位置

- **主配置**: `config/architecture-compliance.config.json`
- **TypeScript配置**: `tsconfig.json`
- **VS Code任务**: `.vscode/tasks.json`
- **VS Code启动**: `.vscode/launch.json`

## 报告输出

- **实时报告**: `reports/real-time/`
- **符合度报告**: `reports/compliance/`
- **质量报告**: `reports/quality/`
- **技术债务报告**: `reports/debt/`

## 下一步建议

1. 运行初始评估了解当前架构状态
2. 根据评估结果调整配置参数
3. 启用实时监控进行持续质量保障
4. 定期查看生成的报告并采取改进措施
5. 根据项目发展调整自适应阈值配置

---

*此报告由智能化质量保障体系集成脚本自动生成*
"@
    
    Set-Content -Path $reportPath -Value $reportContent -Encoding UTF8
    Write-Log "集成报告已生成: $reportPath" "SUCCESS"
}

# 主执行流程
try {
    Write-Log "开始集成智能化质量保障体系..." "INFO"
    Write-Log "项目路径: $ProjectPath" "INFO"
    
    # 验证项目路径
    if (-not (Test-Path $ProjectPath)) {
        throw "项目路径不存在: $ProjectPath"
    }
    
    # 检查Node.js环境
    if (-not (Test-NodeEnvironment)) {
        throw "Node.js环境检查失败"
    }
    
    # 执行集成步骤
    Install-Dependencies
    Setup-TypeScriptConfig
    Initialize-QualityConfig
    Setup-ReportDirectories
    Integrate-WithExistingScripts
    Create-QuickStartScript
    Setup-VSCodeIntegration
    
    # 运行初始评估
    Run-InitialEvaluation
    
    # 生成集成报告
    Generate-IntegrationReport
    
    $endTime = Get-Date
    $duration = $endTime - $StartTime
    
    Write-Log "" "INFO"
    Write-Log "🎉 智能化质量保障体系集成完成！" "SUCCESS"
    Write-Log "总耗时: $($duration.TotalMinutes.ToString("F2")) 分钟" "SUCCESS"
    Write-Log "" "INFO"
    Write-Log "可以使用以下命令开始使用:" "INFO"
    Write-Log "  npm run quality:evaluate  # 执行架构符合度评估" "INFO"
    Write-Log "  npm run quality:monitor   # 启动实时监控" "INFO"
    Write-Log "  npm run quality:report    # 生成质量报告" "INFO"
    Write-Log "" "INFO"
    Write-Log "详细信息请查看: QUALITY_SYSTEM_INTEGRATION.md" "INFO"
    
}
catch {
    Write-Log "集成失败: $($_.Exception.Message)" "ERROR"
    exit 1
}

# 脚本结束
Write-Log "脚本执行完成" "INFO"