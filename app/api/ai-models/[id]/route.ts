/**
 * @file ai-models\[id]\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs, CommonValidations } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { aiModelManager } from "@/lib/ai-models/model-manager"

export const GET = createApiRoute(
  RouteConfigs.publicGet(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const routeParams = await params;
      
      const model = aiModelManager.getModel(routeParams.id);
    
      if (!model) {
        return ApiResponseWrapper.error(
          "Model not found",
          { status: 404 }
        );
      }
    
      return ApiResponseWrapper.success({
        success: true,
        data: model,
      });
    } catch (error) {
      return ApiResponseWrapper.error(
        "Failed to get AI model",
        { status: 500 }
      );
    }
  }
);

export const PUT = createApiRoute(
  { method: 'PUT', requireAuth: true, timeout: 60000 },
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
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
      return ApiResponseWrapper.error(
        "Failed to update AI model",
        { status: 400 }
      );
    }
  }
);

export const DELETE = createApiRoute(
  { method: 'DELETE', requireAuth: true, timeout: 60000 },
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const routeParams = await params;
      
      await aiModelManager.deleteModel(routeParams.id);
    
      return ApiResponseWrapper.success({
        success: true,
        message: "Model deleted successfully",
      });
    } catch (error) {
      return ApiResponseWrapper.error(
        "Failed to delete AI model",
        { status: 400 }
      );
    }
  }
);

