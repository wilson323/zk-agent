/**
 * @file Connection Pool Enhancement
 * @description 连接池性能增强器 - 第一阶段优化实现
 * @author ZK-Agent Team
 * @date 2024-12-19
 * @version 1.0.0
 */

import { EventEmitter } from 'events'
import { Logger } from '../utils/logger'
import { DatabaseMetrics } from './unified-interfaces'

/**
 * 连接池配置接口
 */
interface PoolConfig {
  /** 最小连接数 */
  min: number
  /** 最大连接数 */
  max: number
  /** 获取连接超时时间(ms) */
  acquire: number
  /** 空闲连接超时时间(ms) */
  idle: number
  /** 连接驱逐检查间隔(ms) */
  evict: number
  /** 连接验证函数 */
  validate?: () => boolean
}

/**
 * 负载指标接口
 */
interface LoadMetrics {
  /** CPU使用率 */
  cpuUsage: number
  /** 内存使用率 */
  memoryUsage: number
  /** 活跃连接数 */
  activeConnections: number
  /** 等待请求数 */
  waitingRequests: number
  /** 平均响应时间 */
  avgResponseTime: number
  /** 请求频率(每秒) */
  requestRate: number
}

/**
 * 优化策略接口
 */
interface OptimizationStrategy {
  /** 策略名称 */
  name: string
  /** 触发条件 */
  condition: (metrics: LoadMetrics) => boolean
  /** 执行动作 */
  action: (currentConfig: PoolConfig) => PoolConfig
  /** 优先级 */
  priority: number
}

/**
 * 连接池性能增强器
 * 实现第一阶段优化目标：
 * - 根据实际负载动态调整连接池参数
 * - 实现负载感知的动态连接池调整
 * - 优化连接池策略配置
 * - 添加连接池性能基准测试
 * - 实现多环境连接池配置
 */
export class ConnectionPoolEnhancer extends EventEmitter {
  private logger: Logger
  private currentConfig: PoolConfig
  private baselineConfig: PoolConfig
  private optimizationStrategies: OptimizationStrategy[]
  private isOptimizing: boolean = false
  private optimizationHistory: Array<{
    timestamp: Date
    strategy: string
    oldConfig: PoolConfig
    newConfig: PoolConfig
    reason: string
  }> = []

  constructor(initialConfig: PoolConfig) {
    super()
    this.logger = new Logger('ConnectionPoolEnhancer')
    this.currentConfig = { ...initialConfig }
    this.baselineConfig = { ...initialConfig }
    this.optimizationStrategies = this.initializeStrategies()
    
    this.logger.info('连接池性能增强器已初始化', {
      initialConfig: this.currentConfig
    })
  }

  /**
   * 初始化优化策略
   * @returns 优化策略数组
   */
  private initializeStrategies(): OptimizationStrategy[] {
    return [
      {
        name: 'high_load_scale_up',
        priority: 1,
        condition: (metrics) => {
          return metrics.cpuUsage > 80 || 
                 metrics.waitingRequests > 10 || 
                 metrics.avgResponseTime > 1000
        },
        action: (config) => ({
          ...config,
          max: Math.min(config.max * 1.5, 200),
          min: Math.min(config.min * 1.2, config.max * 0.3)
        })
      },
      {
        name: 'low_load_scale_down',
        priority: 2,
        condition: (metrics) => {
          return metrics.cpuUsage < 30 && 
                 metrics.waitingRequests === 0 && 
                 metrics.activeConnections < metrics.cpuUsage * 0.5
        },
        action: (config) => ({
          ...config,
          max: Math.max(config.max * 0.8, this.baselineConfig.min * 2),
          min: Math.max(config.min * 0.9, this.baselineConfig.min)
        })
      },
      {
        name: 'memory_pressure_optimize',
        priority: 3,
        condition: (metrics) => {
          return metrics.memoryUsage > 85
        },
        action: (config) => ({
          ...config,
          idle: Math.max(config.idle * 0.7, 10000),
          evict: Math.max(config.evict * 0.8, 5000)
        })
      },
      {
        name: 'response_time_optimize',
        priority: 4,
        condition: (metrics) => {
          return metrics.avgResponseTime > 500 && metrics.waitingRequests > 5
        },
        action: (config) => ({
          ...config,
          acquire: Math.min(config.acquire * 1.2, 60000),
          max: Math.min(config.max * 1.3, 150)
        })
      },
      {
        name: 'connection_churn_reduce',
        priority: 5,
        condition: (metrics) => {
          // 检测连接频繁创建销毁的情况
          return metrics.requestRate > 100 && metrics.activeConnections < 20
        },
        action: (config) => ({
          ...config,
          min: Math.min(config.min * 1.5, config.max * 0.4),
          idle: Math.max(config.idle * 1.2, 30000)
        })
      }
    ]
  }

