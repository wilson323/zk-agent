/* eslint-disable */
// @ts-nocheck
/**
 * @file lib/system/system-initializer.ts
 * @description 系统初始化器 - B团队核心组件统一管理
 * @author B团队系统架构师
 * @lastUpdate 2024-12-19
 * @purpose 统一初始化和配置所有核心组件
 */

import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();

const logger = getLogger();
import { performanceMonitor } from '@/lib/middleware/performance-monitor';
import { enhancedDatabaseManager } from '@/lib/database/enhanced-database-manager';
import { highAvailabilityManager } from '@/lib/system/high-availability-manager';
import { unifiedAIAdapter, initializeAIServices } from '@/lib/ai/unified-ai-adapter';
import { enhancedMockService } from '@/lib/mocks/enhanced-mock-service';
import { errorMonitor } from '@/lib/monitoring/error-monitor';
import { errorTracker } from '@/lib/monitoring/error-tracker';
import {
  getErrorMonitoringConfig,
  validateErrorMonitoringConfig,
} from '@/lib/config/error-monitoring-config';

export class SystemInitializer {
  private static instance: SystemInitializer;
  private logger = new Logger('SystemInitializer');
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() { }

  public static getInstance(): SystemInitializer {
    if (!SystemInitializer.instance) {
      SystemInitializer.instance = new SystemInitializer();
    }
    return SystemInitializer.instance;
  }

