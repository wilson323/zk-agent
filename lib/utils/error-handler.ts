/**
 * @file 错误处理工具
 * @description 统一的错误处理、分类和日志记录
 * @author ZK-Agent Team
 * @date 2024-01-20
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { ERROR_CODES } from '@/config/constants';
import { log } from './logger';
import { ErrorType, ErrorSeverity } from '../types/enums';

// 应用错误接口
export interface IAppError {
  type: ErrorType;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  statusCode: number;
  severity: ErrorSeverity;
  timestamp: Date;
  requestId?: string;
  userId?: string;
  stack?: string;
  context?: Record<string, unknown>;
}

/**
 * 应用错误基类
 */
export class AppError extends Error implements IAppError {
  public readonly type: ErrorType;
  public readonly code: string;
  public readonly statusCode: number;
  public readonly severity: ErrorSeverity;
  public readonly timestamp: Date;
  public readonly requestId?: string;
  public readonly userId?: string;
  public readonly details?: Record<string, unknown>;
  public readonly context?: Record<string, unknown>;

  constructor(
    type: ErrorType,
    code: string,
    message: string,
    statusCode: number = 500,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    details?: Record<string, unknown>,
    context?: Record<string, unknown>
  ) {
    super(message);
    
    this.name = 'AppError';
    this.type = type;
    this.code = code;
    this.statusCode = statusCode;
    this.severity = severity;
    this.timestamp = new Date();
    this.details = details;
    this.context = context;

    // 保持堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * 设置请求ID
   */
  setRequestId(requestId: string): this {
    (this as { requestId?: string }).requestId = requestId;
    return this;
  }

  /**
   * 设置用户ID
   */
  setUserId(userId: string): this {
    (this as { userId?: string }).userId = userId;
    return this;
  }

  /**
   * 转换为JSON格式
   */
  toJSON(): IAppError {
    return {
      type: this.type,
      code: this.code,
      message: this.message,
      details: this.details,
      statusCode: this.statusCode,
      severity: this.severity,
      timestamp: this.timestamp,
      requestId: this.requestId,
      userId: this.userId,
      stack: this.stack,
      context: this.context,
    };
  }
}

/**
 * 验证错误
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>, context?: Record<string, unknown>) {
    super(
      ErrorType.VALIDATION,
      ERROR_CODES.VALIDATION_REQUIRED_FIELD,
      message,
      400,
      ErrorSeverity.LOW,
      details,
      context
    );
  }
}

/**
 * 认证错误
 */
export class AuthenticationError extends AppError {
  constructor(message: string = '认证失败', details?: Record<string, unknown>, context?: Record<string, unknown>) {
    super(
      ErrorType.AUTHENTICATION,
      ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      message,
      401,
      ErrorSeverity.MEDIUM,
      details,
      context
    );
  }
}

/**
 * 授权错误
 */
export class AuthorizationError extends AppError {
  constructor(message: string = '权限不足', details?: Record<string, unknown>, context?: Record<string, unknown>) {
    super(
      ErrorType.AUTHORIZATION,
      ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS,
      message,
      403,
      ErrorSeverity.MEDIUM,
      details,
      context
    );
  }
}

/**
 * 资源未找到错误
 */
export class NotFoundError extends AppError {
  constructor(resource: string = '资源', details?: Record<string, unknown>, context?: Record<string, unknown>) {
    super(
      ErrorType.NOT_FOUND,
      ERROR_CODES.RESOURCE_NOT_FOUND,
      `${resource}未找到`,
      404,
      ErrorSeverity.LOW,
      details,
      context
    );
  }
}

/**
 * 冲突错误
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>, context?: Record<string, unknown>) {
    super(
      ErrorType.CONFLICT,
      ERROR_CODES.RESOURCE_ALREADY_EXISTS,
      message,
      409,
      ErrorSeverity.MEDIUM,
      details,
      context
    );
  }
}

/**
 * 速率限制错误
 */
export class RateLimitError extends AppError {
  constructor(message: string = '请求过于频繁', details?: Record<string, unknown>, context?: Record<string, unknown>) {
    super(
      ErrorType.RATE_LIMIT,
      ERROR_CODES.RATE_LIMIT_EXCEEDED,
      message,
      429,
      ErrorSeverity.LOW,
      details,
      context
    );
  }
}

/**
 * 外部服务错误
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, details?: Record<string, unknown>, context?: Record<string, unknown>) {
    super(
      ErrorType.EXTERNAL_SERVICE,
      ERROR_CODES.SERVICE_UNAVAILABLE,
      `${service}服务异常: ${message}`,
      503,
      ErrorSeverity.HIGH,
      details,
      context
    );
  }
}

/**
 * 数据库错误
 */
export class DatabaseError extends AppError {
  constructor(message: string, details?: Record<string, unknown>, context?: Record<string, unknown>) {
    super(
      ErrorType.DATABASE,
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      `数据库错误: ${message}`,
      500,
      ErrorSeverity.HIGH,
      details,
      context
    );
  }
}

/**
 * 业务逻辑错误
 */
export class BusinessLogicError extends AppError {
  constructor(message: string, details?: Record<string, unknown>, context?: Record<string, unknown>) {
    super(
      ErrorType.BUSINESS_LOGIC,
      ERROR_CODES.OPERATION_FAILED,
      message,
      400,
      ErrorSeverity.MEDIUM,
      details,
      context
    );
  }
}

/**
 * 错误处理器类
 */
export class ErrorHandler {
  /**
   * 处理错误并返回适当的响应
   */
  static handleError(error: unknown, requestId?: string, userId?: string): NextResponse {
    const appError = this.normalizeError(error, requestId, userId);
    
    // 记录错误日志
    this.logError(appError);
    
    // 返回用户友好的响应
    return this.createErrorResponse(appError);
  }

