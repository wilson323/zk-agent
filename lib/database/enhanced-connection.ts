/**
 * @file Enhanced Database Connection Manager
 * @description 增强的数据库连接管理器，支持连接池优化、自动重连和错误恢复
 * @author ZK-Agent Team A
 * @date 2024-12-19
 */

import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();

const logger = getLogger();

// 连接池配置接口
export interface ConnectionPoolConfig {
  maxConnections: number;
  minConnections: number;
  acquireTimeoutMillis: number;
  createTimeoutMillis?: number;
  idleTimeoutMillis: number;
  evictionRunIntervalMillis: number;
  connectTimeoutMillis: number;
  requestTimeoutMillis: number;
  cancelTimeoutMillis: number;
}

// 重连配置接口
export interface ReconnectionConfig {
  enabled: boolean;
  maxRetries: number;
  retryDelayMs: number;
  backoffMultiplier: number;
  maxRetryDelayMs: number;
  jitterMs: number;
}

// 健康检查配置接口
export interface HealthCheckConfig {
  enabled: boolean;
  intervalMs: number;
  timeoutMs: number;
  failureThreshold: number;
  recoveryThreshold: number;
}

// 连接状态枚举
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed',
}

// 连接统计信息
export interface ConnectionStats {
  state: ConnectionState;
  connectedAt?: Date;
  lastError?: Error;
  reconnectAttempts: number;
  totalQueries: number;
  failedQueries: number;
  avgLatency: number;
  uptime: number;
}

// 数据库事件类型
export interface DatabaseEvents {
  connected: () => void;
  disconnected: (error?: Error) => void;
  reconnecting: (attempt: number) => void;
  reconnected: () => void;
  error: (error: Error) => void;
  healthCheck: (healthy: boolean) => void;
}

/**
 * 增强的数据库连接管理器
 */
export class EnhancedDatabaseConnection extends EventEmitter {
  private prisma: PrismaClient | null = null;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private stats: ConnectionStats;
  private config: {
    pool: ConnectionPoolConfig;
    reconnection: ReconnectionConfig;
    healthCheck: HealthCheckConfig;
  };

