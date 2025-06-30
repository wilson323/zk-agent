/**
 * @file ai-models\[id]\test\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { ErrorCode } from '@/types/core';
import { aiModelManager } from '@/lib/ai-models/model-manager';

export const POST = createApiRoute(
  RouteConfigs.protectedPost(),
  async (req: NextRequest, { validatedBody, validatedQuery, user, requestId, params }) => {
    try {
      const routeParams = await params;
      
      const result = await aiModelManager.testModel(routeParams.id);
    
      return ApiResponseWrapper.success({
        success: true,
        data: result,
      });
    } catch (error) {
      return ApiResponseWrapper.error(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to test AI model', null, 500);
    }
  }
);

