/**
 * @file 应用错误类
 * @description 统一的应用错误处理类，用于标准化错误处理
 * @author ZK-Agent Team
 * @date 2024-12-27
 */

import { ErrorCode, ErrorType, ErrorSeverity } from '@/lib/types/enums';

/**
 * 错误上下文接口
 */
interface ErrorContext {
  /** 用户ID */
  userId?: string;
  /** 请求ID */
  requestId?: string;
  /** 会话ID */
  sessionId?: string;
  /** 操作类型 */
  operation?: string;
  /** 资源ID */
  resourceId?: string;
  /** 额外的上下文信息 */
  metadata?: Record<string, unknown>;
}

/**
 * 错误恢复策略接口
 */
interface ErrorRecoveryStrategy {
  /** 策略名称 */
  name: string;
  /** 是否可重试 */
  retryable: boolean;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试延迟(ms) */
  retryDelay?: number;
  /** 回退策略 */
  backoffStrategy?: 'linear' | 'exponential' | 'fixed';
  /** 恢复建议 */
  suggestions?: string[];
}

/**
 * 应用错误类
 * 提供统一的错误处理机制，包含错误代码、类型、严重程度等信息
 */
export class AppError extends Error {
  code: ErrorCode;
  type: ErrorType;
  severity: ErrorSeverity;
  details?: Record<string, unknown>;
  timestamp: string;
  statusCode: number;
  context?: ErrorContext;
  recoveryStrategy?: ErrorRecoveryStrategy;
  correlationId?: string;
  causedBy?: Error;
  retryCount: number = 0;

  // 静态方法声明
  static validation: (message: string, details?: Record<string, unknown>) => AppError;
  static unauthorized: (message: string, details?: Record<string, unknown>) => AppError;
  static forbidden: (message: string, details?: Record<string, unknown>) => AppError;
  static notFound: (message: string, details?: Record<string, unknown>) => AppError;
  static internal: (message: string, details?: Record<string, unknown>) => AppError;

  // 实例方法声明 - 已在下方实现
  toJSON(): Record<string, unknown>;

  /**
   * 创建应用错误实例
   * @param message 错误消息
   * @param code 错误代码
   * @param type 错误类型
   * @param severity 错误严重程度
   * @param details 错误详情
   */
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    type: ErrorType = ErrorType.SYSTEM,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    details?: Record<string, unknown>,
    statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.type = type;
    this.severity = severity;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.statusCode = statusCode;
    this.correlationId = this.generateCorrelationId();

    // 设置默认恢复策略
    this.setDefaultRecoveryStrategy();

