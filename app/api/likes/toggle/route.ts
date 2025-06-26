/**
 * @file likes\toggle\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs, CommonValidations } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { db } from '@/lib/database/connection';;
import { getCurrentUser } from "@/lib/auth/middleware";

export const POST = createApiRoute(
  RouteConfigs.protectedPost(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    const { itemId, itemType } = await req.json();
    
    if (!itemId || !itemType) {
      return ApiResponseWrapper.error('Missing itemId or itemType', 400);
    }
    
    // 获取当前用户（如果已登录）
    const currentUser = getCurrentUser(req);
    const userId = currentUser?.userId || "anonymous";
    
    // 检查是否已经点赞
    const existingLike = await db?.like.findUnique({
      where: {
        userId_itemId_itemType: {
          userId,
          itemId,
          itemType,
        },
      },
    });
    
    let isLiked: boolean;
    let likeCount: number;
    
    if (existingLike) {
      // 取消点赞
      await db?.like.delete({
        where: { id: existingLike.id },
      });
      isLiked = false;
    } else {
      // 添加点赞
      await db?.like.create({
        data: {
          userId,
          itemId,
          itemType,
          createdAt: new Date(),
        },
      });
      isLiked = true;
    }
    
    // 获取最新点赞数
    likeCount = await db?.like.count({
      where: { itemId, itemType },
    });
    
    return ApiResponseWrapper.success({
      success: true,
      isLiked,
      likeCount,
    });
  }
);

