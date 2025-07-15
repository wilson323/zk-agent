/**
 * @file Unified Configuration System
 * @description 统一配置系统入口
 */

// 核心类型和接口
export * from './core/types';
export * from './core/validation';
export { defaultConfig, cadConfig, redisCacheConfig, dashboardConfig } from './core/defaults';

// 配置管理器
export { UnifiedConfigManager, configManager } from './core/manager';

// 配置提供者
export {
  CompositeConfigProvider,
  ConfigProviderFactory,
  createDefaultProviders,
  FileConfigProvider,
  EnvironmentConfigProvider,
  DatabaseConfigProvider,
} from './providers';

// 便利函数和工具
import { configManager } from './core/manager';
import { createDefaultProviders } from './providers';
import { Logger } from '../utils/logger';

const logger = new Logger('ConfigSystem');

/**
 * 初始化配置系统
 */
export async function initializeConfigSystem(options: {
  configFile?: string;
  enableFileProvider?: boolean;
  enableEnvProvider?: boolean;
  enableDatabaseProvider?: boolean;
  database?: any;
} = {}): Promise<void> {
  try {
    const {
      configFile,
      enableFileProvider = true,
      enableEnvProvider = true,
      enableDatabaseProvider = false,
      database,
    } = options;

    // 创建配置提供者
    const providers = createDefaultProviders();
    
    // 如果指定了配置文件，使用自定义文件提供者
    if (configFile && enableFileProvider) {
      const { FileConfigProvider } = await import('./providers/file-provider');
      providers.addProvider(new FileConfigProvider(configFile));
    }
    
    // 如果启用数据库提供者
    if (enableDatabaseProvider && database) {
      const { DatabaseConfigProvider } = await import('./providers/database-provider');
      const dbProvider = new DatabaseConfigProvider({ db: database });
      providers.addProvider(dbProvider);
    }

    // 将提供者添加到配置管理器
    configManager.addProvider(providers);
    
    // 加载初始配置
    await configManager.reload();
    
    logger.info('Configuration system initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize configuration system', { error });
    throw error;
  }
}

/**
 * 获取配置值的便利函数
 */
export function getConfig<T = any>(key: string, defaultValue?: T): T {
  const value = configManager.get<T>(key);
  return value !== undefined ? value : defaultValue as T;
}

/**
 * 设置配置值的便利函数
 */
export function setConfig<T = any>(key: string, value: T): void {
  configManager.set(key, value);
}

/**
 * 检查配置键是否存在的便利函数
 */
export function hasConfig(key: string): boolean {
  return configManager.has(key);
}

/**
 * 获取所有配置的便利函数
 */
export function getAllConfig() {
  return configManager.getAll();
}

/**
 * 订阅配置变化的便利函数
 */
export function onConfigChange(callback: (event: any) => void): () => void {
  return configManager.subscribe(callback);
}

/**
 * 验证当前配置的便利函数
 */
export function validateCurrentConfig() {
  return configManager.validate();
}

/**
 * 重新加载配置的便利函数
 */
export async function reloadConfig(): Promise<void> {
  await configManager.reload();
}

/**
 * 配置预设
 */
export const ConfigPresets = {
  /**
   * 开发环境预设
   */
  development: {
    environment: 'development',
    logging: {
      level: 'debug',
      enableFileLogging: false,
      enableConsoleLogging: true,
    },
    cache: {
      persistToDisk: false,
    },
    security: {
      enableEncryption: false,
    },
    performance: {
      enableProfiling: true,
      enableMetrics: true,
    },
  },

  /**
   * 生产环境预设
   */
  production: {
    environment: 'production',
    logging: {
      level: 'warn',
      enableFileLogging: true,
      enableConsoleLogging: false,
    },
    cache: {
      persistToDisk: true,
    },
    security: {
      enableEncryption: true,
      enableAuditLog: true,
    },
    performance: {
      enableProfiling: false,
      enableMetrics: true,
    },
  },

  /**
   * 测试环境预设
   */
  test: {
    environment: 'test',
    logging: {
      level: 'error',
      enableFileLogging: false,
      enableConsoleLogging: false,
    },
    cache: {
      enabled: false,
    },
    database: {
      connectionPool: {
        max: 5,
      },
    },
  },

  /**
   * 高性能预设
   */
  highPerformance: {
    cache: {
      enabled: true,
      maxSize: 500 * 1024 * 1024, // 500MB
      compression: true,
    },
    performance: {
      enableMetrics: true,
      enableGarbageCollection: true,
      maxMemoryUsage: 4 * 1024 * 1024 * 1024, // 4GB
    },
    database: {
      connectionPool: {
        max: 50,
      },
    },
  },

  /**
   * 高安全性预设
   */
  highSecurity: {
    security: {
      enableEncryption: true,
      enableAuditLog: true,
      enableCSRF: true,
      enableRateLimit: true,
      maxLoginAttempts: 3,
      sessionTimeout: 2 * 60 * 60 * 1000, // 2小时
    },
    logging: {
      enableErrorTracking: true,
      enableStructuredLogging: true,
    },
  },
};

