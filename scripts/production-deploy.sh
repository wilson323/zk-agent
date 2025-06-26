#!/bin/bash

# 🚀 ZK-Agent 生产部署脚本
# 版本: v1.0.0
# 用途: 自动化生产环境部署，支持蓝绿部署和回滚

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置变量
DOCKER_REGISTRY="registry.zkagent.com"
APP_NAME="zkagent"
PRODUCTION_HOST="171.43.138.237"
PRODUCTION_USER="root"
PRODUCTION_PORT="22"
HEALTH_CHECK_URL="http://${PRODUCTION_HOST}:8005/api/health"
BACKUP_RETENTION_DAYS=7

# 日志函数
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

# 检查部署前置条件
check_prerequisites() {
    log_info "检查部署前置条件..."
    
    # 检查必要工具
    local tools=("docker" "ssh" "curl" "jq")
    for tool in "${tools[@]}"; do
        if ! command -v $tool &> /dev/null; then
            log_error "$tool 未安装"
            exit 1
        fi
    done
    
    # 检查SSH连接
    if ! ssh -o ConnectTimeout=10 -p $PRODUCTION_PORT $PRODUCTION_USER@$PRODUCTION_HOST "echo 'SSH连接正常'"; then
        log_error "无法连接到生产服务器"
        exit 1
    fi
    
    # 检查Docker镜像
    if ! docker images | grep -q "$APP_NAME:latest"; then
        log_error "Docker镜像 $APP_NAME:latest 不存在，请先构建镜像"
        exit 1
    fi
    
    log_success "前置条件检查完成"
}

# 执行预部署检查
run_pre_deploy_checks() {
    log_info "执行预部署检查..."
    
    # 代码质量检查
    log_info "检查代码质量..."
    npm run lint || { log_error "ESLint检查失败"; exit 1; }
    npm run type-check || { log_error "TypeScript检查失败"; exit 1; }
    
    # 安全扫描
    log_info "执行安全扫描..."
    npm audit --audit-level high || { log_error "安全扫描发现高危漏洞"; exit 1; }
    
    # 构建测试
    log_info "测试构建..."
    npm run build || { log_error "构建失败"; exit 1; }
    
    # 数据库迁移检查
    log_info "检查数据库迁移..."
    npm run db:migrate:dry-run || { log_error "数据库迁移检查失败"; exit 1; }
    
    log_success "预部署检查完成"
}

# 备份当前生产环境
backup_production() {
    log_info "备份当前生产环境..."
    
    local backup_timestamp
    backup_timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_dir="/backup/zkagent_${backup_timestamp}"
    
    # 在生产服务器上创建备份
    ssh -p "$PRODUCTION_PORT" "$PRODUCTION_USER@$PRODUCTION_HOST" << 'EOF'
        # 创建备份目录
        mkdir -p $backup_dir
        
        # 备份数据库
        docker exec zkagent-postgres pg_dump -U postgres zkagent > $backup_dir/database.sql
        
        # 备份上传文件
        cp -r /opt/zkagent/uploads $backup_dir/
        
        # 备份配置文件
        cp /opt/zkagent/.env.production $backup_dir/
        cp /opt/zkagent/docker-compose.production.yml $backup_dir/
        
        # 备份当前Docker镜像
        docker save zkagent:stable > $backup_dir/zkagent-stable.tar
        
        # 压缩备份
        tar -czf $backup_dir.tar.gz -C /backup zkagent_${backup_timestamp}
        rm -rf $backup_dir
        
        # 清理旧备份
        find /backup -name "zkagent_*.tar.gz" -mtime +$BACKUP_RETENTION_DAYS -delete
        
        echo "备份完成: $backup_dir.tar.gz"
EOF
    
    log_success "生产环境备份完成"
}

# 构建和推送Docker镜像
build_and_push_image() {
    log_info "构建和推送Docker镜像..."
    
    local version_tag
    version_tag=$(git rev-parse --short HEAD)
    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    
    # 构建镜像
    log_info "构建Docker镜像..."
    docker build -t $APP_NAME:latest -t $APP_NAME:$version_tag -t $APP_NAME:$timestamp .
    
            # 推送到镜像仓库（如果配置了）
        if [ -n "$DOCKER_REGISTRY" ]; then
        log_info "推送镜像到仓库..."
        docker tag $APP_NAME:latest $DOCKER_REGISTRY/$APP_NAME:latest
        docker tag $APP_NAME:$version_tag $DOCKER_REGISTRY/$APP_NAME:$version_tag
        docker push $DOCKER_REGISTRY/$APP_NAME:latest
        docker push $DOCKER_REGISTRY/$APP_NAME:$version_tag
    fi
    
    # 保存镜像到文件
    log_info "保存镜像到文件..."
    docker save $APP_NAME:latest > zkagent-latest.tar
    
    log_success "镜像构建和推送完成"
}

