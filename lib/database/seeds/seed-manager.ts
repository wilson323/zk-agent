/**
 * @file Database Seed Manager
 * @description 数据库种子管理器 - 提供测试数据和初始数据管理
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

import { DatabaseConnectionManager } from '../core/connection-manager';
import { QueryBuilder } from '../core/query-builder';
import { BaseModel } from '../core/model';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// 种子接口定义
export interface Seed {
  id: string;
  name: string;
  description?: string;
  priority: number;
  environment: string[];
  dependencies?: string[];
  run: (queryBuilder: QueryBuilder, models?: Map<string, typeof BaseModel>) => Promise<void>;
  rollback?: (queryBuilder: QueryBuilder, models?: Map<string, typeof BaseModel>) => Promise<void>;
  validate?: (queryBuilder: QueryBuilder) => Promise<boolean>;
  createdAt: Date;
  checksum?: string;
}

export interface SeedRecord {
  id: string;
  name: string;
  environment: string;
  executedAt: Date;
  checksum: string;
  executionTime: number;
  status: 'success' | 'failed' | 'skipped';
  errorMessage?: string;
}

export interface SeedConfig {
  seedsPath: string;
  tableName: string;
  environment: string;
  batchSize: number;
  validateChecksums: boolean;
  allowRollback: boolean;
  skipExisting: boolean;
  parallelExecution: boolean;
  maxRetries: number;
}

export interface SeedStatus {
  pending: Seed[];
  executed: SeedRecord[];
  failed: SeedRecord[];
  skipped: Seed[];
  environment: string;
}

export interface SeedRunOptions {
  environment?: string;
  force?: boolean;
  dryRun?: boolean;
  seedIds?: string[];
  skipValidation?: boolean;
  parallel?: boolean;
}

/**
 * 数据库种子管理器
 */
export class SeedManager {
  private static instance: SeedManager;
  private connectionManager: DatabaseConnectionManager;
  private config: SeedConfig;
  private seeds: Map<string, Seed> = new Map();
  private models: Map<string, typeof BaseModel> = new Map();
  private isInitialized = false;

  constructor(config: Partial<SeedConfig> = {}) {
    this.connectionManager = DatabaseConnectionManager.getInstance();
    this.config = {
      seedsPath: path.join(process.cwd(), 'seeds'),
      tableName: 'seeds',
      environment: process.env.NODE_ENV || 'development',
      batchSize: 100,
      validateChecksums: true,
      allowRollback: true,
      skipExisting: true,
      parallelExecution: false,
      maxRetries: 3,
      ...config
    };
  }

  static getInstance(config?: Partial<SeedConfig>): SeedManager {
    if (!SeedManager.instance) {
      SeedManager.instance = new SeedManager(config);
    }
    return SeedManager.instance;
  }

