#!/bin/bash

# 🗄️ ZK-Agent 数据库设置脚本
# 版本: v1.0.0
# 用途: 快速设置PostgreSQL数据库和Redis

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 数据库配置
DB_NAME="zkagent_db"
DB_USER="zkagent_user"
DB_PASSWORD="123456"
DB_HOST="localhost"
DB_PORT="5432"

# 检查PostgreSQL是否安装
check_postgresql() {
    log_info "检查PostgreSQL安装状态..."
    
    if command -v psql &> /dev/null; then
        log_success "PostgreSQL已安装"
        psql --version
        return 0
    else
        log_error "PostgreSQL未安装"
        echo ""
        echo "请安装PostgreSQL:"
        echo "  Ubuntu/Debian: sudo apt-get install postgresql postgresql-contrib"
        echo "  CentOS/RHEL:   sudo yum install postgresql-server postgresql-contrib"
        echo "  macOS:         brew install postgresql"
        echo "  Windows:       下载官方安装包 https://www.postgresql.org/download/"
        return 1
    fi
}

# 检查Redis是否安装
check_redis() {
    log_info "检查Redis安装状态..."
    
    if command -v redis-cli &> /dev/null; then
        log_success "Redis已安装"
        redis-cli --version
        return 0
    else
        log_warning "Redis未安装"
        echo ""
        echo "请安装Redis:"
        echo "  Ubuntu/Debian: sudo apt-get install redis-server"
        echo "  CentOS/RHEL:   sudo yum install redis"
        echo "  macOS:         brew install redis"
        echo "  Windows:       下载官方安装包或使用WSL"
        return 1
    fi
}

# 启动PostgreSQL服务
start_postgresql() {
    log_info "启动PostgreSQL服务..."
    
    if command -v systemctl &> /dev/null; then
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
        log_success "PostgreSQL服务已启动并设置为开机自启"
    elif command -v brew &> /dev/null; then
        brew services start postgresql
        log_success "PostgreSQL服务已启动"
    else
        log_warning "请手动启动PostgreSQL服务"
    fi
}

# 启动Redis服务
start_redis() {
    log_info "启动Redis服务..."
    
    if command -v systemctl &> /dev/null; then
        sudo systemctl start redis-server
        sudo systemctl enable redis-server
        log_success "Redis服务已启动并设置为开机自启"
    elif command -v brew &> /dev/null; then
        brew services start redis
        log_success "Redis服务已启动"
    else
        log_warning "请手动启动Redis服务"
    fi
}

# 创建数据库和用户
setup_database() {
    log_info "设置数据库和用户..."
    
    # 检查PostgreSQL是否运行
    if ! pg_isready -h $DB_HOST -p $DB_PORT &> /dev/null; then
        log_error "PostgreSQL服务未运行，请先启动服务"
        return 1
    fi
    
    # 创建用户和数据库
    sudo -u postgres psql << EOF
-- 创建用户
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';

-- 创建数据库
CREATE DATABASE $DB_NAME OWNER $DB_USER;

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
GRANT ALL PRIVILEGES ON SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;

-- 显示创建结果
\l
\du
EOF
    
    if [ $? -eq 0 ]; then
        log_success "数据库和用户创建成功"
    else
        log_error "数据库创建失败"
        return 1
    fi
}

# 测试数据库连接
test_database_connection() {
    log_info "测试数据库连接..."
    
    export PGPASSWORD=$DB_PASSWORD
    
    if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT version();" &> /dev/null; then
        log_success "数据库连接测试成功"
        
        # 显示连接信息
        echo ""
        echo "数据库连接信息:"
        echo "  主机: $DB_HOST"
        echo "  端口: $DB_PORT"
        echo "  数据库: $DB_NAME"
        echo "  用户: $DB_USER"
        echo "  连接字符串: postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
    else
        log_error "数据库连接测试失败"
        return 1
    fi
    
    unset PGPASSWORD
}

# 测试Redis连接
test_redis_connection() {
    log_info "测试Redis连接..."
    
    if redis-cli ping | grep -q "PONG"; then
        log_success "Redis连接测试成功"
        echo ""
        echo "Redis连接信息:"
        echo "  主机: localhost"
        echo "  端口: 6379"
        echo "  连接字符串: redis://localhost:6379"
    else
        log_warning "Redis连接测试失败"
        return 1
    fi
}

