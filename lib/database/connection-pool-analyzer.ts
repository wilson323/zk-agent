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

// 导出类型
export type {
  PoolUsageStats,
  UsagePatternAnalysis,
  OptimizationRecommendation
}
