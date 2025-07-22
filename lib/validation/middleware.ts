/* eslint-disable */
// @ts-nocheck
/**
 * @file lib/validation/middleware.ts
 * @description 验证中间件模块 - 为现有API路由提供zod验证增强
 * @author zk-agent开发团队
 * @lastUpdate 2024-12-19
 * @updateLog
 *   - 2024-12-19 创建验证中间件，增强现有API安全性
 *
 * 🔤 命名规范说明：
 * - 中间件函数：with + 功能描述（如：withValidation）
 * - 验证装饰器：validate + 对象（如：validateRequest）
 * - 错误处理：handle + 错误类型（如：handleValidationError）
 *
 * ⚠️ 本模块为现有API路由的增强，保持向后兼容性
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { ValidationResult } from './schemas';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();

const logger = getLogger();

// 📝 命名规范：中间件配置类型
export interface ValidationMiddlewareConfig {
  // 验证选项
  validateBody?: z.ZodSchema;
  validateQuery?: z.ZodSchema;
  validateHeaders?: z.ZodSchema;
  validateParams?: z.ZodSchema;

  // 错误处理选项
  onValidationError?: (error: ValidationError) => NextResponse;

  // 安全选项
  sanitizeInput?: boolean;
  enableCSRF?: boolean;
  enableRateLimit?: boolean;

  // 调试选项
  debug?: boolean;
}

// 📝 命名规范：验证错误类型
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: Array<{
      path: (string | number)[];
      message: string;
      code: string;
    }>,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// 📝 命名规范：验证结果扩展类型
export interface ValidatedRequest extends NextRequest {
  validatedBody?: any;
  validatedQuery?: any;
  validatedHeaders?: any;
  validatedParams?: any;
}

// 📝 命名规范：API处理函数类型
export type APIHandler = (
  request: ValidatedRequest,
  context?: { params?: any }
) => Promise<NextResponse> | NextResponse;

// 📝 命名规范：主要验证中间件函数
export function withValidation(config: ValidationMiddlewareConfig) {
  return function middleware(handler: APIHandler) {
    return async function validatedHandler(
      request: NextRequest,
      context?: { params?: any }
    ): Promise<NextResponse> {
      try {
        const validatedRequest: any = request as ValidatedRequest;

        // 验证请求体
        if (config.validateBody) {
          const body: any = await safeParseJSON(request);
          const bodyResult: any = validateWithSchema(config.validateBody, body, 'request body');

          if (!bodyResult.success) {
            return handleValidationError(bodyResult.error, config);
          }

          validatedRequest.validatedBody = bodyResult.data;
        }

        // 验证查询参数
        if (config.validateQuery) {
          const query: any = Object.fromEntries(new URL(request.url).searchParams.entries());
          const queryResult: any = validateWithSchema(
            config.validateQuery,
            query,
            'query parameters'
          );

          if (!queryResult.success) {
            return handleValidationError(queryResult.error, config);
          }

          validatedRequest.validatedQuery = queryResult.data;
        }

        // 验证请求头
        if (config.validateHeaders) {
          const headers: any = Object.fromEntries(request.headers.entries());
          const headersResult: any = validateWithSchema(config.validateHeaders, headers, 'headers');

          if (!headersResult.success) {
            return handleValidationError(headersResult.error, config);
          }

          validatedRequest.validatedHeaders = headersResult.data;
        }

        // 验证路径参数
        if (config.validateParams && context?.params) {
          const paramsResult: any = validateWithSchema(
            config.validateParams,
            context.params,
            'path parameters'
          );

          if (!paramsResult.success) {
            return handleValidationError(paramsResult.error, config);
          }

          validatedRequest.validatedParams = paramsResult.data;
        }

        // 调用原始处理函数
        return await handler(validatedRequest, context);
      } catch (error) {
        if (config.debug) {
          logger.error('[ValidationMiddleware] 验证中间件错误:', error);
        }

        if (error instanceof ValidationError) {
          return handleValidationError(error, config);
        }

        // 处理其他错误
        return NextResponse.json(
          {
            error: '服务器内部错误',
            message: error instanceof Error ? error.message : '未知错误',
          },
          { status: 500 }
        );
      }
    };
  };
}

// 📝 命名规范：验证工具函数
function validateWithSchema<T extends z.ZodSchema>(
  schema: T,
  data: unknown,
  context: string
): ValidationResult<z.infer<T>> {
  try {
    const validData: any = schema.parse(data);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: new ValidationError(
          `${context} validation failed`,
          {
            issues: error.issues.map(issue => ({
              path: issue.path,
              message: issue.message,
              code: issue.code,
            }))
          },
          400
        ),
      };
    }

    return {
      success: false,
      error: new ValidationError(
        `${context} validation error`,
        {
          issues: [{ path: [], message: 'Unknown validation error', code: 'unknown' }]
        },
        400
      ),
    };
  }
}

// 📝 命名规范：错误处理函数
function handleValidationError(
  error: ValidationError,
  config: ValidationMiddlewareConfig
): NextResponse {
  // 如果有自定义错误处理器，使用它
  if (config.onValidationError) {
    return config.onValidationError(error);
  }

  // 默认错误响应
  return NextResponse.json(
    {
      error: error.message,
      issues: error.issues,
      timestamp: new Date().toISOString(),
    },
    { status: error.statusCode }
  );
}

// 📝 命名规范：安全JSON解析函数
async function safeParseJSON(request: NextRequest): Promise<unknown> {
  try {
    const text: any = await request.text();
    if (!text.trim()) {
      return {};
    }
    return JSON.parse(text);
  } catch (error) {
    throw new ValidationError('Invalid JSON in request body', {
      issues: [{ path: ['body'], message: 'Request body must be valid JSON', code: 'invalid_json' }]
    });
  }
}

// 📝 命名规范：便捷验证装饰器
export const validateRequest: any = {
  // CAD文件上传验证
  cadFileUpload: (config?: Partial<ValidationMiddlewareConfig>) => {
    return withValidation({
      validateBody: z.object({
        file: z.object({
          name: z.string().regex(/\.(dwg|dxf|step|stp|iges|igs|stl|obj|gltf|glb)$/i),
          size: z.number().max(100 * 1024 * 1024),
          type: z.string(),
        }),
        options: z
          .object({
            precision: z.enum(['low', 'standard', 'high', 'ultra']).default('standard'),
            enableAI: z.boolean().default(true),
          })
          .optional(),
      }),
      ...config,
    });
  },

  // 聊天消息验证
  chatMessage: (config?: Partial<ValidationMiddlewareConfig>) => {
    return withValidation({
      validateBody: z.object({
        content: z.string().min(1).max(4000),
        type: z.enum(['text', 'file', 'image', 'system']).default('text'),
        role: z.enum(['user', 'assistant', 'system', 'tool']).default('user'),
        metadata: z.record(z.unknown()).optional(),
      }),
      ...config,
    });
  },

  // 用户认证验证
  userAuth: (config?: Partial<ValidationMiddlewareConfig>) => {
    return withValidation({
      validateBody: z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().min(1).max(100).optional(),
      }),
      ...config,
    });
  },

  // 智能体配置验证
  agentConfig: (config?: Partial<ValidationMiddlewareConfig>) => {
    return withValidation({
      validateBody: z.object({
        id: z.string().regex(/^[a-zA-Z0-9_-]+$/),
        name: z.string().min(1).max(50),
        type: z.enum(['fastgpt', 'cad', 'poster', 'custom']),
        description: z.string().max(500).optional(),
        capabilities: z.array(z.string()).max(20).default([]),
        config: z.record(z.unknown()).default({}),
        enabled: z.boolean().default(true),
        priority: z.number().min(0).max(100).default(50),
      }),
      ...config,
    });
  },
};

// 📝 命名规范：安全增强中间件
export function withSecurity(config: {
  enableCSRF?: boolean;
  enableRateLimit?: boolean;
  enableSanitization?: boolean;
  allowedOrigins?: string[];
  maxRequestSize?: number;
}) {
  return function securityMiddleware(handler: APIHandler) {
    return async function securedHandler(
      request: NextRequest,
      context?: { params?: any }
    ): Promise<NextResponse> {
      // CORS检查
      if (config.allowedOrigins) {
        const origin: any = request.headers.get('origin');
        if (origin && !config.allowedOrigins.includes(origin)) {
          return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 });
        }
      }

      // 请求大小检查
      if (config.maxRequestSize) {
        const contentLength: any = request.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > config.maxRequestSize) {
          return NextResponse.json({ error: 'Request too large' }, { status: 413 });
        }
      }

      // CSRF检查
      if (config.enableCSRF) {
        const csrfToken: any = request.headers.get('x-csrf-token');
        if (!csrfToken) {
          return NextResponse.json({ error: 'CSRF token required' }, { status: 403 });
        }
      }

      return await handler(request, context);
    };
  };
}

// 📝 命名规范：组合中间件工具
export function combineMiddleware(...middlewares: Array<(handler: APIHandler) => APIHandler>) {
  return function combinedMiddleware(handler: APIHandler): APIHandler {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
}

// 📝 命名规范：使用示例导出
export const exampleUsage: any = {
  // 基础验证示例
  basicValidation: withValidation({
    validateBody: z.object({
      name: z.string().min(1),
      email: z.string().email(),
    }),
  }),

  // 组合中间件示例
  fullProtection: combineMiddleware(
    withSecurity({
      enableCSRF: true,
      enableRateLimit: true,
      allowedOrigins: ['https://yourdomain.com'],
      maxRequestSize: 10 * 1024 * 1024, // 10MB
    }),
    validateRequest.userAuth({
      debug: process.env.NODE_ENV === 'development',
    })
  ),
};

// 导出类型（避免重复导出）
export type {
  ValidationMiddlewareConfig as VMConfig,
  ValidatedRequest as VRequest,
  APIHandler as Handler,
};
