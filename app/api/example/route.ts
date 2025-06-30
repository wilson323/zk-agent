/**
 * @file 示例API路由
 * @description 展示如何在API路由中使用依赖注入
 * @author ZK-Agent Team
 * @date 2024-12-20
 */

import { NextRequest, NextResponse } from 'next/server';
import { getService, TYPES } from '@/lib/di/container';
import { IExampleService } from '@/lib/services/example-service';
import { ILogger } from '@/lib/interfaces/logger.interface';
import { IExampleController } from '@/lib/controllers/example.controller';

/**
 * GET 请求处理
 */
export async function GET(request: NextRequest) {
  try {
    // 从容器中获取服务
    const logger = getService<ILogger>(TYPES.Logger);
    const exampleController = getService<IExampleController>(TYPES.ExampleController);
    
    logger.info('收到示例API请求');
    
    // 调用控制器方法
    const data = await exampleController.getData();
    
    // 返回响应
    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    // 错误处理
    const logger = getService<ILogger>(TYPES.Logger);
    logger.error('示例API错误', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}
