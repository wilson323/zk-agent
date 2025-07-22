/**
 * @file Global Error Handler Middleware
 * @description 全局异常处理中间件，统一处理所有API路由的异常
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AgentError, ErrorSeverity, AgentErrorType } from '../errors/agent-errors';
import { ApiResponseWrapper, ApiLogger } from '../utils/api-helper';
import { ErrorCode } from '../../types/core';
import { errorMonitor } from '../monitoring/error-monitor';
import { randomUUID } from 'crypto';
// 注释掉不存在的模块导入
// import { ErrorRecoveryEngine } from '../monitoring/error-recovery-engine';
// import { ErrorAnalysisEngine } from '../monitoring/error-analysis-engine';
import { errorTracker } from '../monitoring/error-tracker';
import { LogLevel } from '@prisma/client';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();

const logger = getLogger();

// 错误分类器
class ErrorClassifier {
  static classifyError(error: any): {
    type: AgentErrorType;
    severity: ErrorSeverity;
    statusCode: number;
    userMessage: string;
    shouldRetry: boolean;
  } {
    // Zod验证错误
    if (error instanceof ZodError) {
      return {
        type: AgentErrorType.AUTHENTICATION_ERROR,
        severity: ErrorSeverity.LOW,
        statusCode: 400,
        userMessage: '请求参数验证失败',
        shouldRetry: false,
      };
    }

    // 智能体错误
    if (error instanceof AgentError) {
      return {
        type: error.type,
        severity: error.severity,
        statusCode: this.getStatusCodeFromErrorType(error.type),
        userMessage: this.getUserMessageFromError(error),
        shouldRetry: this.isRetryableError(error.type),
      };
    }

    // 网络错误
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return {
        type: AgentErrorType.SERVICE_UNAVAILABLE,
        severity: ErrorSeverity.HIGH,
        statusCode: 503,
        userMessage: '服务暂时不可用，请稍后重试',
        shouldRetry: true,
      };
    }

    // 超时错误
    if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      return {
        type: AgentErrorType.CHAT_API_ERROR,
        severity: ErrorSeverity.MEDIUM,
        statusCode: 408,
        userMessage: '请求超时，请重试',
        shouldRetry: true,
      };
    }

    // 权限错误
    if (error.message?.includes('unauthorized') || error.message?.includes('forbidden')) {
      return {
        type: AgentErrorType.AUTHENTICATION_ERROR,
        severity: ErrorSeverity.MEDIUM,
        statusCode: 401,
        userMessage: '身份验证失败',
        shouldRetry: false,
      };
    }

    // 默认为内部服务器错误
    return {
      type: AgentErrorType.SERVICE_UNAVAILABLE,
      severity: ErrorSeverity.CRITICAL,
      statusCode: 500,
      userMessage: '系统内部错误，我们正在处理',
      shouldRetry: false,
    };
  }

  private static getStatusCodeFromErrorType(type: AgentErrorType): number {
    const statusMap: Record<AgentErrorType, number> = {
      [AgentErrorType.CAD_FILE_PARSE_ERROR]: 400,
      [AgentErrorType.CAD_FORMAT_UNSUPPORTED]: 415,
      [AgentErrorType.CAD_FILE_CORRUPTED]: 400,
      [AgentErrorType.CAD_ANALYSIS_TIMEOUT]: 408,
      [AgentErrorType.POSTER_GENERATION_FAILED]: 500,
      [AgentErrorType.POSTER_TEMPLATE_ERROR]: 400,
      [AgentErrorType.POSTER_RESOURCE_LIMIT]: 429,
      [AgentErrorType.POSTER_TIMEOUT]: 408,
      [AgentErrorType.CHAT_CONTEXT_LOST]: 400,
      [AgentErrorType.CHAT_API_ERROR]: 502,
      [AgentErrorType.CHAT_RATE_LIMIT]: 429,
      [AgentErrorType.CHAT_MODEL_UNAVAILABLE]: 503,
      [AgentErrorType.AGENT_COMMUNICATION_ERROR]: 502,
      [AgentErrorType.RESOURCE_EXHAUSTED]: 503,
      [AgentErrorType.SERVICE_UNAVAILABLE]: 503,
      [AgentErrorType.AUTHENTICATION_ERROR]: 401,
    };
    return statusMap[type] || 500;
  }

  private static getUserMessageFromError(error: AgentError): string {
    const messageMap: Record<AgentErrorType, string> = {
      [AgentErrorType.CAD_FILE_PARSE_ERROR]: 'CAD文件解析失败，请检查文件格式',
      [AgentErrorType.CAD_FORMAT_UNSUPPORTED]: '不支持的CAD文件格式',
      [AgentErrorType.CAD_FILE_CORRUPTED]: 'CAD文件已损坏，请重新上传',
      [AgentErrorType.CAD_ANALYSIS_TIMEOUT]: 'CAD分析超时，请稍后重试',
      [AgentErrorType.POSTER_GENERATION_FAILED]: '海报生成失败，请重试',
      [AgentErrorType.POSTER_TEMPLATE_ERROR]: '海报模板错误',
      [AgentErrorType.POSTER_RESOURCE_LIMIT]: '资源使用超限，请稍后重试',
      [AgentErrorType.POSTER_TIMEOUT]: '海报生成超时，请重试',
      [AgentErrorType.CHAT_CONTEXT_LOST]: '对话上下文丢失，请重新开始对话',
      [AgentErrorType.CHAT_API_ERROR]: '对话服务暂时不可用，请稍后重试',
      [AgentErrorType.CHAT_RATE_LIMIT]: '请求过于频繁，请稍后重试',
      [AgentErrorType.CHAT_MODEL_UNAVAILABLE]: '对话模型暂时不可用',
      [AgentErrorType.AGENT_COMMUNICATION_ERROR]: '智能体通信错误',
      [AgentErrorType.RESOURCE_EXHAUSTED]: '系统资源不足，请稍后重试',
      [AgentErrorType.SERVICE_UNAVAILABLE]: '服务暂时不可用，请稍后重试',
      [AgentErrorType.AUTHENTICATION_ERROR]: '身份验证失败',
    };
    return messageMap[error.type] || error.message;
  }

  private static isRetryableError(type: AgentErrorType): boolean {
    const retryableErrors = [
      AgentErrorType.CAD_ANALYSIS_TIMEOUT,
      AgentErrorType.POSTER_GENERATION_FAILED,
      AgentErrorType.POSTER_TIMEOUT,
      AgentErrorType.CHAT_API_ERROR,
      AgentErrorType.CHAT_RATE_LIMIT,
      AgentErrorType.CHAT_MODEL_UNAVAILABLE,
      AgentErrorType.AGENT_COMMUNICATION_ERROR,
      AgentErrorType.RESOURCE_EXHAUSTED,
      AgentErrorType.SERVICE_UNAVAILABLE,
    ];
    return retryableErrors.includes(type);
  }
}

// 全局错误处理器
export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private errorCount = 0;
  private lastErrorTime = 0;
  private circuitBreakerOpen = false;
  private readonly circuitBreakerTimeout = 60000; // 1分钟
  private readonly timeWindowMs = 60000; // 1分钟窗口
  private readonly errorThreshold = parseInt(process.env.ERROR_THRESHOLD || '50'); // 错误阈值
  private circuitBreakerResetTimer?: NodeJS.Timeout;

  static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler();
    }
    return GlobalErrorHandler.instance;
  }

  /**
   * 处理API错误
   */
  async handleError(error: any, request: NextRequest, context?: any): Promise<NextResponse> {
    const startTime = Date.now();

    try {
      // 错误分类
      const classification = ErrorClassifier.classifyError(error);

      // 创建标准化错误对象
      const agentError =
        error instanceof AgentError
          ? error
          : new AgentError(
              classification.type,
              error.message || '未知错误',
              classification.severity,
              context?.agentType || 'unknown',
              {
                originalError: error,
                url: request.url,
                method: request.method,
                userAgent: request.headers.get('user-agent'),
                ...context,
              }
            );

      // 记录到监控系统
      this.recordError(agentError);

      // 检查时间窗口并更新错误统计
      this.checkTimeWindowAndUpdateStats();

      // 检查是否需要触发熔断器
      if (this.errorCount >= this.errorThreshold) {
        this.openCircuitBreaker();
      }

      // 详细日志记录
      ApiLogger.logError('Global error handled', {
        errorId:
          agentError.sessionId || `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: agentError.type,
        message: agentError.message,
        statusCode: classification.statusCode,
        stack: error.stack,
        context: agentError.context,
        timestamp: agentError.timestamp,
      });

      return this.createErrorResponse(classification, agentError, request);
    } catch (handlerError) {
      // 错误处理器本身出错的兜底处理
      logger.error('Global error handler failed:', handlerError);

      return NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorCode.INTERNAL_SERVER_ERROR,
            message: '系统内部错误',
            details: null,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }
  }

  /**
   * 创建错误响应
   */
  private createErrorResponse(
    classification: any,
    error: AgentError,
    request: NextRequest
  ): NextResponse {
    const errorCode = this.mapErrorTypeToCode(classification.type);

    // 开发环境返回详细错误信息
    const isDevelopment = process.env.NODE_ENV === 'development';

    const errorResponse = {
      success: false,
      error: {
        code: errorCode,
        message: classification.userMessage,
        type: classification.type,
        severity: classification.severity,
        retryable: classification.shouldRetry,
        details: isDevelopment
          ? {
              originalMessage: error.message,
              stack: error.stack,
              context: error.context,
            }
          : null,
      },
      timestamp: new Date().toISOString(),
      requestId: error.context?.requestId,
      ...(classification.shouldRetry && {
        retryAfter: this.calculateRetryDelay(classification.type),
      }),
    };

    return NextResponse.json(errorResponse, {
      status: classification.statusCode,
      headers: {
        'X-Error-Type': classification.type,
        'X-Error-Severity': classification.severity,
        ...(classification.shouldRetry && {
          'Retry-After': String(this.calculateRetryDelay(classification.type) / 1000),
        }),
      },
    });
  }

  /**
   * 映射错误类型到错误代码
   */
  private mapErrorTypeToCode(type: AgentErrorType): ErrorCode {
    const codeMap: Record<AgentErrorType, ErrorCode> = {
      [AgentErrorType.CAD_FILE_PARSE_ERROR]: ErrorCode.VALIDATION_ERROR,
      [AgentErrorType.CAD_FORMAT_UNSUPPORTED]: ErrorCode.VALIDATION_ERROR,
      [AgentErrorType.CAD_FILE_CORRUPTED]: ErrorCode.VALIDATION_ERROR,
      [AgentErrorType.CAD_ANALYSIS_TIMEOUT]: ErrorCode.TIMEOUT_ERROR,
      [AgentErrorType.POSTER_GENERATION_FAILED]: ErrorCode.INTERNAL_SERVER_ERROR,
      [AgentErrorType.POSTER_TEMPLATE_ERROR]: ErrorCode.VALIDATION_ERROR,
      [AgentErrorType.POSTER_RESOURCE_LIMIT]: ErrorCode.RATE_LIMIT_ERROR,
      [AgentErrorType.POSTER_TIMEOUT]: ErrorCode.TIMEOUT_ERROR,
      [AgentErrorType.CHAT_CONTEXT_LOST]: ErrorCode.VALIDATION_ERROR,
      [AgentErrorType.CHAT_API_ERROR]: ErrorCode.EXTERNAL_SERVICE_ERROR,
      [AgentErrorType.CHAT_RATE_LIMIT]: ErrorCode.RATE_LIMIT_ERROR,
      [AgentErrorType.CHAT_MODEL_UNAVAILABLE]: ErrorCode.SERVICE_UNAVAILABLE,
      [AgentErrorType.AGENT_COMMUNICATION_ERROR]: ErrorCode.EXTERNAL_SERVICE_ERROR,
      [AgentErrorType.RESOURCE_EXHAUSTED]: ErrorCode.SERVICE_UNAVAILABLE,
      [AgentErrorType.SERVICE_UNAVAILABLE]: ErrorCode.SERVICE_UNAVAILABLE,
      [AgentErrorType.AUTHENTICATION_ERROR]: ErrorCode.AUTHENTICATION_ERROR,
    };
    return codeMap[type] || ErrorCode.INTERNAL_SERVER_ERROR;
  }

  /**
   * 计算重试延迟
   */
  private calculateRetryDelay(type: AgentErrorType): number {
    const delayMap: Record<AgentErrorType, number> = {
      // CAD分析错误
      [AgentErrorType.CAD_FILE_PARSE_ERROR]: 5000,
      [AgentErrorType.CAD_FORMAT_UNSUPPORTED]: 0, // 不重试
      [AgentErrorType.CAD_FILE_CORRUPTED]: 0, // 不重试
      [AgentErrorType.CAD_ANALYSIS_TIMEOUT]: 30000,

      // 海报生成错误
      [AgentErrorType.POSTER_GENERATION_FAILED]: 10000,
      [AgentErrorType.POSTER_TEMPLATE_ERROR]: 5000,
      [AgentErrorType.POSTER_RESOURCE_LIMIT]: 30000,
      [AgentErrorType.POSTER_TIMEOUT]: 15000,

      // 对话智能体错误
      [AgentErrorType.CHAT_CONTEXT_LOST]: 5000,
      [AgentErrorType.CHAT_API_ERROR]: 10000,
      [AgentErrorType.CHAT_RATE_LIMIT]: 60000,
      [AgentErrorType.CHAT_MODEL_UNAVAILABLE]: 30000,

      // 系统级错误
      [AgentErrorType.AGENT_COMMUNICATION_ERROR]: 15000,
      [AgentErrorType.RESOURCE_EXHAUSTED]: 120000,
      [AgentErrorType.SERVICE_UNAVAILABLE]: 60000,
      [AgentErrorType.AUTHENTICATION_ERROR]: 5000,
    };
    return delayMap[type] || 5000; // 默认5秒
  }

  /**
   * 更新错误统计
   */
  private updateErrorStats(): void {
    // 使用原子操作避免并发问题
    const now = Date.now();
    this.errorCount++;
    this.lastErrorTime = now;
  }

  /**
   * 检查时间窗口并更新统计
   */
  private checkTimeWindowAndUpdateStats(): void {
    const now = Date.now();

    // 检查时间窗口是否过期
    if (this.lastErrorTime > 0 && now - this.lastErrorTime > this.timeWindowMs) {
      this.errorCount = 0;
    }

    // 更新统计
    this.errorCount++;
    this.lastErrorTime = now;
  }

  /**
   * 检查是否应该触发熔断器
   */
  private shouldTriggerCircuitBreaker(): boolean {
    const now = Date.now();

    // 重置计数器（如果超过时间窗口）
    if (now - this.lastErrorTime > this.timeWindowMs) {
      this.errorCount = 0;
      this.lastErrorTime = now; // 修复：更新时间戳
    }

    return this.errorCount >= this.errorThreshold;
  }

  /**
   * 开启熔断器
   */
  private openCircuitBreaker(): void {
    if (this.circuitBreakerOpen) {
      return; // 避免重复开启
    }

    this.circuitBreakerOpen = true;
    logger.warn('🚨 Circuit breaker opened due to high error rate');

    // 清除之前的定时器
    if (this.circuitBreakerResetTimer) {
      clearTimeout(this.circuitBreakerResetTimer);
    }

    // 设置自动恢复
    this.circuitBreakerResetTimer = setTimeout(() => {
      this.circuitBreakerOpen = false;
      this.errorCount = 0;
      this.lastErrorTime = 0;
      console.info('✅ Circuit breaker closed, service restored');
    }, this.circuitBreakerTimeout);
  }

  /**
   * 记录错误到监控系统
   */
  private recordError(error: AgentError): void {
    try {
      // 集成错误监控系统
      const errorId =
        error.sessionId || `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      errorMonitor.reportError(error, {
        stack: error.stack || '',
        timestamp: error.timestamp,
        context: {
          ...error.context,
          userAgent: error.context?.userAgent || 'unknown',
          url: error.context?.url || 'unknown',
          userId: error.context?.userId || 'anonymous',
        },
        resolved: false,
        errorId: errorId,
        source: 'global-error-handler',
        environment: process.env.NODE_ENV || 'development',
      });

      // 同时记录到错误追踪器
      errorTracker.trackError(error, LogLevel.ERROR, {
        sessionId: error.sessionId,
        timestamp: new Date(),
        ...error.context,
      });

      // 保留控制台输出用于开发调试
      if (process.env.NODE_ENV === 'development') {
        logger.error('Error recorded:', {
          id: errorId,
          type: error.type,
          message: error.message,
          timestamp: error.timestamp,
        });
      }
    } catch (recordingError) {
      // 如果错误记录本身失败，至少输出到控制台
      logger.error('Failed to record error:', recordingError);
      logger.error('Original error:', error);
    }
  }

  /**
   * 检查熔断器状态
   */
  isCircuitBreakerOpen(): boolean {
    return this.circuitBreakerOpen;
  }

  /**
   * 获取错误统计
   */
  getErrorStats() {
    return {
      errorCount: this.errorCount,
      lastErrorTime: this.lastErrorTime,
      circuitBreakerOpen: this.circuitBreakerOpen,
      errorThreshold: this.errorThreshold,
      timeWindowMs: this.timeWindowMs,
    };
  }
}

// 中间件包装器
export function withGlobalErrorHandler(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    const errorHandler = GlobalErrorHandler.getInstance();

    // 检查熔断器状态
    if (errorHandler.isCircuitBreakerOpen()) {
      const requestId = randomUUID();
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorCode.SERVICE_UNAVAILABLE,
            message: '服务暂时不可用，请稍后重试',
            type: AgentErrorType.SERVICE_UNAVAILABLE,
          },
          requestId,
          timestamp: new Date().toISOString(),
          retryAfter: 60,
        },
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId,
            'Retry-After': '60',
          },
        }
      );
    }

    try {
      return await handler(req, context);
    } catch (error) {
      return await errorHandler.handleError(error, req, context);
    }
  };
}

// 导出单例实例
export const globalErrorHandler = GlobalErrorHandler.getInstance();
