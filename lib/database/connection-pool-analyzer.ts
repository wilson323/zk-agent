/**
 * 连接池使用模式分析器
 * 用于分析数据库连接池的实际使用情况，为优化提供数据支持
 * 
 * 功能:
 * - 实时监控连接池使用情况
 * - 分析连接使用模式和趋势
 * - 识别性能瓶颈和优化机会
 * - 生成优化建议报告
 * 
 * @author ZK-Agent Team
 * @version 1.0.0
 */

import { EventEmitter } from 'events'
import { DatabaseMetrics, IMonitoringService } from './unified-interfaces'
import { IMonitoringService as IMonitoringServiceLegacy } from './monitoring-interfaces'
import { getMonitoringService, isMonitoringInitialized } from './monitoring-registry'
import { Logger } from '../utils/logger'

/**
 * 连接池使用统计接口
 */
interface PoolUsageStats {
  /** 时间戳 */
  timestamp: Date
  /** 活跃连接数 */
  activeConnections: number
  /** 空闲连接数 */
  idleConnections: number
  /** 总连接数 */
  totalConnections: number
  /** 等待连接的请求数 */
  waitingRequests: number
  /** 连接获取平均时间(ms) */
  avgAcquireTime: number
  /** 连接使用率(%) */
  utilizationRate: number
  /** 峰值连接数 */
  peakConnections: number
  /** 连接创建次数 */
  connectionCreations: number
  /** 连接销毁次数 */
  connectionDestructions: number
}

/**
 * 使用模式分析结果接口
 */
interface UsagePatternAnalysis {
  /** 分析时间段 */
  timeRange: {
    start: Date
    end: Date
  }
  /** 平均使用率 */
  avgUtilization: number
  /** 峰值使用率 */
  peakUtilization: number
  /** 低谷使用率 */
  minUtilization: number
  /** 使用率标准差 */
  utilizationStdDev: number
  /** 连接获取延迟统计 */
  acquireTimeStats: {
    avg: number
    min: number
    max: number
    p95: number
    p99: number
  }
  /** 使用模式类型 */
  patternType: 'stable' | 'bursty' | 'growing' | 'declining' | 'irregular'
  /** 建议的连接池配置 */
  recommendedConfig: {
    minConnections: number
    maxConnections: number
    acquireTimeout: number
    idleTimeout: number
  }
}

/**
 * 优化建议接口
 */
interface OptimizationRecommendation {
  /** 建议类型 */
  type: 'increase_pool' | 'decrease_pool' | 'adjust_timeout' | 'optimize_queries' | 'no_action'
  /** 建议描述 */
  description: string
  /** 预期效果 */
  expectedImpact: string
  /** 优先级 */
  priority: 'high' | 'medium' | 'low'
  /** 具体配置建议 */
  configChanges?: Partial<PoolUsageStats>
}

/**
 * 连接池使用模式分析器类
 */
export class ConnectionPoolAnalyzer extends EventEmitter {
  private usageHistory: PoolUsageStats[] = []
  private isAnalyzing: boolean = false
  private analysisInterval: NodeJS.Timeout | null = null
  private maxHistorySize: number
  private analysisIntervalMs: number
  private logger = new Logger('ConnectionPoolAnalyzer')

  constructor(
    maxHistorySize: number = 1000,
    analysisIntervalMs: number = 30000 // 30秒分析一次
  ) {
    super()
    this.maxHistorySize = maxHistorySize
    this.analysisIntervalMs = analysisIntervalMs

    // 延迟监听数据库监控事件，避免循环依赖
    process.nextTick(async () => {
      await this.setupMonitoringListeners()
    })
  }

  /**
   * 设置监控事件监听器
   */
  private async setupMonitoringListeners(): Promise<void> {
    if (isMonitoringInitialized()) {
      const monitoringService = await getMonitoringService();
      if (monitoringService) {
        monitoringService.on('metrics', (metrics: DatabaseMetrics) => {
          this.recordUsageStats(metrics)
        })
      }
    }
  }

