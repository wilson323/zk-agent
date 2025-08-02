/**
 * 监控系统接口定义
 * 用于解决循环依赖问题的抽象层
 * 注意：大部分接口已迁移到 unified-interfaces.ts
 */

import {
  DatabaseMetrics,
  HealthStatus,
  IMonitoringService,
  MonitoringStatus,
  OptimizationStatus,
  PerformanceThresholds,
  Alert
} from './unified-interfaces';

// 重新导出接口以保持向后兼容性
export {
  DatabaseMetrics,
  HealthStatus,
  IMonitoringService,
  MonitoringStatus,
  OptimizationStatus,
  PerformanceThresholds,
  Alert
};
import { AlertLevel } from '@/lib/types/enums';

// 基础监控接口已迁移到 unified-interfaces.ts
// 请使用: import { IMonitoringService } from './unified-interfaces'

// 监控状态接口已迁移到 unified-interfaces.ts
// 请使用: import { MonitoringStatus } from './unified-interfaces'

// 数据库指标接口已迁移到 unified-interfaces.ts
// 请使用: import { DatabaseMetrics } from './unified-interfaces'

// 健康状态接口已迁移到 unified-interfaces.ts
// 请使用: import { HealthStatus } from './unified-interfaces'

// 优化状态接口已迁移到 unified-interfaces.ts
// 请使用: import { OptimizationStatus } from './unified-interfaces'

// 性能阈值接口已迁移到 unified-interfaces.ts
// 请使用: import { PerformanceThresholds } from './unified-interfaces'

// AlertLevel已在 @/lib/types/enums 中定义，已在文件顶部导入

// 告警接口已迁移到 unified-interfaces.ts
// 请使用: import { Alert } from './unified-interfaces'

// 监控事件类型已迁移到 unified-interfaces.ts
// 请使用: import { MonitoringEvents } from './unified-interfaces'

// 查询信息接口已迁移到 unified-interfaces.ts
// 请使用: import { QueryInfo } from './unified-interfaces'

// 连接信息接口已迁移到 unified-interfaces.ts
// 请使用: import { ConnectionInfo } from './unified-interfaces'

// 监控服务工厂接口已迁移到 unified-interfaces.ts
// 请使用: import { IMonitoringServiceFactory } from './unified-interfaces'

// 监控配置接口已迁移到 unified-interfaces.ts
// 请使用: import { MonitoringConfig } from './unified-interfaces'
