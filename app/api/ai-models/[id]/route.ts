/**
 * @file ai-models\[id]\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { aiModelManager } from '@/lib/ai-models/model-manager';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { ErrorCode } from '@/types/core';

export const GET = createApiRoute(
  RouteConfigs.protectedGet(),
  async (_req, { params }) => {
    try {
      const routeParams = await params;
      const model = await aiModelManager.getModel(routeParams.id);
      
      return ApiResponseWrapper.success({
        success: true,
        data: model,
      });
    } catch (error) {
      return ApiResponseWrapper.error(ErrorCode.NOT_FOUND, 'AI model not found', null, 404);
    }
  }
);

export const PUT = createApiRoute(
  RouteConfigs.protectedPut(),
  async (req: NextRequest, { validatedBody, validatedQuery, user, requestId, params }) => {
    try {
      const routeParams = await params;
      const data = await req.json();
    
      const model = await aiModelManager.updateModel(routeParams.id, data);
    
      return ApiResponseWrapper.success({
        success: true,
        data: model,
        message: "Model updated successfully",
      });
    } catch (error) {
      return ApiResponseWrapper.error(ErrorCode.VALIDATION_ERROR, 'Failed to update AI model', null, 400);
    }
  }
);

export const DELETE = createApiRoute(
  RouteConfigs.protectedDelete(),
  async (req: NextRequest, { validatedBody, validatedQuery, user, requestId, params }) => {
    try {
      const routeParams = await params;
      
      await aiModelManager.deleteModel(routeParams.id);
    
      return ApiResponseWrapper.success({
        success: true,
        message: "Model deleted successfully",
      });
    } catch (error) {
      return ApiResponseWrapper.error(ErrorCode.VALIDATION_ERROR, 'Failed to delete AI model', null, 400);
    }
  }
);

