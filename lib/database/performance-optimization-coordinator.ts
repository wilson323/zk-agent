/**
 * 数据库性能优化协调器
 * 统一管理和协调所有数据库性能优化组件
 * 
 * 功能:
 * - 组件生命周期管理
 * - 优化策略协调
 * - 性能监控集成
 * - 自动化优化决策
 * - 配置统一管理
 * 
 * @author ZK-Agent Team
 * @version 1.0.0
 */

import { EventEmitter } from 'events'
import { DatabasePoolOptimizer } from './pool-optimizer'
import { ConnectionPoolAnalyzer } from './connection-pool-analyzer'
import { DynamicPoolAdjuster } from './dynamic-pool-adjuster'
import { QueryPerformanceOptimizer } from './query-performance-optimizer'
import { IntelligentCacheManager } from './intelligent-cache-manager'
import { CacheStrategyOptimizer } from './cache-strategy-optimizer'
import { PerformanceMonitorEnhancer } from './performance-monitor-enhancer'
import { getMonitoringService, isMonitoringInitialized } from './monitoring-registry'
import { DatabaseMetrics, IMonitoringService } from './unified-interfaces'
import { IMonitoringService as IMonitoringServiceLegacy } from './monitoring-interfaces'

/**
 * 优化组件状态
 */
interface ComponentStatus {
  /** 组件名称 */
  name: string
  /** 是否启用 */
  enabled: boolean
  /** 是否运行中 */
  running: boolean
  /** 最后更新时间 */
  lastUpdate: Date
  /** 健康状态 */
  health: 'healthy' | 'warning' | 'error'
  /** 状态消息 */
  message?: string
  /** 性能指标 */
  metrics?: Record<string, number>
}

/**
 * 优化策略配置
 */
interface OptimizationStrategy {
  /** 策略名称 */
  name: string
  /** 是否启用 */
  enabled: boolean
  /** 优先级 */
  priority: number
  /** 触发条件 */
  triggers: {
    /** 性能阈值 */
    performanceThreshold?: number
    /** 错误率阈值 */
    errorRateThreshold?: number
    /** 延迟阈值 */
    latencyThreshold?: number
    /** 资源使用率阈值 */
    resourceUsageThreshold?: number
  }
  /** 优化动作 */
  actions: {
    /** 连接池优化 */
    poolOptimization?: boolean
    /** 查询优化 */
    queryOptimization?: boolean
    /** 缓存优化 */
    cacheOptimization?: boolean
    /** 监控增强 */
    monitoringEnhancement?: boolean
  }
  /** 冷却期(ms) */
  cooldownPeriod: number
  /** 最后执行时间 */
  lastExecuted?: Date
}

/**
 * 协调器配置
 */
interface CoordinatorConfig {
  /** 是否启用自动优化 */
  autoOptimization: boolean
  /** 检查间隔(ms) */
  checkInterval: number
  /** 优化间隔(ms) */
  optimizationInterval: number
  /** 是否启用性能监控 */
  performanceMonitoring: boolean
  /** 是否启用告警 */
  alerting: boolean
  /** 日志级别 */
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  /** 最大并发优化数 */
  maxConcurrentOptimizations: number
}

/**
 * 优化结果
 */
interface OptimizationResult {
  /** 优化ID */
  id: string
  /** 策略名称 */
  strategy: string
  /** 开始时间 */
  startTime: Date
  /** 结束时间 */
  endTime: Date
  /** 是否成功 */
  success: boolean
  /** 错误信息 */
  error?: string
  /** 优化前指标 */
  beforeMetrics: Record<string, number>
  /** 优化后指标 */
  afterMetrics: Record<string, number>
  /** 改进情况 */
  improvements: {
    metric: string
    before: number
    after: number
    improvement: number
    percentage: number
  }[]
  /** 执行的动作 */
  actions: string[]
}

/**
 * 性能优化协调器类
 */
export class PerformanceOptimizationCoordinator extends EventEmitter {
  private isRunning: boolean = false
  private checkInterval: NodeJS.Timeout | null = null
  private optimizationInterval: NodeJS.Timeout | null = null
  private components: Map<string, any> = new Map()
  private componentStatus: Map<string, ComponentStatus> = new Map()
  private strategies: Map<string, OptimizationStrategy> = new Map()
  private optimizationHistory: OptimizationResult[] = []
  private activeOptimizations: Set<string> = new Set()
  private config: CoordinatorConfig

