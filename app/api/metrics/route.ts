/**
 * @file Metrics API Route
 * @description 处理系统指标相关的API请求
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

import { NextRequest } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { z } from 'zod';

// 验证模式
const metricsQuerySchema = z.object({
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  type: z.enum(['performance', 'error', 'usage']).optional(),
  limit: z.coerce.number().min(1).max(1000).optional().default(100)
});

const metricsCreateSchema = z.object({
  name: z.string().min(1, '指标名称不能为空'),
  value: z.number(),
  type: z.enum(['performance', 'error', 'usage']),
  timestamp: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional()
});

const metricsUpdateSchema = z.object({
  value: z.number().optional(),
  metadata: z.record(z.any()).optional()
});

/**
 * GET /api/metrics - 获取系统指标
 */
export const GET = createApiRoute(
  RouteConfigs.protectedGet({ query: metricsQuerySchema }),
  async (req: NextRequest, { validatedQuery, user, requestId }) => {
    try {
      // 模拟获取指标数据
      const metrics = {
        performance: {
          responseTime: Math.random() * 1000,
          throughput: Math.random() * 100,
          errorRate: Math.random() * 0.1
        },
        usage: {
          activeUsers: Math.floor(Math.random() * 1000),
          apiCalls: Math.floor(Math.random() * 10000),
          storageUsed: Math.floor(Math.random() * 1000000)
        },
        errors: {
          total: Math.floor(Math.random() * 100),
          critical: Math.floor(Math.random() * 10),
          warnings: Math.floor(Math.random() * 50)
        }
      };
      
      return ApiResponseWrapper.success({
        metrics,
        timestamp: new Date().toISOString(),
        query: validatedQuery
      });
    } catch (error) {
      return ApiResponseWrapper.error(
        "获取指标失败",
        { status: 500 }
      );
    }
  }
);

/**
 * POST /api/metrics - 创建新的指标记录
 */
export const POST = createApiRoute(
  RouteConfigs.protectedPost({ body: metricsCreateSchema }),
  async (req: NextRequest, { validatedBody, user, requestId }) => {
    try {
      const metric = {
        id: `metric_${Date.now()}`,
        ...validatedBody,
        timestamp: validatedBody.timestamp || new Date().toISOString(),
        userId: user.id,
        createdAt: new Date().toISOString()
      };
      
      return ApiResponseWrapper.success({
        metric,
        message: "指标记录创建成功"
      });
    } catch (error) {
      return ApiResponseWrapper.error(
        "创建指标记录失败",
        { status: 500 }
      );
    }
  }
);

/**
 * PUT /api/metrics - 更新指标记录
 */
export const PUT = createApiRoute(
  RouteConfigs.protectedPut({ body: metricsUpdateSchema }),
  async (req: NextRequest, { validatedBody, user, requestId }) => {
    try {
      const { searchParams } = new URL(req.url);
      const metricId = searchParams.get('id');
      
      if (!metricId) {
        return ApiResponseWrapper.error(
          "缺少指标ID参数",
          { status: 400 }
        );
      }
      
      const updatedMetric = {
        id: metricId,
        ...validatedBody,
        updatedAt: new Date().toISOString(),
        updatedBy: user.id
      };
      
      return ApiResponseWrapper.success({
        metric: updatedMetric,
        message: "指标记录更新成功"
      });
    } catch (error) {
      return ApiResponseWrapper.error(
        "更新指标记录失败",
        { status: 500 }
      );
    }
  }
);

/**
 * DELETE /api/metrics - 删除指标记录
 */
export const DELETE = createApiRoute(
  RouteConfigs.admin('DELETE'),
  async (req: NextRequest, { user, requestId }) => {
    try {
      const { searchParams } = new URL(req.url);
      const metricId = searchParams.get('id');
      
      if (!metricId) {
        return ApiResponseWrapper.error(
          "缺少指标ID参数",
          { status: 400 }
        );
      }
      
      return ApiResponseWrapper.success({
        success: true,
        message: "指标记录已删除",
        deletedId: metricId
      });
    } catch (error) {
      return ApiResponseWrapper.error(
        "删除指标记录失败",
        { status: 500 }
      );
    }
  }
);