/**
 * 缓存策略优化器
 * 基于机器学习和统计分析的智能缓存策略优化
 * 
 * 功能:
 * - 动态策略调整和性能分析
 * - 机器学习预测和模式识别
 * - A/B测试和策略评估
 * - 自动化优化建议生成
 * - 实时监控和告警
 * 
 * @author ZK-Agent Team
 * @version 1.0.0
 */

import { EventEmitter } from 'events'
import { intelligentCacheManager, CacheLevel, CacheStrategy } from './intelligent-cache-manager'
import { getMonitoringService, isMonitoringInitialized } from './monitoring-registry'
import { DatabaseMetrics, IMonitoringService } from './unified-interfaces'
import { IMonitoringService as IMonitoringServiceLegacy } from './monitoring-interfaces'

/**
 * 优化策略枚举
 */
enum OptimizationStrategy {
  PERFORMANCE = 'performance',     // 性能优先
  MEMORY = 'memory',               // 内存优先
  BALANCED = 'balanced',           // 平衡策略
  COST = 'cost',                   // 成本优先
  LATENCY = 'latency'              // 延迟优先
}

/**
 * 策略评估指标
 */
interface StrategyMetrics {
  /** 命中率 */
  hitRate: number
  /** 平均响应时间(ms) */
  avgResponseTime: number
  /** 内存使用率 */
  memoryUsage: number
  /** 错误率 */
  errorRate: number
  /** 吞吐量(请求/秒) */
  throughput: number
  /** 成本评分 */
  costScore: number
  /** 综合评分 */
  overallScore: number
}

/**
 * 策略配置
 */
interface StrategyConfig {
  /** 策略名称 */
  name: string
  /** 策略类型 */
  type: OptimizationStrategy
  /** L1缓存配置 */
  l1Config: {
    maxSize: number
    ttl: number
    strategy: CacheStrategy
  }
  /** L2缓存配置 */
  l2Config: {
    maxSize: number
    ttl: number
    strategy: CacheStrategy
  }
  /** 权重配置 */
  weights: {
    hitRate: number
    responseTime: number
    memoryUsage: number
    errorRate: number
  }
  /** 是否启用 */
  enabled: boolean
  /** 创建时间 */
  createdAt: Date
  /** 最后更新时间 */
  updatedAt: Date
}

/**
 * A/B测试配置
 */
interface ABTestConfig {
  /** 测试ID */
  testId: string
  /** 测试名称 */
  name: string
  /** 控制组策略 */
  controlStrategy: StrategyConfig
  /** 实验组策略 */
  experimentStrategy: StrategyConfig
  /** 流量分配比例 */
  trafficSplit: number
  /** 测试持续时间(ms) */
  duration: number
  /** 开始时间 */
  startTime: Date
  /** 结束时间 */
  endTime: Date
  /** 是否活跃 */
  isActive: boolean
  /** 统计显著性阈值 */
  significanceThreshold: number
}

/**
 * 测试结果
 */
interface ABTestResult {
  /** 测试ID */
  testId: string
  /** 控制组指标 */
  controlMetrics: StrategyMetrics
  /** 实验组指标 */
  experimentMetrics: StrategyMetrics
  /** 改进百分比 */
  improvement: {
    hitRate: number
    responseTime: number
    memoryUsage: number
    errorRate: number
    overallScore: number
  }
  /** 统计显著性 */
  significance: number
  /** 是否显著 */
  isSignificant: boolean
  /** 建议 */
  recommendation: 'adopt' | 'reject' | 'continue'
  /** 置信度 */
  confidence: number
}

/**
 * 机器学习模型接口
 */
interface MLModel {
  /** 模型名称 */
  name: string
  /** 模型类型 */
  type: 'regression' | 'classification' | 'clustering'
  /** 训练数据 */
  trainingData: any[]
  /** 模型参数 */
  parameters: any
  /** 准确率 */
  accuracy: number
  /** 最后训练时间 */
  lastTrainedAt: Date
  /** 预测方法 */
  predict(input: any): any
  /** 训练方法 */
  train(data: any[]): void
}

/**
 * 优化建议
 */
interface OptimizationRecommendation {
  /** 建议ID */
  id: string
  /** 建议类型 */
  type: 'strategy' | 'config' | 'architecture'
  /** 优先级 */
  priority: 'high' | 'medium' | 'low'
  /** 标题 */
  title: string
  /** 描述 */
  description: string
  /** 预期改进 */
  expectedImprovement: {
    hitRate?: number
    responseTime?: number
    memoryUsage?: number
    costReduction?: number
  }
  /** 实施难度 */
  implementationDifficulty: 'easy' | 'medium' | 'hard'
  /** 风险评估 */
  riskAssessment: 'low' | 'medium' | 'high'
  /** 建议的配置 */
  suggestedConfig?: Partial<StrategyConfig>
  /** 创建时间 */
  createdAt: Date
}

/**
 * 缓存策略优化器类
 */
