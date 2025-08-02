/**
 * @file health\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { createApiRoute } from '@/lib/middleware/api-route';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ErrorCode } from '@/types/core';
import { performDatabaseHealthCheck } from '@/lib/database/connection';
import { unifiedAIAdapter } from '@/lib/ai/unified-ai-adapter';
import { highAvailabilityManager } from '@/lib/system/high-availability-manager';

/**
 * 检查数据库健康状态
 * @returns {Promise<object>} 数据库健康状态
 */
async function checkDatabase() {
  try {
    const healthCheck = await performDatabaseHealthCheck();
    return {
      status: healthCheck.status === 'healthy' ? 'healthy' : 'unhealthy',
      message: healthCheck.status === 'healthy' ? 'Database connection OK' : 'Database connection failed',
      details: {
        connection: healthCheck.checks.connection,
        queries: healthCheck.checks.queries,
        migrations: healthCheck.checks.migrations
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Database check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 检查 AI 服务健康状态
 * @returns {Promise<object>} AI 服务健康状态
 */
async function checkAIServices() {
  try {
    const aiHealth = await unifiedAIAdapter.getHealthStatus();
    const healthyServices = Object.values(aiHealth).filter((service: any) => service.healthy).length;
    const totalServices = Object.keys(aiHealth).length;
    
    return {
      status: healthyServices > 0 ? 'healthy' : 'unhealthy',
      message: `${healthyServices}/${totalServices} AI services healthy`,
      details: aiHealth
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `AI services check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 检查系统整体健康状态
 * @returns {Promise<object>} 系统健康状态
 */
async function checkSystemHealth() {
  try {
    const systemStatus = await highAvailabilityManager.getSystemStatus();
    const allServicesHealthy = Object.values(systemStatus.services).every(
      (service: any) => service.status === 'healthy'
    );
    
    return {
      status: allServicesHealthy ? 'healthy' : 'degraded',
      message: `System status: ${allServicesHealthy ? 'healthy' : 'degraded'}`,
      details: {
        services: systemStatus.services,
        uptime: systemStatus.uptime,
        resources: systemStatus.resources,
        performance: systemStatus.performance
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `System check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export const GET = createApiRoute(RouteConfigs.publicGet(), async (req, { requestId }) => {
  try {
    const dbHealth = await checkDatabase();
    const aiHealth = await checkAIServices();
    const systemHealth = await checkSystemHealth();

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth,
        aiServices: aiHealth,
        system: systemHealth,
      },
      version: process.env.npm_package_version || 'unknown',
      environment: process.env.NODE_ENV || 'unknown',
      requestId,
    };

    const allHealthy = Object.values(health.services).every(
      (service: any) => service.status === 'healthy'
    );

    health.status = allHealthy ? 'healthy' : 'unhealthy';

    return ApiResponseWrapper.success(health);
  } catch (error) {
    return ApiResponseWrapper.error(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Internal server error',
      null,
      500
    );
  }
});
