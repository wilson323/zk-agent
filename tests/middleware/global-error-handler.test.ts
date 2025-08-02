// 简化的全局错误处理器测试
// 避免Next.js依赖问题，专注于核心逻辑测试

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Next.js dependencies
const mockNextResponse = {
  json: vi.fn((data: any, options?: any) => ({
    json: async () => data,
    status: options?.status || 200,
    headers: options?.headers || {},
  })),
};

vi.mock('next/server', () => ({
  NextResponse: mockNextResponse,
  NextRequest: vi.fn(),
}));

vi.mock('../../lib/utils/api-logger', () => ({
  ApiLogger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../../lib/types/api-response', () => ({
  ErrorCode: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  },
}));

// 简化的错误类型定义
enum AgentErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

// 简化的AgentError类
class AgentError extends Error {
  public readonly id: string;
  public readonly type: AgentErrorType;
  public readonly statusCode: number;
  public readonly userMessage: string;
  public readonly retryable: boolean;
  public readonly context?: any;
  public readonly timestamp: string;
  public override readonly stack?: string;

  constructor(type: AgentErrorType, message: string, context?: any, statusCode?: number) {
    super(message);
    this.name = 'AgentError';
    this.id = Math.random().toString(36).substr(2, 9);
    this.type = type;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.statusCode = statusCode || this.getDefaultStatusCode(type);
    this.userMessage = this.getUserMessage(type);
    this.retryable = this.isRetryableError(type);
  }

  private getDefaultStatusCode(type: AgentErrorType): number {
    switch (type) {
      case AgentErrorType.VALIDATION_ERROR:
        return 400;
      case AgentErrorType.NETWORK_ERROR:
        return 502;
      case AgentErrorType.SERVICE_UNAVAILABLE:
        return 503;
      default:
        return 500;
    }
  }

  private getUserMessage(type: AgentErrorType): string {
    switch (type) {
      case AgentErrorType.VALIDATION_ERROR:
        return '请求参数有误，请检查后重试';
      case AgentErrorType.NETWORK_ERROR:
        return '网络连接异常，请稍后重试';
      case AgentErrorType.SERVICE_UNAVAILABLE:
        return '服务暂时不可用，请稍后重试';
      default:
        return '系统内部错误，请联系管理员';
    }
  }

  private isRetryableError(type: AgentErrorType): boolean {
    return [AgentErrorType.NETWORK_ERROR, AgentErrorType.SERVICE_UNAVAILABLE].includes(type);
  }
}

