/**
 * @file Unified Error Handler
 * @description 统一异常处理系统，解决API路由中异常处理不一致的问题
 * @author ZK-Agent Team
 * @date 2025-01-27
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { ErrorHandler } from '../utils/error-handler';
import { ApiResponseWrapper } from '../utils/api-helper';
import { ErrorCode, ErrorType, ErrorSeverity } from '@/lib/types/enums';
import { Logger } from '../utils/logger';

// 导入统一接口定义
import type { ErrorHandlingConfig } from '../types/interfaces';

// 导入统一默认配置
import { ERROR_HANDLING_DEFAULT_CONFIG } from '../constants';

// 默认配置
const DEFAULT_CONFIG: ErrorHandlingConfig = ERROR_HANDLING_DEFAULT_CONFIG;

/**
 * 统一异常处理装饰器
 * 用于包装API路由处理函数，提供统一的异常处理
 */
export function withUnifiedErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<NextResponse<R>>,
  config: ErrorHandlingConfig = {}
) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  return async (...args: T): Promise<NextResponse<R>> => {
    const startTime = Date.now();
    const requestId = generateRequestId();
    
    try {
      // 执行原始处理函数
      const result = await handler(...args);
      
      // 记录成功指标
      if (finalConfig.enableMetrics) {
        recordSuccessMetrics(requestId, Date.now() - startTime);
      }
      
      return result;
    } catch (error) {
      // 统一异常处理
      return await handleUnifiedException(
        error,
        requestId,
        finalConfig,
        Date.now() - startTime
      ) as NextResponse<R>;
    }
  };
}

/**
 * 统一异常处理核心函数
 */
async function handleUnifiedException(
  error: any,
  requestId: string,
  config: ErrorHandlingConfig,
  processingTime: number
): Promise<NextResponse> {
  // 1. 错误标准化
  const normalizedError = ErrorHandler.normalizeError(error);
  
  // 2. 错误分类和映射
  const errorResponse = mapErrorToResponse(normalizedError);
  
  // 3. 记录错误日志
  if (config.enableLogging) {
    await logError(normalizedError, requestId, processingTime);
  }
  
  // 4. 记录错误指标
  if (config.enableMetrics) {
    recordErrorMetrics(normalizedError, requestId, processingTime);
  }
  
  // 5. 敏感信息过滤
  const sanitizedResponse = sanitizeErrorResponse(errorResponse, config.sensitiveFields);
  
  return sanitizedResponse;
}

/**
 * 错误到响应的映射
 */
function mapErrorToResponse(error: any): NextResponse {
  // Zod验证错误
  if (error instanceof ZodError) {
    const code = ErrorCode.VALIDATION_ERROR;
    return ApiResponseWrapper.error(
      code,
      error.message || '数据验证失败',
      {
        validationErrors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      },
      400,
      
    );
  }
  
  // 数据库错误
  if (error.name === 'PrismaClientKnownRequestError') {
    return handleDatabaseError(error);
  }
  
  // 网络错误
  if (isNetworkError(error)) {
    return ApiResponseWrapper.error(
      ErrorCode.SERVICE_UNAVAILABLE,
      'External service unavailable',
      { retryAfter: 30 },
      
    );
  }
  
  // 超时错误
  if (isTimeoutError(error)) {
    return ApiResponseWrapper.error(
      ErrorCode.REQUEST_TIMEOUT,
      'Request timeout',
      { timeout: true },
      408,
      ErrorType.NETWORK,
      ErrorSeverity.HIGH
    );
  }
  
  // 权限错误
  if (isAuthError(error)) {
    const code = ErrorCode.UNAUTHORIZED;
    return ApiResponseWrapper.error(
      code,
      error.message || '认证或授权失败',
      null,
      401,
      ErrorType.AUTHENTICATION,
      ErrorSeverity.HIGH
    );
  }
  
  // 业务逻辑错误
  if (isBusinessError(error)) {
    const code = ErrorCode.BUSINESS_LOGIC_ERROR;
    return ApiResponseWrapper.error(
      code,
      error.message || '业务逻辑错误',
      { businessCode: error.code },
      400,
      ErrorType.BUSINESS_LOGIC,
      ErrorSeverity.MEDIUM
    );
  }
  
  // 默认内部服务器错误
  const code = ErrorCode.INTERNAL_ERROR;
  return ApiResponseWrapper.error(
    code,
    '内部服务器错误',
    process.env.NODE_ENV === 'development' ? {
      stack: error.stack,
      message: error.message
    } : null,
    500,
    ErrorType.SYSTEM,
    ErrorSeverity.CRITICAL
  );
}

/**
 * 数据库错误处理
 */
