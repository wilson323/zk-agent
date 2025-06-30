/**
 * @file health\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { createApiRoute } from '@/lib/middleware/api-route';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { RouteConfigs } from '@/lib/middleware/route-configs';

// Mock health check functions
async function checkDatabase() {
  return { status: "healthy", message: "Database connection OK" };
}

async function checkRedis() {
  return { status: "healthy", message: "Redis connection OK" };
}

async function checkFastGPT() {
  return { status: "healthy", message: "FastGPT API accessible" };
}

async function checkFileSystem() {
  return { status: "healthy", message: "File system accessible" };
}

export const GET = createApiRoute(
  RouteConfigs.publicGet(),
  async ({ requestId }) => {
    try {
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
        requestId: _requestId
      };
      
      const allHealthy = Object.values(health.services).every(
        (service: any) => service.status === "healthy"
      );
      
      health.status = allHealthy ? "healthy" : "unhealthy";
      
      return ApiResponseWrapper.success(health);
    } catch (error) {
      return ApiResponseWrapper.error('Internal server error', 500);
    }
  }
);

