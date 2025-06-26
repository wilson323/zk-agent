/**
 * @file auth\refresh\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs, CommonValidations } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { z } from "zod"
import { refreshToken as refreshTokenService } from '@/lib/services/auth-service';
import type { LoginResponse } from "@/types/auth"

const refreshSchema = z.object({
  refreshToken: z.string().min(1, "刷新令牌不能为空")
})

export const POST = createApiRoute(
  RouteConfigs.protectedPost({ body: refreshSchema }),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    const { refreshToken } = validatedBody;
    const result = await refreshTokenService(refreshToken, req);
    return ApiResponseWrapper.success(result);
  }
);