  constructor() {
    super()
    
    this.config = {
      autoOptimization: true,
      checkInterval: 60000,      // 1分钟
      optimizationInterval: 300000, // 5分钟
      performanceMonitoring: true,
      alerting: true,
      logLevel: 'info',
      maxConcurrentOptimizations: 3
    }
    
    // 延迟所有初始化以避免循环依赖
    process.nextTick(async () => {
      this.initializeComponents()
      this.initializeStrategies()
      await this.setupEventListeners()
    })
  }

  /**
   * 初始化组件
   */
  private initializeComponents(): void {
    // 注册所有优化组件
    this.components.set('poolOptimizer', new DatabasePoolOptimizer())
    this.components.set('poolAnalyzer', new ConnectionPoolAnalyzer())
    this.components.set('dynamicAdjuster', new DynamicPoolAdjuster())
    this.components.set('queryOptimizer', new QueryPerformanceOptimizer())
    this.components.set('cacheManager', new IntelligentCacheManager())
    this.components.set('cacheOptimizer', new CacheStrategyOptimizer())
    this.components.set('performanceMonitor', new PerformanceMonitorEnhancer())
    
    // 初始化组件状态
    for (const [name, component] of Array.from(this.components)) {
      this.componentStatus.set(name, {
        name,
        enabled: true,
        running: false,
        lastUpdate: new Date(),
        health: 'healthy'
      })
    }
  }

  /**
   * 初始化优化策略
   */
  private initializeStrategies(): void {
    // 连接池优化策略
    this.strategies.set('connectionPoolOptimization', {
      name: 'Connection Pool Optimization',
      enabled: true,
      priority: 1,
      triggers: {
        performanceThreshold: 0.8,
        latencyThreshold: 200
      },
      actions: {
        poolOptimization: true
      },
      cooldownPeriod: 300000 // 5分钟
    })
    
    // 查询性能优化策略
    this.strategies.set('queryPerformanceOptimization', {
      name: 'Query Performance Optimization',
      enabled: true,
      priority: 2,
      triggers: {
        latencyThreshold: 500,
        errorRateThreshold: 0.01
      },
      actions: {
        queryOptimization: true
      },
      cooldownPeriod: 600000 // 10分钟
    })
    
    // 缓存优化策略
    this.strategies.set('cacheOptimization', {
      name: 'Cache Optimization',
      enabled: true,
      priority: 3,
      triggers: {
        performanceThreshold: 0.7
      },
      actions: {
        cacheOptimization: true
      },
      cooldownPeriod: 900000 // 15分钟
    })
    
    // 综合优化策略
    this.strategies.set('comprehensiveOptimization', {
      name: 'Comprehensive Optimization',
      enabled: true,
      priority: 4,
      triggers: {
        performanceThreshold: 0.6,
        errorRateThreshold: 0.05,
        latencyThreshold: 1000
      },
      actions: {
        poolOptimization: true,
        queryOptimization: true,
        cacheOptimization: true,
        monitoringEnhancement: true
      },
      cooldownPeriod: 1800000 // 30分钟
    })
  }

  /**
   * 设置事件监听器
   */
  private async setupEventListeners(): Promise<void> {
    // 监听性能监控器事件
    const performanceMonitor = this.components.get('performanceMonitor')
    if (performanceMonitor) {
      performanceMonitor.on('anomaly-detected', (anomaly) => {
        this.handleAnomalyDetected(anomaly)
      })
      
      performanceMonitor.on('critical-alert', (alert) => {
        this.handleCriticalAlert(alert)
      })
    }
    
    // 监听数据库监控事件
    if (isMonitoringInitialized()) {
      const monitoringService = await getMonitoringService()
      if (monitoringService) {
        monitoringService.on('performance-degradation', (metrics: DatabaseMetrics) => {
          this.handlePerformanceDegradation(metrics)
        })
      }
    }
    
    // 监听组件事件
    for (const [name, component] of this.components) {
      if (component.on) {
        component.on('error', (error) => {
          this.handleComponentError(name, error)
        })
        
        component.on('optimization-completed', (result) => {
          this.handleOptimizationCompleted(name, result)
        })
      }
    }
  }

