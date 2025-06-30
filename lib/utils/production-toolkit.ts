import { createHash, randomBytes } from 'crypto';
import { z } from 'zod';
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';
import winston from 'winston';
import { performance } from 'perf_hooks';

// Note: DOMPurify, express-rate-limit, and express-slow-down are not available
// These features will be implemented using alternative approaches

// ============================================================================
// 错误类定义
// ============================================================================

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class SecurityError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string, public retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
  }
}

// ============================================================================
// 类型定义
// ============================================================================

export interface LogContext {
  userId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  error?: Error;
  [key: string]: any;
}

export interface SecurityConfig {
  enableXSS: boolean;
  enableCSRF: boolean;
  enableHSTS: boolean;
  enableContentTypeNoSniff: boolean;
  enableFrameGuard: boolean;
  trustedDomains: string[];
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface SlowDownConfig {
  windowMs: number;
  delayAfter: number;
  delayMs: number;
  maxDelayMs?: number;
}

export interface ApiKeyConfig {
  headerName: string;
  queryParam?: string;
  validKeys: Set<string>;
  keyPrefix?: string;
}

export interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  errorRate: number;
  lastUpdated: Date;
}

// ============================================================================
// 生产级日志记录器
// ============================================================================

export class ProductionLogger {
  private static instance: ProductionLogger;
  private logger: winston.Logger;
  private metrics: Map<string, PerformanceMetrics> = new Map();

  private constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return JSON.stringify({
            timestamp,
            level,
            message,
            ...meta,
            environment: process.env.NODE_ENV || 'development'
          });
        })
      ),
      defaultMeta: {
        service: 'zk-agent',
        version: process.env.APP_VERSION || '1.0.0'
      },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        })
      ]
    });
  }

  public static getInstance(): ProductionLogger {
    if (!ProductionLogger.instance) {
      ProductionLogger.instance = new ProductionLogger();
    }
    return ProductionLogger.instance;
  }

  public info(message: string, context?: LogContext): void {
    this.logger.info(message, context);
  }

  public warn(message: string, context?: LogContext): void {
    this.logger.warn(message, context);
  }

  public error(message: string, error?: Error, context?: LogContext): void {
    this.logger.error(message, { ...context, error: error?.stack || error });
  }

  public debug(message: string, context?: LogContext): void {
    this.logger.debug(message, context);
  }

  public logRequest(req: Request, res: Response, duration: number): void {
    const context: LogContext = {
      requestId: req.headers['x-request-id'] as string,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      duration
    };

    if (res.statusCode >= 400) {
      this.error(`HTTP ${res.statusCode} - ${req.method} ${req.url}`, undefined, context);
    } else {
      this.info(`HTTP ${res.statusCode} - ${req.method} ${req.url}`, context);
    }

    this.updateMetrics(req.url, duration, res.statusCode >= 400);
  }

  private updateMetrics(endpoint: string, duration: number, isError: boolean): void {
    const current = this.metrics.get(endpoint) || {
      requestCount: 0,
      averageResponseTime: 0,
      errorRate: 0,
      lastUpdated: new Date()
    };

    current.requestCount++;
    current.averageResponseTime = (current.averageResponseTime + duration) / 2;
    if (isError) {
      current.errorRate = (current.errorRate + 1) / current.requestCount;
    }
    current.lastUpdated = new Date();

    this.metrics.set(endpoint, current);
  }

  public getMetrics(): Map<string, PerformanceMetrics> {
    return new Map(this.metrics);
  }
}

// ============================================================================
// 输入清理和验证器
// ============================================================================

