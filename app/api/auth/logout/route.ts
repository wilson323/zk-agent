/**
 * @file auth\logout\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import prisma from "@/lib/database/connection"
import { ErrorCode } from '@/types/core';

export const POST = createApiRoute(
  RouteConfigs.protectedPost(),
  async (req: NextRequest, { user }) => {
    if (user && prisma) {
      // 记录登出日志
      await prisma.usageStats
        .create({
          data: {
            userId: user.userId,
            agentType: "auth",
            action: "logout",
            metadata: {
              userAgent: req.headers.get("user-agent"),
              ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
            },
          },
        })
        .catch((error) => {
          console.error("Failed to log logout:", error);
        });
    } else if (!prisma) {
      console.warn("Database connection not available for logout logging");
    }

    return ApiResponseWrapper.success({
      success: true,
      message: "登出成功",
    });
  }
);