  /**
   * 启动协调器
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Performance optimization coordinator is already running')
      return
    }

    console.log('Starting performance optimization coordinator')
    
    this.isRunning = true
    
    // 启动所有组件
    await this.startAllComponents()
    
    // 启动定期检查
    if (this.config.autoOptimization) {
      this.checkInterval = setInterval(() => {
        this.performHealthCheck()
      }, this.config.checkInterval)
      
      this.optimizationInterval = setInterval(() => {
        this.evaluateOptimizationNeeds()
      }, this.config.optimizationInterval)
    }
    
    // 初始健康检查
    await this.performHealthCheck()
    
    this.emit('coordinator-started')
    console.log('Performance optimization coordinator started successfully')
  }

  /**
   * 停止协调器
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    console.log('Stopping performance optimization coordinator')
    
    this.isRunning = false
    
    // 停止定时器
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
    
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval)
      this.optimizationInterval = null
    }
    
    // 停止所有组件
    await this.stopAllComponents()
    
    this.emit('coordinator-stopped')
  }

  /**
   * 启动所有组件
   */
  private async startAllComponents(): Promise<void> {
    const startPromises: Promise<void>[] = []
    
    for (const [name, component] of this.components) {
      const status = this.componentStatus.get(name)
      if (status?.enabled && component.start) {
        startPromises.push(
          component.start().then(() => {
            this.updateComponentStatus(name, {
              running: true,
              health: 'healthy',
              lastUpdate: new Date()
            })
            console.log(`Component ${name} started successfully`)
          }).catch((error) => {
            this.updateComponentStatus(name, {
              running: false,
              health: 'error',
              message: error.message,
              lastUpdate: new Date()
            })
            console.error(`Failed to start component ${name}:`, error)
          })
        )
      }
    }
    
    await Promise.allSettled(startPromises)
  }

  /**
   * 停止所有组件
   */
  private async stopAllComponents(): Promise<void> {
    const stopPromises: Promise<void>[] = []
    
    for (const [name, component] of this.components) {
      if (component.stop) {
        stopPromises.push(
          component.stop().then(() => {
            this.updateComponentStatus(name, {
              running: false,
              lastUpdate: new Date()
            })
            console.log(`Component ${name} stopped successfully`)
          }).catch((error) => {
            console.error(`Failed to stop component ${name}:`, error)
          })
        )
      }
    }
    
    await Promise.allSettled(stopPromises)
  }

  /**
   * 执行健康检查
   */
  private async performHealthCheck(): Promise<void> {
    try {
      console.log('Performing health check...')
      
      for (const [name, component] of this.components) {
        const status = this.componentStatus.get(name)
        if (!status?.enabled) continue
        
        try {
          // 检查组件健康状态
          let health: 'healthy' | 'warning' | 'error' = 'healthy'
          let message: string | undefined
          let metrics: Record<string, number> | undefined
          
          if (component.getStatus) {
            const componentStatus = component.getStatus()
            
            // 根据组件状态判断健康度
            if (componentStatus.error) {
              health = 'error'
              message = componentStatus.error
            } else if (componentStatus.warnings && componentStatus.warnings.length > 0) {
              health = 'warning'
              message = componentStatus.warnings.join(', ')
            }
            
            metrics = componentStatus.metrics
          }
          
          this.updateComponentStatus(name, {
            health,
            message,
            metrics,
            lastUpdate: new Date()
          })
          
        } catch (error) {
          this.updateComponentStatus(name, {
            health: 'error',
            message: error.message,
            lastUpdate: new Date()
          })
        }
      }
      
      // 发送健康检查完成事件
      this.emit('health-check-completed', this.getOverallHealth())
      
    } catch (error) {
      console.error('Health check failed:', error)
      this.emit('health-check-error', error)
    }
  }

