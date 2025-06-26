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

// 连接池配置接口
export interface ConnectionPoolConfig {
  maxConnections: number
  minConnections: number
  acquireTimeoutMillis: number
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
  private poolConfig: Partial<PoolConfiguration> = {}
  private recoveryConfig: Partial<RecoveryConfiguration> = {}

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
      console.error('Uncaught exception in database connection:', error)
      this.handleConnectionError(error)
    })

    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled rejection in database connection:', reason)
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
      console.log('Database connected successfully')

    } catch (error) {
      this.setState(ConnectionState.FAILED)
      this.stats.lastError = error instanceof Error ? error : new Error(String(error))
      
      console.error('Database connection failed:', error)
      this.emit('error', this.stats.lastError)

      // 如果启用了重连，则尝试重连
      if (this.config.reconnection.enabled) {
        this.scheduleReconnect()
      }

      throw error
    }
  }

  /**
   * 验证数据库连接
   */
  private async validateConnection(): Promise<void> {
    if (!this.prisma) {
      throw new Error('Prisma client not initialized')
    }

    const startTime = Date.now()
    
    try {
      // 执行简单查询验证连接
      await this.prisma.$queryRaw`SELECT 1 as test`
      
      const latency = Date.now() - startTime
      this.updateLatencyStats(latency)
      
    } catch (error) {
      throw new Error(`Connection validation failed: ${error}`)
    }
  }

  /**
   * 断开数据库连接
   */
  async disconnect(): Promise<void> {
    this.stopHealthCheck()
    this.stopReconnectTimer()

    if (this.prisma) {
      try {
        await this.prisma.$disconnect()
        console.log('Database disconnected successfully')
      } catch (error) {
        console.error('Error disconnecting from database:', error)
      } finally {
        this.prisma = null
      }
    }

    this.setState(ConnectionState.DISCONNECTED)
    this.emit('disconnected')
  }

  /**
   * 优雅关闭
   */
  async gracefulShutdown(): Promise<void> {
    console.log('Initiating graceful database shutdown...')
    
    try {
      await this.disconnect()
      console.log('Database shutdown completed')
    } catch (error) {
      console.error('Error during graceful shutdown:', error)
    } finally {
      process.exit(0)
    }
  }

  /**
   * 重新连接数据库
   */
  async reconnect(): Promise<void> {
    console.log('Attempting to reconnect to database...')
    
    this.setState(ConnectionState.RECONNECTING)
    this.stats.reconnectAttempts++
    
    this.emit('reconnecting', this.stats.reconnectAttempts)

    try {
      // 先断开现有连接
      if (this.prisma) {
        await this.prisma.$disconnect()
        this.prisma = null
      }

      // 重新连接
      await this.connect()
      
      console.log('Database reconnected successfully')
      this.emit('reconnected')
      
    } catch (error) {
      console.error(`Reconnection attempt ${this.stats.reconnectAttempts} failed:`, error)
      
      // 如果还有重试次数，则继续尝试
      if (this.stats.reconnectAttempts < this.config.reconnection.maxRetries) {
        this.scheduleReconnect()
      } else {
        console.error('Max reconnection attempts reached. Giving up.')
        this.setState(ConnectionState.FAILED)
        this.emit('error', new Error('Max reconnection attempts reached'))
      }
    }
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    const delay = this.calculateReconnectDelay()
    
    console.log(`Scheduling reconnection in ${delay}ms (attempt ${this.stats.reconnectAttempts + 1})`)
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnect().catch(error => {
        console.error('Scheduled reconnection failed:', error)
      })
    }, delay)
  }

  /**
   * 计算重连延迟时间
   */
  private calculateReconnectDelay(): number {
    const { retryDelayMs, backoffMultiplier, maxRetryDelayMs, jitterMs } = this.config.reconnection
    
    // 指数退避算法
    const baseDelay = Math.min(
      retryDelayMs * Math.pow(backoffMultiplier, this.stats.reconnectAttempts),
      maxRetryDelayMs
    )
    
    // 添加随机抖动避免雷群效应
    const jitter = Math.random() * jitterMs
    
    return baseDelay + jitter
  }

  /**
   * 停止重连定时器
   */
  private stopReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  /**
   * 启动健康检查
   */
  private startHealthCheck(): void {
    if (this.healthCheckTimer) {
      return
    }

    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck().catch(error => {
        console.error('Health check failed:', error)
      })
    }, this.config.healthCheck.intervalMs)
  }

  /**
   * 停止健康检查
   */
  private stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = null
    }
  }

  /**
   * 执行健康检查
   */
  private async performHealthCheck(): Promise<boolean> {
    if (!this.prisma || this.state !== ConnectionState.CONNECTED) {
      return false
    }

    const startTime = Date.now()
    
    try {
      // 设置健康检查超时
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout')), this.config.healthCheck.timeoutMs)
      })

      // 执行健康检查查询
      const healthCheckPromise = this.prisma.$queryRaw`SELECT 1 as health_check`
      
      await Promise.race([healthCheckPromise, timeoutPromise])
      
      const latency = Date.now() - startTime
      this.updateLatencyStats(latency)
      
      this.emit('healthCheck', true)
      return true
      
    } catch (error) {
      console.error('Health check failed:', error)
      this.emit('healthCheck', false)
      
      // 健康检查失败，可能需要重连
      this.handleConnectionError(error instanceof Error ? error : new Error(String(error)))
      
      return false
    }
  }

  /**
   * 处理连接错误
   */
  private handleConnectionError(error: Error): void {
    console.error('Database connection error:', error)
    
    this.stats.lastError = error
    this.emit('error', error)
    
    // 如果当前是连接状态且启用了重连，则尝试重连
    if (this.state === ConnectionState.CONNECTED && this.config.reconnection.enabled) {
      this.setState(ConnectionState.DISCONNECTED)
      this.scheduleReconnect()
    }
  }

  /**
   * 设置连接状态
   */
  private setState(state: ConnectionState): void {
    const previousState = this.state
    this.state = state
    this.stats.state = state
    
    if (previousState !== state) {
      console.log(`Database connection state changed: ${previousState} -> ${state}`)
    }
  }

  /**
   * 更新延迟统计
   */
  private updateLatencyStats(latency: number): void {
    this.stats.totalQueries++
    
    // 计算平均延迟（简单移动平均）
    if (this.stats.avgLatency === 0) {
      this.stats.avgLatency = latency
    } else {
      this.stats.avgLatency = (this.stats.avgLatency * 0.9) + (latency * 0.1)
    }
  }

  /**
   * 执行数据库查询（带错误处理和统计）
   */
  async executeQuery<T>(queryFn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
    if (!this.prisma || this.state !== ConnectionState.CONNECTED) {
      throw new Error('Database not connected')
    }

    const startTime = Date.now()
    
    try {
      const result = await queryFn(this.prisma)
      
      const latency = Date.now() - startTime
      this.updateLatencyStats(latency)
      
      return result
      
    } catch (error) {
      this.stats.failedQueries++
      
      console.error('Query execution failed:', error)
      
      // 发出详细的错误事件
      this.emit('error', error)
      this.emit('queryFailed', {
        error,
        query: queryFn.toString(),
        timestamp: new Date(),
        totalFailures: this.stats.failedQueries
      })
      
      // 检查是否是连接相关错误
      if (this.isConnectionError(error)) {
        this.handleConnectionError(error instanceof Error ? error : new Error(String(error)))
      }
      
      throw error
    }
  }

  /**
   * 检查是否是连接相关错误
   */
  private isConnectionError(error: any): boolean {
    if (!error) {return false}
    
    const errorMessage = error.message || error.toString()
    const connectionErrorPatterns = [
      'connection',
      'timeout',
      'network',
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'socket',
      'server closed'
    ]
    
    return connectionErrorPatterns.some(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    )
  }

  /**
   * 获取连接统计信息
   */
  getStats(): ConnectionStats {
    const uptime = this.stats.connectedAt 
      ? Date.now() - this.stats.connectedAt.getTime() 
      : 0
    
    return {
      ...this.stats,
      uptime
    }
  }

  /**
   * 更新连接池配置
   */
  async updateConfiguration(config: Partial<PoolConfiguration>): Promise<void> {
    try {
      console.log('Updating database configuration:', config)
      this.poolConfig = { ...this.poolConfig, ...config }
      
      // 在实际实现中，这里应该重新初始化连接池
      // 由于Prisma的限制，我们只能记录配置变更
      this.emit('configurationUpdated', { config, timestamp: new Date() })
      
    } catch (error) {
      console.error('Failed to update database configuration:', error)
      throw error
    }
  }

  /**
   * 更新恢复配置
   */
  updateRecoveryConfiguration(config: Partial<RecoveryConfiguration>): void {
    this.recoveryConfig = { ...this.recoveryConfig, ...config }
    console.log('Recovery configuration updated:', config)
    this.emit('recoveryConfigurationUpdated', { config, timestamp: new Date() })
  }

  /**
   * 获取当前配置
   */
  getConfiguration(): {
    pool: Partial<PoolConfiguration>
    recovery: Partial<RecoveryConfiguration>
  } {
    return {
      pool: { ...this.poolConfig },
      recovery: { ...this.recoveryConfig }
    }
  }

  /**
   * 强制健康检查
   */
  async forceHealthCheck(): Promise<boolean> {
    return await this.performHealthCheck()
  }

  /**
   * 获取详细的连接信息
   */
  getDetailedStats(): ConnectionStats & {
    configuration: {
      pool: Partial<PoolConfiguration>
      recovery: Partial<RecoveryConfiguration>
    }
    performance: {
      successRate: number
      queriesPerSecond: number
      avgResponseTime: number
    }
  } {
    const basicStats = this.getStats()
    const successRate = this.stats.totalQueries > 0 
      ? ((this.stats.totalQueries - this.stats.failedQueries) / this.stats.totalQueries) * 100
      : 100
    
    const uptimeSeconds = basicStats.uptime / 1000
    const queriesPerSecond = uptimeSeconds > 0 ? this.stats.totalQueries / uptimeSeconds : 0
    
    return {
      ...basicStats,
      configuration: this.getConfiguration(),
      performance: {
        successRate,
        queriesPerSecond,
        avgResponseTime: basicStats.avgLatency
      }
    }
  }

  /**
   * 获取Prisma客户端实例
   */
  getClient(): PrismaClient | null {
    return this.prisma
  }

  /**
   * 检查连接状态
   */
  isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED && this.prisma !== null
  }

  /**
   * 获取当前连接状态
   */
  getState(): ConnectionState {
    return this.state
  }

  /**
   * 更新配置
   */
  updateConfig(
    poolConfig?: Partial<ConnectionPoolConfig>,
    reconnectionConfig?: Partial<ReconnectionConfig>,
    healthCheckConfig?: Partial<HealthCheckConfig>
  ): void {
    if (poolConfig) {
      this.config.pool = { ...this.config.pool, ...poolConfig }
    }
    
    if (reconnectionConfig) {
      this.config.reconnection = { ...this.config.reconnection, ...reconnectionConfig }
    }
    
    if (healthCheckConfig) {
      this.config.healthCheck = { ...this.config.healthCheck, ...healthCheckConfig }
      
      // 如果健康检查配置改变，重启健康检查
      if (this.state === ConnectionState.CONNECTED) {
        this.stopHealthCheck()
        if (this.config.healthCheck.enabled) {
          this.startHealthCheck()
        }
      }
    }
  }
}

