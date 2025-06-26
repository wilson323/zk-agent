/**
 * @file fastgpt\health\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs, CommonValidations } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';

export const GET = createApiRoute(
  RouteConfigs.publicGet(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const startTime = Date.now();
      
      // 检查FastGPT API连接
      const apiUrl = process.env.FASTGPT_API_URL || 'https://zktecoaihub.com';
      const apiKey = process.env.FASTGPT_API_KEY;
  
      if (!apiKey) {
        return ApiResponseWrapper.error(
          'API key not configured',
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
          `API returned ${response.status}: ${response.statusText}`,
          503,
          {
            status: 'unhealthy',
            latency,
            timestamp: new Date().toISOString(),
          }
        );
      }
    } catch (error) {
      console.error('FastGPT health check error:', error);
      return ApiResponseWrapper.error(
        'Health check failed',
        500,
        {
          status: 'error',
          timestamp: new Date().toISOString(),
        }
      );
    }
  }
);

