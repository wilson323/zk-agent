/**
 * @file Environment Configuration Provider
 * @description 环境变量配置提供者实现
 */

import {
  ConfigProvider,
  AppConfig,
  ConfigUpdateEvent,
  ConfigValidationResult,
} from '../core/types';
import { validatePartialConfig } from '../core/validation';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();

export class EnvironmentConfigProvider implements ConfigProvider {
  private watchers: ((event: ConfigUpdateEvent) => void)[] = [];
  private logger: Logger;
  private envPrefix: string;
  private lastEnvSnapshot: Record<string, string> = {};
  private pollInterval: NodeJS.Timeout | null = null;

  constructor(envPrefix: string = 'ZK_AGENT_') {
    this.envPrefix = envPrefix;
    // Logger initialized as class property
    this.lastEnvSnapshot = this.getEnvSnapshot();
  }

  /**
   * 从环境变量加载配置
   */
  async load(): Promise<Partial<AppConfig>> {
    try {
      const config: any = {};

      // 遍历所有环境变量
      for (const [key, value] of Object.entries(process.env)) {
        if (key.startsWith(this.envPrefix)) {
          const configKey = this.transformEnvKey(key);
          const configValue = this.parseEnvValue(value);
          this.setNestedValue(config, configKey, configValue);
        }
      }

      // 添加特殊的环境配置
      this.addSpecialEnvConfigs(config);

      this.logger.debug('Loaded config from environment variables', {
        keysCount: Object.keys(config).length,
      });

      return config;
    } catch (error) {
      this.logger.error('Failed to load config from environment variables', { error });
      throw error;
    }
  }

  /**
   * 保存配置到环境变量（仅在当前进程中有效）
   */
  async save(config: Partial<AppConfig>): Promise<void> {
    try {
      const flatConfig = this.flattenConfig(config);

      for (const [key, value] of Object.entries(flatConfig)) {
        const envKey = this.transformConfigKey(key);
        const envValue = this.stringifyEnvValue(value);
        process.env[envKey] = envValue;
      }

      this.logger.debug('Saved config to environment variables', {
        keysCount: Object.keys(flatConfig).length,
      });

      // 触发更新事件
      const event: ConfigUpdateEvent = {
        key: 'root',
        oldValue: null,
        newValue: config,
        timestamp: new Date(),
        source: 'env',
      };

      this.notifyWatchers(event);
    } catch (error) {
      this.logger.error('Failed to save config to environment variables', { error });
      throw error;
    }
  }

  /**
   * 监听环境变量变化
   */
  watch(callback: (event: ConfigUpdateEvent) => void): void {
    this.watchers.push(callback);

    // 如果还没有轮询器，启动一个
    if (!this.pollInterval) {
      this.startPolling();
    }
  }

  /**
   * 验证配置
   */
  validate(config: Partial<AppConfig>): ConfigValidationResult {
    return validatePartialConfig(config);
  }

  /**
   * 停止监听
   */
  async dispose(): Promise<void> {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.watchers = [];
  }

  /**
   * 转换环境变量键名为配置键名
   * 例如: ZK_AGENT_DATABASE_CONNECTION_POOL_MAX -> database.connectionPool.max
   */
  private transformEnvKey(envKey: string): string {
    return envKey
      .replace(new RegExp(`^${this.envPrefix}`), '')
      .toLowerCase()
      .split('_')
      .map((part, index) => {
        if (index === 0) return part;
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join('.');
  }

  /**
   * 转换配置键名为环境变量键名
   * 例如: database.connectionPool.max -> ZK_AGENT_DATABASE_CONNECTION_POOL_MAX
   */
  private transformConfigKey(configKey: string): string {
    return (
      this.envPrefix +
      configKey
        .split('.')
        .map(part => part.replace(/([A-Z])/g, '_$1'))
        .join('_')
        .toUpperCase()
    );
  }

  /**
   * 解析环境变量值
   */
  private parseEnvValue(value: string | undefined): any {
    if (value === undefined || value === '') {
      return undefined;
    }

    // 布尔值
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // 数字
    if (/^-?\d+$/.test(value)) {
      return parseInt(value, 10);
    }
    if (/^-?\d*\.\d+$/.test(value)) {
      return parseFloat(value);
    }

    // JSON
    if (
      (value.startsWith('{') && value.endsWith('}')) ||
      (value.startsWith('[') && value.endsWith(']'))
    ) {
      try {
        return JSON.parse(value);
      } catch {
        // 如果解析失败，返回原字符串
      }
    }

    // 数组（逗号分隔）
    if (value.includes(',')) {
      return value.split(',').map(item => item.trim());
    }

    return value;
  }

  /**
   * 序列化环境变量值
   */
  private stringifyEnvValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'boolean' || typeof value === 'number') {
      return String(value);
    }

    if (Array.isArray(value)) {
      return value.join(',');
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  /**
   * 设置嵌套对象值
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * 扁平化配置对象
   */
  private flattenConfig(config: any, prefix: string = ''): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(config)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(result, this.flattenConfig(value, newKey));
      } else {
        result[newKey] = value;
      }
    }