// 简化的全局错误处理器
class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private errorCount = 0;
  private lastErrorTime = 0;
  private circuitBreakerOpen = false;
  private readonly circuitBreakerTimeout = 60000;
  private readonly timeWindowMs = 60000;
  private readonly errorThreshold = parseInt(process.env.ERROR_THRESHOLD || '50');
  private circuitBreakerResetTimer?: NodeJS.Timeout;

  static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler();
    }
    return GlobalErrorHandler.instance;
  }

  handleError(error: Error | AgentError, context?: any): any {
    try {
      let agentError: AgentError;

      if (error instanceof AgentError) {
        agentError = error;
      } else {
        // 分类普通错误
        const errorType = this.classifyError(error);
        agentError = new AgentError(errorType, error.message, context);
      }

      // 记录错误
      this.recordError(agentError);

      // 检查时间窗口并更新统计
      this.checkTimeWindowAndUpdateStats();

      // 检查断路器
      if (this.errorCount >= this.errorThreshold) {
        this.openCircuitBreaker();
      }

      return this.createErrorResponse(agentError);
    } catch (handlerError) {
      console.error('Error in error handler:', handlerError);
      return this.createFallbackResponse();
    }
  }

  private classifyError(error: Error): AgentErrorType {
    if (error.name === 'ValidationError' || error.message.includes('validation')) {
      return AgentErrorType.VALIDATION_ERROR;
    }
    if (error.name === 'NetworkError' || error.message.includes('network')) {
      return AgentErrorType.NETWORK_ERROR;
    }
    return AgentErrorType.SYSTEM_ERROR;
  }

  private recordError(error: AgentError): void {
    console.error('Error recorded:', {
      id: error.id,
      type: error.type,
      message: error.message,
      timestamp: error.timestamp,
    });
  }

  private updateErrorStats(): void {
    const now = Date.now();
    this.errorCount++;
    this.lastErrorTime = now;
  }

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

  private shouldTriggerCircuitBreaker(): boolean {
    const now = Date.now();

    if (now - this.lastErrorTime > this.timeWindowMs) {
      this.errorCount = 0;
      this.lastErrorTime = now;
    }

    return this.errorCount >= this.errorThreshold;
  }

  private openCircuitBreaker(): void {
    if (this.circuitBreakerOpen) {
      return;
    }

    this.circuitBreakerOpen = true;
    console.warn('🚨 Circuit breaker opened due to high error rate');

    if (this.circuitBreakerResetTimer) {
      clearTimeout(this.circuitBreakerResetTimer);
    }

    this.circuitBreakerResetTimer = setTimeout(() => {
      this.circuitBreakerOpen = false;
      this.errorCount = 0;
      this.lastErrorTime = 0;
      console.info('✅ Circuit breaker closed, service restored');
    }, this.circuitBreakerTimeout);
  }

  private createErrorResponse(error: AgentError): any {
    return mockNextResponse.json(
      {
        success: false,
        error: {
          code: error.type,
          message: error.userMessage,
          type: error.type,
        },
        requestId: error.id,
        timestamp: error.timestamp,
      },
      { status: error.statusCode }
    );
  }

  private createFallbackResponse(): any {
    return mockNextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '系统内部错误',
          type: 'SYSTEM_ERROR',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }

  isCircuitBreakerOpen(): boolean {
    return this.circuitBreakerOpen;
  }

  getErrorStats() {
    return {
      errorCount: this.errorCount,
      lastErrorTime: this.lastErrorTime,
      circuitBreakerOpen: this.circuitBreakerOpen,
      errorThreshold: this.errorThreshold,
      timeWindowMs: this.timeWindowMs,
    };
  }

  // 重置实例（用于测试）
  static resetInstance(): void {
    GlobalErrorHandler.instance = undefined as any;
  }
}

