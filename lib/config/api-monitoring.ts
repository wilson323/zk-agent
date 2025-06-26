// @ts-nocheck

/**
 * @file API Performance Monitoring
 * @description API性能监控配置
 */

export const API_MONITORING_CONFIG = {
  // 性能阈值
  thresholds: {
    responseTime: 200,
    errorRate: 0.01, // 1%错误率
    throughput: 1000, // 每秒1000请求
  },
  // 监控指标
  metrics: {
    responseTime: true,
    throughput: true,
    errorRate: true,
    memoryUsage: true,
    cpuUsage: true,
  },
  // 告警配置
  alerts: {
    enabled: true,
    channels: ['console', 'log'],
    thresholds: {
      responseTime: 400,
      errorRate: 0.05,
      memoryUsage: 0.8,
    },
  },
};
