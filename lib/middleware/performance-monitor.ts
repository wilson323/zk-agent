// @ts-nocheck
/**
 * @file lib/middleware/performance-monitor.ts
 * @description 统一性能监控中间件 - B团队核心组件
 * @author B团队后端架构师
 * @lastUpdate 2024-12-19
 * @performance API响应≤500ms，并发≥1000 QPS
 */

import { NextRequest, NextResponse } from 'next/server';
import { Logger } from '@/lib/utils/logger';

interface PerformanceMetrics {
  requestId: string;
  method: string;
  url: string;
  startTime: number;
  endTime: number;
  duration: number;
  statusCode: number;
  userAgent?: string;
  ip?: string;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
}

interface QpsMetrics {
  timestamp: number;
  count: number;
  windowSize: number; // 时间窗口大小（秒）
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private qpsCounter: QpsMetrics[] = [];
  private logger = new Logger('PerformanceMonitor');
  
  // 性能阈值配置
  private readonly THRESHOLDS = {
    API_RESPONSE_TIME: 500, // 500ms
    QPS_LIMIT: 1000, // 1000 QPS
    MEMORY_LIMIT: 1024 * 1024 * 1024, // 1GB
    CPU_LIMIT: 80, // 80%
  };

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * 性能监控中间件
   */
  public middleware() {
    return async (
      request: NextRequest,
      handler: (req: NextRequest) => Promise<NextResponse>
    ): Promise<NextResponse> => {
      const requestId = this.generateRequestId();
      const startTime = Date.now();
      const startCpuUsage = process.cpuUsage();

      // 记录请求开始
      this.recordRequestStart(requestId, request, startTime);

      try {
        // 检查QPS限制
        await this.checkQpsLimit();

        // 执行请求处理
        const response = await handler(request);

        // 记录请求完成
        const endTime = Date.now();
        const duration = endTime - startTime;
        const endCpuUsage = process.cpuUsage(startCpuUsage);

        await this.recordRequestEnd(
          requestId,
          request,
          response,
          startTime,
          endTime,
          duration,
          endCpuUsage
        );

        // 添加性能头部
        response.headers.set('X-Request-ID', requestId);
        response.headers.set('X-Response-Time', `${duration}ms`);
        response.headers.set('X-QPS-Current', this.getCurrentQps().toString());

        return response;
      } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;

        // 记录错误
        await this.recordError(requestId, request, error, duration);
        throw error;
      }
    };
  }

  /**
   * 检查QPS限制
   */
  private async checkQpsLimit(): Promise<void> {
    const currentQps = this.getCurrentQps();
    
    if (currentQps > this.THRESHOLDS.QPS_LIMIT) {
      this.logger.warn('QPS limit exceeded', {
        currentQps,
        limit: this.THRESHOLDS.QPS_LIMIT,
      });
      
      // 可以选择抛出错误或实施限流
      throw new Error(`QPS limit exceeded: ${currentQps}/${this.THRESHOLDS.QPS_LIMIT}`);
    }
  }

  /**
   * 记录请求开始
   */
  private recordRequestStart(
    requestId: string,
    request: NextRequest,
    startTime: number
  ): void {
    // 更新QPS计数器
    this.updateQpsCounter();

    this.logger.info('Request started', {
      requestId,
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('user-agent'),
      ip: this.getClientIp(request),
    });
  }

  /**
   * 记录请求完成
   */
  private async recordRequestEnd(
    requestId: string,
    request: NextRequest,
    response: NextResponse,
    startTime: number,
    endTime: number,
    duration: number,
    cpuUsage: NodeJS.CpuUsage
  ): Promise<void> {
    const memoryUsage = process.memoryUsage();
    
    const metrics: PerformanceMetrics = {
      requestId,
      method: request.method,
      url: request.url,
      startTime,
      endTime,
      duration,
      statusCode: response.status,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: this.getClientIp(request),
      memoryUsage,
      cpuUsage,
    };

    // 存储指标
    this.metrics.set(requestId, metrics);

    // 检查性能阈值
    await this.checkPerformanceThresholds(metrics);

    // 记录日志
    const logLevel = duration > this.THRESHOLDS.API_RESPONSE_TIME ? 'warn' : 'info';
    this.logger.log(logLevel, 'Request completed', {
      requestId,
      duration,
      statusCode: response.status,
      memoryUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
    });

    // 清理旧指标（保留最近1000条）
    if (this.metrics.size > 1000) {
      const oldestKey = this.metrics.keys().next().value;
      this.metrics.delete(oldestKey);
    }
  }

  /**
   * 记录错误
   */
  private async recordError(
    requestId: string,
    request: NextRequest,
    error: any,
    duration: number
  ): Promise<void> {
    this.logger.error('Request failed', {
      requestId,
      method: request.method,
      url: request.url,
      duration,
      error: error.message,
      stack: error.stack,
    });

    // 发送错误指标到监控系统
    await this.sendErrorMetrics(requestId, error, duration);
  }

  /**
   * 检查性能阈值
   */
  private async checkPerformanceThresholds(metrics: PerformanceMetrics): Promise<void> {
    // 检查响应时间
    if (metrics.duration > this.THRESHOLDS.API_RESPONSE_TIME) {
      await this.sendAlert('SLOW_RESPONSE', {
        requestId: metrics.requestId,
        duration: metrics.duration,
        threshold: this.THRESHOLDS.API_RESPONSE_TIME,
        url: metrics.url,
      });
    }

    // 检查内存使用
    if (metrics.memoryUsage.heapUsed > this.THRESHOLDS.MEMORY_LIMIT) {
      await this.sendAlert('HIGH_MEMORY_USAGE', {
        requestId: metrics.requestId,
        memoryUsed: metrics.memoryUsage.heapUsed,
        threshold: this.THRESHOLDS.MEMORY_LIMIT,
      });
    }
  }

  /**
   * 更新QPS计数器
   */
  private updateQpsCounter(): void {
    const now = Date.now();
    const windowSize = 1000; // 1秒窗口
    
    // 清理过期的计数器
    this.qpsCounter = this.qpsCounter.filter(
      metric => now - metric.timestamp < windowSize
    );
    
    // 添加新的计数
    this.qpsCounter.push({
      timestamp: now,
      count: 1,
      windowSize,
    });
  }

  /**
   * 获取当前QPS
   */
  private getCurrentQps(): number {
    const now = Date.now();
    const windowSize = 1000; // 1秒窗口
    
    // 清理过期的计数器
    this.qpsCounter = this.qpsCounter.filter(
      metric => now - metric.timestamp < windowSize
    );
    
    return this.qpsCounter.length;
  }

  /**
   * 获取客户端IP
   */
  private getClientIp(request: NextRequest): string {
    return (
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'
    );
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 发送告警
   */
  private async sendAlert(type: string, data: any): Promise<void> {
    try {
      // 发送到监控系统或告警服务
      await fetch('/api/admin/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          data,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      this.logger.error('Failed to send alert', { type, error: error.message });
    }
  }

  /**
   * 发送错误指标
   */
  private async sendErrorMetrics(
    requestId: string,
    error: any,
    duration: number
  ): Promise<void> {
    try {
      await fetch('/api/metrics/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'error',
          requestId,
          error: error.message,
          duration,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (err) {
      this.logger.error('Failed to send error metrics', { error: err.message });
    }
  }

  /**
   * 获取性能统计
   */
  public getPerformanceStats(): any {
    const recentMetrics = Array.from(this.metrics.values())
      .filter(m => Date.now() - m.endTime < 60000); // 最近1分钟

    if (recentMetrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        currentQps: 0,
        errorRate: 0,
      };
    }

    const totalRequests = recentMetrics.length;
    const averageResponseTime = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests;
    const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = (errorCount / totalRequests) * 100;

    return {
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime),
      currentQps: this.getCurrentQps(),
      errorRate: Math.round(errorRate * 100) / 100,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
    };
  }
}

// 导出单例实例
export const performanceMonitor = PerformanceMonitor.getInstance();

// 导出中间件函数
export function withPerformanceMonitoring<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    const [request] = args;
    return performanceMonitor.middleware()(request as NextRequest, async (req) => {
      return handler(...args);
    });
  };
} 