/**
 * @file likes\batch-status\route.ts
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
    const { items } = await req.json();
    
    if (!Array.isArray(items) || items.length === 0) {
      return ApiResponseWrapper.error('Invalid items array', 400);
    }
    
    // 获取当前用户
    const currentUser = getCurrentUser(req);
    const userId = currentUser?.userId || "anonymous";
    
    const result: Record<string, { isLiked: boolean; count: number }> = {};
    
    // 批量查询用户点赞状态
    const userLikes = await db?.like.findMany({
      where: {
        userId,
        OR: items.map((item) => ({
          itemId: item.itemId,
          itemType: item.itemType,
        })),
      },
    });
    
    // 批量查询点赞总数
    const likeCounts = await Promise.all(
      items.map((item) =>
        db?.like.count({
          where: {
            itemId: item.itemId,
            itemType: item.itemType,
          },
        }),
      ),
    );
    
    // 组装结果
    items.forEach((item, index) => {
      const cacheKey = `${item.itemType}:${item.itemId}`;
      const isLiked = userLikes.some((like) => like.itemId === item.itemId && like.itemType === item.itemType);
      
      result[cacheKey] = {
        isLiked,
        count: likeCounts[index],
      };
    });
    
    return ApiResponseWrapper.success({
      success: true,
      data: result,
    });
  }
);