    // 确保错误堆栈正确
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }

    // 确保 Error 的原型链正确
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * 生成关联ID
   */
  private generateCorrelationId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 设置默认恢复策略
   */
  private setDefaultRecoveryStrategy(): void {
    const retryableTypes = [ErrorType.NETWORK, ErrorType.EXTERNAL_SERVICE, ErrorType.TIMEOUT];
    const isRetryable = retryableTypes.includes(this.type);

    this.recoveryStrategy = {
      name: 'default',
      retryable: isRetryable,
      maxRetries: isRetryable ? 3 : 0,
      retryDelay: 1000,
      backoffStrategy: 'exponential',
      suggestions: this.getDefaultSuggestions(),
    };
  }

  /**
   * 获取默认建议
   */
  private getDefaultSuggestions(): string[] {
    switch (this.type) {
      case ErrorType.NETWORK:
        return ['检查网络连接', '验证服务端点可用性', '检查防火墙设置'];
      case ErrorType.AUTHENTICATION:
        return ['验证凭据有效性', '检查令牌是否过期', '重新登录'];
      case ErrorType.AUTHORIZATION:
        return ['检查用户权限', '联系管理员', '验证资源访问权限'];
      case ErrorType.VALIDATION:
        return ['检查输入数据格式', '验证必填字段', '确认数据类型正确'];
      case ErrorType.DATABASE:
        return ['检查数据库连接', '验证查询语法', '检查数据完整性'];
      case ErrorType.EXTERNAL_SERVICE:
        return ['检查外部服务状态', '验证API密钥', '检查服务限制'];
      default:
        return ['联系技术支持', '查看详细日志', '重试操作'];
    }
  }

  /**
   * 设置错误上下文
   */
  setContext(context: ErrorContext): this {
    this.context = { ...this.context, ...context };
    return this;
  }

  /**
   * 设置恢复策略
   */
  setRecoveryStrategy(strategy: Partial<ErrorRecoveryStrategy>): this {
    this.recoveryStrategy = { ...this.recoveryStrategy, ...strategy } as ErrorRecoveryStrategy;
    return this;
  }

  /**
   * 设置原因错误
   */
  setCausedBy(error: Error): this {
    this.causedBy = error;
    return this;
  }

  /**
   * 增加重试次数
   */
  incrementRetryCount(): this {
    this.retryCount++;
    return this;
  }

  /**
   * 检查是否可以重试
   */
  canRetry(): boolean {
    return (
      this.recoveryStrategy?.retryable === true &&
      this.retryCount < (this.recoveryStrategy?.maxRetries || 0)
    );
  }

  /**
   * 获取下次重试延迟
   */
  getRetryDelay(): number {
    if (!this.recoveryStrategy?.retryDelay) return 0;

    const baseDelay = this.recoveryStrategy.retryDelay;
    switch (this.recoveryStrategy.backoffStrategy) {
      case 'exponential':
        return baseDelay * Math.pow(2, this.retryCount);
      case 'linear':
        return baseDelay * (this.retryCount + 1);
      case 'fixed':
      default:
        return baseDelay;
    }
  }

  /**
   * 获取错误的严重程度级别
   */
  getSeverityLevel(): number {
    switch (this.severity) {
      case ErrorSeverity.LOW:
        return 1;
      case ErrorSeverity.MEDIUM:
        return 2;
      case ErrorSeverity.HIGH:
        return 3;
      case ErrorSeverity.CRITICAL:
        return 4;
      default:
        return 2;
    }
  }

  /**
   * 检查是否为关键错误
   */
  isCritical(): boolean {
    return this.severity === ErrorSeverity.CRITICAL;
  }

  /**
   * 获取用户友好的错误消息
   */
  getUserFriendlyMessage(): string {
    switch (this.type) {
      case ErrorType.NETWORK:
        return '网络连接出现问题，请检查您的网络设置';
      case ErrorType.AUTHENTICATION:
        return '身份验证失败，请重新登录';
      case ErrorType.AUTHORIZATION:
        return '您没有权限执行此操作';
      case ErrorType.VALIDATION:
        return '输入的数据格式不正确，请检查后重试';
      case ErrorType.NOT_FOUND:
        return '请求的资源不存在';
      case ErrorType.RATE_LIMIT:
        return '请求过于频繁，请稍后再试';
      case ErrorType.EXTERNAL_SERVICE:
        return '外部服务暂时不可用，请稍后重试';
      case ErrorType.DATABASE:
        return '数据处理出现问题，请稍后重试';
      default:
        return '系统出现错误，请联系技术支持';
    }
  }
}

/**
 * 网络错误类
 * 用于处理网络相关的错误
 */
export class NetworkError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ErrorCode.NETWORK_ERROR, ErrorType.NETWORK, ErrorSeverity.HIGH, details);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * 超时错误类
 * 用于处理请求超时的错误
 */
export class TimeoutError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ErrorCode.TIMEOUT, ErrorType.NETWORK, ErrorSeverity.MEDIUM, details);
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

// 为 AppError 类添加静态方法和实例方法
AppError.prototype.toJSON = function (): Record<string, unknown> {
  return {
    name: this.name,
    message: this.message,
    code: this.code,
    type: this.type,
    severity: this.severity,
    details: this.details,
    stack: process.env.NODE_ENV === 'development' ? this.stack : undefined,
    timestamp: this.timestamp,
    statusCode: this.statusCode,
    correlationId: this.correlationId,
    context: this.context,
    recoveryStrategy: this.recoveryStrategy,
    retryCount: this.retryCount,
    causedBy: this.causedBy ? {
      name: this.causedBy.name,
      message: this.causedBy.message,
      stack: process.env.NODE_ENV === 'development' ? this.causedBy.stack : undefined,
    } : undefined,
  };
};

