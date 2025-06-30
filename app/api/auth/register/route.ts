/**
 * @file auth\register\route.ts
 * @description User registration API route
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { ErrorCode } from '@/types/core';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(8, "密码至少需要8个字符"),
  name: z.string().optional(),
  inviteCode: z.string().optional()
});

export const POST = createApiRoute(
  {
    method: 'POST',
    requireAuth: false,
    rateLimit: { requests: 100, windowMs: 60000 }, // 每分钟100次
    validation: { body: registerSchema },
    timeout: 60000
  },
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const { email, password, name, inviteCode } = validatedBody;
      
      // 模拟密码强度验证
      if (password.length < 8) {
        return ApiResponseWrapper.error(ErrorCode.VALIDATION_ERROR, '密码至少需要8个字符', null, 400);
      }
      
      // 模拟检查邮箱是否已存在
      if (email === 'existing@example.com') {
        return ApiResponseWrapper.error(ErrorCode.VALIDATION_ERROR, '邮箱已被注册', null, 400);
      }
      
      // 模拟用户注册
      const newUser = {
        id: `user_${Date.now()}`,
        email,
        name: name || email.split('@')[0],
        avatar: null,
        role: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // 模拟生成令牌
      const tokens = {
        accessToken: `access_token_${Date.now()}`,
        refreshToken: `refresh_token_${Date.now()}`,
        expiresIn: 3600
      };
      
      // 模拟记录使用统计
      console.log('User registered:', {
        userId: newUser.id,
        email,
        inviteCode,
        timestamp: new Date().toISOString(),
      });
      
      const response = {
        success: true,
        user: newUser,
        tokens,
      };
      
      return ApiResponseWrapper.success(response);
    } catch (error) {
      console.error('Registration error:', error);
      return ApiResponseWrapper.error(ErrorCode.INTERNAL_SERVER_ERROR, 'Internal server error', null, 500);
    }
  }
);
