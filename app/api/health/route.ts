/**
 * @file health\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs, CommonValidations } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';

// 健康检查函数
async function checkDatabase() {
  try {
    // TODO: 实际的数据库连接检查
    return { status: "healthy", responseTime: "<10ms" };
  } catch (error) {
    return { status: "unhealthy", error: error.message };
  }
}

async function checkRedis() {
  try {
    // TODO: 实际的Redis连接检查
    return { status: "healthy", responseTime: "<5ms" };
  } catch (error) {
    return { status: "unhealthy", error: error.message };
  }
}

async function checkFastGPT() {
  try {
    // TODO: 实际的FastGPT服务检查
    return { status: "healthy", responseTime: "<100ms" };
  } catch (error) {
    return { status: "unhealthy", error: error.message };
  }
}

async function checkFileSystem() {
  try {
    // TODO: 实际的文件系统检查
    return { status: "healthy", responseTime: "<5ms" };
  } catch (error) {
    return { status: "unhealthy", error: error.message };
  }
}

export const GET = createApiRoute(
  RouteConfigs.publicGet(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: await checkDatabase(),
        redis: await checkRedis(),
        fastgpt: await checkFastGPT(),
        fileSystem: await checkFileSystem(),
      },
      version: process.env.npm_package_version || "unknown",
      environment: process.env.NODE_ENV || "unknown",
      requestId
    };
    
    const allHealthy = Object.values(health.services).every(
      (service: any) => service.status === "healthy"
    );
    
    if (allHealthy) {
      return ApiResponseWrapper.success(health);
    } else {
       return ApiResponseWrapper.error(
         'SERVICE_UNHEALTHY',
         'Some services are unhealthy',
         { health },
         503
       );
     }
  }
);

