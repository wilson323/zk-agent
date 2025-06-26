/**
 * @file ai-models\[id]\test\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs, CommonValidations } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { aiModelManager } from "@/lib/ai-models/model-manager"

export const POST = createApiRoute(
  RouteConfigs.protectedPost(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const routeParams = await params;
      
      const result = await aiModelManager.testModel(routeParams.id);
    
      return ApiResponseWrapper.success({
        success: true,
        data: result,
      });
    } catch (error) {
      return ApiResponseWrapper.error(
        "Failed to test AI model",
        { status: 500 }
      );
    }
  }
);

