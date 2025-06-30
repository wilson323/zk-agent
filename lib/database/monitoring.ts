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
  AlertLevel,
  PerformanceThresholds,
  IMonitoringService,
  HealthStatus
} from './unified-interfaces';
import {
  IMonitoringServiceFactory,
  MonitoringStatus,
  OptimizationStatus
} from './monitoring-interfaces';
import { monitoringRegistry } from './monitoring-registry';
import { ConnectionState, enhancedDb } from './enhanced-connection';
// import { PerformanceOptimizationCoordinator } from './performance-optimization-coordinator'; // 移除循环依赖

// Re-exporting necessary types from other modules
export type { 
    ConnectionPoolConfig, 
    ReconnectionConfig, 
    HealthCheckConfig, 
    ConnectionStats 
} from './enhanced-connection';

// ... other type re-exports

// 监控指标接口
// DatabaseMetrics 接口已迁移到 unified-interfaces.ts
// 请使用: import { DatabaseMetrics } from './unified-interfaces'

// 性能阈值配置
export interface PerformanceThresholds {
  maxLatency: number;
  maxFailureRate: number;
  maxReconnectAttempts: number;
  minUptime: number;
}

// 导入统一的告警级别枚举
import { AlertLevel } from '@/lib/types/enums';

// 告警信息
export interface Alert {
  id: string;
  level: AlertLevel;
  message: string;
  timestamp: Date;
  metrics: Partial<DatabaseMetrics>;
  threshold?: any;
}

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
    enhancedDb.on('disconnected', (error) => this.createAlert(AlertLevel.ERROR, `Database disconnected: ${error?.message}`.trim()));
    enhancedDb.on('reconnecting', (attempt) => this.createAlert(AlertLevel.WARNING, `Database reconnecting (attempt ${attempt})`));
    enhancedDb.on('reconnected', () => this.createAlert(AlertLevel.INFO, 'Database reconnected'));
    enhancedDb.on('error', (error) => this.createAlert(AlertLevel.ERROR, `Database error: ${error.message}`));
    enhancedDb.on('healthCheck', (healthy) => {
      if (!healthy) {
        this.createAlert(AlertLevel.WARNING, 'Database health check failed');
      }
    });
  }

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    this.lastCpuUsage = process.cpuUsage();
    this.monitoringInterval = setInterval(() => this.collectMetrics(), this.intervalMs);
    // this.optimizationCoordinator.start(); // 移除循环依赖
    this.emit('monitoringStarted');
  }

  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) return;
    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    // this.optimizationCoordinator.stop(); // 移除循环依赖
    this.emit('monitoringStopped');
  }

  private collectMetrics(): void {
    const stats = enhancedDb.getStats();
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage(this.lastCpuUsage || undefined);
    this.lastCpuUsage = process.cpuUsage();

    const metrics: DatabaseMetrics = {
      timestamp: Date.now(),
      uptime: stats.uptime || 0,
      totalQueries: stats.totalQueries || 0,
      successfulQueries: (stats.totalQueries || 0) - (stats.failedQueries || 0),
      failedQueries: stats.failedQueries || 0,
      averageQueryTime: stats.avgLatency || 0,
      slowQueries: 0,
      currentLatency: stats.avgLatency || 0,
      averageLatency: stats.avgLatency || 0,
      maxLatency: stats.avgLatency || 0,
      activeConnections: stats.totalQueries || 0,
      idleConnections: 0,
      totalConnections: stats.totalQueries || 0,
      maxConnections: 10,
      waitingRequests: 0,
      connectionCreations: 0,
      connectionDestructions: 0,
      memoryUsage: Math.round(memUsage.heapUsed / 1024 / 1024),
      maxMemoryUsage: Math.round(memUsage.heapTotal / 1024 / 1024),
      cpuUsage: Math.round((cpuUsage.user + cpuUsage.system) / 1000000),
      connectionErrors: 0,
      queryErrors: stats.failedQueries || 0,
      timeoutErrors: 0,
    };

    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }

    this.checkPerformanceThresholds(metrics);
    this.emit('metrics', metrics);
  }

  private checkPerformanceThresholds(metrics: DatabaseMetrics): void {
    if (metrics.averageLatency > this.thresholds.maxLatency) {
      this.createAlert(AlertLevel.WARNING, `High latency detected: ${metrics.averageLatency}ms`);
    }
    const failureRate = metrics.totalQueries > 0 ? (metrics.failedQueries / metrics.totalQueries) * 100 : 0;
    if (failureRate > this.thresholds.maxFailureRate) {
        this.createAlert(AlertLevel.ERROR, `High failure rate detected: ${failureRate.toFixed(2)}%`);
    }
  }

  private createAlert(level: AlertLevel, message: string, metrics?: Partial<DatabaseMetrics>): void {
    const alert: Alert = {
      level,
      message,
      timestamp: new Date(),
      metrics: metrics || {},
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

  public getAlerts(level?: DatabaseMetricsLevel): Alert[] {
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

  public clearAlerts(level?: DatabaseMetricsLevel): void {
    if (level) {
      this.alerts = this.alerts.filter(alert => alert.level !== level);
    } else {
      this.alerts = [];
    }
  }

  public async getHealthStatus(): Promise<HealthStatus> {
    const stats = enhancedDb.getDetailedStats();
    const latestMetrics = this.metricsHistory[this.metricsHistory.length - 1];
    
    return {
      overall: this.alerts.some(a => a.level === AlertLevel.CRITICAL) ? 'critical' : 
               this.alerts.some(a => a.level === AlertLevel.ERROR) ? 'warning' : 'healthy',
      database: {
        status: enhancedDb.getConnectionState() === 'connected' ? 'connected' : 'disconnected',
        latency: latestMetrics?.averageLatency || 0,
        uptime: latestMetrics?.uptime || 0
      },
      connections: {
        status: latestMetrics?.activeConnections > 8 ? 'critical' : 
                latestMetrics?.activeConnections > 5 ? 'high' : 'optimal',
        utilization: latestMetrics ? (latestMetrics.activeConnections / latestMetrics.maxConnections) * 100 : 0
      },
      performance: {
        status: latestMetrics?.averageLatency > 1000 ? 'poor' : 
                latestMetrics?.averageLatency > 500 ? 'degraded' : 'good',
        score: latestMetrics ? Math.max(0, 100 - (latestMetrics.averageLatency / 10)) : 100
      },
      alerts: this.alerts.slice(-5)
    };
  }
  
  public getOptimizationStatus(): OptimizationStatus {
    // return this.optimizationCoordinator.getStatus(); // 移除循环依赖
    return {
      poolOptimizer: false,
      queryOptimizer: false,
      cacheOptimizer: false,
      connectionAnalyzer: false,
      performanceEnhancer: false,
      errorRecovery: false
    };
  }
  
  public getOptimizationRecommendations(): any[] {
    // return this.optimizationCoordinator.getOptimizationHistory(10); // 移除循环依赖
    return [];
  }
  
  public triggerOptimization(strategy?: string): void {
    // this.optimizationCoordinator.triggerOptimizationEvaluation(); // 移除循环依赖
    console.log('优化触发请求已记录，但优化协调器已解耦');
  }

  public getStatus(): any {
    return {
        isMonitoring: this.isMonitoring,
        lastMetric: this.metricsHistory[this.metricsHistory.length - 1]
    }
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
      timeoutErrors: 0
    };
  }

  public getMonitoringStatus(): MonitoringStatus {
    return {
      isMonitoring: this.isMonitoring,
      interval: this.intervalMs,
      metricsHistoryCount: this.metricsHistory.length,
      alertsCount: this.alerts.length,
      thresholds: this.thresholds
    };
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