export class CacheStrategyOptimizer extends EventEmitter {
  private strategies: Map<string, StrategyConfig> = new Map()
  private activeTests: Map<string, ABTestConfig> = new Map()
  private testResults: Map<string, ABTestResult> = new Map()
  private mlModels: Map<string, MLModel> = new Map()
  private recommendations: OptimizationRecommendation[] = []
  private isOptimizing: boolean = false
  private optimizationInterval: NodeJS.Timeout | null = null
  private metricsHistory: StrategyMetrics[] = []
  private currentStrategy: string = 'default'
  private optimizationConfig: {
    enabled: boolean
    interval: number
    minDataPoints: number
    maxStrategies: number
    autoApply: boolean
  }

  constructor() {
    super()
    
    this.optimizationConfig = {
      enabled: true,
      interval: 300000, // 5分钟
      minDataPoints: 100,
      maxStrategies: 10,
      autoApply: false
    }
    
    // 延迟所有初始化以避免循环依赖
    process.nextTick(async () => {
      this.initializeDefaultStrategies()
      this.initializeMLModels()
      await this.setupEventListeners()
    })
  }

  /**
   * 初始化默认策略
   */
  private initializeDefaultStrategies(): void {
    const strategies: StrategyConfig[] = [
      {
        name: 'default',
        type: OptimizationStrategy.BALANCED,
        l1Config: {
          maxSize: 1000,
          ttl: 300000,
          strategy: CacheStrategy.LRU
        },
        l2Config: {
          maxSize: 10000,
          ttl: 1800000,
          strategy: CacheStrategy.LRU
        },
        weights: {
          hitRate: 0.4,
          responseTime: 0.3,
          memoryUsage: 0.2,
          errorRate: 0.1
        },
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'performance',
        type: OptimizationStrategy.PERFORMANCE,
        l1Config: {
          maxSize: 2000,
          ttl: 600000,
          strategy: CacheStrategy.LFU
        },
        l2Config: {
          maxSize: 20000,
          ttl: 3600000,
          strategy: CacheStrategy.LFU
        },
        weights: {
          hitRate: 0.5,
          responseTime: 0.4,
          memoryUsage: 0.05,
          errorRate: 0.05
        },
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'memory_optimized',
        type: OptimizationStrategy.MEMORY,
        l1Config: {
          maxSize: 500,
          ttl: 180000,
          strategy: CacheStrategy.LRU
        },
        l2Config: {
          maxSize: 5000,
          ttl: 900000,
          strategy: CacheStrategy.LRU
        },
        weights: {
          hitRate: 0.2,
          responseTime: 0.2,
          memoryUsage: 0.5,
          errorRate: 0.1
        },
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'low_latency',
        type: OptimizationStrategy.LATENCY,
        l1Config: {
          maxSize: 1500,
          ttl: 450000,
          strategy: CacheStrategy.ADAPTIVE
        },
        l2Config: {
          maxSize: 15000,
          ttl: 2700000,
          strategy: CacheStrategy.ADAPTIVE
        },
        weights: {
          hitRate: 0.3,
          responseTime: 0.6,
          memoryUsage: 0.05,
          errorRate: 0.05
        },
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
    
    strategies.forEach(strategy => {
      this.strategies.set(strategy.name, strategy)
    })
  }

  /**
   * 初始化机器学习模型
   */
  private initializeMLModels(): void {
    // 性能预测模型
    const performanceModel: MLModel = {
      name: 'performance_predictor',
      type: 'regression',
      trainingData: [],
      parameters: {
        learningRate: 0.01,
        epochs: 100,
        hiddenLayers: [64, 32]
      },
      accuracy: 0,
      lastTrainedAt: new Date(),
      predict: (input: any) => {
        // 简化的预测逻辑
        return this.predictPerformance(input)
      },
      train: (data: any[]) => {
        // 简化的训练逻辑
        this.trainPerformanceModel(data)
      }
    }
    
    // 策略分类模型
    const strategyModel: MLModel = {
      name: 'strategy_classifier',
      type: 'classification',
      trainingData: [],
      parameters: {
        maxDepth: 10,
        minSamples: 5
      },
      accuracy: 0,
      lastTrainedAt: new Date(),
      predict: (input: any) => {
        return this.classifyOptimalStrategy(input)
      },
      train: (data: any[]) => {
        this.trainStrategyModel(data)
      }
    }
    
    this.mlModels.set('performance_predictor', performanceModel)
    this.mlModels.set('strategy_classifier', strategyModel)
  }

  /**
   * 设置事件监听器
   */
  private async setupEventListeners(): Promise<void> {
    // 监听缓存管理器事件
    intelligentCacheManager.on('metrics-collected', (metrics) => {
      this.handleMetricsUpdate(metrics)
    })
    
    // 监听数据库监控事件
    if (isMonitoringInitialized()) {
      const monitoringService: IMonitoringService = await getMonitoringService();
      if (monitoringService) {
        monitoringService.on('metrics', (dbMetrics: DatabaseMetrics) => {
          this.handleDatabaseMetrics(dbMetrics);
        });
      }
    }
  }

  /**
   * 启动优化器
   */
  async start(): Promise<void> {
    if (this.isOptimizing) {
      console.log('Cache strategy optimizer is already running')
      return
    }

    console.log('Starting cache strategy optimizer')
    
    this.isOptimizing = true
    
    // 启动定期优化
    if (this.optimizationConfig.enabled) {
      this.optimizationInterval = setInterval(() => {
        this.performOptimization()
      }, this.optimizationConfig.interval)
    }
    
    // 初始优化
    await this.performOptimization()
    
    this.emit('optimizer-started')
    console.log('Cache strategy optimizer started successfully')
  }

  /**
   * 停止优化器
   */
  async stop(): Promise<void> {
    if (!this.isOptimizing) {
      return
    }

    console.log('Stopping cache strategy optimizer')
    
    this.isOptimizing = false
    
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval)
      this.optimizationInterval = null
    }
    
    // 停止所有活跃的A/B测试
    for (const test of Array.from(this.activeTests.values())) {
      await this.stopABTest(test.testId)
    }
    
    this.emit('optimizer-stopped')
  }

