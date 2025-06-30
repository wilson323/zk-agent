/**
 * 监控服务注册表
 * 用于管理监控服务实例，解决循环依赖问题
 */

import { IMonitoringService } from './unified-interfaces';
import { IMonitoringServiceFactory } from './monitoring-interfaces';

/**
 * 监控服务注册表
 * 使用单例模式管理监控服务实例
 */
class MonitoringRegistry {
  private static instance: MonitoringRegistry;
  private monitoringService: IMonitoringService | null = null;
  private factory: IMonitoringServiceFactory | null = null;
  private isInitializing = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {}

  /**
   * 获取注册表单例实例
   */
  static getInstance(): MonitoringRegistry {
    if (!MonitoringRegistry.instance) {
      MonitoringRegistry.instance = new MonitoringRegistry();
    }
    return MonitoringRegistry.instance;
  }

  /**
   * 注册监控服务工厂
   */
  registerFactory(factory: IMonitoringServiceFactory): void {
    if (this.factory) {
      console.warn('监控服务工厂已存在，将被替换');
    }
    this.factory = factory;
  }

  /**
   * 获取监控服务实例
   * 如果实例不存在，则创建新实例
   */
  async getMonitoringService(): Promise<IMonitoringService> {
    if (this.monitoringService) {
      return this.monitoringService;
    }

    // 如果正在初始化，等待初始化完成
    if (this.isInitializing && this.initializationPromise) {
      await this.initializationPromise;
      if (this.monitoringService) {
        return this.monitoringService;
      }
    }

    // 开始初始化
    this.isInitializing = true;
    this.initializationPromise = this.initializeService();
    
    try {
      await this.initializationPromise;
      if (!this.monitoringService) {
        throw new Error('监控服务初始化失败');
      }
      return this.monitoringService;
    } finally {
      this.isInitializing = false;
      this.initializationPromise = null;
    }
  }

  /**
   * 同步获取监控服务实例（如果已存在）
   */
  getMonitoringServiceSync(): IMonitoringService | null {
    return this.monitoringService;
  }

  /**
   * 检查监控服务是否已初始化
   */
  isInitialized(): boolean {
    return this.monitoringService !== null;
  }

  /**
   * 设置监控服务实例
   */
  setMonitoringService(service: IMonitoringService): void {
    if (this.monitoringService && this.monitoringService !== service) {
      console.warn('替换现有的监控服务实例');
    }
    this.monitoringService = service;
  }

  /**
   * 重置注册表
   */
  reset(): void {
    this.monitoringService = null;
    this.factory = null;
    this.isInitializing = false;
    this.initializationPromise = null;
  }

  /**
   * 初始化监控服务
   */
  private async initializeService(): Promise<void> {
    if (!this.factory) {
      throw new Error('监控服务工厂未注册');
    }

    try {
      this.monitoringService = this.factory.createMonitoringService();
      console.log('监控服务初始化成功');
    } catch (error) {
      console.error('监控服务初始化失败:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const monitoringRegistry = MonitoringRegistry.getInstance();

/**
 * 获取监控服务实例的便捷函数
 */
export async function getMonitoringService(): Promise<IMonitoringService> {
  return await monitoringRegistry.getMonitoringService();
}

/**
 * 同步获取监控服务实例的便捷函数
 */
export function getMonitoringServiceSync(): IMonitoringService | null {
  return monitoringRegistry.getMonitoringServiceSync();
}

/**
 * 注册监控服务工厂的便捷函数
 */
export function registerMonitoringFactory(factory: IMonitoringServiceFactory): void {
  monitoringRegistry.registerFactory(factory);
}

/**
 * 检查监控服务是否已初始化的便捷函数
 */
export function isMonitoringInitialized(): boolean {
  return monitoringRegistry.isInitialized();
}
