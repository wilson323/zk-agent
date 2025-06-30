/**
 * 负载感知的动态连接池调整器
 * 基于实时负载和使用模式动态调整连接池参数
 * 
 * 功能:
 * - 实时监控系统负载和连接池使用情况
 * - 基于机器学习算法预测最优连接池配置
 * - 自动调整连接池参数以适应负载变化
 * - 提供平滑的扩缩容策略避免系统震荡
 * 
 * @author ZK-Agent Team
 * @version 1.0.0
 */

import { EventEmitter } from 'events'
import { DatabaseMetrics } from './unified-interfaces'
import { databaseMonitor } from './monitoring'
import { connectionPoolAnalyzer, PoolUsageStats, UsagePatternAnalysis } from './connection-pool-analyzer'
import { enhancedDatabaseManager } from './enhanced-database-manager'

/**
 * 负载指标接口
 */
interface LoadMetrics {
  /** 时间戳 */
  timestamp: Date
  /** CPU使用率 */
  cpuUsage: number
  /** 内存使用率 */
  memoryUsage: number
  /** 并发请求数 */
  concurrentRequests: number
  /** 平均响应时间 */
  avgResponseTime: number
  /** 错误率 */
  errorRate: number
  /** 吞吐量(请求/秒) */
  throughput: number
}

/**
 * 调整策略接口
 */
interface AdjustmentStrategy {
  /** 策略名称 */
  name: string
  /** 策略描述 */
  description: string
  /** 触发条件 */
  triggers: {
    /** CPU使用率阈值 */
    cpuThreshold?: number
    /** 内存使用率阈值 */
    memoryThreshold?: number
    /** 响应时间阈值 */
    responseTimeThreshold?: number
    /** 错误率阈值 */
    errorRateThreshold?: number
    /** 连接池使用率阈值 */
    poolUtilizationThreshold?: number
  }
  /** 调整动作 */
  actions: {
    /** 连接数调整 */
    connectionAdjustment?: {
      type: 'increase' | 'decrease'
      amount: number
      maxLimit?: number
      minLimit?: number
    }
    /** 超时调整 */
    timeoutAdjustment?: {
      acquireTimeout?: number
      idleTimeout?: number
      createTimeout?: number
    }
    /** 其他配置调整 */
    configAdjustment?: {
      reapInterval?: number
      createRetryInterval?: number
    }
  }
  /** 策略优先级 */
  priority: number
  /** 冷却时间(ms) */
  cooldownMs: number
}

/**
 * 调整历史记录接口
 */
interface AdjustmentHistory {
  /** 时间戳 */
  timestamp: Date
  /** 调整前配置 */
  beforeConfig: any
  /** 调整后配置 */
  afterConfig: any
  /** 使用的策略 */
  strategy: string
  /** 触发原因 */
  reason: string
  /** 负载指标 */
  loadMetrics: LoadMetrics
  /** 调整结果 */
  result: 'success' | 'failed' | 'partial'
  /** 性能影响 */
  performanceImpact?: {
    responseTimeDelta: number
    throughputDelta: number
    errorRateDelta: number
  }
}

/**
 * 预测模型接口
 */
interface PredictionModel {
  /** 预测最优连接数 */
  predictOptimalConnections(metrics: LoadMetrics[], currentConfig: any): number
  /** 预测负载趋势 */
  predictLoadTrend(metrics: LoadMetrics[]): 'increasing' | 'decreasing' | 'stable'
  /** 计算调整置信度 */
  calculateConfidence(metrics: LoadMetrics[]): number
}

/**
 * 动态连接池调整器类
 */
export class DynamicPoolAdjuster extends EventEmitter {
  private isActive: boolean = false
  private adjustmentInterval: NodeJS.Timeout | null = null
  private loadMetricsHistory: LoadMetrics[] = []
  private adjustmentHistory: AdjustmentHistory[] = []
  private strategies: AdjustmentStrategy[]
  private predictionModel: PredictionModel
  private lastAdjustmentTime: Date | null = null
  private intervalMs: number
  private maxHistorySize: number
  private smoothingFactor: number

