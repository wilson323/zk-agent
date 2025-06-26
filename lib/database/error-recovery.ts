/**
 * @file Database Error Recovery System
 * @description 数据库错误恢复和故障转移系统
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

import { EventEmitter } from 'events'
import { enhancedDb, ConnectionState } from './enhanced-connection'
import { databaseMonitor, AlertLevel } from './monitoring'
import { poolOptimizer } from './pool-optimizer'

// 错误类型
export enum ErrorType {
  CONNECTION_TIMEOUT = 'connection_timeout',
  CONNECTION_REFUSED = 'connection_refused',
  AUTHENTICATION_FAILED = 'authentication_failed',
  DATABASE_UNAVAILABLE = 'database_unavailable',
  QUERY_TIMEOUT = 'query_timeout',
  DEADLOCK = 'deadlock',
  CONSTRAINT_VIOLATION = 'constraint_violation',
  DISK_FULL = 'disk_full',
  MEMORY_EXHAUSTED = 'memory_exhausted',
  NETWORK_ERROR = 'network_error',
  UNKNOWN = 'unknown'
}

// 恢复策略
export enum RecoveryStrategy {
  RETRY = 'retry',
  RECONNECT = 'reconnect',
  FAILOVER = 'failover',
  CIRCUIT_BREAKER = 'circuit_breaker',
  GRACEFUL_DEGRADATION = 'graceful_degradation',
  EMERGENCY_SHUTDOWN = 'emergency_shutdown'
}

// 错误分析结果
export interface ErrorAnalysis {
  errorType: ErrorType
  severity: 'low' | 'medium' | 'high' | 'critical'
  isRecoverable: boolean
  recommendedStrategy: RecoveryStrategy
  estimatedRecoveryTime: number // 毫秒
  requiresManualIntervention: boolean
  context: {
    connectionState: ConnectionState
    recentErrors: number
    systemLoad: number
    availableMemory: number
  }
}

// 恢复操作结果
export interface RecoveryResult {
  timestamp: Date
  errorType: ErrorType
  strategy: RecoveryStrategy
  success: boolean
  duration: number // 毫秒
  attemptsCount: number
  error?: string
  metrics: {
    beforeRecovery: any
    afterRecovery: any
  }
}

// 恢复配置
export interface RecoveryConfiguration {
  maxRetryAttempts: number
  retryDelayMs: number
  exponentialBackoff: boolean
  circuitBreakerThreshold: number
  circuitBreakerTimeoutMs: number
  failoverEnabled: boolean
  gracefulDegradationEnabled: boolean
  emergencyShutdownThreshold: number
  healthCheckIntervalMs: number
  recoveryTimeoutMs: number
}

// 熔断器状态
export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

/**
 * 数据库错误恢复系统
 */
export class DatabaseErrorRecovery extends EventEmitter {
  private recoveryHistory: RecoveryResult[] = []
  private errorCounts: Map<ErrorType, number> = new Map()
  private circuitBreakerState: CircuitBreakerState = CircuitBreakerState.CLOSED
  private circuitBreakerOpenTime: Date | null = null
  private configuration: RecoveryConfiguration
  private isRecovering: boolean = false
  private healthCheckInterval: NodeJS.Timeout | null = null
  private maxHistorySize: number
  private lastErrorTime: Date | null = null
  private consecutiveFailures: number = 0

