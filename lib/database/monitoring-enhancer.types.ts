/**
 * @file Monitoring Enhancer Types
 * @description 监控增强器类型定义
 * @author ZK-Agent Team
 * @date 2024-12-27
 */

import { DatabaseMetrics, Alert } from './unified-interfaces';

/**
 * 高级监控配置接口
 */
export interface AdvancedMonitoringConfig {
  /** 是否启用高级监控 */
  enabled: boolean;
  /** 监控间隔(ms) */
  intervalMs: number;
  /** 异常检测配置 */
  anomalyDetection: {
    enabled: boolean;
    sensitivity: 'low' | 'medium' | 'high';
    algorithm: 'statistical' | 'ml' | 'hybrid';
    thresholds: {
      responseTime: number;
      errorRate: number;
      memoryUsage: number;
      cpuUsage: number;
    };
  };
  /** 预测分析配置 */
  prediction: {
    enabled: boolean;
    horizon: number; // 预测时间范围(分钟)
    confidence: number; // 置信度阈值
  };
  /** 基准测试配置 */
  benchmarking: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    metrics: string[];
  };
}

/**
 * 监控配置接口
 */
export interface MonitoringConfig {
  /** 基础配置 */
  basic: {
    enabled: boolean;
    intervalMs: number;
    maxHistorySize: number;
  };
  /** 告警配置 */
  alerts: {
    enabled: boolean;
    channels: ('email' | 'slack' | 'webhook')[];
    thresholds: {
      critical: number;
      warning: number;
      info: number;
    };
  };
  /** 高级配置 */
  advanced: AdvancedMonitoringConfig;
}

/**
 * 性能趋势接口
 */
export interface PerformanceTrend {
  /** 指标名称 */
  metric: string;
  /** 时间序列数据 */
  timeSeries: {
    timestamp: Date;
    value: number;
  }[];
  /** 趋势方向 */
  direction: 'increasing' | 'decreasing' | 'stable';
  /** 变化率 */
  changeRate: number;
  /** 预测值 */
  prediction?: {
    nextValue: number;
    confidence: number;
    timeframe: number;
  };
}

/**
 * 异常检测结果接口
 */
export interface AnomalyDetectionResult {
  /** 检测时间 */
  timestamp: Date;
  /** 异常类型 */
  type: AnomalyType;
  /** 异常严重程度 */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** 异常描述 */
  description: string;
  /** 异常指标 */
  metric: string;
  /** 异常值 */
  value: number;
  /** 期望值 */
  expectedValue: number;
  /** 偏差程度 */
  deviation: number;
  /** 置信度 */
  confidence: number;
  /** 建议措施 */
  recommendations: string[];
}

/**
 * 异常类型枚举
 */
export enum AnomalyType {
  PERFORMANCE_DEGRADATION = 'performance_degradation',
  MEMORY_LEAK = 'memory_leak',
  CONNECTION_SPIKE = 'connection_spike',
  ERROR_RATE_INCREASE = 'error_rate_increase',
  LATENCY_SPIKE = 'latency_spike',
  THROUGHPUT_DROP = 'throughput_drop',
  RESOURCE_EXHAUSTION = 'resource_exhaustion',
  UNUSUAL_PATTERN = 'unusual_pattern',
}

/**
 * 趋势类型枚举
 */
export enum Trend {
  INCREASING = 'increasing',
  DECREASING = 'decreasing',
  STABLE = 'stable',
  VOLATILE = 'volatile',
}

/**
 * 阈值配置接口
 */
export interface ThresholdConfig {
  /** 警告阈值 */
  warning: number;
  /** 错误阈值 */
  error: number;
  /** 严重阈值 */
  critical: number;
  /** 阈值单位 */
  unit?: string;
  /** 是否启用 */
  enabled?: boolean;
}

/**
 * 基准测试结果接口
 */
export interface BenchmarkResult {
  /** 测试ID */
  testId: string;
  /** 测试名称 */
  name: string;
  /** 测试时间 */
  timestamp: Date;
  /** 测试持续时间(ms) */
  duration: number;
  /** 测试结果 */
  results: {
    metric: string;
    value: number;
    unit: string;
    baseline?: number;
    improvement?: number;
  }[];
  /** 测试环境 */
  environment: {
    nodeVersion: string;
    platform: string;
    cpuCores: number;
    memory: number;
  };
  /** 测试状态 */
  status: 'passed' | 'failed' | 'warning';
  /** 测试总结 */
  summary: string;
}

