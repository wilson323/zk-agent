/**
 * @file 环境管理器
 * @description 统一的多环境配置管理系统
 * @author ZK-Agent Team
 * @date 2024-12-27
 */

import { z } from 'zod';

import { Logger } from '../lib/utils/logger';

const logger = new Logger('EnvironmentManager');

// 环境类型枚举
export enum Environment {
  DEVELOPMENT = 'development',
  TESTING = 'testing',
  STAGING = 'staging',
  PRODUCTION = 'production'
}

// 数据库配置模式
const DatabaseConfigSchema = z.object({
  url: z.string().url(),
  poolMin: z.number().min(1).default(2),
  poolMax: z.number().min(5).default(20),
  ssl: z.boolean().default(false),
  timeout: z.number().default(30000),
  retryAttempts: z.number().default(3),
  retryDelay: z.number().default(5000),
});

// Redis配置模式
const RedisConfigSchema = z.object({
  url: z.string(),
  password: z.string().optional(),
  db: z.number().default(0),
  keyPrefix: z.string().default('zkagent:'),
  retryDelayOnFailover: z.number().default(100),
  maxRetriesPerRequest: z.number().default(3),
});

// AI服务配置模式
const AIServiceConfigSchema = z.object({
  fastgpt: z.object({
    baseUrl: z.string().url().optional(),
    apiKey: z.string().optional(),
    appId: z.string().optional(),
    timeout: z.number().default(30000),
  }).optional(),
  qwen: z.object({
    baseUrl: z.string().url().optional(),
    apiKey: z.string().optional(),
    model: z.string().default('qwen-turbo'),
  }).optional(),
  siliconflow: z.object({
    baseUrl: z.string().url().optional(),
    apiKey: z.string().optional(),
  }).optional(),
  openai: z.object({
    apiKey: z.string().optional(),
    baseUrl: z.string().url().optional(),
    model: z.string().default('gpt-3.5-turbo'),
  }).optional(),
});

// 安全配置模式
const SecurityConfigSchema = z.object({
  jwtSecret: z.string().min(32),
  jwtExpiresIn: z.string().default('7d'),
  bcryptRounds: z.number().min(10).max(15).default(12),
  corsOrigin: z.union([z.string(), z.array(z.string())]).default('*'),
  corsCredentials: z.boolean().default(true),
  rateLimitEnabled: z.boolean().default(true),
  rateLimitWindowMs: z.number().default(900000), // 15分钟
  rateLimitMaxRequests: z.number().default(100),
  httpsEnabled: z.boolean().default(false),
  sslCertPath: z.string().optional(),
  sslKeyPath: z.string().optional(),
});

// 监控配置模式
const MonitoringConfigSchema = z.object({
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  logFilePath: z.string().default('./logs'),
  sentryDsn: z.string().optional(),
  sentryEnvironment: z.string().optional(),
  prometheusEnabled: z.boolean().default(false),
  prometheusPort: z.number().default(9090),
  healthCheckEnabled: z.boolean().default(true),
  healthCheckInterval: z.number().default(30000),
});

// 文件存储配置模式
const StorageConfigSchema = z.object({
  uploadDir: z.string().default('./uploads'),
  tempDir: z.string().default('./temp'),
  maxFileSize: z.number().default(100 * 1024 * 1024), // 100MB
  aws: z.object({
    accessKeyId: z.string().optional(),
    secretAccessKey: z.string().optional(),
    region: z.string().optional(),
    s3Bucket: z.string().optional(),
  }).optional(),
  aliyun: z.object({
    accessKeyId: z.string().optional(),
    accessKeySecret: z.string().optional(),
    ossRegion: z.string().optional(),
    ossBucket: z.string().optional(),
  }).optional(),
});

// 应用配置模式
const AppConfigSchema = z.object({
  name: z.string().default('ZK-Agent'),
  version: z.string().default('1.0.0'),
  url: z.string().url(),
  port: z.number().default(3000),
  nodeEnv: z.nativeEnum(Environment),
  debug: z.boolean().default(false),
  verboseLogging: z.boolean().default(false),
});

// 性能配置模式
const PerformanceConfigSchema = z.object({
  cacheEnabled: z.boolean().default(true),
  cacheTtl: z.number().default(3600), // 1小时
  compressionEnabled: z.boolean().default(true),
  compressionLevel: z.number().min(1).max(9).default(6),
  requestTimeout: z.number().default(30000),
  keepAliveTimeout: z.number().default(5000),
});

