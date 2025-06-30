/**
 * @file likes\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest } from 'next/server';
import { createApiRoute, RouteConfigs } from '../../../lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '../../../lib/utils/api-helper';
import { ErrorCode } from '../../../types/core';

export const GET = createApiRoute(
  RouteConfigs.publicGet(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }: { params?: any, validatedBody?: any, validatedQuery?: any, user?: any, requestId: string }) => {
    try {
      const itemId = validatedQuery?.itemId;
      const itemType = validatedQuery?.itemType;
      const userId = validatedQuery?.userId;
      const action = validatedQuery?.action;
      
      if (!itemId || !itemType) {
        return ApiResponseWrapper.error(ErrorCode.VALIDATION_ERROR, 'Item ID and type are required', null, 400);
      }
      
      if (action === "trending") {
        // 模拟获取热门项目
        const trending = Array.from({ length: 10 }, (_, i) => ({
          id: `item-${i + 1}`,
          type: itemType,
          likeCount: Math.floor(Math.random() * 1000),
          title: `Trending Item ${i + 1}`
        }));
        return ApiResponseWrapper.success({ success: true, trending });
      }
      
      // 模拟获取点赞状态和统计
      const currentUserId = user?.userId || userId || "anonymous";
      const isLiked = Math.random() > 0.5; // 随机模拟点赞状态
      const stats = {
        totalLikes: Math.floor(Math.random() * 1000),
        recentLikes: Math.floor(Math.random() * 50),
        userLiked: isLiked
      };
      
      return ApiResponseWrapper.success({
        success: true,
        isLiked,
        stats,
      });
    } catch (error) {
      console.error('获取点赞信息失败:', error);
      return ApiResponseWrapper.error(ErrorCode.INTERNAL_SERVER_ERROR, 'Internal server error', (error as Error).message, 500);
    }
  }
);

export const POST = createApiRoute(
  RouteConfigs.protectedPost(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }: { params?: any, validatedBody?: any, validatedQuery?: any, user?: any, requestId: string }) => {
    try {
      const { itemId, itemType, action } = validatedBody;
      
      if (!itemId || !itemType) {
        return ApiResponseWrapper.error(ErrorCode.VALIDATION_ERROR, 'Item ID and type are required', null, 400);
      }
      
      const userId = user?.userId || "anonymous";
      
      // 模拟点赞操作
      let isLiked = false;
      let message = "";
      
      if (action === "like") {
        isLiked = true;
        message = "Item liked successfully";
      } else if (action === "unlike") {
        isLiked = false;
        message = "Item unliked successfully";
      } else {
        return ApiResponseWrapper.error(ErrorCode.VALIDATION_ERROR, 'Invalid action. Use "like" or "unlike"', null, 400);
      }
      
      // 模拟更新后的统计数据
      const stats = {
        totalLikes: Math.floor(Math.random() * 1000),
        recentLikes: Math.floor(Math.random() * 50),
        userLiked: isLiked
      };
      
      return ApiResponseWrapper.success({
        success: true,
        message,
        isLiked,
        stats,
      });
    } catch (error) {
      console.error('点赞操作失败:', error);
      return ApiResponseWrapper.error(ErrorCode.INTERNAL_SERVER_ERROR, 'Internal server error', (error as Error).message, 500);
    }
  }
);

