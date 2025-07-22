/**
 * @file Database Connection Monitoring
 * @description 数据库连接监控和指标收集工具
 * @author ZK-Agent Team
 * @date 2024-12-27
 */

import { EventEmitter } from 'events';
import {
  DatabaseMetrics,
  Alert,
  PerformanceThresholds,
  IMonitoringService,
  HealthStatus,
  MonitoringStatus,
  IMonitoringServiceFactory
} from './unified-interfaces';
import { OptimizationStatus } from './performance-optimization-coordinator';
import { AlertLevel } from '@/lib/types/enums';

// 重新导出必要的类型
export type { DatabaseMetrics, PerformanceThresholds, Alert, HealthStatus } from './unified-interfaces';
export { AlertLevel } from '@/lib/types/enums';
import { monitoringRegistry } from './monitoring-registry';
import { ConnectionState, enhancedDb } from './enhanced-connection';
// import { PerformanceOptimizationCoordinator } from './performance-optimization-coordinator'; // 移除循环依赖

// Re-exporting necessary types from other modules
export type {
  ConnectionPoolConfig,
  ReconnectionConfig,
  HealthCheckConfig,
  ConnectionStats,
} from './enhanced-connection';

// ... other type re-exports

// 监控指标接口
// DatabaseMetrics 接口已迁移到 unified-interfaces.ts
// 请使用: import { DatabaseMetrics } from './unified-interfaces'
// PerformanceThresholds 和 Alert 接口已迁移到 monitoring-interfaces.ts
// 请使用: import { PerformanceThresholds, Alert } from './monitoring-interfaces'

export class DatabaseMonitor extends EventEmitter implements IMonitoringService {
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private metricsHistory: DatabaseMetrics[] = [];
  private alerts: Alert[] = [];
  private thresholds: PerformanceThresholds;
  private intervalMs: number;
  private maxHistorySize: number;
  private lastCpuUsage: NodeJS.CpuUsage | null = null;
  // private optimizationCoordinator: PerformanceOptimizationCoordinator; // 移除循环依赖

  constructor(
    thresholds?: Partial<PerformanceThresholds>,
    intervalMs: number = 30000,
    maxHistorySize: number = 100
  ) {
    super();

    this.thresholds = {
      maxConnections: 100,
      maxResponseTime: 1000,
      minCacheHitRate: 80,
      maxCpuUsage: 80,
      maxMemoryUsage: 1024,
      maxErrorRate: 5,
      maxLatency: 1000,
      maxFailureRate: 5,
      maxReconnectAttempts: 5,
      minUptime: 60000,
      ...thresholds,
    };

    this.intervalMs = intervalMs;
    this.maxHistorySize = maxHistorySize;
    // this.optimizationCoordinator = new PerformanceOptimizationCoordinator(); // 移除循环依赖

    this.setupDatabaseEventListeners();
  }

  private setupDatabaseEventListeners(): void {
    enhancedDb.on('connected', () => this.createAlert(AlertLevel.INFO, 'Database connected'));
    enhancedDb.on('disconnected', error =>
      this.createAlert(AlertLevel.ERROR, `Database disconnected: ${error?.message}`.trim())
    );
    enhancedDb.on('reconnecting', attempt =>
      this.createAlert(AlertLevel.WARNING, `Database reconnecting (attempt ${attempt})`)
    );
    enhancedDb.on('reconnected', () => this.createAlert(AlertLevel.INFO, 'Database reconnected'));
    enhancedDb.on('error', error =>
      this.createAlert(AlertLevel.ERROR, `Database error: ${error.message}`)
    );
    enhancedDb.on('healthCheck', healthy => {
      if (!healthy) {
        this.createAlert(AlertLevel.WARNING, 'Database health check failed');
      }
    });
  }