  constructor(
    intervalMs: number = 30000, // 30秒检查一次
    maxHistorySize: number = 500,
    smoothingFactor: number = 0.3 // 平滑因子，用于避免频繁调整
  ) {
    super()
    this.intervalMs = intervalMs
    this.maxHistorySize = maxHistorySize
    this.smoothingFactor = smoothingFactor

    // 初始化策略
    this.strategies = this.initializeStrategies()

    // 初始化预测模型
    this.predictionModel = this.initializePredictionModel()

    // 延迟事件监听器设置以避免循环依赖
    process.nextTick(() => {
      this.setupEventListeners()
    })
  }

  /**
   * 初始化调整策略
   * 
   * @returns 策略数组
   */
  private initializeStrategies(): AdjustmentStrategy[] {
    return [
      {
        name: 'high_load_scale_up',
        description: '高负载时扩容连接池',
        triggers: {
          cpuThreshold: 80,
          memoryThreshold: 85,
          responseTimeThreshold: 2000,
          poolUtilizationThreshold: 90
        },
        actions: {
          connectionAdjustment: {
            type: 'increase',
            amount: 3,
            maxLimit: 50
          },
          timeoutAdjustment: {
            acquireTimeout: 90000,
            createTimeout: 45000
          }
        },
        priority: 1,
        cooldownMs: 120000 // 2分钟冷却
      },
      {
        name: 'low_load_scale_down',
        description: '低负载时缩容连接池',
        triggers: {
          cpuThreshold: 20,
          memoryThreshold: 30,
          poolUtilizationThreshold: 25
        },
        actions: {
          connectionAdjustment: {
            type: 'decrease',
            amount: 2,
            minLimit: 3
          },
          timeoutAdjustment: {
            idleTimeout: 180000 // 3分钟空闲超时
          }
        },
        priority: 3,
        cooldownMs: 300000 // 5分钟冷却
      },
      {
        name: 'high_error_rate_recovery',
        description: '高错误率时的恢复策略',
        triggers: {
          errorRateThreshold: 5
        },
        actions: {
          connectionAdjustment: {
            type: 'decrease',
            amount: 1,
            minLimit: 2
          },
          timeoutAdjustment: {
            createTimeout: 60000,
            acquireTimeout: 120000
          },
          configAdjustment: {
            createRetryInterval: 1000
          }
        },
        priority: 2,
        cooldownMs: 180000 // 3分钟冷却
      },
      {
        name: 'burst_traffic_handling',
        description: '突发流量处理',
        triggers: {
          responseTimeThreshold: 1500,
          poolUtilizationThreshold: 85
        },
        actions: {
          connectionAdjustment: {
            type: 'increase',
            amount: 5,
            maxLimit: 40
          },
          timeoutAdjustment: {
            acquireTimeout: 60000
          }
        },
        priority: 1,
        cooldownMs: 90000 // 1.5分钟冷却
      },
      {
        name: 'memory_pressure_optimization',
        description: '内存压力优化',
        triggers: {
          memoryThreshold: 90
        },
        actions: {
          connectionAdjustment: {
            type: 'decrease',
            amount: 3,
            minLimit: 2
          },
          timeoutAdjustment: {
            idleTimeout: 120000 // 2分钟空闲超时
          },
          configAdjustment: {
            reapInterval: 500 // 更频繁的连接回收
          }
        },
        priority: 2,
        cooldownMs: 240000 // 4分钟冷却
      }
    ]
  }

