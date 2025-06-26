/**
 * @file ai-models\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { ErrorCode } from '@/types/core';
import { aiModelManager } from "@/lib/ai-models/model-manager";
import { z } from 'zod';

// 定义查询参数类型
interface GetQuery {
  type?: string;
  provider?: string;
  active?: "true" | "false";
}

// 定义POST请求体验证schema
const addModelSchema = z.object({
  name: z.string().min(1),
  provider: z.string().min(1),
  type: z.string().min(1),
  isActive: z.boolean().optional().default(true)
});

export const GET = createApiRoute(
  RouteConfigs.publicGet(),
  async (req: NextRequest, { validatedQuery }) => {
    try {
      const { type, provider, active } = validatedQuery as GetQuery;
      
      let models = aiModelManager.getAllModels();
      
      // 优化的单次过滤
      models = models.filter(model => 
        (!type || model.type === type) &&
        (!provider || model.provider === provider) &&
        (active === undefined || model.isActive === (active === "true"))
      );
      
      return ApiResponseWrapper.success({
        success: true,
        data: models,
        total: models.length,
      });
    } catch (error) {
      console.error('Error fetching AI models:', error);
      return ApiResponseWrapper.error(
        ErrorCode.INTERNAL_SERVER_ERROR,
        "Failed to get AI models",
        null,
        500
      );
    }
  }
);

export const POST = createApiRoute(
  RouteConfigs.protectedPost({ body: addModelSchema }),
  async (req: NextRequest, { validatedBody }) => {
    try {
      // 使用已验证的请求体数据
      const model = await aiModelManager.addModel(validatedBody);
    
      return ApiResponseWrapper.success({
        success: true,
        data: model,
        message: "Model added successfully",
      });
    } catch (error) {
      console.error('Error adding AI model:', error);
      
      // 区分错误类型
      if (error instanceof z.ZodError) {
        return ApiResponseWrapper.error(
          ErrorCode.VALIDATION_ERROR,
          "Invalid input data",
          null,
          400
        );
      }
      
      return ApiResponseWrapper.error(
        ErrorCode.INTERNAL_SERVER_ERROR,
        "Failed to add AI model",
        null,
        500
      );
    }
  }
);

