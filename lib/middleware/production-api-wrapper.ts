/**
 * @file lib/middleware/production-api-wrapper.ts
 * @description 生产级API路由包装器 - 验证、限流、监控、错误处理
 * @author AI Assistant
 * @lastUpdate 2024-12-19
 * @features 请求验证、速率限制、性能监控、安全防护
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Logger } from '@/lib/utils/logger';
import { enhancedCacheManager } from '@/lib/cache/enhanced-cache-manager';
import { productionDatabaseManager } from '@/lib/database/production-database-manager';
import { rateLimit } from '@/lib/utils/rate-limiter';
import { validateApiKey } from '@/lib/auth/api-key-validator';
import { AppError, ValidationError, AuthenticationError, AuthorizationError, NotFoundError, RateLimitError, ExternalServiceError, DatabaseError, BusinessLogicError } from '@/lib/errors/app-error';

import { EventEmitter } from 'events';

// HTTP方法枚举
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
  OPTIONS = 'OPTIONS',
  HEAD = 'HEAD',
}

// 请求上下文接口
interface RequestContext {
  readonly requestId: string;
  readonly method: string;
  readonly url: string;
  readonly userAgent?: string;
  readonly ip: string;
  readonly timestamp: number;
  readonly userId?: string;
  readonly apiKey?: string;
  readonly headers: Record<string, string>;
  readonly query: Record<string, string | string[]>;
  readonly body?: any;
}

// API配置接口
interface ApiConfig {
  readonly timeout: number;
  readonly maxBodySize: number;
  readonly enableCors: boolean;
  readonly enableRateLimit: boolean;
  readonly enableAuth: boolean;
  readonly enableValidation: boolean;
  readonly enableMetrics: boolean;
  readonly enableCache: boolean;
  readonly corsOrigins: string[];
  readonly rateLimitWindow: number;
  readonly rateLimitMax: number;
  readonly allowedMethods: HttpMethod[];
}

// 路由处理器类型
type RouteHandler<T = any> = (
  request: NextRequest,
  context: RequestContext
) => Promise<T> | T;

// 验证模式接口
interface ValidationSchemas {
  readonly query?: z.ZodSchema;
  readonly body?: z.ZodSchema;
  readonly params?: z.ZodSchema;
  readonly headers?: z.ZodSchema;
}

// 路由选项接口
interface RouteOptions {
  readonly methods?: HttpMethod[];
  readonly auth?: boolean;
  readonly rateLimit?: {
    readonly window: number;
    readonly max: number;
  };
  readonly validation?: ValidationSchemas;
  readonly cache?: {
    readonly enabled: boolean;
    readonly ttl: number;
    readonly key?: (context: RequestContext) => string;
  };
  readonly timeout?: number;
  readonly cors?: {
    readonly enabled: boolean;
    readonly origins?: string[];
    readonly methods?: string[];
    readonly headers?: string[];
  };
}

// 请求指标接口
interface RequestMetrics {
  readonly requestId: string;
  readonly method: string;
  readonly url: string;
  readonly statusCode: number;
  readonly duration: number;
  readonly timestamp: number;
  readonly userAgent?: string;
  readonly ip: string;
  readonly error?: string;
  readonly cached: boolean;
}

/**
 * 生产级API路由包装器
 */
export class ProductionApiWrapper extends EventEmitter {
  private static instance: ProductionApiWrapper | null = null;
  private readonly logger = new Logger('ProductionApiWrapper');
  private readonly requestMetrics = new Map<string, RequestMetrics>();
  private metricsCleanupInterval: NodeJS.Timeout | null = null;

