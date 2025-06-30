/**
 * @file 依赖注入系统初始化
 * @description 负责在应用启动时初始化依赖注入容器
 * @author ZK-Agent Team
 * @date 2024-12-20
 */

import 'reflect-metadata';
import { EventEmitter } from 'events';
import { container } from './container';
import { configureServices } from './config';

/**
 * 依赖注入初始化状态
 */
export enum DIInitializationStatus {
  PENDING = 'pending',
  INITIALIZING = 'initializing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * 依赖注入初始化事件
 */
export interface DIInitializationEvents {
  'status-change': (status: DIInitializationStatus) => void;
  'progress': (step: string, progress: number) => void;
  'error': (error: Error) => void;
  'completed': () => void;
}

/**
 * 依赖注入初始化管理器
 * 
 * 该类负责管理依赖注入系统的初始化流程，包括：
 * - 注册基础服务
 * - 注册业务服务
 * - 验证容器状态
 */
class DIInitializationManager extends EventEmitter {
  private status: DIInitializationStatus = DIInitializationStatus.PENDING;
  private initializationPromise: Promise<void> | null = null;

  /**
   * 获取当前初始化状态
   * @returns {DIInitializationStatus} 当前状态
   */
  getStatus(): DIInitializationStatus {
    return this.status;
  }

  /**
   * 检查是否已完成初始化
   * @returns {boolean} 是否已完成
   */
  isInitialized(): boolean {
    return this.status === DIInitializationStatus.COMPLETED;
  }

  /**
   * 执行依赖注入系统初始化
   * @param {boolean} force - 是否强制重新初始化
   * @returns {Promise<void>}
   */
  async initialize(force: boolean = false): Promise<void> {
    // 如果已经在初始化中且不是强制初始化，返回现有的Promise
    if (this.initializationPromise && !force) {
      return this.initializationPromise;
    }

    // 如果已经完成且不是强制初始化，直接返回
    if (this.status === DIInitializationStatus.COMPLETED && !force) {
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
      this.updateStatus(DIInitializationStatus.INITIALIZING);
      this.emitProgress('开始依赖注入系统初始化', 0);

      // 步骤1: 配置服务
      this.configureServices();
      this.emitProgress('服务配置完成', 50);

      // 步骤2: 验证容器状态
      this.validateContainer();
      this.emitProgress('容器状态验证完成', 100);

      this.updateStatus(DIInitializationStatus.COMPLETED);
      this.emit('completed');

      console.log('依赖注入系统初始化完成');
    } catch (error) {
      console.error('依赖注入系统初始化失败:', error);
      this.emit('error', error as Error);
      this.updateStatus(DIInitializationStatus.FAILED);
      throw error;
    }
  }

  /**
   * 配置服务
   */
  private configureServices(): void {
    try {
      // 调用配置服务函数
      configureServices();
      console.log('依赖注入服务配置成功');
    } catch (error) {
      console.error('依赖注入服务配置失败:', error);
      throw error;
    }
  }

  /**
   * 验证容器状态
   */
  private validateContainer(): void {
    try {
      // 验证基础服务是否已注册
      const requiredServices = [
        'PrismaClient',
        'Logger',
        'Config'
      ];

      for (const service of requiredServices) {
        const serviceSymbol = Symbol.for(service);
        if (!container.isRegistered(serviceSymbol)) {
          throw new Error(`必需的服务 ${service} 未注册`); 
        }
      }

      console.log('依赖注入容器状态验证成功');
    } catch (error) {
      console.error('依赖注入容器状态验证失败:', error);
      throw error;
    }
  }

  /**
   * 更新初始化状态
   * @param {DIInitializationStatus} status - 新状态
   */
  private updateStatus(status: DIInitializationStatus): void {
    this.status = status;
    this.emit('status-change', status);
  }

  /**
   * 发送进度事件
   * @param {string} step - 当前步骤描述
   * @param {number} progress - 进度百分比 (0-100)
   */
  private emitProgress(step: string, progress: number): void {
    this.emit('progress', step, progress);
  }
}

// 创建全局初始化管理器实例
export const diInitializer = new DIInitializationManager();

/**
 * 初始化依赖注入系统的便捷函数
 * @param {boolean} force - 是否强制重新初始化
 * @returns {Promise<void>}
 */
export async function initializeDI(force: boolean = false): Promise<void> {
  return diInitializer.initialize(force);
}

/**
 * 检查依赖注入系统是否已初始化
 * @returns {boolean} 是否已初始化
 */
export function isDIInitialized(): boolean {
  return diInitializer.isInitialized();
}

/**
 * 获取依赖注入初始化状态
 * @returns {DIInitializationStatus} 当前状态
 */
export function getDIInitializationStatus(): DIInitializationStatus {
  return diInitializer.getStatus();
}
