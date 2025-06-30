/**
 * @file auth\change-password\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { z } from "zod"
import { changePassword as changePasswordService } from '@/lib/services/auth-service';
import { createUsageStats } from '@/lib/services/stats-service';

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, "当前密码不能为空"),
  newPassword: z.string().min(6, "新密码至少6位"),
});

export const POST = createApiRoute(
  RouteConfigs.protectedPost({ body: changePasswordSchema }),
  async (req: NextRequest, { validatedBody, user }) => {
    const { oldPassword, newPassword } = validatedBody;
    await changePasswordService(user.userId, { oldPassword, newPassword });

    await createUsageStats({
      userId: user.userId,
      agentType: 'auth',
      action: 'change_password',
      req,
    });

    return ApiResponseWrapper.success({
      success: true,
      message: "密码修改成功",
    });
  }
);