  private readonly defaultConfig: ApiConfig = {
    timeout: parseInt(process.env.API_TIMEOUT || '30000'),
    maxBodySize: parseInt(process.env.API_MAX_BODY_SIZE || '10485760'), // 10MB
    enableCors: process.env.API_ENABLE_CORS !== 'false',
    enableRateLimit: process.env.API_ENABLE_RATE_LIMIT !== 'false',
    enableAuth: process.env.API_ENABLE_AUTH !== 'false',
    enableValidation: process.env.API_ENABLE_VALIDATION !== 'false',
    enableMetrics: process.env.API_ENABLE_METRICS !== 'false',
    enableCache: process.env.API_ENABLE_CACHE !== 'false',
    corsOrigins: (process.env.API_CORS_ORIGINS || '*').split(','),
    rateLimitWindow: parseInt(process.env.API_RATE_LIMIT_WINDOW || '900000'), // 15分钟
    rateLimitMax: parseInt(process.env.API_RATE_LIMIT_MAX || '100'),
    allowedMethods: [HttpMethod.GET, HttpMethod.POST, HttpMethod.PUT, HttpMethod.PATCH, HttpMethod.DELETE],
  };

  private constructor() {
    super();
    this.startMetricsCleanup();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): ProductionApiWrapper {
    if (!ProductionApiWrapper.instance) {
      ProductionApiWrapper.instance = new ProductionApiWrapper();
    }
    return ProductionApiWrapper.instance;
  }

  /**
   * 启动指标清理
   */
  private startMetricsCleanup(): void {
    this.metricsCleanupInterval = setInterval(() => {
      this.cleanupMetrics();
    }, 300000); // 每5分钟清理一次
  }

  /**
   * 清理旧指标
   */
  private cleanupMetrics(): void {
    const maxAge = 3600000; // 1小时
    const now = Date.now();
    
    for (const [requestId, metrics] of this.requestMetrics.entries()) {
      if (now - metrics.timestamp > maxAge) {
        this.requestMetrics.delete(requestId);
      }
    }

    // 保留最近1000条记录
    if (this.requestMetrics.size > 1000) {
      const entries = Array.from(this.requestMetrics.entries())
        .sort((a, b) => b[1].timestamp - a[1].timestamp)
        .slice(0, 1000);
      
      this.requestMetrics.clear();
      for (const [requestId, metrics] of entries) {
        this.requestMetrics.set(requestId, metrics);
      }
    }
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取客户端IP
   */
  private getClientIp(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfConnectingIp = request.headers.get('cf-connecting-ip');
    
    return cfConnectingIp || realIp || forwarded?.split(',')[0] || 'unknown';
  }

  /**
   * 创建请求上下文
   */
  private async createRequestContext(request: NextRequest): Promise<RequestContext> {
    const url = new URL(request.url);
    const query: Record<string, string | string[]> = {};
    
    // 解析查询参数
    for (const [key, value] of url.searchParams.entries()) {
      if (query[key]) {
        if (Array.isArray(query[key])) {
          (query[key] as string[]).push(value);
        } else {
          query[key] = [query[key] as string, value];
        }
      } else {
        query[key] = value;
      }
    }

    // 解析请求头
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    // 解析请求体
    let body: any = null;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      try {
        const contentType = headers['content-type'] || '';
        if (contentType.includes('application/json')) {
          body = await request.json();
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          const formData = await request.formData();
          body = Object.fromEntries(formData.entries());
        } else if (contentType.includes('multipart/form-data')) {
          body = await request.formData();
        } else {
          body = await request.text();
        }
      } catch (error) {
        // 忽略解析错误，保持body为null
      }
    }

    return {
      requestId: this.generateRequestId(),
      method: request.method,
      url: url.pathname,
      userAgent: headers['user-agent'],
      ip: this.getClientIp(request),
      timestamp: Date.now(),
      apiKey: headers['x-api-key'],
      headers,
      query,
      body,
    };
  }

  /**
   * 验证HTTP方法
   */
  private validateMethod(method: string, allowedMethods: HttpMethod[]): void {
    if (!allowedMethods.includes(method as HttpMethod)) {
      throw new AppError(
        `Method ${method} not allowed`,
        'METHOD_NOT_ALLOWED',
        'Method Not Allowed',
        405,
        ErrorType.VALIDATION,
        ErrorSeverity.MEDIUM
      );
    }
  }