/**
 * 预测结果接口
 */
export interface PredictionResult {
  /** 预测时间 */
  timestamp: Date;
  /** 预测指标 */
  metric: string;
  /** 预测时间范围 */
  timeframe: number;
  /** 预测值 */
  predictedValue: number;
  /** 置信区间 */
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  /** 预测置信度 */
  confidence: number;
  /** 预测模型 */
  model: string;
  /** 影响因素 */
  factors: {
    factor: string;
    impact: number;
  }[];
}

/**
 * 监控报告接口
 */
export interface MonitoringReport {
  /** 报告ID */
  reportId: string;
  /** 报告类型 */
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  /** 报告时间范围 */
  timeRange: {
    start: Date;
    end: Date;
  };
  /** 生成时间 */
  generatedAt: Date;
  /** 摘要 */
  summary: {
    totalQueries: number;
    avgResponseTime: number;
    errorRate: number;
    uptime: number;
    alerts: number;
  };
  /** 性能趋势 */
  trends: PerformanceTrend[];
  /** 异常检测结果 */
  anomalies: AnomalyDetectionResult[];
  /** 基准测试结果 */
  benchmarks: BenchmarkResult[];
  /** 预测分析 */
  predictions: PredictionResult[];
  /** 建议措施 */
  recommendations: string[];
}

/**
 * 性能报告接口
 */
export interface PerformanceReport {
  /** 报告时间 */
  timestamp: Date;
  /** 报告周期 */
  period: {
    start: Date;
    end: Date;
    duration: number;
  };
  /** 整体性能评分 */
  overallScore: number;
  /** 性能指标 */
  metrics: PerformanceMetrics;
  /** 性能趋势 */
  trends: {
    responseTime: 'improving' | 'degrading' | 'stable';
    throughput: 'improving' | 'degrading' | 'stable';
    errorRate: 'improving' | 'degrading' | 'stable';
    resourceUsage: 'improving' | 'degrading' | 'stable';
  };
  /** 关键发现 */
  keyFindings: string[];
  /** 性能瓶颈 */
  bottlenecks: {
    type: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    recommendation: string;
  }[];
  /** 优化建议 */
  optimizationSuggestions: {
    priority: 'high' | 'medium' | 'low';
    category: string;
    description: string;
    expectedImprovement: string;
  }[];
}

/**
 * 监控告警接口
 */
export interface MonitoringAlert {
  /** 告警ID */
  id: string;
  /** 告警类型 */
  type: 'performance' | 'error' | 'resource' | 'availability';
  /** 告警级别 */
  level: 'info' | 'warning' | 'error' | 'critical';
  /** 告警标题 */
  title: string;
  /** 告警消息 */
  message: string;
  /** 告警时间 */
  timestamp: Date;
  /** 相关指标 */
  metrics: Partial<DatabaseMetrics>;
  /** 触发条件 */
  trigger: {
    condition: string;
    threshold: number;
    actualValue: number;
  };
  /** 告警状态 */
  status: 'active' | 'resolved' | 'acknowledged';
  /** 持续时间 */
  duration?: number;
  /** 影响范围 */
  impact: {
    scope: string;
    severity: 'low' | 'medium' | 'high';
    affectedUsers?: number;
  };
  /** 解决建议 */
  resolution: {
    steps: string[];
    estimatedTime: number;
    priority: 'low' | 'medium' | 'high';
  };
}

/**
 * 性能指标接口
 */
export interface PerformanceMetrics {
  /** 响应时间指标 */
  responseTime: {
    avg: number;
    min: number;
    max: number;
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  /** 吞吐量指标 */
  throughput: {
    requestsPerSecond: number;
    queriesPerSecond: number;
    transactionsPerSecond: number;
  };
  /** 错误率指标 */
  errorRate: {
    total: number;
    percentage: number;
    byType: {
      [errorType: string]: number;
    };
  };
  /** 资源使用指标 */
  resourceUsage: {
    cpu: {
      usage: number;
      cores: number;
    };
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    disk: {
      used: number;
      total: number;
      percentage: number;
    };
    network: {
      bytesIn: number;
      bytesOut: number;
      packetsIn: number;
      packetsOut: number;
    };
  };
  /** 连接指标 */
  connections: {
    active: number;
    idle: number;
    total: number;
    maxConcurrent: number;
  };
  /** 缓存指标 */
  cache: {
    hitRate: number;
    missRate: number;
    evictionRate: number;
    size: number;
  };
}