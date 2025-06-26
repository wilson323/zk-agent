#!/bin/bash

# 本地环境设置脚本

echo "🚀 开始设置本地开发环境..."

# 检查PostgreSQL是否安装
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL未安装，请先安装PostgreSQL"
    echo "Ubuntu/Debian: sudo apt-get install postgresql postgresql-contrib"
    echo "macOS: brew install postgresql"
    echo "Windows: 下载并安装PostgreSQL官方安装包"
    exit 1
fi

# 检查Redis是否安装
if ! command -v redis-cli &> /dev/null; then
    echo "❌ Redis未安装，请先安装Redis"
    echo "Ubuntu/Debian: sudo apt-get install redis-server"
    echo "macOS: brew install redis"
    echo "Windows: 下载并安装Redis官方安装包"
    exit 1
fi

# 启动PostgreSQL服务
echo "📦 启动PostgreSQL服务..."
if command -v systemctl &> /dev/null; then
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
elif command -v brew &> /dev/null; then
    brew services start postgresql
fi

# 启动Redis服务
echo "📦 启动Redis服务..."
if command -v systemctl &> /dev/null; then
    sudo systemctl start redis-server
    sudo systemctl enable redis-server
elif command -v brew &> /dev/null; then
    brew services start redis
else
    redis-server --daemonize yes
fi

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 3

# 检查PostgreSQL连接
echo "🔍 检查PostgreSQL连接..."
if pg_isready -h localhost -p 5432; then
    echo "✅ PostgreSQL服务正常"
else
    echo "❌ PostgreSQL服务未正常启动"
    exit 1
fi

# 检查Redis连接
echo "🔍 检查Redis连接..."
if redis-cli ping | grep -q "PONG"; then
    echo "✅ Redis服务正常"
else
    echo "❌ Redis服务未正常启动"
    exit 1
fi

# 创建数据库
echo "🗄️ 初始化数据库..."
sudo -u postgres psql -f scripts/init-local-db.sql

# 复制环境变量文件
if [ ! -f .env.local ]; then
    echo "📝 创建本地环境变量文件..."
    cp .env.example .env.local
    echo "✅ 请编辑 .env.local 文件以配置您的本地环境"
fi

# 安装依赖
echo "📦 安装项目依赖..."
npm install

# 运行数据库迁移
echo "🔄 运行数据库迁移..."
npx prisma generate
npx prisma db push

# 创建上传目录
echo "📁 创建上传目录..."
mkdir -p uploads/cad
mkdir -p uploads/posters
mkdir -p uploads/temp

echo "🎉 本地环境设置完成！"
echo ""
echo "📋 下一步："
echo "1. 编辑 .env.local 文件配置您的环境变量"
echo "2. 运行 npm run dev 启动开发服务器"
echo "3. 访问 http://localhost:3000"
echo ""
echo "🔧 服务状态："
echo "- PostgreSQL: localhost:5432"
echo "- Redis: localhost:6379"
echo "- 默认管理员账户: admin@localhost / admin123"
