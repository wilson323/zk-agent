/**
 * @file poster\templates\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs, CommonValidations } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { PosterConfigDB } from "@/lib/database/poster-config"

export const GET = createApiRoute(
  RouteConfigs.publicGet(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const { searchParams } = new URL(req.url)
      const industry = validatedQuery?.industry
      const category = validatedQuery?.category
      const productType = validatedQuery?.productType
    
      if (industry === "security") {
        const templates = await PosterConfigDB.getSecurityTemplates()
    
        let filtered = templates
        if (category) {
          filtered = filtered.filter((t) => t.category === category)
        }
        if (productType) {
          filtered = filtered.filter((t) => t.productType === productType)
        }
    
        return ApiResponseWrapper.success({
          success: true,
          data: filtered,
        })
      }
    
      return ApiResponseWrapper.error(
        "Industry not supported",
        { status: 400 }
      )
    } catch (error) {
      return ApiResponseWrapper.error(
        "Internal server error",
        { status: 500 }
      )
    }
  }
);

export const POST = createApiRoute(
  RouteConfigs.protectedPost(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const body = await req.json()
      const { templateId, userId } = body
    
      if (!templateId) {
        return ApiResponseWrapper.error(
          "Missing required parameter: templateId",
          { status: 400 }
        )
      }
    
      // 更新模板使用统计
      await PosterConfigDB.updateTemplateUsage(templateId)
    
      return ApiResponseWrapper.success({
        success: true,
        message: "Template usage updated",
      })
    } catch (error) {
      return ApiResponseWrapper.error(
        "Internal server error",
        { status: 500 }
      )
    }
  }
);

