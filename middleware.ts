/**
 * @file 全局中间件
 * @description 展示如何在中间件中使用依赖注入
 * @author ZK-Agent Team
 * @date 2024-12-20
 */

import { NextRequest, NextResponse } from 'next/server';
import { getService, TYPES } from '@/lib/di/container';
import { ILogger } from '@/lib/interfaces/logger.interface';
import { isDIInitialized } from '@/lib/di/initialization';

/**
 * 中间件函数
 * 注意：中间件在服务器端运行，但在Edge运行时环境中，
 * 这意味着它可能无法访问某些Node.js API
 */
export async function middleware(request: NextRequest) {
  // 检查DI系统是否已初始化
  if (!isDIInitialized()) {
    console.warn('中间件执行时DI系统尚未初始化');
    return NextResponse.next();
  }

  try {
    // 从DI容器获取日志服务
    const logger = getService<ILogger>(TYPES.Logger);
    
    // 记录请求信息
    logger.info(`中间件处理请求: ${request.method} ${request.nextUrl.pathname}`);
    
    // 添加自定义响应头
    const response = NextResponse.next();
    response.headers.set('x-middleware-cache', 'no-cache');
    response.headers.set('x-middleware-timestamp', Date.now().toString());
    
    return response;
  } catch (error) {
    // 错误处理 - 在中间件中出现错误时，我们仍然允许请求继续
    console.error('中间件错误:', error);
    return NextResponse.next();
  }
}

/**
 * 配置中间件匹配的路径
 */
export const config = {
  // 匹配所有API路由和示例页面
  matcher: ['/api/:path*', '/example']
};
