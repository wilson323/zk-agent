// @ts-nocheck
/**
 * @file Error Retry Manager
 * @description 错误重试管理器，提供智能重试策略和错误处理
 * @author ZK-Agent Team A
 * @date 2024-12-19
 */

import { ErrorType } from '../types/enums';

// 重试策略
export interface RetryStrategy {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
  jitter: boolean
  retryableErrors: ErrorType[]
}

import { ErrorInfo } from '../types/interfaces';

// 重试结果
export interface RetryResult<T> {
  success: boolean
  data?: T
  error?: ErrorInfo
  totalRetries: number
  totalDuration: number
  attempts: Array<{
    attempt: number
    error?: ErrorInfo
    duration: number
    timestamp: Date
  }>
}

// 重试配置
export interface RetryConfig {
  strategy?: Partial<RetryStrategy>
  onRetry?: (error: ErrorInfo, attempt: number) => void
  onSuccess?: (result: any, attempts: number) => void
  onFailure?: (error: ErrorInfo, attempts: number) => void
  shouldRetry?: (error: ErrorInfo) => boolean
}

/**
 * 错误重试管理器
 */
export class ErrorRetryManager {
  private defaultStrategy: RetryStrategy = {
    maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
    jitter: true,
      retryableErrors: [
      ErrorType.NETWORK,
      ErrorType.TIMEOUT,
      ErrorType.RATE_LIMIT,
      ErrorType.SERVER
    ]
  }

  private errorStats = new Map<string, {
    count: number
    lastOccurred: Date
    successRate: number
    averageRetries: number
  }>()

  constructor(defaultStrategy?: Partial<RetryStrategy>) {
    if (defaultStrategy) {
      this.defaultStrategy = { ...this.defaultStrategy, ...defaultStrategy }
    }
  }

  /**
   * 执行带重试的异步操作
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig = {}
  ): Promise<RetryResult<T>> {
    const strategy = { ...this.defaultStrategy, ...config.strategy }
    const startTime = Date.now()
    const attempts: RetryResult<T>['attempts'] = []
    
    let lastError: ErrorInfo | undefined

    for (let attempt = 0; attempt <= strategy.maxRetries; attempt++) {
      const attemptStartTime = Date.now()
      
      try {
        const result = await operation()
        const duration = Date.now() - attemptStartTime
        
        attempts.push({
          attempt: attempt + 1,
          duration,
          timestamp: new Date()
        })

        // 记录成功
        if (config.onSuccess) {
          config.onSuccess(result, attempt + 1)
        }

        // 更新统计
        this.updateSuccessStats(operation.name || 'anonymous', attempt)

        return {
            success: true,
          data: result,
          totalRetries: attempt,
          totalDuration: Date.now() - startTime,
          attempts
        }
        } catch (error) {
        const duration = Date.now() - attemptStartTime
        const errorInfo = this.parseError(error, attempt)
        
        attempts.push({
          attempt: attempt + 1,
          error: errorInfo,
          duration,
          timestamp: new Date()
        })

        lastError = errorInfo

        // 更新错误统计
        this.updateErrorStats(operation.name || 'anonymous', errorInfo)

          // 检查是否应该重试
        const shouldRetry = this.shouldRetry(errorInfo, attempt, strategy, config.shouldRetry)
        
        if (!shouldRetry || attempt >= strategy.maxRetries) {
          break
        }

        // 执行重试回调
        if (config.onRetry) {
          config.onRetry(errorInfo, attempt + 1)
        }

        // 等待重试延迟
        const delay = this.calculateDelay(attempt, strategy)
        await this.sleep(delay)
      }
    }

    // 执行失败回调
    if (config.onFailure && lastError) {
      config.onFailure(lastError, attempts.length)
    }

    return {
      success: false,
      error: lastError,
      totalRetries: attempts.length - 1,
      totalDuration: Date.now() - startTime,
      attempts
    }
  }

  /**
   * 创建重试装饰器
   */
  createRetryDecorator(config: RetryConfig = {}) {
    return <T extends (...args: any[]) => Promise<any>>(
      target: any,
      propertyKey: string,
      descriptor: TypedPropertyDescriptor<T>
    ) => {
      const originalMethod = descriptor.value!

      descriptor.value = async function (this: any, ...args: any[]) {
        const result = await this.executeWithRetry(
          () => originalMethod.apply(this, args),
          config
        )

        if (result.success) {
          return result.data
        } else {
          throw result.error
        }
      } as T

      return descriptor
    }
  }

