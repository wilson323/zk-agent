/**
 * @file likes\stats\route.ts
 * @description Likes statistics API route
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { db } from '@/lib/db';

export const GET = createApiRoute(
  RouteConfigs.publicGet(),
  async (_req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      // 获取总点赞数
      const totalLikes = await db?.like.count() || 0;
      
      // 获取今日点赞数
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayLikes = await db?.like.count({
        where: {
          createdAt: {
            gte: today,
          },
        },
      }) || 0;
      
      // 获取热门项目
      const popularItems = await db?.like.groupBy({
        by: ["itemId", "itemType"],
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: "desc",
          },
        },
        take: 10,
      }) || [];
      
      const formattedPopularItems = popularItems.map((item) => ({
        itemId: item.itemId,
        itemType: item.itemType,
        likeCount: item._count.id,
      }));
      
      return ApiResponseWrapper.success({
        totalLikes,
        todayLikes,
        popularItems: formattedPopularItems,
      });
    } catch (error) {
      console.error('Likes stats error:', error);
      return ApiResponseWrapper.error(
        'Internal server error',
        500
      );
    }
  }
);

