/**
 * @file 数据库优化模块
 * @description 提供数据库性能优化的统一接口和功能
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

import { PerformanceOptimizationCoordinator } from './performance-optimization-coordinator';
import { DatabasePoolOptimizer } from './pool-optimizer';
import { QueryPerformanceOptimizer } from './query-optimizer';
import { MemoryUsageOptimizer } from './memory-optimizer';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();

/**
 * 数据库优化结果接口
 */
export interface OptimizationResult {
  success: boolean;
  message: string;
  metrics?: {
    before: Record<string, any>;
    after: Record<string, any>;
    improvement: Record<string, any>;
  };
  timestamp: Date;
}

/**
 * 优化选项接口
 */
export interface OptimizationOptions {
  connectionPool?: boolean;
  queryPerformance?: boolean;
  memoryUsage?: boolean;
  autoOptimize?: boolean;
  threshold?: {
    cpu?: number;
    memory?: number;
    connections?: number;
  };
}

/**
 * 数据库优化协调器实例
 */
let optimizationCoordinator: PerformanceOptimizationCoordinator | null = null;

/**
 * 初始化数据库优化系统
 * @param options 优化选项
 * @returns Promise<boolean> 初始化是否成功
 */
export async function initializeOptimization(options: OptimizationOptions = {}): Promise<boolean> {
  try {
    if (optimizationCoordinator) {
      logger.warn('数据库优化系统已经初始化');
      return true;
    }

    const config = {
      autoOptimize: options.autoOptimize ?? true,
      checkInterval: 30000, // 30秒检查一次
      performanceMonitoring: {
        enabled: true,
        metricsCollection: true,
        alerting: true
      },
      alerting: {
        enabled: true,
        thresholds: {
          cpu: options.threshold?.cpu ?? 80,
          memory: options.threshold?.memory ?? 85,
          connections: options.threshold?.connections ?? 90
        }
      },
      logLevel: 'info' as const
    };

    optimizationCoordinator = new PerformanceOptimizationCoordinator(config);
    await optimizationCoordinator.start();

    logger.info('数据库优化系统初始化成功');
    return true;
  } catch (error) {
    logger.error('数据库优化系统初始化失败:', error);
    return false;
  }
}

/**
 * 触发数据库优化
 * @param options 优化选项
 * @returns Promise<OptimizationResult> 优化结果
 */
export async function triggerDatabaseOptimization(options: OptimizationOptions = {}): Promise<OptimizationResult> {
  try {
    if (!optimizationCoordinator) {
      const initialized = await initializeOptimization(options);
      if (!initialized) {
        return {
          success: false,
          message: '优化系统初始化失败',
          timestamp: new Date()
        };
      }
    }

    const beforeMetrics = await optimizationCoordinator!.getStatus();
    const results: any[] = [];

    // 连接池优化
    if (options.connectionPool !== false) {
      const poolResult = await optimizationCoordinator!.optimizeConnectionPool();
      results.push({ type: 'connectionPool', result: poolResult });
    }

    // 查询性能优化
    if (options.queryPerformance !== false) {
      const queryResult = await optimizationCoordinator!.optimizeQueries();
      results.push({ type: 'queryPerformance', result: queryResult });
    }

    // 内存使用优化
    if (options.memoryUsage !== false) {
      const memoryResult = await optimizationCoordinator!.optimizeMemoryUsage();
      results.push({ type: 'memoryUsage', result: memoryResult });
    }

    const afterMetrics = await optimizationCoordinator!.getStatus();

    // 计算改进指标
    const improvement = {
      scoreImprovement: afterMetrics.score - beforeMetrics.score,
      optimizationsApplied: results.length,
      successfulOptimizations: results.filter(r => r.result.success).length
    };

    logger.info('数据库优化完成', { improvement, results });

    return {
      success: true,
      message: `数据库优化完成，应用了 ${improvement.optimizationsApplied} 项优化`,
      metrics: {
        before: beforeMetrics,
        after: afterMetrics,
        improvement
      },
      timestamp: new Date()
    };
  } catch (error) {
    logger.error('数据库优化失败:', error);
    return {
      success: false,
      message: `数据库优化失败: ${error instanceof Error ? error.message : '未知错误'}`,
      timestamp: new Date()
    };
  }
}

/**
 * 获取优化状态
 * @returns Promise<any> 当前优化状态
 */
export async function getOptimizationStatus(): Promise<any> {
  try {
    if (!optimizationCoordinator) {
      return {
        initialized: false,
        message: '优化系统未初始化'
      };
    }

    const status = await optimizationCoordinator.getStatus();
    return {
      initialized: true,
      ...status
    };
  } catch (error) {
    logger.error('获取优化状态失败:', error);
    return {
      initialized: false,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

/**
 * 停止优化系统
 * @returns Promise<boolean> 停止是否成功
 */
export async function stopOptimization(): Promise<boolean> {
  try {
    if (!optimizationCoordinator) {
      logger.warn('优化系统未初始化，无需停止');
      return true;
    }

    await optimizationCoordinator.stop();
    optimizationCoordinator = null;

    logger.info('数据库优化系统已停止');
    return true;
  } catch (error) {
    logger.error('停止优化系统失败:', error);
    return false;
  }
}

/**
 * 重启优化系统
 * @param options 优化选项
 * @returns Promise<boolean> 重启是否成功
 */
export async function restartOptimization(options: OptimizationOptions = {}): Promise<boolean> {
  try {
    await stopOptimization();
    return await initializeOptimization(options);
  } catch (error) {
    logger.error('重启优化系统失败:', error);
    return false;
  }
}

// 导出主要功能
export {
  PerformanceOptimizationCoordinator,
  DatabasePoolOptimizer,
  QueryPerformanceOptimizer,
  MemoryUsageOptimizer
};

// 默认导出
export default {
  initializeOptimization,
  triggerDatabaseOptimization,
  getOptimizationStatus,
  stopOptimization,
  restartOptimization
};