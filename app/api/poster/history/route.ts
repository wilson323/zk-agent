/**
 * @file poster\history\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { ErrorCode } from '@/types/core';
import { PosterDatabase } from "@/lib/database/poster-db"

export const GET = createApiRoute(
  RouteConfigs.publicGet(),
  async (_req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const userId = validatedQuery?.userId;
      const limit = Number.parseInt(validatedQuery?.limit || "20");
  
      if (!userId) {
        return ApiResponseWrapper.error(
          ErrorCode.VALIDATION_ERROR,
          "用户ID不能为空",
          null,
          400
        );
      }
  
      const history = await PosterDatabase.getUserGenerationHistory(userId, limit);
  
      return ApiResponseWrapper.success({
        success: true,
        data: history,
      });
    } catch (error) {
      return ApiResponseWrapper.error(
        ErrorCode.INTERNAL_SERVER_ERROR,
        "Internal server error",
        null,
        500
      );
    }
  }
);