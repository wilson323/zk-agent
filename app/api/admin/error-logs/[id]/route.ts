/**
 * @file admin\error-logs\[id]\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';

import { verifyAdminAuth } from "@/lib/auth/middleware";
import { ERROR_CODES } from '@/config/constants';

export const DELETE = createApiRoute(
  RouteConfigs.protectedDelete(),
  async (req: NextRequest, { params }) => {
    // 验证管理员权限
    const authResult = await verifyAdminAuth(req);
    if (!authResult.success) {
      return ApiResponseWrapper.error(ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS, '权限不足', { status: 403 });
    }

    const { id: logId } = await params;

    // 在实际应用中，这里应该从数据库中删除错误日志
    // 这里只是模拟成功响应
    console.log(`删除错误日志 ${logId}`);

    return ApiResponseWrapper.success({
      success: true,
      message: "错误日志已删除",
    });
  }
);

