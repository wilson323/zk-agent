/**
 * 错误相关类型定义
 */

// 错误代码枚举
// 导入统一的错误代码枚举
import { ErrorCode } from '@/lib/types/enums';

// 重新导出以保持向后兼容性
export { ErrorCode };

// 错误详情接口
export interface ErrorDetails {
  code: ErrorCode
  message: string
  details?: any
  timestamp?: string
  requestId?: string
  stack?: string
}

// 错误报告接口
export interface ErrorReport {
  id: string
  type: string
  message: string
  stack?: string
  timestamp: string
  resolved: boolean
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  metadata?: Record<string, any>
}

// 告警事件接口
export interface AlertEvent {
  id: string
  type: string
  message: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  timestamp: string
  isResolved: boolean
  metadata?: Record<string, any>
}

// 错误统计接口
export interface ErrorStats {
  total: number
  resolved: number
  unresolved: number
  errorRate: number
  averageResolutionTime: number
  topErrors: ErrorReport[]
}

// 健康检查结果
export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded'
  score: number
  issues: string[]
  errorStats: ErrorStats
  timestamp: string
}

// 根因分析结果
export interface RootCauseAnalysis {
  errorId: string
  possibleCauses: string[]
  recommendations: string[]
  confidence: number
  timestamp: string
}

// 系统状态
export interface SystemStatus {
  overall: 'healthy' | 'warning' | 'critical'
  components: {
    database: 'up' | 'down' | 'degraded'
    api: 'up' | 'down' | 'degraded'
    external: 'up' | 'down' | 'degraded'
  }
  metrics: {
    responseTime: number
    errorRate: number
    uptime: number
  }
}

// 错误监控配置
export interface ErrorMonitoringConfig {
  alertThreshold: number
  alertRecipients: string[]
  retentionPeriod: number
  enableRealTimeAlerts: boolean
}