  /**
   * 启动数据库监控
   * 包含完善的异常处理和状态验证
   */
  async startMonitoring(): Promise<void> {
    try {
      if (this.isMonitoring) {
        console.warn('Monitoring is already running');
        return;
      }

      // 验证监控间隔
      if (this.intervalMs <= 0) {
        throw new Error('Invalid monitoring interval');
      }

      this.isMonitoring = true;
      this.lastCpuUsage = process.cpuUsage();

      // 设置监控定时器
      this.monitoringInterval = setInterval(() => {
        try {
          this.collectMetrics();
        } catch (error) {
          console.error('Error in monitoring interval:', error);
          this.createAlert(
            AlertLevel.ERROR,
            `Monitoring interval error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            { timestamp: new Date() } as Partial<DatabaseMetrics>
          );
        }
      }, this.intervalMs);

      this.emit('monitoringStarted');
      console.log(`Database monitoring started with interval: ${this.intervalMs}ms`);
    } catch (error) {
      console.error('Failed to start monitoring:', error);
      this.isMonitoring = false;
      this.createAlert(
        AlertLevel.CRITICAL,
        `Failed to start monitoring: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { timestamp: new Date() } as Partial<DatabaseMetrics>
      );
      throw error;
    }
  }

  /**
   * 停止数据库监控
   * 包含完善的异常处理和资源清理
   */
  async stopMonitoring(): Promise<void> {
    try {
      if (!this.isMonitoring) {
        console.warn('Monitoring is not running');
        return;
      }

      this.isMonitoring = false;

      // 清理监控定时器
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
        this.monitoringInterval = null;
      }

      // 重置CPU使用率基准
      this.lastCpuUsage = null;

      this.emit('monitoringStopped');
      console.log('Database monitoring stopped');
    } catch (error) {
      console.error('Error stopping monitoring:', error);
      this.createAlert(
        AlertLevel.ERROR,
        `Error stopping monitoring: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { timestamp: new Date() } as Partial<DatabaseMetrics>
      );

      // 强制清理资源
      this.isMonitoring = false;
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
        this.monitoringInterval = null;
      }
      this.lastCpuUsage = null;
    }
  }

  /**
   * 收集数据库性能指标
   * 包含完善的异常处理和容错机制
   */
  private collectMetrics(): void {
    try {
      const stats = enhancedDb.getStats();
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage(this.lastCpuUsage || undefined);
      this.lastCpuUsage = process.cpuUsage();

      const metrics: DatabaseMetrics = {
        timestamp: new Date(),
        uptime: stats.uptime || 0,
        connections: {
          active: stats.totalQueries || 0,
          idle: 0,
          total: stats.totalQueries || 0,
          waiting: 0,
          max: 10,
          poolUtilization: stats.totalQueries ? (stats.totalQueries / 10) * 100 : 0,
          creations: 0,
          destructions: 0,
        },
        queries: {
          total: stats.totalQueries || 0,
          successful: (stats.totalQueries || 0) - (stats.failedQueries || 0),
          failed: stats.failedQueries || 0,
          averageTime: stats.avgLatency || 0,
          slowQueries: 0,
          slowQueryThreshold: 1000,
        },
        performance: {
          cpuUsage: Math.round((cpuUsage.user + cpuUsage.system) / 1000000),
          memoryUsage: Math.round(memUsage.heapUsed / 1024 / 1024),
          maxMemoryUsage: Math.round(memUsage.heapTotal / 1024 / 1024),
          diskUsage: 0,
          responseTime: stats.avgLatency || 0,
          throughput: stats.totalQueries || 0,
          networkLatency: 0,
          currentLatency: stats.avgLatency || 0,
          averageLatency: stats.avgLatency || 0,
          maxLatency: stats.avgLatency || 0,
        },
        cache: {
          hitRate: 0,
          missRate: 0,
          size: 0,
          evictions: 0,
        },
        errors: {
          connectionErrors: 0,
          queryErrors: stats.failedQueries || 0,
          timeoutErrors: 0,
          otherErrors: 0,
          reconnectAttempts: 0,
        },
      };

      this.metricsHistory.push(metrics);
      if (this.metricsHistory.length > this.maxHistorySize) {
        this.metricsHistory.shift();
      }

      this.checkPerformanceThresholds(metrics);
      this.emit('metrics', metrics);
    } catch (error) {
      console.error('Error collecting metrics:', error);
      this.createAlert(
        AlertLevel.ERROR,
        `Failed to collect metrics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { timestamp: new Date() } as Partial<DatabaseMetrics>
      );

      // 发出错误事件
      this.emit('error', error);

      // 使用默认指标作为后备
      const fallbackMetrics = this.getDefaultMetrics();
      this.metricsHistory.push(fallbackMetrics);
      if (this.metricsHistory.length > this.maxHistorySize) {
        this.metricsHistory.shift();
      }
    }
  }

  /**
   * 检查性能阈值并生成相应警报
   * 包含数据验证和异常处理
   */
  private checkPerformanceThresholds(metrics: DatabaseMetrics): void {
    try {
      // 验证输入数据
      if (!metrics || !metrics.performance || !metrics.queries || !metrics.connections) {
        console.warn('Invalid metrics data provided to checkPerformanceThresholds');
        return;
      }

      // 检查延迟阈值
      const latency = metrics.performance.averageLatency;
      if (typeof latency === 'number' && !isNaN(latency) && latency > this.thresholds.maxLatency) {
        this.createAlert(AlertLevel.WARNING, `High latency detected: ${latency}ms`, metrics);
      }

      // 检查失败率阈值
      const totalQueries = metrics.queries.total || 0;
      const failedQueries = metrics.queries.failed || 0;
      if (totalQueries > 0) {
        const failureRate = (failedQueries / totalQueries) * 100;
        if (!isNaN(failureRate) && failureRate > this.thresholds.maxFailureRate) {
          this.createAlert(AlertLevel.ERROR, `High failure rate detected: ${failureRate.toFixed(2)}%`, metrics);
        }
      }

      // 检查CPU使用率
      const cpuUsage = metrics.performance.cpuUsage;
      if (typeof cpuUsage === 'number' && !isNaN(cpuUsage) && cpuUsage > this.thresholds.maxCpuUsage) {
        this.createAlert(AlertLevel.WARNING, `High CPU usage detected: ${cpuUsage}%`, metrics);
      }

      // 检查内存使用率
      const memoryUsage = metrics.performance.memoryUsage;
      if (typeof memoryUsage === 'number' && !isNaN(memoryUsage) && memoryUsage > this.thresholds.maxMemoryUsage) {
        this.createAlert(AlertLevel.WARNING, `High memory usage detected: ${memoryUsage}MB`, metrics);
      }

      // 检查连接池利用率
      const poolUtilization = metrics.connections.poolUtilization;
      if (typeof poolUtilization === 'number' && !isNaN(poolUtilization) && poolUtilization > 90) {
        this.createAlert(AlertLevel.WARNING, `High connection pool utilization: ${poolUtilization.toFixed(2)}%`, metrics);
      }
    } catch (error) {
      console.error('Error checking performance thresholds:', error);
      this.createAlert(
        AlertLevel.ERROR,
        `Failed to check performance thresholds: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metrics
      );
    }
  }

  private createAlert(
    level: AlertLevel,
    message: string,
    metrics?: Partial<DatabaseMetrics>
  ): void {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      level,
      message,
      timestamp: new Date(),
      metrics: metrics || {},
      resolved: false,
      source: 'DatabaseMonitor',
    };
    this.alerts.push(alert);
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }
    this.emit('alert', alert);
  }

  public getMetricsHistory(limit: number = 10): DatabaseMetrics[] {
    return this.metricsHistory.slice(-limit);
  }

  public getAlerts(level?: AlertLevel): Alert[] {
    if (level) {
      return this.alerts.filter(alert => alert.level === level);
    }
    return this.alerts;
  }

  public addAlert(alert: DatabaseMetrics): void {
    this.alerts.push(alert);
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }
    this.emit('alert', alert);
  }

  public clearAlerts(level?: AlertLevel): void {
    if (level) {
      this.alerts = this.alerts.filter(alert => alert.level !== level);
    } else {
      this.alerts = [];
    }
  }

  /**
   * 获取数据库健康状态
   * 包含完善的异常处理和数据验证
   */
  public async getHealthStatus(): Promise<HealthStatus> {
    try {
      const stats = enhancedDb.getStats();
      const latestMetrics = this.metricsHistory[this.metricsHistory.length - 1];

      if (!latestMetrics) {
        console.warn('No metrics available for health status calculation');
        return {
          overall: 'unknown',
          database: {
            status: 'disconnected',
            latency: 0,
            uptime: 0,
          },
          connections: {
            status: 'unknown',
            utilization: 0,
          },
          performance: {
            status: 'unknown',
            score: 0,
          },
          alerts: [],
        };
      }

      const issues: string[] = [];
      let overallStatus: 'healthy' | 'warning' | 'critical' | 'unknown' = 'healthy';
      let score = 100;

      // 验证指标数据完整性
      if (!latestMetrics.performance || !latestMetrics.queries || !latestMetrics.connections) {
        console.warn('Incomplete metrics data for health status calculation');
        return {
          overall: 'unknown',
          database: {
            status: 'unknown',
            latency: 0,
            uptime: 0,
          },
          connections: {
            status: 'unknown',
            utilization: 0,
          },
          performance: {
            status: 'unknown',
            score: 0,
          },
          alerts: this.alerts.slice(-5),
        };
      }

      // 检查延迟
      const latency = latestMetrics.performance.averageLatency;
      if (typeof latency === 'number' && !isNaN(latency) && latency > this.thresholds.maxLatency) {
        issues.push(`High latency: ${latency}ms`);
        overallStatus = 'warning';
        score -= 20;
      }

      // 检查失败率
      const totalQueries = latestMetrics.queries.total || 0;
      const failedQueries = latestMetrics.queries.failed || 0;
      if (totalQueries > 0) {
        const failureRate = (failedQueries / totalQueries) * 100;
        if (!isNaN(failureRate) && failureRate > this.thresholds.maxFailureRate) {
          issues.push(`High failure rate: ${failureRate.toFixed(2)}%`);
          overallStatus = 'critical';
          score -= 30;
        }
      }

      // 检查CPU使用率
      const cpuUsage = latestMetrics.performance.cpuUsage;
      if (typeof cpuUsage === 'number' && !isNaN(cpuUsage) && cpuUsage > this.thresholds.maxCpuUsage) {
        issues.push(`High CPU usage: ${cpuUsage}%`);
        if (overallStatus !== 'critical') overallStatus = 'warning';
        score -= 15;
      }

      // 检查内存使用率
      const memoryUsage = latestMetrics.performance.memoryUsage;
      if (typeof memoryUsage === 'number' && !isNaN(memoryUsage) && memoryUsage > this.thresholds.maxMemoryUsage) {
        issues.push(`High memory usage: ${memoryUsage}MB`);
        if (overallStatus !== 'critical') overallStatus = 'warning';
        score -= 15;
      }

      // 检查连接池利用率
      const poolUtilization = latestMetrics.connections.poolUtilization;
      if (typeof poolUtilization === 'number' && !isNaN(poolUtilization) && poolUtilization > 90) {
        issues.push(`High connection pool utilization: ${poolUtilization.toFixed(2)}%`);
        if (overallStatus !== 'critical') overallStatus = 'warning';
        score -= 10;
      }

      return {
        overall: this.alerts.some(a => a.level === AlertLevel.CRITICAL)
          ? 'critical'
          : this.alerts.some(a => a.level === AlertLevel.ERROR)
            ? 'warning'
            : overallStatus,
        database: {
          status: enhancedDb.getConnectionState() === 'connected' ? 'connected' : 'disconnected',
          latency: latestMetrics.performance.averageLatency || 0,
          uptime: latestMetrics.uptime || 0,
        },
        connections: {
          status:
            latestMetrics.connections.active > 8
              ? 'critical'
              : latestMetrics.connections.active > 5
                ? 'high'
                : 'optimal',
          utilization: latestMetrics.connections.poolUtilization || 0,
        },
        performance: {
          status:
            latestMetrics.performance.averageLatency > 1000
              ? 'poor'
              : latestMetrics.performance.averageLatency > 500
                ? 'degraded'
                : 'good',
          score: Math.max(0, score),
        },
        alerts: this.alerts.slice(-5),
      };
    } catch (error) {
      console.error('Error calculating health status:', error);
      this.createAlert(
        AlertLevel.ERROR,
        `Failed to calculate health status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { timestamp: new Date() } as Partial<DatabaseMetrics>
      );

      // 返回安全的默认状态
      return {
        overall: 'unknown',
        database: {
          status: 'unknown',
          latency: 0,
          uptime: 0,
        },
        connections: {
          status: 'unknown',
          utilization: 0,
        },
        performance: {
          status: 'unknown',
          score: 0,
        },
        alerts: this.alerts.slice(-5),
      };
    }
  }

  public getOptimizationStatus(): OptimizationStatus {
    // return this.optimizationCoordinator.getStatus(); // 移除循环依赖
    return {
      poolOptimizer: false,
      queryOptimizer: false,
      cacheOptimizer: false,
      connectionAnalyzer: false,
      performanceEnhancer: false,
      errorRecovery: false,
    };
  }

  public getOptimizationRecommendations(): any[] {
    // return this.optimizationCoordinator.getOptimizationHistory(10); // 移除循环依赖
    return [];
  }

  public triggerOptimization(strategy?: string): void {
    // this.optimizationCoordinator.triggerOptimizationEvaluation(); // 移除循环依赖
  }

  public getStatus(): any {
    return {
      isMonitoring: this.isMonitoring,
      lastMetric: this.metricsHistory[this.metricsHistory.length - 1],
    };
  }

  public async getMetrics(): Promise<DatabaseMetrics> {
    const latestMetrics = this.metricsHistory[this.metricsHistory.length - 1];
    if (!latestMetrics) {
      // 如果没有历史数据，收集一次当前指标
      this.collectMetrics();
      return this.metricsHistory[this.metricsHistory.length - 1] || this.getDefaultMetrics();
    }
    return latestMetrics;
  }

  private getDefaultMetrics(): DatabaseMetrics {
    return {
      timestamp: Date.now(),
      uptime: 0,
      totalQueries: 0,
      successfulQueries: 0,
      failedQueries: 0,
      averageQueryTime: 0,
      slowQueries: 0,
      currentLatency: 0,
      averageLatency: 0,
      maxLatency: 0,
      activeConnections: 0,
      idleConnections: 0,
      totalConnections: 0,
      maxConnections: 10,
      waitingRequests: 0,
      connectionCreations: 0,
      connectionDestructions: 0,
      memoryUsage: 0,
      maxMemoryUsage: 0,
      cpuUsage: 0,
      connectionErrors: 0,
      queryErrors: 0,
      timeoutErrors: 0,
    };
  }

  public getMonitoringStatus(): MonitoringStatus {
    return {
      isMonitoring: this.isMonitoring,
      interval: this.intervalMs,
      metricsHistoryCount: this.metricsHistory.length,
      alertsCount: this.alerts.length,
      thresholds: this.thresholds,
    };
  }

  /**
   * 获取监控统计数据
   * 兼容旧版API
   */
  public getStats(): any {
    if (this.metricsHistory.length > 0) {
      return this.metricsHistory[this.metricsHistory.length - 1];
    }
    return {};
  }
}

// 监控服务工厂实现
class DatabaseMonitorFactory implements IMonitoringServiceFactory {
  private instance: DatabaseMonitor | null = null;

  createMonitoringService(): IMonitoringService {
    if (!this.instance) {
      this.instance = new DatabaseMonitor();
    }
    return this.instance;
  }

  getInstance(): IMonitoringService {
    if (!this.instance) {
      this.instance = new DatabaseMonitor();
    }
    return this.instance;
  }
}

// 创建并注册监控服务工厂
const monitoringFactory = new DatabaseMonitorFactory();
monitoringRegistry.registerFactory(monitoringFactory);

// 导出监控服务实例（保持向后兼容）
export const databaseMonitor = monitoringFactory.getInstance() as DatabaseMonitor;

// 设置到注册表中
monitoringRegistry.setMonitoringService(databaseMonitor);
