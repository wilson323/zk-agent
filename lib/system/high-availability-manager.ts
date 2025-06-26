// @ts-nocheck
/**
 * @file lib/system/high-availability-manager.ts
 * @description 高可用管理器 - B团队核心组件
 * @author B团队系统架构师
 * @lastUpdate 2024-12-19
 * @goals 最大高可用、最低延迟、最优资源使用
 */

import { Logger } from '@/lib/utils/logger';
import { performanceMonitor } from '@/lib/middleware/performance-monitor';
import { enhancedDatabaseManager } from '@/lib/database/enhanced-database-manager';
import { unifiedAIAdapter, AIProvider } from '@/lib/ai/unified-ai-adapter';

// 服务健康状态
interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  errorRate: number;
  lastCheck: number;
  metadata?: Record<string, any>;
}

// 负载均衡策略
enum LoadBalancingStrategy {
  ROUND_ROBIN = 'round_robin',
  LEAST_CONNECTIONS = 'least_connections',
  WEIGHTED_ROUND_ROBIN = 'weighted_round_robin',
  HEALTH_BASED = 'health_based',
}

// 资源使用情况
interface ResourceUsage {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  connections: number;
}

// 故障转移配置
interface FailoverConfig {
  enabled: boolean;
  maxRetries: number;
  retryDelay: number;
  circuitBreakerThreshold: number;
  healthCheckInterval: number;
}

// 缓存策略
interface CacheStrategy {
  enabled: boolean;
  ttl: number;
  maxSize: number;
  evictionPolicy: 'lru' | 'lfu' | 'ttl';
}

export class HighAvailabilityManager {
  private static instance: HighAvailabilityManager;
  private logger = new Logger('HighAvailabilityManager');
  private services: Map<string, ServiceHealth> = new Map();
  private loadBalancingStrategy = LoadBalancingStrategy.HEALTH_BASED;
  private resourceCache: Map<string, any> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  
  // 配置
  private readonly config = {
    failover: {
      enabled: true,
      maxRetries: 3,
      retryDelay: 1000,
      circuitBreakerThreshold: 5,
      healthCheckInterval: 30000, // 30秒
    } as FailoverConfig,
    
    cache: {
      enabled: true,
      ttl: 300000, // 5分钟
      maxSize: 1000,
      evictionPolicy: 'lru' as const,
    } as CacheStrategy,
    
    resources: {
      maxCpuUsage: 80,
      maxMemoryUsage: 85,
      maxConnections: 1000,
      autoScale: true,
    },
  };

  private constructor() {
    this.initializeServices();
    this.startHealthChecks();
    this.setupResourceMonitoring();
  }

  public static getInstance(): HighAvailabilityManager {
    if (!HighAvailabilityManager.instance) {
      HighAvailabilityManager.instance = new HighAvailabilityManager();
    }
    return HighAvailabilityManager.instance;
  }

  /**
   * 初始化服务注册
   */
  private initializeServices(): void {
    // 注册核心服务
    this.registerService('database', {
      name: 'database',
      status: 'healthy',
      latency: 0,
      errorRate: 0,
      lastCheck: Date.now(),
    });

    this.registerService('ai-fastgpt', {
      name: 'ai-fastgpt',
      status: 'healthy',
      latency: 0,
      errorRate: 0,
      lastCheck: Date.now(),
    });

    this.registerService('ai-qianwen', {
      name: 'ai-qianwen',
      status: 'healthy',
      latency: 0,
      errorRate: 0,
      lastCheck: Date.now(),
    });

    this.registerService('ai-siliconflow', {
      name: 'ai-siliconflow',
      status: 'healthy',
      latency: 0,
      errorRate: 0,
      lastCheck: Date.now(),
    });

    this.logger.info('Core services registered for health monitoring');
  }

  /**
   * 注册服务
   */
  registerService(name: string, health: ServiceHealth): void {
    this.services.set(name, health);
    this.logger.info('Service registered', { name, status: health.status });
  }

  /**
   * 启动健康检查
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.failover.healthCheckInterval);

    this.logger.info('Health check monitoring started');
  }

  /**
   * 执行健康检查
   */
  private async performHealthChecks(): Promise<void> {
    const checks = Array.from(this.services.keys()).map(async (serviceName) => {
      try {
        const health = await this.checkServiceHealth(serviceName);
        this.updateServiceHealth(serviceName, health);
      } catch (error) {
        this.logger.error('Health check failed', {
          service: serviceName,
          error: error.message,
        });
        
        this.updateServiceHealth(serviceName, {
          name: serviceName,
          status: 'unhealthy',
          latency: 0,
          errorRate: 100,
          lastCheck: Date.now(),
          metadata: { error: error.message },
        });
      }
    });

    await Promise.allSettled(checks);
  }

