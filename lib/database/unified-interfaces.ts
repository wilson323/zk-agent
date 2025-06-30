/**
 * 统一的数据库接口定义文件
 * 解决重复接口定义和逻辑不匹配问题
 */

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
export type CacheStrategy = 'lru' | 'lfu' | 'ttl' | 'adaptive';

export interface PerformanceThresholds {
  maxLatency: number; // ms
  maxCpuUsage: number; // 百分比
  maxMemoryUsage: number; // MB
  minHitRate: number; // 百分比
  maxErrorRate: number; // 百分比
}

export type AlertLevel = 'info' | 'warning' | 'error' | 'critical';

export interface Alert {
  id: string;
  level: AlertLevel;
  message: string;
  timestamp: Date;
  metrics?: Partial<DatabaseMetrics>;
  threshold?: number;
  metadata?: Record<string, any>;
}

// ===== 监控服务接口 =====
export interface IMonitoringService {
  start(): Promise<void>;
  stop(): Promise<void>;
  getMetrics(): Promise<DatabaseMetrics>;
  getMetricsHistory(limit?: number): DatabaseMetrics[];
  getHealthStatus(): Promise<HealthStatus>;
  on(event: string, listener: (...args: any[]) => void): this;
  emit(event: string, ...args: any[]): boolean;
}

export interface HealthStatus {
  isHealthy: boolean;
  uptime: number;
  lastCheck: Date;
  issues: string[];
}

// ===== 事件接口 =====
export interface MonitoringEvents {
  'metrics': (metrics: DatabaseMetrics) => void;
  'alert': (alert: Alert) => void;
  'performance-degradation': (metrics: DatabaseMetrics) => void;
  'query-start': (queryInfo: QueryInfo) => void;
  'query-end': (queryInfo: QueryInfo, result: any) => void;
  'connection-created': () => void;
  'connection-destroyed': () => void;
}

export interface QueryInfo {
  id: string;
  sql: string;
  params?: any[];
  startTime: Date;
  endTime?: Date;
  duration?: number;
  error?: Error;
}