  /**
   * 初始化所有系统组件
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.info('System already initialized');
      return;
    }

    if (this.initializationPromise) {
      this.logger.info('System initialization in progress, waiting...');
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  /**
   * 执行系统初始化
   */
  private async performInitialization(): Promise<void> {
    const startTime: any = Date.now();
    this.logger.info('🚀 Starting B团队 system initialization...');

    try {
      // 1. 验证环境配置
      await this.validateEnvironment();

      // 2. 初始化核心组件
      await this.initializeCoreComponents();

      // 3. 初始化AI服务
      await this.initializeAIComponents();

      // 4. 初始化监控和高可用组件
      await this.initializeMonitoringComponents();

      // 5. 初始化Mock服务（开发环境）
      await this.initializeMockServices();

      // 6. 执行健康检查
      await this.performInitialHealthCheck();

      // 7. 设置优雅关闭处理
      this.setupGracefulShutdown();

      const duration: any = Date.now() - startTime;
      this.initialized = true;

      this.logger.info('✅ B团队 system initialization completed', {
        duration: `${duration}ms`,
        components: [
          'PerformanceMonitor',
          'DatabaseManager',
          'AIAdapter',
          'HighAvailabilityManager',
          'MockService',
        ],
      });

      // 发送初始化完成事件
      await this.notifyInitializationComplete(duration);
    } catch (error) {
      this.logger.error('❌ System initialization failed', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 验证环境配置
   */
  private async validateEnvironment(): Promise<void> {
    this.logger.info('🔍 Validating environment configuration...');

    const requiredEnvVars: any = ['DATABASE_URL', 'NODE_ENV'];

    const missingVars: any = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // 验证数据库连接字符串
    if (
      !process.env.DATABASE_URL?.startsWith('postgresql://') &&
      !process.env.DATABASE_URL?.startsWith('mysql://')
    ) {
      this.logger.warn('DATABASE_URL format may be incorrect');
    }

    // 检查AI服务配置
    const aiConfigs: any = [
      { name: 'FastGPT', url: process.env.FASTGPT_API_URL, key: process.env.FASTGPT_API_KEY },
      { name: 'Qianwen', url: process.env.QWEN_BASE_URL, key: process.env.QWEN_API_KEY },
      {
        name: 'SiliconFlow',
        url: process.env.SILICONFLOW_BASE_URL,
        key: process.env.SILICONFLOW_API_KEY,
      },
    ];

    const configuredAI: any = aiConfigs.filter(config => config.url && config.key);

    if (configuredAI.length === 0) {
      this.logger.warn('No AI services configured - AI features will be limited');
    } else {
      this.logger.info('AI services configured', {
        services: configuredAI.map(c => c.name),
      });
    }

    this.logger.info('✅ Environment validation completed');
  }

  /**
   * 初始化核心组件
   */
  private async initializeCoreComponents(): Promise<void> {
    this.logger.info('🔧 Initializing core components...');

    // 数据库管理器已通过单例自动初始化
    const dbHealth: any = await enhancedDatabaseManager.healthCheck();
    if (!dbHealth.connected) {
      throw new Error('Database connection failed during initialization');
    }

    this.logger.info('✅ Core components initialized', {
      database: dbHealth.connected ? 'connected' : 'disconnected',
      latency: `${dbHealth.latency}ms`,
    });
  }

  /**
   * 初始化AI组件
   */
  private async initializeAIComponents(): Promise<void> {
    this.logger.info('🤖 Initializing AI components...');

    // 初始化AI服务配置
    initializeAIServices();

    // 获取配置的服务列表
    const configuredServices: any = unifiedAIAdapter.getConfiguredServices();

    if (configuredServices.length > 0) {
      // 测试AI服务连接
      const healthStatus: any = await unifiedAIAdapter.getHealthStatus();
      const healthyServices: any = Object.values(healthStatus).filter(
        (service: any) => service.healthy
      ).length;

      this.logger.info('✅ AI components initialized', {
        configured: configuredServices.length,
        healthy: healthyServices,
        services: configuredServices,
      });
    } else {
      this.logger.warn('⚠️ No AI services configured');
    }
  }

  /**
   * 初始化监控组件
   */
  private async initializeMonitoringComponents(): Promise<void> {
    this.logger.info('📊 Initializing monitoring components...');

    // 性能监控器已通过单例自动初始化
    const performanceStats: any = performanceMonitor.getPerformanceStats();

    // 高可用管理器已通过单例自动初始化
    const systemStatus: any = await highAvailabilityManager.getSystemStatus();

    // 启动错误监控系统
    this.logger.info('🔍 Starting error monitoring system...');
    const monitoringConfig = getErrorMonitoringConfig();

    // 验证配置
    if (!validateErrorMonitoringConfig(monitoringConfig)) {
      this.logger.warn('⚠️ Error monitoring config validation failed, using defaults');
    }

    // 启动错误监控器
    errorMonitor.startMonitoring(monitoringConfig.monitoringInterval);

    // 启动错误追踪器
    this.logger.info('📋 Starting error tracker...');
    errorTracker.startTracking();

    this.logger.info('✅ Error monitoring system started', {
      interval: monitoringConfig.monitoringInterval,
      errorRateThreshold: monitoringConfig.alertThresholds.errorRate,
      autoRecovery: monitoringConfig.autoRecovery.enabled,
      notifications: monitoringConfig.notifications.enabled,
    });

    this.logger.info('✅ Monitoring components initialized', {
      performanceMonitor: 'active',
      highAvailabilityManager: 'active',
      errorMonitor: 'active',
      errorTracker: 'active',
      services: Object.keys(systemStatus.services).length,
    });
  }

  /**
   * 初始化Mock服务
   */
  private async initializeMockServices(): Promise<void> {
    if (enhancedMockService.isEnabled()) {
      this.logger.info('🎭 Initializing mock services...');

      const mockStats: any = enhancedMockService.getMockStatistics();

      this.logger.info('✅ Mock services initialized', {
        enabled: true,
        users: mockStats?.users?.total || 0,
        cadFiles: mockStats?.cadFiles?.total || 0,
        aiModels: mockStats?.aiModels?.total || 0,
      });
    } else {
      this.logger.info('🎭 Mock services disabled');
    }
  }

  /**
   * 执行初始健康检查
   */
  private async performInitialHealthCheck(): Promise<void> {
    this.logger.info('🏥 Performing initial health check...');

    const [databaseHealth, aiHealth, systemStatus] = await Promise.all([
      enhancedDatabaseManager.healthCheck(),
      unifiedAIAdapter.getHealthStatus(),
      highAvailabilityManager.getSystemStatus(),
    ]);

    const healthSummary: any = {
      database: {
        status: databaseHealth.connected ? 'healthy' : 'unhealthy',
        latency: databaseHealth.latency,
      },
      ai: {
        total: Object.keys(aiHealth).length,
        healthy: Object.values(aiHealth).filter((s: any) => s.healthy).length,
      },
      system: {
        services: Object.keys(systemStatus.services).length,
        uptime: systemStatus.uptime,
      },
    };

    this.logger.info('✅ Initial health check completed', healthSummary);

    // 如果关键服务不健康，发出警告
    if (!databaseHealth.connected) {
      this.logger.error('❌ Database is not healthy');
    }

    if (healthSummary.ai.healthy === 0 && healthSummary.ai.total > 0) {
      this.logger.warn('⚠️ No AI services are healthy');
    }
  }

  /**
   * 设置优雅关闭处理
   */
  private setupGracefulShutdown(): void {
    const gracefulShutdown: any = async (signal: string) => {
      this.logger.info(`🛑 Received ${signal}, starting graceful shutdown...`);

      try {
        // 停止接受新请求
        // 这里可以添加停止HTTP服务器的逻辑

        // 关闭高可用管理器
        await highAvailabilityManager.gracefulShutdown();

        // 关闭数据库连接
        await enhancedDatabaseManager.gracefulShutdown();

        this.logger.info('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        this.logger.error('❌ Error during graceful shutdown', {
          error: error.message,
        });
        process.exit(1);
      }
    };

    // 监听关闭信号
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // 监听未捕获的异常
    process.on('uncaughtException', error => {
      this.logger.error('❌ Uncaught exception', {
        error: error.message,
        stack: error.stack,
      });
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('❌ Unhandled rejection', {
        reason,
        promise,
      });
      gracefulShutdown('unhandledRejection');
    });

    this.logger.info('✅ Graceful shutdown handlers registered');
  }

  /**
   * 通知初始化完成
   */
  private async notifyInitializationComplete(duration: number): Promise<void> {
    try {
      // 这里可以发送初始化完成的通知
      // 例如发送到监控系统、Slack、邮件等

      const notification: any = {
        type: 'SYSTEM_INITIALIZED',
        timestamp: new Date().toISOString(),
        duration,
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0',
      };

      // 发送到内部监控API
      if (process.env.NODE_ENV === 'production') {
        await fetch('/api/admin/alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notification),
        }).catch(() => {
          // 忽略通知发送失败
        });
      }
    } catch (error) {
      this.logger.warn('Failed to send initialization notification', {
        error: error.message,
      });
    }
  }

  /**
   * 获取初始化状态
   */
  getInitializationStatus(): {
    initialized: boolean;
    inProgress: boolean;
  } {
    return {
      initialized: this.initialized,
      inProgress: this.initializationPromise !== null && !this.initialized,
    };
  }

  /**
   * 重新初始化系统
   */
  async reinitialize(): Promise<void> {
    this.logger.info('🔄 Reinitializing system...');

    this.initialized = false;
    this.initializationPromise = null;

    await this.initialize();
  }

  /**
   * 获取系统信息
   */
  getSystemInfo(): any {
    return {
      initialized: this.initialized,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      pid: process.pid,
      memory: process.memoryUsage(),
    };
  }
}

// 导出单例实例
export const systemInitializer: any = SystemInitializer.getInstance();

// 导出便捷方法
export const initializeSystem: any = systemInitializer.initialize.bind(systemInitializer);
export const getSystemInfo: any = systemInitializer.getSystemInfo.bind(systemInitializer);