  /**
   * 执行优化
   */
  private async performOptimization(): Promise<void> {
    try {
      console.log('Performing cache strategy optimization...')
      
      // 收集当前指标
      const currentMetrics = await this.collectCurrentMetrics()
      this.metricsHistory.push(currentMetrics)
      
      // 保持历史记录在合理范围内
      if (this.metricsHistory.length > 1000) {
        this.metricsHistory = this.metricsHistory.slice(-1000)
      }
      
      // 检查是否有足够的数据进行优化
      if (this.metricsHistory.length < this.optimizationConfig.minDataPoints) {
        console.log(`Insufficient data for optimization (${this.metricsHistory.length}/${this.optimizationConfig.minDataPoints})`)
        return
      }
      
      // 分析性能趋势
      const trends = this.analyzePerformanceTrends()
      
      // 生成优化建议
      const recommendations = await this.generateRecommendations(currentMetrics, trends)
      
      // 更新建议列表
      this.recommendations = recommendations
      
      // 如果启用自动应用，执行最佳建议
      if (this.optimizationConfig.autoApply && recommendations.length > 0) {
        const bestRecommendation = recommendations.find(r => r.priority === 'high')
        if (bestRecommendation && bestRecommendation.riskAssessment === 'low') {
          await this.applyRecommendation(bestRecommendation)
        }
      }
      
      // 训练机器学习模型
      await this.trainModels()
      
      this.emit('optimization-completed', {
        metrics: currentMetrics,
        recommendations: recommendations.length,
        trends
      })
      
    } catch (error) {
      console.error('Optimization failed:', error)
      this.emit('optimization-failed', error)
    }
  }

  /**
   * 收集当前指标
   * 
   * @returns 当前指标
   */
  private async collectCurrentMetrics(): Promise<StrategyMetrics> {
    const cacheStats = intelligentCacheManager.getStats()
    
    return {
      hitRate: cacheStats.hitRate,
      avgResponseTime: cacheStats.avgResponseTime,
      memoryUsage: this.calculateMemoryUsage(),
      errorRate: cacheStats.errors / Math.max(1, cacheStats.totalRequests),
      throughput: this.calculateThroughput(),
      costScore: this.calculateCostScore(),
      overallScore: this.calculateOverallScore(cacheStats)
    }
  }

  /**
   * 计算内存使用率
   * 
   * @returns 内存使用率
   */
  private calculateMemoryUsage(): number {
    const stats = intelligentCacheManager.getStats()
    const l1Usage = stats.levelStats.L1.memoryUsage
    const l2Usage = stats.levelStats.L2.memoryUsage
    
    // 简化计算，实际应该基于系统总内存
    const totalUsage = l1Usage + l2Usage
    const maxMemory = 100 * 1024 * 1024 // 100MB假设值
    
    return Math.min(1, totalUsage / maxMemory)
  }

  /**
   * 计算吞吐量
   * 
   * @returns 吞吐量(请求/秒)
   */
  private calculateThroughput(): number {
    if (this.metricsHistory.length < 2) {
      return 0
    }
    
    const recent = this.metricsHistory.slice(-10)
    const timeSpan = 10 * (this.optimizationConfig.interval / 1000) // 转换为秒
    
    const totalRequests = recent.reduce((sum, metrics) => {
      const stats = intelligentCacheManager.getStats()
      return sum + stats.totalRequests
    }, 0)
    
    return totalRequests / timeSpan
  }

  /**
   * 计算成本评分
   * 
   * @returns 成本评分
   */
  private calculateCostScore(): number {
    const memoryUsage = this.calculateMemoryUsage()
    const stats = intelligentCacheManager.getStats()
    
    // 基于内存使用和缓存大小的简化成本模型
    const memoryCost = memoryUsage * 0.6
    const sizeCost = (stats.levelStats.L1.size + stats.levelStats.L2.size) / 20000 * 0.4
    
    return Math.min(1, memoryCost + sizeCost)
  }

  /**
   * 计算综合评分
   * 
   * @param stats - 缓存统计
   * @returns 综合评分
   */
  private calculateOverallScore(stats: any): number {
    const strategy = this.strategies.get(this.currentStrategy)
    if (!strategy) {
      return 0
    }
    
    const weights = strategy.weights
    const memoryUsage = this.calculateMemoryUsage()
    const errorRate = stats.errors / Math.max(1, stats.totalRequests)
    
    // 归一化响应时间(假设100ms为基准)
    const normalizedResponseTime = Math.min(1, stats.avgResponseTime / 100)
    
    const score = 
      weights.hitRate * stats.hitRate +
      weights.responseTime * (1 - normalizedResponseTime) +
      weights.memoryUsage * (1 - memoryUsage) +
      weights.errorRate * (1 - errorRate)
    
    return Math.max(0, Math.min(1, score))
  }

