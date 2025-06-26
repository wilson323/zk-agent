/**
 * @file sharing\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs, CommonValidations } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { enhancedShareManager } from "@/lib/sharing/enhanced-share-manager"

export const GET = createApiRoute(
  RouteConfigs.publicGet(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const { searchParams } = new URL(req.url)
      const userId = validatedQuery?.userId
      const shareId = validatedQuery?.shareId
      const page = Number.parseInt(validatedQuery?.page || "1")
      const limit = Number.parseInt(validatedQuery?.limit || "20")
    
      if (shareId) {
        // Get specific share link
        const shareLink = await enhancedShareManager.getShareLink(shareId)
        if (!shareLink) {
          return ApiResponseWrapper.error(
            "Share link not found",
            { status: 404 }
          )
        }
        return ApiResponseWrapper.success({
          success: true,
          shareLink,
        })
      }
    
      const result = await enhancedShareManager.getUserShares(userId, page, limit)
    
      return ApiResponseWrapper.success({
        success: true,
        ...result,
      })
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
      const { contentId, contentType, config, userId } = body
    
      if (!contentId || !contentType || !userId) {
        return ApiResponseWrapper.error(
          "Missing required parameters: contentId, contentType, userId",
          { status: 400 }
        )
      }
    
      const shareLink = await enhancedShareManager.createShareLink(contentId, contentType, userId, config)
    
      return ApiResponseWrapper.success({
        success: true,
        shareLink,
      })
    } catch (error) {
      return ApiResponseWrapper.error(
        "Internal server error",
        { status: 500 }
      )
    }
  }
);

export const PUT = createApiRoute(
  RouteConfigs.protectedPut(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const body = await req.json()
      const { shareId, config, userId } = body
    
      if (!shareId || !userId) {
        return ApiResponseWrapper.error(
          "Missing required parameters: shareId, userId",
          { status: 400 }
        )
      }
    
      const updatedShareLink = await enhancedShareManager.updateShareLink(shareId, userId, config)
    
      return ApiResponseWrapper.success({
        success: true,
        shareLink: updatedShareLink,
      })
    } catch (error) {
      return ApiResponseWrapper.error(
        "Internal server error",
        { status: 500 }
      )
    }
  }
);

export const DELETE = createApiRoute(
  { method: 'DELETE', requireAuth: true, timeout: 60000 },
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const { searchParams } = new URL(req.url)
      const shareId = validatedQuery?.shareId
      const userId = validatedQuery?.userId
    
      if (!shareId || !userId) {
        return ApiResponseWrapper.error(
          "Missing required parameters: shareId, userId",
          { status: 400 }
        )
      }
    
      await enhancedShareManager.deleteShareLink(shareId, userId)
    
      return ApiResponseWrapper.success({
        success: true,
        message: "分享链接已删除",
      })
    } catch (error) {
      return ApiResponseWrapper.error(
        "Internal server error",
        { status: 500 }
      )
    }
  }
);

