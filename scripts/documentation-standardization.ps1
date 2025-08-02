#!/usr/bin/env pwsh
# 文档规范化脚本
# 整理项目文档结构，确保文档规范且无冗余

Write-Host "📚 开始文档规范化..." -ForegroundColor Green

# 设置错误处理
$ErrorActionPreference = "Stop"

# 项目根目录
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "📁 项目根目录: $ProjectRoot" -ForegroundColor Blue

# 1. 分析现有文档结构
Write-Host "\n🔍 第一步: 分析现有文档结构..." -ForegroundColor Yellow

# 查找所有 Markdown 文件
$AllMarkdownFiles = Get-ChildItem -Path "." -Filter "*.md" -Recurse | Where-Object { 
    $_.FullName -notlike "*node_modules*" -and 
    $_.FullName -notlike "*.next*" -and
    $_.FullName -notlike "*dist*" -and
    $_.FullName -notlike "*build*"
}

Write-Host "  发现 $($AllMarkdownFiles.Count) 个 Markdown 文件:" -ForegroundColor Cyan

$DocumentCategories = @{
    "根目录文档" = @()
    "API文档" = @()
    "架构文档" = @()
    "数据库文档" = @()
    "前端文档" = @()
    "优化文档" = @()
    "其他文档" = @()
    "重复文档" = @()
}

foreach ($File in $AllMarkdownFiles) {
    $RelativePath = $File.FullName.Replace("$ProjectRoot\\", "")
    $Directory = Split-Path -Parent $RelativePath
    
    # 分类文档
    if ($Directory -eq "." -or $Directory -eq "") {
        $DocumentCategories["根目录文档"] += $RelativePath
    } elseif ($RelativePath -like "docs/api/*") {
        $DocumentCategories["API文档"] += $RelativePath
    } elseif ($RelativePath -like "docs/architecture/*") {
        $DocumentCategories["架构文档"] += $RelativePath
    } elseif ($RelativePath -like "docs/database/*") {
        $DocumentCategories["数据库文档"] += $RelativePath
    } elseif ($RelativePath -like "docs/frontend/*") {
        $DocumentCategories["前端文档"] += $RelativePath
    } elseif ($RelativePath -like "docs/optimization/*") {
        $DocumentCategories["优化文档"] += $RelativePath
    } else {
        $DocumentCategories["其他文档"] += $RelativePath
    }
    
    Write-Host "    - $RelativePath" -ForegroundColor Gray
}

# 显示分类结果
foreach ($Category in $DocumentCategories.Keys) {
    $Count = $DocumentCategories[$Category].Count
    if ($Count -gt 0) {
        Write-Host "\n  $Category ($Count 个):" -ForegroundColor Cyan
        $DocumentCategories[$Category] | ForEach-Object {
            Write-Host "    - $_" -ForegroundColor Gray
        }
    }
}

# 2. 检测重复和冗余文档
Write-Host "\n🔄 第二步: 检测重复和冗余文档..." -ForegroundColor Yellow

$DuplicateFiles = @()
$FileContents = @{}

# 读取所有文档内容进行比较
foreach ($File in $AllMarkdownFiles) {
    $RelativePath = $File.FullName.Replace("$ProjectRoot\\", "")
    $Content = Get-Content $File.FullName -Raw -ErrorAction SilentlyContinue
    
    if ($Content) {
        # 简化内容用于比较（移除空白和格式）
        $NormalizedContent = $Content -replace "\s+", " " -replace "[\r\n]+", "" 
        $ContentHash = [System.Security.Cryptography.SHA256]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($NormalizedContent))
        $HashString = [System.BitConverter]::ToString($ContentHash) -replace "-", ""
        
        if ($FileContents.ContainsKey($HashString)) {
            $DuplicateFiles += [PSCustomObject]@{
                File1 = $FileContents[$HashString]
                File2 = $RelativePath
                Reason = "内容完全相同"
            }
        } else {
            $FileContents[$HashString] = $RelativePath
        }
    }
}