  /**
   * 评估优化需求
   */
  private async evaluateOptimizationNeeds(): Promise<void> {
    try {
      console.log('Evaluating optimization needs...')
      
      // 获取当前性能指标
      const performanceMonitor = this.components.get('performanceMonitor')
      if (!performanceMonitor) {
        return
      }
      
      const currentMetrics = performanceMonitor.getLatestMetrics()
      if (!currentMetrics) {
        return
      }
      
      // 评估每个策略
      for (const [strategyName, strategy] of this.strategies) {
        if (!strategy.enabled) continue
        
        // 检查冷却期
        if (this.isInCooldown(strategy)) {
          continue
        }
        
        // 检查是否达到触发条件
        if (this.shouldTriggerStrategy(strategy, currentMetrics)) {
          await this.executeOptimizationStrategy(strategyName, strategy, currentMetrics)
        }
      }
      
    } catch (error) {
      console.error('Optimization evaluation failed:', error)
      this.emit('optimization-evaluation-error', error)
    }
  }

  /**
   * 检查策略是否在冷却期
   * 
   * @param strategy - 优化策略
   * @returns 是否在冷却期
   */
  private isInCooldown(strategy: OptimizationStrategy): boolean {
    if (!strategy.lastExecuted) {
      return false
    }
    
    const timeSinceLastExecution = Date.now() - strategy.lastExecuted.getTime()
    return timeSinceLastExecution < strategy.cooldownPeriod
  }

  /**
   * 检查是否应该触发策略
   * 
   * @param strategy - 优化策略
   * @param metrics - 当前指标
   * @returns 是否应该触发
   */
  private shouldTriggerStrategy(strategy: OptimizationStrategy, metrics: any): boolean {
    const triggers = strategy.triggers
    
    // 检查性能阈值
    if (triggers.performanceThreshold) {
      const healthScore = this.components.get('performanceMonitor')?.lastHealthScore || 1
      if (healthScore < triggers.performanceThreshold) {
        return true
      }
    }
    
    // 检查错误率阈值
    if (triggers.errorRateThreshold) {
      if (metrics.queryPerformance.errorRate > triggers.errorRateThreshold) {
        return true
      }
    }
    
    // 检查延迟阈值
    if (triggers.latencyThreshold) {
      if (metrics.queryPerformance.avgExecutionTime > triggers.latencyThreshold) {
        return true
      }
    }
    
    // 检查资源使用率阈值
    if (triggers.resourceUsageThreshold) {
      if (metrics.connectionPool.usage > triggers.resourceUsageThreshold) {
        return true
      }
    }
    
    return false
  }

