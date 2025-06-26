/**
 * @file ai-models\metrics\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { ErrorCode } from '@/types/core';
import { aiModelManager } from "@/lib/ai-models/model-manager"

export const GET = createApiRoute(
  RouteConfigs.publicGet(),
  async (req: NextRequest, { validatedQuery }) => {
    try {

      const modelId = validatedQuery?.modelId;
    
      if (modelId) {
        // 获取单个模型指标
        const metrics = aiModelManager.getModelMetrics(modelId);
        if (!metrics) {
          return ApiResponseWrapper.error(
            ErrorCode.NOT_FOUND,
            "Model metrics not found",
            null,
            404
          );
        }
    
        return ApiResponseWrapper.success({
          success: true,
          data: metrics,
        });
      } else {
        // 获取所有模型指标
        const allMetrics = aiModelManager.getAllMetrics();
    
        return ApiResponseWrapper.success({
          success: true,
          data: allMetrics,
          total: allMetrics.length,
        });
      }
    } catch (error) {
      return ApiResponseWrapper.error(
        ErrorCode.INTERNAL_SERVER_ERROR,
        "Failed to get AI model metrics",
        null,
        500
      );
    }
  }
);

