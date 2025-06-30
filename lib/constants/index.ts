/**
 * 统一常量定义文件
 * 集中管理项目中所有的常量定义，避免重复定义
 * @author ZK-Agent Team
 * @version 1.0.0
 */

// ============================================================================
// API相关常量
// ============================================================================

/**
 * HTTP状态码常量
 * 定义常用的HTTP状态码
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
} as const;

/**
 * API路径常量
 * 定义API的基础路径
 */
export const API_PATHS = {
  BASE: '/api',
  V1: '/api/v1',
  AUTH: '/api/auth',
  ADMIN: '/api/admin',
  HEALTH: '/api/health',
  METRICS: '/api/metrics',
  UPLOAD: '/api/upload',
  DOWNLOAD: '/api/download'
} as const;

/**
 * 请求头常量
 * 定义常用的HTTP请求头
 */
export const HEADERS = {
  CONTENT_TYPE: 'Content-Type',
  AUTHORIZATION: 'Authorization',
  USER_AGENT: 'User-Agent',
  ACCEPT: 'Accept',
  CACHE_CONTROL: 'Cache-Control',
  X_REQUEST_ID: 'X-Request-ID',
  X_API_KEY: 'X-API-Key'
} as const;

/**
 * 内容类型常量
 * 定义常用的MIME类型
 */
export const CONTENT_TYPES = {
  JSON: 'application/json',
  XML: 'application/xml',
  HTML: 'text/html',
  PLAIN: 'text/plain',
  FORM_DATA: 'multipart/form-data',
  URL_ENCODED: 'application/x-www-form-urlencoded',
  OCTET_STREAM: 'application/octet-stream'
} as const;

// ============================================================================
// 本地存储相关常量
// ============================================================================

/**
 * 本地存储键名常量
 * 定义localStorage和sessionStorage的键名
 */
export const LOCAL_STORAGE_KEYS = {
  USER_TOKEN: 'user_token',
  USER_INFO: 'user_info',
  THEME: 'theme',
  LANGUAGE: 'language',
  PREFERENCES: 'preferences',
  CHAT_HISTORY: 'chat_history',
  DRAFT_MESSAGE: 'draft_message',
  LAST_VISITED: 'last_visited'
} as const;

// ============================================================================
// 文件相关常量
// ============================================================================

/**
 * 文件大小限制常量（字节）
 * 定义不同类型文件的大小限制
 */
export const FILE_SIZE_LIMITS = {
  IMAGE: 5 * 1024 * 1024, // 5MB
  DOCUMENT: 10 * 1024 * 1024, // 10MB
  VIDEO: 100 * 1024 * 1024, // 100MB
  CAD: 50 * 1024 * 1024, // 50MB
  GENERAL: 20 * 1024 * 1024 // 20MB
} as const;

/**
 * 支持的文件类型常量
 * 定义系统支持的文件MIME类型
 */
export const SUPPORTED_FILE_TYPES = {
  IMAGES: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ],
  DOCUMENTS: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ],
  CAD_FILES: [
    'application/acad',
    'application/x-autocad',
    'application/dwg',
    'application/dxf',
    'application/step',
    'application/iges'
  ],
  AUDIO: [
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/mp4'
  ],
  VIDEO: [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo'
  ]
} as const;

/**
 * 音频格式常量
 * 定义支持的音频格式
 */
export const AUDIO_FORMATS = {
  MP3: 'mp3',
  WAV: 'wav',
  OGG: 'ogg',
  M4A: 'm4a',
  FLAC: 'flac'
} as const;

// ============================================================================
// AI模型相关常量
// ============================================================================

/**
 * AI模型用途常量
 * 定义AI模型的使用场景
 */
export const MODEL_PURPOSES = {
  CHAT: 'chat',
  COMPLETION: 'completion',
  EMBEDDING: 'embedding',
  IMAGE_GENERATION: 'image_generation',
  CODE_GENERATION: 'code_generation',
  TRANSLATION: 'translation',
  SUMMARIZATION: 'summarization'
} as const;

/**
 * AI模型类型图标常量
 * 定义不同AI模型类型对应的图标
 */
export const MODEL_TYPE_ICONS = {
  GPT: '🤖',
  CLAUDE: '🧠',
  GEMINI: '💎',
  LLAMA: '🦙',
  CUSTOM: '⚙️'
} as const;

// ============================================================================
// 语言相关常量
// ============================================================================

/**
 * 支持的语言常量
 * 定义系统支持的语言列表
 */
export const SUPPORTED_LANGUAGES = {
  ZH_CN: 'zh-CN',
  ZH_TW: 'zh-TW',
  EN_US: 'en-US',
  EN_GB: 'en-GB',
  JA_JP: 'ja-JP',
  KO_KR: 'ko-KR',
  FR_FR: 'fr-FR',
  DE_DE: 'de-DE',
  ES_ES: 'es-ES',
  IT_IT: 'it-IT',
  RU_RU: 'ru-RU'
} as const;

/**
 * 语言显示名称常量
 * 定义语言代码对应的显示名称
 */
