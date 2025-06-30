/**
 * 错误监控系统配置
 */

export interface ErrorMonitoringConfig {
  // 监控间隔（毫秒）
  monitoringInterval: number;
  
  // 告警阈值
  alertThresholds: {
    errorRate: number; // 错误率阈值（错误/分钟）
    criticalErrorCount: number; // 关键错误数量阈值
    timeWindow: number; // 时间窗口（毫秒）
  };
  
  // 数据保留策略
  dataRetention: {
    errorHistoryDays: number; // 错误历史保留天数
    alertHistoryDays: number; // 告警历史保留天数
    maxErrorsInMemory: number; // 内存中最大错误数量
  };
  
  // 通知配置
  notifications: {
    enabled: boolean;
    channels: string[]; // 通知渠道
    cooldownPeriod: number; // 冷却期（毫秒）
  };
  
  // 自动恢复配置
  autoRecovery: {
    enabled: boolean;
    maxRetries: number;
    retryDelay: number; // 重试延迟（毫秒）
  };
}

/**
 * 默认错误监控配置
 */
export const defaultErrorMonitoringConfig: ErrorMonitoringConfig = {
  monitoringInterval: 30000, // 30秒
  
  alertThresholds: {
    errorRate: 10, // 10错误/分钟
    criticalErrorCount: 5, // 5个关键错误
    timeWindow: 300000, // 5分钟时间窗口
  },
  
  dataRetention: {
    errorHistoryDays: 30, // 保留30天错误历史
    alertHistoryDays: 7, // 保留7天告警历史
    maxErrorsInMemory: 1000, // 内存中最多1000个错误
  },
  
  notifications: {
    enabled: true,
    channels: ['console', 'log'], // 控制台和日志
    cooldownPeriod: 300000, // 5分钟冷却期
  },
  
  autoRecovery: {
    enabled: true,
    maxRetries: 3,
    retryDelay: 5000, // 5秒重试延迟
  },
};

/**
 * 获取错误监控配置
 */
export function getErrorMonitoringConfig(): ErrorMonitoringConfig {
  const config = { ...defaultErrorMonitoringConfig };
  
  // 从环境变量覆盖配置
  if (process.env.ERROR_MONITORING_INTERVAL) {
    config.monitoringInterval = parseInt(process.env.ERROR_MONITORING_INTERVAL);
  }
  
  if (process.env.ERROR_RATE_THRESHOLD) {
    config.alertThresholds.errorRate = parseInt(process.env.ERROR_RATE_THRESHOLD);
  }
  
  if (process.env.CRITICAL_ERROR_THRESHOLD) {
    config.alertThresholds.criticalErrorCount = parseInt(process.env.CRITICAL_ERROR_THRESHOLD);
  }
  
  if (process.env.ERROR_HISTORY_DAYS) {
    config.dataRetention.errorHistoryDays = parseInt(process.env.ERROR_HISTORY_DAYS);
  }
  
  if (process.env.NOTIFICATIONS_ENABLED) {
    config.notifications.enabled = process.env.NOTIFICATIONS_ENABLED === 'true';
  }
  
  if (process.env.AUTO_RECOVERY_ENABLED) {
    config.autoRecovery.enabled = process.env.AUTO_RECOVERY_ENABLED === 'true';
  }
  
  return config;
}

/**
 * 验证错误监控配置
 */
export function validateErrorMonitoringConfig(config: ErrorMonitoringConfig): boolean {
  try {
    // 验证监控间隔
    if (config.monitoringInterval < 1000 || config.monitoringInterval > 300000) {
      console.warn('监控间隔应在1秒到5分钟之间');
      return false;
    }
    
    // 验证告警阈值
    if (config.alertThresholds.errorRate <= 0) {
      console.warn('错误率阈值必须大于0');
      return false;
    }
    
    if (config.alertThresholds.criticalErrorCount <= 0) {
      console.warn('关键错误数量阈值必须大于0');
      return false;
    }
    
    // 验证数据保留策略
    if (config.dataRetention.errorHistoryDays <= 0) {
      console.warn('错误历史保留天数必须大于0');
      return false;
    }
    
    if (config.dataRetention.maxErrorsInMemory <= 0) {
      console.warn('内存中最大错误数量必须大于0');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('配置验证失败:', error);
    return false;
  }
}