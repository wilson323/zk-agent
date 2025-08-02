/**
 * @file Database Connection Pool Optimizer
 * @description 数据库连接池动态优化器
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

import { EventEmitter } from 'events';
import { databaseMonitor } from './monitoring';
import { AlertLevel } from '@/lib/types/enums';
import { DatabaseMetrics } from './unified-interfaces';

// 连接池配置
export interface PoolConfiguration {
  connectionLimit: number;
  acquireTimeoutMillis: number;
  createTimeoutMillis: number;
  destroyTimeoutMillis: number;
  idleTimeoutMillis: number;
  reapIntervalMillis: number;
  createRetryIntervalMillis: number;
  min: number;
  max: number;
}

// 优化策略
export interface OptimizationStrategy {
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  conditions: {
    minMetricsCount: number;
    timeWindowMs: number;
    triggers: {
      highLatency?: number;
      highFailureRate?: number;
      lowThroughput?: number;
      highCpuUsage?: number;
      highMemoryUsage?: number;
    };
  };
  actions: {
    adjustConnectionLimit?: {
      increment?: number;
      decrement?: number;
      maxLimit?: number;
      minLimit?: number;
    };
    adjustTimeouts?: {
      acquireTimeout?: number;
      createTimeout?: number;
      idleTimeout?: number;
    };
    adjustPoolSize?: {
      minConnections?: number;
      maxConnections?: number;
    };
  };
}

// 优化结果
export interface OptimizationResult {
  timestamp: Date;
  strategy: string;
  previousConfig: Partial<PoolConfiguration>;
  newConfig: Partial<PoolConfiguration>;
  reason: string;
  metrics: DatabaseMetrics;
  success: boolean;
  error?: string;
}

/**
 * 数据库连接池优化器
 */
export class DatabasePoolOptimizer extends EventEmitter {
  private isOptimizing: boolean = false;
  private optimizationInterval: NodeJS.Timeout | null = null;
  private optimizationHistory: OptimizationResult[] = [];
  private strategies: OptimizationStrategy[];
  private currentConfig: PoolConfiguration;
  private intervalMs: number;
  private maxHistorySize: number;
  private lastOptimization: Date | null = null;
  private cooldownMs: number;
  private optimizationFrequency: number;

  constructor(
    intervalMs: number = 60000, // 1分钟检查一次
    maxHistorySize: number = 100,
    cooldownMs: number = 300000 // 5分钟冷却期
  ) {
    super();

    this.intervalMs = intervalMs;
    this.maxHistorySize = maxHistorySize;
    this.cooldownMs = cooldownMs;
    this.optimizationFrequency = intervalMs; // 使用相同的间隔时间

    // 初始化当前配置
    this.currentConfig = this.getDefaultConfiguration();

    // 初始化优化策略
    this.strategies = this.getDefaultStrategies();

    // 延迟监听数据库监控事件，避免循环依赖
    process.nextTick(() => {
      this.setupMonitoringEventListeners();
    });
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfiguration(): PoolConfiguration {
    return {
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
      acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'),
      createTimeoutMillis: parseInt(process.env.DB_CREATE_TIMEOUT || '30000'),
      destroyTimeoutMillis: parseInt(process.env.DB_DESTROY_TIMEOUT || '5000'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '300000'),
      reapIntervalMillis: parseInt(process.env.DB_REAP_INTERVAL || '1000'),
      createRetryIntervalMillis: parseInt(process.env.DB_CREATE_RETRY_INTERVAL || '200'),
      min: parseInt(process.env.DB_MIN_CONNECTIONS || '2'),
      max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    };
  }

  /**
   * 获取默认优化策略
   */
  private getDefaultStrategies(): OptimizationStrategy[] {
    return [
      {
        name: 'high_latency_scale_up',
        description: '高延迟时增加连接数',
        enabled: true,
        priority: 1,
        conditions: {
          minMetricsCount: 5,
          timeWindowMs: 300000, // 5分钟
          triggers: {
            highLatency: parseFloat(process.env.DB_HIGH_LATENCY_THRESHOLD || '1000'),
          },
        },
        actions: {
          adjustConnectionLimit: {
            increment: 2,
            maxLimit: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
          },
          adjustPoolSize: {
            maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
          },
        },
      },
      {
        name: 'high_failure_rate_timeout_increase',
        description: '高失败率时增加超时时间',
        enabled: true,
        priority: 2,
        conditions: {
          minMetricsCount: 3,
          timeWindowMs: 180000, // 3分钟
          triggers: {
            highFailureRate: parseFloat(process.env.DB_HIGH_FAILURE_RATE_THRESHOLD || '5'),
          },
        },
        actions: {
          adjustTimeouts: {
            acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000') * 1.5,
            createTimeout: parseInt(process.env.DB_CREATE_TIMEOUT || '30000') * 1.5,
          },
        },
      },
      {
        name: 'low_usage_scale_down',
        description: '低使用率时减少连接数',
        enabled: true,
        priority: 3,
        conditions: {
          minMetricsCount: 10,
          timeWindowMs: 600000, // 10分钟
          triggers: {
            lowThroughput: parseFloat(process.env.DB_LOW_THROUGHPUT_THRESHOLD || '0.1'),
          },
        },
        actions: {
          adjustConnectionLimit: {
            decrement: 1,
            minLimit: parseInt(process.env.DB_MIN_CONNECTIONS || '2'),
          },
          adjustPoolSize: {
            minConnections: parseInt(process.env.DB_MIN_CONNECTIONS || '2'),
          },
        },
      },
      {
        name: 'high_memory_usage_optimize',
        description: '高内存使用时优化连接池',
        enabled: true,
        priority: 4,
        conditions: {
          minMetricsCount: 3,
          timeWindowMs: 180000,
          triggers: {
            highMemoryUsage: parseFloat(process.env.DB_HIGH_MEMORY_THRESHOLD || '80'), // 80% 内存使用率
          },
        },
        actions: {
          adjustTimeouts: {
            idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '300000') * 0.5, // 减少空闲超时
          },
          adjustConnectionLimit: {
            decrement: 1,
            minLimit: parseInt(process.env.DB_MIN_CONNECTIONS || '2'),
          },
        },
      },
      {
        name: 'connection_recovery',
        description: '连接恢复优化',
        enabled: true,
        priority: 5,
        conditions: {
          minMetricsCount: 2,
          timeWindowMs: 120000, // 2分钟
          triggers: {
            highFailureRate: 10, // 10% 失败率触发恢复
          },
        },
        actions: {
          adjustTimeouts: {
            createTimeout: parseInt(process.env.DB_CREATE_TIMEOUT || '30000') * 2,
            acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000') * 2,
          },
          adjustPoolSize: {
            minConnections: Math.max(1, parseInt(process.env.DB_MIN_CONNECTIONS || '2') - 1),
          },
        },
      },
    ];
  }