export class InputSanitizer {
  private static readonly MAX_STRING_LENGTH = 10000;
  private static readonly MAX_ARRAY_LENGTH = 1000;
  private static readonly DANGEROUS_PATTERNS = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /data:text\/html/gi,
    /vbscript:/gi
  ];

  public static sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      throw new ValidationError('Input must be a string');
    }

    if (input.length > this.MAX_STRING_LENGTH) {
      throw new ValidationError(`String length exceeds maximum of ${this.MAX_STRING_LENGTH}`);
    }

    // 检查危险模式
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(input)) {
        throw new SecurityError('Input contains potentially dangerous content');
      }
    }

    // Simple HTML sanitization (alternative to DOMPurify)
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      .replace(/<object[^>]*>.*?<\/object>/gi, '')
      .replace(/<embed[^>]*>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, ''); // Remove event handlers
  }

  public static sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return obj;
    }

    if (Array.isArray(obj)) {
      if (obj.length > this.MAX_ARRAY_LENGTH) {
        throw new ValidationError(`Array length exceeds maximum of ${this.MAX_ARRAY_LENGTH}`);
      }
      return obj.map(item => this.sanitizeObject(item));
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitizeString(key);
        sanitized[sanitizedKey] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  }

  public static validateSchema<T>(data: unknown, schema: z.ZodSchema<T>): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        throw new ValidationError(
          `Validation failed: ${firstError.message}`,
          firstError.path.join('.')
        );
      }
      throw error;
    }
  }

  public static sanitizeFilename(filename: string): string {
    if (!filename || typeof filename !== 'string') {
      throw new ValidationError('Filename must be a non-empty string');
    }

    // 移除路径遍历字符
    const sanitized = filename
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\.\.+/g, '_')
      .replace(/^\.|\.$/, '_')
      .substring(0, 255);

    if (!sanitized || sanitized === '_') {
      throw new ValidationError('Invalid filename after sanitization');
    }

    return sanitized;
  }
}

// ============================================================================
// 速率限制器
// ============================================================================

export class RateLimiter {
  private static requestCounts = new Map<string, { count: number; resetTime: number }>();

  public static createStandardLimiter(config: RateLimitConfig) {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = req.ip || 'unknown';
      const now = Date.now();
      const windowStart = now - config.windowMs;
      
      // Clean old entries
      for (const [k, v] of this.requestCounts.entries()) {
        if (v.resetTime < now) {
          this.requestCounts.delete(k);
        }
      }
      
      const current = this.requestCounts.get(key) || { count: 0, resetTime: now + config.windowMs };
      
      if (current.resetTime < now) {
        current.count = 0;
        current.resetTime = now + config.windowMs;
      }
      
      current.count++;
      this.requestCounts.set(key, current);
      
      if (current.count > config.max) {
        const logger = ProductionLogger.getInstance();
        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          url: req.url
        });
        
        res.status(429).json({
          error: 'Rate limit exceeded',
          message: config.message || 'Too many requests, please try again later.',
          retryAfter: Math.ceil((current.resetTime - now) / 1000)
        });
        return; // Add return here
      }
      
      next();
    };
  }

  public static createSlowDown(config: SlowDownConfig) {
    return (req: Request, res: Response, next: NextFunction) => {
      // Simple implementation - just pass through for now
      // In a real implementation, you would add delay logic here
      next();
    };
  }

  public static createApiLimiter() {
    return this.createStandardLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many API requests, please try again later.'
    });
  }

  public static createAuthLimiter() {
    return this.createStandardLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // limit each IP to 5 auth requests per windowMs
      message: 'Too many authentication attempts, please try again later.',
      skipSuccessfulRequests: true
    });
  }
}

// ============================================================================
// API密钥验证器
// ============================================================================

export class ApiKeyValidator {
  private config: ApiKeyConfig;
  private logger: ProductionLogger;

  constructor(config: ApiKeyConfig) {
    this.config = config;
    this.logger = ProductionLogger.getInstance();
  }

  public middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const apiKey = this.extractApiKey(req);
        
        if (!apiKey) {
          this.logger.warn('Missing API key', {
            ip: req.ip,
            url: req.url,
            userAgent: req.get('User-Agent')
          });
          res.status(401).json({
            error: 'Unauthorized',
            message: 'API key is required'
          });
          return; // Add return here
        }

