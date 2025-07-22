/**
 * @file auth\refresh\route.ts
 * @description 安全的令牌刷新API路由
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest } from 'next/server';
import { createApiRoute } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { ErrorCode } from '@/types/core';
import { z } from 'zod';
import { secureRefreshToken } from '@/lib/services/enhanced-auth-service';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();

const logger = getLogger();

const refreshSchema = z.object({
  refreshToken: z.string().min(10, '刷新令牌无效或格式不正确'),
});

export const POST = createApiRoute(
  {
    method: 'POST',
    requireAuth: false,
    rateLimit: { requests: 10, windowMs: 60000 }, // 每分钟10次（防止暴力破解）
    validation: { body: refreshSchema },
    timeout: 10000, // 10秒超时
  },
  async (req: NextRequest, { validatedBody, requestId }) => {
    try {
      const { refreshToken } = validatedBody;

      // 使用增强版认证服务刷新令牌
      const newTokens = await secureRefreshToken(refreshToken);

      if (!newTokens) {
        logger.warn(`令牌刷新失败，可能是无效的刷新令牌`, { requestId });
        return ApiResponseWrapper.error(
          ErrorCode.AUTHENTICATION_ERROR,
          '无效的刷新令牌',
          null,
          401
        );
      }

      // 返回新的令牌对
      return ApiResponseWrapper.success(newTokens);
    } catch (error: any) {
      logger.error('令牌刷新错误:', error, { requestId });
      return ApiResponseWrapper.error(
        ErrorCode.INTERNAL_SERVER_ERROR,
        '令牌刷新失败',
        { message: error.message },
        500
      );
    }
  }
);
