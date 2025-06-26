#!/bin/bash

# 🔍 ZK-Agent 数据库状态检查脚本
# 版本: v1.0.0
# 用途: 快速检查数据库连接状态

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

# 检查PostgreSQL服务状态
check_postgresql_service() {
    log_info "检查PostgreSQL服务状态..."
    
    if pg_isready -h $DB_HOST -p $DB_PORT &> /dev/null; then
        log_success "PostgreSQL服务正在运行"
        return 0
    else
        log_error "PostgreSQL服务未运行"
        return 1
    fi
}

# 检查Redis服务状态
check_redis_service() {
    log_info "检查Redis服务状态..."
    
    if redis-cli ping &> /dev/null; then
        log_success "Redis服务正在运行"
        return 0
    else
        log_warning "Redis服务未运行"
        return 1
    fi
}

# 检查数据库连接
check_database_connection() {
    log_info "检查数据库连接..."
    
    export PGPASSWORD=$DB_PASSWORD
    
    if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" &> /dev/null; then
        log_success "数据库连接正常"
        
        # 获取数据库信息
        local db_version=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT version();" 2>/dev/null | head -1 | xargs)
        local table_count=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
        
        echo "  数据库版本: $db_version"
        echo "  表数量: $table_count"
        
        unset PGPASSWORD
        return 0
    else
        log_error "数据库连接失败"
        unset PGPASSWORD
        return 1
    fi
}

# 检查环境变量文件
check_env_file() {
    log_info "检查环境变量文件..."
    
    if [ -f ".env" ]; then
        log_success ".env文件存在"
        
        # 检查关键配置
        if grep -q "DATABASE_URL" .env; then
            local db_url=$(grep "DATABASE_URL" .env | cut -d'=' -f2 | tr -d '"')
            echo "  数据库URL: $db_url"
        else
            log_warning "DATABASE_URL未配置"
        fi
        
        return 0
    else
        log_warning ".env文件不存在"
        return 1
    fi
}

# 检查Prisma状态
check_prisma_status() {
    log_info "检查Prisma状态..."
    
    if [ -f "prisma/schema.prisma" ]; then
        log_success "Prisma schema文件存在"
        
        # 检查是否已生成客户端
        if [ -d "node_modules/.prisma" ]; then
            log_success "Prisma客户端已生成"
        else
            log_warning "Prisma客户端未生成，请运行: npm run db:generate"
        fi
        
        return 0
    else
        log_error "Prisma schema文件不存在"
        return 1
    fi
}

# 检查项目依赖
check_dependencies() {
    log_info "检查项目依赖..."
    
    if [ -d "node_modules" ]; then
        log_success "项目依赖已安装"
        
        # 检查关键依赖
        local deps=("@prisma/client" "next" "react")
        for dep in "${deps[@]}"; do
            if [ -d "node_modules/$dep" ]; then
                echo "  ✅ $dep"
            else
                echo "  ❌ $dep (缺失)"
            fi
        done
        
        return 0
    else
        log_warning "项目依赖未安装，请运行: npm install 或 pnpm install"
        return 1
    fi
}

# 显示系统信息
show_system_info() {
    echo ""
    echo "📊 系统信息:"
    echo "  操作系统: $(uname -s)"
    echo "  Node.js版本: $(node --version 2>/dev/null || echo '未安装')"
    echo "  npm版本: $(npm --version 2>/dev/null || echo '未安装')"
    echo "  pnpm版本: $(pnpm --version 2>/dev/null || echo '未安装')"
    
    if command -v psql &> /dev/null; then
        echo "  PostgreSQL版本: $(psql --version | head -1)"
    else
        echo "  PostgreSQL: 未安装"
    fi
    
    if command -v redis-cli &> /dev/null; then
        echo "  Redis版本: $(redis-cli --version)"
    else
        echo "  Redis: 未安装"
    fi
}

# 显示建议操作
show_recommendations() {
    echo ""
    echo "💡 建议操作:"
    
    # 检查各项状态并给出建议
    if ! check_postgresql_service &> /dev/null; then
        echo "  🔧 启动PostgreSQL服务"
    fi
    
    if ! check_redis_service &> /dev/null; then
        echo "  🔧 启动Redis服务 (可选)"
    fi
    
    if ! check_env_file &> /dev/null; then
        echo "  📝 创建.env文件: ./scripts/setup-database.sh"
    fi
    
    if ! check_dependencies &> /dev/null; then
        echo "  📦 安装依赖: npm install 或 pnpm install"
    fi
    
    if ! check_database_connection &> /dev/null; then
        echo "  🗄️ 设置数据库: ./scripts/setup-database.sh"
    fi
}

# 主函数
main() {
    echo "🔍 ZK-Agent 数据库状态检查"
    echo "================================"
    
    local overall_status=0
    
    # 执行各项检查
    echo ""
    echo "📋 执行状态检查..."
    
    check_postgresql_service || overall_status=1
    check_redis_service || true  # Redis是可选的
    check_env_file || overall_status=1
    check_dependencies || overall_status=1
    check_prisma_status || overall_status=1
    check_database_connection || overall_status=1
    
    # 显示系统信息
    show_system_info
    
    # 显示建议
    show_recommendations
    
    echo ""
    echo "================================"
    if [ $overall_status -eq 0 ]; then
        log_success "所有检查通过，系统就绪！"
        echo ""
        echo "🚀 可以启动开发服务器:"
        echo "  npm run dev 或 pnpm dev"
    else
        log_warning "部分检查未通过，请按照建议进行修复"
        echo ""
        echo "🔧 快速修复:"
        echo "  ./scripts/setup-database.sh  # 一键设置数据库"
    fi
    
    exit $overall_status
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi 