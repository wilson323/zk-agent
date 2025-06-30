/**
 * @file poster\generate\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { ErrorCode } from '@/types/core';
import { imageGenerationService } from "@/lib/ai/image-generation-service";
import { templateSystem } from "@/lib/poster/template-system";
import type { PosterGenerationRequest, PosterGenerationResult } from "@/types/poster";

export const POST = createApiRoute(
  RouteConfigs.protectedPost(),
  async (req: NextRequest, { validatedBody, validatedQuery, user, requestId }) => {
    try {
      const {
        description,
        style,
        size,
        palette,
        referenceImageUrl,
        timestamp
      } = validatedBody as PosterGenerationRequest;
      
      if (!description) {
        return ApiResponseWrapper.error(
          ErrorCode.VALIDATION_ERROR,
          "Missing required parameters: description",
          null,
          400
        );
      }
      
      // Generate poster using AI image generation service
      const generationResult = await imageGenerationService.generateImage({
        prompt: description,
        style: style,
        size: size,
        quality: 0.8,
        negativePrompt: "",
        seed: Date.now(),
        steps: 30,
        guidance: 7.5,
      });
      
      if (!generationResult.success) {
        return ApiResponseWrapper.error(
          ErrorCode.INTERNAL_SERVER_ERROR,
          generationResult.error || "Failed to generate poster",
          null,
          500
        );
      }
      
      const result: PosterGenerationResult = {
        id: `poster_${Date.now()}`,
        imageUrl: generationResult.imageUrl || "",
        thumbnailUrl: generationResult.thumbnailUrl,
        metadata: {
          generationTime: generationResult.metadata?.generationTime || 0,
          style: style || "",
          size: size || "",
          palette: palette || "",
        },
        createdAt: new Date(),
      };
      
      return ApiResponseWrapper.success(result);
    } catch (error) {
      console.error('Error generating poster:', error);
      return ApiResponseWrapper.error(
        ErrorCode.INTERNAL_SERVER_ERROR,
        "Internal server error",
        null,
        500
      );
    }
  }
);