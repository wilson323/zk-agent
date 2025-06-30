/**
 * 监控系统接口定义
 * 用于解决循环依赖问题的抽象层
 */

import { EventEmitter } from 'events';
import { DatabaseMetrics, HealthStatus } from './unified-interfaces';
import { AlertLevel } from '@/lib/types/enums';

// 基础监控接口
export interface IMonitoringService extends EventEmitter {
  startMonitoring(): Promise<void>;
  stopMonitoring(): Promise<void>;
  getMonitoringStatus(): MonitoringStatus;
  getMetrics(): Promise<DatabaseMetrics>;
  getMetricsHistory(limit?: number): DatabaseMetrics[];
  getHealthStatus(): Promise<HealthStatus>;
  getOptimizationStatus(): OptimizationStatus;
  addAlert(alert: Alert): void;
  getAlerts(level?: AlertLevel): Alert[];
  clearAlerts(level?: AlertLevel): void;
}

// 监控状态接口
export interface MonitoringStatus {
  isMonitoring: boolean;
  interval: number;
  metricsHistoryCount: number;
  alertsCount: number;
  thresholds: PerformanceThresholds;
}

// 数据库指标接口
// DatabaseMetrics 接口已迁移到 unified-interfaces.ts
// 请使用: import { DatabaseMetrics } from './unified-interfaces'

// 健康状态接口
export interface HealthStatus {
  overall: 'healthy' | 'warning' | 'critical';
  database: {
    status: 'connected' | 'disconnected' | 'error';
    latency: number;
    uptime: number;
  };
  connections: {
    status: 'optimal' | 'high' | 'critical';
    utilization: number;
  };
  performance: {
    status: 'good' | 'degraded' | 'poor';
    score: number;
  };
  alerts: Alert[];
}

// 优化状态接口
export interface OptimizationStatus {
  poolOptimizer: boolean;
  queryOptimizer: boolean;
  cacheOptimizer: boolean;
  connectionAnalyzer: boolean;
  performanceEnhancer: boolean;
  errorRecovery: boolean;
}

// 性能阈值接口
export interface PerformanceThresholds {
  maxConnections: number;
  maxResponseTime: number;
  minCacheHitRate: number;
  maxCpuUsage: number;
  maxMemoryUsage: number;
  maxErrorRate: number;
  maxLatency: number;
  maxFailureRate: number;
  maxReconnectAttempts: number;
  minUptime: number;
}

// 告警级别枚举
export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// 告警接口
export interface Alert {
  id: string;
  level: AlertLevel;
  message: string;
  timestamp: Date;
  source: string;
  resolved: boolean;
  metadata?: Record<string, any>;
  metrics?: Partial<DatabaseMetrics>;
  threshold?: number;
}

// 监控事件类型
export interface MonitoringEvents {
  'metrics': (metrics: DatabaseMetrics) => void;
  'alert': (alert: Alert) => void;
  'performance-degradation': (metrics: DatabaseMetrics) => void;
  'query-start': (queryInfo: QueryInfo) => void;
  'query-end': (queryInfo: QueryInfo) => void;
  'query-error': (queryInfo: QueryInfo) => void;
  'connection-change': (connectionInfo: ConnectionInfo) => void;
}

// 查询信息接口
export interface QueryInfo {
  id: string;
  query: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  error?: Error;
  metadata?: Record<string, any>;
}

// 连接信息接口
export interface ConnectionInfo {
  id: string;
  state: 'connecting' | 'connected' | 'idle' | 'busy' | 'disconnected' | 'error';
  timestamp: Date;
  metadata?: Record<string, any>;
}

// 监控服务工厂接口
export interface IMonitoringServiceFactory {
  createMonitoringService(): IMonitoringService;
  getInstance(): IMonitoringService;
}

// 监控配置接口
export interface MonitoringConfig {
  enabled: boolean;
  interval: number;
  metricsHistoryLimit: number;
  thresholds: PerformanceThresholds;
  alerting: {
    enabled: boolean;
    channels: string[];
  };
}
