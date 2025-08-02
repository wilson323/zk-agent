/**
 * @file Database Configuration Provider
 * @description 数据库配置提供者实现
 */

import {
  ConfigProvider,
  AppConfig,
  ConfigUpdateEvent,
  ConfigValidationResult,
} from '../core/types';
import { validatePartialConfig } from '../core/validation';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();

// 配置表结构接口
interface ConfigRecord {
  id: string;
  key: string;
  value: string;
  environment: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  description?: string;
}

export class DatabaseConfigProvider implements ConfigProvider {
  private watchers: ((event: ConfigUpdateEvent) => void)[] = [];
  private logger: Logger;
  private tableName: string;
  private environment: string;
  private pollInterval: NodeJS.Timeout | null = null;
  private lastVersion: number = 0;
  private db: any; // 数据库连接实例

  constructor(
    options: {
      db?: any;
      tableName?: string;
      environment?: string;
      pollIntervalMs?: number;
    } = {}
  ) {
    this.db = options.db;
    this.tableName = options.tableName || 'app_config';
    this.environment = options.environment || process.env.NODE_ENV || 'development';
    // Logger initialized as class property
  }

  /**
   * 设置数据库连接
   */
  setDatabase(db: any): void {
    this.db = db;
  }

  /**
   * 从数据库加载配置
   */
  async load(): Promise<Partial<AppConfig>> {
    if (!this.db) {
      this.logger.warn('Database connection not available');
      return {};
    }

    try {
      // 确保配置表存在
      await this.ensureTableExists();

      // 查询当前环境的所有配置
      const records = await this.queryConfigs();

      if (records.length === 0) {
        this.logger.debug('No config records found in database');
        return {};
      }

      // 转换为配置对象
      const config = this.recordsToConfig(records);

      // 更新版本号
      this.lastVersion = Math.max(...records.map(r => r.version));

      this.logger.debug(`Loaded config from database`, {
        recordsCount: records.length,
        version: this.lastVersion,
        environment: this.environment,
      });

      return config;
    } catch (error) {
      this.logger.error('Failed to load config from database', { error });
      throw error;
    }
  }

  /**
   * 保存配置到数据库
   */
  async save(config: Partial<AppConfig>): Promise<void> {
    if (!this.db) {
      throw new Error('Database connection not available');
    }

    try {
      // 确保配置表存在
      await this.ensureTableExists();

      // 将配置对象转换为记录
      const records = this.configToRecords(config);

      // 开始事务
      await this.db.transaction(async (trx: any) => {
        // 保存每个配置项
        for (const record of records) {
          await this.upsertConfigRecord(trx, record);
        }
      });

      this.logger.debug(`Saved config to database`, {
        recordsCount: records.length,
        environment: this.environment,
      });

      // 触发更新事件
      const event: ConfigUpdateEvent = {
        key: 'root',
        oldValue: null,
        newValue: config,
        timestamp: new Date(),
        source: 'database',
      };

      this.notifyWatchers(event);
    } catch (error) {
      this.logger.error('Failed to save config to database', { error });
      throw error;
    }
  }

  /**
   * 监听数据库配置变化
   */
  watch(callback: (event: ConfigUpdateEvent) => void): void {
    this.watchers.push(callback);

    // 如果还没有轮询器，启动一个
    if (!this.pollInterval) {
      this.startPolling();
    }
  }

  /**
   * 验证配置
   */
  validate(config: Partial<AppConfig>): ConfigValidationResult {
    return validatePartialConfig(config);
  }

  /**
   * 停止监听
   */
  async dispose(): Promise<void> {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.watchers = [];
  }

  /**
   * 获取配置历史记录
   */
  async getConfigHistory(key?: string, limit: number = 10): Promise<ConfigRecord[]> {
    if (!this.db) {
      throw new Error('Database connection not available');
    }

    try {
      let query = this.db(this.tableName)
        .where('environment', this.environment)
        .orderBy('updatedAt', 'desc')
        .limit(limit);

      if (key) {
        query = query.where('key', key);
      }

      return await query;
    } catch (error) {
      this.logger.error('Failed to get config history', { error });
      throw error;
    }
  }

  /**
   * 回滚到指定版本
   */
  async rollbackToVersion(version: number): Promise<void> {
    if (!this.db) {
      throw new Error('Database connection not available');
    }

    try {
      // 获取指定版本的配置
      const records = await this.db(this.tableName)
        .where('environment', this.environment)
        .where('version', version);

      if (records.length === 0) {
        throw new Error(`No config found for version ${version}`);
      }

      // 转换为配置对象
      const config = this.recordsToConfig(records);

      // 保存为新版本
      await this.save(config);

      this.logger.info(`Rolled back config to version ${version}`);
    } catch (error) {
      this.logger.error('Failed to rollback config', { error, version });
      throw error;
    }
  }

