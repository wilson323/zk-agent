/**
 * @file performance-monitor.js
 * @description 数据库性能监控和分析模块
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

/**
 * 数据库性能监控器
 */
class DatabasePerformanceMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      enableMetrics: process.env.ENABLE_METRICS === 'true',
      metricsRetentionDays: parseInt(process.env.METRICS_RETENTION_DAYS) || 30,
      slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD) || 1000, // 1秒
      alertThreshold: {
        connectionCount: parseInt(process.env.ALERT_CONNECTION_COUNT) || 40,
        avgResponseTime: parseInt(process.env.ALERT_AVG_RESPONSE_TIME) || 500,
        errorRate: parseFloat(process.env.ALERT_ERROR_RATE) || 0.05 // 5%
      },
      ...options
    };
    
    this.metrics = {
      queries: [],
      connections: [],
      errors: [],
      performance: {
        totalQueries: 0,
        slowQueries: 0,
        totalErrors: 0,
        avgResponseTime: 0,
        peakConnections: 0
      }
    };
    
    this.startTime = Date.now();
    this.cleanupInterval = null;
    
    if (this.options.enableMetrics) {
      this.startCleanupScheduler();
    }
  }

  /**
   * 记录查询性能
   */
  recordQuery(queryInfo) {
    if (!this.options.enableMetrics) {return;}
    
    const timestamp = Date.now();
    const duration = queryInfo.duration || 0;
    
    const record = {
      timestamp,
      query: queryInfo.query,
      duration,
      params: queryInfo.params,
      success: queryInfo.success !== false,
      error: queryInfo.error,
      connectionId: queryInfo.connectionId
    };
    
    this.metrics.queries.push(record);
    this.metrics.performance.totalQueries++;
    
    // 检查慢查询
    if (duration > this.options.slowQueryThreshold) {
      this.metrics.performance.slowQueries++;
      this.emit('slowQuery', record);
      console.warn(`慢查询检测: ${duration}ms - ${queryInfo.query}`);
    }
    
    // 记录错误
    if (!record.success) {
      this.metrics.performance.totalErrors++;
      this.recordError(queryInfo.error, 'query');
    }
    
    // 更新平均响应时间
    this.updateAverageResponseTime(duration);
    
    // 检查告警阈值
    this.checkAlerts();
  }

  /**
   * 记录连接信息
   */
  recordConnection(connectionInfo) {
    if (!this.options.enableMetrics) {return;}
    
    const timestamp = Date.now();
    
    const record = {
      timestamp,
      action: connectionInfo.action, // 'connect', 'disconnect', 'error'
      connectionId: connectionInfo.connectionId,
      poolStatus: connectionInfo.poolStatus,
      duration: connectionInfo.duration
    };
    
    this.metrics.connections.push(record);
    
    // 更新峰值连接数
    if (connectionInfo.poolStatus && connectionInfo.poolStatus.totalCount > this.metrics.performance.peakConnections) {
      this.metrics.performance.peakConnections = connectionInfo.poolStatus.totalCount;
    }
    
    this.emit('connectionEvent', record);
  }

  /**
   * 记录错误
   */
  recordError(error, type = 'general') {
    if (!this.options.enableMetrics) {return;}
    
    const timestamp = Date.now();
    
    const record = {
      timestamp,
      type,
      message: error.message,
      stack: error.stack,
      code: error.code,
      severity: this.getErrorSeverity(error)
    };
    
    this.metrics.errors.push(record);
    this.emit('error', record);
    
    // 严重错误立即告警
    if (record.severity === 'critical') {
      this.emit('criticalError', record);
    }
  }

  /**
   * 获取错误严重程度
   */
  getErrorSeverity(error) {
    const criticalCodes = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET'];
    const warningCodes = ['23505', '23503', '23502']; // PostgreSQL约束错误
    
    if (criticalCodes.includes(error.code)) {
      return 'critical';
    } else if (warningCodes.includes(error.code)) {
      return 'warning';
    } else {
      return 'info';
    }
  }

  /**
   * 更新平均响应时间
   */
  updateAverageResponseTime(duration) {
    const totalQueries = this.metrics.performance.totalQueries;
    const currentAvg = this.metrics.performance.avgResponseTime;
    
    this.metrics.performance.avgResponseTime = 
      ((currentAvg * (totalQueries - 1)) + duration) / totalQueries;
  }

  /**
   * 检查告警阈值
   */
  checkAlerts() {
    const perf = this.metrics.performance;
    const thresholds = this.options.alertThreshold;
    
    // 检查平均响应时间
    if (perf.avgResponseTime > thresholds.avgResponseTime) {
      this.emit('alert', {
        type: 'high_response_time',
        value: perf.avgResponseTime,
        threshold: thresholds.avgResponseTime,
        message: `平均响应时间过高: ${perf.avgResponseTime.toFixed(2)}ms`
      });
    }
    
    // 检查错误率
    const errorRate = perf.totalQueries > 0 ? perf.totalErrors / perf.totalQueries : 0;
    if (errorRate > thresholds.errorRate) {
      this.emit('alert', {
        type: 'high_error_rate',
        value: errorRate,
        threshold: thresholds.errorRate,
        message: `错误率过高: ${(errorRate * 100).toFixed(2)}%`
      });
    }
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats() {
    const now = Date.now();
    const uptime = now - this.startTime;
    
    // 计算最近1小时的统计
    const oneHourAgo = now - (60 * 60 * 1000);
    const recentQueries = this.metrics.queries.filter(q => q.timestamp > oneHourAgo);
    const recentErrors = this.metrics.errors.filter(e => e.timestamp > oneHourAgo);
    
    const recentAvgResponseTime = recentQueries.length > 0 
      ? recentQueries.reduce((sum, q) => sum + q.duration, 0) / recentQueries.length 
      : 0;
    
    const recentErrorRate = recentQueries.length > 0 
      ? recentErrors.length / recentQueries.length 
      : 0;
    
    return {
      uptime,
      overall: {
        totalQueries: this.metrics.performance.totalQueries,
        slowQueries: this.metrics.performance.slowQueries,
        totalErrors: this.metrics.performance.totalErrors,
        avgResponseTime: this.metrics.performance.avgResponseTime,
        peakConnections: this.metrics.performance.peakConnections,
        errorRate: this.metrics.performance.totalQueries > 0 
          ? this.metrics.performance.totalErrors / this.metrics.performance.totalQueries 
          : 0
      },
      recent: {
        queriesLastHour: recentQueries.length,
        errorsLastHour: recentErrors.length,
        avgResponseTimeLastHour: recentAvgResponseTime,
        errorRateLastHour: recentErrorRate
      },
      slowQueries: this.getSlowQueries(10),
      recentErrors: this.getRecentErrors(10)
    };
  }

  /**
   * 获取慢查询列表
   */
  getSlowQueries(limit = 10) {
    return this.metrics.queries
      .filter(q => q.duration > this.options.slowQueryThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit)
      .map(q => ({
        timestamp: new Date(q.timestamp).toISOString(),
        query: q.query.substring(0, 100) + (q.query.length > 100 ? '...' : ''),
        duration: q.duration
      }));
  }

  /**
   * 获取最近错误列表
   */
  getRecentErrors(limit = 10) {
    return this.metrics.errors
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
      .map(e => ({
        timestamp: new Date(e.timestamp).toISOString(),
        type: e.type,
        message: e.message,
        severity: e.severity
      }));
  }

  /**
   * 导出性能报告
   */
  async exportReport(filePath) {
    try {
      const stats = this.getPerformanceStats();
      const report = {
        generatedAt: new Date().toISOString(),
        ...stats
      };
      
      await fs.writeFile(filePath, JSON.stringify(report, null, 2));
      console.log(`性能报告已导出到: ${filePath}`);
      
      return report;
    } catch (error) {
      console.error('导出性能报告失败:', error);
      throw error;
    }
  }

  /**
   * 清理过期数据
   */
  cleanupOldData() {
    const cutoffTime = Date.now() - (this.options.metricsRetentionDays * 24 * 60 * 60 * 1000);
    
    const beforeQueries = this.metrics.queries.length;
    const beforeConnections = this.metrics.connections.length;
    const beforeErrors = this.metrics.errors.length;
    
    this.metrics.queries = this.metrics.queries.filter(q => q.timestamp > cutoffTime);
    this.metrics.connections = this.metrics.connections.filter(c => c.timestamp > cutoffTime);
    this.metrics.errors = this.metrics.errors.filter(e => e.timestamp > cutoffTime);
    
    const cleanedQueries = beforeQueries - this.metrics.queries.length;
    const cleanedConnections = beforeConnections - this.metrics.connections.length;
    const cleanedErrors = beforeErrors - this.metrics.errors.length;
    
    if (cleanedQueries > 0 || cleanedConnections > 0 || cleanedErrors > 0) {
      console.log(`清理过期数据: 查询${cleanedQueries}条, 连接${cleanedConnections}条, 错误${cleanedErrors}条`);
    }
  }

  /**
   * 启动清理调度器
   */
  startCleanupScheduler() {
    // 每小时清理一次过期数据
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldData();
    }, 60 * 60 * 1000);
  }

  /**
   * 停止监控
   */
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.removeAllListeners();
    console.log('数据库性能监控已停止');
  }

  /**
   * 重置统计数据
   */
  reset() {
    this.metrics = {
      queries: [],
      connections: [],
      errors: [],
      performance: {
        totalQueries: 0,
        slowQueries: 0,
        totalErrors: 0,
        avgResponseTime: 0,
        peakConnections: 0
      }
    };
    
    this.startTime = Date.now();
    console.log('性能监控统计数据已重置');
  }
}

// 单例实例
const performanceMonitor = new DatabasePerformanceMonitor();

module.exports = {
  DatabasePerformanceMonitor,
  performanceMonitor
};