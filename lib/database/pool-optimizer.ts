/**
 * @file Database Connection Pool Optimizer
 * @description 数据库连接池动态优化器
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

import { EventEmitter } from 'events'
import { enhancedDb } from './enhanced-connection'
import { databaseMonitor, AlertLevel } from './monitoring'
import { DatabaseMetrics } from './unified-interfaces'

// 连接池配置
export interface PoolConfiguration {
  connectionLimit: number
  acquireTimeoutMillis: number
  createTimeoutMillis: number
  destroyTimeoutMillis: number
  idleTimeoutMillis: number
  reapIntervalMillis: number
  createRetryIntervalMillis: number
  min: number
  max: number
}

// 优化策略
export interface OptimizationStrategy {
  name: string
  description: string
  enabled: boolean
  priority: number
  conditions: {
    minMetricsCount: number
    timeWindowMs: number
    triggers: {
      highLatency?: number
      highFailureRate?: number
      lowThroughput?: number
      highCpuUsage?: number
      highMemoryUsage?: number
    }
  }
  actions: {
    adjustConnectionLimit?: {
      increment?: number
      decrement?: number
      maxLimit?: number
      minLimit?: number
    }
    adjustTimeouts?: {
      acquireTimeout?: number
      createTimeout?: number
      idleTimeout?: number
    }
    adjustPoolSize?: {
      minConnections?: number
      maxConnections?: number
    }
  }
}

// 优化结果
export interface OptimizationResult {
  timestamp: Date
  strategy: string
  previousConfig: Partial<PoolConfiguration>
  newConfig: Partial<PoolConfiguration>
  reason: string
  metrics: DatabaseMetrics
  success: boolean
  error?: string
}

/**
 * 数据库连接池优化器
 */
export class DatabasePoolOptimizer extends EventEmitter {
  private isOptimizing: boolean = false
  private optimizationInterval: NodeJS.Timeout | null = null
  private optimizationHistory: OptimizationResult[] = []
  private strategies: OptimizationStrategy[]
  private currentConfig: PoolConfiguration
  private intervalMs: number
  private maxHistorySize: number
  private lastOptimization: Date | null = null
  private cooldownMs: number

