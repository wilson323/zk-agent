/**
 * @file auth\profile\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs, CommonValidations } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { z } from "zod"
import { getUserById, updateUser } from '@/lib/services/user-service';
import { createUsageStats } from '@/lib/services/stats-service';
import { getCurrentUser } from "@/lib/auth/middleware"
import type { UserProfile } from "@/types/auth"

const updateProfileSchema = z.object({
  name: z.string().optional(),
  avatar: z.string().optional(),
});

export const GET = createApiRoute(
  RouteConfigs.publicGet(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    const currentUser = getCurrentUser(req)
    if (!currentUser) {
      return ApiResponseWrapper.success(
        {
          success: false,
          error: "未授权访问",
        },
        { status: 401 },
      )
    }

    const result = await getUserById(currentUser.userId);
    if (!result) {
      return ApiResponseWrapper.error(ErrorCode.USER_NOT_FOUND, "用户不存在", null);
    }
    return ApiResponseWrapper.success(result);
  }
);

export const PUT = createApiRoute(
  RouteConfigs.protectedPut(updateProfileSchema),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    const currentUser = getCurrentUser(req)
    if (!currentUser) {
      return ApiResponseWrapper.success(
        {
          success: false,
          error: "未授权访问",
        },
        { status: 401 },
      )
    }

    const updatedUser = await updateUser(currentUser.userId, { name, avatar });

    await createUsageStats({
      userId: currentUser.userId,
      agentType: 'auth',
      action: 'update_profile',
      metadata: {
        updatedFields: Object.keys(validatedBody.data),
      },
      req,
    });

    return ApiResponseWrapper.success(updatedUser);
  }
);

