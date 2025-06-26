/**
 * @file health\local\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs, CommonValidations } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { checkDatabaseConnection } from "@/lib/database/connection"
import { redisCacheManager } from "@/lib/cache/redis-cache-manager"

export const GET = createApiRoute(
  RouteConfigs.publicGet(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const checks = {
        database: { status: "unknown", message: "", latency: 0 },
        redis: { status: "unknown", message: "", latency: 0 },
        filesystem: { status: "unknown", message: "" },
        environment: { status: "unknown", message: "" },
      }
    
      // 检查数据库连接
      try {
        const dbStart = Date.now()
        const dbResult = await checkDatabaseConnection()
        checks.database = {
          status: dbResult.success ? "healthy" : "unhealthy",
          message: dbResult.message,
          latency: Date.now() - dbStart,
        }
      } catch (error) {
        checks.database = {
          status: "unhealthy",
          message: "数据库连接检查失败",
          latency: 0,
        }
      }
    
      // 检查Redis连接
      try {
        const redisStart = Date.now()
        const redisConnected = await redisCacheManager.checkConnection()
        checks.redis = {
          status: redisConnected ? "healthy" : "unhealthy",
          message: redisConnected ? "Redis连接正常" : "Redis连接失败",
          latency: Date.now() - redisStart,
        }
      } catch (error) {
        checks.redis = {
          status: "unhealthy",
          message: "Redis连接检查失败",
          latency: 0,
        }
      }
    
      // 检查文件系统
      try {
        const fs = require("fs")
        const path = require("path")
    
        const uploadDir = path.join(process.cwd(), "uploads")
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true })
        }
    
        // 测试写入权限
        const testFile = path.join(uploadDir, "health-check.txt")
        fs.writeFileSync(testFile, "health check")
        fs.unlinkSync(testFile)
    
        checks.filesystem = {
          status: "healthy",
          message: "文件系统访问正常",
        }
      } catch (error) {
        checks.filesystem = {
          status: "unhealthy",
          message: "文件系统访问失败",
        }
      }
    
      // 检查环境变量
      try {
        const requiredEnvVars = [
          "DATABASE_URL",
          "JWT_ACCESS_SECRET",
          "JWT_REFRESH_SECRET",
          "FASTGPT_API_URL",
          "FASTGPT_API_KEY",
        ]
    
        const missingVars = requiredEnvVars.filter((varName) => !process.env[varName])
    
        if (missingVars.length === 0) {
          checks.environment = {
            status: "healthy",
            message: "环境变量配置完整",
          }
        } else {
          checks.environment = {
            status: "warning",
            message: `缺少环境变量: ${missingVars.join(", ")}`,
          }
        }
      } catch (error) {
        checks.environment = {
          status: "unhealthy",
          message: "环境变量检查失败",
        }
      }
    
      // 计算总体健康状态
      const allHealthy = Object.values(checks).every((check) => check.status === "healthy")
      const hasWarnings = Object.values(checks).some((check) => check.status === "warning")
    
      const overallStatus = allHealthy ? "healthy" : hasWarnings ? "warning" : "unhealthy"
    
      return ApiResponseWrapper.success({
        status: overallStatus,
        timestamp: new Date().toISOString(),
        environment: "local",
        checks,
        summary: {
          healthy: Object.values(checks).filter((check) => check.status === "healthy").length,
          warning: Object.values(checks).filter((check) => check.status === "warning").length,
          unhealthy: Object.values(checks).filter((check) => check.status === "unhealthy").length,
          total: Object.keys(checks).length,
        },
      })
    } catch (error) {
      return ApiResponseWrapper.error('Internal server error', 500)
    }
  }
);