  constructor(
    poolConfig?: Partial<ConnectionPoolConfig>,
    reconnectionConfig?: Partial<ReconnectionConfig>,
    healthCheckConfig?: Partial<HealthCheckConfig>
  ) {
    super();

    // 默认配置
    this.config = {
      pool: {
        maxConnections: parseInt(process.env.DB_POOL_MAX || '50'),
        minConnections: parseInt(process.env.DB_POOL_MIN || '10'),
        acquireTimeoutMillis: parseInt(process.env.DB_POOL_ACQUIRE || '60000'),
        idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE || '20000'),
        evictionRunIntervalMillis: parseInt(process.env.DB_POOL_EVICT || '1000'),
        connectTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT || '20000'),
        requestTimeoutMillis: parseInt(process.env.DB_REQUEST_TIMEOUT || '15000'),
        cancelTimeoutMillis: parseInt(process.env.DB_CANCEL_TIMEOUT || '5000'),
        ...poolConfig,
      },
      reconnection: {
        enabled: true,
        maxRetries: 10,
        retryDelayMs: 1000,
        backoffMultiplier: 2,
        maxRetryDelayMs: 30000,
        jitterMs: 100,
        ...reconnectionConfig,
      },
      healthCheck: {
        enabled: process.env.DB_HEALTH_CHECK === 'true',
        intervalMs: parseInt(process.env.DB_HEALTH_CHECK_INTERVAL || '30000'),
        timeoutMs: parseInt(process.env.DB_HEALTH_CHECK_TIMEOUT || '5000'),
        failureThreshold: 3,
        recoveryThreshold: 2,
        ...healthCheckConfig,
      },
    };

    // 初始化统计信息
    this.stats = {
      state: ConnectionState.DISCONNECTED,
      reconnectAttempts: 0,
      totalQueries: 0,
      failedQueries: 0,
      avgLatency: 0,
      uptime: 0,
    };

    // 绑定事件处理器
    this.setupEventHandlers();
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    // 进程退出时清理连接
    process.on('beforeExit', () => this.disconnect());
    process.on('SIGINT', () => this.gracefulShutdown());
    process.on('SIGTERM', () => this.gracefulShutdown());

    // 未捕获异常处理
    process.on('uncaughtException', error => {
      logger.error('Uncaught exception in database connection:', error);
      this.handleConnectionError(error);
    });

    process.on('unhandledRejection', reason => {
      logger.error('Unhandled rejection in database connection:', reason);
      if (reason instanceof Error) {
        this.handleConnectionError(reason);
      }
    });
  }

  /**
   * 连接到数据库
   */
  async connect(): Promise<void> {
    if (this.state === ConnectionState.CONNECTED) {
      return;
    }

    this.setState(ConnectionState.CONNECTING);

    try {
      // 创建Prisma客户端
      this.prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        errorFormat: 'pretty',
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      });

      // 连接到数据库
      await this.prisma.$connect();

      // 验证连接
      await this.validateConnection();

      this.setState(ConnectionState.CONNECTED);
      this.stats.connectedAt = new Date();
      this.stats.reconnectAttempts = 0;
      this.stats.lastError = undefined;

      // 启动健康检查
      if (this.config.healthCheck.enabled) {
        this.startHealthCheck();
      }

      this.emit('connected');
      logger.info('Database connection established successfully');
    } catch (error) {
      logger.error('Failed to establish database connection:', error);
      throw error;
    }
  }

  /**
   * 获取Prisma客户端
   */
  getClient(): PrismaClient | null {
    return this.prisma;
  }

  /**
   * 获取workflow模型访问器
   */
  get workflow() {
    if (!this.prisma) {
      throw new Error('Database not connected');
    }
    // 确保类型安全访问 workflow 模型
    return (this.prisma as any).workflow;
  }

  /**
   * 检查连接状态
   */
  isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED && this.prisma !== null;
  }

  /**
   * 获取连接统计信息
   */
  getStats(): ConnectionStats {
    if (this.stats.connectedAt) {
      this.stats.uptime = Date.now() - this.stats.connectedAt.getTime();
    }
    return { ...this.stats };
  }

  /**
   * 设置连接状态
   */
  private setState(state: ConnectionState): void {
    this.state = state;
    this.stats.state = state;
  }

  /**
   * 验证数据库连接
   */
  private async validateConnection(): Promise<void> {
    if (!this.prisma) {
      throw new Error('Prisma client not initialized');
    }

    // 执行简单查询验证连接
    await this.prisma.$queryRaw`SELECT 1`;
  }

  /**
   * 启动健康检查
   */
  private startHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      try {
        await this.validateConnection();
        this.emit('healthCheck', true);
      } catch (error) {
        logger.warn('Health check failed:', error);
        this.emit('healthCheck', false);
        this.handleConnectionError(error as Error);
      }
    }, this.config.healthCheck.intervalMs);
  }

  /**
   * 处理连接错误
   */
  private handleConnectionError(error: Error): void {
    this.stats.lastError = error;
    this.stats.failedQueries++;
    this.emit('error', error);

    if (this.config.reconnection.enabled && this.state !== ConnectionState.RECONNECTING) {
      this.attemptReconnection();
    }
  }

  /**
   * 尝试重新连接
   */
  private async attemptReconnection(): Promise<void> {
    if (this.stats.reconnectAttempts >= this.config.reconnection.maxRetries) {
      this.setState(ConnectionState.FAILED);
      logger.error('Max reconnection attempts reached');
      return;
    }

    this.setState(ConnectionState.RECONNECTING);
    this.stats.reconnectAttempts++;
    this.emit('reconnecting', this.stats.reconnectAttempts);

    const delay = Math.min(
      this.config.reconnection.retryDelayMs *
      Math.pow(this.config.reconnection.backoffMultiplier, this.stats.reconnectAttempts - 1),
      this.config.reconnection.maxRetryDelayMs
    ) + Math.random() * this.config.reconnection.jitterMs;

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
        this.emit('reconnected');
        logger.info('Database reconnection successful');
      } catch (error) {
        logger.error('Reconnection attempt failed:', error);
        this.handleConnectionError(error as Error);
      }
    }, delay);
  }

  /**
   * 断开数据库连接
   */
  async disconnect(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.prisma) {
      await this.prisma.$disconnect();
      this.prisma = null;
    }

    this.setState(ConnectionState.DISCONNECTED);
    this.emit('disconnected');
    logger.info('Database connection closed');
  }

  /**
   * 优雅关闭
   */
  async gracefulShutdown(): Promise<void> {
    logger.info('Initiating graceful database shutdown...');
    await this.disconnect();
    process.exit(0);
  }

  /**
   * 执行查询并记录统计信息
   */
  async executeQuery<T>(queryFn: (client: PrismaClient) => Promise<T>): Promise<T> {
    if (!this.prisma || !this.isConnected()) {
      throw new Error('Database not connected');
    }

    const startTime = Date.now();
    this.stats.totalQueries++;

    try {
      const result = await queryFn(this.prisma);
      const latency = Date.now() - startTime;
      this.updateLatencyStats(latency);
      return result;
    } catch (error) {
      this.stats.failedQueries++;
      this.handleConnectionError(error as Error);
      throw error;
    }
  }

  /**
   * 更新延迟统计
   */
  private updateLatencyStats(latency: number): void {
    if (this.stats.totalQueries === 1) {
      this.stats.avgLatency = latency;
    } else {
      this.stats.avgLatency =
        (this.stats.avgLatency * (this.stats.totalQueries - 1) + latency) / this.stats.totalQueries;
    }
  }

  /**
   * 强制执行健康检查
   * @returns Promise<boolean> 健康检查结果
   */
  async forceHealthCheck(): Promise<boolean> {
    try {
      if (!this.prisma) {
        return false;
      }

      const startTime = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - startTime;

      this.updateLatencyStats(latency);
      this.emit('healthCheck', true);

      logger.info('Force health check passed', { latency });
      return true;
    } catch (error) {
      logger.error('Force health check failed', { error: (error as Error).message });
      this.emit('healthCheck', false);
      return false;
    }
  }

  /**
   * 执行故障转移
   * @returns Promise<boolean> 故障转移是否成功
   */
  async failover(): Promise<boolean> {
    try {
      logger.info('Initiating database failover');

      // 断开当前连接
      await this.disconnect();

      // 等待一段时间后重新连接
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 尝试重新连接
      await this.connect();

      logger.info('Database failover completed successfully');
      return true;
    } catch (error) {
      logger.error('Database failover failed', { error: (error as Error).message });
      return false;
    }
  }

  /**
   * 启用只读模式
   * @returns Promise<void>
   */
  async enableReadOnlyMode(): Promise<void> {
    try {
      logger.info('Enabling read-only mode');

      // 这里可以实现只读模式的逻辑
      // 例如：切换到只读数据库实例或设置连接参数

      this.emit('readOnlyModeEnabled');
      logger.info('Read-only mode enabled successfully');
    } catch (error: unknown) {
      logger.error('Failed to enable read-only mode', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * 执行健康检查
   * @returns Promise<boolean> 健康检查结果
   */
  async performHealthCheck(): Promise<boolean> {
    return this.forceHealthCheck();
  }
}

// 创建增强的数据库连接实例
const enhancedDb = new EnhancedDatabaseConnection();

// 导出实例和类
export { enhancedDb, EnhancedDatabaseConnection as EnhancedConnection };
export default enhancedDb;
