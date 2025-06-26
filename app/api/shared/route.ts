/**
 * @file Shared API Route
 * @description 处理共享相关的API请求
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

import { NextRequest } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { enhancedShareManager } from '@/lib/sharing/enhanced-share-manager';
import { z } from 'zod';

// 验证模式
const shareRequestSchema = z.object({
  content: z.string().min(1, '内容不能为空'),
  type: z.enum(['chat', 'document', 'image']).optional().default('chat'),
  expiresAt: z.string().datetime().optional(),
  isPublic: z.boolean().optional().default(false)
});

const shareUpdateSchema = z.object({
  content: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  isPublic: z.boolean().optional()
});

/**
 * GET /api/shared - 获取共享列表
 */
export const GET = createApiRoute(
  RouteConfigs.protectedGet(),
  async (req: NextRequest, { user, requestId }) => {
    try {
      const shares = await enhancedShareManager.getUserShares(user.id);
      
      return ApiResponseWrapper.success({
        shares,
        total: shares.length
      });
    } catch (error) {
      return ApiResponseWrapper.error(
        "获取共享列表失败",
        { status: 500 }
      );
    }
  }
);

/**
 * POST /api/shared - 创建新的共享
 */
export const POST = createApiRoute(
  RouteConfigs.protectedPost({ body: shareRequestSchema }),
  async (req: NextRequest, { validatedBody, user, requestId }) => {
    try {
      const share = await enhancedShareManager.createShare({
        ...validatedBody,
        userId: user.id
      });
      
      return ApiResponseWrapper.success({
        share,
        message: "共享创建成功"
      });
    } catch (error) {
      return ApiResponseWrapper.error(
        "创建共享失败",
        { status: 500 }
      );
    }
  }
);

/**
 * PUT /api/shared - 更新共享
 */
export const PUT = createApiRoute(
  RouteConfigs.protectedPut({ body: shareUpdateSchema }),
  async (req: NextRequest, { validatedBody, user, requestId }) => {
    try {
      const { searchParams } = new URL(req.url);
      const shareId = searchParams.get('id');
      
      if (!shareId) {
        return ApiResponseWrapper.error(
          "缺少共享ID参数",
          { status: 400 }
        );
      }
      
      const updatedShare = await enhancedShareManager.updateShare(
        shareId,
        validatedBody,
        user.id
      );
      
      return ApiResponseWrapper.success({
        share: updatedShare,
        message: "共享更新成功"
      });
    } catch (error) {
      return ApiResponseWrapper.error(
        "更新共享失败",
        { status: 500 }
      );
    }
  }
);

/**
 * DELETE /api/shared - 删除共享
 */
export const DELETE = createApiRoute(
  RouteConfigs.admin('DELETE'),
  async (req: NextRequest, { user, requestId }) => {
    try {
      const { searchParams } = new URL(req.url);
      const shareId = searchParams.get('id');
      
      if (!shareId) {
        return ApiResponseWrapper.error(
          "缺少共享ID参数",
          { status: 400 }
        );
      }
      
      await enhancedShareManager.deleteShare(shareId, user.id);
      
      return ApiResponseWrapper.success({
        success: true,
        message: "共享已删除"
      });
    } catch (error) {
      return ApiResponseWrapper.error(
        "删除共享失败",
        { status: 500 }
      );
    }
  }
);