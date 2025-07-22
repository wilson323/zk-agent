/**
 * @file Configuration Providers
 * @description 配置提供者实现
 */

import { ConfigProvider, AppConfig, ConfigUpdateEvent } from '../core/types';
import { FileConfigProvider } from './file-provider';
import { EnvironmentConfigProvider } from './env-provider';
import { DatabaseConfigProvider } from './database-provider';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();

const logger = getLogger();

export { FileConfigProvider } from './file-provider';
export { EnvironmentConfigProvider } from './env-provider';
export { DatabaseConfigProvider } from './database-provider';

/**
 * 复合配置提供者
 * 支持从多个来源加载配置并合并
 */
export class CompositeConfigProvider implements ConfigProvider {
  private providers: ConfigProvider[] = [];
  private watchers: ((event: ConfigUpdateEvent) => void)[] = [];

  constructor(providers: ConfigProvider[] = []) {
    this.providers = providers;
    this.setupWatchers();
  }

  /**
   * 添加配置提供者
   */
  addProvider(provider: ConfigProvider): void {
    this.providers.push(provider);
    provider.watch(event => {
      this.watchers.forEach(watcher => watcher(event));
    });
  }

  /**
   * 移除配置提供者
   */
  removeProvider(provider: ConfigProvider): void {
    const index = this.providers.indexOf(provider);
    if (index > -1) {
      this.providers.splice(index, 1);
    }
  }

  /**
   * 从所有提供者加载配置并合并
   */
  async load(): Promise<Partial<AppConfig>> {
    let mergedConfig: Partial<AppConfig> = {};

    for (const provider of this.providers) {
      try {
        const config = await provider.load();
        mergedConfig = this.mergeConfigs(mergedConfig, config);
      } catch (error) {
        logger.warn(`Failed to load config from provider:`, error);
      }
    }

    return mergedConfig;
  }

  /**
   * 保存配置到所有支持保存的提供者
   */
  async save(config: Partial<AppConfig>): Promise<void> {
    const savePromises = this.providers.map(async provider => {
      try {
        await provider.save(config);
      } catch (error) {
        logger.warn(`Failed to save config to provider:`, error);
      }
    });

    await Promise.allSettled(savePromises);
  }

  /**
   * 监听配置变化
   */
  watch(callback: (event: ConfigUpdateEvent) => void): void {
    this.watchers.push(callback);
  }

  /**
   * 验证配置
   */
  validate(config: Partial<AppConfig>) {
    // 使用第一个提供者的验证逻辑
    if (this.providers.length > 0) {
      return this.providers[0].validate(config);
    }
    return {
      isValid: true,
      errors: [],
      warnings: [],
    };
  }

  /**
   * 设置监听器
   */
  private setupWatchers(): void {
    this.providers.forEach(provider => {
      provider.watch(event => {
        this.watchers.forEach(watcher => watcher(event));
      });
    });
  }

  /**
   * 深度合并配置对象
   */
  private mergeConfigs(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.mergeConfigs(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }
}

/**
 * 创建默认配置提供者组合
 */
export function createDefaultProviders(): CompositeConfigProvider {
  const providers = [new FileConfigProvider(), new EnvironmentConfigProvider()];

  // 如果在生产环境，添加数据库配置提供者
  if (process.env.NODE_ENV === 'production') {
    providers.push(new DatabaseConfigProvider());
  }

  return new CompositeConfigProvider(providers);
}

/**
 * 配置提供者工厂
 */
export class ConfigProviderFactory {
  private static providers: Map<string, () => ConfigProvider> = new Map();

  /**
   * 注册配置提供者
   */
  static register(name: string, factory: () => ConfigProvider): void {
    this.providers.set(name, factory);
  }

  /**
   * 创建配置提供者
   */
  static create(name: string): ConfigProvider | null {
    const factory = this.providers.get(name);
    return factory ? factory() : null;
  }

  /**
   * 获取所有注册的提供者名称
   */
  static getRegisteredProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}

// 注册默认提供者
ConfigProviderFactory.register('file', () => new FileConfigProvider());
ConfigProviderFactory.register('env', () => new EnvironmentConfigProvider());
ConfigProviderFactory.register('database', () => new DatabaseConfigProvider());
