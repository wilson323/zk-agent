/**
 * 统一的数据库接口定义文件
 * 解决重复接口定义和逻辑不匹配问题
 */

import { EventEmitter } from 'events';
import { AlertLevel } from '@/lib/types/enums';

// ===== 基础类型定义 =====
export type CacheStrategy = 'lru' | 'lfu' | 'fifo' | 'ttl' | 'adaptive';

// ===== 统一的数据库指标接口 =====
export interface DatabaseMetrics {
  // 基础信息
  timestamp: Date;
  uptime?: number; // 运行时间（秒）

  // 连接指标 - 统一结构
  connections: {
    active: number;
    idle: number;
    total: number;
    waiting: number;
    max?: number;
    poolUtilization: number;
    creations: number;
    destructions: number;
  };

  // 查询统计 - 统一结构
  queries: {
    total: number;
    successful: number;
    failed: number;
    averageTime: number; // ms
    slowQueries: number;
    slowQueryThreshold?: number; // ms
  };

  // 性能指标 - 统一结构
  performance: {
    cpuUsage: number; // 百分比
    memoryUsage: number; // MB
    maxMemoryUsage?: number; // MB
    diskUsage?: number;
    responseTime: number; // ms
    throughput: number;
    networkLatency?: number; // ms

    // 延迟指标
    currentLatency: number;
    averageLatency: number;
    maxLatency: number;
  };

  // 缓存指标 - 统一结构
  cache: {
    hitRate: number;
    missRate: number;
    size: number;
    evictions: number;
  };

  // 错误统计 - 统一结构
  errors: {
    connectionErrors: number;
    queryErrors: number;
    timeoutErrors: number;
    otherErrors: number;
    reconnectAttempts: number;
  };
}

// ===== 统一的缓存配置接口 =====
export interface CacheConfig {
  // 基础配置
  enabled: boolean;
  strategy: CacheStrategy;

  // L1缓存（内存缓存）
  l1: {
    enabled: boolean;
    maxSize: number;
    ttl: number; // 秒
    strategy: CacheStrategy;
  };

  // L2缓存（Redis缓存）
  l2?: {
    enabled: boolean;
    redis: {
      host: string;
      port: number;
      password?: string;
      db: number;
      keyPrefix: string;
    };
    maxSize: number;
    ttl: number; // 秒
    strategy: CacheStrategy;
  };

  // 通用配置
  compression: boolean;
  enableStats: boolean;
  cacheEmptyResults: boolean;

  // 预热配置
  warmup: {
    enabled: boolean;
    queries: string[];
    schedule?: string;
  };

  // 监控配置
  monitoring: {
    enabled: boolean;
    metricsInterval: number;
    alertThresholds: {
      hitRateMin: number;
      memoryUsageMax: number;
      latencyMax: number;
    };
  };
}

// ===== 统一的查询缓存配置接口 =====
export interface QueryCacheConfig {
  enabled: boolean;
  maxSize: number;
  ttl: number; // 统一使用毫秒
  keyPrefix: string;
  strategy: 'lru' | 'lfu' | 'ttl';
  cacheEmptyResults: boolean;
  cacheSlowQueries: boolean;
  slowQueryThreshold: number; // ms
}

// ===== 统一的连接池配置接口 =====
export interface ConnectionPoolConfig {
  min: number;
  max: number;
  acquireTimeoutMillis: number;
  createTimeoutMillis: number;
  destroyTimeoutMillis: number;
  idleTimeoutMillis: number;
  reapIntervalMillis: number;
  createRetryIntervalMillis: number;
  propagateCreateError: boolean;

  // 健康检查配置
  healthCheck: {
    enabled: boolean;
    interval: number; // ms
    timeout: number; // ms
    retries: number;
  };

  // 重连配置
  reconnection: {
    enabled: boolean;
    maxAttempts: number;
    delay: number; // ms
    backoff: 'linear' | 'exponential';
  };
}

// ===== 统一的数据库配置接口 =====
export interface DatabaseConfig {
  // 连接配置
  connection: {
    url: string;
    pool: ConnectionPoolConfig;
  };

  // 缓存配置
  cache: CacheConfig;

  // 查询配置
  query: QueryCacheConfig;

  // 监控配置
  monitoring: {
    enabled: boolean;
    interval: number; // ms
    retention: number; // 历史数据保留天数
    alerts: {
      enabled: boolean;
      thresholds: PerformanceThresholds;
    };
  };

  // 安全配置
  security: {
    encryption: boolean;
    ssl: boolean;
    rateLimiting: {
      enabled: boolean;
      maxRequests: number;
      windowMs: number;
    };
  };
}

// ===== 支持类型定义 =====

export interface PerformanceThresholds {
  maxConnections: number;
  maxResponseTime: number;
  minCacheHitRate: number;
  maxCpuUsage: number; // 百分比
  maxMemoryUsage: number; // MB
  maxErrorRate: number; // 百分比
  maxLatency: number; // ms
  maxFailureRate: number;
  maxReconnectAttempts: number;
  minUptime: number;
}

// AlertLevel已在 @/lib/types/enums 中定义，请从那里导入

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

// ===== 监控服务接口 =====
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

// 监控事件类型
export interface MonitoringEvents {
  metrics: (metrics: DatabaseMetrics) => void;
  alert: (alert: Alert) => void;
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

// 监控状态接口
export interface MonitoringStatus {
  isMonitoring: boolean;
  interval: number;
  metricsHistoryCount: number;
  alertsCount: number;
  thresholds: PerformanceThresholds;
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

// ===== 事件接口 =====
export interface MonitoringEvents {
  metrics: (metrics: DatabaseMetrics) => void;
  alert: (alert: Alert) => void;
  'performance-degradation': (metrics: DatabaseMetrics) => void;
  'query-start': (queryInfo: QueryInfo) => void;
  'query-end': (queryInfo: QueryInfo) => void;
  'connection-created': () => void;
  'connection-destroyed': () => void;
}

export interface QueryInfo {
  id: string;
  sql: string;
  params?: any[];
  startTime: number;
  endTime?: number;
  duration?: number;
  error?: Error;
}
