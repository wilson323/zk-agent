/**
 * @file Database Migration Manager
 * @description 数据库迁移管理器 - 提供版本控制和结构管理
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

import { DatabaseConnectionManager } from '../core/connection-manager';
import { QueryBuilder } from '../core/query-builder';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// 迁移接口定义
export interface Migration {
  id: string;
  name: string;
  version: string;
  description?: string;
  up: (queryBuilder: QueryBuilder) => Promise<void>;
  down: (queryBuilder: QueryBuilder) => Promise<void>;
  dependencies?: string[];
  createdAt: Date;
  checksum?: string;
}

export interface MigrationRecord {
  id: string;
  name: string;
  version: string;
  batch: number;
  executedAt: Date;
  checksum: string;
  rollbackData?: any;
}

export interface MigrationConfig {
  migrationsPath: string;
  tableName: string;
  lockTimeout: number;
  batchSize: number;
  autoRun: boolean;
  validateChecksums: boolean;
  backupBeforeMigration: boolean;
}

export interface MigrationStatus {
  pending: Migration[];
  executed: MigrationRecord[];
  failed: MigrationRecord[];
  currentBatch: number;
  isLocked: boolean;
}

export interface RollbackOptions {
  steps?: number;
  toBatch?: number;
  toVersion?: string;
  dryRun?: boolean;
  force?: boolean;
}

/**
 * 数据库迁移管理器
 */
export class MigrationManager {
  private static instance: MigrationManager;
  private connectionManager: DatabaseConnectionManager;
  private config: MigrationConfig;
  private migrations: Map<string, Migration> = new Map();
  private isInitialized = false;

  constructor(config: Partial<MigrationConfig> = {}) {
    this.connectionManager = DatabaseConnectionManager.getInstance();
    this.config = {
      migrationsPath: path.join(process.cwd(), 'migrations'),
      tableName: 'migrations',
      lockTimeout: 300000, // 5 minutes
      batchSize: 50,
      autoRun: false,
      validateChecksums: true,
      backupBeforeMigration: false,
      ...config,
    };
  }

  static getInstance(config?: Partial<MigrationConfig>): MigrationManager {
    if (!MigrationManager.instance) {
      MigrationManager.instance = new MigrationManager(config);
    }
    return MigrationManager.instance;
  }