export const LANGUAGE_NAMES = {
  [SUPPORTED_LANGUAGES.ZH_CN]: '简体中文',
  [SUPPORTED_LANGUAGES.ZH_TW]: '繁體中文',
  [SUPPORTED_LANGUAGES.EN_US]: 'English (US)',
  [SUPPORTED_LANGUAGES.EN_GB]: 'English (UK)',
  [SUPPORTED_LANGUAGES.JA_JP]: '日本語',
  [SUPPORTED_LANGUAGES.KO_KR]: '한국어',
  [SUPPORTED_LANGUAGES.FR_FR]: 'Français',
  [SUPPORTED_LANGUAGES.DE_DE]: 'Deutsch',
  [SUPPORTED_LANGUAGES.ES_ES]: 'Español',
  [SUPPORTED_LANGUAGES.IT_IT]: 'Italiano',
  [SUPPORTED_LANGUAGES.RU_RU]: 'Русский'
} as const;

// ============================================================================
// Agent相关常量
// ============================================================================

/**
 * Agent类型常量
 * 定义不同类型的Agent
 */
export const AGENT_TYPES = {
  CHAT: 'chat',
  TASK: 'task',
  ANALYSIS: 'analysis',
  GENERATION: 'generation',
  TRANSLATION: 'translation',
  CODING: 'coding'
} as const;

/**
 * Agent状态常量
 * 定义Agent的运行状态
 */
export const AGENT_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  ERROR: 'error',
  COMPLETED: 'completed'
} as const;

// ============================================================================
// 分页相关常量
// ============================================================================

/**
 * 分页默认配置常量
 * 定义分页的默认参数
 */
export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
  SORT_ORDER: 'desc'
} as const;

/**
 * 每页会话数量常量
 * 定义聊天会话列表的分页大小
 */
export const SESSIONS_PER_PAGE = 20;

// ============================================================================
// 海报生成相关常量
// ============================================================================

/**
 * 海报样式常量
 * 定义海报生成的样式选项
 */
export const POSTER_STYLES = {
  MODERN: 'modern',
  CLASSIC: 'classic',
  MINIMALIST: 'minimalist',
  CREATIVE: 'creative',
  PROFESSIONAL: 'professional',
  ARTISTIC: 'artistic'
} as const;

/**
 * 营销标题常量
 * 定义营销海报的标题模板
 */
export const MARKETING_HEADLINES = [
  '突破创新边界',
  '引领未来趋势',
  '专业品质保证',
  '卓越服务体验',
  '智能解决方案',
  '高效便捷服务'
] as const;

// ============================================================================
// 时间相关常量
// ============================================================================

/**
 * 时间间隔常量（毫秒）
 * 定义常用的时间间隔
 */
export const TIME_INTERVALS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000
} as const;

/**
 * 缓存过期时间常量（秒）
 * 定义不同类型数据的缓存过期时间
 */
export const CACHE_TTL = {
  SHORT: 5 * 60, // 5分钟
  MEDIUM: 30 * 60, // 30分钟
  LONG: 2 * 60 * 60, // 2小时
  VERY_LONG: 24 * 60 * 60 // 24小时
} as const;

// ============================================================================
// 正则表达式常量
// ============================================================================

/**
 * 验证正则表达式常量
 * 定义常用的数据验证正则表达式
 */
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[+]?[1-9]\d{1,14}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  USERNAME: /^[a-zA-Z0-9_]{3,20}$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  IPV4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
} as const;

// ============================================================================
// 错误消息常量
// ============================================================================

/**
 * API错误消息常量
 * 定义统一的API错误消息
 */
export const ERROR_MESSAGES = {
  CONNECTION_FAILED: "API connection failed",
  NETWORK_ERROR: "Network error, cannot connect to server",
  TIMEOUT: "Connection timeout, server response time too long",
  UNAUTHORIZED: "API key is invalid or expired",
  FORBIDDEN: "You don't have permission to access this resource",
  NOT_FOUND: "API endpoint does not exist",
  INVALID_URL: "API endpoint URL format is incorrect",
  UNKNOWN: "Unknown error",

  // Suggested actions
  SUGGESTIONS: {
    ENABLE_PROXY: "Enabling proxy mode may solve CORS issues",
    CHECK_API_KEY: "Update API key",
    CHECK_PERMISSIONS: "Check API key permissions",
    CHECK_NETWORK: "Check network connection",
    RETRY_LATER: "Please try again later"
  }
} as const;

// ============================================================================
// 默认配置常量
// ============================================================================

/**
 * 错误处理默认配置
 * 定义统一错误处理的默认配置
 */
export const ERROR_HANDLING_DEFAULT_CONFIG = {
  enableLogging: true,
  enableMetrics: true,
  enableRetry: false,
  sensitiveFields: ['password', 'token', 'secret', 'key']
} as const;

/**
 * API请求默认配置
 * 定义API请求的默认配置
 */
export const API_REQUEST_DEFAULT_CONFIG = {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
  credentials: 'same-origin',
  cache: 'default'
} as const;

// ============================================================================
// 环境相关常量
// ============================================================================

/**
 * 环境类型常量
 * 定义应用运行环境类型
 */
export const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  TESTING: 'testing',
  STAGING: 'staging',
  PRODUCTION: 'production'
} as const;

/**
 * 日志级别常量
 * 定义日志记录的级别
 */
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  TRACE: 'trace'
} as const;