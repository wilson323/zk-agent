/**
 * @file metrics\record\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs, CommonValidations } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';

export const POST = createApiRoute(
  RouteConfigs.protectedPost(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    const metrics = await req.json();
    
    // 记录到数据库
    await recordMetrics(metrics);
    
    // 如果有Redis，也记录到Redis用于实时监控
    if (process.env.REDIS_HOST) {
      await recordToRedis(metrics);
    }
    
    return ApiResponseWrapper.success({ success: true });
  }
);

