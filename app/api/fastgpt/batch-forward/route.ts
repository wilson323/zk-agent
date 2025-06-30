/**
 * @file fastgpt\batch-forward\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { ErrorCode } from '@/types/core';

export const POST = createApiRoute(
  RouteConfigs.protectedPost(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      // 检查环境变量
      if (!process.env.FASTGPT_API_URL || !process.env.FASTGPT_API_KEY) {
        return ApiResponseWrapper.error(
          ErrorCode.EXTERNAL_SERVICE_ERROR,
          'FastGPT API configuration missing',
          null
        );
      }

      // 转发请求到 FastGPT
      const response = await fetch(`${process.env.FASTGPT_API_URL}/api/v1/batch-forward`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.FASTGPT_API_KEY}`,
        },
        body: JSON.stringify(validatedBody),
      });

      const data = await response.json();

      if (!response.ok) {
        return ApiResponseWrapper.error(
          ErrorCode.EXTERNAL_SERVICE_ERROR,
          data.message || 'FastGPT batch forward failed',
          null
        );
      }

      return ApiResponseWrapper.success(data);
    } catch (error) {
      console.error('FastGPT batch forward error:', error);
      return ApiResponseWrapper.error(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Internal server error',
        null
      );
    }
  }
);