  /**
   * 执行优化策略
   * 
   * @param strategyName - 策略名称
   * @param strategy - 优化策略
   * @param currentMetrics - 当前指标
   */
  private async executeOptimizationStrategy(
    strategyName: string,
    strategy: OptimizationStrategy,
    currentMetrics: any
  ): Promise<void> {
    // 检查并发限制
    if (this.activeOptimizations.size >= this.config.maxConcurrentOptimizations) {
      console.log(`Skipping optimization ${strategyName} due to concurrency limit`)
      return
    }
    
    const optimizationId = `${strategyName}_${Date.now()}`
    this.activeOptimizations.add(optimizationId)
    
    const startTime = new Date()
    const beforeMetrics = this.extractMetrics(currentMetrics)
    const actions: string[] = []
    
    try {
      console.log(`Executing optimization strategy: ${strategy.name}`)
      
      // 执行连接池优化
      if (strategy.actions.poolOptimization) {
        const poolOptimizer = this.components.get('poolOptimizer')
        const dynamicAdjuster = this.components.get('dynamicAdjuster')
        
        if (poolOptimizer && poolOptimizer.triggerOptimization) {
          await poolOptimizer.triggerOptimization()
          actions.push('Pool optimization')
        }
        
        if (dynamicAdjuster && dynamicAdjuster.triggerAdjustment) {
          await dynamicAdjuster.triggerAdjustment()
          actions.push('Dynamic pool adjustment')
        }
      }
      
      // 执行查询优化
      if (strategy.actions.queryOptimization) {
        const queryOptimizer = this.components.get('queryOptimizer')
        
        if (queryOptimizer && queryOptimizer.triggerOptimization) {
          await queryOptimizer.triggerOptimization()
          actions.push('Query optimization')
        }
      }
      
      // 执行缓存优化
      if (strategy.actions.cacheOptimization) {
        const cacheManager = this.components.get('cacheManager')
        const cacheOptimizer = this.components.get('cacheOptimizer')
        
        if (cacheManager && cacheManager.optimizeCache) {
          await cacheManager.optimizeCache()
          actions.push('Cache management optimization')
        }
        
        if (cacheOptimizer && cacheOptimizer.triggerOptimization) {
          await cacheOptimizer.triggerOptimization()
          actions.push('Cache strategy optimization')
        }
      }
      
      // 执行监控增强
      if (strategy.actions.monitoringEnhancement) {
        const performanceMonitor = this.components.get('performanceMonitor')
        
        if (performanceMonitor && performanceMonitor.triggerAnalysis) {
          await performanceMonitor.triggerAnalysis()
          actions.push('Performance monitoring enhancement')
        }
      }
      
      // 等待优化生效
      await new Promise(resolve => setTimeout(resolve, 5000))
      
      // 获取优化后指标
      const afterMetrics = this.extractMetrics(
        this.components.get('performanceMonitor')?.getLatestMetrics() || currentMetrics
      )
      
      // 计算改进情况
      const improvements = this.calculateImprovements(beforeMetrics, afterMetrics)
      
      // 记录优化结果
      const result: OptimizationResult = {
        id: optimizationId,
        strategy: strategyName,
        startTime,
        endTime: new Date(),
        success: true,
        beforeMetrics,
        afterMetrics,
        improvements,
        actions
      }
      
      this.optimizationHistory.push(result)
      strategy.lastExecuted = new Date()
      
      console.log(`Optimization strategy ${strategy.name} completed successfully`)
      this.emit('optimization-completed', result)
      
    } catch (error) {
      const result: OptimizationResult = {
        id: optimizationId,
        strategy: strategyName,
        startTime,
        endTime: new Date(),
        success: false,
        error: error.message,
        beforeMetrics,
        afterMetrics: beforeMetrics,
        improvements: [],
        actions
      }
      
      this.optimizationHistory.push(result)
      
      console.error(`Optimization strategy ${strategy.name} failed:`, error)
      this.emit('optimization-failed', result)
      
    } finally {
      this.activeOptimizations.delete(optimizationId)
    }
  }

  /**
   * 提取关键指标
   * 
   * @param metrics - 原始指标
   * @returns 关键指标
   */
  private extractMetrics(metrics: any): Record<string, number> {
    return {
      connectionPoolUsage: metrics.connectionPool?.usage || 0,
      avgExecutionTime: metrics.queryPerformance?.avgExecutionTime || 0,
      errorRate: metrics.queryPerformance?.errorRate || 0,
      throughput: metrics.queryPerformance?.throughput || 0,
      memoryUsage: metrics.systemResources?.memoryUsage || 0,
      cpuUsage: metrics.systemResources?.cpuUsage || 0
    }
  }

  /**
   * 计算改进情况
   * 
   * @param before - 优化前指标
   * @param after - 优化后指标
   * @returns 改进情况
   */
  private calculateImprovements(
    before: Record<string, number>,
    after: Record<string, number>
  ): { metric: string; before: number; after: number; improvement: number; percentage: number }[] {
    const improvements: any[] = []
    
    for (const metric in before) {
      const beforeValue = before[metric]
      const afterValue = after[metric]
      
      if (beforeValue > 0) {
        const improvement = beforeValue - afterValue
        const percentage = (improvement / beforeValue) * 100
        
        // 对于某些指标，减少是改进（如错误率、延迟）
        const isNegativeMetric = metric.includes('errorRate') || 
                                metric.includes('avgExecutionTime') ||
                                metric.includes('Usage')
        
        if (isNegativeMetric ? improvement > 0 : improvement < 0) {
          improvements.push({
            metric,
            before: beforeValue,
            after: afterValue,
            improvement: Math.abs(improvement),
            percentage: Math.abs(percentage)
          })
        }
      }
    }
    
    return improvements
  }

