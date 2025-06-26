/**
 * @file likes\stats\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs, CommonValidations } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { db } from '@/lib/database/connection';

export const GET = createApiRoute(
  RouteConfigs.publicGet(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    // 获取总点赞数
    const totalLikes = await db?.like.count();
    
    // 获取今日点赞数
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayLikes = await db?.like.count({
      where: {
        createdAt: {
          gte: today,
        },
      },
    });
    
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
    });
    
    const formattedPopularItems = popularItems.map((item) => ({
      itemId: item.itemId,
      itemType: item.itemType,
      likeCount: item._count.id,
    }));
    
    return ApiResponseWrapper.success({
      success: true,
      data: {
        totalLikes,
        todayLikes,
        popularItems: formattedPopularItems,
      },
    });
  }
);

