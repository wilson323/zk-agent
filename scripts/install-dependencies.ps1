# 安装必要的依赖
Write-Host "正在安装必要的依赖..."

# 安装 reflect-metadata
Write-Host "安装 reflect-metadata..."
pnpm add reflect-metadata

# 安装开发依赖
Write-Host "安装开发依赖..."
pnpm add -D cross-env @next/bundle-analyzer

Write-Host "依赖安装完成！"
