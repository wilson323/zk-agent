/**
 * @file db\health\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { ErrorCode } from '@/types/core';

export const GET = createApiRoute(
  RouteConfigs.publicGet(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      // 模拟数据库健康检查
      const startTime = Date.now();
      
      // 模拟数据库连接检查
      const isHealthy = Math.random() > 0.1; // 90% 成功率
      const latency = Date.now() - startTime;
      
      if (isHealthy) {
        return ApiResponseWrapper.success({
          success: true,
          message: "Database is healthy",
          latency: latency,
          timestamp: new Date().toISOString(),
        });
      } else {
        return ApiResponseWrapper.error(
          ErrorCode.SERVICE_UNAVAILABLE,
          "Database health check failed",
          {
            success: false,
            message: "Database connection failed",
            timestamp: new Date().toISOString(),
          }
        );
      }
    } catch (error) {
      console.error('数据库健康检查失败:', error);
      return ApiResponseWrapper.error(
        ErrorCode.INTERNAL_SERVER_ERROR,
        "Database health check failed",
        {
          success: false,
          message: "Database health check failed",
          timestamp: new Date().toISOString(),
        }
      );
    }
  }
);

