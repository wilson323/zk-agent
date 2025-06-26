#!/bin/bash

# ZK-Agent 生产环境部署脚本
# 自动化部署流程，包含安全检查和回滚机制

set -euo pipefail

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
APP_NAME="zk-agent"
DOCKER_REGISTRY="your-registry.com"
DOCKER_IMAGE="${DOCKER_REGISTRY}/${APP_NAME}"
DEPLOY_ENV="production"
BACKUP_DIR="/var/backups/${APP_NAME}"
LOG_FILE="/var/log/${APP_NAME}/deploy.log"
MAX_ROLLBACK_VERSIONS=5

# 函数定义
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}" | tee -a "$LOG_FILE"
}

# 检查必需的工具
check_dependencies() {
    log "检查部署依赖..."
    
    local deps=("docker" "docker-compose" "node" "pnpm" "git")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            log_error "缺少依赖: $dep"
            exit 1
        fi
    done
    
    log_success "所有依赖检查通过"
}

# 验证环境配置
validate_environment() {
    log "验证环境配置..."
    
    if [[ ! -f ".env.${DEPLOY_ENV}" ]]; then
        log_error "环境配置文件 .env.${DEPLOY_ENV} 不存在"
        exit 1
    fi
    
    # 运行环境变量验证
    if ! node scripts/validate-env.js validate ".env.${DEPLOY_ENV}"; then
        log_error "环境配置验证失败"
        exit 1
    fi
    
    log_success "环境配置验证通过"
}

# 运行测试
run_tests() {
    log "运行测试套件..."
    
    # 运行单元测试
    if ! pnpm test:unit; then
        log_error "单元测试失败"
        exit 1
    fi
    
    # 运行集成测试
    if ! pnpm test:integration; then
        log_error "集成测试失败"
        exit 1
    fi
    
    # 运行安全测试
    if ! pnpm test:security; then
        log_error "安全测试失败"
        exit 1
    fi
    
    log_success "所有测试通过"
}

# 构建Docker镜像
build_image() {
    local version="$1"
    log "构建Docker镜像 ${DOCKER_IMAGE}:${version}..."
    
    # 构建镜像
    if ! docker build -t "${DOCKER_IMAGE}:${version}" -t "${DOCKER_IMAGE}:latest" .; then
        log_error "Docker镜像构建失败"
        exit 1
    fi
    
    # 扫描安全漏洞
    if command -v trivy &> /dev/null; then
        log "扫描镜像安全漏洞..."
        if ! trivy image "${DOCKER_IMAGE}:${version}"; then
            log_warning "发现安全漏洞，请检查"
        fi
    fi
    
    log_success "Docker镜像构建完成"
}

# 推送镜像到仓库
push_image() {
    local version="$1"
    log "推送镜像到仓库..."
    
    if ! docker push "${DOCKER_IMAGE}:${version}"; then
        log_error "镜像推送失败"
        exit 1
    fi
    
    if ! docker push "${DOCKER_IMAGE}:latest"; then
        log_error "latest标签推送失败"
        exit 1
    fi
    
    log_success "镜像推送完成"
}

# 备份当前部署
backup_current_deployment() {
    log "备份当前部署..."
    
    local backup_timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_path="${BACKUP_DIR}/${backup_timestamp}"
    
    mkdir -p "$backup_path"
    
    # 备份数据库
    if docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U zk_agent_user zk_agent_prod > "${backup_path}/database.sql"; then
        log_success "数据库备份完成"
    else
        log_warning "数据库备份失败"
    fi
    
    # 备份上传文件
    if [[ -d "/var/lib/zk-agent/uploads" ]]; then
        cp -r "/var/lib/zk-agent/uploads" "${backup_path}/"
        log_success "文件备份完成"
    fi
    
    # 备份配置
    cp ".env.${DEPLOY_ENV}" "${backup_path}/"
    cp "docker-compose.prod.yml" "${backup_path}/"
    
    # 清理旧备份
    find "$BACKUP_DIR" -maxdepth 1 -type d -name "*_*" | sort -r | tail -n +$((MAX_ROLLBACK_VERSIONS + 1)) | xargs rm -rf
    
    echo "$backup_timestamp" > "${BACKUP_DIR}/latest"
    log_success "备份完成: $backup_path"
}

# 部署新版本
deploy_new_version() {
    local version="$1"
    log "部署新版本 ${version}..."
    
    # 更新docker-compose文件中的镜像版本
    sed -i "s|image: .*|image: ${DOCKER_IMAGE}:${version}|g" docker-compose.prod.yml
    
    # 执行数据库迁移
    log "执行数据库迁移..."
    if ! docker-compose -f docker-compose.prod.yml run --rm app pnpm db:migrate:deploy; then
        log_error "数据库迁移失败"
        return 1
    fi
    
    # 启动新版本
    log "启动新版本服务..."
    if ! docker-compose -f docker-compose.prod.yml up -d; then
        log_error "服务启动失败"
        return 1
    fi
    
    # 等待服务启动
    log "等待服务启动..."
    sleep 30
    
    # 健康检查
    if ! perform_health_check; then
        log_error "健康检查失败"
        return 1
    fi
    
    log_success "新版本部署完成"
    return 0
}

