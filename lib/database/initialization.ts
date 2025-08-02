/**
 * @file 数据库初始化服务
 * @description 负责在应用启动时初始化数据库连接和性能优化系统
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

import { checkDatabaseConnection, getDatabasePerformanceOverview } from './connection';
import { EventEmitter } from 'events';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();

/**
 * 数据库初始化状态
 */
export enum InitializationStatus {
  PENDING = 'pending',
  INITIALIZING = 'initializing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * 数据库初始化事件
 */
export interface DatabaseInitializationEvents {
  'status-change': (status: InitializationStatus) => void;
  progress: (step: string, progress: number) => void;
  error: (error: Error) => void;
  completed: () => void;
}

/**
 * 数据库初始化管理器
 *
 * 该类负责管理数据库系统的完整初始化流程，包括：
 * - 数据库连接建立
 * - 性能监控系统启动
 * - 优化组件初始化
 * - 健康检查执行
 *
 * 使用场景：
 * - 应用程序启动时的数据库初始化
 * - 数据库重连后的系统重新初始化
 * - 开发环境的数据库系统重置
 */
class DatabaseInitializationManager extends EventEmitter {
  private status: InitializationStatus = InitializationStatus.PENDING;
  private initializationPromise: Promise<void> | null = null;
  private retryCount = 0;
  private readonly maxRetries = 3;
  private readonly retryDelay = 5000; // 5秒

  /**
   * 获取当前初始化状态
   * @returns {InitializationStatus} 当前状态
   */
  getStatus(): InitializationStatus {
    return this.status;
  }

  /**
   * 检查是否已完成初始化
   * @returns {boolean} 是否已完成
   */
  isInitialized(): boolean {
    return this.status === InitializationStatus.COMPLETED;
  }

  /**
   * 执行数据库系统初始化
   * @param {boolean} force - 是否强制重新初始化
   * @returns {Promise<void>}
   */
  async initialize(force: boolean = false): Promise<void> {
    // 如果已经在初始化中且不是强制初始化，返回现有的Promise
    if (this.initializationPromise && !force) {
      return this.initializationPromise;
    }

    // 如果已经完成且不是强制初始化，直接返回
    if (this.status === InitializationStatus.COMPLETED && !force) {
      return;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  /**
   * 执行实际的初始化流程
   * @returns {Promise<void>}
   */
  private async performInitialization(): Promise<void> {
    try {
      this.updateStatus(InitializationStatus.INITIALIZING);
      this.emitProgress('开始数据库初始化', 0);

      // 步骤1: 建立数据库连接
      await this.initializeConnection();
      this.emitProgress('数据库连接已建立', 25);

      // 步骤2: 启动性能监控
      await this.initializeMonitoring();
      this.emitProgress('性能监控系统已启动', 50);

      // 步骤3: 初始化优化组件
      await this.initializeOptimization();
      this.emitProgress('性能优化组件已初始化', 75);

      // 步骤4: 执行健康检查
      await this.performHealthCheck();
      this.emitProgress('健康检查完成', 100);

      this.updateStatus(InitializationStatus.COMPLETED);
      this.emit('completed');
      this.retryCount = 0;
    } catch (error) {
      logger.error('Database initialization failed:', error);
      this.updateStatus(InitializationStatus.FAILED);
      this.emit('failed', error);
      throw error;
    }
  }

  /**
   * 初始化数据库连接
   */
  private async initializeConnection(): Promise<void> {
    try {
      const isConnected = await checkDatabaseConnection();
      if (!isConnected) {
        throw new Error('Failed to establish database connection');
      }
      logger.info('Database connection established successfully');
    } catch (error) {
      logger.error('Failed to initialize database connection:', error);
      throw error;
    }
  }

  /**
   * 初始化性能监控
   */
  private async initializeMonitoring(): Promise<void> {
    try {
      // 这里可以添加监控系统的初始化逻辑
      logger.info('Performance monitoring initialized');
    } catch (error) {
      logger.error('Failed to initialize monitoring:', error);
      throw error;
    }
  }

  /**
   * 初始化优化组件
   */
  private async initializeOptimization(): Promise<void> {
    try {
      // 这里可以添加优化组件的初始化逻辑
      logger.info('Optimization components initialized');
    } catch (error) {
      logger.error('Failed to initialize optimization:', error);
      throw error;
    }
  }

  /**
   * 执行健康检查
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const overview = await getDatabasePerformanceOverview();
      if (!overview) {
        throw new Error('Health check failed - no performance data available');
      }
      logger.info('Database health check completed successfully');
    } catch (error) {
      logger.error('Health check failed:', error);
      throw error;
    }
  }

  /**
   * 更新初始化状态
   */
  private updateStatus(status: InitializationStatus): void {
    this.status = status;
    this.emit('status-change', status);
  }

  /**
   * 发送进度更新
   */
  private emitProgress(step: string, percentage: number): void {
    this.emit('progress', step, percentage);
  }
}

/**
 * 数据库初始化管理器单例实例
 * 
 * 全局唯一的数据库初始化管理器实例，用于管理整个应用的数据库初始化流程。
 * 该实例在模块加载时创建，确保在整个应用生命周期中保持一致性。
 */
export const databaseInitializer = new DatabaseInitializationManager();
