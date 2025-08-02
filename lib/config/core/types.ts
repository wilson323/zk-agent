/**
 * @file Core Configuration Types
 * @description 统一配置类型定义
 */

// 基础配置接口
export interface BaseConfig {
  enabled: boolean;
  environment: 'development' | 'production' | 'test';
  version: string;
}

// 缓存配置统一接口
export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number;
  compression: boolean;
  persistToDisk: boolean;
  tags?: string[];
  keyPattern?: string;
  evictionPolicy?: 'allkeys-lru' | 'allkeys-lfu' | 'volatile-lru' | 'volatile-lfu';
}

// 数据库配置统一接口
export interface DatabaseConfig {
  connectionPool: {
    min: number;
    max: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
  };
  enableSSL: boolean;
  enableBackup: boolean;
  backupInterval: number;
  retryConfig: RetryConfig;
}

// 重试配置统一接口
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  enableJitter: boolean;
}

// 性能配置统一接口
export interface PerformanceConfig {
  enableMetrics: boolean;
  enableProfiling: boolean;
  maxMemoryUsage: number;
  maxCpuUsage: number;
  enableGarbageCollection: boolean;
  monitoring: MonitoringConfig;
}

// 监控配置统一接口
export interface MonitoringConfig {
  enabled: boolean;
  interval: number;
  alertThreshold: number;
  retentionPeriod: number;
  aggregationInterval: number;
}

// 安全配置统一接口
export interface SecurityConfig {
  enableEncryption: boolean;
  enableAuditLog: boolean;
  maxLoginAttempts: number;
  sessionTimeout: number;
  enableCSRF: boolean;
  enableRateLimit: boolean;
  rateLimit: RateLimitConfig;
}

// 限流配置统一接口
export interface RateLimitConfig {
  windowMs: number;
  max: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// 日志配置统一接口
export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  enableFileLogging: boolean;
  enableConsoleLogging: boolean;
  maxFileSize: number;
  maxFiles: number;
  enableErrorTracking: boolean;
  enableStructuredLogging: boolean;
}

// API配置统一接口
export interface ApiConfig {
  timeout: number;
  enableCors: boolean;
  enableCompression: boolean;
  rateLimit: RateLimitConfig;
  enableSwagger: boolean;
  enableVersioning: boolean;
}

// 存储配置统一接口
export interface StorageConfig {
  provider: 'local' | 's3' | 'azure' | 'gcp';
  maxFileSize: number;
  supportedFormats: string[];
  enableCompression: boolean;
  enableEncryption: boolean;
  retentionDays: number;
}

// 特性开关配置接口
export interface FeatureFlags {
  [key: string]: boolean;
}

// 环境特定配置接口
export interface EnvironmentConfig {
  development: Partial<AppConfig>;
  production: Partial<AppConfig>;
  test: Partial<AppConfig>;
}

// 应用主配置接口
export interface AppConfig extends BaseConfig {
  cache: CacheConfig;
  database: DatabaseConfig;
  performance: PerformanceConfig;
  security: SecurityConfig;
  logging: LoggingConfig;
  api: ApiConfig;
  storage: StorageConfig;
  features: FeatureFlags;
  monitoring: MonitoringConfig;
}

// 配置验证结果接口
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// 配置更新事件接口
export interface ConfigUpdateEvent {
  key: string;
  oldValue: any;
  newValue: any;
  timestamp: Date;
  source: 'file' | 'env' | 'runtime';
}

// 配置提供者接口
export interface ConfigProvider {
  load(): Promise<Partial<AppConfig>>;
  save(config: Partial<AppConfig>): Promise<void>;
  watch(callback: (event: ConfigUpdateEvent) => void): void;
  validate(config: Partial<AppConfig>): ConfigValidationResult;
}

// 配置管理器接口
export interface ConfigManager {
  get<T = any>(key: string): T;
  set<T = any>(key: string, value: T): void;
  has(key: string): boolean;
  delete(key: string): void;
  getAll(): AppConfig;
  merge(config: Partial<AppConfig>): void;
  validate(): ConfigValidationResult;
  reload(): Promise<void>;
  subscribe(callback: (event: ConfigUpdateEvent) => void): () => void;
}