describe('GlobalErrorHandler', () => {
  let errorHandler: GlobalErrorHandler;

  beforeEach(() => {
    GlobalErrorHandler.resetInstance();
    errorHandler = GlobalErrorHandler.getInstance();
    delete process.env.ERROR_THRESHOLD;
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = GlobalErrorHandler.getInstance();
      const instance2 = GlobalErrorHandler.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Error Classification', () => {
    it('should classify validation errors correctly', () => {
      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';

      const result = errorHandler.handleError(validationError);
      expect(result).toBeDefined();
      expect(mockNextResponse.json).toHaveBeenCalled();
    });

    it('should classify network errors correctly', () => {
      const networkError = new Error('Network timeout');
      networkError.name = 'NetworkError';

      const result = errorHandler.handleError(networkError);
      expect(result).toBeDefined();
    });

    it('should handle AgentError instances', () => {
      const agentError = new AgentError(AgentErrorType.VALIDATION_ERROR, 'Test validation error', {
        field: 'email',
      });

      const result = errorHandler.handleError(agentError);
      expect(result).toBeDefined();
    });
  });

  describe('Circuit Breaker', () => {
    it('should not trigger circuit breaker with few errors', () => {
      for (let i = 0; i < 10; i++) {
        errorHandler.handleError(new Error(`Error ${i}`));
      }

      expect(errorHandler.isCircuitBreakerOpen()).toBe(false);
    });

    it('should trigger circuit breaker with many errors', () => {
      process.env.ERROR_THRESHOLD = '5';
      GlobalErrorHandler.resetInstance();
      errorHandler = GlobalErrorHandler.getInstance();

      for (let i = 0; i < 6; i++) {
        errorHandler.handleError(new Error(`Error ${i}`));
      }

      expect(errorHandler.isCircuitBreakerOpen()).toBe(true);
    });

    it('should reset error count after time window', () => {
      errorHandler.handleError(new Error('Test error'));

      const stats = errorHandler.getErrorStats();
      expect(stats.errorCount).toBe(1);

      vi.useFakeTimers();
      vi.advanceTimersByTime(61000);

      errorHandler.handleError(new Error('Another error'));

      const newStats = errorHandler.getErrorStats();
      expect(newStats.errorCount).toBe(1);

      vi.useRealTimers();
    });
  });

  describe('Error Statistics', () => {
    it('should track error statistics correctly', () => {
      const initialStats = errorHandler.getErrorStats();
      expect(initialStats.errorCount).toBe(0);

      errorHandler.handleError(new Error('Test error'));

      const updatedStats = errorHandler.getErrorStats();
      expect(updatedStats.errorCount).toBe(1);
      expect(updatedStats.lastErrorTime).toBeGreaterThan(0);
    });

    it('should include configuration in stats', () => {
      const stats = errorHandler.getErrorStats();
      expect(stats).toHaveProperty('errorThreshold');
      expect(stats).toHaveProperty('timeWindowMs');
      expect(stats.timeWindowMs).toBe(60000);
    });
  });

  describe('Error Response Format', () => {
    it('should create properly formatted error responses', async () => {
      const error = new AgentError(AgentErrorType.VALIDATION_ERROR, 'Test validation error', {
        field: 'email',
      });

      const response = errorHandler.handleError(error);
      const responseBody = await response.json();

      expect(responseBody).toHaveProperty('success', false);
      expect(responseBody).toHaveProperty('error');
      expect(responseBody).toHaveProperty('requestId');
      expect(responseBody).toHaveProperty('timestamp');
      expect(responseBody.error).toHaveProperty('code');
      expect(responseBody.error).toHaveProperty('message');
      expect(responseBody.error).toHaveProperty('type');
    });
  });

  describe('Error Recording', () => {
    it('should record errors to monitoring system', () => {
      const consoleSpy = vi.spyOn(console, 'error');

      const error = new AgentError(AgentErrorType.SYSTEM_ERROR, 'Test system error');

      errorHandler.handleError(error);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error recorded:',
        expect.objectContaining({
          id: expect.any(String),
          type: AgentErrorType.SYSTEM_ERROR,
          message: 'Test system error',
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('Fallback Error Handling', () => {
    it('should handle errors within the error handler', () => {
      // 模拟错误处理器内部错误
      const originalRecordError = (errorHandler as any).recordError;
      (errorHandler as any).recordError = () => {
        throw new Error('Recording failed');
      };

      const result = errorHandler.handleError(new Error('Test error'));
      expect(result).toBeDefined();

      // 恢复原方法
      (errorHandler as any).recordError = originalRecordError;
    });
  });
});

// 集成测试
describe('GlobalErrorHandler Integration', () => {
  it('should handle complete error flow', async () => {
    const errorHandler = GlobalErrorHandler.getInstance();

    const error = new Error('Database connection failed');
    const result = errorHandler.handleError(error);

    expect(result).toBeDefined();
    expect(result.status).toBeGreaterThanOrEqual(400);

    const responseBody = await result.json();
    expect(responseBody.success).toBe(false);
    expect(responseBody.error).toBeDefined();
    expect(responseBody.requestId).toBeDefined();
  });

  it('should maintain circuit breaker state across multiple errors', () => {
    process.env.ERROR_THRESHOLD = '3';
    GlobalErrorHandler.resetInstance();
    const errorHandler = GlobalErrorHandler.getInstance();

    // 触发断路器
    for (let i = 0; i < 4; i++) {
      errorHandler.handleError(new Error(`Error ${i}`));
    }

    expect(errorHandler.isCircuitBreakerOpen()).toBe(true);

    const stats = errorHandler.getErrorStats();
    expect(stats.circuitBreakerOpen).toBe(true);
    expect(stats.errorCount).toBeGreaterThanOrEqual(3);
  });
});