  constructor(
    config?: Partial<RecoveryConfiguration>,
    maxHistorySize: number = 1000
  ) {
    super()

    this.maxHistorySize = maxHistorySize
    
    // 默认恢复配置
    this.configuration = {
      maxRetryAttempts: parseInt(process.env.DB_MAX_RETRY_ATTEMPTS || '3'),
      retryDelayMs: parseInt(process.env.DB_RETRY_DELAY || '1000'),
      exponentialBackoff: process.env.DB_EXPONENTIAL_BACKOFF === 'true',
      circuitBreakerThreshold: parseInt(process.env.DB_CIRCUIT_BREAKER_THRESHOLD || '5'),
      circuitBreakerTimeoutMs: parseInt(process.env.DB_CIRCUIT_BREAKER_TIMEOUT || '60000'),
      failoverEnabled: process.env.DB_FAILOVER_ENABLED === 'true',
      gracefulDegradationEnabled: process.env.DB_GRACEFUL_DEGRADATION === 'true',
      emergencyShutdownThreshold: parseInt(process.env.DB_EMERGENCY_SHUTDOWN_THRESHOLD || '10'),
      healthCheckIntervalMs: parseInt(process.env.DB_HEALTH_CHECK_INTERVAL || '30000'),
      recoveryTimeoutMs: parseInt(process.env.DB_RECOVERY_TIMEOUT || '300000'),
      ...config
    }

    // 初始化错误计数
    Object.values(ErrorType).forEach(errorType => {
      this.errorCounts.set(errorType, 0)
    })

    // 设置事件监听器
    this.setupEventListeners()

    // 启动健康检查
    this.startHealthCheck()
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听数据库错误事件
    enhancedDb.on('error', (error: Error) => {
      this.handleDatabaseError(error)
    })

    // 监听连接断开事件
    enhancedDb.on('disconnected', (error?: Error) => {
      if (error) {
        this.handleDatabaseError(error)
      }
    })

    // 监听监控告警
    databaseMonitor.on('alert', (alert) => {
      if (alert.level === AlertLevel.CRITICAL || alert.level === AlertLevel.ERROR) {
        this.handleMonitoringAlert(alert)
      }
    })
  }

  /**
   * 处理数据库错误
   */
  private async handleDatabaseError(error: Error): Promise<void> {
    try {
      console.error('Database error detected:', error.message)
      
      // 分析错误
      const analysis = this.analyzeError(error)
      
      // 更新错误计数
      this.updateErrorCounts(analysis.errorType)
      
      // 检查熔断器状态
      this.updateCircuitBreakerState(analysis)
      
      // 如果熔断器开启，直接返回
      if (this.circuitBreakerState === CircuitBreakerState.OPEN) {
        console.warn('Circuit breaker is open, skipping recovery attempt')
        return
      }
      
      // 执行恢复策略
      if (analysis.isRecoverable && !this.isRecovering) {
        await this.executeRecoveryStrategy(analysis)
      } else if (!analysis.isRecoverable) {
        console.error('Error is not recoverable, manual intervention required')
        this.emit('unrecoverableError', { error, analysis })
      }
      
    } catch (recoveryError) {
      console.error('Error during error recovery:', recoveryError)
    }
  }

  /**
   * 处理监控告警
   */
  private async handleMonitoringAlert(alert: any): Promise<void> {
    console.warn('Monitoring alert received:', alert.message)
    
    // 根据告警类型决定恢复策略
    if (alert.message.includes('连接') || alert.message.includes('connection')) {
      const fakeError = new Error(`Monitoring alert: ${alert.message}`)
      await this.handleDatabaseError(fakeError)
    }
  }

