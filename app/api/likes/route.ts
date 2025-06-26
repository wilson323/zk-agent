/**
 * @file likes\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs, CommonValidations } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { enhancedLikeManager } from "@/lib/likes/enhanced-like-manager"

export const GET = createApiRoute(
  RouteConfigs.publicGet(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    const { searchParams } = new URL(req.url);
    const itemId = validatedQuery?.itemId;
    const itemType = validatedQuery?.itemType;
    const userId = validatedQuery?.userId;
    const action = validatedQuery?.action;
    
    if (!itemId || !itemType) {
      return ApiResponseWrapper.error('Item ID and type are required', 400);
    }
    
    if (action === "trending") {
      const trending = await enhancedLikeManager.getTrendingItems(itemType as any, 10);
      return ApiResponseWrapper.success({ success: true, trending });
    }
    
    if (action === "analytics") {
      const analytics = await enhancedLikeManager.getLikeAnalytics(itemType as any);
      return ApiResponseWrapper.success({ success: true, analytics });
    }
    
    if (action === "user-likes" && userId) {
      const userLikes = await enhancedLikeManager.getUserLikes(userId);
      return ApiResponseWrapper.success({ success: true, userLikes });
    }
    
    const [isLiked, stats] = await Promise.all([
      userId ? enhancedLikeManager.isLiked(itemId, userId) : Promise.resolve(false),
      enhancedLikeManager.getLikeStats(itemId, itemType as any),
    ]);
    
    return ApiResponseWrapper.success({
      success: true,
      isLiked,
      stats,
    });
  }
);

export const POST = createApiRoute(
  RouteConfigs.protectedPost(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    const body = await req.json();
    const { itemId, itemType, userId, type = "like" } = body;
    
    if (!itemId || !itemType || !userId) {
      return ApiResponseWrapper.error('Item ID, type, and user ID are required', 400);
    }
    
    const result = await enhancedLikeManager.toggleLike(itemId, itemType, userId, type);
    
    return ApiResponseWrapper.success({
      success: true,
      ...result,
    });
  }
);

