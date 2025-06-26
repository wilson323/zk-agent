/**
 * @file db\health\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs, CommonValidations } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { checkDatabaseConnection } from "@/lib/database/connection"

export const GET = createApiRoute(
  RouteConfigs.publicGet(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const healthCheck = await checkDatabaseConnection()
      
      if (healthCheck.success) {
        return ApiResponseWrapper.success({
          success: true,
          message: healthCheck.message,
          latency: healthCheck.latency,
          timestamp: new Date().toISOString(),
        })
      } else {
        return ApiResponseWrapper.error(
          {
            success: false,
            message: healthCheck.message,
            timestamp: new Date().toISOString(),
          },
          { status: 503 }
        )
      }
    } catch (error) {
      return ApiResponseWrapper.error(
        {
          success: false,
          message: 'Database health check failed',
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      )
    }
  }
);