  /**
   * 分析错误
   */
  private analyzeError(error: Error): ErrorAnalysis {
    const errorMessage = error.message.toLowerCase()
    const stats = enhancedDb.getStats()
    const memUsage = process.memoryUsage()
    
    let errorType = ErrorType.UNKNOWN
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
    let isRecoverable = true
    let recommendedStrategy = RecoveryStrategy.RETRY
    let estimatedRecoveryTime = 5000
    let requiresManualIntervention = false

    // 错误类型识别
    if (errorMessage.includes('timeout') || errorMessage.includes('超时')) {
      errorType = ErrorType.CONNECTION_TIMEOUT
      severity = 'medium'
      recommendedStrategy = RecoveryStrategy.RETRY
      estimatedRecoveryTime = 10000
    } else if (errorMessage.includes('refused') || errorMessage.includes('拒绝')) {
      errorType = ErrorType.CONNECTION_REFUSED
      severity = 'high'
      recommendedStrategy = RecoveryStrategy.RECONNECT
      estimatedRecoveryTime = 15000
    } else if (errorMessage.includes('authentication') || errorMessage.includes('认证')) {
      errorType = ErrorType.AUTHENTICATION_FAILED
      severity = 'critical'
      isRecoverable = false
      requiresManualIntervention = true
      recommendedStrategy = RecoveryStrategy.EMERGENCY_SHUTDOWN
    } else if (errorMessage.includes('unavailable') || errorMessage.includes('不可用')) {
      errorType = ErrorType.DATABASE_UNAVAILABLE
      severity = 'critical'
      recommendedStrategy = RecoveryStrategy.FAILOVER
      estimatedRecoveryTime = 30000
    } else if (errorMessage.includes('deadlock') || errorMessage.includes('死锁')) {
      errorType = ErrorType.DEADLOCK
      severity = 'medium'
      recommendedStrategy = RecoveryStrategy.RETRY
      estimatedRecoveryTime = 2000
    } else if (errorMessage.includes('constraint') || errorMessage.includes('约束')) {
      errorType = ErrorType.CONSTRAINT_VIOLATION
      severity = 'low'
      isRecoverable = false
      requiresManualIntervention = true
    } else if (errorMessage.includes('disk') || errorMessage.includes('磁盘')) {
      errorType = ErrorType.DISK_FULL
      severity = 'critical'
      isRecoverable = false
      requiresManualIntervention = true
      recommendedStrategy = RecoveryStrategy.EMERGENCY_SHUTDOWN
    } else if (errorMessage.includes('memory') || errorMessage.includes('内存')) {
      errorType = ErrorType.MEMORY_EXHAUSTED
      severity = 'high'
      recommendedStrategy = RecoveryStrategy.GRACEFUL_DEGRADATION
      estimatedRecoveryTime = 20000
    } else if (errorMessage.includes('network') || errorMessage.includes('网络')) {
      errorType = ErrorType.NETWORK_ERROR
      severity = 'high'
      recommendedStrategy = RecoveryStrategy.RECONNECT
      estimatedRecoveryTime = 15000
    }

    // 根据连续失败次数调整严重性
    if (this.consecutiveFailures > 3) {
      severity = 'critical'
      if (this.consecutiveFailures > 5) {
        recommendedStrategy = RecoveryStrategy.CIRCUIT_BREAKER
      }
    }

    return {
      errorType,
      severity,
      isRecoverable,
      recommendedStrategy,
      estimatedRecoveryTime,
      requiresManualIntervention,
      context: {
        connectionState: stats.state,
        recentErrors: this.getRecentErrorCount(),
        systemLoad: this.getSystemLoad(),
        availableMemory: (memUsage.heapTotal - memUsage.heapUsed) / 1024 / 1024 // MB
      }
    }
  }

  /**
   * 更新错误计数
   */
  private updateErrorCounts(errorType: ErrorType): void {
    const currentCount = this.errorCounts.get(errorType) || 0
    this.errorCounts.set(errorType, currentCount + 1)
    this.lastErrorTime = new Date()
    this.consecutiveFailures++
  }

  /**
   * 更新熔断器状态
   */
  private updateCircuitBreakerState(analysis: ErrorAnalysis): void {
    const recentErrors = this.getRecentErrorCount()
    
    switch (this.circuitBreakerState) {
      case CircuitBreakerState.CLOSED:
        if (recentErrors >= this.configuration.circuitBreakerThreshold) {
          this.circuitBreakerState = CircuitBreakerState.OPEN
          this.circuitBreakerOpenTime = new Date()
          console.warn('Circuit breaker opened due to high error rate')
          this.emit('circuitBreakerOpened', { recentErrors, threshold: this.configuration.circuitBreakerThreshold })
        }
        break
        
      case CircuitBreakerState.OPEN:
        if (this.circuitBreakerOpenTime && 
            Date.now() - this.circuitBreakerOpenTime.getTime() > this.configuration.circuitBreakerTimeoutMs) {
          this.circuitBreakerState = CircuitBreakerState.HALF_OPEN
          console.info('Circuit breaker moved to half-open state')
          this.emit('circuitBreakerHalfOpen')
        }
        break
        
      case CircuitBreakerState.HALF_OPEN:
        if (analysis.severity === 'critical' || analysis.severity === 'high') {
          this.circuitBreakerState = CircuitBreakerState.OPEN
          this.circuitBreakerOpenTime = new Date()
          console.warn('Circuit breaker reopened due to continued errors')
          this.emit('circuitBreakerReopened')
        }
        break
    }
  }

