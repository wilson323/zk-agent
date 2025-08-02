#!/usr/bin/env pwsh
# 项目目录结构规范化脚本
# 将与项目代码无关的文件统一整理到archive目录

param(
    [string]$ProjectRoot = "E:\zk-agent",
    [switch]$DryRun = $false
)

# 设置错误处理
$ErrorActionPreference = "Continue"

# 日志函数
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "ERROR" { "Red" }
        "WARNING" { "Yellow" }
        "SUCCESS" { "Green" }
        default { "White" }
    }
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

# 主执行函数
function Main {
    Write-Log "开始项目目录结构规范化..." "INFO"
    Write-Log "项目路径: $ProjectRoot" "INFO"
    
    if ($DryRun) {
        Write-Log "运行模式: 预览模式 (不会实际移动文件)" "WARNING"
    }
    
    # 检查项目路径
    if (-not (Test-Path $ProjectRoot)) {
        Write-Log "项目路径不存在: $ProjectRoot" "ERROR"
        return
    }
    
    # 创建archive目录
    $archivePath = Join-Path $ProjectRoot "archive"
    
    # 创建archive子目录
    $archiveSubDirs = @(
        "backups",
        "documentation-backups", 
        "typescript-config-backups",
        "standardization-reports",
        "temporary-files",
        "old-configs"
    )
    
    foreach ($subDir in $archiveSubDirs) {
        $fullPath = Join-Path $archivePath $subDir
        if (-not (Test-Path $fullPath)) {
            if (-not $DryRun) {
                try {
                    New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
                    Write-Log "创建目录: $fullPath" "SUCCESS"
                } catch {
                    Write-Log "创建目录失败: $fullPath - $($_.Exception.Message)" "ERROR"
                }
            } else {
                Write-Log "[DRY RUN] 将创建目录: $fullPath" "INFO"
            }
        }
    }
    
    # 处理备份文件
    try {
        $movedCount = 0
        
        # 定义备份目录模式和对应的目标目录
        $backupPatterns = @{
            "backup-*" = "backups"
            "documentation-backup-*" = "documentation-backups"
            "typescript-config-backup-*" = "typescript-config-backups"
            "standardization-reports-*" = "standardization-reports"
        }
        
        # 遍历每个备份模式
        foreach ($pattern in $backupPatterns.Keys) {
            $targetSubDir = $backupPatterns[$pattern]
            
            # 查找匹配的目录
            $matchingDirs = Get-ChildItem -Path $ProjectRoot -Directory -Filter $pattern -ErrorAction SilentlyContinue
            
            foreach ($dir in $matchingDirs) {
                $sourcePath = $dir.FullName
                $targetPath = Join-Path $archivePath $targetSubDir
                $finalPath = Join-Path $targetPath $dir.Name
                
                if (-not $DryRun) {
                    try {
                        Move-Item -Path $sourcePath -Destination $finalPath -Force
                        Write-Log "移动: $($dir.Name) -> archive/$targetSubDir/" "SUCCESS"
                        $movedCount++
                    } catch {
                        Write-Log "移动失败: $($dir.Name) - $($_.Exception.Message)" "ERROR"
                    }
                } else {
                    Write-Log "[DRY RUN] 将移动: $($dir.Name) -> archive/$targetSubDir/" "INFO"
                    $movedCount++
                }
            }
        }
        
        # 清理临时文件
        $tempPatterns = @("*.tmp", "*.temp", "*.log", "*.bak", "*~")
        $cleanedCount = 0
        
        foreach ($pattern in $tempPatterns) {
            try {
                $tempFiles = Get-ChildItem -Path $ProjectRoot -Filter $pattern -File -Recurse -ErrorAction SilentlyContinue
                
                foreach ($file in $tempFiles) {
                    if (-not $DryRun) {
                        try {
                            Remove-Item -Path $file.FullName -Force
                            Write-Log "删除临时文件: $($file.Name)" "SUCCESS"
                            $cleanedCount++
                        } catch {
                            Write-Log "删除失败: $($file.Name) - $($_.Exception.Message)" "WARNING"
                        }
                    } else {
                        Write-Log "[DRY RUN] 将删除: $($file.Name)" "INFO"
                        $cleanedCount++
                    }
                }
            } catch {
                Write-Log "处理模式 $pattern 时发生错误: $($_.Exception.Message)" "WARNING"
            }
        }
        
        # 创建结构说明文档
        $docContent = @"
# 项目目录结构说明

## 核心项目目录
- app/ - Next.js应用主目录
- backend/ - Python后端服务
- components/ - React组件库
- config/ - 配置文件
- docs/ - 项目文档
- hooks/ - React Hooks
- lib/ - 工具库
- services/ - 服务层
- types/ - TypeScript类型定义
- utils/ - 工具函数

## Archive目录结构
- archive/backups/ - 代码备份文件
- archive/documentation-backups/ - 文档备份
- archive/typescript-config-backups/ - TypeScript配置备份
- archive/standardization-reports/ - 规范化报告
- archive/temporary-files/ - 临时文件
- archive/old-configs/ - 旧配置文件

## 维护说明
- 定期清理archive目录中的过期文件
- 保留最近30天的备份文件
- 重要的历史版本可以手动保留

生成时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
"@
        
        $docPath = Join-Path $archivePath "README.md"
        if (-not $DryRun) {
            try {
                $docContent | Out-File -FilePath $docPath -Encoding UTF8
                Write-Log "创建结构说明文档: $docPath" "SUCCESS"
            } catch {
                Write-Log "创建文档失败: $($_.Exception.Message)" "ERROR"
            }
        } else {
            Write-Log "[DRY RUN] 将创建结构说明文档" "INFO"
        }
        
        Write-Log "项目目录结构规范化完成!" "SUCCESS"
        Write-Log "移动了 $movedCount 个备份目录" "INFO"
        Write-Log "清理了 $cleanedCount 个临时文件" "INFO"
        
    } catch {
        Write-Log "规范化过程中发生错误: $($_.Exception.Message)" "ERROR"
    }
}

# 执行主函数
Main