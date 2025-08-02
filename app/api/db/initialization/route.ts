/**
 * @file db/initialization/route.ts
 * @description 数据库初始化状态 API 端点
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

import { createApiRoute } from '@/lib/middleware/api-route';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ErrorCode } from '@/types/core';
import { databaseInitializer, InitializationStatus } from '@/lib/database/initialization';
import { performDatabaseHealthCheck } from '@/lib/database/connection';

/**
 * 获取数据库初始化状态
 */
export const GET = createApiRoute(RouteConfigs.publicGet(), async (req, { requestId }) => {
  try {
    const status = databaseInitializer.getStatus();
    const isInitialized = databaseInitializer.isInitialized();
    
    // 如果已初始化，获取详细的健康状态
    let healthDetails = null;
    if (isInitialized) {
      try {
        const healthCheck = await performDatabaseHealthCheck();
        healthDetails = {
          status: healthCheck.status,
          connection: healthCheck.checks.connection,
          queries: healthCheck.checks.queries,
          optimization: healthCheck.checks.optimization
        };
      } catch (error) {
        healthDetails = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    return ApiResponseWrapper.success({
      status,
      isInitialized,
      healthDetails,
      timestamp: new Date().toISOString(),
      requestId
    });
  } catch (error) {
    return ApiResponseWrapper.error(
      ErrorCode.INTERNAL_SERVER_ERROR,
      `Database initialization status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      null,
      500
    );
  }
});

/**
 * 触发数据库初始化
 */
export const POST = createApiRoute(RouteConfigs.publicPost(), async (req, { requestId, validatedBody }) => {
  try {
    const { force = false } = validatedBody || {};
    
    // 检查是否已经在初始化中
    const currentStatus = databaseInitializer.getStatus();
    if (currentStatus === InitializationStatus.INITIALIZING && !force) {
      return ApiResponseWrapper.success({
        message: 'Database initialization already in progress',
        status: currentStatus,
        requestId
      });
    }

    // 启动初始化
    await databaseInitializer.initialize(force);
    
    return ApiResponseWrapper.success({
      message: 'Database initialization started successfully',
      status: databaseInitializer.getStatus(),
      requestId
    });
  } catch (error) {
    return ApiResponseWrapper.error(
      ErrorCode.INTERNAL_SERVER_ERROR,
      `Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      null,
      500
    );
  }
});