# 健康检查
perform_health_check() {
    log "执行健康检查..."
    
    local max_attempts=10
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "http://localhost/api/health" > /dev/null; then
            log_success "健康检查通过"
            return 0
        fi
        
        log "健康检查失败，重试 $attempt/$max_attempts"
        sleep 10
        ((attempt++))
    done
    
    log_error "健康检查最终失败"
    return 1
}

# 回滚到上一个版本
rollback() {
    log_warning "开始回滚..."
    
    if [[ ! -f "${BACKUP_DIR}/latest" ]]; then
        log_error "没有找到备份信息"
        exit 1
    fi
    
    local backup_timestamp=$(cat "${BACKUP_DIR}/latest")
    local backup_path="${BACKUP_DIR}/${backup_timestamp}"
    
    if [[ ! -d "$backup_path" ]]; then
        log_error "备份目录不存在: $backup_path"
        exit 1
    fi
    
    # 恢复配置
    cp "${backup_path}/.env.${DEPLOY_ENV}" "."
    cp "${backup_path}/docker-compose.prod.yml" "."
    
    # 重启服务
    docker-compose -f docker-compose.prod.yml down
    docker-compose -f docker-compose.prod.yml up -d
    
    # 恢复数据库（如果需要）
    if [[ -f "${backup_path}/database.sql" ]]; then
        log_warning "是否需要恢复数据库？这将覆盖当前数据！(y/N)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            docker-compose -f docker-compose.prod.yml exec -T postgres psql -U zk_agent_user -d zk_agent_prod < "${backup_path}/database.sql"
            log_success "数据库已恢复"
        fi
    fi
    
    log_success "回滚完成"
}

# 清理资源
cleanup() {
    log "清理未使用的Docker资源..."
    
    # 清理未使用的镜像
    docker image prune -f
    
    # 清理未使用的容器
    docker container prune -f
    
    # 清理未使用的网络
    docker network prune -f
    
    # 清理未使用的卷（谨慎使用）
    # docker volume prune -f
    
    log_success "清理完成"
}

# 发送通知
send_notification() {
    local status="$1"
    local version="$2"
    local message="$3"
    
    # 这里可以集成Slack、钉钉、邮件等通知方式
    log "发送部署通知: $status - $message"
    
    # 示例：发送到Slack
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚀 ZK-Agent 部署通知\\n状态: $status\\n版本: $version\\n消息: $message\"}" \
            "$SLACK_WEBHOOK_URL"
    fi
}

# 主部署流程
main() {
    local command="${1:-deploy}"
    local version="${2:-$(git rev-parse --short HEAD)}"
    
    # 创建必要的目录
    mkdir -p "$(dirname "$LOG_FILE")"
    mkdir -p "$BACKUP_DIR"
    
    case "$command" in
        "deploy")
            log "开始部署 ZK-Agent v${version} 到 ${DEPLOY_ENV} 环境"
            
            # 检查依赖
            check_dependencies
            
            # 验证环境
            validate_environment
            
            # 运行测试
            run_tests
            
            # 构建镜像
            build_image "$version"
            
            # 推送镜像
            push_image "$version"
            
            # 备份当前部署
            backup_current_deployment
            
            # 部署新版本
            if deploy_new_version "$version"; then
                send_notification "SUCCESS" "$version" "部署成功完成"
                log_success "🎉 部署成功完成！"
            else
                log_error "部署失败，开始回滚..."
                rollback
                send_notification "FAILED" "$version" "部署失败，已回滚"
                exit 1
            fi
            
            # 清理资源
            cleanup
            ;;
            
        "rollback")
            log "开始回滚部署"
            rollback
            send_notification "ROLLBACK" "$version" "手动回滚完成"
            ;;
            
        "health")
            log "执行健康检查"
            if perform_health_check; then
                log_success "服务健康"
                exit 0
            else
                log_error "服务不健康"
                exit 1
            fi
            ;;
            
        "cleanup")
            log "清理Docker资源"
            cleanup
            ;;
            
        *)
            echo "用法: $0 {deploy|rollback|health|cleanup} [version]"
            echo ""
            echo "命令:"
            echo "  deploy [version]  - 部署指定版本（默认为当前git commit）"
            echo "  rollback          - 回滚到上一个版本"
            echo "  health            - 执行健康检查"
            echo "  cleanup           - 清理Docker资源"
            echo ""
            echo "示例:"
            echo "  $0 deploy v1.2.3"
            echo "  $0 rollback"
            echo "  $0 health"
            exit 1
            ;;
    esac
}

# 信号处理
trap 'log_error "部署被中断"; exit 1' INT TERM

# 运行主函数
main "$@"