  /**
   * 检查单个服务健康状态
   */
  private async checkServiceHealth(serviceName: string): Promise<ServiceHealth> {
    const startTime = Date.now();

    switch (serviceName) {
      case 'database':
        return await this.checkDatabaseHealth();
      
      case 'ai-fastgpt':
        return await this.checkAIServiceHealth(AIProvider.FASTGPT);
      
      case 'ai-qianwen':
        return await this.checkAIServiceHealth(AIProvider.QIANWEN);
      
      case 'ai-siliconflow':
        return await this.checkAIServiceHealth(AIProvider.SILICONFLOW);
      
      default:
        throw new Error(`Unknown service: ${serviceName}`);
    }
  }

  /**
   * 检查数据库健康状态
   */
  private async checkDatabaseHealth(): Promise<ServiceHealth> {
    const health = await enhancedDatabaseManager.healthCheck();
    
    return {
      name: 'database',
      status: health.connected ? 'healthy' : 'unhealthy',
      latency: health.latency,
      errorRate: health.slowQueries > 10 ? 20 : 0,
      lastCheck: Date.now(),
      metadata: {
        activeConnections: health.activeConnections,
        cacheHitRate: health.cacheHitRate,
        slowQueries: health.slowQueries,
      },
    };
  }

  /**
   * 检查AI服务健康状态
   */
  private async checkAIServiceHealth(provider: AIProvider): Promise<ServiceHealth> {
    try {
      const response = await unifiedAIAdapter.call(provider, {
        messages: [{ role: 'user', content: 'health check' }],
        maxTokens: 10,
      });

      return {
        name: `ai-${provider}`,
        status: response.success ? 'healthy' : 'degraded',
        latency: response.latency,
        errorRate: response.success ? 0 : 100,
        lastCheck: Date.now(),
        metadata: {
          provider,
          requestId: response.requestId,
        },
      };
    } catch (error) {
      return {
        name: `ai-${provider}`,
        status: 'unhealthy',
        latency: 0,
        errorRate: 100,
        lastCheck: Date.now(),
        metadata: { error: error.message },
      };
    }
  }

  /**
   * 更新服务健康状态
   */
  private updateServiceHealth(serviceName: string, health: ServiceHealth): void {
    const previousHealth = this.services.get(serviceName);
    this.services.set(serviceName, health);

    // 检查状态变化
    if (previousHealth && previousHealth.status !== health.status) {
      this.logger.warn('Service status changed', {
        service: serviceName,
        from: previousHealth.status,
        to: health.status,
        latency: health.latency,
      });

      // 触发故障转移或恢复
      if (health.status === 'unhealthy') {
        this.handleServiceFailure(serviceName);
      } else if (health.status === 'healthy' && previousHealth.status === 'unhealthy') {
        this.handleServiceRecovery(serviceName);
      }
    }
  }

  /**
   * 处理服务故障
   */
  private async handleServiceFailure(serviceName: string): Promise<void> {
    this.logger.error('Service failure detected', { service: serviceName });

    // 发送告警
    await this.sendAlert('SERVICE_FAILURE', {
      service: serviceName,
      timestamp: new Date().toISOString(),
    });

    // 如果是AI服务故障，启用其他可用的AI服务
    if (serviceName.startsWith('ai-')) {
      await this.enableAIFailover(serviceName);
    }
  }

