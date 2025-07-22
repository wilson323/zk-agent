/**
 * @file File Configuration Provider
 * @description 文件配置提供者实现
 */

import { promises as fs } from 'fs';
import { join, extname } from 'path';
import { watch } from 'chokidar';
import {
  ConfigProvider,
  AppConfig,
  ConfigUpdateEvent,
  ConfigValidationResult,
} from '../core/types';
import { validatePartialConfig } from '../core/validation';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();

export class FileConfigProvider implements ConfigProvider {
  private configPath: string;
  private watchers: ((event: ConfigUpdateEvent) => void)[] = [];
  private fileWatcher: any;
  private logger: Logger;
  private lastModified: Date | null = null;

  constructor(configPath?: string) {
    this.configPath = configPath || this.getDefaultConfigPath();
    this.logger = new Logger('FileConfigProvider');
  }

  /**
   * 加载配置文件
   */
  async load(): Promise<Partial<AppConfig>> {
    try {
      const exists = await this.fileExists(this.configPath);
      if (!exists) {
        this.logger.warn(`Config file not found: ${this.configPath}`);
        return {};
      }

      const content = await fs.readFile(this.configPath, 'utf-8');
      const config = this.parseConfigContent(content);

      // 更新最后修改时间
      const stats = await fs.stat(this.configPath);
      this.lastModified = stats.mtime;

      this.logger.debug(`Loaded config from file: ${this.configPath}`);
      return config;
    } catch (error) {
      this.logger.error(`Failed to load config from file: ${this.configPath}`, { error });
      throw error;
    }
  }

  /**
   * 保存配置到文件
   */
  async save(config: Partial<AppConfig>): Promise<void> {
    try {
      // 确保目录存在
      await this.ensureDirectoryExists();

      const content = this.stringifyConfig(config);
      await fs.writeFile(this.configPath, content, 'utf-8');

      // 更新最后修改时间
      const stats = await fs.stat(this.configPath);
      this.lastModified = stats.mtime;

      this.logger.debug(`Saved config to file: ${this.configPath}`);

      // 触发更新事件
      const event: ConfigUpdateEvent = {
        key: 'root',
        oldValue: null,
        newValue: config,
        timestamp: new Date(),
        source: 'file',
      };

      this.notifyWatchers(event);
    } catch (error) {
      this.logger.error(`Failed to save config to file: ${this.configPath}`, { error });
      throw error;
    }
  }

  /**
   * 监听配置文件变化
   */
  watch(callback: (event: ConfigUpdateEvent) => void): void {
    this.watchers.push(callback);

    // 如果还没有文件监听器，创建一个
    if (!this.fileWatcher) {
      this.setupFileWatcher();
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
    if (this.fileWatcher) {
      await this.fileWatcher.close();
      this.fileWatcher = null;
    }
    this.watchers = [];
  }

  /**
   * 获取默认配置文件路径
   */
  private getDefaultConfigPath(): string {
    const configDir = process.env.CONFIG_DIR || join(process.cwd(), 'config');
    const configFile = process.env.CONFIG_FILE || 'app.json';
    return join(configDir, configFile);
  }

  /**
   * 检查文件是否存在
   */
  private async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 确保目录存在
   */
  private async ensureDirectoryExists(): Promise<void> {
    const dir = this.configPath.substring(
      0,
      this.configPath.lastIndexOf('/') || this.configPath.lastIndexOf('\\')
    );
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // 目录可能已存在，忽略错误
    }
  }

  /**
   * 解析配置文件内容
   */
  private parseConfigContent(content: string): Partial<AppConfig> {
    const ext = extname(this.configPath).toLowerCase();

    switch (ext) {
      case '.json':
        return JSON.parse(content);
      case '.yaml':
      case '.yml':
        return this.parseYaml(content);
      case '.js':
      case '.ts':
        return this.parseJavaScript(content);
      default:
        // 默认尝试JSON解析
        return JSON.parse(content);
    }
  }

  /**
   * 序列化配置对象
   */
  private stringifyConfig(config: Partial<AppConfig>): string {
    const ext = extname(this.configPath).toLowerCase();

    switch (ext) {
      case '.json':
        return JSON.stringify(config, null, 2);
      case '.yaml':
      case '.yml':
        return this.stringifyYaml(config);
      default:
        return JSON.stringify(config, null, 2);
    }
  }

  /**
   * 解析YAML内容
   */
  private parseYaml(content: string): Partial<AppConfig> {
    try {
      // 动态导入yaml库
      const yaml = require('yaml');
      return yaml.parse(content);
    } catch (error) {
      this.logger.warn('YAML parser not available, falling back to JSON');
      return JSON.parse(content);
    }
  }

  /**
   * 序列化为YAML
   */
  private stringifyYaml(config: Partial<AppConfig>): string {
    try {
      const yaml = require('yaml');
      return yaml.stringify(config);
    } catch (error) {
      this.logger.warn('YAML parser not available, falling back to JSON');
      return JSON.stringify(config, null, 2);
    }
  }

  /**
   * 解析JavaScript/TypeScript配置文件
   */
  private parseJavaScript(content: string): Partial<AppConfig> {
    // 注意：这是一个简化的实现，生产环境中应该使用更安全的方法
    try {
      // 移除export语句并执行
      const cleanContent = content
        .replace(/export\s+default\s+/, 'return ')
        .replace(/export\s+\{[^}]*\}\s*;?/, '')
        .replace(/module\.exports\s*=\s*/, 'return ');

      const func = new Function(cleanContent);
      return func();
    } catch (error) {
      this.logger.error('Failed to parse JavaScript config file', { error });
      throw new Error(`Invalid JavaScript config file: ${error}`);
    }
  }

  /**
   * 设置文件监听器
   */
  private setupFileWatcher(): void {
    try {
      this.fileWatcher = watch(this.configPath, {
        persistent: true,
        ignoreInitial: true,
      });

      this.fileWatcher.on('change', async () => {
        try {
          // 检查文件是否真的被修改了
          const stats = await fs.stat(this.configPath);
          if (this.lastModified && stats.mtime <= this.lastModified) {
            return; // 文件没有实际修改
          }

          const newConfig = await this.load();

          const event: ConfigUpdateEvent = {
            key: 'root',
            oldValue: null,
            newValue: newConfig,
            timestamp: new Date(),
            source: 'file',
          };

          this.notifyWatchers(event);
          this.logger.info(`Config file changed: ${this.configPath}`);
        } catch (error) {
          this.logger.error('Failed to reload config after file change', { error });
        }
      });

      this.fileWatcher.on('error', (error: Error) => {
        this.logger.error('File watcher error', { error });
      });

      this.logger.debug(`Started watching config file: ${this.configPath}`);
    } catch (error) {
      this.logger.error('Failed to setup file watcher', { error });
    }
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
