/**
 * @file auth\profile\route.ts
 * @description User profile API route
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { ErrorCode } from '@/types/core';
import { z } from 'zod';

const updateProfileSchema = z.object({
  name: z.string().optional(),
  avatar: z.string().optional(),
});

export const GET = createApiRoute(
  RouteConfigs.protectedGet(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      if (!user) {
        return ApiResponseWrapper.error(ErrorCode.AUTHENTICATION_ERROR, '未授权访问', null, 401);
      }

      // 模拟获取用户信息
      const userProfile = {
        id: user.id,
        name: user.name || 'User',
        email: user.email,
        avatar: user.avatar || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return ApiResponseWrapper.success(userProfile);
    } catch (error) {
      console.error('Get profile error:', error);
      return ApiResponseWrapper.error(ErrorCode.INTERNAL_SERVER_ERROR, 'Internal server error', null, 500);
    }
  }
);

export const PUT = createApiRoute(
  RouteConfigs.protectedPut({ body: updateProfileSchema }),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      if (!user) {
        return ApiResponseWrapper.error(ErrorCode.AUTHENTICATION_ERROR, '未授权访问', null, 401);
      }

      const { name, avatar } = validatedBody;
      
      // 模拟更新用户信息
      const updatedUser = {
        id: user.id,
        name: name || user.name,
        email: user.email,
        avatar: avatar || user.avatar,
        updatedAt: new Date().toISOString(),
      };

      // 模拟记录使用统计
      console.log('Profile updated:', {
        userId: user.id,
        updatedFields: Object.keys(validatedBody),
        timestamp: new Date().toISOString(),
      });

      return ApiResponseWrapper.success(updatedUser);
    } catch (error) {
      console.error('Update profile error:', error);
      return ApiResponseWrapper.error(ErrorCode.INTERNAL_SERVER_ERROR, 'Internal server error', null, 500);
    }
  }
);