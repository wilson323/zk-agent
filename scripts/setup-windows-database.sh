#!/bin/bash

# 🪟 Windows环境数据库配置脚本
# 版本: v1.0.0
# 用途: 配置Windows主机的PostgreSQL和Redis

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 数据库配置（使用Windows主机的服务）
DB_NAME="zkagent_db"
DB_USER="zkagent_user"
DB_PASSWORD="123456"
DB_HOST="host.docker.internal"  # 使用Docker主机地址
DB_PORT="5432"

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 创建Windows环境变量文件
create_env_file() {
    log_info "创建Windows环境变量文件..."
    
    cat > .env << EOF
# Windows环境配置
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
REDIS_URL="redis://${DB_HOST}:6379"
EOF

    log_success ".env文件创建完成"
}

# 配置PostgreSQL
setup_postgresql() {
    log_info "配置PostgreSQL数据库..."
    
    # 通过psql命令创建数据库和用户
    /mnt/c/Program\ Files/PostgreSQL/*/bin/psql.exe -U postgres -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';"
    /mnt/c/Program\ Files/PostgreSQL/*/bin/psql.exe -U postgres -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
    /mnt/c/Program\ Files/PostgreSQL/*/bin/psql.exe -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"

    log_success "PostgreSQL配置完成"
}

# 运行数据库迁移
run_migrations() {
    log_info "运行数据库迁移..."
    
    if command -v pnpm &> /dev/null; then
        pnpm prisma migrate deploy
    else
        npm run db:migrate
    fi
    
    log_success "数据库迁移完成"
}

# 主函数
main() {
    echo "🛠️ 开始配置Windows数据库环境..."
    
    # 创建环境文件
    create_env_file
    
    # 配置PostgreSQL
    setup_postgresql
    
    # 运行迁移
    run_migrations
    
    echo ""
    log_success "数据库配置完成！"
    echo "连接信息:"
    echo "  PostgreSQL: postgresql://${DB_USER}:****@${DB_HOST}:${DB_PORT}/${DB_NAME}"
    echo "  Redis: redis://${DB_HOST}:6379"
}

main "$@" 