// @ts-nocheck
/**
 * @file 环境变量配置管理
 * @description 统一管理和验证环境变量配置
 * @author ZK-Agent Team
 * @date 2024-01-20
 */

import { z } from 'zod';

// 环境变量验证 Schema
const envSchema = z.object({
  // 基础配置
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_APP_NAME: z.string().default('ZK-Agent'),
  NEXT_PUBLIC_APP_VERSION: z.string().default('1.0.0'),

  // 数据库配置
  DATABASE_URL: z.string().min(1, '数据库连接字符串不能为空'),
  DATABASE_POOL_MIN: z.coerce.number().min(1).default(2),
  DATABASE_POOL_MAX: z.coerce.number().min(1).default(10),

  // Redis 配置
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().min(0).default(0),

  // 认证配置
  JWT_SECRET: z.string().min(32, 'JWT密钥长度至少32位'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  NEXTAUTH_SECRET: z.string().min(32, 'NextAuth密钥长度至少32位'),
  NEXTAUTH_URL: z.string().url().optional(),
  BCRYPT_ROUNDS: z.coerce.number().min(10).max(15).default(12),

  // AI 服务配置
  FASTGPT_BASE_URL: z.string().url().optional(),
  FASTGPT_API_KEY: z.string().optional(),
  FASTGPT_APP_ID: z.string().optional(),
  QWEN_BASE_URL: z.string().url().optional(),
  QWEN_API_KEY: z.string().optional(),
  SILICONFLOW_BASE_URL: z.string().url().optional(),
  SILICONFLOW_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().url().optional(),

  // 文件存储配置
  UPLOAD_DIR: z.string().default('./uploads'),
  TEMP_DIR: z.string().default('./temp'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  ALIYUN_ACCESS_KEY_ID: z.string().optional(),
  ALIYUN_ACCESS_KEY_SECRET: z.string().optional(),
  ALIYUN_OSS_REGION: z.string().optional(),
  ALIYUN_OSS_BUCKET: z.string().optional(),

  // 邮件配置
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  // 监控配置
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FILE_PATH: z.string().default('./logs'),
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  PROMETHEUS_ENABLED: z.coerce.boolean().default(false),
  PROMETHEUS_PORT: z.coerce.number().default(9090),

  // 第三方服务配置
  WECHAT_APP_ID: z.string().optional(),
  WECHAT_APP_SECRET: z.string().optional(),
  STRIPE_PUBLIC_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // 开发配置
  DEBUG: z.coerce.boolean().default(false),
  VERBOSE_LOGGING: z.coerce.boolean().default(false),
  RATE_LIMIT_ENABLED: z.coerce.boolean().default(true),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  CORS_CREDENTIALS: z.coerce.boolean().default(true),

  // 性能配置
  CACHE_ENABLED: z.coerce.boolean().default(true),
  CACHE_TTL: z.coerce.number().default(3600),
  COMPRESSION_ENABLED: z.coerce.boolean().default(true),
  COMPRESSION_LEVEL: z.coerce.number().min(1).max(9).default(6),

  // WebSocket 配置
  WS_PORT: z.coerce.number().default(3001),
  WS_HEARTBEAT_INTERVAL: z.coerce.number().default(30000),
  WS_MAX_CONNECTIONS: z.coerce.number().default(1000),

  // CAD 配置
  CAD_MAX_FILE_SIZE: z.coerce.number().default(52428800),
  CAD_SUPPORTED_FORMATS: z.string().default('dwg,dxf,step,iges,obj'),
  CAD_ANALYSIS_TIMEOUT: z.coerce.number().default(300000),

  // 海报配置
  POSTER_MAX_QUEUE_SIZE: z.coerce.number().default(100),
  POSTER_GENERATION_TIMEOUT: z.coerce.number().default(120000),
  POSTER_OUTPUT_FORMATS: z.string().default('png,jpg,pdf'),

  // 安全配置
  HTTPS_ENABLED: z.coerce.boolean().default(false),
  SSL_CERT_PATH: z.string().optional(),
  SSL_KEY_PATH: z.string().optional(),
  SECURITY_HEADERS_ENABLED: z.coerce.boolean().default(true),
  CSP_ENABLED: z.coerce.boolean().default(true),
  IP_WHITELIST: z.string().optional(),

  // 备份配置
  BACKUP_ENABLED: z.coerce.boolean().default(false),
  BACKUP_SCHEDULE: z.string().default('0 2 * * *'),
  BACKUP_RETENTION_DAYS: z.coerce.number().default(30),
  BACKUP_STORAGE_PATH: z.string().default('./backups'),
});

// 验证环境变量
function validateEnv(): z.infer<typeof envSchema> {
  // 在测试环境中使用宽松的验证
  if (process.env.NODE_ENV === 'test') {
    const testSchema = envSchema.partial({
      JWT_SECRET: true,
      NEXTAUTH_SECRET: true,
      DATABASE_URL: true,
    }).extend({
      JWT_SECRET: z.string().default('test-jwt-secret-key-for-testing-purposes-only-32-chars-minimum'),
      NEXTAUTH_SECRET: z.string().default('test-nextauth-secret-key-for-testing-purposes-only-32-chars-minimum'),
      DATABASE_URL: z.string().default('postgresql://test:test@localhost:5432/test_db'),
    });
    
    try {
      return testSchema.parse(process.env);
    } catch (error) {
      console.warn('Test environment validation warning:', error);
      // 在测试环境中返回默认值
      return testSchema.parse({});
    }
  }

  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`环境变量验证失败:\n${missingVars.join('\n')}`);
    }
    throw error;
  }
}

