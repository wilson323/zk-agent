/**
 * API路由工厂
 * 统一的API路由创建和中间件管理
 */

import { NextRequest, NextResponse } from 'next/server'
import { z, ZodSchema } from 'zod'
import { extractTokenFromRequest, verifyToken, type User } from '@/lib/auth/auth-utils'
import { Logger, defaultLogger } from "@/lib/utils/logger"

// 路由处理器类型
export type RouteHandler<T = any> = (
  request: NextRequest,
  context: RouteContext<T>
) => Promise<NextResponse> | NextResponse

// 路由上下文
export interface RouteContext<T = any> {
  params: Record<string, string>
  user?: User
  validatedBody?: T
  validatedQuery?: Record<string, any>
  requestId: string
}

// 导入统一的错误代码枚举和类型
import { ErrorCode, ErrorType, ErrorSeverity } from '@/lib/types/enums';
import { ApiResponse, ErrorInfo } from '@/lib/types/interfaces';

/**
 * 生成请求ID
 */
function getRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// 路由配置选项
export interface RouteOptions<T = any> {
  // 认证要求
  requireAuth?: boolean
  requireAdmin?: boolean
  
  // 验证模式
  bodySchema?: ZodSchema<T>
  querySchema?: ZodSchema
  
  // 速率限制
  rateLimit?: {
    windowMs: number
    maxRequests: number
  }
  
  // 缓存设置
  cache?: {
    ttl: number
    key?: string
  }
  
  // 日志级别
  logLevel?: 'debug' | 'info' | 'warn' | 'error'
}

/**
 * API 响应包装器
 */
export class ApiResponseWrapper {
  /**
   * 创建成功响应
   */
  static success<T>(data: T, message = '操作成功', meta?: Record<string, any>): NextResponse {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: getRequestId(),
        version: process.env.APP_VERSION || '1.0.0',
        ...meta
      }
    }
    
    return NextResponse.json(response)
  }
  
  /**
   * 创建错误响应
   */
  static error(
    code: ErrorCode,
    message: string,
    details: any = null,
    status = 400
  ): NextResponse {
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      message,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: getRequestId(),
        version: process.env.APP_VERSION || '1.0.0'
      },
      error: {
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
        type: ErrorType.SYSTEM,
        severity: ErrorSeverity.HIGH
      }
    }
    
    return NextResponse.json(response, { status })
  }
}

/**
 * 创建API路由处理器
 */
export function createApiRoute<T = any>(
  handler: RouteHandler<T>,
  options: RouteOptions<T> = {}
) {
  return async (
    request: NextRequest,
    params?: { params: Record<string, string> }
  ): Promise<NextResponse> => {
    const requestId = getRequestId()
    const startTime = Date.now()
    
    try {
      // 日志记录请求开始
      defaultLogger.info('API Request Started', {
        method: request.method,
        url: request.url,
        requestId,
        userAgent: request.headers.get('user-agent') || undefined
      })
      
      // 创建路由上下文
      const context: RouteContext<T> = {
        params: params?.params || {},
        requestId
      }
      
      // 认证检查
      if (options.requireAuth) {
        const token = extractTokenFromRequest(request)
        if (!token) {
          return ApiResponseWrapper.error(
            ErrorCode.UNAUTHORIZED,
            '需要认证令牌',
            null,
            401
          )
        }
        
        const payload = verifyToken(token)
        if (!payload) {
          return ApiResponseWrapper.error(
            ErrorCode.UNAUTHORIZED,
            '无效的认证令牌',
            null,
            401
          )
        }
        
        context.user = {
          id: payload.userId,
          email: payload.email,
          role: payload.role as 'user' | 'admin'
        }
        
        // 检查管理员权限
        if (options.requireAdmin && context.user.role !== 'admin') {
          return ApiResponseWrapper.error(
            ErrorCode.FORBIDDEN,
            '需要管理员权限',
            null,
            403
          )
        }
      }
      
      // 请求体验证
      if (options.bodySchema && request.method !== 'GET') {
        try {
          const body = await request.json()
          context.validatedBody = options.bodySchema.parse(body)
        } catch (error) {
          if (error instanceof z.ZodError) {
            return ApiResponseWrapper.error(
              ErrorCode.VALIDATION_ERROR,
              '请求体验证失败',
              error.errors
            )
          }
          throw error
        }
      }
      
      // 查询参数验证
      if (options.querySchema) {
        try {
          const searchParams = new URLSearchParams(request.nextUrl.search)
          const query = Object.fromEntries(searchParams.entries())
          context.validatedQuery = options.querySchema.parse(query)
        } catch (error) {
          if (error instanceof z.ZodError) {
            return ApiResponseWrapper.error(
              ErrorCode.VALIDATION_ERROR,
              '查询参数验证失败',
              error.errors
            )
          }
          throw error
        }
      }
      
      // 执行路由处理器
      const response = await handler(request, context)
      
      // 日志记录请求完成
      const duration = Date.now() - startTime
      defaultLogger.info('API Request Completed', {
        method: request.method,
        url: request.url,
        requestId,
        duration,
        status: response.status
      })
      
      return response
      
    } catch (error) {
      // 错误处理
      const duration = Date.now() - startTime
      defaultLogger.error('API Request Failed', {
        method: request.method,
        url: request.url,
        requestId,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      
      return ApiResponseWrapper.error(
        ErrorCode.INTERNAL_ERROR,
        '内部服务器错误',
        process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : error) : undefined,
        500
      )
    }
  }
}

/**
 * 常用验证模式
 */
export const CommonValidations = {
  // 分页参数
  pagination: z.object({
    page: z.string().optional().transform(val => val ? parseInt(val) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).optional()
  }),
  
  // ID参数
  id: z.object({
    id: z.string().uuid('无效的ID格式')
  }),
  
  // 搜索参数
  search: z.object({
    q: z.string().optional(),
    filter: z.string().optional(),
    category: z.string().optional()
  }),
  
  // 时间范围
  timeRange: z.object({
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional()
  })
}

/**
 * 路由配置预设
 */
export const RouteConfigs = {
  // 公开路由
  public: {
    requireAuth: false,
    logLevel: 'info' as const
  },
  
  // 需要认证的路由
  authenticated: {
    requireAuth: true,
    logLevel: 'info' as const
  },
  
  // 管理员路由
  admin: {
    requireAuth: true,
    requireAdmin: true,
    logLevel: 'warn' as const
  },
  
  // 数据修改路由
  mutation: {
    requireAuth: true,
    logLevel: 'warn' as const,
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15分钟
      maxRequests: 100
    }
  }
}

/**
 * 创建分页响应
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  return {
    items: data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  }
}

/**
 * 标准化错误处理
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof z.ZodError) {
    return ApiResponseWrapper.error(
      ErrorCode.VALIDATION_ERROR,
      '数据验证失败',
      error.errors,
      400
    )
  }
  
  if (error instanceof Error) {
    return ApiResponseWrapper.error(
      ErrorCode.INTERNAL_ERROR,
      error.message,
      process.env.NODE_ENV === 'development' ? error.stack : undefined,
      500
    )
  }
  
  return ApiResponseWrapper.error(
    ErrorCode.INTERNAL_ERROR,
    '未知错误',
    undefined,
    500
  )
}