# 传输文件到生产服务器
transfer_files() {
    log_info "传输文件到生产服务器..."
    
    # 创建临时目录
    local temp_dir
    temp_dir=$(mktemp -d)
    
    # 准备部署文件
    cp docker-compose.production.yml $temp_dir/
    cp .env.production $temp_dir/
    cp zkagent-latest.tar $temp_dir/
    cp scripts/health-check.js $temp_dir/
    
    # 压缩传输
    tar -czf deploy-package.tar.gz -C $temp_dir .
    
    # 传输到服务器
    scp -P "$PRODUCTION_PORT" deploy-package.tar.gz "$PRODUCTION_USER@$PRODUCTION_HOST":/tmp/
    
    # 在服务器上解压
    ssh -p "$PRODUCTION_PORT" "$PRODUCTION_USER@$PRODUCTION_HOST" << 'EOF'
        cd /opt/zkagent
        tar -xzf /tmp/deploy-package.tar.gz
        rm /tmp/deploy-package.tar.gz
        
        # 加载新镜像
        docker load < zkagent-latest.tar
        rm zkagent-latest.tar
        
        # 标记为绿色环境镜像
        docker tag zkagent:latest zkagent:green
EOF
    
    # 清理本地临时文件
    rm -rf $temp_dir deploy-package.tar.gz zkagent-latest.tar
    
    log_success "文件传输完成"
}

# 执行数据库迁移
run_database_migration() {
    log_info "执行数据库迁移..."
    
    ssh -p "$PRODUCTION_PORT" "$PRODUCTION_USER@$PRODUCTION_HOST" << 'EOF'
        cd /opt/zkagent
        
        # 使用临时容器执行迁移
        docker run --rm \
            --network zkagent_production \
            -e DATABASE_URL=\$(grep DATABASE_URL .env.production | cut -d '=' -f2) \
            zkagent:green \
            npm run db:migrate
EOF
    
    log_success "数据库迁移完成"
}

# 启动绿色环境
start_green_environment() {
    log_info "启动绿色环境..."
    
    ssh -p "$PRODUCTION_PORT" "$PRODUCTION_USER@$PRODUCTION_HOST" << 'EOF'
        cd /opt/zkagent
        
        # 启动绿色环境
        docker-compose -f docker-compose.production.yml up -d zkagent-green
        
        # 等待服务启动
        sleep 30
EOF
    
    log_success "绿色环境启动完成"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        log_info "健康检查尝试 $attempt/$max_attempts..."
        
        # 检查绿色环境健康状态
        if ssh -p "$PRODUCTION_PORT" "$PRODUCTION_USER@$PRODUCTION_HOST" \
           "curl -f -H 'X-Environment: green' $HEALTH_CHECK_URL"; then
            log_success "健康检查通过"
            return 0
        fi
        
        sleep 10
        ((attempt++))
    done
    
    log_error "健康检查失败"
    return 1
}

# 切换流量到绿色环境
switch_traffic() {
    log_info "切换流量到绿色环境..."
    
    ssh -p "$PRODUCTION_PORT" "$PRODUCTION_USER@$PRODUCTION_HOST" << 'EOF'
        cd /opt/zkagent
        
        # 更新负载均衡器配置
        # 这里假设使用nginx作为负载均衡器
        sed -i 's/zkagent-blue/zkagent-green/g' /etc/nginx/sites-available/zkagent
        nginx -s reload
        
        # 或者使用Docker标签切换
        docker-compose -f docker-compose.production.yml stop zkagent-blue
        docker tag zkagent:green zkagent:stable
        docker-compose -f docker-compose.production.yml up -d zkagent-blue
EOF
    
    # 验证切换成功
    sleep 10
    if curl -f $HEALTH_CHECK_URL; then
        log_success "流量切换成功"
    else
        log_error "流量切换失败"
        return 1
    fi
}

# 清理旧环境
cleanup_old_environment() {
    log_info "清理旧环境..."
    
    ssh -p "$PRODUCTION_PORT" "$PRODUCTION_USER@$PRODUCTION_HOST" << 'EOF'
        cd /opt/zkagent
        
        # 停止并删除旧的绿色环境
        docker-compose -f docker-compose.production.yml stop zkagent-green
        docker-compose -f docker-compose.production.yml rm -f zkagent-green
        
        # 清理未使用的镜像
        docker image prune -f
EOF
    
    log_success "旧环境清理完成"
}