# 检查文件名相似性
$SimilarFiles = @()
for ($i = 0; $i -lt $AllMarkdownFiles.Count; $i++) {
    for ($j = $i + 1; $j -lt $AllMarkdownFiles.Count; $j++) {
        $File1 = $AllMarkdownFiles[$i]
        $File2 = $AllMarkdownFiles[$j]
        
        $Name1 = $File1.BaseName.ToLower()
        $Name2 = $File2.BaseName.ToLower()
        
        # 检查名称相似性
        if ($Name1 -eq $Name2 -and $File1.FullName -ne $File2.FullName) {
            $SimilarFiles += [PSCustomObject]@{
                File1 = $File1.FullName.Replace("$ProjectRoot\\", "")
                File2 = $File2.FullName.Replace("$ProjectRoot\\", "")
                Reason = "文件名相同"
            }
        } elseif ([Math]::Abs($Name1.Length - $Name2.Length) -le 2 -and $Name1.Length -gt 5) {
            # 简单的字符串相似性检查
            $CommonChars = 0
            $MinLength = [Math]::Min($Name1.Length, $Name2.Length)
            for ($k = 0; $k -lt $MinLength; $k++) {
                if ($Name1[$k] -eq $Name2[$k]) {
                    $CommonChars++
                }
            }
            
            $Similarity = $CommonChars / [Math]::Max($Name1.Length, $Name2.Length)
            if ($Similarity -gt 0.8) {
                $SimilarFiles += [PSCustomObject]@{
                    File1 = $File1.FullName.Replace("$ProjectRoot\\", "")
                    File2 = $File2.FullName.Replace("$ProjectRoot\\", "")
                    Reason = "文件名相似 ($([Math]::Round($Similarity * 100))%)"
                }
            }
        }
    }
}

if ($DuplicateFiles.Count -gt 0) {
    Write-Host "  ⚠️  发现 $($DuplicateFiles.Count) 组重复文档:" -ForegroundColor Yellow
    $DuplicateFiles | ForEach-Object {
        Write-Host "    $($_.Reason):" -ForegroundColor Gray
        Write-Host "      - $($_.File1)" -ForegroundColor Gray
        Write-Host "      - $($_.File2)" -ForegroundColor Gray
    }
    $DocumentCategories["重复文档"] = $DuplicateFiles
} else {
    Write-Host "  ✅ 未发现内容重复的文档" -ForegroundColor Green
}

if ($SimilarFiles.Count -gt 0) {
    Write-Host "  ⚠️  发现 $($SimilarFiles.Count) 组相似文档:" -ForegroundColor Yellow
    $SimilarFiles | ForEach-Object {
        Write-Host "    $($_.Reason):" -ForegroundColor Gray
        Write-Host "      - $($_.File1)" -ForegroundColor Gray
        Write-Host "      - $($_.File2)" -ForegroundColor Gray
    }
}

# 3. 备份现有文档
Write-Host "\n📦 第三步: 备份现有文档..." -ForegroundColor Yellow

$BackupDir = "documentation-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null

# 备份根目录的文档
foreach ($DocFile in $DocumentCategories["根目录文档"]) {
    if (Test-Path $DocFile) {
        Copy-Item -Path $DocFile -Destination $BackupDir -Force
        Write-Host "  备份: $DocFile" -ForegroundColor Cyan
    }
}

# 备份整个 docs 目录
if (Test-Path "docs") {
    Copy-Item -Path "docs" -Destination "$BackupDir/docs" -Recurse -Force
    Write-Host "  备份: docs/ 目录" -ForegroundColor Cyan
}

Write-Host "  ✅ 文档备份完成: $BackupDir" -ForegroundColor Green

# 4. 创建标准化的文档结构
Write-Host "\n📋 第四步: 创建标准化文档结构..." -ForegroundColor Yellow

# 确保 docs 目录结构存在
$StandardDirs = @(
    "docs",
    "docs/api",
    "docs/architecture", 
    "docs/database",
    "docs/frontend",
    "docs/backend",
    "docs/deployment",
    "docs/development",
    "docs/testing",
    "docs/optimization"
)

foreach ($Dir in $StandardDirs) {
    if (-not (Test-Path $Dir)) {
        New-Item -ItemType Directory -Path $Dir -Force | Out-Null
        Write-Host "  创建目录: $Dir" -ForegroundColor Cyan
    }
}

# 5. 创建文档索引
Write-Host "\n📑 第五步: 创建文档索引..." -ForegroundColor Yellow

$DocumentationIndex = @"
# ZK-Agent 项目文档索引

本文档提供了 ZK-Agent 项目所有文档的索引和导航。

## 📁 文档结构