function handleDatabaseError(error: any): NextResponse {
  switch (error.code) {
    case 'P2002': // Unique constraint violation
      return ApiResponseWrapper.error(
        ErrorCode.CONFLICT,
        'Resource already exists',
        { field: error.meta?.target },
        409,
        ErrorType.DATABASE,
        ErrorSeverity.MEDIUM
      );
    case 'P2025': // Record not found
      return ApiResponseWrapper.error(
        ErrorCode.NOT_FOUND,
        'Resource not found',
        null,
        404,
        ErrorType.DATABASE,
        ErrorSeverity.LOW
      );
    case 'P2003': // Foreign key constraint violation
      return ApiResponseWrapper.error(
        ErrorCode.VALIDATION_ERROR,
        'Invalid reference',
        { field: error.meta?.field_name },
        400,
        ErrorType.DATABASE,
        ErrorSeverity.MEDIUM
      );
    default:
      return ApiResponseWrapper.error(
        ErrorCode.INTERNAL_ERROR,
        'Database operation failed',
        null,
        500,
        ErrorType.DATABASE,
        ErrorSeverity.CRITICAL
      );
  }
}

/**
 * 错误类型判断函数
 */
function isNetworkError(error: any): boolean {
  return error.code === 'ECONNREFUSED' || 
         error.code === 'ENOTFOUND' || 
         error.code === 'ECONNRESET';
}

function isTimeoutError(error: any): boolean {
  return error.code === 'ETIMEDOUT' || 
         error.message?.includes('timeout') ||
         error.name === 'TimeoutError';
}

function isAuthError(error: any): boolean {
  return error.message?.includes('unauthorized') ||
         error.message?.includes('forbidden') ||
         error.status === 401 ||
         error.status === 403;
}

function isBusinessError(error: any): boolean {
  return error.type === 'BusinessError' ||
         error.name === 'BusinessError' ||
         error.isBusinessError === true;
}

/**
 * 错误日志记录
 */
async function logError(
  error: any,
  requestId: string,
  processingTime: number
): Promise<void> {
  const logger = new Logger('UnifiedErrorHandler');
  
  const logData = {
    requestId,
    processingTime,
    errorType: error.constructor.name,
    errorMessage: error.message,
    errorStack: error.stack,
    timestamp: new Date().toISOString()
  };
  
  // 根据错误严重程度选择日志级别
  if (error.severity === ErrorSeverity.CRITICAL) {
    logger.error('Critical error occurred', logData);
  } else if (error.severity === ErrorSeverity.HIGH) {
    logger.warn('High severity error occurred', logData);
  } else {
    logger.info('Error occurred', logData);
  }
}

/**
 * 错误指标记录
 */
function recordErrorMetrics(
  error: any,
  requestId: string,
  processingTime: number
): void {
  // 这里可以集成监控系统，如 Prometheus、DataDog 等
  console.log(`[ERROR_METRICS] ${requestId}: ${error.constructor.name} - ${processingTime}ms`);
}

/**
 * 成功指标记录
 */
function recordSuccessMetrics(
  requestId: string,
  processingTime: number
): void {
  console.log(`[SUCCESS_METRICS] ${requestId}: Success - ${processingTime}ms`);
}

/**
 * 敏感信息过滤
 */
function sanitizeErrorResponse(
  response: NextResponse,
  sensitiveFields: string[] = []
): NextResponse {
  // 在生产环境中过滤敏感信息
  if (process.env.NODE_ENV === 'production') {
    // 实现敏感信息过滤逻辑
    // 这里可以根据需要实现具体的过滤逻辑
  }
  
  return response;
}

/**
 * 生成请求ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 创建统一的API路由处理器
 */
export function createUnifiedApiRoute<T = any>(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse<T>>,
  config?: ErrorHandlingConfig
) {
  return withUnifiedErrorHandling(handler, config);
}

/**
 * 异步操作包装器
 */
export function wrapAsyncOperation<T>(
  operation: () => Promise<T>,
  errorContext?: string
): Promise<T> {
  return operation().catch(error => {
    if (errorContext) {
      error.context = errorContext;
    }
    throw error;
  });
}

/**
 * 批量操作错误处理
 */
export async function handleBatchOperation<T, R>(
  items: T[],
  operation: (item: T) => Promise<R>,
  options: {
    continueOnError?: boolean;
    maxConcurrency?: number;
  } = {}
): Promise<{ results: R[]; errors: any[] }> {
  const { continueOnError = true, maxConcurrency = 5 } = options;
  const results: R[] = [];
  const errors: any[] = [];
  
  // 分批处理以控制并发
  for (let i = 0; i < items.length; i += maxConcurrency) {
    const batch = items.slice(i, i + maxConcurrency);
    const batchPromises = batch.map(async (item, index) => {
      try {
        const result = await operation(item);
        return { success: true, result, index: i + index };
      } catch (error) {
        return { success: false, error, index: i + index };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    
    for (const batchResult of batchResults) {
      if (batchResult.success) {
        results[batchResult.index] = batchResult.result as R;
      } else {
        errors.push({
          index: batchResult.index,
          item: items[batchResult.index],
          error: batchResult.error
        });
        
        if (!continueOnError) {
          throw batchResult.error;
        }
      }
    }
  }
  
  return { results, errors };
}