  /**
   * 记录连接池使用统计
   * 
   * @param metrics - 数据库监控指标
   */
  /**
   * 记录连接池使用统计
   * 
   * @param metrics - 数据库监控指标
   */
  private recordUsageStats(metrics: DatabaseMetrics): void {
    // 安全地获取连接池指标，提供默认值
    const activeConnections = metrics.activeConnections;
    const idleConnections = metrics.idleConnections;
    const waitingRequests = metrics.waitingRequests;
    const connectionCreations = metrics.connectionCreations;
    const connectionDestructions = metrics.connectionDestructions;
    
    const stats: PoolUsageStats = {
      timestamp: new Date(),
      activeConnections,
      idleConnections,
      totalConnections: activeConnections + idleConnections,
      waitingRequests,
      avgAcquireTime: metrics.averageLatency || 0,
      utilizationRate: this.calculateUtilizationRate(metrics),
      peakConnections: this.calculatePeakConnections(),
      connectionCreations,
      connectionDestructions
    }

    this.usageHistory.push(stats)

    // 限制历史记录大小
    if (this.usageHistory.length > this.maxHistorySize) {
      this.usageHistory.shift()
    }

    this.emit('usage-stats', stats)
  }

  /**
   * 计算连接池使用率
   * 
   * @param metrics - 数据库监控指标
   * @returns 使用率百分比
   */
  /**
   * 计算连接池使用率
   * 
   * @param metrics - 数据库监控指标
   * @returns 使用率百分比
   */
  private calculateUtilizationRate(metrics: DatabaseMetrics): number {
    const active = metrics.activeConnections
    const idle = metrics.idleConnections
    const total = active + idle
    
    if (total === 0) return 0
    return (active / total) * 100
  }

  /**
   * 计算峰值连接数
   * 
   * @returns 峰值连接数
   */
  private calculatePeakConnections(): number {
    if (this.usageHistory.length === 0) return 0
    
    return Math.max(...this.usageHistory.map(stats => stats.totalConnections))
  }

  /**
   * 开始分析
   */
  startAnalysis(): void {
    if (this.isAnalyzing) {
      console.log('Connection pool analysis is already running')
      return
    }

    console.log(`Starting connection pool usage analysis (interval: ${this.analysisIntervalMs}ms)`)
    this.isAnalyzing = true

    this.analysisInterval = setInterval(() => {
      this.performAnalysis()
    }, this.analysisIntervalMs)

    // 立即执行一次分析
    this.performAnalysis()
  }

  /**
   * 停止分析
   */
  stopAnalysis(): void {
    if (!this.isAnalyzing) {
      return
    }

    console.log('Stopping connection pool usage analysis')
    this.isAnalyzing = false

    if (this.analysisInterval) {
      clearInterval(this.analysisInterval)
      this.analysisInterval = null
    }
  }

  /**
   * 执行使用模式分析
   */
  private performAnalysis(): void {
    if (this.usageHistory.length < 10) {
      // 数据不足，无法进行有效分析
      return
    }

    try {
      const analysis = this.analyzeUsagePattern()
      const recommendations = this.generateRecommendations(analysis)
      
      this.emit('analysis-complete', {
        analysis,
        recommendations,
        timestamp: new Date()
      })

      console.log('Connection pool usage analysis completed', {
        patternType: analysis.patternType,
        avgUtilization: analysis.avgUtilization.toFixed(2) + '%',
        recommendationsCount: recommendations.length
      })

    } catch (error) {
      console.error('Error during connection pool analysis:', error)
      this.emit('analysis-error', error)
    }
  }