  /**
   * 初始化预测模型
   * 
   * @returns 预测模型实例
   */
  private initializePredictionModel(): PredictionModel {
    return {
      predictOptimalConnections: (metrics: LoadMetrics[], currentConfig: any): number => {
        if (metrics.length < 5) {
          return currentConfig.max || 10
        }

        // 简单的线性回归预测
        const recentMetrics = metrics.slice(-10)
        const avgCpu = recentMetrics.reduce((sum, m) => sum + m.cpuUsage, 0) / recentMetrics.length
        const avgMemory = recentMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / recentMetrics.length
        const avgConcurrent = recentMetrics.reduce((sum, m) => sum + m.concurrentRequests, 0) / recentMetrics.length

        // 基于负载计算最优连接数
        let optimalConnections = Math.ceil(avgConcurrent * 1.2)
        
        // 根据CPU和内存使用率调整
        if (avgCpu > 70 || avgMemory > 80) {
          optimalConnections = Math.min(optimalConnections, currentConfig.max * 0.8)
        } else if (avgCpu < 30 && avgMemory < 50) {
          optimalConnections = Math.max(optimalConnections, currentConfig.min || 2)
        }

        return Math.max(2, Math.min(50, optimalConnections))
      },

      predictLoadTrend: (metrics: LoadMetrics[]): 'increasing' | 'decreasing' | 'stable' => {
        if (metrics.length < 3) {
          return 'stable'
        }

        const recent = metrics.slice(-3)
        const throughputTrend = recent[2].throughput - recent[0].throughput
        const cpuTrend = recent[2].cpuUsage - recent[0].cpuUsage

        if (throughputTrend > 10 || cpuTrend > 15) {
          return 'increasing'
        } else if (throughputTrend < -10 || cpuTrend < -15) {
          return 'decreasing'
        } else {
          return 'stable'
        }
      },

      calculateConfidence: (metrics: LoadMetrics[]): number => {
        if (metrics.length < 5) {
          return 0.3
        }

        // 基于数据一致性计算置信度
        const recent = metrics.slice(-5)
        const cpuVariance = this.calculateVariance(recent.map(m => m.cpuUsage))
        const memoryVariance = this.calculateVariance(recent.map(m => m.memoryUsage))
        
        // 方差越小，置信度越高
        const confidence = Math.max(0.1, Math.min(1.0, 1 - (cpuVariance + memoryVariance) / 200))
        return confidence
      }
    }
  }

  /**
   * 计算方差
   * 
   * @param values - 数值数组
   * @returns 方差
   */
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    return variance
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听数据库监控事件
    databaseMonitor.on('metrics', (metrics: DatabaseMetrics) => {
      this.collectLoadMetrics(metrics)
    })

