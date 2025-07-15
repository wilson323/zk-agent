/**
 * @file Enhanced Database Connection Manager
 * @description 增强的数据库连接管理器，支持连接池优化、自动重连和错误恢复
 * @author ZK-Agent Team A
 * @date 2024-12-19
 */

import { PrismaClient } from '@prisma/client'
import { EventEmitter } from 'events'
import type { PoolConfiguration } from './pool-optimizer'
import type { RecoveryConfiguration } from './error-recovery'
import { logger } from '@/lib/utils/logger';

// 连接池配置接口
export interface ConnectionPoolConfig {
  maxConnections: number
  minConnections: number
  acquireTimeoutMillis: number
  createTimeoutMillis?: number
  idleTimeoutMillis: number
  evictionRunIntervalMillis: number
  connectTimeoutMillis: number
  requestTimeoutMillis: number
  cancelTimeoutMillis: number
}

// 重连配置接口
export interface ReconnectionConfig {
  enabled: boolean
  maxRetries: number
  retryDelayMs: number
  backoffMultiplier: number
  maxRetryDelayMs: number
  jitterMs: number
}

// 健康检查配置接口
export interface HealthCheckConfig {
  enabled: boolean
  intervalMs: number
  timeoutMs: number
  failureThreshold: number
  recoveryThreshold: number
}

// 连接状态枚举
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed'
}

// 连接统计信息
export interface ConnectionStats {
  state: ConnectionState
  connectedAt?: Date
  lastError?: Error
  reconnectAttempts: number
  totalQueries: number
  failedQueries: number
  avgLatency: number
  uptime: number
}

// 数据库事件类型
export interface DatabaseEvents {
  connected: () => void
  disconnected: (error?: Error) => void
  reconnecting: (attempt: number) => void
  reconnected: () => void
  error: (error: Error) => void
  healthCheck: (healthy: boolean) => void
}

/**
 * 增强的数据库连接管理器
 */
export class EnhancedDatabaseConnection extends EventEmitter {
  private prisma: PrismaClient | null = null
  private state: ConnectionState = ConnectionState.DISCONNECTED
  private reconnectTimer: NodeJS.Timeout | null = null
  private healthCheckTimer: NodeJS.Timeout | null = null
  private stats: ConnectionStats
  private config: {
    pool: ConnectionPoolConfig
    reconnection: ReconnectionConfig
    healthCheck: HealthCheckConfig
  }

  constructor(
    poolConfig?: Partial<ConnectionPoolConfig>,
    reconnectionConfig?: Partial<ReconnectionConfig>,
    healthCheckConfig?: Partial<HealthCheckConfig>
  ) {
    super()

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
        ...poolConfig
      },
      reconnection: {
        enabled: true,
        maxRetries: 10,
        retryDelayMs: 1000,
        backoffMultiplier: 2,
        maxRetryDelayMs: 30000,
        jitterMs: 100,
        ...reconnectionConfig
      },
      healthCheck: {
        enabled: process.env.DB_HEALTH_CHECK === 'true',
        intervalMs: parseInt(process.env.DB_HEALTH_CHECK_INTERVAL || '30000'),
        timeoutMs: parseInt(process.env.DB_HEALTH_CHECK_TIMEOUT || '5000'),
        failureThreshold: 3,
        recoveryThreshold: 2,
        ...healthCheckConfig
      }
    }

    // 初始化统计信息
    this.stats = {
      state: ConnectionState.DISCONNECTED,
      reconnectAttempts: 0,
      totalQueries: 0,
      failedQueries: 0,
      avgLatency: 0,
      uptime: 0
    }

    // 绑定事件处理器
    this.setupEventHandlers()
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    // 进程退出时清理连接
    process.on('beforeExit', () => this.disconnect())
    process.on('SIGINT', () => this.gracefulShutdown())
    process.on('SIGTERM', () => this.gracefulShutdown())

    // 未捕获异常处理
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception in database connection:', error)
      this.handleConnectionError(error)
    })

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection in database connection:', reason)
      if (reason instanceof Error) {
        this.handleConnectionError(reason)
      }
    })
  }

  /**
   * 连接到数据库
   */
  async connect(): Promise<void> {
    if (this.state === ConnectionState.CONNECTED) {
      return
    }

    this.setState(ConnectionState.CONNECTING)

    try {
      // 创建Prisma客户端
      this.prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' 
          ? ['query', 'error', 'warn'] 
          : ['error'],
        errorFormat: 'pretty',
        datasources: {
          db: {
            url: process.env.DATABASE_URL
          }
        }
      })

      // 连接到数据库
      await this.prisma.$connect()

      // 验证连接
      await this.validateConnection()

      this.setState(ConnectionState.CONNECTED)
      this.stats.connectedAt = new Date()
      this.stats.reconnectAttempts = 0
      this.stats.lastError = undefined

      // 启动健康检查
      if (this.config.healthCheck.enabled) {
        this.startHealthCheck()
      }

      this.emit('connected')

// 默认导出增强的数据库连接
export default enhancedDb