// 完整环境配置模式
const EnvironmentConfigSchema = z.object({
  app: AppConfigSchema,
  database: DatabaseConfigSchema,
  redis: RedisConfigSchema,
  aiServices: AIServiceConfigSchema,
  security: SecurityConfigSchema,
  monitoring: MonitoringConfigSchema,
  storage: StorageConfigSchema,
  performance: PerformanceConfigSchema,
});

type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;

// 使用Zod的deepPartial来创建所有层级都为可选的类型
const DeepPartialEnvironmentConfigSchema = EnvironmentConfigSchema.deepPartial();
type DeepPartialEnvironmentConfig = z.infer<typeof DeepPartialEnvironmentConfigSchema>;

// 环境特定的默认配置
const ENVIRONMENT_DEFAULTS: Record<Environment, DeepPartialEnvironmentConfig> = {
  [Environment.DEVELOPMENT]: {
    app: {
      debug: true,
      verboseLogging: true,
    },
    database: {
      ssl: false,
      poolMin: 1,
      poolMax: 5,
    },
    security: {
      corsOrigin: ['http://localhost:3000', 'http://localhost:3001'],
      rateLimitEnabled: false,
      httpsEnabled: false,
    },
    monitoring: {
      logLevel: 'debug',
      prometheusEnabled: false,
    },
    performance: {
      compressionEnabled: false,
    },
  },

  [Environment.TESTING]: {
    app: {
      debug: true,
    },
    database: {
      ssl: false,
      poolMin: 1,
      poolMax: 3,
    },
    security: {
      corsOrigin: '*',
      rateLimitEnabled: false,
      bcryptRounds: 4, // 测试时使用更低的rounds提高速度
    },
    monitoring: {
      logLevel: 'warn',
      healthCheckEnabled: false,
    },
    performance: {
      cacheEnabled: false,
    },
  },

  [Environment.STAGING]: {
    app: {
      debug: false,
      verboseLogging: false,
    },
    database: {
      ssl: true,
      poolMin: 2,
      poolMax: 10,
    },
    security: {
      corsOrigin: ['https://staging.zkagent.com'],
      rateLimitEnabled: true,
      httpsEnabled: true,
    },
    monitoring: {
      logLevel: 'info',
      prometheusEnabled: true,
      sentryEnvironment: 'staging',
    },
    performance: {
      compressionEnabled: true,
      cacheEnabled: true,
    },
  },

  [Environment.PRODUCTION]: {
    app: {
      debug: false,
      verboseLogging: false,
    },
    database: {
      ssl: true,
      poolMin: 5,
      poolMax: 50,
    },
    security: {
      corsOrigin: ['https://zkagent.com'],
      rateLimitEnabled: true,
      httpsEnabled: true,
      bcryptRounds: 12,
    },
    monitoring: {
      logLevel: 'warn',
      prometheusEnabled: true,
      healthCheckEnabled: true,
      sentryEnvironment: 'production',
    },
    performance: {
      compressionEnabled: true,
      compressionLevel: 9,
      cacheEnabled: true,
      cacheTtl: 7200, // 2小时
    },
  },
};

export class EnvironmentManager {
  private currentEnvironment: Environment;
  private config: EnvironmentConfig;
  private validationErrors: z.ZodError | null = null;

  constructor() {
    this.currentEnvironment = this.detectEnvironment();
    this.config = this.loadConfiguration();
    this.validateConfiguration();
    this.logEnvironmentInfo();
  }

  /**
   * 检测当前环境
   */
  private detectEnvironment(): Environment {
    const nodeEnv = process.env.NODE_ENV?.toLowerCase();
    
    switch (nodeEnv) {
      case 'development':
      case 'dev':
        return Environment.DEVELOPMENT;
      case 'test':
      case 'testing':
        return Environment.TESTING;
      case 'staging':
      case 'stage':
        return Environment.STAGING;
      case 'production':
      case 'prod':
        return Environment.PRODUCTION;
      default:
        logger.warn(`未知的NODE_ENV: ${nodeEnv}，默认使用development`);
        return Environment.DEVELOPMENT;
    }
  }