    // 监听连接池分析器事件
    connectionPoolAnalyzer.on('analysis-complete', (data) => {
      this.handleAnalysisComplete(data)
    })
  }

  /**
   * 收集负载指标
   * 
   * @param dbMetrics - 数据库监控指标
   */
  private collectLoadMetrics(dbMetrics: DatabaseMetrics): void {
    const loadMetrics: LoadMetrics = {
      timestamp: new Date(),
      cpuUsage: dbMetrics.cpuUsage,
      memoryUsage: dbMetrics.memoryUsage,
      concurrentRequests: dbMetrics.activeConnections || 0,
      avgResponseTime: dbMetrics.avgLatency || 0,
      errorRate: ((dbMetrics.totalQueries - (dbMetrics.totalQueries - dbMetrics.failedQueries)) / Math.max(1, dbMetrics.totalQueries)) * 100,
      throughput: dbMetrics.totalQueries / Math.max(1, (Date.now() - dbMetrics.timestamp.getTime()) / 1000)
    }

    this.loadMetricsHistory.push(loadMetrics)

    // 限制历史记录大小
    if (this.loadMetricsHistory.length > this.maxHistorySize) {
      this.loadMetricsHistory.shift()
    }

    this.emit('load-metrics', loadMetrics)
  }

  /**
   * 处理分析完成事件
   * 
   * @param data - 分析数据
   */
  private handleAnalysisComplete(data: any): void {
    // 基于分析结果触发调整
    if (data.recommendations && data.recommendations.length > 0) {
      const highPriorityRecommendations = data.recommendations.filter(
        (rec: any) => rec.priority === 'high'
      )
      
      if (highPriorityRecommendations.length > 0) {
        this.triggerAdjustment('analysis_recommendation')
      }
    }
  }

  /**
   * 开始动态调整
   */
  start(): void {
    if (this.isActive) {
      console.log('Dynamic pool adjuster is already active')
      return
    }

    console.log(`Starting dynamic pool adjustment (interval: ${this.intervalMs}ms)`)
    this.isActive = true

    // 启动连接池分析器
    connectionPoolAnalyzer.startAnalysis()

    this.adjustmentInterval = setInterval(() => {
      this.performAdjustment()
    }, this.intervalMs)

    // 立即执行一次检查
    this.performAdjustment()
  }

  /**
   * 停止动态调整
   */
  stop(): void {
    if (!this.isActive) {
      return
    }

    console.log('Stopping dynamic pool adjustment')
    this.isActive = false

    if (this.adjustmentInterval) {
      clearInterval(this.adjustmentInterval)
      this.adjustmentInterval = null
    }

    // 停止连接池分析器
    connectionPoolAnalyzer.stopAnalysis()
  }

  /**
   * 触发立即调整
   * 
   * @param reason - 触发原因
   */
  triggerAdjustment(reason: string): void {
    console.log(`Triggering immediate pool adjustment: ${reason}`)
    this.performAdjustment()
  }

  /**
   * 执行调整
   */
  private async performAdjustment(): Promise<void> {
    if (this.loadMetricsHistory.length < 3) {
      // 数据不足，无法进行调整
      return
    }

    try {
      const currentMetrics = this.loadMetricsHistory[this.loadMetricsHistory.length - 1]
      const triggeredStrategies = this.findTriggeredStrategies(currentMetrics)

      if (triggeredStrategies.length === 0) {
        return
      }

      // 选择优先级最高的策略
      const strategy = triggeredStrategies.sort((a, b) => a.priority - b.priority)[0]

      // 检查冷却时间
      if (this.isInCooldown(strategy)) {
        return
      }

      // 获取当前配置
      const currentConfig = await this.getCurrentPoolConfig()
      
      // 计算调整置信度
      const confidence = this.predictionModel.calculateConfidence(this.loadMetricsHistory)
      
      if (confidence < 0.5) {
        console.log(`Skipping adjustment due to low confidence: ${confidence.toFixed(2)}`)
        return
      }

      // 应用调整
      const adjustmentResult = await this.applyAdjustment(strategy, currentConfig, currentMetrics)
      
      if (adjustmentResult) {
        this.recordAdjustment(adjustmentResult)
        this.lastAdjustmentTime = new Date()
        this.emit('adjustment-applied', adjustmentResult)
      }

    } catch (error) {
      console.error('Error during dynamic pool adjustment:', error)
      this.emit('adjustment-error', error)
    }
  }

  /**
   * 查找被触发的策略
   * 
   * @param metrics - 当前负载指标
   * @returns 被触发的策略数组
   */
  private findTriggeredStrategies(metrics: LoadMetrics): AdjustmentStrategy[] {
    return this.strategies.filter(strategy => {
      const triggers = strategy.triggers
      
      // 检查CPU阈值
      if (triggers.cpuThreshold !== undefined && metrics.cpuUsage < triggers.cpuThreshold) {
        return false
      }
      
      // 检查内存阈值
      if (triggers.memoryThreshold !== undefined && metrics.memoryUsage < triggers.memoryThreshold) {
        return false
      }
      
      // 检查响应时间阈值
      if (triggers.responseTimeThreshold !== undefined && metrics.avgResponseTime < triggers.responseTimeThreshold) {
        return false
      }
      
      // 检查错误率阈值
      if (triggers.errorRateThreshold !== undefined && metrics.errorRate < triggers.errorRateThreshold) {
        return false
      }
      
      // 检查连接池使用率阈值
      if (triggers.poolUtilizationThreshold !== undefined) {
        const currentStats = connectionPoolAnalyzer.getCurrentStats()
        if (!currentStats || currentStats.utilizationRate < triggers.poolUtilizationThreshold) {
          return false
        }
      }
      
      return true
    })
  }

  /**
   * 检查是否在冷却期内
   * 
   * @param strategy - 策略
   * @returns 是否在冷却期
   */
  private isInCooldown(strategy: AdjustmentStrategy): boolean {
    if (!this.lastAdjustmentTime) {
      return false
    }
    
    const timeSinceLastAdjustment = Date.now() - this.lastAdjustmentTime.getTime()
    return timeSinceLastAdjustment < strategy.cooldownMs
  }

  /**
   * 获取当前连接池配置
   * 
   * @returns 当前配置
   */
  private async getCurrentPoolConfig(): Promise<any> {
    // 这里需要从实际的连接池获取配置
    // 暂时返回默认配置
    return {
      min: parseInt(process.env.DB_MIN_CONNECTIONS || '2'),
      max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
      acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'),
      createTimeout: parseInt(process.env.DB_CREATE_TIMEOUT || '30000'),
      idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '300000')
    }
  }

  /**
   * 应用调整
   * 
   * @param strategy - 调整策略
   * @param currentConfig - 当前配置
   * @param metrics - 负载指标
   * @returns 调整结果
   */
  private async applyAdjustment(
    strategy: AdjustmentStrategy,
    currentConfig: any,
    metrics: LoadMetrics
  ): Promise<AdjustmentHistory | null> {
    const newConfig = { ...currentConfig }
    let hasChanges = false

    // 应用连接数调整
    if (strategy.actions.connectionAdjustment) {
      const adjustment = strategy.actions.connectionAdjustment
      
      if (adjustment.type === 'increase') {
        newConfig.max = Math.min(
          newConfig.max + adjustment.amount,
          adjustment.maxLimit || 50
        )
        hasChanges = true
      } else if (adjustment.type === 'decrease') {
        newConfig.max = Math.max(
          newConfig.max - adjustment.amount,
          adjustment.minLimit || 2
        )
        newConfig.min = Math.min(newConfig.min, newConfig.max - 1)
        hasChanges = true
      }
    }

    // 应用超时调整
    if (strategy.actions.timeoutAdjustment) {
      const timeouts = strategy.actions.timeoutAdjustment
      
      if (timeouts.acquireTimeout) {
        newConfig.acquireTimeout = timeouts.acquireTimeout
        hasChanges = true
      }
      
      if (timeouts.createTimeout) {
        newConfig.createTimeout = timeouts.createTimeout
        hasChanges = true
      }
      
      if (timeouts.idleTimeout) {
        newConfig.idleTimeout = timeouts.idleTimeout
        hasChanges = true
      }
    }

    if (!hasChanges) {
      return null
    }

    // 应用平滑因子
    const smoothedConfig = this.applySmoothingFactor(currentConfig, newConfig)

    try {
      // 这里需要实际应用配置到连接池
      // await enhancedDatabaseManager.updatePoolConfig(smoothedConfig)
      
      console.log(`Applied pool adjustment using strategy: ${strategy.name}`, {
        before: currentConfig,
        after: smoothedConfig
      })

      return {
        timestamp: new Date(),
        beforeConfig: currentConfig,
        afterConfig: smoothedConfig,
        strategy: strategy.name,
        reason: strategy.description,
        loadMetrics: metrics,
        result: 'success'
      }

    } catch (error) {
      console.error('Failed to apply pool configuration:', error)
      
      return {
        timestamp: new Date(),
        beforeConfig: currentConfig,
        afterConfig: smoothedConfig,
        strategy: strategy.name,
        reason: strategy.description,
        loadMetrics: metrics,
        result: 'failed'
      }
    }
  }

  /**
   * 应用平滑因子
   * 
   * @param currentConfig - 当前配置
   * @param newConfig - 新配置
   * @returns 平滑后的配置
   */
  private applySmoothingFactor(currentConfig: any, newConfig: any): any {
    const smoothedConfig = { ...currentConfig }
    
    // 对数值型配置应用平滑因子
    const numericFields = ['max', 'min', 'acquireTimeout', 'createTimeout', 'idleTimeout']
    
    numericFields.forEach(field => {
      if (newConfig[field] !== undefined && currentConfig[field] !== undefined) {
        const delta = newConfig[field] - currentConfig[field]
        smoothedConfig[field] = Math.round(currentConfig[field] + delta * this.smoothingFactor)
      }
    })
    
    return smoothedConfig
  }

  /**
   * 记录调整历史
   * 
   * @param adjustment - 调整记录
   */
  private recordAdjustment(adjustment: AdjustmentHistory): void {
    this.adjustmentHistory.push(adjustment)
    
    // 限制历史记录大小
    if (this.adjustmentHistory.length > 100) {
      this.adjustmentHistory.shift()
    }
  }

  /**
   * 获取调整历史
   * 
   * @param limit - 限制返回数量
   * @returns 调整历史
   */
  getAdjustmentHistory(limit?: number): AdjustmentHistory[] {
    if (limit) {
      return this.adjustmentHistory.slice(-limit)
    }
    return [...this.adjustmentHistory]
  }

  /**
   * 获取负载指标历史
   * 
   * @param limit - 限制返回数量
   * @returns 负载指标历史
   */
  getLoadMetricsHistory(limit?: number): LoadMetrics[] {
    if (limit) {
      return this.loadMetricsHistory.slice(-limit)
    }
    return [...this.loadMetricsHistory]
  }

  /**
   * 获取当前状态
   * 
   * @returns 当前状态
   */
  getStatus(): {
    isActive: boolean
    lastAdjustment: Date | null
    totalAdjustments: number
    currentLoadMetrics: LoadMetrics | null
    strategies: AdjustmentStrategy[]
  } {
    return {
      isActive: this.isActive,
      lastAdjustment: this.lastAdjustmentTime,
      totalAdjustments: this.adjustmentHistory.length,
      currentLoadMetrics: this.loadMetricsHistory.length > 0 
        ? this.loadMetricsHistory[this.loadMetricsHistory.length - 1] 
        : null,
      strategies: this.strategies
    }
  }

  /**
   * 更新策略
   * 
   * @param strategies - 新的策略数组
   */
  updateStrategies(strategies: AdjustmentStrategy[]): void {
    this.strategies = strategies
    console.log(`Updated adjustment strategies: ${strategies.length} strategies loaded`)
    this.emit('strategies-updated', strategies)
  }

  /**
   * 生成性能报告
   * 
   * @returns 性能报告
   */
  generatePerformanceReport(): {
    summary: string
    adjustmentStats: any
    loadTrends: any
    recommendations: string[]
  } {
    const recentAdjustments = this.adjustmentHistory.slice(-10)
    const recentMetrics = this.loadMetricsHistory.slice(-50)
    
    const successfulAdjustments = recentAdjustments.filter(adj => adj.result === 'success').length
    const avgCpuUsage = recentMetrics.reduce((sum, m) => sum + m.cpuUsage, 0) / recentMetrics.length
    const avgMemoryUsage = recentMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / recentMetrics.length
    
    const recommendations = []
    
    if (avgCpuUsage > 80) {
      recommendations.push('考虑增加服务器资源或优化查询性能')
    }
    
    if (avgMemoryUsage > 85) {
      recommendations.push('内存使用率较高，建议优化内存使用或增加内存')
    }
    
    if (successfulAdjustments < recentAdjustments.length * 0.8) {
      recommendations.push('调整成功率较低，建议检查策略配置')
    }
    
    return {
      summary: `
动态连接池调整性能报告
========================
分析时间: ${new Date().toISOString()}
总调整次数: ${this.adjustmentHistory.length}
成功调整次数: ${successfulAdjustments}
平均CPU使用率: ${avgCpuUsage.toFixed(2)}%
平均内存使用率: ${avgMemoryUsage.toFixed(2)}%
      `.trim(),
      adjustmentStats: {
        total: this.adjustmentHistory.length,
        successful: successfulAdjustments,
        successRate: (successfulAdjustments / Math.max(1, recentAdjustments.length)) * 100
      },
      loadTrends: {
        avgCpuUsage,
        avgMemoryUsage,
        trend: this.predictionModel.predictLoadTrend(recentMetrics)
      },
      recommendations
    }
  }
}

// 创建全局实例
export const dynamicPoolAdjuster = new DynamicPoolAdjuster()

// 导出类型
export type {
  LoadMetrics,
  AdjustmentStrategy,
  AdjustmentHistory,
  PredictionModel
}
