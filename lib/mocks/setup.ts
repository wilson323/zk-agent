// @ts-nocheck
/**
 * @file MSW Mock API Setup
 * @description 为前端开发提供独立的API Mock环境，避免直接调用后端服务
 * @author ZK-Agent Team A
 * @date 2024-12-19
 */

import { setupWorker } from 'msw/browser';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// 性能监控配置
interface MockMetrics {
  requestCount: number;
  averageResponseTime: number;
  errorCount: number;
  lastRequestTime: Date | null;
}

class MockPerformanceMonitor {
  private metrics: MockMetrics = {
    requestCount: 0,
    averageResponseTime: 0,
    errorCount: 0,
    lastRequestTime: null,
  };

  recordRequest(responseTime: number, isError: boolean = false) {
    this.metrics.requestCount++;
    this.metrics.lastRequestTime = new Date();

    // 计算平均响应时间
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime * (this.metrics.requestCount - 1) + responseTime) /
      this.metrics.requestCount;

    if (isError) {
      this.metrics.errorCount++;
    }
  }

  getMetrics(): MockMetrics {
    return { ...this.metrics };
  }

  reset() {
    this.metrics = {
      requestCount: 0,
      averageResponseTime: 0,
      errorCount: 0,
      lastRequestTime: null,
    };
  }
}

export const mockMonitor = new MockPerformanceMonitor();

// 浏览器环境的Mock Worker
export const worker = typeof window !== 'undefined' ? setupWorker(...handlers) : null;

// Node.js环境的Mock Server (用于测试)
export const server = setupServer(...handlers);

// 启动Mock服务
export const startMocking = async () => {
  if (typeof window !== 'undefined') {
    // 浏览器环境
    if (worker) {
      await worker.start({
        onUnhandledRequest: 'warn',
        serviceWorker: {
          url: '/mockServiceWorker.js',
        },
      });

      // 添加请求监听器
      worker.events.on('request:start', ({ request }) => {
        const startTime = Date.now();
        request.startTime = startTime;

        if (process.env.NODE_ENV === 'development') {
          console.log('Development mode detected');
        }
      });
    }
  }
};

// 类型扩展
declare global {
  interface Request {
    startTime?: number;
  }
}
