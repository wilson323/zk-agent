#!/bin/bash
# 数据库恢复脚本
# 用于ZK-Agent项目的PostgreSQL数据库恢复

set -e

# 配置变量
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_ROOT/backups"
DATE=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$BACKUP_DIR/restore_$DATE.log"

# 使用说明
usage() {
    echo "用法: $0 [选项] <备份文件>"
    echo "选项:"
    echo "  -h, --help          显示此帮助信息"
    echo "  -f, --force         强制恢复，不进行确认"
    echo "  -e, --env ENV       指定环境 (development|production)"
    echo "  --dry-run           仅验证备份文件，不执行恢复"
    echo "  --no-backup         恢复前不创建当前数据库备份"
    echo ""
    echo "示例:"
    echo "  $0 backups/zkagent_backup_20241219_143000.sql.gz"
    echo "  $0 -f -e production backups/zkagent_backup_20241219_143000.sql.gz"
    echo "  $0 --dry-run backups/zkagent_backup_20241219_143000.sql.gz"
    exit 1
}

# 默认参数
FORCE=false
ENVIRONMENT="development"
DRY_RUN=false
CREATE_BACKUP=true
BACKUP_FILE=""

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --no-backup)
            CREATE_BACKUP=false
            shift
            ;;
        -*)
            echo "未知选项: $1"
            usage
            ;;
        *)
            if [ -z "$BACKUP_FILE" ]; then
                BACKUP_FILE="$1"
            else
                echo "错误: 只能指定一个备份文件"
                usage
            fi
            shift
            ;;
    esac
done

# 检查备份文件参数
if [ -z "$BACKUP_FILE" ]; then
    echo "错误: 必须指定备份文件"
    usage
fi

# 创建日志目录
mkdir -p "$BACKUP_DIR"

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 错误处理函数
error_exit() {
    log "错误: $1"
    exit 1
}

# 加载环境配置
if [ "$ENVIRONMENT" = "production" ]; then
    ENV_FILE="$PROJECT_ROOT/.env.production"
else
    ENV_FILE="$PROJECT_ROOT/.env.local"
fi

if [ ! -f "$ENV_FILE" ]; then
    error_exit "环境配置文件不存在: $ENV_FILE"
fi

source "$ENV_FILE" || error_exit "无法加载环境配置文件"

# 解析数据库URL
if [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)/([^?]+) ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASSWORD="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
else
    error_exit "无法解析数据库URL格式"
fi

# 检查必要工具
command -v psql >/dev/null 2>&1 || error_exit "psql 未安装"
command -v pg_dump >/dev/null 2>&1 || error_exit "pg_dump 未安装"

# 检查备份文件
if [ ! -f "$BACKUP_FILE" ]; then
    error_exit "备份文件不存在: $BACKUP_FILE"
fi

log "开始数据库恢复..."
log "环境: $ENVIRONMENT"
log "数据库: $DB_NAME@$DB_HOST:$DB_PORT"
log "备份文件: $BACKUP_FILE"
log "日志文件: $LOG_FILE"

# 设置密码环境变量
export PGPASSWORD="$DB_PASSWORD"

# 验证备份文件
log "正在验证备份文件..."
if [[ "$BACKUP_FILE" == *.gz ]]; then
    # 检查gzip文件完整性
    gzip -t "$BACKUP_FILE" || error_exit "备份文件损坏或不是有效的gzip文件"
    
    # 检查SQL内容
    zcat "$BACKUP_FILE" | head -10 | grep -q "PostgreSQL database dump" || \
        error_exit "备份文件不是有效的PostgreSQL转储文件"
    
    log "备份文件验证成功 (压缩格式)"
else
    # 检查SQL文件
    head -10 "$BACKUP_FILE" | grep -q "PostgreSQL database dump" || \
        error_exit "备份文件不是有效的PostgreSQL转储文件"
    
    log "备份文件验证成功 (未压缩格式)"