/**
 * 应用配置预设
 */
export function applyConfigPreset(presetName: keyof typeof ConfigPresets): void {
  const preset = ConfigPresets[presetName];
  if (preset) {
    configManager.merge(preset);
    logger.info(`Applied config preset: ${presetName}`);
  } else {
    logger.warn(`Unknown config preset: ${presetName}`);
  }
}

/**
 * 配置迁移工具
 */
export class ConfigMigrator {
  private migrations: Map<string, (config: any) => any> = new Map();

  /**
   * 注册迁移函数
   */
  register(version: string, migration: (config: any) => any): void {
    this.migrations.set(version, migration);
  }

  /**
   * 执行迁移
   */
  migrate(config: any, fromVersion: string, toVersion: string): any {
    const versions = Array.from(this.migrations.keys()).sort();
    const startIndex = versions.indexOf(fromVersion);
    const endIndex = versions.indexOf(toVersion);

    if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
      throw new Error(`Invalid migration path: ${fromVersion} -> ${toVersion}`);
    }

    let migratedConfig = { ...config };
    
    for (let i = startIndex + 1; i <= endIndex; i++) {
      const version = versions[i];
      const migration = this.migrations.get(version);
      if (migration) {
        migratedConfig = migration(migratedConfig);
        logger.info(`Migrated config to version: ${version}`);
      }
    }

    return migratedConfig;
  }
}

/**
 * 默认配置迁移器
 */
export const configMigrator = new ConfigMigrator();

// 注册一些示例迁移
configMigrator.register('1.1.0', (config) => {
  // 示例：重命名配置键
  if (config.oldKey) {
    config.newKey = config.oldKey;
    delete config.oldKey;
  }
  return config;
});

configMigrator.register('1.2.0', (config) => {
  // 示例：添加新的默认值
  if (!config.features) {
    config.features = {};
  }
  if (config.features.newFeature === undefined) {
    config.features.newFeature = true;
  }
  return config;
});

/**
 * 配置健康检查
 */
export async function healthCheck(): Promise<{
  status: 'healthy' | 'warning' | 'error';
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message?: string;
  }>;
}> {
  const checks = [];
  let overallStatus: 'healthy' | 'warning' | 'error' = 'healthy';

  // 检查配置验证
  const validation = validateCurrentConfig();
  checks.push({
    name: 'Configuration Validation',
    status: validation.isValid ? 'pass' : 'fail',
    message: validation.isValid ? undefined : validation.errors.join(', '),
  });
  
  if (!validation.isValid) {
    overallStatus = 'error';
  }

  // 检查必要的配置项
  const requiredConfigs = [
    'environment',
    'logging.level',
    'database.connectionPool.max',
  ];
  
  for (const key of requiredConfigs) {
    const hasValue = hasConfig(key);
    checks.push({
      name: `Required Config: ${key}`,
      status: hasValue ? 'pass' : 'fail',
      message: hasValue ? undefined : `Missing required configuration: ${key}`,
    });
    
    if (!hasValue && overallStatus === 'healthy') {
      overallStatus = 'error';
    }
  }

  // 检查配置值的合理性
  const dbMaxConnections = getConfig('database.connectionPool.max', 0);
  if (dbMaxConnections > 100) {
    checks.push({
      name: 'Database Connection Pool Size',
      status: 'warn',
      message: `High connection pool size: ${dbMaxConnections}`,
    });
    
    if (overallStatus === 'healthy') {
      overallStatus = 'warning';
    }
  }

  return {
    status: overallStatus,
    checks,
  };
}

// 导出单例配置管理器实例
export { configManager as config };