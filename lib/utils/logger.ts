// @ts-nocheck
/**
 * @file 日志管理工具
 * @description 统一的日志记录和管理
 * @author ZK-Agent Team
 * @date 2024-01-20
 */

import winston from 'winston';
import { monitoringConfig, isDevelopment, isProduction } from '@/config/env';
import path from 'path';
import fs from 'fs';

// 确保日志目录存在
const logDir = monitoringConfig.logFilePath;
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 自定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

// 控制台格式（开发环境）
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.simple(),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    let log = `${timestamp} ${level}: ${message}`;
    if (stack) {
      log += `\n${stack}`;
    }
    return log;
  })
);

// 创建传输器
const transports: winston.transport[] = [];

// 控制台输出（开发环境）
if (isDevelopment) {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug',
    })
  );
}

// 文件输出（生产环境）
if (isProduction) {
  // 错误日志
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    })
  );

  // 组合日志
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: logFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
    })
  );

  // 访问日志
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'access.log'),
      level: 'info',
      format: logFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
    })
  );
}

// 创建 logger 实例
const logger = winston.createLogger({
  level: monitoringConfig.logLevel,
  format: logFormat,
  transports,
  exitOnError: false,
});

// 日志级别枚举
export enum LogLevel {
  ERROR = 'error',
  _WARN = 'warn',
  _INFO = 'info',
  _DEBUG = 'debug',
}

// 日志上下文接口
export interface ILogContext {
  userId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  [key: string]: any;
}

/**
 * 日志管理类
 */
export class Logger {
  private context: ILogContext;

  constructor(context: ILogContext | string = {}) {
    if (typeof context === 'string') {
      this.context = { component: context };
    } else {
      this.context = context;
    }
  }

  /**
   * 创建带上下文的日志实例
   */
  static withContext(context: ILogContext): Logger {
    return new Logger(context);
  }

  /**
   * 记录错误日志
   */
  error(message: string, error?: Error | any, meta: ILogContext = {}): void {
    const logMeta = { ...this.context, ...meta };
    
    if (error instanceof Error) {
      logMeta.stack = error.stack;
      logMeta.errorName = error.name;
      logMeta.errorMessage = error.message;
    } else if (error) {
      logMeta.error = error;
    }

    logger.error(message, logMeta);
  }

  /**
   * 记录警告日志
   */
  warn(message: string, meta: ILogContext = {}): void {
    logger.warn(message, { ...this.context, ...meta });
  }

  /**
   * 记录信息日志
   */
  info(message: string, meta: ILogContext = {}): void {
    logger.info(message, { ...this.context, ...meta });
  }

  /**
   * 记录调试日志
   */
  debug(message: string, meta: ILogContext = {}): void {
    logger.debug(message, { ...this.context, ...meta });
  }

  /**
   * 记录API访问日志
   */
  access(meta: ILogContext): void {
    const { method, url, statusCode, duration, userId, ip } = meta;
    const message = `${method} ${url} ${statusCode} ${duration}ms`;
    
    this.info(message, {
      type: 'access',
      userId,
      ip,
      ...meta,
    });
  }

  /**
   * 记录业务操作日志
   */
  business(action: string, meta: ILogContext = {}): void {
    this.info(`业务操作: ${action}`, {
      type: 'business',
      action,
      ...this.context,
      ...meta,
    });
  }

  /**
   * 记录安全事件日志
   */
  security(event: string, meta: ILogContext = {}): void {
    this.warn(`安全事件: ${event}`, {
      type: 'security',
      event,
      ...this.context,
      ...meta,
    });
  }

  /**
   * 记录性能日志
   */
  performance(operation: string, duration: number, meta: ILogContext = {}): void {
    const level = duration > 1000 ? 'warn' : 'info';
    const message = `性能监控: ${operation} 耗时 ${duration}ms`;
    
    logger.log(level, message, {
      type: 'performance',
      operation,
      duration,
      ...this.context,
      ...meta,
    });
  }
}

// 默认日志实例
export const defaultLogger = new Logger();

// 便捷方法
export const log = {
  error: (message: string, error?: Error | any, meta?: ILogContext) => 
    defaultLogger.error(message, error, meta),
  warn: (message: string, meta?: ILogContext) => 
    defaultLogger.warn(message, meta),
  info: (message: string, meta?: ILogContext) => 
    defaultLogger.info(message, meta),
  debug: (message: string, meta?: ILogContext) => 
    defaultLogger.debug(message, meta),
  access: (meta: ILogContext) => 
    defaultLogger.access(meta),
  business: (action: string, meta?: ILogContext) => 
    defaultLogger.business(action, meta),
  security: (event: string, meta?: ILogContext) => 
    defaultLogger.security(event, meta),
  performance: (operation: string, duration: number, meta?: ILogContext) => 
    defaultLogger.performance(operation, duration, meta),
};

export default logger;