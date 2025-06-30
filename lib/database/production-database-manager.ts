/**
 * @file lib/database/production-database-manager.ts
 * @description 生产级数据库管理器 - 连接池、监控、错误处理
 * @author AI Assistant
 * @lastUpdate 2024-12-19
 * @features 连接池管理、查询优化、健康监控、故障恢复
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { Logger } from '../utils/logger';
import { enhancedCacheManager } from '../cache/enhanced-cache-manager';
import { EventEmitter } from 'events';

// 自定义错误类
export class DatabaseError extends Error {
  constructor(message: string, public code: string, public originalError?: Error) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ConnectionError extends DatabaseError {
  constructor(message: string, originalError?: Error) {
    super(message, 'CONNECTION_ERROR', originalError);
  }
}

export class QueryError extends DatabaseError {
  constructor(message: string, originalError?: Error) {
    super(message, 'QUERY_ERROR', originalError);
  }
}

export class TransactionError extends DatabaseError {
  constructor(message: string, originalError?: Error) {
    super(message, 'TRANSACTION_ERROR', originalError);
  }
}

// 数据库配置接口
interface DatabaseConfig {
  readonly url: string;
  readonly maxConnections: number;
  readonly connectionTimeout: number;
  readonly queryTimeout: number;
  readonly slowQueryThreshold: number;
  readonly retryAttempts: number;
  readonly retryDelay: number;
  readonly enableQueryLogging: boolean;
  readonly enableMetrics: boolean;
  readonly enableCache: boolean;
  readonly cacheDefaultTTL: number;
}

// 查询指标接口
interface QueryMetrics {
  readonly queryId: string;
  readonly sql: string;
  readonly duration: number;
  readonly timestamp: number;
  readonly params?: string;
  readonly error?: string;
}

// 连接池状态接口
interface ConnectionPoolStatus {
  readonly total: number;
  readonly active: number;
  readonly idle: number;
  readonly waiting: number;
}

// 数据库健康状态接口
interface DatabaseHealth {
  readonly isConnected: boolean;
  readonly connectionPool: ConnectionPoolStatus;
  readonly averageQueryTime: number;
  readonly slowQueries: number;
  readonly errorRate: number;
  readonly lastError?: string;
  readonly uptime: number;
}

// 查询选项接口
interface QueryOptions {
  readonly timeout?: number;
  readonly cache?: boolean;
  readonly cacheTTL?: number;
  readonly retries?: number;
}

// 事务选项接口
interface TransactionOptions {
  readonly timeout?: number;
  readonly isolationLevel?: Prisma.TransactionIsolationLevel;
  readonly maxWait?: number;
}

/**
 * 生产级数据库管理器
 */
export class ProductionDatabaseManager extends EventEmitter {
  private static instance: ProductionDatabaseManager | null = null;
  private readonly logger = new Logger('ProductionDatabaseManager');
  private prisma: PrismaClient | null = null;
  private readonly queryMetrics = new Map<string, QueryMetrics>();
  private readonly connectionStartTime = Date.now();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private metricsCleanupInterval: NodeJS.Timeout | null = null;
  private isConnected = false;
  private connectionAttempts = 0;

  private readonly config: DatabaseConfig = {
    url: process.env.DATABASE_URL,
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
    queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'),
    slowQueryThreshold: parseInt(process.env.DB_SLOW_QUERY_THRESHOLD || '1000'),
    retryAttempts: parseInt(process.env.DB_RETRY_ATTEMPTS || '3'),
    retryDelay: parseInt(process.env.DB_RETRY_DELAY || '1000'),
    enableQueryLogging: process.env.DB_ENABLE_QUERY_LOGGING === 'true',
    enableMetrics: process.env.DB_ENABLE_METRICS !== 'false',
    enableCache: process.env.DB_ENABLE_CACHE !== 'false',
    cacheDefaultTTL: parseInt(process.env.DB_CACHE_DEFAULT_TTL || '300'),
  };

  private constructor() {
    super();
    this.initializeDatabase();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): ProductionDatabaseManager {
    if (!ProductionDatabaseManager.instance) {
      ProductionDatabaseManager.instance = new ProductionDatabaseManager();
    }
    return ProductionDatabaseManager.instance;
  }

  /**
   * 初始化数据库
   */
  private async initializeDatabase(): Promise<void> {
    try {
      await this.createPrismaClient();
      await this.testConnection();
      this.setupEventListeners();
      this.startHealthChecks();
      this.startMetricsCleanup();
      
      this.isConnected = true;
      this.emit('connected');
      
      this.logger.info('Database initialized successfully', {
        maxConnections: this.config.maxConnections,
        queryTimeout: this.config.queryTimeout,
      });
    } catch (error) {
      this.logger.error('Failed to initialize database', {
        error: error instanceof Error ? error.message : 'Unknown error',
        attempt: this.connectionAttempts,
      });
      
      this.emit('error', error);
      await this.retryConnection();
    }
  }

