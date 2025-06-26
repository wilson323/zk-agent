// @ts-nocheck
export const CAD_CONFIG = {
  // 文件处理配置
  fileProcessing: {
    maxFileSize: 500 * 1024 * 1024, // 500MB
    supportedFormats: [
      "dwg",
      "dxf",
      "step",
      "stp",
      "iges",
      "igs",
      "stl",
      "obj",
      "3ds",
      "ply",
      "x3d",
      "collada",
      "fbx",
      "dae",
      "3mf",
    ],
    timeout: 300000, // 5分钟
    maxConcurrentFiles: 5,
    chunkSize: 1024 * 1024, // 1MB chunks
  },

  // 设备识别配置
  deviceRecognition: {
    confidenceThreshold: 0.7,
    maxDevicesPerFile: 10000,
    enableAIEnhancement: true,
    patterns: {
      geometric: {
        tolerance: 10, // 几何匹配容差
        minSize: 5, // 最小尺寸
        maxSize: 10000, // 最大尺寸
      },
      textual: {
        fuzzyMatch: true,
        caseSensitive: false,
        maxDistance: 100, // 文本与几何的最大距离
      },
      contextual: {
        layerWeight: 0.3,
        proximityWeight: 0.2,
        patternWeight: 0.5,
      },
    },
  },

  // 风险评估配置
  riskAssessment: {
    enablePredictiveAnalysis: true,
    riskThresholds: {
      critical: 0.9,
      high: 0.7,
      medium: 0.4,
      low: 0.0,
    },
    categories: ["security", "safety", "compliance", "performance", "maintenance"],
    maxRisksPerAnalysis: 1000,
  },

  // 合规性检查配置
  compliance: {
    enabledStandards: ["GB50348-2018", "GA/T75-1994", "GB50116-2013", "GB50057-2010", "GB50394-2007"],
    strictMode: false,
    autoUpdate: true,
    customRules: [],
  },

  // 缓存配置
  cache: {
    enabled: true,
    ttl: 3600000, // 1小时
    maxSize: 100 * 1024 * 1024, // 100MB
    compression: true,
    persistToDisk: false,
  },

  // 性能配置
  performance: {
    enableMetrics: true,
    enableProfiling: false,
    maxMemoryUsage: 2 * 1024 * 1024 * 1024, // 2GB
    maxCpuUsage: 80, // 80%
    enableGarbageCollection: true,
  },

  // 报告配置
  reporting: {
    defaultFormat: "pdf",
    enableImages: true,
    enableCharts: true,
    maxReportSize: 50 * 1024 * 1024, // 50MB
    retentionDays: 30,
    watermark: true,
  },

  // API配置
  api: {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15分钟
      max: 100, // 最大请求数
    },
    timeout: 300000, // 5分钟
    enableCors: true,
    enableCompression: true,
  },

  // 安全配置
  security: {
    enableEncryption: true,
    enableAuditLog: true,
    maxLoginAttempts: 5,
    sessionTimeout: 24 * 60 * 60 * 1000, // 24小时
    enableCSRF: true,
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
  },

  // 日志配置
  logging: {
    level: "info",
    enableFileLogging: true,
    enableConsoleLogging: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    enableErrorTracking: true,
  },

  // 国际化配置
  i18n: {
    defaultLanguage: "zh-CN",
    supportedLanguages: ["zh-CN", "en-US"],
    enableAutoDetection: true,
  },

  // 功能开关
  features: {
    enableBatchAnalysis: true,
    enable3DVisualization: true,
    enableRealTimeProgress: true,
    enableAIRecommendations: true,
    enableCustomRules: true,
    enableExport: true,
    enableSharing: true,
  },
}

// 环境特定配置
export const getEnvironmentConfig = () => {
  const env = process.env.NODE_ENV || "development"

  const envConfigs = {
    development: {
      logging: { level: "debug" },
      cache: { persistToDisk: false },
      security: { enableEncryption: false },
      performance: { enableProfiling: true },
    },

    production: {
      logging: { level: "warn" },
      cache: { persistToDisk: true },
      security: { enableEncryption: true },
      performance: { enableProfiling: false },
    },

    test: {
      logging: { level: "error" },
      cache: { enabled: false },
      database: { connectionPool: { max: 5 } },
    },
  }

  return {
    ...CAD_CONFIG,
    ...envConfigs[env],
  }
}

// 配置验证
export const validateConfig = (config: any): boolean => {
  const required = [
    "fileProcessing.maxFileSize",
    "deviceRecognition.confidenceThreshold",
    "riskAssessment.riskThresholds",
    "compliance.enabledStandards",
  ]

  for (const path of required) {
    const value = path.split(".").reduce((obj, key) => obj?.[key], config)
    if (value === undefined || value === null) {
      console.error(`配置项缺失: ${path}`)
      return false
    }
  }

  return true
}