  /**
   * 处理异常检测
   * 
   * @param anomaly - 异常信息
   */
  private async handleAnomalyDetected(anomaly: any): Promise<void> {
    console.log(`Anomaly detected: ${anomaly.description}`)
    
    // 根据异常类型触发相应的优化策略
    if (anomaly.type === 'CONNECTION_POOL_EXHAUSTION') {
      await this.triggerStrategy('connectionPoolOptimization')
    } else if (anomaly.type === 'HIGH_LATENCY' || anomaly.type === 'SLOW_QUERY') {
      await this.triggerStrategy('queryPerformanceOptimization')
    } else if (anomaly.severity === 'critical') {
      await this.triggerStrategy('comprehensiveOptimization')
    }
    
    this.emit('anomaly-handled', anomaly)
  }

  /**
   * 处理关键告警
   * 
   * @param alert - 告警信息
   */
  private async handleCriticalAlert(alert: any): Promise<void> {
    console.warn(`Critical alert: ${alert.message}`)
    
    // 立即触发综合优化策略
    await this.triggerStrategy('comprehensiveOptimization')
    
    this.emit('critical-alert-handled', alert)
  }

  /**
   * 处理性能下降
   * 
   * @param metrics - 性能指标
   */
  private async handlePerformanceDegradation(metrics: any): Promise<void> {
    console.log('Performance degradation detected')
    
    // 根据性能下降程度选择优化策略
    const healthScore = this.components.get('performanceMonitor')?.lastHealthScore || 1
    
    if (healthScore < 0.5) {
      await this.triggerStrategy('comprehensiveOptimization')
    } else if (healthScore < 0.7) {
      await this.triggerStrategy('connectionPoolOptimization')
      await this.triggerStrategy('queryPerformanceOptimization')
    }
    
    this.emit('performance-degradation-handled', metrics)
  }

  /**
   * 处理组件错误
   * 
   * @param componentName - 组件名称
   * @param error - 错误信息
   */
  private handleComponentError(componentName: string, error: any): void {
    console.error(`Component ${componentName} error:`, error)
    
    this.updateComponentStatus(componentName, {
      health: 'error',
      message: error.message,
      lastUpdate: new Date()
    })
    
    this.emit('component-error', { componentName, error })
  }

  /**
   * 处理优化完成
   * 
   * @param componentName - 组件名称
   * @param result - 优化结果
   */
  private handleOptimizationCompleted(componentName: string, result: any): void {
    console.log(`Component ${componentName} optimization completed`)
    
    this.updateComponentStatus(componentName, {
      health: 'healthy',
      lastUpdate: new Date(),
      metrics: result.metrics
    })
    
    this.emit('component-optimization-completed', { componentName, result })
  }

  /**
   * 触发指定策略
   * 
   * @param strategyName - 策略名称
   */
  private async triggerStrategy(strategyName: string): Promise<void> {
    const strategy = this.strategies.get(strategyName)
    if (!strategy || !strategy.enabled) {
      return
    }
    
    // 检查冷却期
    if (this.isInCooldown(strategy)) {
      console.log(`Strategy ${strategyName} is in cooldown period`)
      return
    }
    
    const performanceMonitor = this.components.get('performanceMonitor')
    const currentMetrics = performanceMonitor?.getLatestMetrics()
    
    if (currentMetrics) {
      await this.executeOptimizationStrategy(strategyName, strategy, currentMetrics)
    }
  }

  /**
   * 更新组件状态
   * 
   * @param componentName - 组件名称
   * @param updates - 状态更新
   */
  private updateComponentStatus(componentName: string, updates: Partial<ComponentStatus>): void {
    const currentStatus = this.componentStatus.get(componentName)
    if (currentStatus) {
      Object.assign(currentStatus, updates)
      this.componentStatus.set(componentName, currentStatus)
    }
  }

  /**
   * 获取整体健康状态
   * 
   * @returns 整体健康状态
   */
  private getOverallHealth(): {
    status: 'healthy' | 'warning' | 'error'
    score: number
    components: ComponentStatus[]
  } {
    const components = Array.from(this.componentStatus.values())
    const enabledComponents = components.filter(c => c.enabled)
    
    if (enabledComponents.length === 0) {
      return { status: 'error', score: 0, components }
    }
    
    const healthyCount = enabledComponents.filter(c => c.health === 'healthy').length
    const warningCount = enabledComponents.filter(c => c.health === 'warning').length
    const errorCount = enabledComponents.filter(c => c.health === 'error').length
    
    const score = (healthyCount + warningCount * 0.5) / enabledComponents.length
    
    let status: 'healthy' | 'warning' | 'error'
    if (errorCount > 0) {
      status = 'error'
    } else if (warningCount > 0) {
      status = 'warning'
    } else {
      status = 'healthy'
    }
    
    return { status, score, components }
  }