  /**
   * 将任意错误转换为AppError
   */
  static normalizeError(error: unknown, requestId?: string, userId?: string): AppError {
    if (error instanceof AppError) {
      if (requestId) {error.setRequestId(requestId);}
      if (userId) {error.setUserId(userId);}
      return error;
    }

    if (error instanceof ZodError) {
      const validationError = new ValidationError(
        '数据验证失败',
        { errors: error.errors },
        { zodError: true }
      );
      if (requestId) {validationError.setRequestId(requestId);}
      if (userId) {validationError.setUserId(userId);}
      return validationError;
    }

    if (error instanceof Error) {
      // 检查常见的错误类型
      if (error.message.includes('ENOENT')) {
        const fileError = new AppError(
          ErrorType.FILE_SYSTEM,
          ERROR_CODES.RESOURCE_NOT_FOUND,
          '文件未找到',
          404,
          ErrorSeverity.LOW,
          { originalError: error.message }
        );
        if (requestId) {fileError.setRequestId(requestId);}
        if (userId) {fileError.setUserId(userId);}
        return fileError;
      }

      if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
        const networkError = new AppError(
          ErrorType.NETWORK,
          ERROR_CODES.SERVICE_UNAVAILABLE,
          '网络连接失败',
          503,
          ErrorSeverity.HIGH,
          { originalError: error.message }
        );
        if (requestId) {networkError.setRequestId(requestId);}
        if (userId) {networkError.setUserId(userId);}
        return networkError;
      }

      // 通用错误处理
      const systemError = new AppError(
        ErrorType.SYSTEM,
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        error.message || '系统内部错误',
        500,
        ErrorSeverity.HIGH,
        { originalError: error.message, stack: error.stack }
      );
      if (requestId) {systemError.setRequestId(requestId);}
      if (userId) {systemError.setUserId(userId);}
      return systemError;
    }

    // 未知错误
    const unknownError = new AppError(
      ErrorType.UNKNOWN,
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      '未知错误',
      500,
      ErrorSeverity.CRITICAL,
      { originalError: String(error) }
    );
    if (requestId) {unknownError.setRequestId(requestId);}
    if (userId) {unknownError.setUserId(userId);}
    return unknownError;
  }

  /**
   * 记录错误日志
   */
  static logError(error: AppError): void {
    const logContext = {
      type: error.type,
      code: error.code,
      severity: error.severity,
      statusCode: error.statusCode,
      requestId: error.requestId,
      userId: error.userId,
      details: error.details,
      context: error.context,
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        log.error(error.message, error, logContext);
        break;
      case ErrorSeverity.MEDIUM:
        log.warn(error.message, logContext);
        break;
      case ErrorSeverity.LOW:
        log.info(error.message, logContext);
        break;
      default:
        log.error(error.message, error, logContext);
    }
  }

  /**
   * 创建错误响应
   */
  static createErrorResponse(error: AppError): NextResponse {
    // 生产环境下隐藏敏感信息
    const isProduction = process.env.NODE_ENV === 'production';
    
    const responseBody: Record<string, unknown> = {
      error: {
        code: error.code,
        message: error.message,
        type: error.type,
        timestamp: error.timestamp.toISOString(),
      },
    };

    // 开发环境下包含更多调试信息
    if (!isProduction) {
      (responseBody.error as any).details = error.details;
      (responseBody.error as any).stack = error.stack;
      (responseBody.error as any).requestId = error.requestId;
    }

    // 对于验证错误，始终包含详细信息
    if (error.type === ErrorType.VALIDATION) {
      (responseBody.error as any).details = error.details;
    }

    return NextResponse.json(responseBody, {
      status: error.statusCode,
      headers: {
        'Content-Type': 'application/json',
        'X-Error-Code': error.code,
        'X-Error-Type': error.type,
        ...(error.requestId && { 'X-Request-ID': error.requestId }),
      },
    });
  }

