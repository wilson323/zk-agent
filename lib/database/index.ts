/**
 * @file Database Performance Optimization Entry Point
 * @description 数据库性能优化统一入口
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

// 核心数据库管理器
export { enhancedDatabaseManager, enhancedDb } from './enhanced-database-manager';
export { databaseSecurityManager } from './security-manager';
export { databaseMonitoringEnhancer } from './performance-monitor-enhancer';


// 连接相关
export { EnhancedConnection, ConnectionState } from './enhanced-connection';
export type { ConnectionPoolConfig, ReconnectionConfig, HealthCheckConfig } from './enhanced-connection';

// 监控系统
export { databaseMonitor, DatabaseMonitor } from './monitoring';
export type { DatabaseMetrics, PerformanceThresholds, AlertLevel, Alert } from './monitoring';

// 性能优化协调器
export { PerformanceOptimizationCoordinator } from './performance-optimization-coordinator';
export type {
  PerformanceOptimizationConfig,
  OptimizationResult,
  OptimizationStrategy as CoordinatorOptimizationStrategy,
  ComponentStatus,
  CoordinatorConfig,
} from './performance-optimization-coordinator';

// 连接池分析器
export { ConnectionPoolAnalyzer } from './connection-pool-analyzer';
export type {
  PoolUsageStats,
  UsagePattern,
  BottleneckInfo,
  PoolAnalysisReport,
  UsagePatternAnalysis,
} from './connection-pool-analyzer';

// 动态连接池调整器
export { DynamicPoolAdjuster } from './dynamic-pool-adjuster';
export type {
  DynamicAdjustmentConfig,
  AdjustmentResult,
  LoadMetrics as AdjusterLoadMetrics,
  AdjustmentStrategy,
  AdjustmentHistory,
  PredictionModel,
} from './dynamic-pool-adjuster';

// 查询性能优化器
export { QueryPerformanceOptimizer } from './query-performance-optimizer';
export type {
  QueryOptimizationConfig,
  QueryAnalysisResult,
  QueryOptimizationSuggestion,
  QueryExecutionStats,
  QueryPattern,
  QueryCacheConfig,
  QueryCacheItem,
} from './query-performance-optimizer';

// 智能缓存管理器
export { IntelligentCacheManager } from './intelligent-cache-manager';
export type {
  CacheConfig,
  CacheStats,
  CacheEntry,
  CacheItem,
  CacheEvent,
} from './intelligent-cache-manager';

// 缓存策略优化器
export { CacheStrategyOptimizer } from './cache-strategy-optimizer';
export type {
  StrategyConfig as CacheStrategyConfig,
  StrategyPerformanceMetrics,
  OptimizationRecommendation,
  CacheOptimizationStrategy,
  StrategyEvaluationMetrics,
  ABTestConfig,
  ABTestResult,
  MLModel,
} from './cache-strategy-optimizer';

// 性能监控增强器
export {
  PerformanceMonitorEnhancer,
  databaseMonitoringEnhancer,
} from './performance-monitor-enhancer';
export type {
  MonitoringConfig,
  PerformanceReport,
  MonitoringAlert,
  PerformanceMetrics,
  AnomalyType,
  Trend,
  ThresholdConfig,
  AdvancedMonitoringConfig,
  PerformanceTrend,
  AnomalyDetectionResult,
  BenchmarkResult,
  PredictionResult,
  MonitoringReport,
} from './performance-monitor-enhancer';

// 旧版组件
export { ConnectionPoolEnhancer } from './connection-pool-enhancer';
export type { PoolConfig, LoadMetrics, OptimizationStrategy } from './connection-pool-enhancer';

export { QueryOptimizer } from './query-optimizer';
export type {
  QueryExecutionInfo,
  SlowQueryRecord,
  QueryStats,
  QueryPerformanceReport,
} from './query-optimizer';

export { CacheStrategyManager } from './cache-strategy-manager';
export type {
  CacheStrategy,
  CachePerformanceMetrics,
  CacheLevel,
} from './cache-strategy-manager';

export { DatabaseSecurityManager, databaseSecurityManager } from './security-manager';
export type {
  SecurityConfig,
  AuditLogEntry,
  AccessControlRule,
  ThreatDetectionResult,
} from './security-manager';

export { DatabasePoolOptimizer } from './pool-optimizer';

// 统一的工具类
import { DatabaseMonitor, databaseMonitor } from './monitoring';

export class DatabasePerformanceUtils {
  static async getPerformanceOverview() {
    const monitorStatus = databaseMonitor.getStatus();
    const optimizationStatus = databaseMonitor.getOptimizationStatus();
    const recommendations = databaseMonitor.getOptimizationRecommendations();

    return {
      monitoring: monitorStatus,
      optimization: optimizationStatus,
      recommendations,
      timestamp: new Date(),
    };
  }

  static async performOptimization(strategy?: string) {
    try {
      databaseMonitor.triggerOptimization(strategy);
      return {
        success: true,
        message: `性能优化已触发${strategy ? `: ${strategy}` : ''}`,
        timestamp: new Date(),
      };
    } catch (error: any) {
      return {
        success: false,
        message: `性能优化失败: ${error.message}`,
        timestamp: new Date(),
      };
    }
  }

  static async getPerformanceReport() {
    const metrics = databaseMonitor.getMetricsHistory();
    const alerts = databaseMonitor.getAlerts();
    const status = databaseMonitor.getStatus();
    const optimizationStatus = databaseMonitor.getOptimizationStatus();

    return {
      summary: {
        totalMetrics: metrics.length,
        totalAlerts: alerts.length,
        isMonitoring: status.isMonitoring,
        optimizationActive: optimizationStatus.coordinator?.isRunning || false,
      },
      metrics: metrics.slice(-10),
      alerts: alerts.slice(-5),
      status,
      optimizationStatus,
      generatedAt: new Date(),
    };
  }

  static async startFullOptimization() {
    try {
      if (!databaseMonitor.getStatus().isMonitoring) {
        await databaseMonitor.startMonitoring();
      }
      return {
        success: true,
        message: '数据库性能监控和优化已启动',
        timestamp: new Date(),
      };
    } catch (error: any) {
      return {
        success: false,
        message: `启动失败: ${error.message}`,
        timestamp: new Date(),
      };
    }
  }

  static async stopFullOptimization() {
    try {
      if (databaseMonitor.getStatus().isMonitoring) {
        await databaseMonitor.stopMonitoring();
      }
      return {
        success: true,
        message: '数据库性能监控和优化已停止',
        timestamp: new Date(),
      };
    } catch (error: any) {
      return {
        success: false,
        message: `停止失败: ${error.message}`,
        timestamp: new Date(),
      };
    }
  }
}

// 默认导出主要组件
const db = {
  databaseMonitor,
  enhancedDatabaseManager,
  enhancedDb,
  DatabasePerformanceUtils,
  get connectionPoolEnhancer() {
    const { ConnectionPoolEnhancer } = require('./connection-pool-enhancer');
    return new ConnectionPoolEnhancer({});
  },
  get queryOptimizer() {
    const { QueryOptimizer } = require('./query-optimizer');
    return new QueryOptimizer();
  },
  get cacheStrategyManager() {
    const { CacheStrategyManager } = require('./cache-strategy-manager');
    return new CacheStrategyManager();
  },
  databaseSecurityManager,
  databaseMonitoringEnhancer,
};

export default db;