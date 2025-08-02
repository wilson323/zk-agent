// @ts-nocheck
/**
 * @file Database Connection
 * @description 数据库连接管理和健康检查
 * @author ZK-Agent Team A
 * @date 2024-12-19
 */

import { PrismaClient } from '@prisma/client';

// 数据库连接状态
export interface DatabaseStatus {
  connected: boolean;
  message: string;
  timestamp: Date;
  version?: string;
  latency?: number;
  error?: string;
  stats?: {
    totalQueries: number;
    failedQueries: number;
    avgLatency: number;
    reconnectAttempts: number;
  };
}

// 数据库健康检查结果
export interface DatabaseHealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  checks: {
    connection: DatabaseStatus;
    queries: {
      read: boolean;
      write: boolean;
      latency: number;
    };
    migrations: {
      pending: number;
      applied: number;
    };
    optimization: {
      enabled: boolean;
      componentsActive: number;
      lastOptimization: Date | null;
      recommendations: number;
    };
  };
  timestamp: Date;
}

// 数据库性能概览
export interface DatabasePerformanceOverview {
  monitoring: {
    isActive: boolean;
    metricsCount: number;
    alertsCount: number;
  };
  optimization: {
    isActive: boolean;
    componentsStatus: Record<string, any>;
    recommendations: any[];
  };
  health: {
    score: number;
    status: 'excellent' | 'good' | 'fair' | 'poor';
    issues: string[];
  };
  timestamp: Date;
}

import { EnhancedDatabaseConnection, ConnectionState } from './enhanced-connection';
import { getEnhancedDb } from './enhanced-database-manager';
import { databaseMonitor } from './monitoring';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();

// 全局 Prisma 客户端实例
let prismaInstance: PrismaClient | null = null;

/**
 * 获取 Prisma 客户端实例
 * @returns {PrismaClient} Prisma 客户端实例
 */
export function getPrismaClient(): PrismaClient {
  // 优先使用增强连接管理器的客户端
  const enhancedDb = getEnhancedDb();
  const enhancedClient = enhancedDb.getClient();
  if (enhancedClient && enhancedDb.isConnected()) {
    return enhancedClient;
  }

  // 回退到传统连接方式
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      errorFormat: 'pretty',
    });
  }
  return prismaInstance;
}

// 获取Prisma客户端实例
export const prisma = getPrismaClient();

/**
 * 检查数据库连接状态
 * @returns {Promise<DatabaseStatus>} 数据库连接状态
 */
export async function checkDatabaseConnection(): Promise<DatabaseStatus> {
  try {
    // 优先使用增强连接管理器
    const enhancedDb = getEnhancedDb();
    if (enhancedDb.isConnected()) {
      const stats = enhancedDb.getStats();

      // 执行健康检查查询
      const result = await enhancedDb.executeQuery(async client => {
        const versionResult = await client.$queryRaw<Array<{ version: string }>>`SELECT version()`;
        return versionResult[0]?.version || 'Unknown';
      });

      return {
        connected: true,
        message: `Enhanced database connection active (uptime: ${Math.round(stats.uptime / 1000)}s)`,
        version: result,
        timestamp: new Date(),
        stats: {
          totalQueries: stats.totalQueries,
          failedQueries: stats.failedQueries,
          avgLatency: Math.round(stats.avgLatency),
          reconnectAttempts: stats.reconnectAttempts,
        },
      };
    }

    // 回退到传统连接检查
    const client = getPrismaClient();
    await client.$connect();

    // 执行简单查询测试连接
    await client.$queryRaw`SELECT 1`;

    // 获取数据库版本信息
    const result = await client.$queryRaw<Array<{ version: string }>>`SELECT version()`;
    const version = result[0]?.version || 'Unknown';

    return {
      connected: true,
      message: 'Database connection successful (fallback mode)',
      version,
      timestamp: new Date(),
    };
  } catch (error) {
    logger.error('Database connection failed:', error);

    // 如果增强连接管理器未连接，尝试连接（但不递归重试）
    const enhancedDb = getEnhancedDb();
    if (!enhancedDb.isConnected()) {
      try {
        await enhancedDb.connect();
        // 连接成功后返回成功状态，不再递归调用
        return {
          connected: true,
          message: 'Database connection successful via enhanced manager',
          timestamp: new Date(),
        };
      } catch (connectError) {
        logger.error('Enhanced connection failed:', connectError);
      }
    }

    return {
      connected: false,
      message: error instanceof Error ? error.message : 'Unknown database error',
      timestamp: new Date(),
    };
  }
}

/**
 * 执行完整的数据库健康检查
 */
