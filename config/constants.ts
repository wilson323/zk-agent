/**
 * @file 项目常量配置
 * @description 定义项目中使用的所有常量，包括API端点、配置参数等
 * @author ZK-Agent Team
 * @date 2024-01-20
 */

// API 路由常量
export const API_ROUTES = {
  // 认证相关
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REGISTER: '/api/auth/register',
    REFRESH: '/api/auth/refresh',
    PROFILE: '/api/auth/profile',
    CHANGE_PASSWORD: '/api/auth/change-password',
  },
  
  // 智能体相关
  AGENTS: {
    LIST: '/api/ag-ui/standard/chat',
    CHAT: '/api/ag-ui/chat',
    COMPLIANCE: '/api/ag-ui/compliance',
    CAD_ANALYSIS: '/api/ag-ui/cad-analysis',
  },
  
  // CAD分析相关
  CAD: {
    UPLOAD: '/api/cad/upload',
    ANALYZE: '/api/cad/analyze',
    HISTORY: '/api/cad/history',
    STATISTICS: '/api/cad/statistics',
    EXPORT: '/api/cad/export',
  },
  
  // 海报生成相关
  POSTER: {
    GENERATE: '/api/poster/generate',
    HISTORY: '/api/poster/history',
    TEMPLATES: '/api/poster/templates',
    CONFIG: '/api/poster/config',
    EXPORT: '/api/poster/export',
    CONVERT_TO_PDF: '/api/poster/convert-to-pdf',
  },
  
  // 管理端相关
  ADMIN: {
    DASHBOARD: '/api/admin',
    USERS: '/api/admin/users',
    AI_MODELS: '/api/admin/ai-models',
    METRICS: '/api/admin/metrics',
    ERROR_LOGS: '/api/admin/error-logs',
    IP_STATS: '/api/admin/ip-stats',
  },
  
  // 系统相关
  SYSTEM: {
    HEALTH: '/api/health',
    METRICS: '/api/metrics',
    VERSIONS: '/api/versions',
  },
} as const;

// 页面路由常量
export const PAGE_ROUTES = {
  // 公共页面
  HOME: '/',
  CHAT: '/chat',
  CAD_ANALYZER: '/cad-analyzer',
  POSTER_GENERATOR: '/poster-generator',
  PROFILE: '/profile',
  
  // 认证页面
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  
  // 管理端页面
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_USERS: '/admin/users',
  ADMIN_AI_MODELS: '/admin/ai-models',
  ADMIN_ANALYTICS: '/admin/analytics',
  
  // 共享页面
  SHARED: '/shared',
} as const;

// 应用配置常量
export const APP_CONFIG = {
  // 应用信息
  NAME: 'ZK-Agent',
  DESCRIPTION: 'AI多智能体宇宙平台',
  VERSION: '1.0.0',
  
  // 分页配置
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
  },
  
  // 文件上传配置
  FILE_UPLOAD: {
    MAX_SIZE: 50 * 1024 * 1024, // 50MB
    ALLOWED_TYPES: {
      CAD: ['.dwg', '.dxf', '.step', '.iges', '.obj'],
      IMAGE: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      DOCUMENT: ['.pdf', '.doc', '.docx'],
    },
  },
  
  // 缓存配置
  CACHE: {
    TTL: {
      SHORT: 5 * 60, // 5分钟
      MEDIUM: 30 * 60, // 30分钟
      LONG: 24 * 60 * 60, // 24小时
    },
  },
  
  // 速率限制配置
  RATE_LIMIT: {
    API: {
      WINDOW_MS: 15 * 60 * 1000, // 15分钟
      MAX_REQUESTS: 100,
    },
    AUTH: {
      WINDOW_MS: 15 * 60 * 1000, // 15分钟
      MAX_REQUESTS: 5,
    },
    UPLOAD: {
      WINDOW_MS: 60 * 1000, // 1分钟
      MAX_REQUESTS: 10,
    },
  },
  
  // WebSocket配置
  WEBSOCKET: {
    HEARTBEAT_INTERVAL: 30000, // 30秒
    RECONNECT_INTERVAL: 5000, // 5秒
    MAX_RECONNECT_ATTEMPTS: 5,
  },
} as const;

// 主题配置常量
export const THEME_CONFIG = {
  COLORS: {
    PRIMARY: '#6cb33f',
    SECONDARY: '#2563eb',
    SUCCESS: '#10b981',
    WARNING: '#f59e0b',
    ERROR: '#ef4444',
    INFO: '#3b82f6',
  },
  
  BREAKPOINTS: {
    SM: '640px',
    MD: '768px',
    LG: '1024px',
    XL: '1280px',
    '2XL': '1536px',
  },
} as const;

// 错误代码常量
export const ERROR_CODES = {
  // 认证错误
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS',
  
  // 验证错误
  VALIDATION_REQUIRED_FIELD: 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
  VALIDATION_FILE_TOO_LARGE: 'VALIDATION_FILE_TOO_LARGE',
  
  // 业务错误
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  OPERATION_FAILED: 'OPERATION_FAILED',
  
  // 系统错误
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

// AI模型配置常量
export const AI_MODEL_CONFIG = {
  // FastGPT配置
  FASTGPT: {
    BASE_URL: process.env.FASTGPT_BASE_URL || 'https://api.fastgpt.in',
    API_KEY: process.env.FASTGPT_API_KEY,
    MODEL: 'gpt-3.5-turbo',
    MAX_TOKENS: 4000,
    TEMPERATURE: 0.7,
  },
  
  // 阿里云千问配置
  QWEN: {
    BASE_URL: process.env.QWEN_BASE_URL,
    API_KEY: process.env.QWEN_API_KEY,
    MODEL: 'qwen-turbo',
    MAX_TOKENS: 2000,
    TEMPERATURE: 0.8,
  },
  
  // 硅基流动配置
  SILICONFLOW: {
    BASE_URL: process.env.SILICONFLOW_BASE_URL,
    API_KEY: process.env.SILICONFLOW_API_KEY,
    MODEL: 'deepseek-chat',
    MAX_TOKENS: 4000,
    TEMPERATURE: 0.7,
  },
} as const;

// 性能监控配置
export const PERFORMANCE_CONFIG = {
  // 性能阈值
  THRESHOLDS: {
    API_RESPONSE_TIME: 500, // 500ms
    PAGE_LOAD_TIME: 2000, // 2秒
    CAD_ANALYSIS_TIME: 30000, // 30秒
    POSTER_GENERATION_TIME: 60000, // 60秒
  },
  
  // 监控指标
  METRICS: {
    ENABLED: process.env.NODE_ENV === 'production',
    COLLECTION_INTERVAL: 60000, // 1分钟
  },
} as const; 