    return result;
  }

  /**
   * 添加特殊的环境配置
   */
  private addSpecialEnvConfigs(config: any): void {
    // NODE_ENV
    if (process.env.NODE_ENV) {
      config.environment = process.env.NODE_ENV;
    }

    // PORT
    if (process.env.PORT) {
      if (!config.api) config.api = {};
      config.api.port = parseInt(process.env.PORT, 10);
    }

    // DATABASE_URL
    if (process.env.DATABASE_URL) {
      if (!config.database) config.database = {};
      config.database.url = process.env.DATABASE_URL;
    }

    // REDIS_URL
    if (process.env.REDIS_URL) {
      if (!config.cache) config.cache = {};
      config.cache.url = process.env.REDIS_URL;
    }

    // LOG_LEVEL
    if (process.env.LOG_LEVEL) {
      if (!config.logging) config.logging = {};
      config.logging.level = process.env.LOG_LEVEL;
    }
  }

  /**
   * 获取环境变量快照
   */
  private getEnvSnapshot(): Record<string, string> {
    const snapshot: Record<string, string> = {};

    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(this.envPrefix) && value !== undefined) {
        snapshot[key] = value;
      }
    }

    return snapshot;
  }

  /**
   * 启动轮询检查环境变量变化
   */
  private startPolling(): void {
    const pollIntervalMs = parseInt(process.env.ZK_AGENT_ENV_POLL_INTERVAL || '5000', 10);

    this.pollInterval = setInterval(async () => {
      try {
        const currentSnapshot = this.getEnvSnapshot();
        const changes = this.detectChanges(this.lastEnvSnapshot, currentSnapshot);

        if (changes.length > 0) {
          this.logger.debug(`Detected ${changes.length} environment variable changes`);

          const newConfig = await this.load();

          const event: ConfigUpdateEvent = {
            key: 'root',
            oldValue: null,
            newValue: newConfig,
            timestamp: new Date(),
            source: 'env',
          };

          this.notifyWatchers(event);
          this.lastEnvSnapshot = currentSnapshot;
        }
      } catch (error) {
        this.logger.error('Error during environment polling', { error });
      }
    }, pollIntervalMs);

    this.logger.debug(`Started polling environment variables every ${pollIntervalMs}ms`);
  }

  /**
   * 检测环境变量变化
   */
  private detectChanges(
    oldSnapshot: Record<string, string>,
    newSnapshot: Record<string, string>
  ): string[] {
    const changes: string[] = [];

    // 检查新增和修改的变量
    for (const [key, value] of Object.entries(newSnapshot)) {
      if (oldSnapshot[key] !== value) {
        changes.push(key);
      }
    }

    // 检查删除的变量
    for (const key of Object.keys(oldSnapshot)) {
      if (!(key in newSnapshot)) {
        changes.push(key);
      }
    }

    return changes;
  }

  /**
   * 通知所有监听器
   */
  private notifyWatchers(event: ConfigUpdateEvent): void {
    this.watchers.forEach(watcher => {
      try {
        watcher(event);
      } catch (error) {
        this.logger.error('Error in config watcher callback', { error });
      }
    });
  }
}
