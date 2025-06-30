/**
 * @file 应用错误类
 * @description 统一的应用错误处理类，用于标准化错误处理
 * @author ZK-Agent Team
 * @date 2024-12-27
 */

import { ErrorCode, ErrorType, ErrorSeverity } from '@/lib/types/enums';

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
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.type = type;
    this.severity = severity;
    this.details = details;
    this.timestamp = new Date().toISOString();

    // 确保 Error 的原型链正确
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * 将错误转换为JSON对象
   * @returns 错误的JSON表示
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      type: this.type,
      severity: this.severity,
      details: this.details,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined,
      timestamp: this.timestamp
    };
  }

  /**
   * 创建验证错误
   * @param message 错误消息
   * @param details 错误详情
   * @returns 验证错误实例
   */
  static validation(message: string, details?: Record<string, unknown>): AppError {
    return new AppError(
      message,
      ErrorCode.VALIDATION_ERROR,
      ErrorType.VALIDATION,
      ErrorSeverity.MEDIUM,
      details
    );
  }

  /**
   * 创建未授权错误
   * @param message 错误消息
   * @param details 错误详情
   * @returns 未授权错误实例
   */
  static unauthorized(message: string, details?: Record<string, unknown>): AppError {
    return new AppError(
      message,
      ErrorCode.UNAUTHORIZED,
      ErrorType.AUTHENTICATION,
      ErrorSeverity.HIGH,
      details
    );
  }

  /**
   * 创建禁止访问错误
   * @param message 错误消息
   * @param details 错误详情
   * @returns 禁止访问错误实例
   */
  static forbidden(message: string, details?: Record<string, unknown>): AppError {
    return new AppError(
      message,
      ErrorCode.FORBIDDEN,
      ErrorType.AUTHORIZATION,
      ErrorSeverity.HIGH,
      details
    );
  }

  /**
   * 创建资源未找到错误
   * @param message 错误消息
   * @param details 错误详情
   * @returns 资源未找到错误实例
   */
  static notFound(message: string, details?: Record<string, unknown>): AppError {
    return new AppError(
      message,
      ErrorCode.NOT_FOUND,
      ErrorType.BUSINESS_LOGIC,
      ErrorSeverity.MEDIUM,
      details
    );
  }

  /**
   * 创建内部服务器错误
   * @param message 错误消息
   * @param details 错误详情
   * @returns 内部服务器错误实例
   */
  static internal(message: string, details?: Record<string, unknown>): AppError {
    return new AppError(
      message,
      ErrorCode.INTERNAL_ERROR,
      ErrorType.SYSTEM,
      ErrorSeverity.HIGH,
      details
    );
  }
}