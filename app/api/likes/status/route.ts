/**
 * @file likes\status\route.ts
 * @description Like status check API route
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { db } from '@/lib/db';

export const GET = createApiRoute(
  RouteConfigs.protectedGet(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const { searchParams } = new URL(req.url);
      const itemId = searchParams.get('itemId');
      const itemType = searchParams.get('itemType');
      
      if (!itemId || !itemType) {
        return ApiResponseWrapper.error('Missing itemId or itemType', 400);
      }
      
      // 获取当前用户ID
      const userId = _user?.id || "anonymous";
      
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
      }) || 0;
      
      return ApiResponseWrapper.success({
        isLiked: !!userLike,
        count: likeCount,
      });
    } catch (error) {
      console.error('Like status error:', error);
      return ApiResponseWrapper.error(
        'Internal server error',
        500
      );
    }
  }
);