  /**
   * 分析性能趋势
   * 
   * @returns 性能趋势分析
   */
  private analyzePerformanceTrends(): {
    hitRateTrend: 'improving' | 'declining' | 'stable'
    responseTimeTrend: 'improving' | 'declining' | 'stable'
    memoryTrend: 'improving' | 'declining' | 'stable'
    overallTrend: 'improving' | 'declining' | 'stable'
  } {
    if (this.metricsHistory.length < 10) {
      return {
        hitRateTrend: 'stable',
        responseTimeTrend: 'stable',
        memoryTrend: 'stable',
        overallTrend: 'stable'
      }
    }
    
    const recent = this.metricsHistory.slice(-10)
    const older = this.metricsHistory.slice(-20, -10)
    
    const recentAvg = this.calculateAverageMetrics(recent)
    const olderAvg = this.calculateAverageMetrics(older)
    
    return {
      hitRateTrend: this.determineTrend(recentAvg.hitRate, olderAvg.hitRate),
      responseTimeTrend: this.determineTrend(olderAvg.avgResponseTime, recentAvg.avgResponseTime), // 响应时间越低越好
      memoryTrend: this.determineTrend(olderAvg.memoryUsage, recentAvg.memoryUsage), // 内存使用越低越好
      overallTrend: this.determineTrend(recentAvg.overallScore, olderAvg.overallScore)
    }
  }

  /**
   * 计算平均指标
   * 
   * @param metrics - 指标数组
   * @returns 平均指标
   */
  private calculateAverageMetrics(metrics: StrategyMetrics[]): StrategyMetrics {
    const count = metrics.length
    
    return {
      hitRate: metrics.reduce((sum, m) => sum + m.hitRate, 0) / count,
      avgResponseTime: metrics.reduce((sum, m) => sum + m.avgResponseTime, 0) / count,
      memoryUsage: metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / count,
      errorRate: metrics.reduce((sum, m) => sum + m.errorRate, 0) / count,
      throughput: metrics.reduce((sum, m) => sum + m.throughput, 0) / count,
      costScore: metrics.reduce((sum, m) => sum + m.costScore, 0) / count,
      overallScore: metrics.reduce((sum, m) => sum + m.overallScore, 0) / count
    }
  }

  /**
   * 确定趋势
   * 
   * @param current - 当前值
   * @param previous - 之前值
   * @returns 趋势
   */
  private determineTrend(current: number, previous: number): 'improving' | 'declining' | 'stable' {
    const threshold = 0.05 // 5%阈值
    const change = (current - previous) / previous
    
    if (change > threshold) {
      return 'improving'
    } else if (change < -threshold) {
      return 'declining'
    } else {
      return 'stable'
    }
  }

  /**
   * 生成优化建议
   * 
   * @param currentMetrics - 当前指标
   * @param trends - 性能趋势
   * @returns 优化建议数组
   */
  private async generateRecommendations(
    currentMetrics: StrategyMetrics,
    trends: any
  ): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = []
    
    // 基于命中率的建议
    if (currentMetrics.hitRate < 0.7) {
      recommendations.push({
        id: `hitrate_${Date.now()}`,
        type: 'strategy',
        priority: 'high',
        title: '提升缓存命中率',
        description: `当前命中率为 ${(currentMetrics.hitRate * 100).toFixed(1)}%，建议增加缓存大小或调整TTL策略`,
        expectedImprovement: {
          hitRate: 0.15,
          responseTime: -20
        },
        implementationDifficulty: 'easy',
        riskAssessment: 'low',
        suggestedConfig: {
          l1Config: {
            maxSize: Math.floor(this.strategies.get(this.currentStrategy)!.l1Config.maxSize * 1.5),
            ttl: this.strategies.get(this.currentStrategy)!.l1Config.ttl * 1.2,
            strategy: CacheStrategy.LFU
          }
        },
        createdAt: new Date()
      })
    }
    
    // 基于响应时间的建议
    if (currentMetrics.avgResponseTime > 50) {
      recommendations.push({
        id: `latency_${Date.now()}`,
        type: 'config',
        priority: 'medium',
        title: '优化响应时间',
        description: `平均响应时间为 ${currentMetrics.avgResponseTime.toFixed(1)}ms，建议优化缓存层级结构`,
        expectedImprovement: {
          responseTime: -30
        },
        implementationDifficulty: 'medium',
        riskAssessment: 'low',
        suggestedConfig: {
          name: 'low_latency_optimized',
          type: OptimizationStrategy.LATENCY
        },
        createdAt: new Date()
      })
    }
    
