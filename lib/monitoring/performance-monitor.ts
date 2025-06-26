/**
 * @file Performance Monitor
 * @description 性能监控和指标收集系统
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

import { EventEmitter } from 'events'

// 性能指标接口
export interface PerformanceMetrics {
  timestamp: Date
  endpoint: string
  method: string
  statusCode: number
  responseTime: number
  memoryUsage: NodeJS.MemoryUsage
  cpuUsage: NodeJS.CpuUsage
  activeConnections: number
  errorCount: number
}

// 性能统计接口
export interface PerformanceStats {
  averageResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  requestsPerSecond: number
  errorRate: number
  memoryUsagePercent: number
  cpuUsagePercent: number
}

// 告警配置接口
export interface AlertConfig {
  responseTimeThreshold: number // 响应时间阈值（毫秒）
  errorRateThreshold: number // 错误率阈值（百分比）
  memoryUsageThreshold: number // 内存使用率阈值（百分比）
  cpuUsageThreshold: number // CPU使用率阈值（百分比）
}

// 性能监控器类
export class PerformanceMonitor extends EventEmitter {
  private metrics: PerformanceMetrics[] = []
  private alertConfig: AlertConfig
  private isMonitoring: boolean = false
  private monitoringInterval: NodeJS.Timeout | null = null
  private maxMetricsHistory: number = 10000

  constructor(alertConfig?: Partial<AlertConfig>) {
    super()
    this.alertConfig = {
      responseTimeThreshold: 5000, // 5秒
      errorRateThreshold: 5, // 5%
      memoryUsageThreshold: 80, // 80%
      cpuUsageThreshold: 80, // 80%
      ...alertConfig
    }
  }

  /**
   * 开始性能监控
   */
  startMonitoring(intervalMs: number = 60000): void {
    if (this.isMonitoring) {
      console.warn('Performance monitoring is already running')
      return
    }

    this.isMonitoring = true
    console.log('Starting performance monitoring...')

    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics()
      this.checkAlerts()
      this.cleanupOldMetrics()
    }, intervalMs)

    this.emit('monitoringStarted')
  }

  /**
   * 停止性能监控
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return
    }

    this.isMonitoring = false
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }

    console.log('Performance monitoring stopped')
    this.emit('monitoringStopped')
  }

  /**
   * 记录请求指标
   */
  recordRequest(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number
  ): void {
    const metric: PerformanceMetrics = {
      timestamp: new Date(),
      endpoint,
      method,
      statusCode,
      responseTime,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      activeConnections: this.getActiveConnections(),
      errorCount: statusCode >= 400 ? 1 : 0
    }

    this.metrics.push(metric)
    this.emit('metricRecorded', metric)

    // 检查是否需要告警
    if (responseTime > this.alertConfig.responseTimeThreshold) {
      this.emit('alert', {
        type: 'HIGH_RESPONSE_TIME',
        message: `High response time detected: ${responseTime}ms for ${method} ${endpoint}`,
        metric
      })
    }

    if (statusCode >= 500) {
      this.emit('alert', {
        type: 'SERVER_ERROR',
        message: `Server error detected: ${statusCode} for ${method} ${endpoint}`,
        metric
      })
    }
  }

  /**
   * 获取性能统计
   */
  getStats(timeRangeMs: number = 3600000): PerformanceStats {
    const cutoffTime = new Date(Date.now() - timeRangeMs)
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoffTime)

    if (recentMetrics.length === 0) {
      return {
        averageResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        requestsPerSecond: 0,
        errorRate: 0,
        memoryUsagePercent: 0,
        cpuUsagePercent: 0
      }
    }

    const responseTimes = recentMetrics.map(m => m.responseTime).sort((a, b) => a - b)
    const errorCount = recentMetrics.filter(m => m.errorCount > 0).length
    const timeRangeSeconds = timeRangeMs / 1000

    return {
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      p95ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.95)] || 0,
      p99ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.99)] || 0,
      requestsPerSecond: recentMetrics.length / timeRangeSeconds,
      errorRate: (errorCount / recentMetrics.length) * 100,
      memoryUsagePercent: this.getMemoryUsagePercent(),
      cpuUsagePercent: this.getCpuUsagePercent()
    }
  }

  /**
   * 获取最近的指标
   */
  getRecentMetrics(count: number = 100): PerformanceMetrics[] {
    return this.metrics.slice(-count)
  }

  /**
   * 导出指标数据
   */
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = [
        'timestamp',
        'endpoint',
        'method',
        'statusCode',
        'responseTime',
        'memoryUsed',
        'cpuUsed',
        'activeConnections',
        'errorCount'
      ]
      
      const csvData = this.metrics.map(m => [
        m.timestamp.toISOString(),
        m.endpoint,
        m.method,
        m.statusCode,
        m.responseTime,
        m.memoryUsage.used,
        m.cpuUsage.user + m.cpuUsage.system,
        m.activeConnections,
        m.errorCount
      ])

      return [headers, ...csvData].map(row => row.join(',')).join('\n')
    }

    return JSON.stringify(this.metrics, null, 2)
  }

  /**
   * 收集系统指标
   */
  private collectSystemMetrics(): void {
    const memoryUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()

    this.emit('systemMetrics', {
      timestamp: new Date(),
      memoryUsage,
      cpuUsage,
      activeConnections: this.getActiveConnections()
    })
  }

  /**
   * 检查告警条件
   */
  private checkAlerts(): void {
    const stats = this.getStats(300000) // 最近5分钟

    if (stats.errorRate > this.alertConfig.errorRateThreshold) {
      this.emit('alert', {
        type: 'HIGH_ERROR_RATE',
        message: `High error rate detected: ${stats.errorRate.toFixed(2)}%`,
        stats
      })
    }

    if (stats.memoryUsagePercent > this.alertConfig.memoryUsageThreshold) {
      this.emit('alert', {
        type: 'HIGH_MEMORY_USAGE',
        message: `High memory usage detected: ${stats.memoryUsagePercent.toFixed(2)}%`,
        stats
      })
    }

    if (stats.cpuUsagePercent > this.alertConfig.cpuUsageThreshold) {
      this.emit('alert', {
        type: 'HIGH_CPU_USAGE',
        message: `High CPU usage detected: ${stats.cpuUsagePercent.toFixed(2)}%`,
        stats
      })
    }
  }

  /**
   * 清理旧指标
   */
  private cleanupOldMetrics(): void {
    if (this.metrics.length > this.maxMetricsHistory) {
      const removeCount = this.metrics.length - this.maxMetricsHistory
      this.metrics.splice(0, removeCount)
    }
  }

  /**
   * 获取活跃连接数
   */
  private getActiveConnections(): number {
    // 这里可以集成实际的连接监控逻辑
    return 0
  }

  /**
   * 获取内存使用率
   */
  private getMemoryUsagePercent(): number {
    const usage = process.memoryUsage()
    const totalMemory = require('os').totalmem()
    return (usage.rss / totalMemory) * 100
  }

  /**
   * 获取CPU使用率
   */
  private getCpuUsagePercent(): number {
    const usage = process.cpuUsage()
    const totalUsage = usage.user + usage.system
    // 简化的CPU使用率计算
    return Math.min((totalUsage / 1000000) * 100, 100)
  }
}

// 全局性能监控实例
export const performanceMonitor = new PerformanceMonitor()

// 中间件函数
export function performanceMiddleware() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now()
    
    res.on('finish', () => {
      const responseTime = Date.now() - startTime
      performanceMonitor.recordRequest(
        req.url || req.path,
        req.method,
        res.statusCode,
        responseTime
      )
    })
    
    next()
  }
}