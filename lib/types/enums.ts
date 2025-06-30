/**
 * 统一枚举定义文件
 * 集中管理项目中所有的枚举类型，避免重复定义
 * @author ZK-Agent Team
 * @version 1.0.0
 */

// ============================================================================
// 云存储相关枚举
// ============================================================================

/**
 * 云存储提供商枚举
 * 定义支持的云存储服务提供商类型
 */
export enum CloudProvider {
  AWS = 'aws',
  AZURE = 'azure',
  GCP = 'gcp',
  ALIYUN = 'aliyun',
  LOCAL = 'local'
}

// ============================================================================
// 错误和状态相关枚举
// ============================================================================

/**
 * 错误类型枚举
 * 定义系统中各种错误的分类
 */
export enum ErrorType {
  VALIDATION = 'validation',
  NETWORK = 'network',
  DATABASE = 'database',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
  UNKNOWN = 'unknown'
}

/**
 * 错误严重程度枚举
 * 定义错误的严重程度级别
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * 权限枚举
 * 定义系统中的权限类型
 */
export enum Permission {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  EXECUTE = 'execute',
  AGENT_READ = 'agent_read',
  AGENT_CREATE = 'agent_create',
  AGENT_UPDATE = 'agent_update',
  AGENT_DELETE = 'agent_delete',
  AGENT_EXECUTE = 'agent_execute',
  AGENT_CONFIGURE = 'agent_configure',
  USER_READ = 'user_read',
  USER_CREATE = 'user_create',
  USER_UPDATE = 'user_update',
  USER_DELETE = 'user_delete',
  USER_LIST = 'user_list',
  SYSTEM_CONFIG = 'system_config',
  SYSTEM_MONITOR = 'system_monitor',
  SYSTEM_LOGS = 'system_logs',
  SECURITY_AUDIT = 'security_audit',
  SECURITY_SCAN = 'security_scan',
  CAD_UPLOAD = 'cad_upload',
  CAD_ANALYZE = 'cad_analyze',
  CAD_HISTORY = 'cad_history',
  POSTER_CREATE = 'poster_create',
  POSTER_READ = 'poster_read',
  POSTER_UPDATE = 'poster_update',
  POSTER_DELETE = 'poster_delete',
  FILE_UPLOAD = 'file_upload',
  FILE_READ = 'file_read',
  FILE_DELETE = 'file_delete',
  REPORT_VIEW = 'report_view',
  CODE_REVIEW = 'code_review',
  DEBUG_TOOLS = 'debug_tools'
}

/**
 * 资源类型枚举
 * 定义系统中的资源类型
 */
export enum ResourceType {
  USER = 'user',
  AGENT = 'agent',
  FILE = 'file',
  CAD = 'cad',
  POSTER = 'poster',
  REPORT = 'report',
  SYSTEM = 'system',
  CONFIG = 'config',
  LOG = 'log'
}

/**
 * Agent错误类型枚举
 * 定义Agent系统特有的错误类型
 */
export enum AgentErrorType {
  INITIALIZATION_FAILED = 'initialization_failed',
  PROCESSING_ERROR = 'processing_error',
  COMMUNICATION_ERROR = 'communication_error',
  RESOURCE_EXHAUSTED = 'resource_exhausted',
  TIMEOUT = 'timeout',
  INVALID_STATE = 'invalid_state'
}

/**
 * 熔断器状态枚举
 * 定义熔断器的各种状态
 */
export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

/**
 * 资源状态枚举
 * 定义系统资源的状态
 */
export enum ResourceStatus {
  AVAILABLE = 'available',
  BUSY = 'busy',
  UNAVAILABLE = 'unavailable',
  MAINTENANCE = 'maintenance',
  ERROR = 'error'
}

// ============================================================================
// 缓存相关枚举
// ============================================================================

/**
 * 缓存策略枚举
 * 定义不同的缓存策略类型
 */
export enum CacheStrategy {
  LRU = 'lru',           // 最近最少使用
  LFU = 'lfu',           // 最少使用频率
  TTL = 'ttl',           // 基于过期时间
  FIFO = 'fifo',         // 先进先出
  PRIORITY = 'priority',  // 基于优先级
  ADAPTIVE = 'adaptive',  // 自适应策略
  WRITE_THROUGH = 'write_through',
  WRITE_BACK = 'write_back',
  WRITE_AROUND = 'write_around'
}

/**
 * 缓存优先级枚举
 * 定义缓存项的优先级
 */
export enum CachePriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4,
}

/**
 * 缓存层级枚举
 * 定义不同的缓存层级
 */
export enum CacheLayer {
  MEMORY = 'memory',
  REDIS = 'redis',
  DISK = 'disk',
  HYBRID = 'hybrid',
}

// ============================================================================
// 监控和告警相关枚举
// ============================================================================

/**
 * 告警级别枚举
 * 定义系统告警的严重程度
 */
export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// ============================================================================
// 用户和权限相关枚举
// ============================================================================

/**
 * 用户角色枚举
 * 定义系统中的用户角色类型
 */
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
  MODERATOR = 'moderator',
  DEVELOPER = 'developer',
  SUPER_ADMIN = 'super_admin',
  SYSTEM = 'system'
}

/**
 * 用户状态枚举
 * 定义用户账户的状态
 */
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  DELETED = 'deleted'
}

// 任务状态枚举
export enum TaskStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

// ============================================================================
// AI相关枚举
// ============================================================================

/**
 * AI提供商枚举
 * 定义支持的AI服务提供商
 */
export enum AIProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
  AZURE_OPENAI = 'azure_openai',
  LOCAL = 'local'
}

// ============================================================================
// 安全相关枚举
// ============================================================================

/**
 * 威胁类型枚举
 * 定义安全威胁的类型
 */
export enum ThreatType {
  MALWARE = 'malware',
  VIRUS = 'virus',
  SUSPICIOUS_CONTENT = 'suspicious_content',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  DATA_BREACH = 'data_breach',
  INJECTION_ATTACK = 'injection_attack'
}

// ============================================================================
// API相关枚举
// ============================================================================

/**
 * 错误代码枚举
 * 定义API返回的错误代码
 */
export enum ErrorCode {
  INVALID_REQUEST = 'INVALID_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
}

// ============================================================================
// 文件相关枚举
// ============================================================================

/**
 * CAD文件类型枚举
 * 定义支持的CAD文件格式
 */
export enum CADFileType {
  DWG = 'dwg',
  DXF = 'dxf',
  STEP = 'step',
  IGES = 'iges',
  STL = 'stl',
  OBJ = 'obj'
}

// ============================================================================
// 聊天相关枚举
// ============================================================================

/**
 * 聊天消息类型枚举
 * 定义聊天消息的类型
 */
export enum ChatMessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  SYSTEM = 'system',
  ERROR = 'error',
  TYPING = 'typing'
}

// ============================================================================
// UI组件相关枚举
// ============================================================================

/**
 * 按钮大小枚举
 * 定义按钮组件的大小选项
 */
export enum ButtonSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large'
}

/**
 * 按钮变体枚举
 * 定义按钮组件的样式变体
 */
export enum ButtonVariant {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  OUTLINE = 'outline',
  GHOST = 'ghost',
  DESTRUCTIVE = 'destructive'
}

/**
 * 颜色主题枚举
 * 定义系统支持的颜色主题
 */
export enum ColorTheme {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto'
}