  /**
   * 初始化种子系统
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.createSeedsTable();
      await this.loadSeeds();
      await this.loadModels();
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize seed manager: ${error}`);
    }
  }

  /**
   * 创建种子记录表
   */
  private async createSeedsTable(): Promise<void> {
    const connection = await this.connectionManager.getConnection('default');
    const queryBuilder = new QueryBuilder(connection);

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${this.config.tableName} (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        environment VARCHAR(50) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        checksum VARCHAR(64) NOT NULL,
        execution_time INT DEFAULT 0,
        status ENUM('success', 'failed', 'skipped') DEFAULT 'success',
        error_message TEXT,
        INDEX idx_environment (environment),
        INDEX idx_status (status),
        INDEX idx_executed_at (executed_at)
      )
    `;

    await queryBuilder.raw(createTableSQL);
  }

  /**
   * 加载种子文件
   */
  private async loadSeeds(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.seedsPath);
      const seedFiles = files
        .filter(file => file.endsWith('.ts') || file.endsWith('.js'))
        .sort();

      for (const file of seedFiles) {
        const filePath = path.join(this.config.seedsPath, file);
        const seed = await this.loadSeedFile(filePath);
        if (seed) {
          this.seeds.set(seed.id, seed);
        }
      }
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        throw error;
      }
      // 种子目录不存在，创建它
      await fs.mkdir(this.config.seedsPath, { recursive: true });
    }
  }

  /**
   * 加载单个种子文件
   */
  private async loadSeedFile(filePath: string): Promise<Seed | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const checksum = crypto.createHash('md5').update(content).digest('hex');
      
      // 动态导入种子文件
      const seedModule = await import(filePath);
      const seed = seedModule.default || seedModule;

      if (!seed.id || !seed.run) {
        logger.warn(`Invalid seed file: ${filePath}`);
        return null;
      }

      return {
        ...seed,
        checksum,
        priority: seed.priority || 0,
        environment: seed.environment || ['development'],
        createdAt: seed.createdAt || new Date()
      };
    } catch (error) {
      logger.error(`Failed to load seed file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * 加载模型
   */
  private async loadModels(): Promise<void> {
    // TODO: 自动发现和加载模型
    // 这里可以扫描模型目录并动态加载所有模型类
  }

  /**
   * 注册模型
   */
  registerModel(name: string, model: typeof BaseModel): void {
    this.models.set(name, model);
  }

  /**
   * 创建新种子
   */
  async createSeed(
    name: string,
    description?: string,
    template?: 'basic' | 'users' | 'products' | 'settings'
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const id = `${timestamp}_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const fileName = `${id}.ts`;
    const filePath = path.join(this.config.seedsPath, fileName);

    const seedContent = this.generateSeedTemplate(id, name, description, template);
    
    await fs.mkdir(this.config.seedsPath, { recursive: true });
    await fs.writeFile(filePath, seedContent);

    return filePath;
  }

  /**
   * 生成种子模板
   */
  private generateSeedTemplate(
    id: string,
    name: string,
    description?: string,
    template?: string
  ): string {
    const templateContent = this.getTemplateContent(template);
    
    return `/**
 * Seed: ${name}
 * ${description ? `Description: ${description}` : ''}
 * Created: ${new Date().toISOString()}
 */

import { QueryBuilder } from '../core/query-builder';
import { BaseModel } from '../core/model';
import { Seed } from '../seeds/seed-manager';
import { logger } from '@/lib/utils/logger';

const seed: Seed = {
  id: '${id}',
  name: '${name}',
  description: '${description || ''}',
  priority: 0,
  environment: ['development', 'testing'],
  createdAt: new Date('${new Date().toISOString()}'),

  async run(queryBuilder: QueryBuilder, models?: Map<string, typeof BaseModel>): Promise<void> {
    ${templateContent.run}
  },

  async rollback(queryBuilder: QueryBuilder, models?: Map<string, typeof BaseModel>): Promise<void> {
    ${templateContent.rollback}
  },

  async validate(queryBuilder: QueryBuilder): Promise<boolean> {
    ${templateContent.validate}
  }
};

export default seed;
`;
  }

  /**
   * 获取模板内容
   */
  private getTemplateContent(template?: string): { run: string; rollback: string; validate: string } {
    switch (template) {
      case 'users':
        return {
          run: `// 创建用户数据
    const users = [
      {
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'hashed_password',
        role: 'admin',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashed_password',
        role: 'user',
        created_at: new Date(),
        updated_at: new Date()
      }
    ];
    
    for (const user of users) {
      await queryBuilder.table('users').insert(user);
    }`,
          rollback: `// 删除种子用户
    await queryBuilder.table('users')
      .whereIn('email', ['admin@example.com', 'test@example.com'])
      .delete();`,
          validate: `// 验证用户是否存在
    const count = await queryBuilder.table('users')
      .whereIn('email', ['admin@example.com', 'test@example.com'])
      .count('id as total');
    return count[0].total >= 2;`
        };
      case 'products':
        return {
          run: `// 创建产品数据
    const products = [
      {
        name: 'Sample Product 1',
        description: 'This is a sample product',
        price: 99.99,
        category: 'electronics',
        stock: 100,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Sample Product 2',
        description: 'Another sample product',
        price: 149.99,
        category: 'electronics',
        stock: 50,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];
    
    for (const product of products) {
      await queryBuilder.table('products').insert(product);
    }`,
          rollback: `// 删除种子产品
    await queryBuilder.table('products')
      .where('name', 'like', 'Sample Product%')
      .delete();`,
          validate: `// 验证产品是否存在
    const count = await queryBuilder.table('products')
      .where('name', 'like', 'Sample Product%')
      .count('id as total');
    return count[0].total >= 2;`
        };
      case 'settings':
        return {
          run: `// 创建系统设置
    const settings = [
      {
        key: 'app_name',
        value: 'ZK-Agent',
        type: 'string',
        description: 'Application name',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        key: 'maintenance_mode',
        value: 'false',
        type: 'boolean',
        description: 'Maintenance mode flag',
        created_at: new Date(),
        updated_at: new Date()
      }
    ];
    
    for (const setting of settings) {
      await queryBuilder.table('settings').insert(setting);
    }`,
          rollback: `// 删除种子设置
    await queryBuilder.table('settings')
      .whereIn('key', ['app_name', 'maintenance_mode'])
      .delete();`,
          validate: `// 验证设置是否存在
    const count = await queryBuilder.table('settings')
      .whereIn('key', ['app_name', 'maintenance_mode'])
      .count('id as total');
    return count[0].total >= 2;`
        };
      default:
        return {
          run: `// 实现种子数据逻辑
    // await queryBuilder.table('your_table').insert({
    //   // 你的数据...
    // });`,
          rollback: `// 实现回滚逻辑
    // await queryBuilder.table('your_table').where('condition', 'value').delete();`,
          validate: `// 实现验证逻辑
    // const count = await queryBuilder.table('your_table').count('id as total');
    // return count[0].total > 0;
    return true;`
        };
    }
  }