// 导出验证后的环境变量
export const env = validateEnv();

// 环境变量类型
export type Env = typeof env;

// 检查是否为生产环境
export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';

// 数据库配置
export const dbConfig = {
  url: env.DATABASE_URL,
  pool: {
    min: env.DATABASE_POOL_MIN,
    max: env.DATABASE_POOL_MAX,
  },
};

// Redis 配置
export const redisConfig = {
  url: env.REDIS_URL,
  password: env.REDIS_PASSWORD,
  db: env.REDIS_DB,
};

// JWT 配置
export const jwtConfig = {
  secret: env.JWT_SECRET,
  expiresIn: env.JWT_EXPIRES_IN,
  refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
};

// AI 服务配置
export const aiConfig = {
  fastgpt: {
    baseUrl: env.FASTGPT_BASE_URL,
    apiKey: env.FASTGPT_API_KEY,
    appId: env.FASTGPT_APP_ID,
  },
  qwen: {
    baseUrl: env.QWEN_BASE_URL,
    apiKey: env.QWEN_API_KEY,
  },
  siliconflow: {
    baseUrl: env.SILICONFLOW_BASE_URL,
    apiKey: env.SILICONFLOW_API_KEY,
  },
  openai: {
    baseUrl: env.OPENAI_BASE_URL,
    apiKey: env.OPENAI_API_KEY,
  },
};

// 文件存储配置
export const storageConfig = {
  uploadDir: env.UPLOAD_DIR,
  tempDir: env.TEMP_DIR,
  aws: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    region: env.AWS_REGION,
    bucket: env.AWS_S3_BUCKET,
  },
  aliyun: {
    accessKeyId: env.ALIYUN_ACCESS_KEY_ID,
    accessKeySecret: env.ALIYUN_ACCESS_KEY_SECRET,
    region: env.ALIYUN_OSS_REGION,
    bucket: env.ALIYUN_OSS_BUCKET,
  },
};

// 邮件配置
export const emailConfig = {
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  user: env.SMTP_USER,
  pass: env.SMTP_PASS,
  from: env.SMTP_FROM,
};

// 监控配置
export const monitoringConfig = {
  logLevel: env.LOG_LEVEL,
  logFilePath: env.LOG_FILE_PATH,
  sentry: {
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT,
  },
  prometheus: {
    enabled: env.PROMETHEUS_ENABLED,
    port: env.PROMETHEUS_PORT,
  },
};

// 安全配置
export const securityConfig = {
  bcryptRounds: env.BCRYPT_ROUNDS,
  rateLimit: {
    enabled: env.RATE_LIMIT_ENABLED,
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  },
  cors: {
    origin: env.CORS_ORIGIN,
    credentials: env.CORS_CREDENTIALS,
  },
  https: {
    enabled: env.HTTPS_ENABLED,
    certPath: env.SSL_CERT_PATH,
    keyPath: env.SSL_KEY_PATH,
  },
  headers: {
    enabled: env.SECURITY_HEADERS_ENABLED,
    csp: env.CSP_ENABLED,
  },
  ipWhitelist: env.IP_WHITELIST?.split(',').filter(Boolean) || [],
};

// 性能配置
export const performanceConfig = {
  cache: {
    enabled: env.CACHE_ENABLED,
    ttl: env.CACHE_TTL,
  },
  compression: {
    enabled: env.COMPRESSION_ENABLED,
    level: env.COMPRESSION_LEVEL,
  },
};

// WebSocket 配置
export const wsConfig = {
  port: env.WS_PORT,
  heartbeatInterval: env.WS_HEARTBEAT_INTERVAL,
  maxConnections: env.WS_MAX_CONNECTIONS,
};

// CAD 配置
export const cadConfig = {
  maxFileSize: env.CAD_MAX_FILE_SIZE,
  supportedFormats: env.CAD_SUPPORTED_FORMATS.split(','),
  analysisTimeout: env.CAD_ANALYSIS_TIMEOUT,
};

// 海报配置
export const posterConfig = {
  maxQueueSize: env.POSTER_MAX_QUEUE_SIZE,
  generationTimeout: env.POSTER_GENERATION_TIMEOUT,
  outputFormats: env.POSTER_OUTPUT_FORMATS.split(','),
};

// 备份配置
export const backupConfig = {
  enabled: env.BACKUP_ENABLED,
  schedule: env.BACKUP_SCHEDULE,
  retentionDays: env.BACKUP_RETENTION_DAYS,
  storagePath: env.BACKUP_STORAGE_PATH,
}; 