        if (!this.validateApiKey(apiKey)) {
          this.logger.warn('Invalid API key', {
            ip: req.ip,
            url: req.url,
            userAgent: req.get('User-Agent'),
            apiKeyPrefix: apiKey.substring(0, 8) + '...'
          });
          res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid API key'
          });
          return; // Add return here
        }

        // 将API密钥信息添加到请求对象
        (req as any).apiKey = apiKey;
        next();
      } catch (error) {
        this.logger.error('API key validation error', error as Error, {
          ip: req.ip,
          url: req.url
        });
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'API key validation failed'
        });
        return; // Add return here
      }
    };
  }

  private extractApiKey(req: Request): string | null {
    // 从头部获取
    let apiKey = req.get(this.config.headerName);
    
    // 从查询参数获取（如果配置了）
    if (!apiKey && this.config.queryParam) {
      apiKey = req.query[this.config.queryParam] as string;
    }

    return apiKey || null;
  }

  private validateApiKey(apiKey: string): boolean {
    if (this.config.keyPrefix && !apiKey.startsWith(this.config.keyPrefix)) {
      return false;
    }

    return this.config.validKeys.has(apiKey);
  }

  public static generateApiKey(prefix: string = 'zk_'): string {
    const randomPart = randomBytes(32).toString('hex');
    return `${prefix}${randomPart}`;
  }

  public static hashApiKey(apiKey: string): string {
    return createHash('sha256').update(apiKey).digest('hex');
  }
}

// ============================================================================
// 安全中间件
// ============================================================================

export class SecurityMiddleware {
  public static createHelmetConfig(config: SecurityConfig) {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", ...config.trustedDomains],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      crossOriginEmbedderPolicy: false,
      hsts: config.enableHSTS ? {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      } : false,
      noSniff: config.enableContentTypeNoSniff,
      frameguard: config.enableFrameGuard ? { action: 'deny' } : false,
      xssFilter: config.enableXSS
    });
  }

  public static requestId() {
    return (req: Request, res: Response, next: NextFunction) => {
      const requestId = req.get('X-Request-ID') || randomBytes(16).toString('hex');
      req.headers['x-request-id'] = requestId;
      res.set('X-Request-ID', requestId);
      next();
    };
  }

  public static performanceMonitor() {
    const logger = ProductionLogger.getInstance();
    
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = performance.now();
      
      res.on('finish', () => {
        const duration = performance.now() - startTime;
        logger.logRequest(req, res, duration);
      });
      
      next();
    };
  }
}

// ============================================================================
// 工具函数
// ============================================================================

export class UtilityFunctions {
  public static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public static retry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000
  ): Promise<T> {
    return new Promise(async (resolve, reject) => {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const result = await fn();
          resolve(result);
          return;
        } catch (error) {
          if (attempt === maxAttempts) {
            reject(error);
            return;
          }
          await this.sleep(delay * attempt);
        }
      }
    });
  }

  public static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  public static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  public static formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) {return '0 Bytes';}
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  public static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  public static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  public static generateSecureToken(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  public static hashPassword(password: string, salt?: string): string {
    const actualSalt = salt || randomBytes(16).toString('hex');
    const hash = createHash('sha256').update(password + actualSalt).digest('hex');
    return `${actualSalt}:${hash}`;
  }

  public static verifyPassword(password: string, hashedPassword: string): boolean {
    const [salt, hash] = hashedPassword.split(':');
    const newHash = createHash('sha256').update(password + salt).digest('hex');
    return hash === newHash;
  }
}

// ============================================================================
// 导出默认配置
// ============================================================================

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  enableXSS: true,
  enableCSRF: true,
  enableHSTS: true,
  enableContentTypeNoSniff: true,
  enableFrameGuard: true,
  trustedDomains: ['localhost:3000', 'localhost:3001']
};

export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
};

export const DEFAULT_SLOW_DOWN_CONFIG: SlowDownConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50,
  delayMs: 500,
  maxDelayMs: 20000
};