/**
 * @file admin\users\[id]\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { createApiRoute, ApiResponseWrapper } from '@/lib/api/route-factory';
import { z } from "zod"
import { getUserById, updateUser, deleteUser } from '@/lib/services/user-service';
import { createUsageStats } from '@/lib/services/stats-service';
import { getCurrentUser } from "@/lib/auth/middleware"
import { ErrorCode } from '@/types/core';

export const GET = createApiRoute({
  handler: async ({ req, params }) => {
    try {
      const currentUser = getCurrentUser(req);
      if (!currentUser || currentUser['role'] !== "admin") {
        return ApiResponseWrapper.error(ErrorCode.AUTHORIZATION_ERROR, "权限不足", null);
      }
    
      const { id } = await params;
      
      const result = await getUserById(id);
    if (!result) {
      return ApiResponseWrapper.error(ErrorCode.NOT_FOUND, "用户不存在", null);
    }
    return ApiResponseWrapper.success(result);
    } catch (error) {
      return ApiResponseWrapper.error(ErrorCode.INTERNAL_SERVER_ERROR, "获取用户信息失败", null);
    }
  }
});

export const PUT = createApiRoute({
  handler: async ({ req, params }) => {
    try {
      const currentUser = getCurrentUser(req);
      if (!currentUser || currentUser['role'] !== "admin") {
        return ApiResponseWrapper.error(ErrorCode.AUTHORIZATION_ERROR, "权限不足", null);
      }
    
      const body = await req.json();
      const validationResult = updateUserSchema.safeParse(body);
    
      if (!validationResult.success) {
        return ApiResponseWrapper.error(ErrorCode.VALIDATION_ERROR, validationResult.error.errors[0].message, null);
      }
    
      const updateData = validationResult.data;
      const { id } = await params;
    
      // 检查用户是否存在
      const existingUser = await getUserById(id);
    
      if (!existingUser) {
        return ApiResponseWrapper.error(ErrorCode.NOT_FOUND, "用户不存在", null);
      }
    
      const updatedUser = await updateUser(id, updateData);

    await createUsageStats({
      userId: currentUser.userId,
      agentType: 'admin',
      action: 'update_user',
      metadata: {
        targetUserId: id,
        updatedFields: Object.keys(validationResult.data),
      },
    });

    return ApiResponseWrapper.success({
        success: true,
        data: updatedUser,
        message: "用户信息更新成功",
      });
    } catch (error) {
      return ApiResponseWrapper.error(ErrorCode.INTERNAL_SERVER_ERROR, "更新用户信息失败", null);
    }
  }
});

export const DELETE = createApiRoute({
  handler: async ({ req, params }) => {
    try {
      const currentUser = getCurrentUser(req);
      if (!currentUser || currentUser['role'] !== "admin") {
        return ApiResponseWrapper.error(ErrorCode.AUTHORIZATION_ERROR, "权限不足", null);
      }
    
      const { id } = await params;
      
      // 检查用户是否存在
      const existingUser = await getUserById(id);
    
      if (!existingUser) {
        return ApiResponseWrapper.error(ErrorCode.NOT_FOUND, "用户不存在", null);
      }
    
      // 防止删除自己
      if (id === currentUser.userId) {
        return ApiResponseWrapper.error(ErrorCode.VALIDATION_ERROR, "不能删除自己的账户", null);
      }
    
      await deleteUser(id);

    await createUsageStats({
      userId: currentUser.userId,
      agentType: 'admin',
      action: 'delete_user',
      metadata: { 
        targetUserId: id,
        targetUserEmail: existingUser.email,
      },
    });

    return ApiResponseWrapper.success({
        success: true,
        message: "用户删除成功",
      });
    } catch (error) {
      return ApiResponseWrapper.error(ErrorCode.INTERNAL_SERVER_ERROR, "删除用户失败", null);
    }
  }
});

// Schema for user updates
const updateUserSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
});