# 运行Prisma迁移
run_prisma_migrations() {
    log_info "运行Prisma数据库迁移..."
    
    # 设置环境变量
    export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
    
    # 生成Prisma客户端
    if command -v pnpm &> /dev/null; then
        pnpm prisma generate
        pnpm prisma db push
    elif command -v npm &> /dev/null; then
        npm run db:generate
        npm run db:push
    else
        log_error "未找到包管理器 (npm/pnpm)"
        return 1
    fi
    
    if [ $? -eq 0 ]; then
        log_success "Prisma迁移完成"
    else
        log_error "Prisma迁移失败"
        return 1
    fi
}

# 创建环境变量文件
create_env_file() {
    log_info "创建环境变量文件..."
    
    if [ -f ".env" ]; then
        log_warning ".env文件已存在，创建备份..."
        cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    fi
    
    cat > .env << EOF
# 🔧 ZK-Agent 环境配置文件
# 自动生成于: $(date)

# ==================== 基础配置 ====================
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=ZK-Agent
NEXT_PUBLIC_APP_VERSION=1.0.0

# ==================== 数据库配置 ====================
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# ==================== Redis 配置 ====================
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD=
REDIS_DB=0

# ==================== 认证配置 ====================
JWT_SECRET="$(openssl rand -base64 32)"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_EXPIRES_IN="30d"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="http://localhost:3000"
BCRYPT_ROUNDS=12

# ==================== AI 服务配置 ====================
# 请根据实际情况配置以下API密钥
FASTGPT_BASE_URL="https://api.fastgpt.in"
FASTGPT_API_KEY="your-fastgpt-api-key"
FASTGPT_APP_ID="your-fastgpt-app-id"

QWEN_BASE_URL="https://dashscope.aliyuncs.com"
QWEN_API_KEY="your-qwen-api-key"

SILICONFLOW_BASE_URL="https://api.siliconflow.cn"
SILICONFLOW_API_KEY="your-siliconflow-api-key"

# ==================== 文件存储配置 ====================
UPLOAD_DIR="./uploads"
TEMP_DIR="./temp"
MAX_FILE_SIZE=52428800

# ==================== 开发配置 ====================
DEBUG=false
VERBOSE_LOGGING=false
DISABLE_FACE_ENHANCEMENT=true
LOG_LEVEL="info"
CACHE_ENABLED=true

# ==================== 本地数据库配置 ====================
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
USE_LOCAL_DB=true

# ==================== 性能监控 ====================
ENABLE_METRICS=true
METRICS_RETENTION_DAYS=30
EOF
    
    log_success ".env文件创建成功"
    log_warning "请根据需要修改AI服务API密钥配置"
}

# 显示完成信息
show_completion_info() {
    echo ""
    echo "🎉 数据库设置完成！"
    echo ""
    echo "📋 配置信息:"
    echo "  ✅ PostgreSQL: $DB_HOST:$DB_PORT/$DB_NAME"
    echo "  ✅ Redis: localhost:6379"
    echo "  ✅ 环境变量: .env文件已创建"
    echo "  ✅ Prisma: 数据库迁移已完成"
    echo ""
    echo "🚀 下一步操作:"
    echo "  1. 检查并修改 .env 文件中的AI服务API密钥"
    echo "  2. 运行 npm install 或 pnpm install 安装依赖"
    echo "  3. 运行 npm run dev 或 pnpm dev 启动开发服务器"
    echo ""
    echo "🔧 常用命令:"
    echo "  - 查看数据库: npm run db:studio"
    echo "  - 重置数据库: npm run db:reset"
    echo "  - 运行测试: npm run test"
    echo ""
}

# 主函数
main() {
    echo "🗄️ ZK-Agent 数据库设置向导"
    echo "================================"
    
    # 检查依赖
    if ! check_postgresql; then
        exit 1
    fi
    
    check_redis  # Redis是可选的，不强制要求
    
    # 启动服务
    start_postgresql
    start_redis
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 3
    
    # 设置数据库
    if ! setup_database; then
        log_error "数据库设置失败"
        exit 1
    fi
    
    # 测试连接
    if ! test_database_connection; then
        log_error "数据库连接测试失败"
        exit 1
    fi
    
    test_redis_connection  # Redis测试失败不影响继续
    
    # 创建环境变量文件
    create_env_file
    
    # 运行Prisma迁移
    if ! run_prisma_migrations; then
        log_error "Prisma迁移失败"
        exit 1
    fi
    
    # 显示完成信息
    show_completion_info
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi 