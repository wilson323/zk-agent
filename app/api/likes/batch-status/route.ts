/**
 * @file likes\batch-status\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { createApiRoute } from '@/lib/middleware/api-route';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { RouteConfigs } from '@/lib/middleware/route-configs';

export const POST = createApiRoute(
  RouteConfigs.protectedPost(),
  async ({ validatedBody, user }) => {
    try {
      const { items } = _validatedBody;
      
      if (!Array.isArray(items) || items.length === 0) {
        return ApiResponseWrapper.error('Invalid items array', 400);
      }
      
      // 获取当前用户
      const userId = _user?.userId || "anonymous";
      
      const result: Record<string, { isLiked: boolean; count: number }> = {};
      
      // 模拟批量查询用户点赞状态
      for (const item of items) {
        const { type, id } = item;
        if (!type || !id) {
          continue;
        }
        
        const key = `${type}:${id}`;
        
        // 模拟数据库查询
        result[key] = {
          isLiked: Math.random() > 0.5, // 随机模拟点赞状态
          count: Math.floor(Math.random() * 100) // 随机模拟点赞数量
        };
      }
      
      return ApiResponseWrapper.success({
        success: true,
        data: result,
      });
    } catch (error) {
      return ApiResponseWrapper.error('Internal server error', 500);
    }
  }
);