// 全局增强数据库连接实例
export const enhancedDb = new EnhancedDatabaseConnection()

// 初始化监控和优化模块
if (process.env.DB_MONITORING_ENABLED === 'true') {
  // 延迟导入以避免循环依赖
  import('./monitoring').then(({ databaseMonitor }) => {
    databaseMonitor.start()
    console.log('Database monitoring started')
  }).catch(console.error)
}

if (process.env.DB_POOL_OPTIMIZATION_ENABLED === 'true') {
  import('./pool-optimizer').then(({ poolOptimizer }) => {
    poolOptimizer.start()
    console.log('Database pool optimization started')
  }).catch(console.error)
}

if (process.env.DB_ERROR_RECOVERY_ENABLED === 'true') {
  import('./error-recovery').then(({ errorRecovery }) => {
    errorRecovery.start()
    console.log('Database error recovery started')
  }).catch(console.error)
}

// 导出便捷方法
export const connectDatabase = () => enhancedDb.connect()
export const disconnectDatabase = () => enhancedDb.disconnect()
export const getDatabaseStats = () => enhancedDb.getStats()
export const isDatabaseConnected = () => enhancedDb.isConnected()
export const executeQuery = <T>(queryFn: (prisma: PrismaClient) => Promise<T>) => 
  enhancedDb.executeQuery(queryFn)

// 默认导出增强的数据库连接
export default enhancedDb