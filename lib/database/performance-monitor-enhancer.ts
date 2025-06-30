/**
 * @file Database Monitoring Enhancer
 * @description 数据库监控系统增强器 - 统一代理
 * @author ZK-Agent Team
 * @date 2024-12-27
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';
// import { DatabaseMonitor, databaseMonitor, Alert, DatabaseMetrics } from './monitoring'; // 移除循环依赖
import { DatabaseMetrics, Alert, IMonitoringService } from './unified-interfaces';
import { IMonitoringService as IMonitoringServiceLegacy } from './monitoring-interfaces';
import { getMonitoringService, isMonitoringInitialized } from './monitoring-registry';

export class PerformanceMonitorEnhancer extends EventEmitter {
  private logger: Logger;

  constructor(private monitor: IMonitoringService) {
    super();
    this.logger = new Logger('PerformanceMonitorEnhancer');
    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.monitor.on('metrics', (metrics: DatabaseMetrics) => this.handleMetrics(metrics));
    this.monitor.on('alert', (alert: Alert) => this.handleAlert(alert));
  }

  private handleMetrics(metrics: DatabaseMetrics) {
    // 在这里可以添加更高级的指标处理逻辑
    this.emit('enhanced-metrics', metrics);
  }

  private handleAlert(alert: Alert) {
    // 在这里可以添加更高级的告警处理逻辑
    this.emit('enhanced-alert', alert);
  }

  public getStatus() {
    this.logger.info('Fetching status from underlying DatabaseMonitor');
    return this.monitor.getStatus();
  }
  
  public generateOptimizationReport() {
      return this.monitor.getOptimizationStatus();
  }
  
  public generateOptimizationRecommendations() {
      return this.monitor.getOptimizationRecommendations();
  }
}

// 延迟初始化以避免循环依赖
let _databaseMonitoringEnhancer: PerformanceMonitorEnhancer | null = null;

export const getDatabaseMonitoringEnhancer = async (): Promise<PerformanceMonitorEnhancer | null> => {
  if (!_databaseMonitoringEnhancer && isMonitoringInitialized()) {
    const monitoringService = await getMonitoringService();
    if (monitoringService) {
      _databaseMonitoringEnhancer = new PerformanceMonitorEnhancer(monitoringService);
    }
  }
  return _databaseMonitoringEnhancer;
};

// 为了向后兼容，保留原有的导出方式
// 注意：这可能返回null，使用时需要检查
export const databaseMonitoringEnhancer = getDatabaseMonitoringEnhancer();

// Re-exporting types for compatibility
export type {
    AdvancedMonitoringConfig,
    PerformanceTrend,
    AnomalyDetectionResult,
    BenchmarkResult,
    PredictionResult,
    MonitoringReport,
} from './monitoring-enhancer.types';