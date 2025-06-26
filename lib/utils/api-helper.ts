// @ts-nocheck
/**
 * @file lib/utils/api-helper.ts
 * @description API统一处理工具，包含错误处理、响应格式化、参数验证等
 * @author zk-agent开发团队
 * @lastUpdate 2024-12-19
 * @updateLog
 *   - 2024-12-19 初始创建API处理工具
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';
import { ApiResponse, ErrorCode } from '@/types/core';

// API响应包装器
export class ApiResponseWrapper {
  static success<T>(data: T, pagination?: any): NextResponse<ApiResponse<T>> {
    return NextResponse.json({
      success: true,
      data,
      pagination,
      timestamp: new Date().toISOString(),
    });
  }

  static error(
    code: ErrorCode,
    message: string,
    details?: any,
    status: number = 500
  ): NextResponse<ApiResponse> {
    return NextResponse.json(
      {
        success: false,
        error: {
          code,
          message,
          details,
        },
        timestamp: new Date().toISOString(),
      },
      { status }
    );
  }

  static validationError(errors: any): NextResponse<ApiResponse> {
    return this.error(
      ErrorCode.VALIDATION_ERROR,
      'Validation failed',
      errors,
      400
    );
  }

  static notFound(resource: string = 'Resource'): NextResponse<ApiResponse> {
    return this.error(
      ErrorCode.NOT_FOUND,
      `${resource} not found`,
      null,
      404
    );
  }

  static unauthorized(message: string = 'Unauthorized'): NextResponse<ApiResponse> {
    return this.error(
      ErrorCode.AUTHENTICATION_ERROR,
      message,
      null,
      401
    );
  }

  static forbidden(message: string = 'Forbidden'): NextResponse<ApiResponse> {
    return this.error(
      ErrorCode.AUTHORIZATION_ERROR,
      message,
      null,
      403
    );
  }

  static internalError(error: any): NextResponse<ApiResponse> {
    console.error('Internal Server Error:', error);
    return this.error(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Internal server error',
      process.env.NODE_ENV === 'development' ? error : null,
      500
    );
  }
}

// API路由处理器包装器
export function withApiHandler(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      return await handler(req, context);
    } catch (error) {
      if (error instanceof ZodError) {
        return ApiResponseWrapper.validationError(error.errors);
      }
      
      return ApiResponseWrapper.internalError(error);
    }
  };
}

// 请求体验证
export async function validateRequestBody<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): Promise<T> {
  try {
    const body = await req.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw error;
    }
    throw new Error('Invalid JSON body');
  }
}

// 查询参数验证
export function validateSearchParams<T>(
  searchParams: URLSearchParams,
  schema: ZodSchema<T>
): T {
  const params = Object.fromEntries(searchParams.entries());
  return schema.parse(params);
}

// 分页参数处理
export function getPaginationParams(searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc';

  return {
    page: Math.max(1, page),
    limit: Math.min(100, Math.max(1, limit)), // 限制最大100条
    sortBy,
    sortOrder,
    skip: (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit)),
    take: Math.min(100, Math.max(1, limit)),
  };
}

// 搜索参数处理
export function getSearchParams(searchParams: URLSearchParams) {
  const query = searchParams.get('query') || '';
  const filters: Record<string, any> = {};

  // 提取所有非标准参数作为过滤器
  for (const [key, value] of searchParams.entries()) {
    if (!['page', 'limit', 'sortBy', 'sortOrder', 'query'].includes(key)) {
      filters[key] = value;
    }
  }

  return { query, filters };
}

// 日志记录工具
export class ApiLogger {
  static logRequest(req: NextRequest, userId?: string) {
    const log = {
      method: req.method,
      url: req.url,
      userAgent: req.headers.get('user-agent'),
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      userId,
      timestamp: new Date().toISOString(),
    };
    
    console.log('📥 API Request:', JSON.stringify(log, null, 2));
  }

  static logResponse(response: NextResponse, duration: number) {
    const log = {
      status: response.status,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    };
    
    console.log('📤 API Response:', JSON.stringify(log, null, 2));
  }

  static logError(error: any, context?: any) {
    const log = {
      error: error.message || error,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    };
    
    console.error('🚨 API Error:', JSON.stringify(log, null, 2));
  }
}

// 性能监控装饰器
export function withPerformanceMonitoring(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    const startTime = Date.now();
    
    ApiLogger.logRequest(req);
    
    try {
      const response = await handler(req, context);
      const duration = Date.now() - startTime;
      
      ApiLogger.logResponse(response, duration);
      
      // 添加性能头部
      response.headers.set('X-Response-Time', `${duration}ms`);
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      ApiLogger.logError(error, { url: req.url, method: req.method, duration });
      throw error;
    }
  };
} 