### 🏗️ 架构文档
- [项目架构标准](docs/PROJECT_ARCHITECTURE_STANDARDS.md) - 项目架构规范和标准
- [技术栈分析](docs/architecture/tech-stack-analysis.md) - 技术栈选择和分析
- [前后端分离分析](docs/architecture/frontend-backend-separation-analysis.md) - 前后端架构分析

### 🎨 前端文档
- [组件设计规范](docs/frontend/component-design-specification.md) - 前端组件设计规范
- [成熟组件集成计划](docs/frontend/mature-component-integration-plan.md) - 组件集成计划

### 🔧 API 文档
- [API 设计规范](docs/api/api-design-specification.md) - API 设计规范和标准

### 🗄️ 数据库文档
- [数据库设计规范](docs/database/database-design-specification.md) - 数据库设计规范

### ⚡ 优化文档
- [多智能体系统优化计划](docs/optimization/multi-agent-system-optimization-plan.md) - 系统优化计划

### 🚀 部署文档
- [部署指南](docs/deployment/) - 部署相关文档

### 🛠️ 开发文档
- [开发指南](docs/development/) - 开发环境和流程

### 🧪 测试文档
- [测试指南](docs/testing/) - 测试策略和规范

## 📋 根目录文档

- [README.md](README.md) - 项目主要说明文档
- [CLAUDE.md](CLAUDE.md) - Claude AI 相关说明

## 🔍 快速导航

### 新手入门
1. 阅读 [README.md](README.md) 了解项目概况
2. 查看 [项目架构标准](docs/PROJECT_ARCHITECTURE_STANDARDS.md) 了解架构规范
3. 参考 [开发指南](docs/development/) 设置开发环境

### 开发者
1. [API 设计规范](docs/api/api-design-specification.md) - API 开发规范
2. [组件设计规范](docs/frontend/component-design-specification.md) - 前端开发规范
3. [数据库设计规范](docs/database/database-design-specification.md) - 数据库开发规范

### 架构师
1. [技术栈分析](docs/architecture/tech-stack-analysis.md) - 技术选型参考
2. [前后端分离分析](docs/architecture/frontend-backend-separation-analysis.md) - 架构设计参考
3. [多智能体系统优化计划](docs/optimization/multi-agent-system-optimization-plan.md) - 系统优化参考

## 📝 文档维护

### 文档更新原则
1. 所有文档应保持最新状态
2. 重要变更需要更新相关文档
3. 新功能需要添加相应文档
4. 定期检查和清理过时文档

### 文档规范
1. 使用 Markdown 格式
2. 遵循统一的文档模板
3. 包含适当的目录和导航
4. 使用清晰的标题和结构

---

*最后更新: $(Get-Date -Format 'yyyy-MM-dd')*
*维护者: ZK-Agent 开发团队*
"@

$DocumentationIndex | Out-File -FilePath "DOCUMENTATION_INDEX.md" -Encoding UTF8
Write-Host "  ✅ 创建文档索引: DOCUMENTATION_INDEX.md" -ForegroundColor Green

# 6. 整理根目录文档
Write-Host "\n🧹 第六步: 整理根目录文档..." -ForegroundColor Yellow

$RootDocsToMove = @()

# 检查根目录中应该移动的文档
foreach ($DocFile in $DocumentCategories["根目录文档"]) {
    $FileName = Split-Path -Leaf $DocFile
    
    # 保留在根目录的文档
    $KeepInRoot = @("README.md", "CLAUDE.md", "DOCUMENTATION_INDEX.md", "CHANGELOG.md", "LICENSE.md", "CONTRIBUTING.md")
    
    if ($KeepInRoot -notcontains $FileName) {
        # 确定应该移动到哪个目录
        $TargetDir = "docs/development"
        
        if ($FileName -like "*deploy*" -or $FileName -like "*deployment*") {
            $TargetDir = "docs/deployment"
        } elseif ($FileName -like "*test*" -or $FileName -like "*testing*") {
            $TargetDir = "docs/testing"
        } elseif ($FileName -like "*api*") {
            $TargetDir = "docs/api"
        } elseif ($FileName -like "*architecture*" -or $FileName -like "*design*") {
            $TargetDir = "docs/architecture"
        }
        
        $RootDocsToMove += [PSCustomObject]@{
            Source = $DocFile
            Target = "$TargetDir/$FileName"
            Reason = "根目录文档整理"
        }
    }
}

