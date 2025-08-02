/**
 * @file Performance Monitor
 * @description 性能监控和指标收集系统
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

import { EventEmitter } from 'events';
import * as client from 'prom-client';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();

const logger = getLogger();

// Prometheus Metrics
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 5, 15, 50, 100, 200, 300, 400, 500, 1000, 2000, 5000],
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'code'],
});

const processCpuUsage = new client.Gauge({
  name: 'process_cpu_usage_percent',
  help: 'CPU usage of the process in percent',
});

const processMemoryUsage = new client.Gauge({
  name: 'process_memory_usage_bytes',
  help: 'Memory usage of the process in bytes',
  labelNames: ['type'],
});

const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
});

const errorCount = new client.Counter({
  name: 'application_error_total',
  help: 'Total number of application errors',
  labelNames: ['type'],
});

// 性能指标接口
export interface PerformanceMetrics {
  timestamp: Date;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  activeConnections: number;
  errorCount: number;
}

// 性能统计接口
export interface PerformanceStats {
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  memoryUsagePercent: number;
  cpuUsagePercent: number;
}

// 告警配置接口
export interface AlertConfig {
  responseTimeThreshold: number; // 响应时间阈值（毫秒）
  errorRateThreshold: number; // 错误率阈值（百分比）
  memoryUsageThreshold: number; // 内存使用率阈值（百分比）
  cpuUsageThreshold: number; // CPU使用率阈值（百分比）
}

// 性能监控器类
export class PerformanceMonitor extends EventEmitter {
  private metrics: PerformanceMetrics[] = [];
  private alertConfig: AlertConfig;
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private maxMetricsHistory: number = 10000;

  constructor(alertConfig?: Partial<AlertConfig>) {
    super();
    this.alertConfig = {
      responseTimeThreshold: 5000, // 5秒
      errorRateThreshold: 5, // 5%
      memoryUsageThreshold: 80, // 80%
      cpuUsageThreshold: 80, // 80%
      ...alertConfig,
    };
  }

  /**
   * 开始性能监控
   */
  startMonitoring(intervalMs: number = 60000): void {
    if (this.isMonitoring) {
      logger.warn('Performance monitoring is already running');
      return;
    }

    this.isMonitoring = true;
  }
}