/**
 * 创建验证错误
 * @param message 错误消息
 * @param details 错误详情
 * @returns 验证错误实例
 */
AppError.validation = function (message: string, details?: Record<string, unknown>): AppError {
  return new AppError(
    message,
    ErrorCode.VALIDATION_ERROR,
    ErrorType.VALIDATION,
    ErrorSeverity.MEDIUM,
    details
  );
};

/**
 * 创建未授权错误
 * @param message 错误消息
 * @param details 错误详情
 * @returns 未授权错误实例
 */
AppError.unauthorized = function (message: string, details?: Record<string, unknown>): AppError {
  return new AppError(
    message,
    ErrorCode.UNAUTHORIZED,
    ErrorType.AUTHENTICATION,
    ErrorSeverity.HIGH,
    details
  );
};

/**
 * 创建禁止访问错误
 * @param message 错误消息
 * @param details 错误详情
 * @returns 禁止访问错误实例
 */
AppError.forbidden = function (message: string, details?: Record<string, unknown>): AppError {
  return new AppError(
    message,
    ErrorCode.FORBIDDEN,
    ErrorType.AUTHORIZATION,
    ErrorSeverity.HIGH,
    details
  );
};

/**
 * 创建资源未找到错误
 * @param message 错误消息
 * @param details 错误详情
 * @returns 资源未找到错误实例
 */
AppError.notFound = function (message: string, details?: Record<string, unknown>): AppError {
  return new AppError(
    message,
    ErrorCode.NOT_FOUND,
    ErrorType.BUSINESS_LOGIC,
    ErrorSeverity.MEDIUM,
    details
  );
};

/**
 * 创建内部服务器错误
 * @param message 错误消息
 * @param details 错误详情
 * @returns 内部服务器错误实例
 */
AppError.internal = function (message: string, details?: Record<string, unknown>): AppError {
  return new AppError(
    message,
    ErrorCode.INTERNAL_ERROR,
    ErrorType.SYSTEM,
    ErrorSeverity.HIGH,
    details
  );
};

/**
 * 验证错误类
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>, statusCode: number = 400) {
    super(message, ErrorCode.VALIDATION_ERROR, ErrorType.VALIDATION, ErrorSeverity.MEDIUM, details, statusCode);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * 认证错误类
 */
export class AuthenticationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>, statusCode: number = 401) {
    super(message, ErrorCode.AUTHENTICATION_ERROR, ErrorType.AUTHENTICATION, ErrorSeverity.HIGH, details, statusCode);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * 授权错误类
 */
export class AuthorizationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ErrorCode.FORBIDDEN, ErrorType.AUTHORIZATION, ErrorSeverity.HIGH, details);
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * 资源未找到错误类
 */
export class NotFoundError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ErrorCode.NOT_FOUND, ErrorType.BUSINESS_LOGIC, ErrorSeverity.MEDIUM, details);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * 速率限制错误类
 */
export class RateLimitError extends AppError {
  constructor(message: string, details?: Record<string, unknown>, statusCode: number = 429) {
    super(message, ErrorCode.RATE_LIMIT_EXCEEDED, ErrorType.RATE_LIMIT, ErrorSeverity.MEDIUM, details, statusCode);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * 外部服务错误类
 */
export class ExternalServiceError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ErrorCode.EXTERNAL_SERVICE_ERROR, ErrorType.INTEGRATION, ErrorSeverity.HIGH, details);
    this.name = 'ExternalServiceError';
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}

/**
 * 数据库错误类
 */
export class DatabaseError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ErrorCode.DATABASE_ERROR, ErrorType.DATABASE, ErrorSeverity.HIGH, details);
    this.name = 'DatabaseError';
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * 业务逻辑错误类
 * 用于处理业务逻辑相关的错误
 */
export class BusinessLogicError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ErrorCode.VALIDATION_ERROR, ErrorType.BUSINESS_LOGIC, ErrorSeverity.MEDIUM, details);
    this.name = 'BusinessLogicError';
    Object.setPrototypeOf(this, BusinessLogicError.prototype);
  }
}