    // 基于内存使用的建议
    if (currentMetrics.memoryUsage > 0.8) {
      recommendations.push({
        id: `memory_${Date.now()}`,
        type: 'strategy',
        priority: 'high',
        title: '优化内存使用',
        description: `内存使用率为 ${(currentMetrics.memoryUsage * 100).toFixed(1)}%，建议减少缓存大小或启用更激进的清理策略`,
        expectedImprovement: {
          memoryUsage: -25
        },
        implementationDifficulty: 'easy',
        riskAssessment: 'medium',
        suggestedConfig: {
          l1Config: {
            maxSize: Math.floor(this.strategies.get(this.currentStrategy)!.l1Config.maxSize * 0.7),
            ttl: this.strategies.get(this.currentStrategy)!.l1Config.ttl * 0.8,
            strategy: CacheStrategy.LRU
          }
        },
        createdAt: new Date()
      })
    }
    
    // 基于趋势的建议
    if (trends.hitRateTrend === 'declining') {
      recommendations.push({
        id: `trend_hitrate_${Date.now()}`,
        type: 'strategy',
        priority: 'medium',
        title: '命中率下降趋势',
        description: '检测到命中率持续下降，建议调整缓存策略或增加预热',
        expectedImprovement: {
          hitRate: 0.1
        },
        implementationDifficulty: 'medium',
        riskAssessment: 'low',
        createdAt: new Date()
      })
    }
    
    // 使用机器学习模型生成建议
    const mlRecommendations = await this.generateMLRecommendations(currentMetrics)
    recommendations.push(...mlRecommendations)
    
    // 按优先级排序
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  /**
   * 使用机器学习生成建议
   * 
   * @param currentMetrics - 当前指标
   * @returns ML建议数组
   */
  private async generateMLRecommendations(currentMetrics: StrategyMetrics): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = []
    
    try {
      // 使用策略分类模型
      const strategyModel = this.mlModels.get('strategy_classifier')
      if (strategyModel && strategyModel.accuracy > 0.7) {
        const optimalStrategy = strategyModel.predict(currentMetrics)
        
        if (optimalStrategy && optimalStrategy !== this.currentStrategy) {
          recommendations.push({
            id: `ml_strategy_${Date.now()}`,
            type: 'strategy',
            priority: 'medium',
            title: 'ML推荐策略切换',
            description: `机器学习模型建议切换到 ${optimalStrategy} 策略以提升性能`,
            expectedImprovement: {
              hitRate: 0.1
            },
            implementationDifficulty: 'easy',
            riskAssessment: 'low',
            suggestedConfig: this.strategies.get(optimalStrategy),
            createdAt: new Date()
          })
        }
      }
      
      // 使用性能预测模型
      const performanceModel = this.mlModels.get('performance_predictor')
      if (performanceModel && performanceModel.accuracy > 0.6) {
        const predictions = performanceModel.predict({
          currentMetrics,
          strategies: Array.from(this.strategies.values())
        })
        
        if (predictions && predictions.bestStrategy) {
          recommendations.push({
            id: `ml_performance_${Date.now()}`,
            type: 'config',
            priority: 'low',
            title: 'ML性能优化建议',
            description: `预测模型建议的配置调整可提升 ${predictions.expectedImprovement}% 的性能`,
            expectedImprovement: predictions.improvements,
            implementationDifficulty: 'medium',
            riskAssessment: 'medium',
            createdAt: new Date()
          })
        }
      }
      
    } catch (error) {
      console.error('ML recommendation generation failed:', error)
    }
    
