/**
 * @file Database Connection Monitoring
 * @description 数据库连接监控和指标收集工具
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

import { EventEmitter } from 'events'
import { enhancedDb, ConnectionState } from './enhanced-connection'

// 监控指标接口
export interface DatabaseMetrics {
  timestamp: Date
  connectionState: ConnectionState
  uptime: number
  totalQueries: number
  failedQueries: number
  successRate: number
  avgLatency: number
  reconnectAttempts: number
  memoryUsage: {
    rss: number
    heapUsed: number
    heapTotal: number
    external: number
  }
  cpuUsage: {
    user: number
    system: number
  }
}

// 性能阈值配置
export interface PerformanceThresholds {
  maxLatency: number // 最大延迟（毫秒）
  maxFailureRate: number // 最大失败率（百分比）
  maxReconnectAttempts: number // 最大重连尝试次数
  minUptime: number // 最小运行时间（毫秒）
}

// 告警级别
export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// 告警信息
export interface Alert {
  level: AlertLevel
  message: string
  timestamp: Date
  metrics: DatabaseMetrics
  threshold?: any
}

/**
 * 数据库监控器
 */
export class DatabaseMonitor extends EventEmitter {
  private isMonitoring: boolean = false
  private monitoringInterval: NodeJS.Timeout | null = null
  private metricsHistory: DatabaseMetrics[] = []
  private alerts: Alert[] = []
  private thresholds: PerformanceThresholds
  private intervalMs: number
  private maxHistorySize: number
  private lastCpuUsage: NodeJS.CpuUsage | null = null

  constructor(
    thresholds?: Partial<PerformanceThresholds>,
    intervalMs: number = 30000,
    maxHistorySize: number = 100
  ) {
    super()

    // 默认性能阈值
    this.thresholds = {
      maxLatency: parseInt(process.env.DB_MAX_LATENCY || '1000'),
      maxFailureRate: parseFloat(process.env.DB_MAX_FAILURE_RATE || '5'),
      maxReconnectAttempts: parseInt(process.env.DB_MAX_RECONNECT_ATTEMPTS || '5'),
      minUptime: parseInt(process.env.DB_MIN_UPTIME || '60000'),
      ...thresholds
    }

    this.intervalMs = intervalMs
    this.maxHistorySize = maxHistorySize

    // 监听数据库事件
    this.setupDatabaseEventListeners()
  }

  /**
   * 设置数据库事件监听器
   */
  private setupDatabaseEventListeners(): void {
    enhancedDb.on('connected', () => {
      this.createAlert(AlertLevel.INFO, '数据库连接成功建立')
    })

    enhancedDb.on('disconnected', (error) => {
      const message = error ? `数据库连接断开: ${error.message}` : '数据库连接断开'
      this.createAlert(AlertLevel.WARNING, message)
    })

    enhancedDb.on('reconnecting', (attempt) => {
      this.createAlert(AlertLevel.WARNING, `数据库重连中 (第${attempt}次尝试)`)
    })

    enhancedDb.on('reconnected', () => {
      this.createAlert(AlertLevel.INFO, '数据库重连成功')
    })

    enhancedDb.on('error', (error) => {
      this.createAlert(AlertLevel.ERROR, `数据库错误: ${error.message}`)
    })

    enhancedDb.on('healthCheck', (healthy) => {
      if (!healthy) {
        this.createAlert(AlertLevel.WARNING, '数据库健康检查失败')
      }
    })
  }

  /**
   * 开始监控
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      console.log('Database monitoring is already running')
      return
    }

    console.log(`Starting database monitoring (interval: ${this.intervalMs}ms)`)
    this.isMonitoring = true
    this.lastCpuUsage = process.cpuUsage()

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics()
    }, this.intervalMs)

    // 立即收集一次指标
    this.collectMetrics()
  }

  /**
   * 停止监控
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return
    }

    console.log('Stopping database monitoring')
    this.isMonitoring = false

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
  }

  /**
   * 收集指标
   */
  private collectMetrics(): void {
    try {
      const stats = enhancedDb.getStats()
      const memUsage = process.memoryUsage()
      const cpuUsage = process.cpuUsage(this.lastCpuUsage || undefined)
      this.lastCpuUsage = process.cpuUsage()

      const metrics: DatabaseMetrics = {
        timestamp: new Date(),
        connectionState: stats.state,
        uptime: stats.uptime,
        totalQueries: stats.totalQueries,
        failedQueries: stats.failedQueries,
        successRate: stats.totalQueries > 0 
          ? ((stats.totalQueries - stats.failedQueries) / stats.totalQueries) * 100
          : 100,
        avgLatency: stats.avgLatency,
        reconnectAttempts: stats.reconnectAttempts,
        memoryUsage: {
          rss: memUsage.rss,
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          external: memUsage.external
        },
        cpuUsage: {
          user: cpuUsage.user / 1000, // 转换为毫秒
          system: cpuUsage.system / 1000
        }
      }

      // 添加到历史记录
      this.addMetricsToHistory(metrics)

      // 检查性能阈值
      this.checkPerformanceThresholds(metrics)

      // 触发指标收集事件
      this.emit('metrics', metrics)

    } catch (error) {
      console.error('Failed to collect database metrics:', error)
      this.createAlert(AlertLevel.ERROR, `指标收集失败: ${error}`)
    }
  }

