#!/bin/bash
# 数据库备份脚本
# 用于ZK-Agent项目的PostgreSQL数据库备份

set -e

# 配置变量
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_ROOT/backups"
DATE=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$BACKUP_DIR/backup_$DATE.log"

# 从环境变量读取数据库配置
source "$PROJECT_ROOT/.env.production" 2>/dev/null || {
    echo "错误: 无法加载生产环境配置文件"
    exit 1
}

# 解析数据库URL
if [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)/([^?]+) ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASSWORD="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
else
    echo "错误: 无法解析数据库URL格式"
    exit 1
fi

# 创建备份目录
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

# 检查必要工具
command -v pg_dump >/dev/null 2>&1 || error_exit "pg_dump 未安装"
command -v gzip >/dev/null 2>&1 || error_exit "gzip 未安装"

log "开始数据库备份..."
log "数据库: $DB_NAME@$DB_HOST:$DB_PORT"
log "备份目录: $BACKUP_DIR"

# 设置密码环境变量
export PGPASSWORD="$DB_PASSWORD"

# 执行备份
BACKUP_FILE="$BACKUP_DIR/zkagent_backup_$DATE.sql"
COMPRESSED_FILE="$BACKUP_FILE.gz"

log "正在创建数据库转储..."
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
    --no-password \
    --file="$BACKUP_FILE" 2>&1 | tee -a "$LOG_FILE"

if [ $? -eq 0 ]; then
    log "数据库转储成功创建: $BACKUP_FILE"
else
    error_exit "数据库转储失败"
fi

# 压缩备份文件
log "正在压缩备份文件..."
gzip "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    log "备份文件压缩成功: $COMPRESSED_FILE"
else
    error_exit "备份文件压缩失败"
fi

# 获取文件大小
FILE_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
log "备份文件大小: $FILE_SIZE"

# 验证备份文件
log "正在验证备份文件..."
if [ -f "$COMPRESSED_FILE" ] && [ -s "$COMPRESSED_FILE" ]; then
    log "备份文件验证成功"
else
    error_exit "备份文件验证失败"
fi

# 清理旧备份（保留最近30天）
log "正在清理旧备份文件..."
find "$BACKUP_DIR" -name "zkagent_backup_*.sql.gz" -type f -mtime +30 -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "backup_*.log" -type f -mtime +30 -delete 2>/dev/null || true

# 备份到云存储（如果配置了）
if [ -n "${AWS_S3_BACKUP_BUCKET:-}" ]; then
    log "正在上传备份到S3..."
    aws s3 cp "$COMPRESSED_FILE" "s3://$AWS_S3_BACKUP_BUCKET/database/" \
        --storage-class STANDARD_IA \
        --metadata "backup-date=$DATE,database=$DB_NAME" 2>&1 | tee -a "$LOG_FILE"
    
    if [ $? -eq 0 ]; then
        log "S3上传成功"
    else
        log "警告: S3上传失败，本地备份仍然可用"
    fi
fi

# 发送通知（如果配置了）
if [ -n "${BACKUP_NOTIFICATION_WEBHOOK:-}" ]; then
    curl -X POST "$BACKUP_NOTIFICATION_WEBHOOK" \
        -H "Content-Type: application/json" \
        -d "{
            \"text\": \"ZK-Agent数据库备份完成\",
            \"attachments\": [{
                \"color\": \"good\",
                \"fields\": [
                    {\"title\": \"数据库\", \"value\": \"$DB_NAME\", \"short\": true},
                    {\"title\": \"时间\", \"value\": \"$DATE\", \"short\": true},
                    {\"title\": \"大小\", \"value\": \"$FILE_SIZE\", \"short\": true},
                    {\"title\": \"状态\", \"value\": \"成功\", \"short\": true}
                ]
            }]
        }" 2>/dev/null || true
fi

log "数据库备份完成!"
log "备份文件: $COMPRESSED_FILE"
log "日志文件: $LOG_FILE"

# 清理环境变量
unset PGPASSWORD

exit 0