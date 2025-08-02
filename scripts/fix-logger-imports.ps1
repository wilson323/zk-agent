# PowerShell脚本：批量修复logger导入问题
# 将所有错误的logger导入方式统一修复为正确的getLogger()方式

Write-Host "开始修复logger导入问题..." -ForegroundColor Green

# 定义需要修复的文件模式
$patterns = @(
    "import logger from '@/lib/utils/logger';",
    "import logger from './logger';",
    "import { logger } from '@/lib/utils/logger';",
    "import { defaultLogger as logger } from '@/lib/utils/logger';"
)

# 正确的导入方式
$correctImport = "import { getLogger } from '@/lib/utils/logger';`n`nconst logger = getLogger();"

# 获取所有需要修复的文件
$files = Get-ChildItem -Path "e:\zk-agent" -Recurse -Include "*.ts", "*.tsx", "*.js" | Where-Object {
    $_.FullName -notlike "*node_modules*" -and
    $_.FullName -notlike "*\.next*" -and
    $_.FullName -notlike "*dist*" -and
    $_.FullName -notlike "*build*"
}

$fixedCount = 0
$totalFiles = $files.Count

foreach ($file in $files) {
    try {
        $content = Get-Content -Path $file.FullName -Raw -ErrorAction Stop
        $originalContent = $content
        $hasChanges = $false
        
        # 检查每个需要修复的模式
        foreach ($pattern in $patterns) {
            if ($content -match [regex]::Escape($pattern)) {
                $content = $content -replace [regex]::Escape($pattern), $correctImport
                $hasChanges = $true
                Write-Host "修复文件: $($file.FullName)" -ForegroundColor Yellow
            }
        }
        
        # 如果有变更，保存文件
        if ($hasChanges) {
            Set-Content -Path $file.FullName -Value $content -NoNewline
            $fixedCount++
        }
    }
    catch {
        Write-Host "处理文件失败: $($file.FullName) - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "修复完成！" -ForegroundColor Green
Write-Host "总文件数: $totalFiles" -ForegroundColor Cyan
Write-Host "修复文件数: $fixedCount" -ForegroundColor Cyan

# 特殊处理一些文件中的Logger类导入
Write-Host "处理Logger类导入..." -ForegroundColor Yellow

$loggerClassFiles = Get-ChildItem -Path "e:\zk-agent" -Recurse -Include "*.ts", "*.tsx" | Where-Object {
    $_.FullName -notlike "*node_modules*" -and
    $_.FullName -notlike "*\.next*" -and
    $_.FullName -notlike "*dist*" -and
    $_.FullName -notlike "*build*"
} | ForEach-Object {
    $content = Get-Content -Path $_.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -match "import.*\{.*Logger.*\}.*from.*logger") {
        $_
    }
}

foreach ($file in $loggerClassFiles) {
    try {
        $content = Get-Content -Path $file.FullName -Raw
        
        # 替换Logger类导入为getLogger函数导入
        if ($content -match "import.*\{.*Logger.*\}.*from.*logger") {
            $content = $content -replace "import.*\{.*Logger.*\}.*from.*logger.*;", "import { getLogger } from '@/lib/utils/logger';`n`nconst logger = getLogger();"
            Set-Content -Path $file.FullName -Value $content -NoNewline
            Write-Host "修复Logger类导入: $($file.FullName)" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "处理Logger类导入失败: $($file.FullName) - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "所有logger导入问题修复完成！" -ForegroundColor Green