  /**
   * 添加指标到历史记录
   */
  private addMetricsToHistory(metrics: DatabaseMetrics): void {
    this.metricsHistory.push(metrics)

    // 限制历史记录大小
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory = this.metricsHistory.slice(-this.maxHistorySize)
    }
  }

  /**
   * 检查性能阈值
   */
  private checkPerformanceThresholds(metrics: DatabaseMetrics): void {
    // 检查延迟
    if (metrics.avgLatency > this.thresholds.maxLatency) {
      this.createAlert(
        AlertLevel.WARNING,
        `数据库平均延迟过高: ${metrics.avgLatency.toFixed(2)}ms (阈值: ${this.thresholds.maxLatency}ms)`,
        metrics,
        { threshold: this.thresholds.maxLatency, actual: metrics.avgLatency }
      )
    }

    // 检查失败率
    if (metrics.successRate < (100 - this.thresholds.maxFailureRate)) {
      this.createAlert(
        AlertLevel.ERROR,
        `数据库查询失败率过高: ${(100 - metrics.successRate).toFixed(2)}% (阈值: ${this.thresholds.maxFailureRate}%)`,
        metrics,
        { threshold: this.thresholds.maxFailureRate, actual: 100 - metrics.successRate }
      )
    }

    // 检查重连次数
    if (metrics.reconnectAttempts > this.thresholds.maxReconnectAttempts) {
      this.createAlert(
        AlertLevel.CRITICAL,
        `数据库重连次数过多: ${metrics.reconnectAttempts} (阈值: ${this.thresholds.maxReconnectAttempts})`,
        metrics,
        { threshold: this.thresholds.maxReconnectAttempts, actual: metrics.reconnectAttempts }
      )
    }

    // 检查运行时间（如果连接状态为已连接但运行时间过短）
    if (metrics.connectionState === ConnectionState.CONNECTED && 
        metrics.uptime < this.thresholds.minUptime) {
      this.createAlert(
        AlertLevel.WARNING,
        `数据库连接运行时间过短: ${(metrics.uptime / 1000).toFixed(2)}s (阈值: ${this.thresholds.minUptime / 1000}s)`,
        metrics,
        { threshold: this.thresholds.minUptime, actual: metrics.uptime }
      )
    }

    // 检查连接状态
    if (metrics.connectionState === ConnectionState.FAILED || 
        metrics.connectionState === ConnectionState.DISCONNECTED) {
      this.createAlert(
        AlertLevel.CRITICAL,
        `数据库连接状态异常: ${metrics.connectionState}`,
        metrics
      )
    }
  }

  /**
   * 创建告警
   */
  private createAlert(
    level: AlertLevel, 
    message: string, 
    metrics?: DatabaseMetrics,
    threshold?: any
  ): void {
    const alert: Alert = {
      level,
      message,
      timestamp: new Date(),
      metrics: metrics || this.getCurrentMetrics(),
      threshold
    }

    this.alerts.push(alert)

    // 限制告警历史大小
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000)
    }

    // 触发告警事件
    this.emit('alert', alert)

    // 根据级别输出日志
    switch (level) {
      case AlertLevel.INFO:
        console.info(`[DB Monitor] ${message}`)
        break
      case AlertLevel.WARNING:
        console.warn(`[DB Monitor] ${message}`)
        break
      case AlertLevel.ERROR:
        console.error(`[DB Monitor] ${message}`)
        break
      case AlertLevel.CRITICAL:
        console.error(`[DB Monitor] CRITICAL: ${message}`)
        break
    }
  }

  /**
   * 获取当前指标
   */
  private getCurrentMetrics(): DatabaseMetrics {
    const stats = enhancedDb.getStats()
    const memUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()

    return {
      timestamp: new Date(),
      connectionState: stats.state,
      uptime: stats.uptime,
      totalQueries: stats.totalQueries,
      failedQueries: stats.failedQueries,
      successRate: stats.totalQueries > 0 
        ? ((stats.totalQueries - stats.failedQueries) / stats.totalQueries) * 100
        : 100,
      avgLatency: stats.avgLatency,
      reconnectAttempts: stats.reconnectAttempts,
      memoryUsage: {
        rss: memUsage.rss,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external
      },
      cpuUsage: {
        user: cpuUsage.user / 1000,
        system: cpuUsage.system / 1000
      }
    }
  }

  /**
   * 获取指标历史
   */
  getMetricsHistory(limit?: number): DatabaseMetrics[] {
    if (limit) {
      return this.metricsHistory.slice(-limit)
    }
    return [...this.metricsHistory]
  }

  /**
   * 获取告警历史
   */
  getAlerts(level?: AlertLevel, limit?: number): Alert[] {
    let alerts = level 
      ? this.alerts.filter(alert => alert.level === level)
      : [...this.alerts]

    if (limit) {
      alerts = alerts.slice(-limit)
    }

    return alerts
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats(timeRangeMs?: number): {
    avgLatency: number
    maxLatency: number
    minLatency: number
    successRate: number
    totalQueries: number
    failedQueries: number
    uptimePercentage: number
  } {
    let metrics = this.metricsHistory

    // 如果指定了时间范围，过滤指标
    if (timeRangeMs) {
      const cutoffTime = new Date(Date.now() - timeRangeMs)
      metrics = metrics.filter(m => m.timestamp >= cutoffTime)
    }

    if (metrics.length === 0) {
      return {
        avgLatency: 0,
        maxLatency: 0,
        minLatency: 0,
        successRate: 100,
        totalQueries: 0,
        failedQueries: 0,
        uptimePercentage: 0
      }
    }

    const latencies = metrics.map(m => m.avgLatency).filter(l => l > 0)
    const totalQueries = metrics[metrics.length - 1].totalQueries - (metrics[0].totalQueries || 0)
    const failedQueries = metrics[metrics.length - 1].failedQueries - (metrics[0].failedQueries || 0)
    const connectedMetrics = metrics.filter(m => m.connectionState === ConnectionState.CONNECTED)

    return {
      avgLatency: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
      maxLatency: latencies.length > 0 ? Math.max(...latencies) : 0,
      minLatency: latencies.length > 0 ? Math.min(...latencies) : 0,
      successRate: totalQueries > 0 ? ((totalQueries - failedQueries) / totalQueries) * 100 : 100,
      totalQueries,
      failedQueries,
      uptimePercentage: (connectedMetrics.length / metrics.length) * 100
    }
  }

  /**
   * 更新性能阈值
   */
  updateThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds }
    console.log('Database monitoring thresholds updated:', this.thresholds)
  }

  /**
   * 清除历史数据
   */
  clearHistory(): void {
    this.metricsHistory = []
    this.alerts = []
    console.log('Database monitoring history cleared')
  }

  /**
   * 获取监控状态
   */
  getMonitoringStatus(): {
    isMonitoring: boolean
    intervalMs: number
    metricsCount: number
    alertsCount: number
    thresholds: PerformanceThresholds
  } {
    return {
      isMonitoring: this.isMonitoring,
      intervalMs: this.intervalMs,
      metricsCount: this.metricsHistory.length,
      alertsCount: this.alerts.length,
      thresholds: this.thresholds
    }
  }

  /**
   * 导出监控数据
   */
  exportData(): {
    metrics: DatabaseMetrics[]
    alerts: Alert[]
    thresholds: PerformanceThresholds
    exportedAt: Date
  } {
    return {
      metrics: this.getMetricsHistory(),
      alerts: this.getAlerts(),
      thresholds: this.thresholds,
      exportedAt: new Date()
    }
  }
}