if ($RootDocsToMove.Count -gt 0) {
    Write-Host "  建议移动 $($RootDocsToMove.Count) 个根目录文档:" -ForegroundColor Yellow
    $RootDocsToMove | ForEach-Object {
        Write-Host "    $($_.Source) -> $($_.Target)" -ForegroundColor Gray
    }
} else {
    Write-Host "  ✅ 根目录文档结构合理" -ForegroundColor Green
}

# 7. 创建文档模板
Write-Host "\n📄 第七步: 创建文档模板..." -ForegroundColor Yellow

$DocumentTemplate = @"
# 文档标题

> 简要描述文档内容和目的

## 📋 目录

- [概述](#概述)
- [详细说明](#详细说明)
- [示例](#示例)
- [相关文档](#相关文档)

## 🎯 概述

<!-- 文档的主要内容概述 -->

## 📖 详细说明

<!-- 详细的说明内容 -->

### 子章节

<!-- 具体的子章节内容 -->

## 💡 示例

<!-- 相关的代码示例或使用示例 -->

```typescript
// 示例代码
```

## 📚 相关文档

- [相关文档1](link1.md)
- [相关文档2](link2.md)

---

*最后更新: $(Get-Date -Format 'yyyy-MM-dd')*
*维护者: [维护者姓名]*
"@

$DocumentTemplate | Out-File -FilePath "docs/DOCUMENT_TEMPLATE.md" -Encoding UTF8
Write-Host "  ✅ 创建文档模板: docs/DOCUMENT_TEMPLATE.md" -ForegroundColor Green

# 8. 生成文档规范化报告
Write-Host "\n📊 第八步: 生成文档规范化报告..." -ForegroundColor Yellow

$DocumentationReport = @{
    Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    BackupDirectory = $BackupDir
    DocumentCategories = $DocumentCategories
    DuplicateFiles = $DuplicateFiles
    SimilarFiles = $SimilarFiles
    RootDocsToMove = $RootDocsToMove
    CreatedFiles = @(
        "DOCUMENTATION_INDEX.md",
        "docs/DOCUMENT_TEMPLATE.md"
    )
    Summary = @{
        TotalDocuments = $AllMarkdownFiles.Count
        DuplicateDocuments = $DuplicateFiles.Count
        SimilarDocuments = $SimilarFiles.Count
        RootDocsToMove = $RootDocsToMove.Count
    }
    Recommendations = @(
        "删除或合并重复文档",
        "移动根目录中的非核心文档到 docs/ 目录",
        "使用统一的文档模板",
        "定期更新文档索引",
        "建立文档维护流程",
        "添加文档版本控制"
    )
}

$ReportPath = "documentation-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
$DocumentationReport | ConvertTo-Json -Depth 10 | Out-File -FilePath $ReportPath -Encoding UTF8

Write-Host "  ✅ 文档规范化报告已保存: $ReportPath" -ForegroundColor Green

# 9. 显示摘要
Write-Host "\n📋 文档规范化摘要:" -ForegroundColor Green
Write-Host "  总文档数: $($AllMarkdownFiles.Count)" -ForegroundColor Cyan
Write-Host "  重复文档: $($DuplicateFiles.Count)" -ForegroundColor $(if ($DuplicateFiles.Count -gt 0) { "Yellow" } else { "Green" })
Write-Host "  相似文档: $($SimilarFiles.Count)" -ForegroundColor $(if ($SimilarFiles.Count -gt 0) { "Yellow" } else { "Green" })
Write-Host "  需移动文档: $($RootDocsToMove.Count)" -ForegroundColor $(if ($RootDocsToMove.Count -gt 0) { "Yellow" } else { "Green" })
Write-Host "  备份目录: $BackupDir" -ForegroundColor Cyan
Write-Host "  规范化报告: $ReportPath" -ForegroundColor Cyan

# 10. 下一步建议
Write-Host "\n🎯 下一步建议:" -ForegroundColor Green
Write-Host "  1. 查看文档索引: DOCUMENTATION_INDEX.md" -ForegroundColor Cyan
Write-Host "  2. 查看规范化报告: $ReportPath" -ForegroundColor Cyan
Write-Host "  3. 处理重复和相似文档" -ForegroundColor Cyan
Write-Host "  4. 移动根目录文档到合适位置" -ForegroundColor Cyan
Write-Host "  5. 使用文档模板创建新文档" -ForegroundColor Cyan
Write-Host "  6. 建立文档维护流程" -ForegroundColor Cyan

Write-Host "\n✅ 文档规范化完成!" -ForegroundColor Green