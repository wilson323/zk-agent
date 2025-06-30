/**
 * @file fastgpt\feedback\route.ts
 * @description FastGPT feedback API route
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
      const { messageId, rating, comment } = await req.json();
      
      if (!messageId || !rating) {
        return ApiResponseWrapper.error(
          ErrorCode.VALIDATION_ERROR,
          'Missing required fields: messageId and rating',
          null,
          400
        );
      }
  
      // 检查环境变量
      if (!process.env.FASTGPT_API_URL || !process.env.FASTGPT_API_KEY) {
        return ApiResponseWrapper.error(
          ErrorCode.EXTERNAL_SERVICE_ERROR,
          'FastGPT API configuration missing',
          null,
          500
        );
      }
  
      // 调用FastGPT API提交反馈
      const response = await fetch(`${process.env.FASTGPT_API_URL}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.FASTGPT_API_KEY}`,
        },
        body: JSON.stringify({
          messageId,
          rating,
          comment: comment || '',
        }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        return ApiResponseWrapper.error(
          ErrorCode.EXTERNAL_SERVICE_ERROR,
          errorData.message || 'Submit feedback failed',
          null,
          response.status
        );
      }
  
      const result = await response.json();
      return ApiResponseWrapper.success(result);
    } catch (error) {
      console.error('FastGPT feedback error:', error);
      return ApiResponseWrapper.error(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Internal server error',
        null,
        500
      );
    }
  }
);