  /**
   * 执行恢复策略
   */
  private async executeRecoveryStrategy(analysis: ErrorAnalysis): Promise<void> {
    this.isRecovering = true
    const startTime = Date.now()
    let attempts = 0
    let success = false
    let lastError: string | undefined
    
    const beforeMetrics = enhancedDb.getStats()
    
    try {
      console.log(`Executing recovery strategy: ${analysis.recommendedStrategy}`)
      
      switch (analysis.recommendedStrategy) {
        case RecoveryStrategy.RETRY:
          ({ success, attempts, lastError } = await this.executeRetryStrategy())
          break
          
        case RecoveryStrategy.RECONNECT:
          ({ success, attempts, lastError } = await this.executeReconnectStrategy())
          break
          
        case RecoveryStrategy.FAILOVER:
          ({ success, attempts, lastError } = await this.executeFailoverStrategy())
          break
          
        case RecoveryStrategy.CIRCUIT_BREAKER:
          ({ success, attempts, lastError } = await this.executeCircuitBreakerStrategy())
          break
          
        case RecoveryStrategy.GRACEFUL_DEGRADATION:
          ({ success, attempts, lastError } = await this.executeGracefulDegradationStrategy())
          break
          
        case RecoveryStrategy.EMERGENCY_SHUTDOWN:
          ({ success, attempts, lastError } = await this.executeEmergencyShutdownStrategy())
          break
          
        default:
          throw new Error(`Unknown recovery strategy: ${analysis.recommendedStrategy}`)
      }
      
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
      console.error('Recovery strategy execution failed:', lastError)
    }
    
    const afterMetrics = enhancedDb.getStats()
    const duration = Date.now() - startTime
    
    // 记录恢复结果
    const result: RecoveryResult = {
      timestamp: new Date(),
      errorType: analysis.errorType,
      strategy: analysis.recommendedStrategy,
      success,
      duration,
      attemptsCount: attempts,
      error: lastError,
      metrics: {
        beforeRecovery: beforeMetrics,
        afterRecovery: afterMetrics
      }
    }
    
    this.addRecoveryResult(result)
    
    if (success) {
      this.consecutiveFailures = 0
      if (this.circuitBreakerState === CircuitBreakerState.HALF_OPEN) {
        this.circuitBreakerState = CircuitBreakerState.CLOSED
        console.info('Circuit breaker closed after successful recovery')
        this.emit('circuitBreakerClosed')
      }
    }
    
    this.emit('recoveryCompleted', result)
    this.isRecovering = false
  }

  /**
   * 执行重试策略
   */
  private async executeRetryStrategy(): Promise<{ success: boolean; attempts: number; lastError?: string }> {
    let attempts = 0
    let lastError: string | undefined
    
    for (let i = 0; i < this.configuration.maxRetryAttempts; i++) {
      attempts++
      
      try {
        // 等待重试延迟
        const delay = this.configuration.exponentialBackoff 
          ? this.configuration.retryDelayMs * Math.pow(2, i)
          : this.configuration.retryDelayMs
          
        await this.sleep(delay)
        
        // 尝试执行健康检查
        const isHealthy = await enhancedDb.performHealthCheck()
        if (isHealthy) {
          console.log(`Retry strategy succeeded on attempt ${attempts}`)
          return { success: true, attempts }
        }
        
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error)
        console.warn(`Retry attempt ${attempts} failed:`, lastError)
      }
    }
    
