/**
 * @file API Route Wrapper
 * @description 统一的API路由包装器，集成全局错误处理、验证、日志等功能
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withGlobalErrorHandler } from './global-error-handler';
import { ApiResponseWrapper, ApiLogger } from '@/lib/utils/api-helper';
import { validateRequestBody, validateSearchParams } from '@/lib/utils/api-helper';
import { ErrorCode } from '@/types/core';

// API路由配置接口
interface ApiRouteConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  requireAuth?: boolean;
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
  validation?: {
    body?: z.ZodSchema;
    query?: z.ZodSchema;
    params?: z.ZodSchema;
  };
  timeout?: number;
  description?: string;
}

// API处理器类型
type ApiHandler<T = any> = (
  req: NextRequest,
  context: {
    params?: any;
    validatedBody?: any;
    validatedQuery?: any;
    user?: any;
    requestId: string;
  }
) => Promise<NextResponse<T>>;

// 速率限制存储
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * 创建API路由处理器
 */
export function createApiRoute<T = any>(
  config: ApiRouteConfig,
  handler: ApiHandler<T>
) {
  return withGlobalErrorHandler(async (req: NextRequest, routeParams?: any) => {
    const startTime = Date.now();
    const requestId = generateRequestId();
    
    try {
      // 1. 方法验证
      if (req.method !== config.method) {
        return ApiResponseWrapper.methodNotAllowed(
          `Method ${req.method} not allowed. Expected ${config.method}`
        );
      }

      // 2. 超时控制
      if (config.timeout) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Request timeout after ${config.timeout}ms`));
          }, config.timeout);
        });
        
        return await Promise.race([
          processRequest(),
          timeoutPromise
        ]);
      }

      return await processRequest();

      async function processRequest(): Promise<NextResponse<T>> {
        // 3. 速率限制检查
        if (config.rateLimit) {
          const rateLimitResult = checkRateLimit(req, config.rateLimit);
          if (!rateLimitResult.allowed) {
            return ApiResponseWrapper.rateLimitExceeded(
              'Too many requests',
              rateLimitResult.resetTime
            );
          }
        }

        // 4. 身份验证
        let user = null;
        if (config.requireAuth) {
          user = await authenticateRequest(req);
          if (!user) {
            return ApiResponseWrapper.unauthorized('Authentication required');
          }
        }

        // 5. 请求验证
        let validatedBody, validatedQuery;
        
        if (config.validation?.body && req.method !== 'GET') {
          try {
            const body = await req.json();
            validatedBody = config.validation.body.parse(body);
          } catch (error) {
            if (error instanceof z.ZodError) {
              return ApiResponseWrapper.validationError(
                'Request body validation failed',
                error.errors
              );
            }
            throw error;
          }
        }

        if (config.validation?.query) {
          try {
            const url = new URL(req.url);
            const queryParams = Object.fromEntries(url.searchParams.entries());
            validatedQuery = config.validation.query.parse(queryParams);
          } catch (error) {
            if (error instanceof z.ZodError) {
              return ApiResponseWrapper.validationError(
                'Query parameters validation failed',
                error.errors
              );
            }
            throw error;
          }
        }

        // 6. 记录请求日志
        ApiLogger.logRequest(req, {
          requestId,
          method: config.method,
          description: config.description,
          user: user?.id,
          validatedBody: validatedBody ? '[VALIDATED]' : undefined,
          validatedQuery: validatedQuery ? '[VALIDATED]' : undefined
        });

        // 7. 执行处理器
        const response = await handler(req, {
          params: routeParams,
          validatedBody,
          validatedQuery,
          user,
          requestId
        });

        // 8. 记录响应日志
        const duration = Date.now() - startTime;
        ApiLogger.logResponse(response, {
          requestId,
          duration,
          method: config.method,
          status: response.status
        });

        // 9. 添加响应头
        response.headers.set('X-Request-ID', requestId);
        response.headers.set('X-Response-Time', `${duration}ms`);
        
        return response;
      }
    } catch (error) {
      // 错误会被全局错误处理器捕获
      throw error;
    }
  });
}

/**
 * 速率限制检查
 */
function checkRateLimit(
  req: NextRequest,
  rateLimit: { requests: number; windowMs: number }
): { allowed: boolean; resetTime?: number } {
  const clientId = getClientId(req);
  const now = Date.now();
  const windowStart = now - rateLimit.windowMs;
  
  // 清理过期记录
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
  
  const key = `${clientId}:${Math.floor(now / rateLimit.windowMs)}`;
  const current = rateLimitStore.get(key) || { count: 0, resetTime: now + rateLimit.windowMs };
  
  if (current.count >= rateLimit.requests) {
    return { allowed: false, resetTime: current.resetTime };
  }
  
  current.count++;
  rateLimitStore.set(key, current);
  
  return { allowed: true };
}

/**
 * 获取客户端ID
 */
function getClientId(req: NextRequest): string {
  // 优先使用真实IP
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';
  
  // 结合用户代理创建唯一标识
  const userAgent = req.headers.get('user-agent') || 'unknown';
  return `${ip}:${Buffer.from(userAgent).toString('base64').slice(0, 10)}`;
}

/**
 * 身份验证
 */
async function authenticateRequest(req: NextRequest): Promise<any> {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return null;
    }

    // 这里应该实现实际的JWT验证逻辑
    // 暂时返回模拟用户
    if (token === 'valid-token') {
      return { id: 'user-1', email: 'user@example.com' };
    }
    
    return null;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

/**
 * 生成请求ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 常用的验证模式
 */
export const CommonValidations = {
  // 分页参数
  pagination: z.object({
    page: z.string().optional().transform(val => val ? parseInt(val) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).optional().default('desc')
  }),
  
  // ID参数
  id: z.object({
    id: z.string().min(1, 'ID is required')
  }),
  
  // 搜索参数
  search: z.object({
    q: z.string().optional(),
    category: z.string().optional(),
    status: z.string().optional()
  }),
  
  // 文件上传
  fileUpload: z.object({
    file: z.any(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional()
  })
};

/**
 * 预定义的API路由配置
 */
export const RouteConfigs = {
  // GET路由 - 无需认证
  publicGet: (validation?: { query?: z.ZodSchema }): ApiRouteConfig => ({
    method: 'GET',
    requireAuth: false,
    validation,
    timeout: 30000
  }),
  
  // GET路由 - 需要认证
  protectedGet: (validation?: { query?: z.ZodSchema }): ApiRouteConfig => ({
    method: 'GET',
    requireAuth: true,
    validation,
    timeout: 30000
  }),
  
  // POST路由 - 需要认证和速率限制
  protectedPost: (validation?: { body?: z.ZodSchema; query?: z.ZodSchema }): ApiRouteConfig => ({
    method: 'POST',
    requireAuth: true,
    rateLimit: { requests: 100, windowMs: 60000 }, // 每分钟100次
    validation,
    timeout: 60000
  }),
  
  // PUT路由 - 需要认证和速率限制
  protectedPut: (validation?: { body?: z.ZodSchema; query?: z.ZodSchema }): ApiRouteConfig => ({
    method: 'PUT',
    requireAuth: true,
    rateLimit: { requests: 100, windowMs: 60000 }, // 每分钟100次
    validation,
    timeout: 60000
  }),
  
  // 文件上传路由
  fileUpload: (validation?: { body?: z.ZodSchema }): ApiRouteConfig => ({
    method: 'POST',
    requireAuth: true,
    rateLimit: { requests: 20, windowMs: 60000 }, // 每分钟20次
    validation,
    timeout: 300000 // 5分钟
  }),
  
  // 管理员路由
  admin: (method: 'GET' | 'POST' | 'PUT' | 'DELETE', validation?: any): ApiRouteConfig => ({
    method,
    requireAuth: true,
    rateLimit: { requests: 200, windowMs: 60000 },
    validation,
    timeout: 60000
  })
};

// 导出便捷函数
export const GET = (handler: ApiHandler, config?: Partial<ApiRouteConfig>) => 
  createApiRoute({ ...RouteConfigs.publicGet(), ...config }, handler);

export const POST = (handler: ApiHandler, config?: Partial<ApiRouteConfig>) => 
  createApiRoute({ ...RouteConfigs.protectedPost(), ...config }, handler);

export const PUT = (handler: ApiHandler, config?: Partial<ApiRouteConfig>) => 
  createApiRoute({ method: 'PUT', requireAuth: true, timeout: 60000, ...config }, handler);

export const DELETE = (handler: ApiHandler, config?: Partial<ApiRouteConfig>) => 
  createApiRoute({ method: 'DELETE', requireAuth: true, timeout: 30000, ...config }, handler);