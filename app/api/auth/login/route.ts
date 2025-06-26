/**
 * @file auth\login\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs, CommonValidations } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { login } from '@/lib/services/auth-service';
import { createUsageStats } from '@/lib/services/stats-service';
import { z } from "zod"
import type { LoginRequest, LoginResponse } from "@/types/auth"

const loginSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(1, "密码不能为空"),
  rememberMe: z.boolean().optional(),
});

export const POST = createApiRoute(
  RouteConfigs.publicPost(loginSchema),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
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

