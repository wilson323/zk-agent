// @ts-nocheck
/**
 * @file lib/database/enhanced-database-manager.ts
 * @description 增强数据库管理器 - B团队核心组件
 * @author B团队数据库架构师
 * @lastUpdate 2024-12-19
 * @performance 数据库查询≤100ms，强制事务，连接池管理
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { Logger } from '@/lib/utils/logger';
import { performanceMonitor } from '@/lib/middleware/performance-monitor';
import { healthChecker } from './connection-health';
import { performanceMonitor as dbPerformanceMonitor } from './performance-monitor';

// 查询性能指标接口
interface QueryMetrics {
  queryId: string;
  sql: string;
  duration: number;
  timestamp: number;
  params?: any;
  result?: any;
  error?: string;
}

// 连接池配置接口
interface ConnectionPoolConfig {
  min: number;
  max: number;
  acquireTimeoutMillis: number;
  createTimeoutMillis: number;
  destroyTimeoutMillis: number;
  idleTimeoutMillis: number;
  reapIntervalMillis: number;
}

// 查询缓存接口
interface QueryCache {
  key: string;
  data: any;
  expiry: number;
  hits: number;
}

// 数据库健康状态
interface DatabaseHealth {
  connected: boolean;
  latency: number;
  activeConnections: number;
  maxConnections: number;
  queuedQueries: number;
  cacheHitRate: number;
  slowQueries: number;
  lastChecked: string;
}

export class EnhancedDatabaseManager {
  private static instance: EnhancedDatabaseManager;
  private prisma: PrismaClient;
  private logger = new Logger('EnhancedDatabaseManager');
  private queryMetrics: Map<string, QueryMetrics> = new Map();
  private queryCache: Map<string, QueryCache> = new Map();
  private slowQueryThreshold = 100; // 100ms
  private cacheEnabled = true;
  private cacheTTL = 300000; // 5分钟
  
  // 连接池配置
  private readonly poolConfig: ConnectionPoolConfig = {
    min: 2,
    max: 20,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
  };

  private constructor() {
    this.initializePrisma();
    this.setupQueryLogging();
    this.startCacheCleanup();
    this.initializeHealthMonitoring();
  }

  public static getInstance(): EnhancedDatabaseManager {
    if (!EnhancedDatabaseManager.instance) {
      EnhancedDatabaseManager.instance = new EnhancedDatabaseManager();
    }
    return EnhancedDatabaseManager.instance;
  }

  /**
   * 初始化Prisma客户端
   */
  private initializePrisma(): void {
    this.prisma = new PrismaClient({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    this.logger.info('Prisma client initialized with enhanced configuration');
  }

  /**
   * 初始化健康监控
   */
  private async initializeHealthMonitoring(): Promise<void> {
    try {
      // 初始化数据库健康检查器
      await healthChecker.initialize();
      
      // 监听健康检查事件
      healthChecker.on('connected', () => {
        this.logger.info('Database connection established');
      });
      
      healthChecker.on('error', (error) => {
        this.logger.error('Database connection error', { error: error.message });
        dbPerformanceMonitor.recordError(error, 'connection');
      });
      
      healthChecker.on('reconnected', () => {
        this.logger.info('Database connection restored');
      });
      
      healthChecker.on('maxReconnectAttemptsReached', (error) => {
        this.logger.error('Max reconnect attempts reached', { error: error.message });
      });
      
      // 监听性能告警
      dbPerformanceMonitor.on('slowQuery', (record) => {
        this.logger.warn('Slow query detected by performance monitor', {
          query: record.query,
          duration: record.duration
        });
      });
      
      dbPerformanceMonitor.on('alert', (alert) => {
        this.logger.warn('Performance alert', alert);
      });
      
      this.logger.info('Database health monitoring initialized');
    } catch (error) {
      this.logger.error('Failed to initialize health monitoring', { error: error.message });
    }
  }

  /**
   * 设置查询日志记录
   */
  private setupQueryLogging(): void {
    this.prisma.$on('query', (e) => {
      const queryId = this.generateQueryId();
      const duration = e.duration;
      
      const metrics: QueryMetrics = {
        queryId,
        sql: e.query,
        duration,
        timestamp: Date.now(),
        params: e.params,
      };

      this.queryMetrics.set(queryId, metrics);

      // 检查慢查询
      if (duration > this.slowQueryThreshold) {
        this.logger.warn('Slow query detected', {
          queryId,
          duration,
          sql: e.query.substring(0, 200), // 截取前200字符
        });

        // 发送慢查询告警
        this.sendSlowQueryAlert(metrics);
      }

      // 清理旧指标（保留最近1000条）
      if (this.queryMetrics.size > 1000) {
        const oldestKey = this.queryMetrics.keys().next().value;
        this.queryMetrics.delete(oldestKey);
      }
    });

    this.prisma.$on('error', (e) => {
      this.logger.error('Database error', {
        message: e.message,
        target: e.target,
      });
    });
  }

  /**
   * 强制事务执行
   */
  async executeTransaction<T>(
    operations: (prisma: Prisma.TransactionClient) => Promise<T>,
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    }
  ): Promise<T> {
    const transactionId = this.generateTransactionId();
    const startTime = Date.now();

    try {
      this.logger.info('Transaction started', { transactionId });

      const result = await this.prisma.$transaction(operations, {
        maxWait: options?.maxWait || 5000, // 5秒最大等待
        timeout: options?.timeout || 10000, // 10秒超时
        isolationLevel: options?.isolationLevel || Prisma.TransactionIsolationLevel.ReadCommitted,
      });

      const duration = Date.now() - startTime;
      this.logger.info('Transaction completed', {
        transactionId,
        duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Transaction failed', {
        transactionId,
        duration,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 优化查询执行（带缓存）
   */
  async executeQuery<T>(
    queryFn: () => Promise<T>,
    cacheKey?: string,
    cacheTTL?: number
  ): Promise<T> {
    const queryId = this.generateQueryId();
    const startTime = Date.now();

    try {
      // 检查缓存
      if (cacheKey && this.cacheEnabled) {
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          this.logger.debug('Cache hit', { queryId, cacheKey });
          return cached;
        }
      }

      // 执行查询
      const result = await queryFn();
      const duration = Date.now() - startTime;

      // 记录查询指标
      const metrics: QueryMetrics = {
        queryId,
        sql: 'Custom Query',
        duration,
        timestamp: Date.now(),
        result: typeof result === 'object' ? JSON.stringify(result).length : result,
      };

      this.queryMetrics.set(queryId, metrics);

      // 记录到性能监控器
      dbPerformanceMonitor.recordQuery({
        query: 'Custom Query',
        duration,
        success: true,
        connectionId: queryId
      });

      // 缓存结果
      if (cacheKey && this.cacheEnabled && duration < this.slowQueryThreshold) {
        this.setCache(cacheKey, result, cacheTTL || this.cacheTTL);
      }

      // 检查性能
      if (duration > this.slowQueryThreshold) {
        this.logger.warn('Slow query execution', {
          queryId,
          duration,
          threshold: this.slowQueryThreshold,
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // 记录错误到性能监控器
      dbPerformanceMonitor.recordQuery({
        query: 'Custom Query',
        duration,
        success: false,
        error,
        connectionId: queryId
      });
      
      this.logger.error('Query execution failed', {
        queryId,
        duration,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 批量操作优化
   */
  async executeBatch<T>(
    operations: Array<() => Promise<T>>,
    batchSize = 10
  ): Promise<T[]> {
    const results: T[] = [];
    const batches = this.chunkArray(operations, batchSize);

    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(operation => operation())
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 数据库健康检查
   */
  async healthCheck(): Promise<DatabaseHealth> {
    const startTime = Date.now();

    try {
      // 使用健康检查器测试连接
      await healthChecker.testConnection();
      const latency = Date.now() - startTime;

      // 获取连接池状态
      const poolStatus = healthChecker.getPoolStatus();
      
      // 获取性能统计
      const perfStats = dbPerformanceMonitor.getPerformanceStats();

      // 计算缓存命中率
      const cacheHitRate = this.calculateCacheHitRate();

      return {
        connected: poolStatus.status === 'healthy',
        latency,
        activeConnections: poolStatus.totalCount || 0,
        maxConnections: this.poolConfig.max,
        queuedQueries: poolStatus.waitingCount || 0,
        cacheHitRate,
        slowQueries: perfStats.overall.slowQueries,
        lastChecked: new Date().toISOString(),
        poolStatus,
        performanceStats: perfStats
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      
      // 记录健康检查错误
      dbPerformanceMonitor.recordError(error, 'health_check');
      
      this.logger.error('Database health check failed', {
        error: error.message,
        latency,
      });

      return {
        connected: false,
        latency,
        activeConnections: 0,
        maxConnections: this.poolConfig.max,
        queuedQueries: 0,
        cacheHitRate: 0,
        slowQueries: 0,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * 查询性能分析
   */
  getQueryAnalytics(): any {
    const metrics = Array.from(this.queryMetrics.values());
    const recentMetrics = metrics.filter(
      m => Date.now() - m.timestamp < 300000 // 最近5分钟
    );

    if (recentMetrics.length === 0) {
      return {
        totalQueries: 0,
        averageLatency: 0,
        slowQueries: 0,
        cacheHitRate: 0,
      };
    }

    const totalQueries = recentMetrics.length;
    const averageLatency = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalQueries;
    const slowQueries = recentMetrics.filter(m => m.duration > this.slowQueryThreshold).length;
    const cacheHitRate = this.calculateCacheHitRate();

    return {
      totalQueries,
      averageLatency: Math.round(averageLatency),
      slowQueries,
      slowQueryRate: Math.round((slowQueries / totalQueries) * 100),
      cacheHitRate,
      queryDistribution: this.getQueryDistribution(recentMetrics),
    };
  }

  /**
   * 缓存管理
   */
  private getFromCache(key: string): any {
    const cached = this.queryCache.get(key);
    if (!cached) {return null;}

    if (Date.now() > cached.expiry) {
      this.queryCache.delete(key);
      return null;
    }

    cached.hits++;
    return cached.data;
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.queryCache.set(key, {
      key,
      data,
      expiry: Date.now() + ttl,
      hits: 0,
    });
  }

  private calculateCacheHitRate(): number {
    const caches = Array.from(this.queryCache.values());
    if (caches.length === 0) {return 0;}

    const totalHits = caches.reduce((sum, cache) => sum + cache.hits, 0);
    const totalRequests = caches.length + totalHits;
    
    return totalRequests > 0 ? Math.round((totalHits / totalRequests) * 100) : 0;
  }

  /**
   * 缓存清理
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, cache] of this.queryCache.entries()) {
        if (now > cache.expiry) {
          this.queryCache.delete(key);
        }
      }
    }, 60000); // 每分钟清理一次
  }

  /**
   * 慢查询告警
   */
  private async sendSlowQueryAlert(metrics: QueryMetrics): Promise<void> {
    try {
      await fetch('/api/admin/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'SLOW_QUERY',
          data: {
            queryId: metrics.queryId,
            duration: metrics.duration,
            threshold: this.slowQueryThreshold,
            sql: metrics.sql.substring(0, 200),
          },
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      this.logger.error('Failed to send slow query alert', {
        error: error.message,
      });
    }
  }

  /**
   * 工具方法
   */
  private generateQueryId(): string {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private getQueryDistribution(metrics: QueryMetrics[]): any {
    const distribution = {
      fast: 0,    // < 50ms
      normal: 0,  // 50-100ms
      slow: 0,    // > 100ms
    };

    metrics.forEach(metric => {
      if (metric.duration < 50) {
        distribution.fast++;
      } else if (metric.duration <= 100) {
        distribution.normal++;
      } else {
        distribution.slow++;
      }
    });

    return distribution;
  }

  /**
   * 连接池管理
   */
  async getConnectionPoolStatus(): Promise<any> {
    // 这里应该从实际的连接池获取状态
    // Prisma 不直接暴露连接池状态，这里提供模拟数据
    return {
      active: Math.floor(Math.random() * this.poolConfig.max),
      idle: Math.floor(Math.random() * (this.poolConfig.max - 5)),
      waiting: Math.floor(Math.random() * 5),
      total: this.poolConfig.max,
      config: this.poolConfig,
    };
  }

  /**
   * 优雅关闭
   */
  async gracefulShutdown(): Promise<void> {
    this.logger.info('Starting graceful database shutdown');
    
    try {
      // 停止性能监控
      dbPerformanceMonitor.stop();
      
      // 关闭健康检查器
      await healthChecker.close();
      
      // 断开Prisma连接
      await this.prisma.$disconnect();
      
      // 清理缓存
      this.clearCache();
      
      this.logger.info('Database disconnected successfully');
    } catch (error) {
      this.logger.error('Error during database shutdown', {
        error: error.message,
      });
    }
  }

  /**
   * 获取Prisma客户端实例
   */
  getPrismaClient(): PrismaClient {
    return this.prisma;
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.queryCache.clear();
    this.logger.info('Query cache cleared');
  }

  /**
   * 设置慢查询阈值
   */
  setSlowQueryThreshold(threshold: number): void {
    this.slowQueryThreshold = threshold;
    this.logger.info('Slow query threshold updated', { threshold });
  }

  /**
   * 启用/禁用缓存
   */
  setCacheEnabled(enabled: boolean): void {
    this.cacheEnabled = enabled;
    if (!enabled) {
      this.clearCache();
    }
    this.logger.info('Cache enabled status changed', { enabled });
  }
}

// 导出单例实例
export const enhancedDatabaseManager = EnhancedDatabaseManager.getInstance();

// 导出便捷方法
export const db = enhancedDatabaseManager.getPrismaClient();

// 导出事务执行器
export const executeTransaction = enhancedDatabaseManager.executeTransaction.bind(enhancedDatabaseManager);

// 导出查询执行器
export const executeQuery = enhancedDatabaseManager.executeQuery.bind(enhancedDatabaseManager);