  /**
   * 加载配置
   */
  private loadConfiguration(): EnvironmentConfig {
    // 获取环境默认值
    const envDefaults = ENVIRONMENT_DEFAULTS[this.currentEnvironment] || {};
    
    // 从环境变量构建配置
    const rawConfig = {
      app: {
        name: process.env.NEXT_PUBLIC_APP_NAME || 'ZK-Agent',
        version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
        url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        port: parseInt(process.env.PORT || '3000'),
        nodeEnv: this.currentEnvironment,
        debug: process.env.DEBUG === 'true',
        verboseLogging: process.env.VERBOSE_LOGGING === 'true',
        ...envDefaults.app,
      },

      database: {
        url: process.env.DATABASE_URL,
        poolMin: parseInt(process.env.DATABASE_POOL_MIN || '2'),
        poolMax: parseInt(process.env.DATABASE_POOL_MAX || '20'),
        ssl: process.env.DATABASE_SSL === 'true',
        ...envDefaults.database,
      },

      redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
        ...envDefaults.redis,
      },

      aiServices: {
        fastgpt: {
          baseUrl: process.env.FASTGPT_BASE_URL,
          apiKey: process.env.FASTGPT_API_KEY,
          appId: process.env.FASTGPT_APP_ID,
        },
        qwen: {
          baseUrl: process.env.QWEN_BASE_URL,
          apiKey: process.env.QWEN_API_KEY,
        },
        siliconflow: {
          baseUrl: process.env.SILICONFLOW_BASE_URL,
          apiKey: process.env.SILICONFLOW_API_KEY,
        },
        openai: {
          apiKey: process.env.OPENAI_API_KEY,
          baseUrl: process.env.OPENAI_BASE_URL,
        },
        ...envDefaults.aiServices,
      },

      security: {
        jwtSecret: process.env.JWT_SECRET || 'default-secret-key-change-in-production',
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
        corsOrigin: process.env.CORS_ORIGIN || '*',
        corsCredentials: process.env.CORS_CREDENTIALS === 'true',
        rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== 'false',
        rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
        rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
        httpsEnabled: process.env.HTTPS_ENABLED === 'true',
        sslCertPath: process.env.SSL_CERT_PATH,
        sslKeyPath: process.env.SSL_KEY_PATH,
        ...envDefaults.security,
      },

      monitoring: {
        logLevel: (process.env.LOG_LEVEL as any) || 'info',
        logFilePath: process.env.LOG_FILE_PATH || './logs',
        sentryDsn: process.env.SENTRY_DSN,
        sentryEnvironment: process.env.SENTRY_ENVIRONMENT || this.currentEnvironment,
        prometheusEnabled: process.env.PROMETHEUS_ENABLED === 'true',
        prometheusPort: parseInt(process.env.PROMETHEUS_PORT || '9090'),
        healthCheckEnabled: process.env.HEALTH_CHECK_ENABLED !== 'false',
        healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
        ...envDefaults.monitoring,
      },

      storage: {
        uploadDir: process.env.UPLOAD_DIR || './uploads',
        tempDir: process.env.TEMP_DIR || './temp',
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600'), // 100MB
        aws: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          region: process.env.AWS_REGION,
          s3Bucket: process.env.AWS_S3_BUCKET,
        },
        aliyun: {
          accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
          accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
          ossRegion: process.env.ALIYUN_OSS_REGION,
          ossBucket: process.env.ALIYUN_OSS_BUCKET,
        },
        ...envDefaults.storage,
      },