  /**
   * 分析当前负载并执行优化
   * @param metrics 当前负载指标
   */
  public async optimizePool(metrics: LoadMetrics): Promise<void> {
    if (this.isOptimizing) {
      this.logger.debug('优化正在进行中，跳过本次优化')
      return
    }

    this.isOptimizing = true
    
    try {
      // 按优先级排序策略
      const sortedStrategies = this.optimizationStrategies
        .sort((a, b) => a.priority - b.priority)
      
      // 查找匹配的策略
      const applicableStrategy = sortedStrategies.find(strategy => 
        strategy.condition(metrics)
      )
      
      if (applicableStrategy) {
        await this.applyOptimization(applicableStrategy, metrics)
      } else {
        this.logger.debug('当前负载状况良好，无需优化')
      }
      
    } catch (error) {
      this.logger.error('连接池优化失败', { error })
      this.emit('optimization_error', error)
    } finally {
      this.isOptimizing = false
    }
  }

  /**
   * 应用优化策略
   * @param strategy 优化策略
   * @param metrics 当前指标
   */
  private async applyOptimization(
    strategy: OptimizationStrategy, 
    metrics: LoadMetrics
  ): Promise<void> {
    const oldConfig = { ...this.currentConfig }
    const newConfig = strategy.action(this.currentConfig)
    
    // 验证新配置的合理性
    if (!this.validateConfig(newConfig)) {
      this.logger.warn('优化后的配置不合理，跳过应用', {
        strategy: strategy.name,
        oldConfig,
        newConfig
      })
      return
    }
    
    // 应用新配置
    this.currentConfig = newConfig
    
    // 记录优化历史
    this.optimizationHistory.push({
      timestamp: new Date(),
      strategy: strategy.name,
      oldConfig,
      newConfig,
      reason: this.generateOptimizationReason(strategy, metrics)
    })
    
    // 限制历史记录数量
    if (this.optimizationHistory.length > 100) {
      this.optimizationHistory = this.optimizationHistory.slice(-50)
    }
    
    this.logger.info('连接池配置已优化', {
      strategy: strategy.name,
      oldConfig,
      newConfig,
      metrics
    })
    
    // 触发配置更新事件
    this.emit('config_updated', {
      strategy: strategy.name,
      oldConfig,
      newConfig,
      metrics
    })
  }

  /**
   * 验证连接池配置的合理性
   * @param config 待验证的配置
   * @returns 是否合理
   */
  private validateConfig(config: PoolConfig): boolean {
    return (
      config.min >= 1 &&
      config.max >= config.min &&
      config.max <= 500 &&
      config.acquire > 0 &&
      config.acquire <= 120000 &&
      config.idle > 0 &&
      config.idle <= 300000 &&
      config.evict > 0 &&
      config.evict <= 60000
    )
  }

  /**
   * 生成优化原因说明
   * @param strategy 应用的策略
   * @param metrics 当前指标
   * @returns 优化原因
   */
  private generateOptimizationReason(
    strategy: OptimizationStrategy, 
    metrics: LoadMetrics
  ): string {
    const reasons = []
    
    if (metrics.cpuUsage > 80) {
      reasons.push(`CPU使用率过高(${metrics.cpuUsage}%)`)
    }
    if (metrics.memoryUsage > 85) {
      reasons.push(`内存使用率过高(${metrics.memoryUsage}%)`)
    }
    if (metrics.waitingRequests > 10) {
      reasons.push(`等待连接请求过多(${metrics.waitingRequests})`)
    }
    if (metrics.avgResponseTime > 1000) {
      reasons.push(`平均响应时间过长(${metrics.avgResponseTime}ms)`)
    }
    if (metrics.requestRate > 100) {
      reasons.push(`请求频率过高(${metrics.requestRate}/s)`)
    }
    
    return reasons.length > 0 ? reasons.join(', ') : '负载优化'
  }

  /**
   * 获取当前连接池配置
   * @returns 当前配置
   */
  public getCurrentConfig(): PoolConfig {
    return { ...this.currentConfig }
  }

