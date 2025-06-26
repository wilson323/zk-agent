/**
 * @file poster\generate\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs, CommonValidations } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { imageGenerationService } from "@/lib/ai/image-generation-service"
import { templateSystem } from "@/lib/poster/template-system"
import type { PosterGenerationRequest, PosterGenerationResult } from "@/types/poster"

export const POST = createApiRoute(
  RouteConfigs.protectedPost(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const body: PosterGenerationRequest = await req.json();
      
      // 前端校验
      if (!body.description || body.description.trim().length === 0) {
        return ApiResponseWrapper.error(
          "创意描述不能为空",
          { status: 400 }
        );
      }
  
      if (body.description.length > 2000) {
        return ApiResponseWrapper.error(
          "创意描述过长，请控制在2000字符以内",
          { status: 400 }
        );
      }
  
      const startTime = Date.now();
  
      // 如果指定了模板，应用模板
      let finalPrompt = body.description;
      if (body.templateId) {
        const template = templateSystem.getAllTemplates().find((t) => t.id === body.templateId);
        if (template) {
          // 结合模板和用户描述
          finalPrompt = `${body.description}, in the style of ${template.name}, ${template.description}`;
        }
      }
  
      // 调用AI图像生成服务
      const generationResult = await imageGenerationService.generateImage({
        prompt: finalPrompt,
        style: body.style,
        size: body.size,
        quality: 0.9,
        steps: 30,
        guidance: 7.5,
      });
  
      if (!generationResult.success) {
        return ApiResponseWrapper.error(
          generationResult.error || "AI生成失败",
          { status: 500 }
        );
      }
  
      const generationTime = Date.now() - startTime;
  
      // 构建结果
      const result: PosterGenerationResult = {
        id: `poster_${Date.now()}`,
        imageUrl: generationResult.imageUrl!,
        thumbnailUrl: generationResult.thumbnailUrl,
        metadata: {
          generationTime,
          style: body.style || "modern",
          size: body.size || "square",
          palette: body.palette || "brand",
          aiModel: generationResult.metadata?.model || "stable-diffusion-xl",
          prompt: finalPrompt,
          seed: generationResult.metadata?.seed || 0,
          steps: generationResult.metadata?.steps || 30,
          guidance: generationResult.metadata?.guidance || 7.5,
        },
        createdAt: new Date(),
      };
  
      // 保存到数据库（如果需要）
      try {
        await fetch("/api/poster/history", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: req.headers.get("user-id") || "anonymous",
            description: body.description,
            style: body.style,
            size: body.size,
            palette: body.palette,
            templateId: body.templateId,
            resultImageUrl: result.imageUrl,
            metadata: result.metadata,
          }),
        });
      } catch (error) {
        // 历史记录保存失败不影响主流程
        console.error("Failed to save poster history:", error);
      }
  
      return ApiResponseWrapper.success({
        success: true,
        data: result,
      });
    } catch (error) {
      return ApiResponseWrapper.error(
        "Internal server error",
        { status: 500 }
      );
    }
  }
);

