/**
 * @file Configuration Validation
 * @description 配置验证模式定义
 */

import { z } from 'zod';

// 基础配置验证模式
const baseConfigSchema = z.object({
  enabled: z.boolean(),
  environment: z.enum(['development', 'production', 'test']),
  version: z.string().min(1),
});

// 缓存配置验证模式
const cacheConfigSchema = z.object({
  enabled: z.boolean(),
  ttl: z.number().positive(),
  maxSize: z.number().positive(),
  compression: z.boolean(),
  persistToDisk: z.boolean(),
  tags: z.array(z.string()).optional(),
  keyPattern: z.string().optional(),
  evictionPolicy: z.enum(['allkeys-lru', 'allkeys-lfu', 'volatile-lru', 'volatile-lfu']).optional(),
});

// 重试配置验证模式
const retryConfigSchema = z.object({
  maxAttempts: z.number().int().positive().max(10),
  baseDelay: z.number().positive(),
  maxDelay: z.number().positive(),
  backoffMultiplier: z.number().positive(),
  enableJitter: z.boolean(),
});

// 数据库配置验证模式
const databaseConfigSchema = z.object({
  connectionPool: z.object({
    min: z.number().int().nonnegative(),
    max: z.number().int().positive(),
    idleTimeoutMillis: z.number().positive(),
    connectionTimeoutMillis: z.number().positive(),
  }),
  enableSSL: z.boolean(),
  enableBackup: z.boolean(),
  backupInterval: z.number().positive(),
  retryConfig: retryConfigSchema,
});

// 监控配置验证模式
const monitoringConfigSchema = z.object({
  enabled: z.boolean(),
  interval: z.number().positive(),
  alertThreshold: z.number().min(0).max(1),
  retentionPeriod: z.number().positive(),
  aggregationInterval: z.number().positive(),
});

// 性能配置验证模式
const performanceConfigSchema = z.object({
  enableMetrics: z.boolean(),
  enableProfiling: z.boolean(),
  maxMemoryUsage: z.number().positive(),
  maxCpuUsage: z.number().min(1).max(100),
  enableGarbageCollection: z.boolean(),
  monitoring: monitoringConfigSchema,
});

// 限流配置验证模式
const rateLimitConfigSchema = z.object({
  windowMs: z.number().positive(),
  max: z.number().int().positive(),
  skipSuccessfulRequests: z.boolean().optional(),
  skipFailedRequests: z.boolean().optional(),
});

// 安全配置验证模式
const securityConfigSchema = z.object({
  enableEncryption: z.boolean(),
  enableAuditLog: z.boolean(),
  maxLoginAttempts: z.number().int().positive(),
  sessionTimeout: z.number().positive(),
  enableCSRF: z.boolean(),
  enableRateLimit: z.boolean(),
  rateLimit: rateLimitConfigSchema,
});

// 日志配置验证模式
const loggingConfigSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error']),
  enableFileLogging: z.boolean(),
  enableConsoleLogging: z.boolean(),
  maxFileSize: z.number().positive(),
  maxFiles: z.number().int().positive(),
  enableErrorTracking: z.boolean(),
  enableStructuredLogging: z.boolean(),
});

// API配置验证模式
const apiConfigSchema = z.object({
  timeout: z.number().positive(),
  enableCors: z.boolean(),
  enableCompression: z.boolean(),
  enableSwagger: z.boolean(),
  enableVersioning: z.boolean(),
  rateLimit: rateLimitConfigSchema,
});

// 存储配置验证模式
const storageConfigSchema = z.object({
  provider: z.enum(['local', 's3', 'azure', 'gcp']),
  maxFileSize: z.number().positive(),
  supportedFormats: z.array(z.string()),
  enableCompression: z.boolean(),
  enableEncryption: z.boolean(),
  retentionDays: z.number().int().positive(),
});

// 特性开关验证模式
const featureFlagsSchema = z.record(z.string(), z.boolean());

// 主配置验证模式
export const configSchema = baseConfigSchema.extend({
  cache: cacheConfigSchema,
  database: databaseConfigSchema,
  performance: performanceConfigSchema,
  security: securityConfigSchema,
  logging: loggingConfigSchema,
  api: apiConfigSchema,
  storage: storageConfigSchema,
  features: featureFlagsSchema,
  monitoring: monitoringConfigSchema,
});

// CAD特定配置验证模式
export const cadConfigSchema = z.object({
  fileProcessing: z.object({
    maxFileSize: z.number().positive(),
    supportedFormats: z.array(z.string()),
    timeout: z.number().positive(),
    maxConcurrentFiles: z.number().int().positive(),
    chunkSize: z.number().positive(),
  }),
  deviceRecognition: z.object({
    confidenceThreshold: z.number().min(0).max(1),
    maxDevicesPerFile: z.number().int().positive(),
    enableAIEnhancement: z.boolean(),
    patterns: z.object({
      geometric: z.object({
        tolerance: z.number().positive(),
        minSize: z.number().positive(),
        maxSize: z.number().positive(),
      }),
      textual: z.object({
        fuzzyMatch: z.boolean(),
        caseSensitive: z.boolean(),
        maxDistance: z.number().positive(),
      }),
      contextual: z.object({
        layerWeight: z.number().min(0).max(1),
        proximityWeight: z.number().min(0).max(1),
        patternWeight: z.number().min(0).max(1),
      }),
    }),
  }),
  riskAssessment: z.object({
    enablePredictiveAnalysis: z.boolean(),
    riskThresholds: z.object({
      critical: z.number().min(0).max(1),
      high: z.number().min(0).max(1),
      medium: z.number().min(0).max(1),
      low: z.number().min(0).max(1),
    }),
    categories: z.array(z.string()),
    maxRisksPerAnalysis: z.number().int().positive(),
  }),
  compliance: z.object({
    enabledStandards: z.array(z.string()),
    strictMode: z.boolean(),
    autoUpdate: z.boolean(),
    customRules: z.array(z.any()),
  }),
});

// Redis缓存策略验证模式
export const redisCacheConfigSchema = z.record(
  z.string(),
  z.object({
    ttl: z.number().positive(),
    tags: z.array(z.string()),
    compress: z.boolean(),
    keyPattern: z.string(),
  })
);

// 仪表板配置验证模式
export const dashboardConfigSchema = z.object({
  realTimeMetrics: z.object({
    updateInterval: z.number().positive(),
    metrics: z.array(z.string()),
  }),
  historicalData: z.object({
    retentionPeriod: z.number().positive(),
    aggregationInterval: z.number().positive(),
  }),
  alertRules: z.array(
    z.object({
      name: z.string(),
      condition: z.string(),
      severity: z.enum(['info', 'warning', 'critical']),
    })
  ),
});

// 配置验证函数
export function validateConfig(config: any): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  try {
    configSchema.parse(config);
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

// 部分配置验证函数
export function validatePartialConfig(config: any): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  try {
    configSchema.partial().parse(config);
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

// 配置类型推断
export type ValidatedConfig = z.infer<typeof configSchema>;
export type ValidatedCadConfig = z.infer<typeof cadConfigSchema>;
export type ValidatedRedisCacheConfig = z.infer<typeof redisCacheConfigSchema>;
export type ValidatedDashboardConfig = z.infer<typeof dashboardConfigSchema>;