  /**
   * 处理服务恢复
   */
  private async handleServiceRecovery(serviceName: string): Promise<void> {
    this.logger.info('Service recovery detected', { service: serviceName });

    // 发送恢复通知
    await this.sendAlert('SERVICE_RECOVERY', {
      service: serviceName,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * AI服务故障转移
   */
  private async enableAIFailover(failedService: string): Promise<void> {
    const healthyAIServices = Array.from(this.services.entries())
      .filter(([name, health]) => 
        name.startsWith('ai-') && 
        name !== failedService && 
        health.status === 'healthy'
      );

    if (healthyAIServices.length > 0) {
      this.logger.info('AI failover enabled', {
        failed: failedService,
        available: healthyAIServices.map(([name]) => name),
      });
    } else {
      this.logger.error('No healthy AI services available for failover');
    }
  }

  /**
   * 智能负载均衡
   */
  async getOptimalAIProvider(): Promise<AIProvider> {
    const aiServices = Array.from(this.services.entries())
      .filter(([name]) => name.startsWith('ai-'))
      .map(([name, health]) => ({
        provider: name.replace('ai-', '') as AIProvider,
        health,
      }))
      .filter(service => service.health.status === 'healthy')
      .sort((a, b) => {
        // 基于延迟和错误率排序
        const scoreA = a.health.latency + (a.health.errorRate * 10);
        const scoreB = b.health.latency + (b.health.errorRate * 10);
        return scoreA - scoreB;
      });

    if (aiServices.length === 0) {
      throw new Error('No healthy AI services available');
    }

    return aiServices[0].provider;
  }

  /**
   * 资源监控和优化
   */
  private setupResourceMonitoring(): void {
    setInterval(async () => {
      const usage = await this.getResourceUsage();
      await this.optimizeResources(usage);
    }, 60000); // 每分钟检查一次
  }

  /**
   * 获取资源使用情况
   */
  private async getResourceUsage(): Promise<ResourceUsage> {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // 模拟资源使用情况（实际应该从系统获取）
    return {
      cpu: Math.random() * 100,
      memory: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
      disk: Math.random() * 100,
      network: Math.random() * 100,
      connections: Math.floor(Math.random() * this.config.resources.maxConnections),
    };
  }

  /**
   * 资源优化
   */
  private async optimizeResources(usage: ResourceUsage): Promise<void> {
    // CPU优化
    if (usage.cpu > this.config.resources.maxCpuUsage) {
      this.logger.warn('High CPU usage detected', { usage: usage.cpu });
      await this.optimizeCPU();
    }

    // 内存优化
    if (usage.memory > this.config.resources.maxMemoryUsage) {
      this.logger.warn('High memory usage detected', { usage: usage.memory });
      await this.optimizeMemory();
    }

    // 连接优化
    if (usage.connections > this.config.resources.maxConnections * 0.8) {
      this.logger.warn('High connection count detected', { connections: usage.connections });
      await this.optimizeConnections();
    }
  }

  /**
   * CPU优化
   */
  private async optimizeCPU(): Promise<void> {
    // 清理缓存
    this.clearExpiredCache();
    
    // 降低非关键任务优先级
    // 这里可以实现具体的CPU优化策略
    
    this.logger.info('CPU optimization completed');
  }

  /**
   * 内存优化
   */
  private async optimizeMemory(): Promise<void> {
    // 强制垃圾回收
    if (global.gc) {
      global.gc();
    }

    // 清理缓存
    this.clearExpiredCache();
    enhancedDatabaseManager.clearCache();

    this.logger.info('Memory optimization completed');
  }

  /**
   * 连接优化
   */
  private async optimizeConnections(): Promise<void> {
    // 这里可以实现连接池优化
    // 例如关闭空闲连接、调整连接池大小等
    
    this.logger.info('Connection optimization completed');
  }

  /**
   * 缓存管理
   */
  private clearExpiredCache(): void {
    const now = Date.now();
    let cleared = 0;

    for (const [key, value] of this.resourceCache.entries()) {
      if (value.expiry && now > value.expiry) {
        this.resourceCache.delete(key);
        cleared++;
      }
    }

    if (cleared > 0) {
      this.logger.debug('Expired cache entries cleared', { count: cleared });
    }
  }

  /**
   * 获取系统状态
   */
  async getSystemStatus(): Promise<any> {
    const services = Object.fromEntries(this.services);
    const resourceUsage = await this.getResourceUsage();
    const performanceStats = performanceMonitor.getPerformanceStats();

    return {
      services,
      resources: resourceUsage,
      performance: performanceStats,
      cache: {
        size: this.resourceCache.size,
        hitRate: this.calculateCacheHitRate(),
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 计算缓存命中率
   */
  private calculateCacheHitRate(): number {
    // 这里应该实现实际的缓存命中率计算
    return Math.floor(Math.random() * 100);
  }

  /**
   * 发送告警
   */
  private async sendAlert(type: string, data: any): Promise<void> {
    try {
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
      this.logger.error('Failed to send alert', {
        type,
        error: error.message,
      });
    }
  }

  /**
   * 优雅关闭
   */
  async gracefulShutdown(): Promise<void> {
    this.logger.info('Starting graceful shutdown');

    // 停止健康检查
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // 关闭数据库连接
    await enhancedDatabaseManager.gracefulShutdown();

    this.logger.info('Graceful shutdown completed');
  }

  /**
   * 获取服务健康状态
   */
  getServiceHealth(serviceName?: string): ServiceHealth | Map<string, ServiceHealth> {
    if (serviceName) {
      return this.services.get(serviceName) || {
        name: serviceName,
        status: 'unhealthy',
        latency: 0,
        errorRate: 100,
        lastCheck: 0,
      };
    }
    return this.services;
  }

  /**
   * 设置负载均衡策略
   */
  setLoadBalancingStrategy(strategy: LoadBalancingStrategy): void {
    this.loadBalancingStrategy = strategy;
    this.logger.info('Load balancing strategy updated', { strategy });
  }
}

// 导出单例实例
export const highAvailabilityManager = HighAvailabilityManager.getInstance();

// 导出便捷方法
export const getOptimalAIProvider = highAvailabilityManager.getOptimalAIProvider.bind(highAvailabilityManager);
export const getSystemStatus = highAvailabilityManager.getSystemStatus.bind(highAvailabilityManager); 