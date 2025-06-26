/**
 * @file admin\error-logs\[id]\resolve\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs, CommonValidations } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { verifyAdminAuth } from "@/lib/auth/middleware"

export const PATCH = createApiRoute(
  RouteConfigs.protectedPatch(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    // 验证管理员权限
    const authResult = await verifyAdminAuth(req);
    if (!authResult.success) {
      return ApiResponseWrapper.error('权限不足', { status: 403 });
    }

    const { id: logId } = await params;

    // 在实际应用中，这里应该更新数据库中的错误日志状态
    // 这里只是模拟成功响应
    console.log(`标记错误日志 ${logId} 为已解决`);

    return ApiResponseWrapper.success({
      success: true,
      message: "错误日志已标记为已解决",
    });
  }
);

