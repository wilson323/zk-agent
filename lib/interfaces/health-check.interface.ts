/**
 * @file 健康检查接口定义
 * @description 定义服务健康检查的标准接口
 * @author ZK-Agent Team
 * @date 2025-06-29
 */

export interface HealthCheckResult {
  status: 'UP' | 'DOWN' | 'UNKNOWN';
  timestamp: Date;
  details?: Record<string, any>;
  error?: string;
}

export interface IHealthCheckService {
  checkHealth(): Promise<HealthCheckResult>;
}