# 回滚到上一个版本
rollback() {
    log_error "开始回滚操作..."
    
    ssh -p "$PRODUCTION_PORT" "$PRODUCTION_USER@$PRODUCTION_HOST" << 'EOF'
        cd /opt/zkagent
        
        # 停止绿色环境
        docker-compose -f docker-compose.production.yml stop zkagent-green
        
        # 恢复蓝色环境
        docker-compose -f docker-compose.production.yml up -d zkagent-blue
        
        # 更新负载均衡器
        sed -i 's/zkagent-green/zkagent-blue/g' /etc/nginx/sites-available/zkagent
        nginx -s reload
EOF
    
    # 验证回滚成功
    sleep 10
    if curl -f $HEALTH_CHECK_URL; then
        log_success "回滚成功"
    else
        log_error "回滚失败，需要手动干预"
        exit 1
    fi
}

# 发送部署通知
send_notification() {
    local status=$1
    local message=$2
    
    # 这里可以集成钉钉、企业微信、Slack等通知
    log_info "发送部署通知: $status - $message"
    
    # 示例：发送到钉钉
    if [ -n "$DINGTALK_WEBHOOK" ]; then
        curl -X POST "$DINGTALK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{
                \"msgtype\": \"text\",
                \"text\": {
                    \"content\": \"ZK-Agent部署通知\\n状态: $status\\n消息: $message\\n时间: $(date)\"
                }
            }"
    fi
}

# 主部署流程
deploy() {
    local start_time
    start_time=$(date +%s)
    
    echo "🚀 ZK-Agent 生产部署开始"
    echo "=================================="
    
    # 发送开始通知
    send_notification "开始" "生产环境部署开始"
    
    # 执行部署步骤
    check_prerequisites
    run_pre_deploy_checks
    backup_production
    build_and_push_image
    transfer_files
    run_database_migration
    start_green_environment
    
    # 健康检查
    if ! health_check; then
        log_error "健康检查失败，开始回滚"
        rollback
        send_notification "失败" "部署失败，已回滚到上一版本"
        exit 1
    fi
    
    # 切换流量
    if ! switch_traffic; then
        log_error "流量切换失败，开始回滚"
        rollback
        send_notification "失败" "流量切换失败，已回滚到上一版本"
        exit 1
    fi
    
    # 清理旧环境
    cleanup_old_environment
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo ""
    echo "=================================="
    log_success "部署完成，耗时 ${duration}s"
    log_success "应用已成功部署到生产环境！"
    
    # 发送成功通知
    send_notification "成功" "生产环境部署成功，耗时 ${duration}s"
}

# 快速回滚功能
quick_rollback() {
    echo "🔄 执行快速回滚"
    echo "=================================="
    
    rollback
    send_notification "回滚" "执行快速回滚操作"
    
    log_success "快速回滚完成"
}

# 查看部署状态
status() {
    echo "📊 ZK-Agent 部署状态"
    echo "=================================="
    
    ssh -p "$PRODUCTION_PORT" "$PRODUCTION_USER@$PRODUCTION_HOST" << 'EOF'
        cd /opt/zkagent
        
        echo "Docker容器状态:"
        docker-compose -f docker-compose.production.yml ps
        
        echo ""
        echo "应用健康状态:"
        curl -s $HEALTH_CHECK_URL | jq .
        
        echo ""
        echo "系统资源使用:"
        docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
EOF
}

# 脚本使用说明
usage() {
    echo "ZK-Agent 生产部署脚本"
    echo ""
    echo "用法:"
    echo "  $0 deploy          执行完整部署"
    echo "  $0 rollback        快速回滚到上一版本"
    echo "  $0 status          查看部署状态"
    echo "  $0 health          执行健康检查"
    echo ""
    echo "环境变量:"
    echo "  DINGTALK_WEBHOOK   钉钉通知webhook地址"
    echo "  DOCKER_REGISTRY    Docker镜像仓库地址"
}

# 主函数
main() {
    case "${1:-deploy}" in
        "deploy")
            deploy
            ;;
        "rollback")
            quick_rollback
            ;;
        "status")
            status
            ;;
        "health")
            health_check
            ;;
        "help"|"-h"|"--help")
            usage
            ;;
        *)
            log_error "未知命令: $1"
            usage
            exit 1
            ;;
    esac
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi 