/**
 * @file admin\users\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs, CommonValidations } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { ErrorCode } from '@/types/core';
import { z } from "zod"
import { getUsers, createUser } from '@/lib/services/user-service';
import { createUsageStats } from '@/lib/services/stats-service';
import { getCurrentUser } from "@/lib/auth/middleware"

export const GET = createApiRoute(
  RouteConfigs.protectedGet(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const currentUser = getCurrentUser(req);
      if (!currentUser || currentUser.role !== "admin") {
        return ApiResponseWrapper.error(ErrorCode.AUTHORIZATION_ERROR, "权限不足", null);
      }
    
      const { searchParams } = new URL(req.url);
      const validationResult = getUsersSchema.safeParse(Object.fromEntries(searchParams));
    
      if (!validationResult.success) {
        return ApiResponseWrapper.error(validationResult.error.errors[0].message, 400);
      }
    
      const { page, limit, search, role, status } = validationResult.data;
      const pageNum = Number.parseInt(page);
      const limitNum = Number.parseInt(limit);
      const skip = (pageNum - 1) * limitNum;
    
      // 构建查询条件
      const where: any = {};
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ];
      }
      if (role) {
        where.role = role;
      }
      if (status) {
        where.status = status;
      }
    
      const { users, pagination } = await getUsers({
        where,
        skip: skip,
        limit: limitNum,
      });
      const total = pagination.total;
    
      return ApiResponseWrapper.success({
        success: true,
        data: {
          users,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
          },
        },
      });
    } catch (error) {
      return ApiResponseWrapper.error("获取用户列表失败", 500);
    }
  }
);

export const POST = createApiRoute(
  RouteConfigs.protectedPost(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const currentUser = getCurrentUser(req);
      if (!currentUser || currentUser.role !== "admin") {
        return ApiResponseWrapper.error("权限不足", 403);
      }
    
      const { email, name, password, role } = validatedBody;

      const newUser = await createUser({ email, name, avatar, role });

       if (newUser) {
         await createUsageStats({
           userId: currentUser.userId,
           agentType: 'admin',
           action: 'create_user',
           metadata: {
             targetUserId: newUser.id,
             targetUserEmail: newUser.email,
           },
           req,
         });
       }
    
      // The logging logic is expected to be moved into the createUser service
    
      return ApiResponseWrapper.success({
        success: true,
        data: newUser,
        message: "用户创建成功",
      });
    } catch (error) {
      return ApiResponseWrapper.error("创建用户失败", 500);
    }
  }
);

// Schema for getting users
const getUsersSchema = z.object({
  page: z.string().default("1"),
  limit: z.string().default("10"),
  search: z.string().optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "DELETED"]).optional(),
});