fi

# 如果是dry-run模式，到此结束
if [ "$DRY_RUN" = true ]; then
    log "Dry-run模式: 备份文件验证完成，未执行实际恢复"
    exit 0
fi

# 测试数据库连接
log "正在测试数据库连接..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" >/dev/null 2>&1 || \
    error_exit "无法连接到数据库"

log "数据库连接测试成功"

# 确认操作（除非使用--force）
if [ "$FORCE" != true ]; then
    echo ""
    echo "警告: 此操作将完全替换当前数据库内容!"
    echo "数据库: $DB_NAME ($ENVIRONMENT)"
    echo "备份文件: $BACKUP_FILE"
    echo ""
    read -p "确定要继续吗? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log "用户取消操作"
        exit 0
    fi
fi

# 创建当前数据库备份（除非使用--no-backup）
if [ "$CREATE_BACKUP" = true ]; then
    log "正在创建当前数据库备份..."
    CURRENT_BACKUP="$BACKUP_DIR/pre_restore_backup_$DATE.sql.gz"
    
    pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --verbose \
        --clean \
        --if-exists \
        --create \
        --format=plain \
        --encoding=UTF8 \
        --no-password | gzip > "$CURRENT_BACKUP" 2>&1
    
    if [ $? -eq 0 ]; then
        log "当前数据库备份成功: $CURRENT_BACKUP"
    else
        log "警告: 当前数据库备份失败，但继续恢复操作"
    fi
fi

# 执行恢复
log "正在执行数据库恢复..."

if [[ "$BACKUP_FILE" == *.gz ]]; then
    # 恢复压缩备份
    zcat "$BACKUP_FILE" | psql \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="postgres" \
        --quiet 2>&1 | tee -a "$LOG_FILE"
else
    # 恢复未压缩备份
    psql \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="postgres" \
        --file="$BACKUP_FILE" \
        --quiet 2>&1 | tee -a "$LOG_FILE"
fi

RESTORE_EXIT_CODE=$?

if [ $RESTORE_EXIT_CODE -eq 0 ]; then
    log "数据库恢复成功完成"
else
    error_exit "数据库恢复失败 (退出代码: $RESTORE_EXIT_CODE)"
fi

# 验证恢复结果
log "正在验证恢复结果..."
TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')

if [ -n "$TABLE_COUNT" ] && [ "$TABLE_COUNT" -gt 0 ]; then
    log "恢复验证成功: 发现 $TABLE_COUNT 个表"
else
    log "警告: 恢复验证失败或数据库为空"
fi

# 运行数据库迁移（如果需要）
if [ -f "$PROJECT_ROOT/package.json" ] && grep -q "prisma" "$PROJECT_ROOT/package.json"; then
    log "正在运行Prisma迁移..."
    cd "$PROJECT_ROOT"
    npm run db:migrate 2>&1 | tee -a "$LOG_FILE" || log "警告: Prisma迁移失败"
fi

# 发送通知（如果配置了）
if [ -n "${RESTORE_NOTIFICATION_WEBHOOK:-}" ]; then
    curl -X POST "$RESTORE_NOTIFICATION_WEBHOOK" \
        -H "Content-Type: application/json" \
        -d "{
            \"text\": \"ZK-Agent数据库恢复完成\",
            \"attachments\": [{
                \"color\": \"good\",
                \"fields\": [
                    {\"title\": \"数据库\", \"value\": \"$DB_NAME\", \"short\": true},
                    {\"title\": \"环境\", \"value\": \"$ENVIRONMENT\", \"short\": true},
                    {\"title\": \"时间\", \"value\": \"$DATE\", \"short\": true},
                    {\"title\": \"状态\", \"value\": \"成功\", \"short\": true}
                ]
            }]
        }" 2>/dev/null || true
fi

log "数据库恢复完成!"
log "日志文件: $LOG_FILE"

# 清理环境变量
unset PGPASSWORD

exit 0