// 创建全局监控实例
export const databaseMonitor = new DatabaseMonitor()

// 如果启用了监控，自动开始监控
if (process.env.DB_MONITORING_ENABLED === 'true') {
  databaseMonitor.startMonitoring()
  
  // 监听告警事件
  databaseMonitor.on('alert', (alert: Alert) => {
    // 这里可以集成外部告警系统，如邮件、Slack、钉钉等
    if (alert.level === AlertLevel.CRITICAL) {
      console.error('CRITICAL DATABASE ALERT:', alert.message)
      // 可以在这里发送紧急通知
    }
  })
  
  // 监听指标事件
  databaseMonitor.on('metrics', (metrics: DatabaseMetrics) => {
    // 这里可以将指标发送到外部监控系统，如Prometheus、InfluxDB等
    if (process.env.DB_METRICS_COLLECTION === 'true') {
      // 发送指标到外部系统
    }
  })
}

// 导出便捷函数
export const startDatabaseMonitoring = () => databaseMonitor.startMonitoring()
export const stopDatabaseMonitoring = () => databaseMonitor.stopMonitoring()
export const getDatabaseMetrics = () => databaseMonitor.getMetricsHistory(1)[0]
export const getDatabaseAlerts = (level?: AlertLevel) => databaseMonitor.getAlerts(level)
export const getDatabasePerformanceStats = (timeRangeMs?: number) => 
  databaseMonitor.getPerformanceStats(timeRangeMs)

// 默认导出监控器
export default databaseMonitor