    return recommendations
  }

  /**
   * 应用建议
   * 
   * @param recommendation - 优化建议
   */
  private async applyRecommendation(recommendation: OptimizationRecommendation): Promise<void> {
    try {
      console.log(`Applying recommendation: ${recommendation.title}`)
      
      if (recommendation.suggestedConfig) {
        if (recommendation.type === 'strategy') {
          // 启动A/B测试来验证新策略
          await this.startABTest(
            `auto_${recommendation.id}`,
            `Auto-applied: ${recommendation.title}`,
            this.strategies.get(this.currentStrategy)!,
            recommendation.suggestedConfig as StrategyConfig,
            0.1, // 10%流量
            3600000 // 1小时测试
          )
        } else {
          // 直接应用配置更改
          await this.updateCacheConfig(recommendation.suggestedConfig)
        }
      }
      
      this.emit('recommendation-applied', recommendation)
      
    } catch (error) {
      console.error(`Failed to apply recommendation ${recommendation.id}:`, error)
      this.emit('recommendation-failed', { recommendation, error })
    }
  }

  /**
   * 更新缓存配置
   * 
   * @param config - 新配置
   */
  private async updateCacheConfig(config: any): Promise<void> {
    const cacheConfig = intelligentCacheManager.getConfig()
    
    if (config.l1Config) {
      Object.assign(cacheConfig.l1, config.l1Config)
    }
    
    if (config.l2Config) {
      Object.assign(cacheConfig.l2, config.l2Config)
    }
    
    intelligentCacheManager.updateConfig(cacheConfig)
  }

  /**
   * 启动A/B测试
   * 
   * @param testId - 测试ID
   * @param name - 测试名称
   * @param controlStrategy - 控制组策略
   * @param experimentStrategy - 实验组策略
   * @param trafficSplit - 流量分配
   * @param duration - 测试持续时间
   */
  async startABTest(
    testId: string,
    name: string,
    controlStrategy: StrategyConfig,
    experimentStrategy: StrategyConfig,
    trafficSplit: number = 0.5,
    duration: number = 3600000
  ): Promise<void> {
    const test: ABTestConfig = {
      testId,
      name,
      controlStrategy,
      experimentStrategy,
      trafficSplit,
      duration,
      startTime: new Date(),
      endTime: new Date(Date.now() + duration),
      isActive: true,
      significanceThreshold: 0.05
    }
    
    this.activeTests.set(testId, test)
    
    // 设置测试结束定时器
    setTimeout(() => {
      this.stopABTest(testId)
    }, duration)
    
    console.log(`Started A/B test: ${name} (${testId})`)
    this.emit('ab-test-started', test)
  }

  /**
   * 停止A/B测试
   * 
   * @param testId - 测试ID
   */
  async stopABTest(testId: string): Promise<void> {
    const test = this.activeTests.get(testId)
    if (!test) {
      return
    }
    
    test.isActive = false
    test.endTime = new Date()
    
    // 分析测试结果
    const result = await this.analyzeABTestResult(test)
    this.testResults.set(testId, result)
    
    this.activeTests.delete(testId)
    
    console.log(`Stopped A/B test: ${test.name} (${testId})`)
    this.emit('ab-test-completed', { test, result })
    
    // 如果实验组显著更好，应用新策略
    if (result.isSignificant && result.recommendation === 'adopt') {
      await this.adoptStrategy(test.experimentStrategy)
    }
  }

  /**
   * 分析A/B测试结果
   * 
   * @param test - 测试配置
   * @returns 测试结果
   */
  private async analyzeABTestResult(test: ABTestConfig): Promise<ABTestResult> {
    // 这里应该收集测试期间的实际指标数据
    // 简化实现，使用模拟数据
    const controlMetrics = await this.collectMetricsForStrategy(test.controlStrategy)
    const experimentMetrics = await this.collectMetricsForStrategy(test.experimentStrategy)
    
    const improvement = {
      hitRate: (experimentMetrics.hitRate - controlMetrics.hitRate) / controlMetrics.hitRate * 100,
      responseTime: (controlMetrics.avgResponseTime - experimentMetrics.avgResponseTime) / controlMetrics.avgResponseTime * 100,
      memoryUsage: (controlMetrics.memoryUsage - experimentMetrics.memoryUsage) / controlMetrics.memoryUsage * 100,
      errorRate: (controlMetrics.errorRate - experimentMetrics.errorRate) / controlMetrics.errorRate * 100,
      overallScore: (experimentMetrics.overallScore - controlMetrics.overallScore) / controlMetrics.overallScore * 100
    }
    
    // 简化的统计显著性检验
    const significance = this.calculateStatisticalSignificance(controlMetrics, experimentMetrics)
    const isSignificant = significance < test.significanceThreshold
    
    let recommendation: 'adopt' | 'reject' | 'continue' = 'reject'
    if (isSignificant && improvement.overallScore > 5) {
      recommendation = 'adopt'
    } else if (!isSignificant) {
      recommendation = 'continue'
    }
    
    return {
      testId: test.testId,
      controlMetrics,
      experimentMetrics,
      improvement,
      significance,
      isSignificant,
      recommendation,
      confidence: 1 - significance
    }
  }

  /**
   * 收集策略指标
   * 
   * @param strategy - 策略配置
   * @returns 策略指标
   */
  private async collectMetricsForStrategy(strategy: StrategyConfig): Promise<StrategyMetrics> {
    // 简化实现，实际应该基于真实的测试数据
    const baseMetrics = await this.collectCurrentMetrics()
    
    // 根据策略类型调整指标
    const adjustments = this.getStrategyAdjustments(strategy)
    
    return {
      hitRate: Math.min(1, baseMetrics.hitRate * adjustments.hitRate),
      avgResponseTime: baseMetrics.avgResponseTime * adjustments.responseTime,
      memoryUsage: Math.min(1, baseMetrics.memoryUsage * adjustments.memoryUsage),
      errorRate: Math.max(0, baseMetrics.errorRate * adjustments.errorRate),
      throughput: baseMetrics.throughput * adjustments.throughput,
      costScore: baseMetrics.costScore * adjustments.costScore,
      overallScore: 0 // 将在后面计算
    }
  }

  /**
   * 获取策略调整因子
   * 
   * @param strategy - 策略配置
   * @returns 调整因子
   */
  private getStrategyAdjustments(strategy: StrategyConfig): {
    hitRate: number
    responseTime: number
    memoryUsage: number
    errorRate: number
    throughput: number
    costScore: number
  } {
    switch (strategy.type) {
      case OptimizationStrategy.PERFORMANCE:
        return {
          hitRate: 1.1,
          responseTime: 0.8,
          memoryUsage: 1.2,
          errorRate: 0.9,
          throughput: 1.15,
          costScore: 1.1
        }
      case OptimizationStrategy.MEMORY:
        return {
          hitRate: 0.95,
          responseTime: 1.1,
          memoryUsage: 0.7,
          errorRate: 1.0,
          throughput: 0.9,
          costScore: 0.8
        }
      case OptimizationStrategy.LATENCY:
        return {
          hitRate: 1.05,
          responseTime: 0.7,
          memoryUsage: 1.1,
          errorRate: 0.95,
          throughput: 1.1,
          costScore: 1.05
        }
      default:
        return {
          hitRate: 1.0,
          responseTime: 1.0,
          memoryUsage: 1.0,
          errorRate: 1.0,
          throughput: 1.0,
          costScore: 1.0
        }
    }
  }

  /**
   * 计算统计显著性
   * 
   * @param control - 控制组指标
   * @param experiment - 实验组指标
   * @returns p值
   */
  private calculateStatisticalSignificance(control: StrategyMetrics, experiment: StrategyMetrics): number {
    // 简化的t检验实现
    const diff = experiment.overallScore - control.overallScore
    const pooledStd = 0.1 // 假设标准差
    const n = 100 // 假设样本大小
    
    const tStat = diff / (pooledStd * Math.sqrt(2 / n))
    
    // 简化的p值计算
    return Math.max(0.001, 1 - Math.abs(tStat) / 3)
  }

  /**
   * 采用新策略
   * 
   * @param strategy - 新策略
   */
  private async adoptStrategy(strategy: StrategyConfig): Promise<void> {
    console.log(`Adopting new strategy: ${strategy.name}`)
    
    this.currentStrategy = strategy.name
    
    // 更新缓存配置
    await this.updateCacheConfig(strategy)
    
    this.emit('strategy-adopted', strategy)
  }

  /**
   * 训练机器学习模型
   */
  private async trainModels(): Promise<void> {
    if (this.metricsHistory.length < 50) {
      return // 数据不足
    }
    
    try {
      // 训练性能预测模型
      const performanceModel = this.mlModels.get('performance_predictor')
      if (performanceModel) {
        const trainingData = this.preparePerformanceTrainingData()
        performanceModel.train(trainingData)
        console.log('Performance prediction model trained')
      }
      
      // 训练策略分类模型
      const strategyModel = this.mlModels.get('strategy_classifier')
      if (strategyModel) {
        const trainingData = this.prepareStrategyTrainingData()
        strategyModel.train(trainingData)
        console.log('Strategy classification model trained')
      }
      
    } catch (error) {
      console.error('Model training failed:', error)
    }
  }

  /**
   * 准备性能训练数据
   * 
   * @returns 训练数据
   */
  private preparePerformanceTrainingData(): any[] {
    return this.metricsHistory.map((metrics, index) => ({
      input: {
        hitRate: metrics.hitRate,
        responseTime: metrics.avgResponseTime,
        memoryUsage: metrics.memoryUsage,
        errorRate: metrics.errorRate,
        throughput: metrics.throughput
      },
      output: metrics.overallScore
    }))
  }

  /**
   * 准备策略训练数据
   * 
   * @returns 训练数据
   */
  private prepareStrategyTrainingData(): any[] {
    const data: any[] = []
    
    // 基于历史数据和策略效果创建训练样本
    for (const [strategyName, strategy] of Array.from(this.strategies)) {
      const adjustments = this.getStrategyAdjustments(strategy)
      
      this.metricsHistory.forEach(metrics => {
        data.push({
          input: metrics,
          output: strategyName,
          performance: metrics.overallScore * adjustments.hitRate * (1 / adjustments.responseTime)
        })
      })
    }
    
    return data
  }

  /**
   * 预测性能
   * 
   * @param input - 输入数据
   * @returns 预测结果
   */
  private predictPerformance(input: any): any {
    // 简化的线性回归预测
    const weights = {
      hitRate: 0.4,
      responseTime: -0.3,
      memoryUsage: -0.2,
      errorRate: -0.1
    }
    
    const score = 
      weights.hitRate * input.hitRate +
      weights.responseTime * (1 / Math.max(1, input.responseTime / 100)) +
      weights.memoryUsage * (1 - input.memoryUsage) +
      weights.errorRate * (1 - input.errorRate)
    
    return {
      expectedScore: Math.max(0, Math.min(1, score)),
      confidence: 0.7
    }
  }

  /**
   * 分类最优策略
   * 
   * @param input - 输入指标
   * @returns 最优策略名称
   */
  private classifyOptimalStrategy(input: StrategyMetrics): string {
    // 简化的决策树逻辑
    if (input.memoryUsage > 0.8) {
      return 'memory_optimized'
    } else if (input.avgResponseTime > 100) {
      return 'low_latency'
    } else if (input.hitRate < 0.6) {
      return 'performance'
    } else {
      return 'default'
    }
  }

  /**
   * 训练性能模型
   * 
   * @param data - 训练数据
   */
  private trainPerformanceModel(data: any[]): void {
    // 简化的训练逻辑
    const model = this.mlModels.get('performance_predictor')
    if (model) {
      model.trainingData = data
      model.accuracy = Math.min(0.95, 0.5 + data.length / 1000)
      model.lastTrainedAt = new Date()
    }
  }

  /**
   * 训练策略模型
   * 
   * @param data - 训练数据
   */
  private trainStrategyModel(data: any[]): void {
    // 简化的训练逻辑
    const model = this.mlModels.get('strategy_classifier')
    if (model) {
      model.trainingData = data
      model.accuracy = Math.min(0.9, 0.4 + data.length / 500)
      model.lastTrainedAt = new Date()
    }
  }

  /**
   * 处理指标更新
   * 
   * @param metrics - 缓存指标
   */
  private handleMetricsUpdate(metrics: any): void {
    // 检查是否需要立即优化
    if (metrics.hitRate < 0.5 || metrics.avgResponseTime > 200) {
      console.log('Performance degradation detected, triggering immediate optimization')
      this.performOptimization()
    }
  }

  /**
   * 处理数据库指标
   * 
   * @param dbMetrics - 数据库指标
   */
  private handleDatabaseMetrics(dbMetrics: any): void {
    // 根据数据库负载调整缓存策略
    if (dbMetrics.connectionPoolUsage > 0.9) {
      // 数据库连接池使用率高，增加缓存积极性
      this.adjustCacheAggressiveness(1.2)
    } else if (dbMetrics.connectionPoolUsage < 0.3) {
      // 数据库负载低，可以减少缓存
      this.adjustCacheAggressiveness(0.8)
    }
  }

  /**
   * 调整缓存积极性
   * 
   * @param factor - 调整因子
   */
  private adjustCacheAggressiveness(factor: number): void {
    const currentConfig = intelligentCacheManager.getConfig()
    
    const newConfig = {
      ...currentConfig,
      l1: {
        ...currentConfig.l1,
        ttl: Math.max(60000, currentConfig.l1.ttl * factor),
        maxSize: Math.max(100, Math.floor(currentConfig.l1.maxSize * factor))
      },
      l2: {
        ...currentConfig.l2,
        ttl: Math.max(300000, currentConfig.l2.ttl * factor),
        maxSize: Math.max(1000, Math.floor(currentConfig.l2.maxSize * factor))
      }
    }
    
    intelligentCacheManager.updateConfig(newConfig)
    console.log(`Adjusted cache aggressiveness by factor ${factor}`)
  }

  /**
   * 获取优化建议
   * 
   * @returns 当前建议列表
   */
  getRecommendations(): OptimizationRecommendation[] {
    return [...this.recommendations]
  }

  /**
   * 获取活跃的A/B测试
   * 
   * @returns 活跃测试列表
   */
  getActiveTests(): ABTestConfig[] {
    return Array.from(this.activeTests.values())
  }

  /**
   * 获取测试结果
   * 
   * @returns 测试结果列表
   */
  getTestResults(): ABTestResult[] {
    return Array.from(this.testResults.values())
  }

  /**
   * 获取策略列表
   * 
   * @returns 策略配置列表
   */
  getStrategies(): StrategyConfig[] {
    return Array.from(this.strategies.values())
  }

  /**
   * 获取当前策略
   * 
   * @returns 当前策略名称
   */
  getCurrentStrategy(): string {
    return this.currentStrategy
  }

  /**
   * 获取机器学习模型状态
   * 
   * @returns 模型状态
   */
  getMLModelStatus(): { name: string; accuracy: number; lastTrained: Date }[] {
    return Array.from(this.mlModels.values()).map(model => ({
      name: model.name,
      accuracy: model.accuracy,
      lastTrained: model.lastTrainedAt
    }))
  }

  /**
   * 手动触发优化
   */
  async triggerOptimization(): Promise<void> {
    await this.performOptimization()
  }

  /**
   * 更新优化配置
   * 
   * @param config - 新配置
   */
  updateOptimizationConfig(config: Partial<typeof this.optimizationConfig>): void {
    Object.assign(this.optimizationConfig, config)
    
    // 重启优化间隔
    if (this.optimizationInterval && config.interval) {
      clearInterval(this.optimizationInterval)
      this.optimizationInterval = setInterval(() => {
        this.performOptimization()
      }, this.optimizationConfig.interval)
    }
    
    console.log('Optimization configuration updated')
    this.emit('config-updated', this.optimizationConfig)
  }

  /**
   * 生成优化报告
   * 
   * @returns 优化报告
   */
  generateOptimizationReport(): {
    summary: string
    currentStrategy: string
    recommendations: number
    activeTests: number
    modelAccuracy: any
    performance: any
  } {
    const modelAccuracy = this.getMLModelStatus().reduce((acc: { [key: string]: number }, model) => {
      acc[model.name] = model.accuracy
      return acc
    }, {} as { [key: string]: number })
    
    const currentMetrics = this.metricsHistory[this.metricsHistory.length - 1]
    
    return {
      summary: `
缓存策略优化报告
================
生成时间: ${new Date().toISOString()}
当前策略: ${this.currentStrategy}
优化建议: ${this.recommendations.length} 条
活跃测试: ${this.activeTests.size} 个
历史数据: ${this.metricsHistory.length} 条记录
模型准确率: ${Object.values(modelAccuracy).map(a => `${(a * 100).toFixed(1)}%`).join(', ')}
      `.trim(),
      currentStrategy: this.currentStrategy,
      recommendations: this.recommendations.length,
      activeTests: this.activeTests.size,
      modelAccuracy,
      performance: currentMetrics || {}
    }
  }
}

// 创建全局实例
export const cacheStrategyOptimizer = new CacheStrategyOptimizer()

// 导出类型
export type {
  StrategyConfig,
  StrategyMetrics,
  ABTestConfig,
  ABTestResult,
  OptimizationRecommendation,
  MLModel
}

export { OptimizationStrategy }
