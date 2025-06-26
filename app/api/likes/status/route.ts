/**
 * @file likes\status\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs, CommonValidations } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { db } from '@/lib/database/connection';;
import { getCurrentUser } from "@/lib/auth/middleware";

export const GET = createApiRoute(
  RouteConfigs.publicGet(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    const { searchParams } = new URL(req.url);
    const itemId = validatedQuery?.itemId;
    const itemType = validatedQuery?.itemType;
    
    if (!itemId || !itemType) {
      return ApiResponseWrapper.error('Missing itemId or itemType', 400);
    }
    
    // 获取当前用户
    const currentUser = getCurrentUser(req);
    const userId = currentUser?.userId || "anonymous";
    
    // 检查用户是否点赞
    const userLike = await db?.like.findUnique({
      where: {
        userId_itemId_itemType: {
          userId,
          itemId,
          itemType,
        },
      },
    });
    
    // 获取总点赞数
    const likeCount = await db?.like.count({
      where: { itemId, itemType },
    });
    
    return ApiResponseWrapper.success({
      success: true,
      isLiked: !!userLike,
      count: likeCount,
    });
  }
);

