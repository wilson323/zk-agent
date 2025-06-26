/**
 * @file fastgpt\feedback\route.ts
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
    try {
      const { messageId, rating, comment } = await req.json();
      
      if (!messageId || !rating) {
        return ApiResponseWrapper.error(
          'Missing required fields: messageId and rating',
          400
        );
      }
  
      // 检查环境变量
      if (!process.env.FASTGPT_API_URL || !process.env.FASTGPT_API_KEY) {
        return ApiResponseWrapper.error(
          'FastGPT API configuration missing',
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
          errorData.message || 'Submit feedback failed',
          response.status
        );
      }
  
      const result = await response.json();
      return ApiResponseWrapper.success(result);
    } catch (error) {
      console.error('FastGPT feedback error:', error);
      return ApiResponseWrapper.error(
        'Internal server error',
        500
      );
    }
  }
);

