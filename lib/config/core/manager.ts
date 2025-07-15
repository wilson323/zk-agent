/**
 * @file Unified Configuration Manager
 * @description 统一配置管理器实现
 */

import { EventEmitter } from 'events';
import { z } from 'zod';
import {
  AppConfig,
  ConfigManager,
  ConfigProvider,
  ConfigUpdateEvent,
  ConfigValidationResult,
  EnvironmentConfig,
} from './types';
import { defaultConfig } from './defaults';
import { configSchema } from './validation';
import { Logger } from '../../utils/logger';

export class UnifiedConfigManager extends EventEmitter implements ConfigManager {
  private config: AppConfig;
  private providers: ConfigProvider[] = [];
  private watchers: Map<string, () => void> = new Map();
  private logger: Logger;

  constructor(initialConfig?: Partial<AppConfig>) {
    super();
    this.logger = new Logger('ConfigManager');
    this.config = this.mergeConfigs(defaultConfig, initialConfig || {});
    this.validateConfig();
  }

  /**
   * 添加配置提供者
   */
  addProvider(provider: ConfigProvider): void {
    this.providers.push(provider);
    provider.watch((event) => this.handleConfigUpdate(event));
  }

  /**
   * 获取配置值
   */
  get<T = any>(key: string): T {
    const keys = key.split('.');
    let value: any = this.config;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return undefined as T;
      }
    }
    
    return value as T;
  }

  /**
   * 设置配置值
   */
  set<T = any>(key: string, value: T): void {
    const keys = key.split('.');
    let target: any = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in target) || typeof target[k] !== 'object') {
        target[k] = {};
      }
      target = target[k];
    }
    
    const lastKey = keys[keys.length - 1];
    const oldValue = target[lastKey];
    target[lastKey] = value;
    
    const event: ConfigUpdateEvent = {
      key,
      oldValue,
      newValue: value,
      timestamp: new Date(),
      source: 'runtime',
    };
    
    this.handleConfigUpdate(event);
  }

  /**
   * 检查配置键是否存在
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * 删除配置键
   */
  delete(key: string): void {
    const keys = key.split('.');
    let target: any = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in target) || typeof target[k] !== 'object') {
        return; // 键不存在
      }
      target = target[k];
    }
    
    const lastKey = keys[keys.length - 1];
    if (lastKey in target) {
      const oldValue = target[lastKey];
      delete target[lastKey];
      
      const event: ConfigUpdateEvent = {
        key,
        oldValue,
        newValue: undefined,
        timestamp: new Date(),
        source: 'runtime',
      };
      
      this.handleConfigUpdate(event);
    }
  }

  /**
   * 获取所有配置
   */
  getAll(): AppConfig {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * 合并配置
   */
  merge(config: Partial<AppConfig>): void {
    const oldConfig = this.getAll();
    this.config = this.mergeConfigs(this.config, config);
    
    const event: ConfigUpdateEvent = {
      key: 'root',
      oldValue: oldConfig,
      newValue: this.config,
      timestamp: new Date(),
      source: 'runtime',
    };
    
    this.handleConfigUpdate(event);
  }

  /**
   * 验证配置
   */
  validate(): ConfigValidationResult {
    try {
      configSchema.parse(this.config);
      return {
        isValid: true,
        errors: [],
        warnings: [],
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          isValid: false,
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
          warnings: [],
        };
      }
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown validation error'],
        warnings: [],
      };
    }
  }

  /**
   * 重新加载配置
   */
  async reload(): Promise<void> {
    try {
      let mergedConfig = { ...defaultConfig };
      
      // 从所有提供者加载配置
      for (const provider of this.providers) {
        const providerConfig = await provider.load();
        mergedConfig = this.mergeConfigs(mergedConfig, providerConfig);
      }
      
      // 应用环境特定配置
      const envConfig = this.getEnvironmentConfig(mergedConfig);
      mergedConfig = this.mergeConfigs(mergedConfig, envConfig);
      
      const oldConfig = this.config;
      this.config = mergedConfig;
      
      const validationResult = this.validate();
      if (!validationResult.isValid) {
        this.logger.error('Configuration validation failed after reload', {
          errors: validationResult.errors,
        });
        // 回滚到旧配置
        this.config = oldConfig;
        throw new Error('Configuration validation failed');
      }
      
      const event: ConfigUpdateEvent = {
        key: 'root',
        oldValue: oldConfig,
        newValue: this.config,
        timestamp: new Date(),
        source: 'file',
      };
      
      this.handleConfigUpdate(event);
      this.logger.info('Configuration reloaded successfully');
    } catch (error) {
      this.logger.error('Failed to reload configuration', { error });
      throw error;
    }
  }

  /**
   * 订阅配置更新事件
   */
  subscribe(callback: (event: ConfigUpdateEvent) => void): () => void {
    const id = Math.random().toString(36).substr(2, 9);
    this.watchers.set(id, () => callback);
    this.on('configUpdate', callback);
    
    return () => {
      this.watchers.delete(id);
      this.off('configUpdate', callback);
    };
  }

  /**
   * 处理配置更新事件
   */
  private handleConfigUpdate(event: ConfigUpdateEvent): void {
    this.validateConfig();
    this.emit('configUpdate', event);
    this.logger.debug('Configuration updated', {
      key: event.key,
      source: event.source,
      timestamp: event.timestamp,
    });
  }

  /**
   * 验证当前配置
   */
  private validateConfig(): void {
    const result = this.validate();
    if (!result.isValid) {
      this.logger.warn('Configuration validation warnings', {
        errors: result.errors,
        warnings: result.warnings,
      });
    }
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

  /**
   * 获取环境特定配置
   */
  private getEnvironmentConfig(config: AppConfig): Partial<AppConfig> {
    const env = config.environment || process.env.NODE_ENV || 'development';
    const envConfigs: EnvironmentConfig = {
      development: {
        logging: { level: 'debug', enableFileLogging: false },
        cache: { persistToDisk: false },
        security: { enableEncryption: false },
        performance: { enableProfiling: true },
      },
      production: {
        logging: { level: 'warn', enableFileLogging: true },
        cache: { persistToDisk: true },
        security: { enableEncryption: true },
        performance: { enableProfiling: false },
      },
      test: {
        logging: { level: 'error', enableFileLogging: false },
        cache: { enabled: false },
        database: { connectionPool: { max: 5 } },
      },
    };
    
    return envConfigs[env] || {};
  }
}

// 单例配置管理器
export const configManager = new UnifiedConfigManager();