  /**
   * 初始化迁移系统
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.createMigrationsTable();
      await this.loadMigrations();
      this.isInitialized = true;

      if (this.config.autoRun) {
        await this.runPendingMigrations();
      }
    } catch (error) {
      throw new Error(`Failed to initialize migration manager: ${error}`);
    }
  }

  /**
   * 创建迁移记录表
   */
  private async createMigrationsTable(): Promise<void> {
    const connection = await this.connectionManager.getConnection('default');
    const queryBuilder = new QueryBuilder(connection);

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${this.config.tableName} (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        version VARCHAR(50) NOT NULL,
        batch INT NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        checksum VARCHAR(64) NOT NULL,
        rollback_data TEXT,
        INDEX idx_batch (batch),
        INDEX idx_version (version),
        INDEX idx_executed_at (executed_at)
      )
    `;

    await queryBuilder.raw(createTableSQL);
  }

  /**
   * 加载迁移文件
   */
  private async loadMigrations(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.migrationsPath);
      const migrationFiles = files
        .filter(file => file.endsWith('.ts') || file.endsWith('.js'))
        .sort();

      for (const file of migrationFiles) {
        const filePath = path.join(this.config.migrationsPath, file);
        const migration = await this.loadMigrationFile(filePath);
        if (migration) {
          this.migrations.set(migration.id, migration);
        }
      }
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        throw error;
      }
      // 迁移目录不存在，创建它
      await fs.mkdir(this.config.migrationsPath, { recursive: true });
    }
  }

  /**
   * 加载单个迁移文件
   */
  private async loadMigrationFile(filePath: string): Promise<Migration | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const checksum = crypto.createHash('md5').update(content).digest('hex');

      // 动态导入迁移文件
      const migrationModule = await import(filePath);
      const migration = migrationModule.default || migrationModule;

      if (!migration.id || !migration.up || !migration.down) {
        logger.warn(`Invalid migration file: ${filePath}`);
        return null;
      }

      return {
        ...migration,
        checksum,
        createdAt: migration.createdAt || new Date(),
      };
    } catch (error) {
      logger.error(`Failed to load migration file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * 创建新迁移
   */
  async createMigration(
    name: string,
    description?: string,
    template?: 'table' | 'column' | 'index' | 'data'
  ): Promise<string> {
    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, '')
      .slice(0, 14);
    const id = `${timestamp}_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const fileName = `${id}.ts`;
    const filePath = path.join(this.config.migrationsPath, fileName);

    const migrationContent = this.generateMigrationTemplate(id, name, description, template);

    await fs.mkdir(this.config.migrationsPath, { recursive: true });
    await fs.writeFile(filePath, migrationContent);

    return filePath;
  }

  /**
   * 生成迁移模板
   */
  private generateMigrationTemplate(
    id: string,
    name: string,
    description?: string,
    template?: string
  ): string {
    const templateContent = this.getTemplateContent(template);

    return `/**
 * Migration: ${name}
 * ${description ? `Description: ${description}` : ''}
 * Created: ${new Date().toISOString()}
 */

import { QueryBuilder } from '../core/query-builder';
import { Migration } from '../migrations/migration-manager';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();

const logger = getLogger();

const migration: Migration = {
  id: '${id}',
  name: '${name}',
  version: '1.0.0',
  description: '${description || ''}',
  createdAt: new Date('${new Date().toISOString()}'),

  async up(queryBuilder: QueryBuilder): Promise<void> {
    ${templateContent.up}
  },

  async down(queryBuilder: QueryBuilder): Promise<void> {
    ${templateContent.down}
  }
};

export default migration;
`;
  }

  /**
   * 获取模板内容
   */
  private getTemplateContent(template?: string): { up: string; down: string } {
    switch (template) {
      case 'table':
        return {
          up: `// 创建表
    await queryBuilder.raw(\`
      CREATE TABLE example_table (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    \`);`,
          down: `// 删除表
    await queryBuilder.raw('DROP TABLE IF EXISTS example_table');`,
        };
      case 'column':
        return {
          up: `// 添加列
    await queryBuilder.raw('ALTER TABLE example_table ADD COLUMN new_column VARCHAR(255)');`,
          down: `// 删除列
    await queryBuilder.raw('ALTER TABLE example_table DROP COLUMN new_column');`,
        };
      case 'index':
        return {
          up: `// 创建索引
    await queryBuilder.raw('CREATE INDEX idx_example ON example_table (column_name)');`,
          down: `// 删除索引
    await queryBuilder.raw('DROP INDEX idx_example ON example_table');`,
        };
      case 'data':
        return {
          up: `// 插入数据
    await queryBuilder.table('example_table').insert({
      name: 'example',
      // 其他字段...
    });`,
          down: `// 删除数据
    await queryBuilder.table('example_table').where('name', 'example').delete();`,
        };
      default:
        return {
          up: `// 实现迁移逻辑
    // await queryBuilder.raw('YOUR SQL HERE');`,
          down: `// 实现回滚逻辑
    // await queryBuilder.raw('YOUR ROLLBACK SQL HERE');`,
        };
    }
  }

  /**
   * 运行待执行的迁移
   */
  async runPendingMigrations(): Promise<MigrationRecord[]> {
    await this.ensureInitialized();

    const status = await this.getStatus();
    if (status.pending.length === 0) {
      return [];
    }

    if (status.isLocked) {
      throw new Error('Migration is locked by another process');
    }

    await this.acquireLock();

    try {
      const executed: MigrationRecord[] = [];
      const currentBatch = status.currentBatch + 1;

      for (const migration of status.pending) {
        try {
          if (this.config.backupBeforeMigration) {
            await this.createBackup(migration.id);
          }

          const connection = await this.connectionManager.getConnection('default');
          const queryBuilder = new QueryBuilder(connection);

          await migration.up(queryBuilder);

          const record: MigrationRecord = {
            id: migration.id,
            name: migration.name,
            version: migration.version,
            batch: currentBatch,
            executedAt: new Date(),
            checksum: migration.checksum || '',
          };

          await this.recordMigration(record);
          executed.push(record);
        } catch (error) {
          logger.error(`Migration failed: ${migration.name}`, error);
          throw error;
        }
      }

      return executed;
    } finally {
      await this.releaseLock();
    }
  }

  /**
   * 回滚迁移
   */
  async rollback(options: RollbackOptions = {}): Promise<MigrationRecord[]> {
    await this.ensureInitialized();

    const status = await this.getStatus();
    if (status.executed.length === 0) {
      return [];
    }

    if (status.isLocked && !options.force) {
      throw new Error('Migration is locked by another process');
    }

    const toRollback = this.getMigrationsToRollback(status.executed, options);

    if (options.dryRun) {
      return toRollback;
    }

    await this.acquireLock();

    try {
      const rolledBack: MigrationRecord[] = [];

      for (const record of toRollback.reverse()) {
        try {
          const migration = this.migrations.get(record.id);
          if (!migration) {
            logger.warn(`Migration not found: ${record.id}`);
            continue;
          }

          const connection = await this.connectionManager.getConnection('default');
          const queryBuilder = new QueryBuilder(connection);

          await migration.down(queryBuilder);
          await this.removeMigrationRecord(record.id);

          rolledBack.push(record);
        } catch (error) {
          logger.error(`Rollback failed: ${record.name}`, error);
          throw error;
        }
      }

      return rolledBack;
    } finally {
      await this.releaseLock();
    }
  }

  /**
   * 获取迁移状态
   */
  async getStatus(): Promise<MigrationStatus> {
    await this.ensureInitialized();

    const executed = await this.getExecutedMigrations();
    const executedIds = new Set(executed.map(m => m.id));
    const pending = Array.from(this.migrations.values())
      .filter(m => !executedIds.has(m.id))
      .sort((a, b) => a.id.localeCompare(b.id));

    const currentBatch = executed.length > 0 ? Math.max(...executed.map(m => m.batch)) : 0;

    const isLocked = await this.isLocked();

    return {
      pending,
      executed,
      failed: [], // TODO: 实现失败记录跟踪
      currentBatch,
      isLocked,
    };
  }

  /**
   * 获取已执行的迁移
   */
  private async getExecutedMigrations(): Promise<MigrationRecord[]> {
    const connection = await this.connectionManager.getConnection('default');
    const queryBuilder = new QueryBuilder(connection);

    const results = await queryBuilder
      .table(this.config.tableName)
      .orderBy('executed_at', 'asc')
      .get();

    return results.map(row => ({
      id: row.id,
      name: row.name,
      version: row.version,
      batch: row.batch,
      executedAt: new Date(row.executed_at),
      checksum: row.checksum,
      rollbackData: row.rollback_data ? JSON.parse(row.rollback_data) : undefined,
    }));
  }

  /**
   * 记录迁移执行
   */
  private async recordMigration(record: MigrationRecord): Promise<void> {
    const connection = await this.connectionManager.getConnection('default');
    const queryBuilder = new QueryBuilder(connection);

    await queryBuilder.table(this.config.tableName).insert({
      id: record.id,
      name: record.name,
      version: record.version,
      batch: record.batch,
      executed_at: record.executedAt,
      checksum: record.checksum,
      rollback_data: record.rollbackData ? JSON.stringify(record.rollbackData) : null,
    });
  }

  /**
   * 删除迁移记录
   */
  private async removeMigrationRecord(id: string): Promise<void> {
    const connection = await this.connectionManager.getConnection('default');
    const queryBuilder = new QueryBuilder(connection);

    await queryBuilder.table(this.config.tableName).where('id', id).delete();
  }

  /**
   * 获取需要回滚的迁移
   */
  private getMigrationsToRollback(
    executed: MigrationRecord[],
    options: RollbackOptions
  ): MigrationRecord[] {
    const sorted = executed.sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime());

    if (options.steps) {
      return sorted.slice(0, options.steps);
    }

    if (options.toBatch) {
      return sorted.filter(m => m.batch > options.toBatch!);
    }

    if (options.toVersion) {
      const index = sorted.findIndex(m => m.version === options.toVersion);
      return index >= 0 ? sorted.slice(0, index) : [];
    }

    // 默认回滚最后一个批次
    const lastBatch = Math.max(...sorted.map(m => m.batch));
    return sorted.filter(m => m.batch === lastBatch);
  }

  /**
   * 获取锁
   */
  private async acquireLock(): Promise<void> {
    // TODO: 实现分布式锁机制
  }

  /**
   * 释放锁
   */
  private async releaseLock(): Promise<void> {
    // TODO: 实现分布式锁机制
  }

  /**
   * 检查是否被锁定
   */
  private async isLocked(): Promise<boolean> {
    // TODO: 实现分布式锁检查
    return false;
  }

  /**
   * 创建备份
   */
  private async createBackup(migrationId: string): Promise<void> {
    // TODO: 实现数据库备份
  }

  /**
   * 确保已初始化
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * 验证迁移完整性
   */
  async validateIntegrity(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      const executed = await this.getExecutedMigrations();

      for (const record of executed) {
        const migration = this.migrations.get(record.id);

        if (!migration) {
          errors.push(`Migration file not found: ${record.id}`);
          continue;
        }

        if (this.config.validateChecksums && migration.checksum !== record.checksum) {
          errors.push(`Checksum mismatch for migration: ${record.id}`);
        }
      }

      return { valid: errors.length === 0, errors };
    } catch (error) {
      errors.push(`Validation failed: ${error}`);
      return { valid: false, errors };
    }
  }

  /**
   * 重置迁移系统
   */
  async reset(confirm = false): Promise<void> {
    if (!confirm) {
      throw new Error('Reset requires explicit confirmation');
    }

    const connection = await this.connectionManager.getConnection('default');
    const queryBuilder = new QueryBuilder(connection);

    await queryBuilder.raw(`DROP TABLE IF EXISTS ${this.config.tableName}`);
    await this.createMigrationsTable();
  }
}

// 导出单例实例
export const migrationManager = MigrationManager.getInstance();