  /**
   * 分析使用模式
   * 
   * @param timeRangeMs - 分析时间范围(毫秒)
   * @returns 使用模式分析结果
   */
  analyzeUsagePattern(timeRangeMs: number = 3600000): UsagePatternAnalysis {
    const now = new Date()
    const startTime = new Date(now.getTime() - timeRangeMs)
    
    const relevantStats = this.usageHistory.filter(
      stats => stats.timestamp >= startTime
    )

    if (relevantStats.length === 0) {
      throw new Error('Insufficient data for analysis')
    }

    // 计算使用率统计
    const utilizations = relevantStats.map(stats => stats.utilizationRate)
    const avgUtilization = utilizations.reduce((sum, val) => sum + val, 0) / utilizations.length
    const peakUtilization = Math.max(...utilizations)
    const minUtilization = Math.min(...utilizations)
    
    // 计算标准差
    const variance = utilizations.reduce((sum, val) => sum + Math.pow(val - avgUtilization, 2), 0) / utilizations.length
    const utilizationStdDev = Math.sqrt(variance)

    // 计算连接获取时间统计
    const acquireTimes = relevantStats.map(stats => stats.avgAcquireTime).sort((a, b) => a - b)
    const acquireTimeStats = {
      avg: acquireTimes.reduce((sum, val) => sum + val, 0) / acquireTimes.length,
      min: acquireTimes[0],
      max: acquireTimes[acquireTimes.length - 1],
      p95: acquireTimes[Math.floor(acquireTimes.length * 0.95)],
      p99: acquireTimes[Math.floor(acquireTimes.length * 0.99)]
    }

    // 确定使用模式类型
    const patternType = this.determinePatternType(relevantStats, utilizationStdDev)

    // 生成推荐配置
    const recommendedConfig = this.generateRecommendedConfig(relevantStats, avgUtilization, peakUtilization)

    return {
      timeRange: {
        start: startTime,
        end: now
      },
      avgUtilization,
      peakUtilization,
      minUtilization,
      utilizationStdDev,
      acquireTimeStats,
      patternType,
      recommendedConfig
    }
  }

  /**
   * 确定使用模式类型
   * 
   * @param stats - 使用统计数据
   * @param stdDev - 使用率标准差
   * @returns 模式类型
   */
  private determinePatternType(stats: PoolUsageStats[], stdDev: number): UsagePatternAnalysis['patternType'] {
    const utilizations = stats.map(s => s.utilizationRate)
    const trend = this.calculateTrend(utilizations)
    
    if (stdDev < 10) {
      return 'stable'
    } else if (stdDev > 30) {
      return 'irregular'
    } else if (trend > 5) {
      return 'growing'
    } else if (trend < -5) {
      return 'declining'
    } else {
      return 'bursty'
    }
  }

  /**
   * 计算趋势
   * 
   * @param values - 数值数组
   * @returns 趋势值
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2))
    const secondHalf = values.slice(Math.floor(values.length / 2))
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length
    
    return secondAvg - firstAvg
  }

  /**
   * 生成推荐配置
   * 
   * @param stats - 使用统计数据
   * @param avgUtilization - 平均使用率
   * @param peakUtilization - 峰值使用率
   * @returns 推荐配置
   */
  private generateRecommendedConfig(
    stats: PoolUsageStats[],
    avgUtilization: number,
    peakUtilization: number
  ): UsagePatternAnalysis['recommendedConfig'] {
    const maxConnections = Math.max(...stats.map(s => s.totalConnections))
    const avgConnections = stats.reduce((sum, s) => sum + s.totalConnections, 0) / stats.length
    
    // 基于使用模式调整配置
    let minConnections = Math.max(2, Math.ceil(avgConnections * 0.3))
    let recommendedMax = Math.max(minConnections + 2, Math.ceil(maxConnections * 1.2))
    
    // 根据使用率调整
    if (avgUtilization > 80) {
      recommendedMax = Math.ceil(recommendedMax * 1.5)
    } else if (avgUtilization < 30) {
      recommendedMax = Math.max(minConnections + 1, Math.ceil(recommendedMax * 0.8))
    }
    
    // 计算超时时间
    const avgAcquireTime = stats.reduce((sum, s) => sum + s.avgAcquireTime, 0) / stats.length
    const acquireTimeout = Math.max(30000, avgAcquireTime * 3)
    const idleTimeout = avgUtilization > 60 ? 300000 : 600000 // 5-10分钟
    
    return {
      minConnections,
      maxConnections: recommendedMax,
      acquireTimeout,
      idleTimeout
    }
  }