  /**
   * 异步错误处理包装器
   */
  static asyncHandler<T extends unknown[]>(
    handler: (req: { headers?: { get: (key: string) => string | null }; user?: { id: string } }, ...args: T) => Promise<NextResponse>
  ) {
    return async (req: { headers?: { get: (key: string) => string | null }; user?: { id: string } }, ...args: T): Promise<NextResponse> => {
      try {
        return await handler(req, ...args);
      } catch (error) {
        const requestId = req.headers?.get('x-request-id') || 
                         req.headers?.get('x-correlation-id') ||
                         crypto.randomUUID();
        
        const userId = req.user?.id;
        
        return this.handleError(error, requestId, userId);
      }
    };
  }
}

/**
 * 错误处理装饰器
 */
export function handleErrors(
  target: unknown,
  propertyName: string,
  descriptor: PropertyDescriptor
): void {
  const method = descriptor.value;

  descriptor.value = async function (...args: unknown[]) {
    try {
      return await method.apply(this, args);
    } catch (error) {
      return ErrorHandler.handleError(error);
    }
  };
}

/**
 * 便捷的错误创建函数
 */
export const createError = {
  validation: (message: string, details?: Record<string, unknown>) => new ValidationError(message, details),
  authentication: (message?: string, details?: Record<string, unknown>) => new AuthenticationError(message, details),
  authorization: (message?: string, details?: Record<string, unknown>) => new AuthorizationError(message, details),
  notFound: (resource?: string, details?: Record<string, unknown>) => new NotFoundError(resource, details),
  conflict: (message: string, details?: Record<string, unknown>) => new ConflictError(message, details),
  rateLimit: (message?: string, details?: Record<string, unknown>) => new RateLimitError(message, details),
  externalService: (service: string, message: string, details?: Record<string, unknown>) => 
    new ExternalServiceError(service, message, details),
  database: (message: string, details?: Record<string, unknown>) => new DatabaseError(message, details),
  businessLogic: (message: string, details?: Record<string, unknown>) => new BusinessLogicError(message, details),
  system: (message: string, details?: Record<string, unknown>) => new AppError(
    ErrorType.SYSTEM,
    ERROR_CODES.INTERNAL_SERVER_ERROR,
    message,
    500,
    ErrorSeverity.HIGH,
    details
  ),
};

// 导出默认错误处理器
export default ErrorHandler;

/**
 * 安全获取错误消息
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'Unknown error';
}

/**
 * 安全获取错误堆栈
 */
export function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  return undefined;
}

/**
 * 安全获取错误代码
 */
export function getErrorCode(error: unknown): string | number | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    return error.code as string | number;
  }
  return undefined;
}

/**
 * 安全获取错误状态码
 */
export function getErrorStatusCode(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'statusCode' in error) {
    return error.statusCode as number;
  }
  if (error && typeof error === 'object' && 'status' in error) {
    return error.status as number;
  }
  return undefined;
}

/**
 * 检查是否为特定类型的错误
 */
export function isErrorWithCode(error: unknown, code: string | number): boolean {
  const errorCode = getErrorCode(error);
  return errorCode === code;
}

/**
 * 检查是否为网络错误
 */
export function isNetworkError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes('network') || 
         message.includes('fetch') || 
         message.includes('connection') ||
         message.includes('timeout');
}

/**
 * 检查是否为文件不存在错误
 */
export function isFileNotFoundError(error: unknown): boolean {
  return isErrorWithCode(error, 'ENOENT') || 
         getErrorStatusCode(error) === 404;
}

/**
 * 创建标准化的错误对象
 */
export function createStandardError(
  message: string,
  code?: string | number,
  statusCode?: number,
  originalError?: unknown
): Error & { code?: string | number; statusCode?: number; originalError?: unknown } {
  const error = new Error(message) as Error & { 
    code?: string | number; 
    statusCode?: number; 
    originalError?: unknown;
  };
  
  if (code !== undefined) {
    error.code = code;
  }
  if (statusCode !== undefined) {
    error.statusCode = statusCode;
  }
  if (originalError !== undefined) {
    error.originalError = originalError;
  }
  
  return error;
}

/**
 * 安全的错误转换为JSON
 */
export function errorToJSON(error: unknown): Record<string, unknown> {
  return {
    message: getErrorMessage(error),
    stack: getErrorStack(error),
    code: getErrorCode(error),
    statusCode: getErrorStatusCode(error),
    type: error?.constructor?.name || 'Unknown',
  };
}