  /**
   * 处理CORS
   */
  private handleCors(
    request: NextRequest,
    corsConfig: RouteOptions['cors'],
    defaultConfig: ApiConfig
  ): NextResponse | null {
    if (!corsConfig?.enabled && !defaultConfig.enableCors) {
      return null;
    }

    const origin = request.headers.get('origin');
    const allowedOrigins = corsConfig?.origins || defaultConfig.corsOrigins;
    const allowedMethods = corsConfig?.methods || defaultConfig.allowedMethods.map(m => m.toString());
    const allowedHeaders = corsConfig?.headers || ['Content-Type', 'Authorization', 'X-API-Key'];

    // 预检请求
    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 200 });
      
      if (allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))) {
        response.headers.set('Access-Control-Allow-Origin', origin || '*');
      }
      
      response.headers.set('Access-Control-Allow-Methods', allowedMethods.join(', '));
      response.headers.set('Access-Control-Allow-Headers', allowedHeaders.join(', '));
      response.headers.set('Access-Control-Max-Age', '86400');
      
      return response;
    }

    return null;
  }

  /**
   * 验证请求
   */
  private async validateRequest(
    context: RequestContext,
    validation?: ValidationSchemas
  ): Promise<void> {
    if (!validation) {return;}

    try {
      // 验证查询参数
      if (validation.query) {
        validation.query.parse(context.query);
      }

      // 验证请求体
      if (validation.body && context.body) {
        validation.body.parse(context.body);
      }

      // 验证请求头
      if (validation.headers) {
        validation.headers.parse(context.headers);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(
          'Validation failed',
          { issues: error.issues },
          400,
          ErrorType.VALIDATION,
          ErrorSeverity.MEDIUM
        );
      }
      throw error;
    }
  }

  /**
   * 检查认证
   */
  private async checkAuthentication(
    context: RequestContext,
    requireAuth: boolean
  ): Promise<void> {
    if (!requireAuth) {return;}

    const apiKey = context.apiKey || context.headers['authorization']?.replace('Bearer ', '');
    
    if (!apiKey) {
      throw new AuthenticationError('API key required', null, 401, ErrorType.AUTHENTICATION, ErrorSeverity.HIGH);
    }

    try {
      const isValid = await validateApiKey(apiKey);
      if (!isValid) {
        throw new AuthenticationError('Invalid API key', null, 401, ErrorType.AUTHENTICATION, ErrorSeverity.HIGH);
      }
    } catch (error) {
      throw new AuthenticationError('Authentication failed', null, 401, ErrorType.AUTHENTICATION, ErrorSeverity.HIGH);
    }
  }

  /**
   * 检查速率限制
   */
  private async checkRateLimit(
    context: RequestContext,
    rateLimitConfig?: RouteOptions['rateLimit']
  ): Promise<void> {
    if (!this.defaultConfig.enableRateLimit && !rateLimitConfig) {return;}

    const window = rateLimitConfig?.window || this.defaultConfig.rateLimitWindow;
    const max = rateLimitConfig?.max || this.defaultConfig.rateLimitMax;
    const key = `rate_limit:${context.ip}:${context.url}`;

    try {
      const allowed = await rateLimit(key, max, window);
      if (!allowed) {
        throw new RateLimitError('Too many requests', null, 429, ErrorType.RATE_LIMIT, ErrorSeverity.LOW);
      }
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw error;
      }
      this.logger.warn('Rate limit check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        key,
      });
    }
  }

  /**
   * 检查缓存
   */
  private async checkCache(
    context: RequestContext,
    cacheConfig?: RouteOptions['cache']
  ): Promise<any> {
    if (!cacheConfig?.enabled || context.method !== 'GET') {
      return null;
    }

    const cacheKey = cacheConfig.key 
      ? cacheConfig.key(context)
      : `api:${context.url}:${JSON.stringify(context.query)}`;

    try {
      return await enhancedCacheManager.get(cacheKey);
    } catch (error) {
      this.logger.warn('Cache read failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        cacheKey,
      });
      return null;
    }
  }

  /**
   * 设置缓存
   */
  private async setCache(
    context: RequestContext,
    result: any,
    cacheConfig?: RouteOptions['cache']
  ): Promise<void> {
    if (!cacheConfig?.enabled || context.method !== 'GET' || !result) {
      return;
    }

    const cacheKey = cacheConfig.key 
      ? cacheConfig.key(context)
      : `api:${context.url}:${JSON.stringify(context.query)}`;

    try {
      await enhancedCacheManager.set(cacheKey, result, { ttl: cacheConfig.ttl });
    } catch (error) {
      this.logger.warn('Cache write failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        cacheKey,
      });
    }
  }

  /**
   * 记录请求指标
   */
  private recordMetrics(
    context: RequestContext,
    statusCode: number,
    duration: number,
    error?: string,
    cached: boolean = false
  ): void {
    if (!this.defaultConfig.enableMetrics) {return;}

    const metrics: RequestMetrics = {
      requestId: context.requestId,
      method: context.method,
      url: context.url,
      statusCode,
      duration,
      timestamp: context.timestamp,
      userAgent: context.userAgent,
      ip: context.ip,
      error,
      cached,
    };

    this.requestMetrics.set(context.requestId, metrics);
    this.emit('requestCompleted', metrics);

    // 记录慢请求
    if (duration > 5000) {
      this.logger.warn('Slow API request', {
        requestId: context.requestId,
        method: context.method,
        url: context.url,
        duration,
      });
      this.emit('slowRequest', metrics);
    }
  }

  /**
   * 处理错误响应
   */
  private handleErrorResponse(error: unknown, context: RequestContext): NextResponse {
    let statusCode = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'Internal server error';
    let details: any = undefined;

    if (error instanceof AppError) {
      statusCode = error.statusCode;
      code = error.code;
      message = error.message;
      details = error.details;
    } else if (error instanceof Error) {
      message = error.message;
    }

    // 记录错误
    this.logger.error('API request failed', {
      requestId: context.requestId,
      method: context.method,
      url: context.url,
      statusCode,
      code,
      message,
      error: error instanceof Error ? error.stack : String(error),
    });

    const errorResponse = {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
        requestId: context.requestId,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(errorResponse, { status: statusCode });
  }

  /**
   * 处理成功响应
   */
  private handleSuccessResponse(result: any, context: RequestContext): NextResponse {
    const response = {
      success: true,
      data: result,
      requestId: context.requestId,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 200 });
  }

  private sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      return input.replace(/<script.*?>.*?<\/script>/gis, '').replace(/<.*?on[a-z]+=".*?".*?>/gis, '');
    } else if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    } else if (typeof input === 'object' && input !== null) {
      const sanitized: { [key: string]: any } = {};
      for (const key in input) {
        if (Object.prototype.hasOwnProperty.call(input, key)) {
          sanitized[key] = this.sanitizeInput(input[key]);
        }
      }
      return sanitized;
    }
    return input;
  }

  /**
   * 创建API路由
   */
  public createRoute(
    handler: RouteHandler,
    options: RouteOptions = {}
  ) {
    return async (request: NextRequest): Promise<NextResponse> => {
      const startTime = Date.now();
      let context: RequestContext | null = null;
      let cached = false;

      try {
        // 创建请求上下文
        context = await this.createRequestContext(request);

        // 处理CORS预检请求
        const corsResponse = this.handleCors(request, options.cors, this.defaultConfig);
        if (corsResponse) {
          return corsResponse;
        }

        // 验证HTTP方法
        const allowedMethods = options.methods || this.defaultConfig.allowedMethods;
        this.validateMethod(context.method, allowedMethods);

        // 输入清理
        if (context.body && typeof context.body === 'object') {
          context.body = this.sanitizeInput(context.body);
        }

        // 验证请求
        if (this.defaultConfig.enableValidation) {
          await this.validateRequest(context, options.validation);
        }

        // 检查认证
        const requireAuth = options.auth ?? this.defaultConfig.enableAuth;
        await this.checkAuthentication(context, requireAuth);

        // 检查速率限制
        await this.checkRateLimit(context, options.rateLimit);

        // 检查缓存
        const cachedResult = await this.checkCache(context, options.cache);
        if (cachedResult !== null) {
          cached = true;
          const duration = Date.now() - startTime;
          this.recordMetrics(context, 200, duration, undefined, true);
          return this.handleSuccessResponse(cachedResult, context);
        }

        // 设置超时
        const timeout = options.timeout || this.defaultConfig.timeout;
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new AppError('Request timeout', 'REQUEST_TIMEOUT', 'Request timeout', 408, ErrorType.NETWORK, ErrorSeverity.MEDIUM)), timeout);
        });

        // 执行处理器
        const result = await Promise.race([
          handler(request, context),
          timeoutPromise,
        ]);

        // 设置缓存
        await this.setCache(context, result, options.cache);

        // 记录指标
        const duration = Date.now() - startTime;
        this.recordMetrics(context, 200, duration, undefined, cached);

        return this.handleSuccessResponse(result, context);
      } catch (error) {
        const duration = Date.now() - startTime;
        const statusCode = error instanceof ApiError ? error.statusCode : 500;
        
        if (context) {
          this.recordMetrics(
            context,
            statusCode,
            duration,
            error instanceof AppError ? error.message : String(error),
            cached
          );
          return this.handleErrorResponse(error, context);
        }

        // 如果无法创建上下文，返回基本错误响应
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Failed to process request',
              timestamp: new Date().toISOString(),
            },
          },
          { status: 500 }
        );
      }
    };
  }

  /**
   * 获取请求指标
   */
  public getRequestMetrics(): RequestMetrics[] {
    return Array.from(this.requestMetrics.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 100); // 返回最近100条
  }

  /**
   * 获取API统计信息
   */
  public getApiStats(): {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    slowRequests: number;
    cachedRequests: number;
  } {
    const metrics = Array.from(this.requestMetrics.values());
    const recentMetrics = metrics.filter(m => Date.now() - m.timestamp < 3600000); // 最近1小时

    const totalRequests = recentMetrics.length;
    const averageResponseTime = totalRequests > 0 
      ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests
      : 0;
    
    const errorRequests = recentMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = totalRequests > 0 ? errorRequests / totalRequests : 0;
    
    const slowRequests = recentMetrics.filter(m => m.duration > 5000).length;
    const cachedRequests = recentMetrics.filter(m => m.cached).length;

    return {
      totalRequests,
      averageResponseTime,
      errorRate,
      slowRequests,
      cachedRequests,
    };
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    if (this.metricsCleanupInterval) {
      clearInterval(this.metricsCleanupInterval);
      this.metricsCleanupInterval = null;
    }

    this.requestMetrics.clear();
    this.removeAllListeners();
    ProductionApiWrapper.instance = null;
  }
}

// 导出单例实例
export const productionApiWrapper = ProductionApiWrapper.getInstance();

// 导出便捷方法
export const createApiRoute = productionApiWrapper.createRoute.bind(productionApiWrapper);

// 导出常用验证模式
export const commonSchemas = {
  pagination: z.object({
    page: z.string().transform(Number).pipe(z.number().min(1)).optional(),
    limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional(),
  }),
  
  id: z.object({
    id: z.string().uuid(),
  }),
  
  apiKey: z.object({
    'x-api-key': z.string().min(32),
  }),
};