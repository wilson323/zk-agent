/**
 * 统一接口和类型定义文件
 * 集中管理项目中所有的接口和类型定义，避免重复定义
 * @author ZK-Agent Team
 * @version 1.0.0
 */

import { ErrorType, ErrorSeverity, CADFileType, ChatMessageType, UserRole, AlertLevel } from './enums';

// ============================================================================
// 基础类型定义
// ============================================================================

/**
 * 验证结果接口
 * 定义数据验证操作的返回结果
 */
export interface ValidationResult {
  /** 验证是否成功 */
  isValid: boolean;
  /** 错误信息列表 */
  errors: string[];
  /** 警告信息列表 */
  warnings?: string[];
  /** 验证的字段名 */
  field?: string;
  /** 验证的值 */
  value?: any;
}

/**
 * 分页参数接口
 * 定义分页查询的参数
 */
export interface PaginationParams {
  /** 页码，从1开始 */
  page: number;
  /** 每页数量 */
  limit: number;
  /** 排序字段 */
  sortBy?: string;
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 分页结果接口
 * 定义分页查询的返回结果
 */
export interface PaginationResult<T> {
  /** 数据列表 */
  items: T[];
  /** 总数量 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 每页数量 */
  limit: number;
  /** 总页数 */
  totalPages: number;
  /** 是否有下一页 */
  hasNext: boolean;
  /** 是否有上一页 */
  hasPrev: boolean;
}

// ============================================================================
// 错误处理相关接口
// ============================================================================

/**
 * 错误信息接口
 * 定义标准化的错误信息结构
 */
export interface ErrorInfo {
  /** 错误代码 */
  code: string;
  /** 错误消息 */
  message: string;
  /** 错误类型 */
  type: ErrorType;
  /** 错误严重程度 */
  severity: ErrorSeverity;
  /** 错误详情 */
  details?: Record<string, any>;
  /** 错误堆栈 */
  stack?: string;
  /** 时间戳 */
  timestamp: string; // Changed to string for ISO format
}

/**
 * API响应接口
 * 定义标准化的API响应结构
 */
export interface ApiResponse<T = any> {
  /** 是否成功 */
  success: boolean;
  /** 响应数据 */
  data?: T;
  /** 错误信息 */
  error?: ErrorInfo;
  /** 响应消息 */
  message?: string;
  /** 元数据 */
  meta?: {
    requestId?: string;
    timestamp: string;
    version?: string;
    [key: string]: any; // 允许其他任意属性
  };
}

// ============================================================================
// 文件相关接口
// ============================================================================

/**
 * 文件信息接口
 * 定义文件的基本信息
 */
export interface FileInfo {
  /** 文件ID */
  id: string;
  /** 文件名 */
  name: string;
  /** 文件大小（字节） */
  size: number;
  /** 文件类型 */
  type: string;
  /** MIME类型 */
  mimeType: string;
  /** 文件路径 */
  path: string;
  /** 文件URL */
  url?: string;
  /** 上传时间 */
  uploadedAt: Date;
  /** 最后修改时间 */
  lastModified?: Date;
  /** 文件扩展名 */
  extension?: string;
}

/**
 * CAD文件接口
 * 定义CAD文件的特定信息
 */
export interface CADFile extends FileInfo {
  /** CAD文件类型 */
  cadType: CADFileType;
  /** 文件版本 */
  version?: string;
  /** 图层信息 */
  layers?: string[];
  /** 尺寸信息 */
  dimensions?: {
    width: number;
    height: number;
    depth?: number;
  };
  /** 缩略图URL */
  thumbnailUrl?: string;
}

/**
 * 文件上传配置接口
 * 定义文件上传的配置参数
 */
export interface FileUploadConfig {
  /** 允许的文件类型 */
  allowedTypes: string[];
  /** 最大文件大小（字节） */
  maxSize: number;
  /** 最大文件数量 */
  maxFiles?: number;
  /** 是否允许多文件上传 */
  multiple?: boolean;
  /** 上传目录 */
  uploadDir?: string;
}

// ============================================================================
// 用户相关接口
// ============================================================================

/**
 * 用户信息接口
 * 定义用户的基本信息
 */
export interface UserInfo {
  /** 用户ID */
  id: string;
  /** 用户名 */
  username: string;
  /** 邮箱 */
  email: string;
  /** 显示名称 */
  displayName?: string;
  /** 头像URL */
  avatar?: string;
  /** 用户角色 */
  role: UserRole;
  /** 创建时间 */
  createdAt: Date;
  /** 最后登录时间 */
  lastLoginAt?: Date;
  /** 是否激活 */
  isActive: boolean;
}

/**
 * 用户会话接口
 * 定义用户会话信息
 */
export interface UserSession {
  /** 会话ID */
  sessionId: string;
  /** 用户信息 */
  user: UserInfo;
  /** 访问令牌 */
  accessToken: string;
  /** 刷新令牌 */
  refreshToken?: string;
  /** 过期时间 */
  expiresAt: Date;
  /** 创建时间 */
  createdAt: Date;
}

// ============================================================================
// 聊天相关接口
// ============================================================================

/**
 * 聊天消息接口
 * 定义聊天消息的结构
 */
export interface ChatMessage {
  /** 消息ID */
  id: string;
  /** 消息类型 */
  type: ChatMessageType;
  /** 消息内容 */
  content: string;
  /** 发送者ID */
  senderId: string;
  /** 发送者信息 */
  sender?: UserInfo;
  /** 接收者ID */
  receiverId?: string;
  /** 聊天室ID */
  chatId: string;
  /** 发送时间 */
  timestamp: Date;
  /** 是否已读 */
  isRead: boolean;
  /** 附件信息 */
  attachments?: FileInfo[];
  /** 回复的消息ID */
  replyToId?: string;
}

/**
 * 聊天室接口
 * 定义聊天室的信息
 */
export interface ChatRoom {
  /** 聊天室ID */
  id: string;
  /** 聊天室名称 */
  name: string;
  /** 聊天室描述 */
  description?: string;
  /** 参与者列表 */
  participants: UserInfo[];
  /** 最后一条消息 */
  lastMessage?: ChatMessage;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
  /** 是否私聊 */
  isPrivate: boolean;
}

// ============================================================================
// 监控相关接口
// ============================================================================

/**
 * 性能指标接口
 * 定义系统性能监控指标
 */
export interface PerformanceMetrics {
  /** CPU使用率（百分比） */
  cpuUsage: number;
  /** 内存使用率（百分比） */
  memoryUsage: number;
  /** 磁盘使用率（百分比） */
  diskUsage: number;
  /** 网络IO（字节/秒） */
  networkIO: {
    incoming: number;
    outgoing: number;
  };
  /** 响应时间（毫秒） */
  responseTime: number;
  /** 请求数量 */
  requestCount: number;
  /** 错误数量 */
  errorCount: number;
  /** 时间戳 */
  timestamp: Date;
}

/**
 * 告警信息接口
 * 定义系统告警的信息
 */
export interface AlertInfo {
  /** 告警ID */
  id: string;
  /** 告警级别 */
  level: AlertLevel;
  /** 告警标题 */
  title: string;
  /** 告警描述 */
  description: string;
  /** 告警来源 */
  source: string;
  /** 告警时间 */
  timestamp: Date;
  /** 是否已确认 */
  acknowledged: boolean;
  /** 确认时间 */
  acknowledgedAt?: Date;
  /** 确认人 */
  acknowledgedBy?: string;
  /** 是否已解决 */
  resolved: boolean;
  /** 解决时间 */
  resolvedAt?: Date;
}

// ============================================================================
// 配置相关接口
// ============================================================================

/**
 * 请求配置接口
 * 定义HTTP请求的配置参数
 */
export interface RequestConfig {
  /** HTTP方法 */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /** 请求头 */
  headers?: Record<string, string>;
  /** 请求体 */
  body?: any;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  /** 中止信号 */
  signal?: AbortSignal;
  /** 凭据模式 */
  credentials?: RequestCredentials;
  /** 缓存模式 */
  cache?: RequestCache;
}

/**
 * 重试配置接口
 * 定义请求重试的配置参数
 */
export interface RetryConfig {
  /** 最大重试次数 */
  maxRetries: number;
  /** 基础延迟时间（毫秒） */
  baseDelay: number;
  /** 最大延迟时间（毫秒） */
  maxDelay: number;
  /** 退避因子 */
  backoffFactor: number;
  /** 重试条件判断函数 */
  retryCondition?: (error: any, attempt: number) => boolean;
}

/**
 * 请求拦截器接口
 * 定义请求和响应的拦截器
 */
export interface RequestInterceptor {
  /** 请求拦截器 */
  request?: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
  /** 响应拦截器 */
  response?: (response: Response) => Response | Promise<Response>;
  /** 错误拦截器 */
  error?: (error: any) => any;
}

/**
 * 错误处理配置接口
 * 定义统一错误处理的配置参数
 */
export interface ErrorHandlingConfig {
  /** 是否启用日志记录 */
  enableLogging?: boolean;
  /** 是否启用指标收集 */
  enableMetrics?: boolean;
  /** 是否启用重试机制 */
  enableRetry?: boolean;
  /** 重试配置 */
  retryConfig?: {
    /** 最大重试次数 */
    maxRetries: number;
    /** 基础延迟时间（毫秒） */
    baseDelay: number;
    /** 最大延迟时间（毫秒） */
    maxDelay: number;
  };
  /** 敏感字段列表 */
  sensitiveFields?: string[];
}

/**
 * 数据库配置接口
 * 定义数据库连接配置
 */
export interface DatabaseConfig {
  /** 数据库主机 */
  host: string;
  /** 数据库端口 */
  port: number;
  /** 数据库名称 */
  database: string;
  /** 用户名 */
  username: string;
  /** 密码 */
  password: string;
  /** 是否使用SSL */
  ssl: boolean;
  /** 连接池配置 */
  pool?: {
    min: number;
    max: number;
    idle: number;
  };
}

/**
 * 缓存配置接口
 * 定义缓存系统配置
 */
export interface CacheConfig {
  /** Redis主机 */
  host: string;
  /** Redis端口 */
  port: number;
  /** Redis密码 */
  password?: string;
  /** 数据库索引 */
  db: number;
  /** 默认过期时间（秒） */
  defaultTTL: number;
  /** 键前缀 */
  keyPrefix?: string;
}

// ============================================================================
// UI组件相关接口
// ============================================================================



/**
 * 颜色令牌接口
 * 定义设计系统中的颜色令牌
 */
export interface ColorToken {
  /** 令牌名称 */
  name: string;
  /** 颜色值 */
  value: string;
  /** 颜色描述 */
  description?: string;
  /** 使用场景 */
  usage?: string[];
}

/**
 * 间距令牌接口
 * 定义设计系统中的间距令牌
 */
export interface SpacingToken {
  /** 令牌名称 */
  name: string;
  /** 间距值（像素） */
  value: number;
  /** 间距描述 */
  description?: string;
  /** 使用场景 */
  usage?: string[];
}