  /**
   * 运行种子
   */
  async runSeeds(options: SeedRunOptions = {}): Promise<SeedRecord[]> {
    await this.ensureInitialized();
    
    const environment = options.environment || this.config.environment;
    const status = await this.getStatus(environment);
    
    let seedsToRun = status.pending;
    
    // 过滤指定的种子
    if (options.seedIds && options.seedIds.length > 0) {
      seedsToRun = seedsToRun.filter(seed => options.seedIds!.includes(seed.id));
    }
    
    // 按优先级排序
    seedsToRun.sort((a, b) => a.priority - b.priority);
    
    if (seedsToRun.length === 0) {
      return [];
    }

    if (options.dryRun) {

      return [];
    }

    const executed: SeedRecord[] = [];
    
    if (options.parallel && this.config.parallelExecution) {
      // 并行执行
      const results = await Promise.allSettled(
        seedsToRun.map(seed => this.executeSeed(seed, environment, options))
      );
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          executed.push(result.value);
        } else {
          logger.error(`Seed failed: ${seedsToRun[index].name}`, result.reason);
        }
      });
    } else {
      // 串行执行
      for (const seed of seedsToRun) {
        try {
          const record = await this.executeSeed(seed, environment, options);
          executed.push(record);
        } catch (error) {
          logger.error(`Seed failed: ${seed.name}`, error);
          if (!options.force) {
            break;
          }
        }
      }
    }

    return executed;
  }

  /**
   * 执行单个种子
   */
  private async executeSeed(
    seed: Seed,
    environment: string,
    options: SeedRunOptions
  ): Promise<SeedRecord> {
    const startTime = Date.now();
    let status: 'success' | 'failed' | 'skipped' = 'success';
    let errorMessage: string | undefined;

    try {
      // 检查是否已执行
      if (this.config.skipExisting && !options.force) {
        const existing = await this.getSeedRecord(seed.id, environment);
        if (existing && existing.status === 'success') {
          status = 'skipped';

        }
      }

      if (status !== 'skipped') {
        // 验证依赖
        if (seed.dependencies && seed.dependencies.length > 0) {
          await this.validateDependencies(seed.dependencies, environment);
        }

        // 执行验证（如果存在且未跳过验证）
        if (seed.validate && !options.skipValidation) {
          const connection = await this.connectionManager.getConnection('default');
          const queryBuilder = new QueryBuilder(connection);
          const isValid = await seed.validate(queryBuilder);
          
          if (isValid && this.config.skipExisting && !options.force) {
            status = 'skipped';

          }
        }

        // 执行种子
        if (status !== 'skipped') {
          const connection = await this.connectionManager.getConnection('default');
          const queryBuilder = new QueryBuilder(connection);
          
          await seed.run(queryBuilder, this.models);

        }
      }
    } catch (error) {
      status = 'failed';
      errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Seed failed: ${seed.name}`, error);
    }

    const executionTime = Date.now() - startTime;
    
    const record: SeedRecord = {
      id: seed.id,
      name: seed.name,
      environment,
      executedAt: new Date(),
      checksum: seed.checksum || '',
      executionTime,
      status,
      errorMessage
    };

    await this.recordSeed(record);
    return record;
  }

  /**
   * 回滚种子
   */
  async rollbackSeeds(seedIds?: string[], environment?: string): Promise<SeedRecord[]> {
    if (!this.config.allowRollback) {
      throw new Error('Seed rollback is disabled');
    }

    await this.ensureInitialized();
    
    const env = environment || this.config.environment;
    const executed = await this.getExecutedSeeds(env);
    
    let seedsToRollback = executed;
    if (seedIds && seedIds.length > 0) {
      seedsToRollback = executed.filter(record => seedIds.includes(record.id));
    }

    const rolledBack: SeedRecord[] = [];

    // 按执行时间倒序回滚
    seedsToRollback.sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime());

    for (const record of seedsToRollback) {
      try {
        const seed = this.seeds.get(record.id);
        if (!seed || !seed.rollback) {
          logger.warn(`Rollback not available for seed: ${record.id}`);
          continue;
        }

        const connection = await this.connectionManager.getConnection('default');
        const queryBuilder = new QueryBuilder(connection);
        
        await seed.rollback(queryBuilder, this.models);
        await this.removeSeedRecord(record.id, env);
        
        rolledBack.push(record);

      } catch (error) {
        logger.error(`Rollback failed: ${record.name}`, error);
      }
    }

    return rolledBack;
  }

  /**
   * 获取种子状态
   */
  async getStatus(environment?: string): Promise<SeedStatus> {
    await this.ensureInitialized();
    
    const env = environment || this.config.environment;
    const executed = await this.getExecutedSeeds(env);
    const failed = executed.filter(r => r.status === 'failed');
    const executedIds = new Set(executed.filter(r => r.status === 'success').map(r => r.id));
    
    const allSeeds = Array.from(this.seeds.values());
    const pending = allSeeds.filter(seed => 
      seed.environment.includes(env) && !executedIds.has(seed.id)
    );
    const skipped = allSeeds.filter(seed => !seed.environment.includes(env));

    return {
      pending,
      executed,
      failed,
      skipped,
      environment: env
    };
  }

  /**
   * 获取已执行的种子
   */
  private async getExecutedSeeds(environment: string): Promise<SeedRecord[]> {
    const connection = await this.connectionManager.getConnection('default');
    const queryBuilder = new QueryBuilder(connection);
    
    const results = await queryBuilder
      .table(this.config.tableName)
      .where('environment', environment)
      .orderBy('executed_at', 'desc')
      .get();
    
    return results.map(row => ({
      id: row.id,
      name: row.name,
      environment: row.environment,
      executedAt: new Date(row.executed_at),
      checksum: row.checksum,
      executionTime: row.execution_time,
      status: row.status,
      errorMessage: row.error_message
    }));
  }

  /**
   * 获取种子记录
   */
  private async getSeedRecord(id: string, environment: string): Promise<SeedRecord | null> {
    const connection = await this.connectionManager.getConnection('default');
    const queryBuilder = new QueryBuilder(connection);
    
    const results = await queryBuilder
      .table(this.config.tableName)
      .where('id', id)
      .where('environment', environment)
      .first();
    
    if (!results) return null;
    
    return {
      id: results.id,
      name: results.name,
      environment: results.environment,
      executedAt: new Date(results.executed_at),
      checksum: results.checksum,
      executionTime: results.execution_time,
      status: results.status,
      errorMessage: results.error_message
    };
  }

  /**
   * 记录种子执行
   */
  private async recordSeed(record: SeedRecord): Promise<void> {
    const connection = await this.connectionManager.getConnection('default');
    const queryBuilder = new QueryBuilder(connection);
    
    // 先删除已存在的记录
    await queryBuilder
      .table(this.config.tableName)
      .where('id', record.id)
      .where('environment', record.environment)
      .delete();
    
    // 插入新记录
    await queryBuilder.table(this.config.tableName).insert({
      id: record.id,
      name: record.name,
      environment: record.environment,
      executed_at: record.executedAt,
      checksum: record.checksum,
      execution_time: record.executionTime,
      status: record.status,
      error_message: record.errorMessage
    });
  }

  /**
   * 删除种子记录
   */
  private async removeSeedRecord(id: string, environment: string): Promise<void> {
    const connection = await this.connectionManager.getConnection('default');
    const queryBuilder = new QueryBuilder(connection);
    
    await queryBuilder
      .table(this.config.tableName)
      .where('id', id)
      .where('environment', environment)
      .delete();
  }

  /**
   * 验证依赖
   */
  private async validateDependencies(dependencies: string[], environment: string): Promise<void> {
    for (const depId of dependencies) {
      const record = await this.getSeedRecord(depId, environment);
      if (!record || record.status !== 'success') {
        throw new Error(`Dependency not satisfied: ${depId}`);
      }
    }
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
   * 验证种子完整性
   */
  async validateIntegrity(environment?: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const env = environment || this.config.environment;
    
    try {
      const executed = await this.getExecutedSeeds(env);
      
      for (const record of executed) {
        const seed = this.seeds.get(record.id);
        
        if (!seed) {
          errors.push(`Seed file not found: ${record.id}`);
          continue;
        }
        
        if (this.config.validateChecksums && seed.checksum !== record.checksum) {
          errors.push(`Checksum mismatch for seed: ${record.id}`);
        }
      }
      
      return { valid: errors.length === 0, errors };
    } catch (error) {
      errors.push(`Validation failed: ${error}`);
      return { valid: false, errors };
    }
  }

  /**
   * 重置种子系统
   */
  async reset(environment?: string, confirm = false): Promise<void> {
    if (!confirm) {
      throw new Error('Reset requires explicit confirmation');
    }
    
    const connection = await this.connectionManager.getConnection('default');
    const queryBuilder = new QueryBuilder(connection);
    
    if (environment) {
      await queryBuilder
        .table(this.config.tableName)
        .where('environment', environment)
        .delete();

    } else {
      await queryBuilder.raw(`DROP TABLE IF EXISTS ${this.config.tableName}`);
      await this.createSeedsTable();

    }
  }
}

// 导出单例实例
export const seedManager = SeedManager.getInstance();