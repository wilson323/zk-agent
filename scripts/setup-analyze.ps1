# 安装必要的依赖
Write-Host "正在安装必要的依赖..."
pnpm add -D cross-env @next/bundle-analyzer

# 运行分析
Write-Host "正在运行 bundle 分析..."
$env:ANALYZE = "true"
pnpm next build

Write-Host "分析完成！"
