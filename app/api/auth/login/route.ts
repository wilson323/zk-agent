/**
 * @file auth\login\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { login } from '@/lib/services/auth-service';
import { createUsageStats } from '@/lib/services/stats-service';
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(1, "密码不能为空"),
  rememberMe: z.boolean().optional(),
});

export const POST = createApiRoute(
  {
    method: 'POST',
    requireAuth: false,
    rateLimit: { requests: 100, windowMs: 60000 }, // 每分钟100次
    validation: { body: loginSchema },
    timeout: 60000
  },
  async (req: NextRequest, { params, validatedQuery, user, requestId, validatedBody }) => {
    const { email, password, rememberMe } = validatedBody;
    const result = await login({ email, password });

    if (result.user) {
      await createUsageStats({
        userId: result.user.id,
        agentType: 'auth',
        action: 'login',
        metadata: {
          rememberMe,
        },
        req,
      });
    }

    return ApiResponseWrapper.success(result);
  }
);