  /**
   * 设置监控事件监听器
   */
  private setupMonitoringEventListeners(): void {
    databaseMonitor.on('alert', alert => {
      if (alert.level === AlertLevel.CRITICAL || alert.level === AlertLevel.ERROR) {
        // 紧急情况下立即触发优化
        this.triggerImmediateOptimization(alert.message);
      }
    });

    databaseMonitor.on('metrics', metrics => {
      // 定期检查是否需要优化
      if (this.shouldTriggerOptimization(metrics)) {
        this.performOptimization();
      }
    });
  }

  /**
   * 开始优化
   */
  startOptimization(): void {
    if (this.isOptimizing) {
      return;
    }

    this.isOptimizing = true;
    console.log('Pool optimization started');

    // 开始优化逻辑
    this.optimizationInterval = setInterval(() => {
      this.performOptimization();
    }, this.optimizationFrequency);
  }

  /**
   * 停止优化
   */
  stopOptimization(): void {
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.isOptimizing = false;
      console.log('Pool optimization stopped');
    }
  }

  /**
   * 执行优化
   */
  private performOptimization(): void {
    // 优化逻辑实现
    console.log('Performing pool optimization');
  }

  /**
   * 立即触发优化
   * @param reason 触发原因
   */
  private triggerImmediateOptimization(reason: string): void {
    try {
      console.log(`Triggering immediate optimization: ${reason}`);
      
      // 如果当前正在优化，跳过
      if (this.isOptimizing) {
        console.log('Optimization already in progress, skipping immediate trigger');
        return;
      }

      // 检查冷却期
      if (this.lastOptimization && 
          Date.now() - this.lastOptimization.getTime() < this.cooldownMs) {
        console.log('Still in cooldown period, skipping immediate optimization');
        return;
      }

      // 立即执行优化
      this.performOptimization();
      this.lastOptimization = new Date();

      // 发出事件
      this.emit('immediateOptimization', {
        reason,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Failed to trigger immediate optimization:', error);
    }
  }

  /**
   * 降级连接池
   * 在系统负载过高或出现问题时减少连接数
   * @param reason 降级原因
   * @returns Promise<boolean> 降级是否成功
   */
  async degradePool(reason: string = 'System overload'): Promise<boolean> {
    try {
      console.log(`Degrading database pool: ${reason}`);

      // 获取当前配置
      const currentConfig = { ...this.currentConfig };

      // 计算降级后的配置
      const degradedConfig: Partial<PoolConfiguration> = {
        connectionLimit: Math.max(2, Math.floor(currentConfig.connectionLimit * 0.7)),
        max: Math.max(2, Math.floor(currentConfig.max * 0.7)),
        min: Math.max(1, Math.floor(currentConfig.min * 0.8)),
        acquireTimeoutMillis: Math.max(5000, currentConfig.acquireTimeoutMillis * 0.8),
        idleTimeoutMillis: Math.max(30000, currentConfig.idleTimeoutMillis * 0.8)
      };

      // 应用降级配置
      this.currentConfig = { ...currentConfig, ...degradedConfig };

      // 记录优化结果
      const result: OptimizationResult = {
        timestamp: new Date(),
        strategy: 'pool_degradation',
        previousConfig: currentConfig,
        newConfig: degradedConfig,
        reason,
        metrics: {} as DatabaseMetrics, // 在实际实现中应该获取当前指标
        success: true
      };

      this.optimizationHistory.push(result);

      // 限制历史记录大小
      if (this.optimizationHistory.length > this.maxHistorySize) {
        this.optimizationHistory.shift();
      }

      // 发出事件
      this.emit('poolDegraded', {
        reason,
        previousConfig: currentConfig,
        newConfig: this.currentConfig
      });

      console.log('Database pool degraded successfully', {
        previousConnectionLimit: currentConfig.connectionLimit,
        newConnectionLimit: this.currentConfig.connectionLimit,
        reason
      });

      return true;
    } catch (error) {
      console.error('Failed to degrade database pool', {
        error: error.message,
        reason
      });

      // 记录失败的优化结果
      const result: OptimizationResult = {
        timestamp: new Date(),
        strategy: 'pool_degradation',
        previousConfig: this.currentConfig,
        newConfig: {},
        reason,
        metrics: {} as DatabaseMetrics,
        success: false,
        error: error.message
      };

      this.optimizationHistory.push(result);

      return false;
    }
  }
}

// 创建默认优化器实例
const poolOptimizer = new DatabasePoolOptimizer();

// 导出实例
export { poolOptimizer };
export default poolOptimizer;
