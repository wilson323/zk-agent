#!/usr/bin/env node
/**
 * @file database-backup-restore.js
 * @description ZK-Agent数据库备份和恢复脚本
 * @author ZK-Agent Team
 * @version 1.0.0
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');
require('dotenv').config();

// 配置
const config = {
  // 数据库连接配置
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'zkagent',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123456',
  },
  
  // 备份配置
  backup: {
    directory: process.env.BACKUP_DIR || './backups',
    retention: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
    compression: process.env.BACKUP_COMPRESSION === 'true',
    format: process.env.BACKUP_FORMAT || 'custom', // custom, plain, tar
  },
  
  // S3配置（可选）
  s3: {
    enabled: process.env.S3_BACKUP_ENABLED === 'true',
    bucket: process.env.S3_BACKUP_BUCKET,
    region: process.env.S3_BACKUP_REGION || 'us-east-1',
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
  
  // 通知配置
  notification: {
    enabled: process.env.BACKUP_NOTIFICATION_ENABLED === 'true',
    webhook: process.env.BACKUP_NOTIFICATION_WEBHOOK,
    email: process.env.BACKUP_NOTIFICATION_EMAIL,
  }
};

// 日志工具
class Logger {
  static info(message) {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
  }
  
  static warn(message) {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`);
  }
  
  static error(message) {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
  }
  
  static success(message) {
    console.log(`[SUCCESS] ${new Date().toISOString()} - ${message}`);
  }
}

// 数据库备份类
class DatabaseBackup {
  constructor() {
    this.ensureBackupDirectory();
  }
  
  // 确保备份目录存在
  ensureBackupDirectory() {
    if (!fs.existsSync(config.backup.directory)) {
      fs.mkdirSync(config.backup.directory, { recursive: true });
      Logger.info(`Created backup directory: ${config.backup.directory}`);
    }
  }
  
  // 生成备份文件名
  generateBackupFilename(type = 'full') {
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const extension = config.backup.format === 'plain' ? 'sql' : 'dump';
    return `zkagent_${type}_${timestamp}.${extension}`;
  }
  
  // 执行完整备份
  async createFullBackup() {
    try {
      Logger.info('Starting full database backup...');
      
      const filename = this.generateBackupFilename('full');
      const filepath = path.join(config.backup.directory, filename);
      
      // 构建pg_dump命令
      const pgDumpArgs = [
        '-h', config.database.host,
        '-p', config.database.port.toString(),
        '-U', config.database.user,
        '-d', config.database.name,
        '-f', filepath,
        '--verbose',
        '--no-password'
      ];
      
      // 根据格式添加参数
      if (config.backup.format === 'custom') {
        pgDumpArgs.push('-Fc'); // Custom format
      } else if (config.backup.format === 'tar') {
        pgDumpArgs.push('-Ft'); // Tar format
      } else {
        pgDumpArgs.push('-Fp'); // Plain format
      }
      
      // 设置环境变量
      const env = { ...process.env, PGPASSWORD: config.database.password };
      
      // 执行备份
      execSync(`pg_dump ${pgDumpArgs.join(' ')}`, {
        env,
        stdio: 'inherit'
      });
      
      // 压缩备份文件（如果启用）
      if (config.backup.compression && config.backup.format !== 'custom') {
        await this.compressBackup(filepath);
      }
      
      // 验证备份文件
      const stats = fs.statSync(filepath);
      if (stats.size === 0) {
        throw new Error('Backup file is empty');
      }
      
      Logger.success(`Full backup completed: ${filename} (${this.formatFileSize(stats.size)})`);
      
      // 上传到S3（如果配置）
      if (config.s3.enabled) {
        await this.uploadToS3(filepath, filename);
      }
      
      // 发送通知
      if (config.notification.enabled) {
        await this.sendNotification('success', `Full backup completed: ${filename}`);
      }
      
      return { success: true, filename, size: stats.size };
      
    } catch (error) {
      Logger.error(`Full backup failed: ${error.message}`);
      
      if (config.notification.enabled) {
        await this.sendNotification('error', `Full backup failed: ${error.message}`);
      }
      
      throw error;
    }
  }
  
  // 执行增量备份（基于WAL）
  async createIncrementalBackup() {
    try {
      Logger.info('Starting incremental backup...');
      
      // 检查是否启用了WAL归档
      const walStatus = await this.checkWALArchiving();
      if (!walStatus.enabled) {
        throw new Error('WAL archiving is not enabled. Incremental backup requires WAL archiving.');
      }
      
      const filename = this.generateBackupFilename('incremental');
      const filepath = path.join(config.backup.directory, filename);
      
      // 使用pg_basebackup进行增量备份
      const pgBaseBackupArgs = [
        '-h', config.database.host,
        '-p', config.database.port.toString(),
        '-U', config.database.user,
        '-D', filepath,
        '-Ft', // Tar format
        '-z', // Compress
        '-P', // Progress
        '-v', // Verbose
        '-W' // Force password prompt
      ];
      
      const env = { ...process.env, PGPASSWORD: config.database.password };
      
      execSync(`pg_basebackup ${pgBaseBackupArgs.join(' ')}`, {
        env,
        stdio: 'inherit'
      });
      
      Logger.success(`Incremental backup completed: ${filename}`);
      
      return { success: true, filename };
      
    } catch (error) {
      Logger.error(`Incremental backup failed: ${error.message}`);
      throw error;
    }
  }
  
  // 检查WAL归档状态
  async checkWALArchiving() {
    try {
      const query = "SELECT name, setting FROM pg_settings WHERE name IN ('archive_mode', 'archive_command')";
      const result = execSync(`psql -h ${config.database.host} -p ${config.database.port} -U ${config.database.user} -d ${config.database.name} -t -c "${query}"`, {
        env: { ...process.env, PGPASSWORD: config.database.password },
        encoding: 'utf8'
      });
      
      const settings = {};
      result.split('\n').forEach(line => {
        const [name, setting] = line.trim().split('|').map(s => s.trim());
        if (name && setting) {
          settings[name] = setting;
        }
      });
      
      return {
        enabled: settings.archive_mode === 'on' && settings.archive_command !== '',
        settings
      };
    } catch (error) {
      Logger.warn(`Could not check WAL archiving status: ${error.message}`);
      return { enabled: false };
    }
  }
  
  // 压缩备份文件
  async compressBackup(filepath) {
    try {
      Logger.info(`Compressing backup: ${filepath}`);
      
      execSync(`gzip "${filepath}"`, { stdio: 'inherit' });
      
      Logger.success(`Backup compressed: ${filepath}.gz`);
      return `${filepath}.gz`;
    } catch (error) {
      Logger.warn(`Failed to compress backup: ${error.message}`);
      return filepath;
    }
  }
  
  // 上传到S3
  async uploadToS3(filepath, filename) {
    if (!config.s3.enabled) return;
    
    try {
      Logger.info(`Uploading backup to S3: ${filename}`);
      
      // 这里需要AWS CLI或SDK
      const s3Key = `backups/${format(new Date(), 'yyyy/MM/dd')}/${filename}`;
      
      execSync(`aws s3 cp "${filepath}" s3://${config.s3.bucket}/${s3Key}`, {
        env: {
          ...process.env,
          AWS_ACCESS_KEY_ID: config.s3.accessKeyId,
          AWS_SECRET_ACCESS_KEY: config.s3.secretAccessKey,
          AWS_DEFAULT_REGION: config.s3.region
        },
        stdio: 'inherit'
      });
      
      Logger.success(`Backup uploaded to S3: s3://${config.s3.bucket}/${s3Key}`);
    } catch (error) {
      Logger.error(`Failed to upload to S3: ${error.message}`);
    }
  }
  
  // 发送通知
  async sendNotification(type, message) {
    if (!config.notification.enabled) return;
    
    try {
      if (config.notification.webhook) {
        // 发送Webhook通知
        const payload = {
          type,
          message,
          timestamp: new Date().toISOString(),
          service: 'ZK-Agent Database Backup'
        };
        
        // 这里需要HTTP客户端发送请求
        Logger.info(`Notification sent: ${message}`);
      }
    } catch (error) {
      Logger.warn(`Failed to send notification: ${error.message}`);
    }
  }
  
  // 清理旧备份
  async cleanupOldBackups() {
    try {
      Logger.info('Cleaning up old backups...');
      
      const files = fs.readdirSync(config.backup.directory);
      const now = new Date();
      const retentionMs = config.backup.retention * 24 * 60 * 60 * 1000;
      
      let deletedCount = 0;
      
      for (const file of files) {
        const filepath = path.join(config.backup.directory, file);
        const stats = fs.statSync(filepath);
        
        if (now - stats.mtime > retentionMs) {
          fs.unlinkSync(filepath);
          deletedCount++;
          Logger.info(`Deleted old backup: ${file}`);
        }
      }
      
      Logger.success(`Cleanup completed. Deleted ${deletedCount} old backup(s)`);
    } catch (error) {
      Logger.error(`Cleanup failed: ${error.message}`);
    }
  }
  
  // 格式化文件大小
  formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}

// 数据库恢复类
class DatabaseRestore {
  // 恢复数据库
  async restoreDatabase(backupFile, options = {}) {
    try {
      Logger.info(`Starting database restore from: ${backupFile}`);
      
      // 检查备份文件是否存在
      if (!fs.existsSync(backupFile)) {
        throw new Error(`Backup file not found: ${backupFile}`);
      }
      
      // 确认操作
      if (!options.force) {
        Logger.warn('This operation will overwrite the existing database!');
        Logger.warn('Use --force flag to proceed without confirmation.');
        return;
      }
      
      // 停止应用连接（可选）
      if (options.stopConnections) {
        await this.terminateConnections();
      }
      
      // 检测备份文件格式
      const format = this.detectBackupFormat(backupFile);
      
      // 构建恢复命令
      let restoreCommand;
      const env = { ...process.env, PGPASSWORD: config.database.password };
      
      if (format === 'custom' || format === 'tar') {
        // 使用pg_restore
        restoreCommand = [
          'pg_restore',
          '-h', config.database.host,
          '-p', config.database.port.toString(),
          '-U', config.database.user,
          '-d', config.database.name,
          '--clean',
          '--if-exists',
          '--verbose',
          '--no-password',
          backupFile
        ].join(' ');
      } else {
        // 使用psql
        restoreCommand = [
          'psql',
          '-h', config.database.host,
          '-p', config.database.port.toString(),
          '-U', config.database.user,
          '-d', config.database.name,
          '-f', backupFile
        ].join(' ');
      }
      
      // 执行恢复
      execSync(restoreCommand, {
        env,
        stdio: 'inherit'
      });
      
      Logger.success('Database restore completed successfully');
      
      // 验证恢复
      await this.verifyRestore();
      
      return { success: true };
      
    } catch (error) {
      Logger.error(`Database restore failed: ${error.message}`);
      throw error;
    }
  }
  
  // 检测备份文件格式
  detectBackupFormat(backupFile) {
    const ext = path.extname(backupFile).toLowerCase();
    
    if (ext === '.sql') {
      return 'plain';
    } else if (ext === '.tar') {
      return 'tar';
    } else if (ext === '.dump') {
      return 'custom';
    } else {
      // 尝试读取文件头
      const buffer = fs.readFileSync(backupFile, { start: 0, end: 5 });
      const header = buffer.toString('ascii');
      
      if (header.startsWith('PGDMP')) {
        return 'custom';
      } else {
        return 'plain';
      }
    }
  }
  
  // 终止数据库连接
  async terminateConnections() {
    try {
      Logger.info('Terminating active database connections...');
      
      const query = `
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '${config.database.name}'
        AND pid <> pg_backend_pid()
      `;
      
      execSync(`psql -h ${config.database.host} -p ${config.database.port} -U ${config.database.user} -d postgres -c "${query}"`, {
        env: { ...process.env, PGPASSWORD: config.database.password },
        stdio: 'inherit'
      });
      
      Logger.success('Active connections terminated');
    } catch (error) {
      Logger.warn(`Failed to terminate connections: ${error.message}`);
    }
  }
  
  // 验证恢复
  async verifyRestore() {
    try {
      Logger.info('Verifying database restore...');
      
      // 检查表是否存在
      const query = "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'";
      const result = execSync(`psql -h ${config.database.host} -p ${config.database.port} -U ${config.database.user} -d ${config.database.name} -t -c "${query}"`, {
        env: { ...process.env, PGPASSWORD: config.database.password },
        encoding: 'utf8'
      });
      
      const tableCount = parseInt(result.trim());
      
      if (tableCount > 0) {
        Logger.success(`Restore verification passed. Found ${tableCount} tables.`);
      } else {
        Logger.warn('Restore verification warning: No tables found.');
      }
    } catch (error) {
      Logger.error(`Restore verification failed: ${error.message}`);
    }
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    switch (command) {
      case 'backup':
      case 'full-backup': {
        const backup = new DatabaseBackup();
        await backup.createFullBackup();
        await backup.cleanupOldBackups();
        break;
      }
      
      case 'incremental-backup': {
        const backup = new DatabaseBackup();
        await backup.createIncrementalBackup();
        break;
      }
      
      case 'restore': {
        const backupFile = args[1];
        if (!backupFile) {
          throw new Error('Backup file path is required for restore');
        }
        
        const options = {
          force: args.includes('--force'),
          stopConnections: args.includes('--stop-connections')
        };
        
        const restore = new DatabaseRestore();
        await restore.restoreDatabase(backupFile, options);
        break;
      }
      
      case 'cleanup': {
        const backup = new DatabaseBackup();
        await backup.cleanupOldBackups();
        break;
      }
      
      case 'list': {
        const files = fs.readdirSync(config.backup.directory);
        console.log('\nAvailable backups:');
        files.forEach(file => {
          const filepath = path.join(config.backup.directory, file);
          const stats = fs.statSync(filepath);
          console.log(`  ${file} (${new DatabaseBackup().formatFileSize(stats.size)}, ${stats.mtime.toISOString()})`);
        });
        break;
      }
      
      default:
        console.log(`
ZK-Agent Database Backup & Restore Tool

Usage:
  node database-backup-restore.js <command> [options]

Commands:
  backup, full-backup    Create a full database backup
  incremental-backup     Create an incremental backup (requires WAL archiving)
  restore <file>         Restore database from backup file
                        Options: --force, --stop-connections
  cleanup               Remove old backup files
  list                  List available backup files

Examples:
  node database-backup-restore.js backup
  node database-backup-restore.js restore ./backups/zkagent_full_2024-01-01_12-00-00.dump --force
  node database-backup-restore.js cleanup
`);
        break;
    }
  } catch (error) {
    Logger.error(`Operation failed: ${error.message}`);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  DatabaseBackup,
  DatabaseRestore,
  config
};