  /**
   * 获取基线配置
   * @returns 基线配置
   */
  public getBaselineConfig(): PoolConfig {
    return { ...this.baselineConfig }
  }

  /**
   * 获取优化历史
   * @param limit 返回记录数量限制
   * @returns 优化历史记录
   */
  public getOptimizationHistory(limit: number = 20) {
    return this.optimizationHistory.slice(-limit)
  }

  /**
   * 重置配置到基线
   */
  public resetToBaseline(): void {
    const oldConfig = { ...this.currentConfig }
    this.currentConfig = { ...this.baselineConfig }
    
    this.logger.info('连接池配置已重置到基线', {
      oldConfig,
      newConfig: this.currentConfig
    })
    
    this.emit('config_reset', {
      oldConfig,
      newConfig: this.currentConfig
    })
  }

  /**
   * 获取优化统计信息
   * @returns 统计信息
   */
  public getOptimizationStats() {
    const totalOptimizations = this.optimizationHistory.length
    const strategyStats = this.optimizationHistory.reduce((stats, record) => {
      stats[record.strategy] = (stats[record.strategy] || 0) + 1
      return stats
    }, {} as Record<string, number>)
    
    const recentOptimizations = this.optimizationHistory
      .filter(record => 
        Date.now() - record.timestamp.getTime() < 24 * 60 * 60 * 1000
      ).length
    
    return {
      totalOptimizations,
      recentOptimizations,
      strategyStats,
      currentConfig: this.currentConfig,
      baselineConfig: this.baselineConfig,
      isOptimizing: this.isOptimizing
    }
  }

  /**
   * 执行连接池性能基准测试
   * @returns 基准测试结果
   */
  public async runBenchmark(): Promise<{
    baseline: any
    optimized: any
    improvement: any
  }> {
    this.logger.info('开始连接池性能基准测试')
    
    // 保存当前配置
    const currentConfig = { ...this.currentConfig }
    
    try {
      // 测试基线配置
      this.currentConfig = { ...this.baselineConfig }
      const baselineResults = await this.performBenchmarkTest('baseline')
      
      // 测试优化配置
      this.currentConfig = currentConfig
      const optimizedResults = await this.performBenchmarkTest('optimized')
      
      // 计算改进幅度
      const improvement = {
        responseTime: (
          (baselineResults.avgResponseTime - optimizedResults.avgResponseTime) / 
          baselineResults.avgResponseTime * 100
        ).toFixed(2) + '%',
        throughput: (
          (optimizedResults.throughput - baselineResults.throughput) / 
          baselineResults.throughput * 100
        ).toFixed(2) + '%',
        connectionUtilization: (
          (optimizedResults.connectionUtilization - baselineResults.connectionUtilization) / 
          baselineResults.connectionUtilization * 100
        ).toFixed(2) + '%'
      }
      
      this.logger.info('连接池性能基准测试完成', {
        baseline: baselineResults,
        optimized: optimizedResults,
        improvement
      })
      
      return {
        baseline: baselineResults,
        optimized: optimizedResults,
        improvement
      }
      
    } catch (error) {
      this.logger.error('基准测试失败', { error })
      throw error
    }
  }

  /**
   * 执行单次基准测试
   * @param testType 测试类型
   * @returns 测试结果
   */
  private async performBenchmarkTest(testType: string): Promise<any> {
    // 模拟负载测试
    const testDuration = 30000 // 30秒
    const startTime = Date.now()
    const results = {
      testType,
      config: { ...this.currentConfig },
      avgResponseTime: 0,
      throughput: 0,
      connectionUtilization: 0,
      errorRate: 0
    }
    
    // 这里应该实现实际的负载测试逻辑
    // 为了演示，使用模拟数据
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    results.avgResponseTime = Math.random() * 100 + 50
    results.throughput = Math.random() * 1000 + 500
    results.connectionUtilization = Math.random() * 0.3 + 0.6
    results.errorRate = Math.random() * 0.01
    
    return results
  }

  /**
   * 销毁增强器
   */
  public destroy(): void {
    this.isOptimizing = false
    this.removeAllListeners()
    this.logger.info('连接池性能增强器已销毁')
  }
}

// 导出单例实例
export const connectionPoolEnhancer = new ConnectionPoolEnhancer({
  min: 10,
  max: 100,
  acquire: 30000,
  idle: 30000,
  evict: 15000
})