  /**
   * 确保配置表存在
   */
  private async ensureTableExists(): Promise<void> {
    try {
      const exists = await this.db.schema.hasTable(this.tableName);

      if (!exists) {
        await this.db.schema.createTable(this.tableName, (table: any) => {
          table.string('id').primary();
          table.string('key').notNullable();
          table.text('value').notNullable();
          table.string('environment').notNullable();
          table.integer('version').notNullable().defaultTo(1);
          table.timestamp('createdAt').defaultTo(this.db.fn.now());
          table.timestamp('updatedAt').defaultTo(this.db.fn.now());
          table.string('createdBy').nullable();
          table.text('description').nullable();

          // 索引
          table.index(['environment', 'key']);
          table.index(['environment', 'version']);
          table.unique(['environment', 'key', 'version']);
        });

        this.logger.info(`Created config table: ${this.tableName}`);
      }
    } catch (error) {
      this.logger.error('Failed to ensure table exists', { error });
      throw error;
    }
  }

  /**
   * 查询配置记录
   */
  private async queryConfigs(): Promise<ConfigRecord[]> {
    // 获取每个key的最新版本
    const latestVersions = await this.db(this.tableName)
      .select('key')
      .max('version as maxVersion')
      .where('environment', this.environment)
      .groupBy('key');

    if (latestVersions.length === 0) {
      return [];
    }

    // 构建查询条件
    const conditions = latestVersions.map(item => ({
      key: item.key,
      version: item.maxVersion,
    }));

    // 查询最新配置
    const records = [];
    for (const condition of conditions) {
      const record = await this.db(this.tableName)
        .where('environment', this.environment)
        .where('key', condition.key)
        .where('version', condition.version)
        .first();

      if (record) {
        records.push(record);
      }
    }

    return records;
  }

  /**
   * 插入或更新配置记录
   */
  private async upsertConfigRecord(trx: any, record: Partial<ConfigRecord>): Promise<void> {
    // 检查是否已存在
    const existing = await trx(this.tableName)
      .where('environment', this.environment)
      .where('key', record.key)
      .orderBy('version', 'desc')
      .first();

    const newVersion = existing ? existing.version + 1 : 1;

    const newRecord = {
      id: `${this.environment}_${record.key}_${newVersion}`,
      key: record.key,
      value: record.value,
      environment: this.environment,
      version: newVersion,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: record.createdBy || 'system',
      description: record.description,
    };

    await trx(this.tableName).insert(newRecord);
  }

  /**
   * 将数据库记录转换为配置对象
   */
  private recordsToConfig(records: ConfigRecord[]): Partial<AppConfig> {
    const config: any = {};

    for (const record of records) {
      try {
        const value = JSON.parse(record.value);
        this.setNestedValue(config, record.key, value);
      } catch (error) {
        this.logger.warn(`Failed to parse config value for key: ${record.key}`, { error });
        this.setNestedValue(config, record.key, record.value);
      }
    }

    return config;
  }

  /**
   * 将配置对象转换为数据库记录
   */
  private configToRecords(config: Partial<AppConfig>): Partial<ConfigRecord>[] {
    const flatConfig = this.flattenConfig(config);
    const records: Partial<ConfigRecord>[] = [];

    for (const [key, value] of Object.entries(flatConfig)) {
      records.push({
        key,
        value: JSON.stringify(value),
        environment: this.environment,
      });
    }

    return records;
  }

  /**
   * 设置嵌套对象值
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * 扁平化配置对象
   */
  private flattenConfig(config: any, prefix: string = ''): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(config)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(result, this.flattenConfig(value, newKey));
      } else {
        result[newKey] = value;
      }
    }

    return result;
  }

  /**
   * 启动轮询检查数据库配置变化
   */
  private startPolling(): void {
    const pollIntervalMs = parseInt(process.env.ZK_AGENT_DB_CONFIG_POLL_INTERVAL || '30000', 10);

    this.pollInterval = setInterval(async () => {
      try {
        // 检查是否有新版本
        const maxVersion = await this.db(this.tableName)
          .where('environment', this.environment)
          .max('version as maxVersion')
          .first();

        if (maxVersion && maxVersion.maxVersion > this.lastVersion) {
          this.logger.debug(
            `Detected config changes in database, version: ${maxVersion.maxVersion}`
          );

          const newConfig = await this.load();

          const event: ConfigUpdateEvent = {
            key: 'root',
            oldValue: null,
            newValue: newConfig,
            timestamp: new Date(),
            source: 'database',
          };

          this.notifyWatchers(event);
        }
      } catch (error) {
        this.logger.error('Error during database config polling', { error });
      }
    }, pollIntervalMs);

    this.logger.debug(`Started polling database config every ${pollIntervalMs}ms`);
  }

  /**
   * 通知所有监听器
   */
  private notifyWatchers(event: ConfigUpdateEvent): void {
    this.watchers.forEach(watcher => {
      try {
        watcher(event);
      } catch (error) {
        this.logger.error('Error in config watcher callback', { error });
      }
    });
  }
}