  /**
   * 批量重试操作
   */
  async executeBatch<T>(
    operations: Array<() => Promise<T>>,
    config: RetryConfig & {
      concurrency?: number
      failFast?: boolean
    } = {}
  ): Promise<Array<RetryResult<T>>> {
    const { concurrency = 3, failFast = false } = config
    const results: Array<RetryResult<T>> = []
    
    // 分批执行
    for (let i = 0; i < operations.length; i += concurrency) {
      const batch = operations.slice(i, i + concurrency)
      
      const batchPromises = batch.map(operation => 
        this.executeWithRetry(operation, config)
      )

      const batchResults = await Promise.allSettled(batchPromises)
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value)
          
          // 如果启用快速失败且有失败，停止执行
          if (failFast && !result.value.success) {
            return results
          }
        } else {
          // Promise被拒绝，创建失败结果
          results.push({
            success: false,
            error: this.parseError(result.reason, 0),
            totalRetries: 0,
            totalDuration: 0,
            attempts: []
          })
          
          if (failFast) {
            return results
          }
        }
      }
    }

    return results
  }

  /**
   * 获取错误统计
   */
  getErrorStats(operationName?: string) {
    if (operationName) {
      return this.errorStats.get(operationName)
    }
    
    return Object.fromEntries(this.errorStats.entries())
  }

  /**
   * 获取所有操作的统计信息
   */
  getAllStats() {
    return this.errorStats
  }

  /**
   * 清除错误统计
   */
  clearErrorStats(operationName?: string) {
    if (operationName) {
      this.errorStats.delete(operationName)
    } else {
      this.errorStats.clear()
    }
  }

  /**
   * 创建断路器模式
   */
  createCircuitBreaker(config: {
    failureThreshold: number
    resetTimeout: number
    monitoringPeriod: number
  }) {
    let state: 'closed' | 'open' | 'half-open' = 'closed'
    let failureCount = 0
    let lastFailureTime = 0
    let successCount = 0

    return async <T>(operation: () => Promise<T>): Promise<T> => {
      const now = Date.now()

      // 检查是否应该重置
      if (state === 'open' && now - lastFailureTime > config.resetTimeout) {
        state = 'half-open'
        successCount = 0
      }

      // 如果断路器开启，直接抛出错误
      if (state === 'open') {
        throw new Error('Circuit breaker is open')
      }

      try {
        const result = await operation()
        
        // 成功执行
        if (state === 'half-open') {
          successCount++
          if (successCount >= 3) { // 连续3次成功后关闭断路器
            state = 'closed'
            failureCount = 0
          }
        } else {
          failureCount = 0
        }

        return result
      } catch (error) {
        failureCount++
        lastFailureTime = now

        if (failureCount >= config.failureThreshold) {
          state = 'open'
        }

        throw error
      }
    }
  }

  // 私有方法

  private parseError(error: any, retryCount: number): ErrorInfo {
    let type = ErrorType.UNKNOWN
    let message = 'Unknown error'
    let code: string | number | undefined
    let statusCode: number | undefined

    if (error instanceof Error) {
      message = error.message
      
      // 根据错误消息判断类型
      if (error.message.includes('network') || error.message.includes('fetch')) {
        type = ErrorType.NETWORK
      } else if (error.message.includes('timeout')) {
        type = ErrorType.TIMEOUT
      } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
        type = ErrorType.AUTH
      }
    }

    // 处理HTTP错误
    if (error.response) {
      statusCode = error.response.status
      
      if (statusCode && statusCode >= 400 && statusCode < 500) {
        type = statusCode === 401 ? ErrorType.AUTH : ErrorType.CLIENT
      } else if (statusCode && statusCode >= 500) {
        type = ErrorType.SERVER
      } else if (statusCode === 429) {
        type = ErrorType.RATE_LIMIT
      }
    }

    // 处理网络错误
    if (error.code) {
      code = error.code
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        type = ErrorType.NETWORK
      } else if (error.code === 'ETIMEDOUT') {
        type = ErrorType.TIMEOUT
      }
    }

    const isRetryable = this.defaultStrategy.retryableErrors.includes(type)

    return {
      type,
      message,
      code,
      statusCode,
      timestamp: new Date(),
      retryCount,
      isRetryable,
      metadata: {
        originalError: error
      }
    }
  }

  private shouldRetry(
    error: ErrorInfo,
    attempt: number,
    strategy: RetryStrategy,
    customShouldRetry?: (error: ErrorInfo) => boolean
  ): boolean {
    // 如果有自定义重试逻辑，优先使用
    if (customShouldRetry) {
      return customShouldRetry(error)
    }

    // 检查是否达到最大重试次数
    if (attempt >= strategy.maxRetries) {
      return false
    }

    // 检查错误类型是否可重试
    return strategy.retryableErrors.includes(error.type)
  }

  private calculateDelay(attempt: number, strategy: RetryStrategy): number {
    let delay = strategy.baseDelay * Math.pow(strategy.backoffMultiplier, attempt)
    
    // 限制最大延迟
    delay = Math.min(delay, strategy.maxDelay)
    
    // 添加抖动
    if (strategy.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5)
    }
    
    return Math.floor(delay)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private updateErrorStats(operationName: string, error: ErrorInfo) {
    const stats = this.errorStats.get(operationName) || {
      count: 0,
      lastOccurred: new Date(),
      successRate: 1.0,
      averageRetries: 0
    }

    stats.count++
    stats.lastOccurred = error.timestamp
    stats.averageRetries = (stats.averageRetries * (stats.count - 1) + error.retryCount) / stats.count

    this.errorStats.set(operationName, stats)
  }

  private updateSuccessStats(operationName: string, retries: number) {
    const stats = this.errorStats.get(operationName) || {
      count: 0,
      lastOccurred: new Date(),
      successRate: 1.0,
      averageRetries: 0
    }

    // 更新成功率（简化计算）
    const totalOperations = stats.count + 1
    stats.successRate = (stats.successRate * stats.count + 1) / totalOperations
    stats.averageRetries = (stats.averageRetries * stats.count + retries) / totalOperations

    this.errorStats.set(operationName, stats)
  }
}

// 创建默认实例
export const errorRetryManager = new ErrorRetryManager()

// 导出装饰器
export const retry = (config?: RetryConfig) => 
  errorRetryManager.createRetryDecorator(config)

// 导出类型（避免重复导出冲突）
export type {
  RetryStrategy as IRetryStrategy,
  ErrorInfo as IErrorInfo,
  RetryResult as IRetryResult,
  RetryConfig as IRetryConfig
}
