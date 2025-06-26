// @ts-nocheck

/**
 * @file Performance Dashboard Configuration
 * @description 性能监控仪表板配置
 */

export const DASHBOARD_CONFIG = {
  // 实时指标
  realTimeMetrics: {
    updateInterval: 5000, // 5秒更新
    metrics: [
      'responseTime',
      'throughput',
      'errorRate',
      'memoryUsage',
      'cacheHitRate',
    ],
  },
  // 历史数据
  historicalData: {
    retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7天
    aggregationInterval: 60 * 1000, // 1分钟聚合
  },
  // 告警规则
  alertRules: [
    {
      name: 'High Response Time',
      condition: 'responseTime > 200',
      severity: 'warning',
    },
    {
      name: 'Low Cache Hit Rate',
      condition: 'cacheHitRate < 0.9',
      severity: 'warning',
    },
    {
      name: 'High Error Rate',
      condition: 'errorRate > 0.05',
      severity: 'critical',
    },
  ],
};
