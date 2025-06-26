/**
 * @file fastgpt\batch-forward\route.ts
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
    const body = await req.json();
    
    // 检查环境变量
    if (!process.env.FASTGPT_API_URL || !process.env.FASTGPT_API_KEY) {
      return ApiResponseWrapper.error(
        'FastGPT API configuration missing',
        500
      );
    }

    // 转发请求到 FastGPT
    const response = await fetch(`${process.env.FASTGPT_API_URL}/api/v1/batch-forward`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.FASTGPT_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return ApiResponseWrapper.error(
        data.message || 'FastGPT batch forward failed',
        response.status
      );
    }

    return ApiResponseWrapper.success(data);
  }
);