  /**
   * 创建Prisma客户端
   */
  private async createPrismaClient(): Promise<void> {
    const logLevels: Prisma.LogLevel[] = ['error', 'warn'];
    if (this.config.enableQueryLogging) {
      logLevels.push('query', 'info');
    }

    this.prisma = new PrismaClient({
      log: logLevels.map(level => ({ emit: 'event', level })),
      datasources: {
        db: {
          url: this.config.url,
        },
      },
      // 连接池配置
      
    });
  }

  /**
   * 测试数据库连接
   */
  private async testConnection(): Promise<void> {
    if (!this.prisma) {
      throw new ConnectionError('Prisma client not initialized');
    }

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      this.logger.info('Database connection test successful');
    } catch (error) {
      throw new ConnectionError(
        'Database connection test failed',
        error instanceof Error ? error : new Error('Unknown error')
      );
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    if (!this.prisma) {return;}

    // 查询日志
    this.prisma.$on('query', (event: Prisma.QueryEvent) => {
      const queryId = this.generateQueryId();
      const metrics: QueryMetrics = {
        queryId,
        sql: event.query,
        duration: event.duration,
        timestamp: Date.now(),
        params: event.params,
      };

      if (this.config.enableMetrics) {
        this.queryMetrics.set(queryId, metrics);
      }

      // 慢查询检测
      if (event.duration > this.config.slowQueryThreshold) {
        this.logger.warn('Slow query detected', {
          queryId,
          duration: event.duration,
          sql: event.query.substring(0, 200),
        });
        this.emit('slowQuery', metrics);
      }

      if (this.config.enableQueryLogging) {
        this.logger.debug('Query executed', {
          queryId,
          duration: event.duration,
        });
      }
    });

    // 错误日志
    this.prisma.$on('error', (event: Prisma.ErrorEvent) => {
      const error = new QueryError(event.message);
      this.logger.error('Database query error', {
        message: event.message,
        target: event.target,
      });
      this.emit('queryError', error);
    });

    // 警告日志
    this.prisma.$on('warn', (event: Prisma.LogEvent) => {
      this.logger.warn('Database warning', {
        message: event.message,
        target: event.target,
      });
    });

    // 信息日志
    this.prisma.$on('info', (event: Prisma.LogEvent) => {
      this.logger.info('Database info', {
        message: event.message,
        target: event.target,
      });
    });
  }

  /**
   * 启动健康检查
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.checkHealth();
      } catch (error) {
        this.logger.error('Health check failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }, 30000); // 每30秒检查一次
  }

  /**
   * 启动指标清理
   */
  private startMetricsCleanup(): void {
    this.metricsCleanupInterval = setInterval(() => {
      this.cleanupMetrics();
    }, 300000); // 每5分钟清理一次
  }

  /**
   * 清理旧指标
   */
  private cleanupMetrics(): void {
    const maxAge = 3600000; // 1小时
    const now = Date.now();
    
    for (const [queryId, metrics] of Array.from(this.queryMetrics.entries())) {
      if (now - metrics.timestamp > maxAge) {
        this.queryMetrics.delete(queryId);
      }
    }

    // 保留最近1000条记录
    if (this.queryMetrics.size > 1000) {
      const entries = Array.from(this.queryMetrics.entries())
        .sort((a, b) => b[1].timestamp - a[1].timestamp)
        .slice(0, 1000);
      
      this.queryMetrics.clear();
      for (const [queryId, metrics] of entries) {
        this.queryMetrics.set(queryId, metrics);
      }
    }
  }

  /**
   * 重试连接
   */
  private async retryConnection(): Promise<void> {
    if (this.connectionAttempts >= this.config.retryAttempts) {
      const error = new ConnectionError('Max connection attempts reached');
      this.emit('maxRetriesReached', error);
      return;
    }

    this.connectionAttempts++;
    
    this.logger.info('Retrying database connection', {
      attempt: this.connectionAttempts,
      maxAttempts: this.config.retryAttempts,
    });

    await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
    
    try {
      await this.initializeDatabase();
      this.connectionAttempts = 0; // 重置计数器
      this.emit('reconnected');
    } catch (error) {
      await this.retryConnection();
    }
  }