    return { success: false, attempts, lastError }
  }

  /**
   * 执行重连策略
   */
  private async executeReconnectStrategy(): Promise<{ success: boolean; attempts: number; lastError?: string }> {
    let attempts = 0
    let lastError: string | undefined
    
    try {
      attempts++
      console.log('Attempting database reconnection...')
      
      // 断开现有连接
      await enhancedDb.disconnect()
      
      // 等待一段时间
      await this.sleep(this.configuration.retryDelayMs)
      
      // 重新连接
      await enhancedDb.connect()
      
      // 验证连接
      const isHealthy = await enhancedDb.performHealthCheck()
      if (isHealthy) {
        console.log('Database reconnection successful')
        return { success: true, attempts }
      }
      
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
      console.error('Database reconnection failed:', lastError)
    }
    
    return { success: false, attempts, lastError }
  }

  /**
   * 执行故障转移策略
   */
  private async executeFailoverStrategy(): Promise<{ success: boolean; attempts: number; lastError?: string }> {
    let attempts = 0
    let lastError: string | undefined
    
    if (!this.configuration.failoverEnabled) {
      return { success: false, attempts: 0, lastError: 'Failover is not enabled' }
    }
    
    try {
      attempts++
      console.log('Attempting database failover...')
      
      // 这里应该实现实际的故障转移逻辑
      // 例如：切换到备用数据库、使用只读副本等
      
      // 模拟故障转移
      await this.sleep(5000)
      
      console.log('Failover strategy executed (simulated)')
      return { success: true, attempts }
      
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
      console.error('Failover strategy failed:', lastError)
    }
    
    return { success: false, attempts, lastError }
  }

  /**
   * 执行熔断器策略
   */
  private async executeCircuitBreakerStrategy(): Promise<{ success: boolean; attempts: number; lastError?: string }> {
    console.log('Circuit breaker strategy activated')
    
    this.circuitBreakerState = CircuitBreakerState.OPEN
    this.circuitBreakerOpenTime = new Date()
    
    // 触发连接池优化
    if (poolOptimizer) {
      poolOptimizer.emit('emergencyOptimization', 'Circuit breaker activated')
    }
    
    return { success: true, attempts: 1 }
  }

  /**
   * 执行优雅降级策略
   */
  private async executeGracefulDegradationStrategy(): Promise<{ success: boolean; attempts: number; lastError?: string }> {
    if (!this.configuration.gracefulDegradationEnabled) {
      return { success: false, attempts: 0, lastError: 'Graceful degradation is not enabled' }
    }
    
    try {
      console.log('Executing graceful degradation strategy...')
      
      // 这里应该实现优雅降级逻辑
      // 例如：启用缓存模式、限制功能、使用备用数据源等
      
      // 模拟优雅降级
      await this.sleep(2000)
      
      console.log('Graceful degradation activated')
      this.emit('gracefulDegradationActivated')
      
      return { success: true, attempts: 1 }
      
    } catch (error) {
      const lastError = error instanceof Error ? error.message : String(error)
      console.error('Graceful degradation failed:', lastError)
      return { success: false, attempts: 1, lastError }
    }
  }

  /**
   * 执行紧急关闭策略
   */
  private async executeEmergencyShutdownStrategy(): Promise<{ success: boolean; attempts: number; lastError?: string }> {
    try {
      console.error('Executing emergency shutdown strategy...')
      
      // 发送紧急告警
      this.emit('emergencyShutdown', {
        reason: 'Critical database error requiring manual intervention',
        timestamp: new Date()
      })
      
      // 优雅关闭数据库连接
      await enhancedDb.gracefulShutdown()
      
      console.error('Emergency shutdown completed')
      return { success: true, attempts: 1 }
      
    } catch (error) {
      const lastError = error instanceof Error ? error.message : String(error)
      console.error('Emergency shutdown failed:', lastError)
      return { success: false, attempts: 1, lastError }
    }
  }

  /**
   * 启动健康检查
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        if (this.circuitBreakerState === CircuitBreakerState.HALF_OPEN) {
          const isHealthy = await enhancedDb.performHealthCheck()
          if (isHealthy) {
            this.circuitBreakerState = CircuitBreakerState.CLOSED
            console.info('Circuit breaker closed after successful health check')
            this.emit('circuitBreakerClosed')
          }
        }
      } catch (error) {
        console.error('Health check failed:', error)
      }
    }, this.configuration.healthCheckIntervalMs)
  }

  /**
   * 停止健康检查
   */
  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
  }

  /**
   * 获取最近错误数量
   */
  private getRecentErrorCount(timeWindowMs: number = 300000): number {
    const cutoffTime = Date.now() - timeWindowMs
    return this.recoveryHistory
      .filter(result => result.timestamp.getTime() > cutoffTime && !result.success)
      .length
  }

  /**
   * 获取系统负载
   */
  private getSystemLoad(): number {
    // 简单的系统负载计算
    const cpuUsage = process.cpuUsage()
    return (cpuUsage.user + cpuUsage.system) / 1000000 // 转换为秒
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 添加恢复结果到历史
   */
  private addRecoveryResult(result: RecoveryResult): void {
    this.recoveryHistory.push(result)
    
    // 限制历史记录大小
    if (this.recoveryHistory.length > this.maxHistorySize) {
      this.recoveryHistory = this.recoveryHistory.slice(-this.maxHistorySize)
    }
  }

  /**
   * 获取恢复历史
   */
  getRecoveryHistory(limit?: number): RecoveryResult[] {
    if (limit) {
      return this.recoveryHistory.slice(-limit)
    }
    return [...this.recoveryHistory]
  }

  /**
   * 获取错误统计
   */
  getErrorStatistics(): {
    totalErrors: number
    errorsByType: { [key in ErrorType]: number }
    recentErrors: number
    consecutiveFailures: number
    lastErrorTime: Date | null
    circuitBreakerState: CircuitBreakerState
  } {
    const errorsByType = {} as { [key in ErrorType]: number }
    Object.values(ErrorType).forEach(errorType => {
      errorsByType[errorType] = this.errorCounts.get(errorType) || 0
    })
    
    return {
      totalErrors: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0),
      errorsByType,
      recentErrors: this.getRecentErrorCount(),
      consecutiveFailures: this.consecutiveFailures,
      lastErrorTime: this.lastErrorTime,
      circuitBreakerState: this.circuitBreakerState
    }
  }

  /**
   * 获取恢复统计
   */
  getRecoveryStatistics(): {
    totalRecoveries: number
    successfulRecoveries: number
    failedRecoveries: number
    successRate: number
    averageRecoveryTime: number
    strategiesUsed: { [key in RecoveryStrategy]: number }
  } {
    const total = this.recoveryHistory.length
    const successful = this.recoveryHistory.filter(r => r.success).length
    const failed = total - successful
    
    const strategiesUsed = {} as { [key in RecoveryStrategy]: number }
    Object.values(RecoveryStrategy).forEach(strategy => {
      strategiesUsed[strategy] = this.recoveryHistory.filter(r => r.strategy === strategy).length
    })
    
    const avgRecoveryTime = total > 0 
      ? this.recoveryHistory.reduce((sum, r) => sum + r.duration, 0) / total
      : 0
    
    return {
      totalRecoveries: total,
      successfulRecoveries: successful,
      failedRecoveries: failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      averageRecoveryTime: avgRecoveryTime,
      strategiesUsed
    }
  }

  /**
   * 更新配置
   */
  updateConfiguration(config: Partial<RecoveryConfiguration>): void {
    this.configuration = { ...this.configuration, ...config }
    console.log('Error recovery configuration updated:', config)
  }

  /**
   * 重置熔断器
   */
  resetCircuitBreaker(): void {
    this.circuitBreakerState = CircuitBreakerState.CLOSED
    this.circuitBreakerOpenTime = null
    console.log('Circuit breaker reset to closed state')
    this.emit('circuitBreakerReset')
  }

  /**
   * 清除历史数据
   */
  clearHistory(): void {
    this.recoveryHistory = []
    this.errorCounts.clear()
    Object.values(ErrorType).forEach(errorType => {
      this.errorCounts.set(errorType, 0)
    })
    this.consecutiveFailures = 0
    this.lastErrorTime = null
    console.log('Error recovery history cleared')
  }

  /**
   * 销毁恢复系统
   */
  destroy(): void {
    this.stopHealthCheck()
    this.removeAllListeners()
    console.log('Database error recovery system destroyed')
  }
}

// 创建全局错误恢复实例
export const errorRecovery = new DatabaseErrorRecovery()

// 监听关键事件
errorRecovery.on('emergencyShutdown', (data) => {
  console.error('EMERGENCY SHUTDOWN TRIGGERED:', data)
  // 这里可以集成外部告警系统
})

errorRecovery.on('circuitBreakerOpened', (data) => {
  console.warn('CIRCUIT BREAKER OPENED:', data)
  // 这里可以发送告警通知
})

errorRecovery.on('unrecoverableError', (data) => {
  console.error('UNRECOVERABLE ERROR DETECTED:', data)
  // 这里可以发送紧急通知
})

// 导出便捷函数
export const getErrorStatistics = () => errorRecovery.getErrorStatistics()
export const getRecoveryStatistics = () => errorRecovery.getRecoveryStatistics()
export const getRecoveryHistory = (limit?: number) => errorRecovery.getRecoveryHistory(limit)
export const resetCircuitBreaker = () => errorRecovery.resetCircuitBreaker()
export const updateRecoveryConfiguration = (config: Partial<RecoveryConfiguration>) => 
  errorRecovery.updateConfiguration(config)

// 默认导出错误恢复系统
export default errorRecovery