/**
 * @file poster\history\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs, CommonValidations } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { PosterDatabase } from "@/lib/database/poster-db"

export const GET = createApiRoute(
  RouteConfigs.publicGet(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const { searchParams } = new URL(req.url);
      const userId = validatedQuery?.userId;
      const limit = Number.parseInt(validatedQuery?.limit || "20");
  
      if (!userId) {
        return ApiResponseWrapper.error(
          "用户ID不能为空",
          { status: 400 }
        );
      }
  
      const history = await PosterDatabase.getUserGenerationHistory(userId, limit);
  
      return ApiResponseWrapper.success({
        success: true,
        data: history,
      });
    } catch (error) {
      return ApiResponseWrapper.error(
        "Internal server error",
        { status: 500 }
      );
    }
  }
);