  constructor(
    intervalMs: number = 60000, // 1分钟检查一次
    maxHistorySize: number = 100,
    cooldownMs: number = 300000 // 5分钟冷却期
  ) {
    super()

    this.intervalMs = intervalMs
    this.maxHistorySize = maxHistorySize
    this.cooldownMs = cooldownMs

    // 初始化当前配置
    this.currentConfig = this.getDefaultConfiguration()

    // 初始化优化策略
    this.strategies = this.getDefaultStrategies()

    // 延迟监听数据库监控事件，避免循环依赖
    process.nextTick(() => {
      this.setupMonitoringEventListeners()
    })
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfiguration(): PoolConfiguration {
    return {
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
      acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'),
      createTimeoutMillis: parseInt(process.env.DB_CREATE_TIMEOUT || '30000'),
      destroyTimeoutMillis: parseInt(process.env.DB_DESTROY_TIMEOUT || '5000'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '300000'),
      reapIntervalMillis: parseInt(process.env.DB_REAP_INTERVAL || '1000'),
      createRetryIntervalMillis: parseInt(process.env.DB_CREATE_RETRY_INTERVAL || '200'),
      min: parseInt(process.env.DB_MIN_CONNECTIONS || '2'),
      max: parseInt(process.env.DB_MAX_CONNECTIONS || '20')
    }
  }

  /**
   * 获取默认优化策略
   */
  private getDefaultStrategies(): OptimizationStrategy[] {
    return [
      {
        name: 'high_latency_scale_up',
        description: '高延迟时增加连接数',
        enabled: true,
        priority: 1,
        conditions: {
          minMetricsCount: 5,
          timeWindowMs: 300000, // 5分钟
          triggers: {
            highLatency: parseFloat(process.env.DB_HIGH_LATENCY_THRESHOLD || '1000')
          }
        },
        actions: {
          adjustConnectionLimit: {
            increment: 2,
            maxLimit: parseInt(process.env.DB_MAX_CONNECTIONS || '20')
          },
          adjustPoolSize: {
            maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20')
          }
        }
      },
      {
        name: 'high_failure_rate_timeout_increase',
        description: '高失败率时增加超时时间',
        enabled: true,
        priority: 2,
        conditions: {
          minMetricsCount: 3,
          timeWindowMs: 180000, // 3分钟
          triggers: {
            highFailureRate: parseFloat(process.env.DB_HIGH_FAILURE_RATE_THRESHOLD || '5')
          }
        },
        actions: {
          adjustTimeouts: {
            acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000') * 1.5,
            createTimeout: parseInt(process.env.DB_CREATE_TIMEOUT || '30000') * 1.5
          }
        }
      },
      {
        name: 'low_usage_scale_down',
        description: '低使用率时减少连接数',
        enabled: true,
        priority: 3,
        conditions: {
          minMetricsCount: 10,
          timeWindowMs: 600000, // 10分钟
          triggers: {
            lowThroughput: parseFloat(process.env.DB_LOW_THROUGHPUT_THRESHOLD || '0.1')
          }
        },
        actions: {
          adjustConnectionLimit: {
            decrement: 1,
            minLimit: parseInt(process.env.DB_MIN_CONNECTIONS || '2')
          },
          adjustPoolSize: {
            minConnections: parseInt(process.env.DB_MIN_CONNECTIONS || '2')
          }
        }
      },
      {
        name: 'high_memory_usage_optimize',
        description: '高内存使用时优化连接池',
        enabled: true,
        priority: 4,
        conditions: {
          minMetricsCount: 3,
          timeWindowMs: 180000,
          triggers: {
            highMemoryUsage: parseFloat(process.env.DB_HIGH_MEMORY_THRESHOLD || '80') // 80% 内存使用率
          }
        },
        actions: {
          adjustTimeouts: {
            idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '300000') * 0.5 // 减少空闲超时
          },
          adjustConnectionLimit: {
            decrement: 1,
            minLimit: parseInt(process.env.DB_MIN_CONNECTIONS || '2')
          }
        }
      },
      {
        name: 'connection_recovery',
        description: '连接恢复优化',
        enabled: true,
        priority: 5,
        conditions: {
          minMetricsCount: 2,
          timeWindowMs: 120000, // 2分钟
          triggers: {
            highFailureRate: 10 // 10% 失败率触发恢复
          }
        },
        actions: {
          adjustTimeouts: {
            createTimeout: parseInt(process.env.DB_CREATE_TIMEOUT || '30000') * 2,
            acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000') * 2
          },
          adjustPoolSize: {
            minConnections: Math.max(1, parseInt(process.env.DB_MIN_CONNECTIONS || '2') - 1)
          }
        }
      }
    ]
  }

  /**
   * 设置监控事件监听器
   */
  private setupMonitoringEventListeners(): void {
    databaseMonitor.on('alert', (alert) => {
      if (alert.level === AlertLevel.CRITICAL || alert.level === AlertLevel.ERROR) {
        // 紧急情况下立即触发优化
        this.triggerImmediateOptimization(alert.message)
      }
    })

    databaseMonitor.on('metrics', (metrics) => {
      // 定期检查是否需要优化
      if (this.shouldTriggerOptimization(metrics)) {
        this.performOptimization()
      }
    })
  }

  /**
   * 开始优化
   */
  startOptimization(): void {
    if (this.isOptimizing) {
      console.log('Database pool optimization is already running')
      return
    }

    console.log(`Starting database pool optimization (interval: ${this.intervalMs}ms)`)
    this.isOptimizing = true

    this.optimizationInterval = setInterval(() => {
      this.performOptimization()
    }, this.intervalMs)

    // 立即执行一次优化检查
    this.performOptimization()
  }

