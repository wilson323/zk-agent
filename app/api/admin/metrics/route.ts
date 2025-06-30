/**
 * @file admin\metrics\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { ErrorCode } from '@/types/core';
import { ErrorCode } from '@/types/core';
import { ErrorCode } from '@/types/core';
import { verifyAdminAuth } from "@/lib/auth/middleware"
import os from "os"

// 辅助函数
async function getCPUUsage() {
  return Math.random() * 100;
}

function getMemoryInfo() {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  return {
    used,
    total,
    percentage: (used / total) * 100
  };
}

async function getDiskInfo() {
  return {
    used: 50 * 1024 * 1024 * 1024,
    total: 100 * 1024 * 1024 * 1024,
    percentage: 50
  };
}

function getNetworkInfo() {
  return {
    inbound: Math.random() * 1000,
    outbound: Math.random() * 1000
  };
}

async function getDatabaseInfo() {
  return {
    connections: 10,
    maxConnections: 100,
    queryTime: Math.random() * 100
  };
}

async function getAgentInfo() {
  return {
    active: 5,
    total: 10
  };
}

async function getUserInfo() {
  return {
    online: 25,
    total: 100
  };
}

export const GET = createApiRoute(
  RouteConfigs.protectedGet(),
  async (req: NextRequest, { params: params, validatedBody: validatedBody, validatedQuery: validatedQuery, user: user, requestId: requestId }) => {
    try {
      // 验证管理员权限
      const authResult = await verifyAdminAuth(req);
      if (!authResult.success) {
        return ApiResponseWrapper.error(ErrorCode.AUTHORIZATION_ERROR, '权限不足', null, 403);
      }
    
      // 获取系统指标
      const cpuUsage = await getCPUUsage();
      const memoryInfo = getMemoryInfo();
      const diskInfo = await getDiskInfo();
      const networkInfo = getNetworkInfo();
      const databaseInfo = await getDatabaseInfo();
      const agentInfo = await getAgentInfo();
      const userInfo = await getUserInfo();
    
        const metrics = {
          cpu: {
            usage: cpuUsage,
            cores: os.cpus().length,
            temperature: null, // 需要额外的系统调用获取
          },
          memory: {
            used: memoryInfo.used,
            total: memoryInfo.total,
            percentage: memoryInfo.percentage,
          },
          disk: {
            used: diskInfo.used,
            total: diskInfo.total,
            percentage: diskInfo.percentage,
          },
          network: {
            inbound: networkInfo.inbound,
            outbound: networkInfo.outbound,
          },
          database: {
            connections: databaseInfo.connections,
            maxConnections: databaseInfo.maxConnections,
            queryTime: databaseInfo.queryTime,
          },
          agents: agentInfo,
          users: userInfo,
        }
    
      return ApiResponseWrapper.success(metrics);
    } catch (error) {
      return ApiResponseWrapper.error(ErrorCode.INTERNAL_SERVER_ERROR, '获取系统指标失败', null, 500);
    }
  }
);