  /**
   * 获取协调器状态
   * 
   * @returns 协调器状态
   */
  getStatus(): {
    isRunning: boolean
    config: CoordinatorConfig
    overallHealth: ReturnType<typeof this.getOverallHealth>
    activeOptimizations: number
    optimizationHistory: number
    strategies: { name: string; enabled: boolean; lastExecuted?: Date }[]
  } {
    return {
      isRunning: this.isRunning,
      config: { ...this.config },
      overallHealth: this.getOverallHealth(),
      activeOptimizations: this.activeOptimizations.size,
      optimizationHistory: this.optimizationHistory.length,
      strategies: Array.from(this.strategies.values()).map(s => ({
        name: s.name,
        enabled: s.enabled,
        lastExecuted: s.lastExecuted
      }))
    }
  }

  /**
   * 获取组件状态
   * 
   * @returns 组件状态列表
   */
  getComponentStatus(): ComponentStatus[] {
    return Array.from(this.componentStatus.values())
  }

  /**
   * 获取优化历史
   * 
   * @param limit - 限制数量
   * @returns 优化历史
   */
  getOptimizationHistory(limit?: number): OptimizationResult[] {
    const history = [...this.optimizationHistory].reverse()
    return limit ? history.slice(0, limit) : history
  }

  /**
   * 启用/禁用组件
   * 
   * @param componentName - 组件名称
   * @param enabled - 是否启用
   */
  async setComponentEnabled(componentName: string, enabled: boolean): Promise<void> {
    const status = this.componentStatus.get(componentName)
    if (!status) {
      throw new Error(`Component ${componentName} not found`)
    }
    
    status.enabled = enabled
    
    if (this.isRunning) {
      const component = this.components.get(componentName)
      if (component) {
        if (enabled && !status.running && component.start) {
          await component.start()
          status.running = true
        } else if (!enabled && status.running && component.stop) {
          await component.stop()
          status.running = false
        }
      }
    }
    
    console.log(`Component ${componentName} ${enabled ? 'enabled' : 'disabled'}`)
    this.emit('component-status-changed', { componentName, enabled })
  }

  /**
   * 启用/禁用策略
   * 
   * @param strategyName - 策略名称
   * @param enabled - 是否启用
   */
  setStrategyEnabled(strategyName: string, enabled: boolean): void {
    const strategy = this.strategies.get(strategyName)
    if (!strategy) {
      throw new Error(`Strategy ${strategyName} not found`)
    }
    
    strategy.enabled = enabled
    
    console.log(`Strategy ${strategyName} ${enabled ? 'enabled' : 'disabled'}`)
    this.emit('strategy-status-changed', { strategyName, enabled })
  }

  /**
   * 更新配置
   * 
   * @param newConfig - 新配置
   */
  updateConfig(newConfig: Partial<CoordinatorConfig>): void {
    Object.assign(this.config, newConfig)
    
    // 重启定时器
    if (this.isRunning) {
      this.stop().then(() => this.start())
    }
    
    console.log('Coordinator configuration updated')
    this.emit('config-updated', this.config)
  }

  /**
   * 手动触发健康检查
   */
  async triggerHealthCheck(): Promise<void> {
    await this.performHealthCheck()
  }

  /**
   * 手动触发优化评估
   */
  async triggerOptimizationEvaluation(): Promise<void> {
    await this.evaluateOptimizationNeeds()
  }

  /**
   * 手动执行指定策略
   * 
   * @param strategyName - 策略名称
   */
  async executeStrategy(strategyName: string): Promise<void> {
    await this.triggerStrategy(strategyName)
  }
}

// 创建全局实例
export const performanceOptimizationCoordinator = new PerformanceOptimizationCoordinator()

// 导出类型
export type {
  ComponentStatus,
  OptimizationStrategy,
  CoordinatorConfig,
  OptimizationResult
}
