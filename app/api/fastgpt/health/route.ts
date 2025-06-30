/**
 * @file fastgpt\health\route.ts
 * @description FastGPT health check API route
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { ErrorCode } from '@/types/core';

export const GET = createApiRoute(
  RouteConfigs.publicGet(),
  async (_req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const startTime = Date.now();
      
      // 检查FastGPT API连接
      const apiUrl = process.env.FASTGPT_API_URL || 'https://zktecoaihub.com';
      const apiKey = process.env.FASTGPT_API_KEY;
  
      if (!apiKey) {
        return ApiResponseWrapper.error(
          ErrorCode.EXTERNAL_SERVICE_ERROR,
          'API key not configured',
          null,
          500
        );
      }
  
      // 简单的健康检查请求
      const response = await fetch(`${apiUrl}/api/v1/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000), // 5秒超时
      });
  
      const latency = Date.now() - startTime;
  
      if (response.ok) {
        return ApiResponseWrapper.success({
          status: 'healthy',
          latency,
          timestamp: new Date().toISOString(),
          apiUrl,
          version: '1.0.0',
        });
      } else {
        return ApiResponseWrapper.error(
          ErrorCode.EXTERNAL_SERVICE_ERROR,
          `API returned ${response.status}: ${response.statusText}`,
          {
            status: 'unhealthy',
            latency,
            timestamp: new Date().toISOString(),
          },
          503
        );
      }
    } catch (error) {
      console.error('FastGPT health check error:', error);
      return ApiResponseWrapper.error(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Health check failed',
        {
          status: 'error',
          timestamp: new Date().toISOString(),
        },
        500
      );
    }
  }
);