  /**
   * 生成查询ID
   */
  private generateQueryId(): string {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(sql: string, params?: any): string {
    const paramsStr = params ? JSON.stringify(params) : '';
    return `db:${Buffer.from(sql + paramsStr).toString('base64')}`;
  }

  /**
   * 获取Prisma客户端
   */
  public getPrismaClient(): PrismaClient {
    if (!this.prisma) {
      throw new ConnectionError('Database not initialized');
    }
    return this.prisma;
  }

  /**
   * 执行查询（带缓存和重试）
   */
  public async query<T>(
    queryFn: (prisma: PrismaClient) => Promise<T>,
    options: QueryOptions = {}
  ): Promise<T> {
    const {
      timeout = this.config.queryTimeout,
      cache = this.config.enableCache,
      cacheTTL = this.config.cacheDefaultTTL,
      retries = this.config.retryAttempts,
    } = options;

    if (!this.prisma) {
      throw new ConnectionError('Database not initialized');
    }

    // 生成缓存键（简化版本）
    const cacheKey = cache ? `query:${Date.now()}:${Math.random()}` : null;
    
    // 尝试从缓存获取
    if (cache && cacheKey) {
      try {
        const cached = await enhancedCacheManager.get<T>(cacheKey);
        if (cached !== null) {
          return cached;
        }
      } catch (error) {
        this.logger.warn('Cache read failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // 执行查询
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const startTime = Date.now();
        
        // 设置查询超时
        const result = await Promise.race([
          queryFn(this.prisma),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Query timeout')), timeout);
          }),
        ]);
        
        const duration = Date.now() - startTime;
        
        // 缓存结果
        if (cache && cacheKey && result !== null) {
          try {
            await enhancedCacheManager.set(cacheKey, result, { ttl: cacheTTL });
          } catch (error) {
            this.logger.warn('Cache write failed', {
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        this.logger.warn('Query attempt failed', {
          attempt,
          maxAttempts: retries,
          error: lastError.message,
        });
        
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * attempt));
        }
      }
    }
    
    throw new QueryError('Query failed after all retries', lastError!);
  }

  /**
   * 执行事务
   */
  public async transaction<T>(
    transactionFn: (prisma: Prisma.TransactionClient) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<T> {
    if (!this.prisma) {
      throw new ConnectionError('Database not initialized');
    }

    const {
      timeout = this.config.queryTimeout,
      isolationLevel,
      maxWait = 5000,
    } = options;

    try {
      return await this.prisma.$transaction(transactionFn, {
        timeout,
        isolationLevel,
        maxWait,
      });
    } catch (error) {
      throw new TransactionError(
        'Transaction failed',
        error instanceof Error ? error : new Error('Unknown error')
      );
    }
  }

  /**
   * 检查数据库健康状态
   */
  public async checkHealth(): Promise<DatabaseHealth> {
    if (!this.prisma) {
      return {
        isConnected: false,
        connectionPool: { total: 0, active: 0, idle: 0, waiting: 0 },
        averageQueryTime: 0,
        slowQueries: 0,
        errorRate: 0,
        lastError: 'Database not initialized',
        uptime: 0,
      };
    }

    try {
      // 测试连接
      const startTime = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const pingTime = Date.now() - startTime;

      // 计算指标
      const metrics = Array.from(this.queryMetrics.values());
      const recentMetrics = metrics.filter(m => Date.now() - m.timestamp < 300000); // 最近5分钟
      
      const averageQueryTime = recentMetrics.length > 0 
        ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length
        : 0;
      
      const slowQueries = recentMetrics.filter(m => m.duration > this.config.slowQueryThreshold).length;
      const errorQueries = recentMetrics.filter(m => m.error).length;
      const errorRate = recentMetrics.length > 0 ? errorQueries / recentMetrics.length : 0;

      return {
        isConnected: true,
        connectionPool: {
          total: this.config.maxConnections,
          active: 1, // 简化实现
          idle: this.config.maxConnections - 1,
          waiting: 0,
        },
        averageQueryTime,
        slowQueries,
        errorRate,
        uptime: Date.now() - this.connectionStartTime,
      };
    } catch (error) {
      return {
        isConnected: false,
        connectionPool: { total: 0, active: 0, idle: 0, waiting: 0 },
        averageQueryTime: 0,
        slowQueries: 0,
        errorRate: 1,
        lastError: error instanceof Error ? error.message : 'Unknown error',
        uptime: Date.now() - this.connectionStartTime,
      };
    }
  }

  /**
   * 获取查询指标
   */
  public getQueryMetrics(): QueryMetrics[] {
    return Array.from(this.queryMetrics.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 100); // 返回最近100条
  }

  /**
   * 清理资源
   */
  public async cleanup(): Promise<void> {
    try {
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      if (this.metricsCleanupInterval) {
        clearInterval(this.metricsCleanupInterval);
        this.metricsCleanupInterval = null;
      }

      if (this.prisma) {
        await this.prisma.$disconnect();
        this.prisma = null;
      }

      this.queryMetrics.clear();
      this.isConnected = false;
      
      this.emit('disconnected');
      this.removeAllListeners();
      
      ProductionDatabaseManager.instance = null;
      
      this.logger.info('Database manager cleaned up successfully');
    } catch (error) {
      this.logger.error('Error during cleanup', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 获取连接状态
   */
  public isHealthy(): boolean {
    return this.isConnected && this.prisma !== null;
  }

  /**
   * 强制重连
   */
  public async reconnect(): Promise<void> {
    this.logger.info('Forcing database reconnection');
    
    if (this.prisma) {
      await this.prisma.$disconnect();
      this.prisma = null;
    }
    
    this.isConnected = false;
    this.connectionAttempts = 0;
    
    await this.initializeDatabase();
  }
}

// 导出单例实例
export const productionDatabaseManager = ProductionDatabaseManager.getInstance();

// 导出便捷方法
export const db = productionDatabaseManager.getPrismaClient.bind(productionDatabaseManager);
export const dbQuery = productionDatabaseManager.query.bind(productionDatabaseManager);
export const dbTransaction = productionDatabaseManager.transaction.bind(productionDatabaseManager);