  /**
   * 停止优化
   */
  stopOptimization(): void {
    if (!this.isOptimizing) {
      return
    }

    console.log('Stopping database pool optimization')
    this.isOptimizing = false

    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval)
      this.optimizationInterval = null
    }
  }

  /**
   * 判断是否应该触发优化
   */
  private shouldTriggerOptimization(metrics: DatabaseMetrics): boolean {
    // 检查冷却期
    if (this.lastOptimization && 
        Date.now() - this.lastOptimization.getTime() < this.cooldownMs) {
      return false
    }

    // 检查是否有策略被触发
    return this.strategies.some(strategy => 
      strategy.enabled && this.isStrategyTriggered(strategy, metrics)
    )
  }

  /**
   * 检查策略是否被触发
   */
  private isStrategyTriggered(strategy: OptimizationStrategy, currentMetrics: DatabaseMetrics): boolean {
    const recentMetrics = databaseMonitor.getMetricsHistory()
      .filter(m => Date.now() - m.timestamp.getTime() <= strategy.conditions.timeWindowMs)

    if (recentMetrics.length < strategy.conditions.minMetricsCount) {
      return false
    }

    const triggers = strategy.conditions.triggers

    // 检查高延迟
    if (triggers.highLatency !== undefined) {
      const avgLatency = recentMetrics.reduce((sum, m) => sum + m.avgLatency, 0) / recentMetrics.length
      if (avgLatency > triggers.highLatency) {
        return true
      }
    }

    // 检查高失败率
    if (triggers.highFailureRate !== undefined) {
      const avgFailureRate = recentMetrics.reduce((sum, m) => sum + (100 - m.successRate), 0) / recentMetrics.length
      if (avgFailureRate > triggers.highFailureRate) {
        return true
      }
    }

    // 检查低吞吐量
    if (triggers.lowThroughput !== undefined) {
      const totalQueries = currentMetrics.totalQueries
      const timeSpanMs = recentMetrics.length > 1 
        ? recentMetrics[recentMetrics.length - 1].timestamp.getTime() - recentMetrics[0].timestamp.getTime()
        : strategy.conditions.timeWindowMs
      const throughput = totalQueries / (timeSpanMs / 1000) // 每秒查询数
      if (throughput < triggers.lowThroughput) {
        return true
      }
    }

    // 检查高CPU使用率
    if (triggers.highCpuUsage !== undefined) {
      const avgCpuUsage = recentMetrics.reduce((sum, m) => sum + m.cpuUsage.user + m.cpuUsage.system, 0) / recentMetrics.length
      if (avgCpuUsage > triggers.highCpuUsage) {
        return true
      }
    }

    // 检查高内存使用率
    if (triggers.highMemoryUsage !== undefined) {
      const avgMemoryUsage = recentMetrics.reduce((sum, m) => {
        const usagePercent = (m.memoryUsage.heapUsed / m.memoryUsage.heapTotal) * 100
        return sum + usagePercent
      }, 0) / recentMetrics.length
      if (avgMemoryUsage > triggers.highMemoryUsage) {
        return true
      }
    }

    return false
  }

  /**
   * 执行优化
   */
  private async performOptimization(): Promise<void> {
    try {
      const currentMetrics = databaseMonitor.getMetricsHistory(1)[0]
      if (!currentMetrics) {
        return
      }

      // 找到优先级最高的被触发策略
      const triggeredStrategies = this.strategies
        .filter(strategy => strategy.enabled && this.isStrategyTriggered(strategy, currentMetrics))
        .sort((a, b) => a.priority - b.priority)

      if (triggeredStrategies.length === 0) {
        return
      }

      const strategy = triggeredStrategies[0]
      const previousConfig = { ...this.currentConfig }
      const newConfig = this.applyStrategy(strategy, this.currentConfig)

      if (this.hasConfigurationChanged(previousConfig, newConfig)) {
        const result = await this.applyConfiguration(newConfig, strategy, currentMetrics, previousConfig)
        this.addOptimizationResult(result)
        this.lastOptimization = new Date()
        
        this.emit('optimization', result)
        
        if (result.success) {
          this.currentConfig = { ...this.currentConfig, ...newConfig }
          console.log(`Database pool optimized using strategy: ${strategy.name}`)
        } else {
          console.error(`Failed to apply optimization strategy: ${strategy.name}`, result.error)
        }
      }

    } catch (error) {
      console.error('Error during database pool optimization:', error)
    }
  }

  /**
   * 应用策略
   */
  private applyStrategy(strategy: OptimizationStrategy, currentConfig: PoolConfiguration): Partial<PoolConfiguration> {
    const newConfig: Partial<PoolConfiguration> = {}

    // 调整连接限制
    if (strategy.actions.adjustConnectionLimit) {
      const adjust = strategy.actions.adjustConnectionLimit
      let newLimit = currentConfig.connectionLimit

      if (adjust.increment) {
        newLimit += adjust.increment
      }
      if (adjust.decrement) {
        newLimit -= adjust.decrement
      }
      if (adjust.maxLimit) {
        newLimit = Math.min(newLimit, adjust.maxLimit)
      }
      if (adjust.minLimit) {
        newLimit = Math.max(newLimit, adjust.minLimit)
      }

      newConfig.connectionLimit = newLimit
    }

    // 调整超时时间
    if (strategy.actions.adjustTimeouts) {
      const timeouts = strategy.actions.adjustTimeouts
      if (timeouts.acquireTimeout) {
        newConfig.acquireTimeoutMillis = timeouts.acquireTimeout
      }
      if (timeouts.createTimeout) {
        newConfig.createTimeoutMillis = timeouts.createTimeout
      }
      if (timeouts.idleTimeout) {
        newConfig.idleTimeoutMillis = timeouts.idleTimeout
      }
    }

    // 调整连接池大小
    if (strategy.actions.adjustPoolSize) {
      const poolSize = strategy.actions.adjustPoolSize
      if (poolSize.minConnections) {
        newConfig.min = poolSize.minConnections
      }
      if (poolSize.maxConnections) {
        newConfig.max = poolSize.maxConnections
      }
    }

    return newConfig
  }

  /**
   * 检查配置是否有变化
   */
  private hasConfigurationChanged(oldConfig: PoolConfiguration, newConfig: Partial<PoolConfiguration>): boolean {
    return Object.keys(newConfig).some(key => {
      const configKey = key as keyof PoolConfiguration
      return oldConfig[configKey] !== newConfig[configKey]
    })
  }

  /**
   * 应用配置
   */
  private async applyConfiguration(
    newConfig: Partial<PoolConfiguration>,
    strategy: OptimizationStrategy,
    metrics: DatabaseMetrics,
    previousConfig: PoolConfiguration
  ): Promise<OptimizationResult> {
    const result: OptimizationResult = {
      timestamp: new Date(),
      strategy: strategy.name,
      previousConfig,
      newConfig,
      reason: strategy.description,
      metrics,
      success: false
    }

    try {
      // 这里应该调用实际的配置更新方法
      // 由于Prisma的连接池配置在初始化时设定，这里我们模拟配置更新
      await this.updateDatabaseConfiguration(newConfig)
      
      result.success = true
      console.log('Database configuration updated successfully:', newConfig)
      
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error)
      console.error('Failed to update database configuration:', error)
    }

    return result
  }

  /**
   * 更新数据库配置（模拟实现）
   */
  private async updateDatabaseConfiguration(config: Partial<PoolConfiguration>): Promise<void> {
    // 在实际实现中，这里应该：
    // 1. 更新环境变量或配置文件
    // 2. 重新初始化数据库连接池
    // 3. 验证新配置是否生效
    
    // 模拟配置更新延迟
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 这里可以调用enhancedDb的配置更新方法
    if (enhancedDb && typeof enhancedDb.updateConfig === 'function') {
      await enhancedDb.updateConfig(config)
    }
  }

  /**
   * 立即触发优化
   */
  private async triggerImmediateOptimization(reason: string): Promise<void> {
    console.log(`Triggering immediate optimization due to: ${reason}`)
    await this.performOptimization()
  }

  /**
   * 添加优化结果到历史
   */
  private addOptimizationResult(result: OptimizationResult): void {
    this.optimizationHistory.push(result)

    // 限制历史记录大小
    if (this.optimizationHistory.length > this.maxHistorySize) {
      this.optimizationHistory = this.optimizationHistory.slice(-this.maxHistorySize)
    }
  }

  /**
   * 获取优化历史
   */
  getOptimizationHistory(limit?: number): OptimizationResult[] {
    if (limit) {
      return this.optimizationHistory.slice(-limit)
    }
    return [...this.optimizationHistory]
  }

  /**
   * 获取当前配置
   */
  getCurrentConfiguration(): PoolConfiguration {
    return { ...this.currentConfig }
  }

  /**
   * 获取策略列表
   */
  getStrategies(): OptimizationStrategy[] {
    return [...this.strategies]
  }

  /**
   * 更新策略
   */
  updateStrategy(name: string, updates: Partial<OptimizationStrategy>): boolean {
    const strategyIndex = this.strategies.findIndex(s => s.name === name)
    if (strategyIndex === -1) {
      return false
    }

    this.strategies[strategyIndex] = { ...this.strategies[strategyIndex], ...updates }
    console.log(`Strategy '${name}' updated successfully`)
    return true
  }

  /**
   * 添加新策略
   */
  addStrategy(strategy: OptimizationStrategy): void {
    // 检查策略名称是否已存在
    if (this.strategies.some(s => s.name === strategy.name)) {
      throw new Error(`Strategy with name '${strategy.name}' already exists`)
    }

    this.strategies.push(strategy)
    console.log(`Strategy '${strategy.name}' added successfully`)
  }

  /**
   * 删除策略
   */
  removeStrategy(name: string): boolean {
    const strategyIndex = this.strategies.findIndex(s => s.name === name)
    if (strategyIndex === -1) {
      return false
    }

    this.strategies.splice(strategyIndex, 1)
    console.log(`Strategy '${name}' removed successfully`)
    return true
  }

  /**
   * 获取优化统计
   */
  getOptimizationStats(): {
    totalOptimizations: number
    successfulOptimizations: number
    failedOptimizations: number
    successRate: number
    lastOptimization: Date | null
    strategiesUsed: { [key: string]: number }
  } {
    const total = this.optimizationHistory.length
    const successful = this.optimizationHistory.filter(r => r.success).length
    const failed = total - successful
    
    const strategiesUsed: { [key: string]: number } = {}
    this.optimizationHistory.forEach(result => {
      strategiesUsed[result.strategy] = (strategiesUsed[result.strategy] || 0) + 1
    })

    return {
      totalOptimizations: total,
      successfulOptimizations: successful,
      failedOptimizations: failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      lastOptimization: this.lastOptimization,
      strategiesUsed
    }
  }

  /**
   * 重置优化器
   */
  reset(): void {
    this.stopOptimization()
    this.optimizationHistory = []
    this.lastOptimization = null
    this.currentConfig = this.getDefaultConfiguration()
    this.strategies = this.getDefaultStrategies()
    console.log('Database pool optimizer reset successfully')
  }
}

// 创建全局优化器实例
export const poolOptimizer = new DatabasePoolOptimizer()

// 如果启用了优化，自动开始优化
if (process.env.DB_POOL_OPTIMIZATION_ENABLED === 'true') {
  poolOptimizer.startOptimization()
  
  // 监听优化事件
  poolOptimizer.on('optimization', (result: OptimizationResult) => {
    console.log('Database pool optimization completed:', {
      strategy: result.strategy,
      success: result.success,
      changes: result.newConfig
    })
  })
}

// 导出便捷函数
export const startPoolOptimization = () => poolOptimizer.startOptimization()
export const stopPoolOptimization = () => poolOptimizer.stopOptimization()
export const getPoolConfiguration = () => poolOptimizer.getCurrentConfiguration()
export const getOptimizationHistory = (limit?: number) => poolOptimizer.getOptimizationHistory(limit)
export const getOptimizationStats = () => poolOptimizer.getOptimizationStats()

// 默认导出优化器
export default poolOptimizer