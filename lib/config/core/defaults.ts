/**
 * @file Default Configuration
 * @description 默认配置定义
 */

import { AppConfig } from './types';

export const defaultConfig: AppConfig = {
  // 基础配置
  enabled: true,
  environment: 'development',
  version: '1.0.0',

  // 缓存配置
  cache: {
    enabled: true,
    ttl: 3600000, // 1小时
    maxSize: 100 * 1024 * 1024, // 100MB
    compression: true,
    persistToDisk: false,
    evictionPolicy: 'allkeys-lru',
  },

  // 数据库配置
  database: {
    connectionPool: {
      min: 2,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    },
    enableSSL: true,
    enableBackup: true,
    backupInterval: 24 * 60 * 60 * 1000, // 24小时
    retryConfig: {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      enableJitter: true,
    },
  },

  // 性能配置
  performance: {
    enableMetrics: true,
    enableProfiling: false,
    maxMemoryUsage: 2 * 1024 * 1024 * 1024, // 2GB
    maxCpuUsage: 80, // 80%
    enableGarbageCollection: true,
    monitoring: {
      enabled: true,
      interval: 60000, // 1分钟
      alertThreshold: 0.8, // 80%
      retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7天
      aggregationInterval: 60 * 1000, // 1分钟
    },
  },

  // 安全配置
  security: {
    enableEncryption: true,
    enableAuditLog: true,
    maxLoginAttempts: 5,
    sessionTimeout: 24 * 60 * 60 * 1000, // 24小时
    enableCSRF: true,
    enableRateLimit: true,
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15分钟
      max: 100,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
    },
  },

  // 日志配置
  logging: {
    level: 'info',
    enableFileLogging: true,
    enableConsoleLogging: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    enableErrorTracking: true,
    enableStructuredLogging: true,
  },

  // API配置
  api: {
    timeout: 300000, // 5分钟
    enableCors: true,
    enableCompression: true,
    enableSwagger: true,
    enableVersioning: true,
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15分钟
      max: 100,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
    },
  },

  // 存储配置
  storage: {
    provider: 'local',
    maxFileSize: 500 * 1024 * 1024, // 500MB
    supportedFormats: [
      'dwg', 'dxf', 'step', 'stp', 'iges', 'igs', 'stl',
      'obj', '3ds', 'ply', 'x3d', 'collada', 'fbx', 'dae', '3mf',
      'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
      'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp',
      'mp4', 'avi', 'mov', 'wmv', 'flv',
      'mp3', 'wav', 'flac', 'aac',
      'zip', 'rar', '7z', 'tar', 'gz',
    ],
    enableCompression: true,
    enableEncryption: true,
    retentionDays: 30,
  },

  // 特性开关
  features: {
    enableBatchAnalysis: true,
    enable3DVisualization: true,
    enableRealTimeProgress: true,
    enableAIRecommendations: true,
    enableCustomRules: true,
    enableExport: true,
    enableSharing: true,
    enableAdvancedSearch: true,
    enableCollaboration: true,
    enableNotifications: true,
    enableAnalytics: true,
    enableAutoSave: true,
    enableVersionControl: true,
    enableBackup: true,
    enableSync: true,
  },

  // 监控配置
  monitoring: {
    enabled: true,
    interval: 60000, // 1分钟
    alertThreshold: 0.8, // 80%
    retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7天
    aggregationInterval: 60 * 1000, // 1分钟
  },
};

// CAD特定配置
export const cadConfig = {
  fileProcessing: {
    maxFileSize: 500 * 1024 * 1024, // 500MB
    supportedFormats: [
      'dwg', 'dxf', 'step', 'stp', 'iges', 'igs', 'stl',
      'obj', '3ds', 'ply', 'x3d', 'collada', 'fbx', 'dae', '3mf',
    ],
    timeout: 300000, // 5分钟
    maxConcurrentFiles: 5,
    chunkSize: 1024 * 1024, // 1MB chunks
  },
  deviceRecognition: {
    confidenceThreshold: 0.7,
    maxDevicesPerFile: 10000,
    enableAIEnhancement: true,
    patterns: {
      geometric: {
        tolerance: 10,
        minSize: 5,
        maxSize: 10000,
      },
      textual: {
        fuzzyMatch: true,
        caseSensitive: false,
        maxDistance: 100,
      },
      contextual: {
        layerWeight: 0.3,
        proximityWeight: 0.2,
        patternWeight: 0.5,
      },
    },
  },
  riskAssessment: {
    enablePredictiveAnalysis: true,
    riskThresholds: {
      critical: 0.9,
      high: 0.7,
      medium: 0.4,
      low: 0.0,
    },
    categories: ['security', 'safety', 'compliance', 'performance', 'maintenance'],
    maxRisksPerAnalysis: 1000,
  },
  compliance: {
    enabledStandards: ['GB50348-2018', 'GA/T75-1994', 'GB50116-2013', 'GB50057-2010', 'GB50394-2007'],
    strictMode: false,
    autoUpdate: true,
    customRules: [],
  },
};

// Redis缓存策略配置
export const redisCacheConfig = {
  agents: {
    ttl: 30 * 60, // 30分钟
    tags: ['agents', 'public'],
    compress: true,
    keyPattern: 'agents:*',
  },
  sessions: {
    ttl: 24 * 60 * 60, // 24小时
    tags: ['sessions', 'auth'],
    compress: false,
    keyPattern: 'sessions:*',
  },
  apiResponses: {
    ttl: 5 * 60, // 5分钟
    tags: ['api', 'responses'],
    compress: true,
    keyPattern: 'api:*',
  },
  searchResults: {
    ttl: 10 * 60, // 10分钟
    tags: ['search', 'results'],
    compress: true,
    keyPattern: 'search:*',
  },
};

// 仪表板配置
export const dashboardConfig = {
  realTimeMetrics: {
    updateInterval: 5000, // 5秒更新
    metrics: [
      'responseTime',
      'throughput',
      'errorRate',
      'memoryUsage',
      'cacheHitRate',
    ],
  },
  historicalData: {
    retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7天
    aggregationInterval: 60 * 1000, // 1分钟聚合
  },
  alertRules: [
    {
      name: 'High Response Time',
      condition: 'responseTime > 200',
      severity: 'warning',
    },
    {
      name: 'Low Cache Hit Rate',
      condition: 'cacheHitRate < 0.9',
      severity: 'warning',
    },
    {
      name: 'High Error Rate',
      condition: 'errorRate > 0.05',
      severity: 'critical',
    },
  ],
};