/**
 * @file example/route.ts
 * @description 示例API路由实现
 * @author ZK-Agent Team
 * @date 2025-01-27
 */

import { NextRequest } from 'next/server';
import { container } from '@/lib/di/container';
import { ExampleService } from '@/lib/services/example-service';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();
import { ExampleController } from '@/lib/controllers/example.controller';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';

/**
 * 处理GET请求
 */
export const GET = createApiRoute(
  RouteConfigs.publicGet(),
  async (request: NextRequest) => {
    const controller = new ExampleController();
    return await controller.handleGet(request);
  }
);

/**
 * 处理POST请求
 */
export const POST = createApiRoute(
  RouteConfigs.protectedPost(),
  async (request: NextRequest) => {
    const controller = new ExampleController();
    return await controller.handlePost(request);
  }
);