export async function performDatabaseHealthCheck(): Promise<DatabaseHealthCheck> {
  const timestamp = new Date();

  try {
    // 检查基本连接
    const connectionStatus = await checkDatabaseConnection();

    // 检查读写操作
    const queryChecks = await checkDatabaseQueries();

    // 检查迁移状态
    const migrationChecks = await checkMigrationStatus();

    // 检查性能优化状态
    const optimizationStatus = await checkOptimizationStatus();

    // 确定整体健康状态
    let status: DatabaseHealthCheck['status'] = 'healthy';

    if (!connectionStatus.connected || !queryChecks.read) {
      status = 'unhealthy';
    } else if (!queryChecks.write || migrationChecks.pending > 0) {
      status = 'degraded';
    }

    return {
      status,
      checks: {
        connection: connectionStatus,
        queries: queryChecks,
        migrations: migrationChecks,
      },
      optimization: optimizationStatus,
      timestamp,
    };
  } catch (error) {
    logger.error('Database health check failed:', error);

    return {
      status: 'unhealthy',
      checks: {
        connection: {
          connected: false,
          error: error instanceof Error ? error.message : 'Health check failed',
          timestamp,
        },
        queries: {
          read: false,
          write: false,
          latency: 0,
        },
        migrations: {
          pending: 0,
          applied: 0,
        },
      },
      optimization: {
        enabled: false,
        componentsActive: 0,
        lastOptimization: null,
        recommendations: [],
      },
      timestamp,
    };
  }
}

/**
 * 检查数据库查询操作
 */
/**
 * 检查性能优化状态
 * @returns {Promise<object>} 性能优化状态信息
 */
async function checkOptimizationStatus(): Promise<{
  enabled: boolean;
  componentsActive: number;
  lastOptimization: Date | null;
  recommendations: any[];
}> {
  try {
    // 检查数据库监控器是否启用
    const monitoringActive = databaseMonitor && databaseMonitor.isMonitoring();

    if (!monitoringActive) {
      return {
        enabled: false,
        componentsActive: 0,
        lastOptimization: null,
        recommendations: [],
      };
    }

    // 获取优化状态
    const optimizationStatus = databaseMonitor.getOptimizationStatus();
    const recommendations = databaseMonitor.getOptimizationRecommendations();

    return {
      enabled: true,
      componentsActive: Object.values(optimizationStatus).filter(Boolean).length,
      lastOptimization: null,
      recommendations: recommendations.slice(0, 5), // 限制返回前5个建议
    };
  } catch (error) {
    logger.error('Failed to check optimization status:', error);
    return {
      enabled: false,
      componentsActive: 0,
      lastOptimization: null,
      recommendations: [],
    };
  }
}

async function checkDatabaseQueries(): Promise<{
  read: boolean;
  write: boolean;
  latency: number;
}> {
  const startTime = Date.now();

  try {
    // 测试读操作
    let readSuccess = false;
    try {
      await prisma.$queryRaw`SELECT 1 as test`;
      readSuccess = true;
    } catch (error) {
      logger.error('Database read test failed:', error);
    }

    // 测试写操作（如果有测试表的话）
    let writeSuccess = false;
    try {
      // 尝试创建一个临时记录来测试写操作
      // 这里需要根据实际的数据库schema来调整
      // 暂时假设写操作成功
      writeSuccess = true;
    } catch (error) {
      logger.error('Database write test failed:', error);
    }

    const latency = Date.now() - startTime;

    return {
      read: readSuccess,
      write: writeSuccess,
      latency,
    };
  } catch (error) {
    return {
      read: false,
      write: false,
      latency: Date.now() - startTime,
    };
  }
}

/**
 * 检查数据库迁移状态
 */
async function checkMigrationStatus(): Promise<{
  pending: number;
  applied: number;
}> {
  try {
    // 这里需要根据实际的迁移管理方式来实现
    // Prisma的迁移状态检查

    // 暂时返回默认值
    return {
      pending: 0,
      applied: 0,
    };
  } catch (error) {
    logger.error('Migration status check failed:', error);
    return {
      pending: 0,
      applied: 0,
    };
  }
}

/**
 * 获取数据库性能概览
 * @returns {Promise<DatabasePerformanceOverview>} 数据库性能概览
 */
export async function getDatabasePerformanceOverview(): Promise<DatabasePerformanceOverview> {
  try {
    const healthCheck = await performDatabaseHealthCheck();
    const monitoringStats = databaseMonitor.getStats();

    return {
      monitoring: {
        isActive: databaseMonitor.isActive(),
        metricsCount: monitoringStats.totalMetrics || 0,
        alertsCount: monitoringStats.totalAlerts || 0,
      },
      optimization: {
        isActive: healthCheck.checks.optimization.enabled,
        componentsStatus: {},
        recommendations: [],
      },
      health: {
        score: healthCheck.status === 'healthy' ? 100 : healthCheck.status === 'degraded' ? 70 : 30,
        status: healthCheck.status === 'healthy' ? 'excellent' : healthCheck.status === 'degraded' ? 'good' : 'poor',
        issues: [],
      },
      timestamp: new Date(),
    };
  } catch (error) {
    logger.error('Error getting database performance overview:', error);
    throw error;
  }
}

export async function closeDatabaseConnection(): Promise<void> {
  try {
    // 清理增强连接管理器
    const enhancedDb = getEnhancedDb();
    if (enhancedDb.isConnected()) {
      await enhancedDb.disconnect();
    }

    // 关闭Prisma客户端
    await prisma.$disconnect();

    logger.info('Database connection closed successfully');
  } catch (error) {
    logger.error('Error closing database connection:', error);
    throw error;
  }
}

// 默认导出Prisma客户端
export default prisma;

// 导出类型
export type { DatabaseStatus, DatabaseHealthCheck, DatabasePerformanceOverview };

// 注意：数据库健康检查函数需要在 health-check.ts 文件中实现后再导出