  /**
   * 生成优化建议
   * 
   * @param analysis - 使用模式分析结果
   * @returns 优化建议数组
   */
  private generateRecommendations(analysis: UsagePatternAnalysis): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = []
    
    // 基于平均使用率的建议
    if (analysis.avgUtilization > 85) {
      recommendations.push({
        type: 'increase_pool',
        description: '连接池使用率过高，建议增加最大连接数',
        expectedImpact: '减少连接等待时间，提升并发处理能力',
        priority: 'high'
      })
    } else if (analysis.avgUtilization < 20) {
      recommendations.push({
        type: 'decrease_pool',
        description: '连接池使用率较低，建议减少连接数以节省资源',
        expectedImpact: '降低内存使用，减少维护开销',
        priority: 'medium'
      })
    }
    
    // 基于连接获取时间的建议
    if (analysis.acquireTimeStats.p95 > 5000) {
      recommendations.push({
        type: 'adjust_timeout',
        description: '连接获取时间较长，建议调整超时配置或增加连接数',
        expectedImpact: '减少连接获取延迟，提升响应速度',
        priority: 'high'
      })
    }
    
    // 基于使用模式的建议
    if (analysis.patternType === 'bursty') {
      recommendations.push({
        type: 'optimize_queries',
        description: '检测到突发性使用模式，建议优化查询性能或实现连接预热',
        expectedImpact: '平滑负载峰值，提升系统稳定性',
        priority: 'medium'
      })
    }
    
    // 如果没有明显问题
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'no_action',
        description: '连接池配置良好，暂无需要优化的项目',
        expectedImpact: '保持当前性能水平',
        priority: 'low'
      })
    }
    
    return recommendations
  }

  /**
   * 获取使用历史
   * 
   * @param limit - 限制返回数量
   * @returns 使用统计历史
   */
  getUsageHistory(limit?: number): PoolUsageStats[] {
    if (limit) {
      return this.usageHistory.slice(-limit)
    }
    return [...this.usageHistory]
  }

  /**
   * 获取当前使用统计
   * 
   * @returns 当前使用统计
   */
  getCurrentStats(): PoolUsageStats | null {
    return this.usageHistory.length > 0 ? this.usageHistory[this.usageHistory.length - 1] : null
  }

  /**
   * 清除历史数据
   */
  clearHistory(): void {
    this.usageHistory = []
    console.log('Connection pool usage history cleared')
  }

  /**
   * 生成分析报告
   * 
   * @param timeRangeMs - 分析时间范围
   * @returns 分析报告
   */
  generateReport(timeRangeMs: number = 3600000): {
    analysis: UsagePatternAnalysis
    recommendations: OptimizationRecommendation[]
    summary: string
  } {
    const analysis = this.analyzeUsagePattern(timeRangeMs)
    const recommendations = this.generateRecommendations(analysis)
    
    const summary = `
连接池使用分析报告
==================
时间范围: ${analysis.timeRange.start.toISOString()} - ${analysis.timeRange.end.toISOString()}
使用模式: ${analysis.patternType}
平均使用率: ${analysis.avgUtilization.toFixed(2)}%
峰值使用率: ${analysis.peakUtilization.toFixed(2)}%
平均获取时间: ${analysis.acquireTimeStats.avg.toFixed(2)}ms
建议数量: ${recommendations.length}

推荐配置:
- 最小连接数: ${analysis.recommendedConfig.minConnections}
- 最大连接数: ${analysis.recommendedConfig.maxConnections}
- 获取超时: ${analysis.recommendedConfig.acquireTimeout}ms
- 空闲超时: ${analysis.recommendedConfig.idleTimeout}ms
    `.trim()
    
    return {
      analysis,
      recommendations,
      summary
    }
  }
}

// 创建全局实例
export const connectionPoolAnalyzer = new ConnectionPoolAnalyzer()

// 导出类型
export type {
  PoolUsageStats,
  UsagePatternAnalysis,
  OptimizationRecommendation
}
