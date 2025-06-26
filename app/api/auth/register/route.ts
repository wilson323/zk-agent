/**
 * @file auth\register\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs, CommonValidations } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { z } from "zod"
import { register } from '@/lib/services/auth-service';
import type { RegisterRequest, LoginResponse } from "@/types/auth"

const registerSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(8, "密码至少需要8个字符"),
  name: z.string().optional(),
  inviteCode: z.string().optional()
})

export const POST = createApiRoute(
  RouteConfigs.protectedPost(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    const body: RegisterRequest = await req.json()
    
    // 验证请求数据
    const validationResult = registerSchema.safeParse(body)
    if (!validationResult.success) {
      return ApiResponseWrapper.success(
        {
          success: false,
          error: validationResult.error.errors[0].message,
        } as LoginResponse,
        { status: 400 },
      )
    }

    const { email, password, name, inviteCode } = validationResult.data

    // 验证密码强度
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      return ApiResponseWrapper.success(
        {
          success: false,
          error: passwordValidation.errors[0],
        } as LoginResponse,
        { status: 400 },
      )
    }

    const result = await register({ email, password, name, inviteCode });

    if (result.user) {
      await createUsageStats({
        userId: result.user.id,
        agentType: 'auth',
        action: 'register',
        metadata: {
          inviteCode,
        },
        req,
      });
    }

    const response: LoginResponse = {
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        avatar: newUser.avatar,
        role: "user",
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt,
      },
      tokens,
    }

    return ApiResponseWrapper.success(response)
  }
);