      performance: {
        cacheEnabled: process.env.CACHE_ENABLED !== 'false',
        cacheTtl: parseInt(process.env.CACHE_TTL || '3600'),
        compressionEnabled: process.env.COMPRESSION_ENABLED !== 'false',
        compressionLevel: parseInt(process.env.COMPRESSION_LEVEL || '6'),
        requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000'),
        keepAliveTimeout: parseInt(process.env.KEEP_ALIVE_TIMEOUT || '5000'),
        ...envDefaults.performance,
      },
    };

    return rawConfig as EnvironmentConfig;
  }

  /**
   * 验证配置
   */
  private validateConfiguration(): void {
    try {
      this.config = EnvironmentConfigSchema.parse(this.config);
      this.validationErrors = null;
      logger.info('环境配置验证通过');
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.validationErrors = error;
        logger.error('环境配置验证失败', {
          errors: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
            code: e.code
          }))
        });

        // 在生产环境下，配置错误应该导致应用退出
        if (this.currentEnvironment === Environment.PRODUCTION) {
          logger.error('生产环境配置验证失败，应用退出');
          process.exit(1);
        }
      } else {
        logger.error('配置验证过程发生未知错误', { error });
        throw error;
      }
    }
  }

  /**
   * 记录环境信息
   */
  private logEnvironmentInfo(): void {
    logger.info('环境管理器初始化完成', {
      environment: this.currentEnvironment,
      app: {
        name: this.config.app.name,
        version: this.config.app.version,
        port: this.config.app.port,
        debug: this.config.app.debug,
      },
      database: {
        connected: !!this.config.database.url,
        ssl: this.config.database.ssl,
        poolSize: `${this.config.database.poolMin}-${this.config.database.poolMax}`,
      },
      security: {
        httpsEnabled: this.config.security.httpsEnabled,
        rateLimitEnabled: this.config.security.rateLimitEnabled,
        corsOrigin: this.config.security.corsOrigin,
      },
      monitoring: {
        logLevel: this.config.monitoring.logLevel,
        sentryEnabled: !!this.config.monitoring.sentryDsn,
        prometheusEnabled: this.config.monitoring.prometheusEnabled,
      }
    });
  }

  /**
   * 获取当前环境
   */
  public getEnvironment(): Environment {
    return this.currentEnvironment;
  }

  /**
   * 获取完整配置
   */
  public getConfig(): EnvironmentConfig {
    return { ...this.config };
  }

  /**
   * 获取特定配置部分
   */
  public getAppConfig() { return this.config.app; }
  public getDatabaseConfig() { return this.config.database; }
  public getRedisConfig() { return this.config.redis; }
  public getAIServicesConfig() { return this.config.aiServices; }
  public getSecurityConfig() { return this.config.security; }
  public getMonitoringConfig() { return this.config.monitoring; }
  public getStorageConfig() { return this.config.storage; }
  public getPerformanceConfig() { return this.config.performance; }

  /**
   * 检查是否为开发环境
   */
  public isDevelopment(): boolean {
    return this.currentEnvironment === Environment.DEVELOPMENT;
  }

  /**
   * 检查是否为测试环境
   */
  public isTesting(): boolean {
    return this.currentEnvironment === Environment.TESTING;
  }

  /**
   * 检查是否为预发布环境
   */
  public isStaging(): boolean {
    return this.currentEnvironment === Environment.STAGING;
  }

  /**
   * 检查是否为生产环境
   */
  public isProduction(): boolean {
    return this.currentEnvironment === Environment.PRODUCTION;
  }

  /**
   * 获取验证错误
   */
  public getValidationErrors(): z.ZodError | null {
    return this.validationErrors;
  }

  /**
   * 检查配置是否有效
   */
  public isConfigValid(): boolean {
    return this.validationErrors === null;
  }

  /**
   * 重新加载配置
   */
  public reloadConfig(): void {
    logger.info('重新加载环境配置');
    this.config = this.loadConfiguration();
    this.validateConfiguration();
    this.logEnvironmentInfo();
  }

  /**
   * 导出配置为JSON
   */
  public exportConfig(includeSecrets = false): Record<string, unknown> {
    const config = { ...this.config };
    
    if (!includeSecrets) {
      // 移除敏感信息
      config.security.jwtSecret = '[HIDDEN]';
      config.database.url = config.database.url.replace(/\/\/.*@/, '//[HIDDEN]@');
      if (config.redis.password) {
        config.redis.password = '[HIDDEN]';
      }
      // 移除所有API密钥
      Object.keys(config.aiServices).forEach(service => {
        const serviceConfig = config.aiServices[service as keyof typeof config.aiServices];
        if (serviceConfig && 'apiKey' in serviceConfig && serviceConfig.apiKey) {
          serviceConfig.apiKey = '[HIDDEN]';
        }
      });
    }
    
    return {
      environment: this.currentEnvironment,
      config,
      validationStatus: this.isConfigValid() ? 'valid' : 'invalid',
      validationErrors: this.validationErrors?.errors || null,
    };
  }
}

// 导出单例实例
export const environmentManager = new EnvironmentManager();

// 导出便捷函数
export const {
  getEnvironment,
  getConfig,
  getAppConfig,
  getDatabaseConfig,
  getRedisConfig,
  getAIServicesConfig,
  getSecurityConfig,
  getMonitoringConfig,
  getStorageConfig,
  getPerformanceConfig,
  isDevelopment,
  isTesting,
  isStaging,
  isProduction,
} = environmentManager;

// 导出类型
export type { EnvironmentConfig };