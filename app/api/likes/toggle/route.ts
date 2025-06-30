/**
 * @file likes\toggle\route.ts
 * @description Like toggle API route
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { db } from '@/lib/db';

export const POST = createApiRoute(
  RouteConfigs.protectedPost(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const { itemId, itemType } = await req.json();
      
      if (!itemId || !itemType) {
        return ApiResponseWrapper.error('Missing itemId or itemType', 400);
      }
      
      // 获取当前用户ID
      const userId = _user?.id || "anonymous";
      
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
      }) || 0;
      
      return ApiResponseWrapper.success({
        isLiked,
        likeCount,
      });
    } catch (error) {
      console.error('Like toggle error:', error);
      return ApiResponseWrapper.error(
        'Internal server error',
        500
      );
    }
  }
);

