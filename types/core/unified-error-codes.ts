/**
 * @file unified-error-codes.ts
 * @description 统一的错误代码枚举定义
 * @author ZK-Agent Team
 * @date 2025-01-27
 */

/**
 * 统一错误代码枚举
 * 按照错误类型进行分类，便于管理和维护
 */
export enum UnifiedErrorCode {
  // ========== 认证和授权错误 (1000-1999) ==========
  AUTH_INVALID_TOKEN = 'AUTH_INVALID_TOKEN',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  AUTH_INSUFFICIENT_PERMISSIONS = 'AUTH_INSUFFICIENT_PERMISSIONS',
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  AUTH_SESSION_EXPIRED = 'AUTH_SESSION_EXPIRED',
  AUTH_ACCOUNT_LOCKED = 'AUTH_ACCOUNT_LOCKED',
  AUTH_ACCOUNT_DISABLED = 'AUTH_ACCOUNT_DISABLED',
  AUTH_TWO_FACTOR_REQUIRED = 'AUTH_TWO_FACTOR_REQUIRED',
  
  // ========== 验证错误 (2000-2999) ==========
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  VALIDATION_INVALID_FORMAT = 'VALIDATION_INVALID_FORMAT',
  VALIDATION_REQUIRED_FIELD = 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_VALUE = 'VALIDATION_INVALID_VALUE',
  VALIDATION_FIELD_TOO_LONG = 'VALIDATION_FIELD_TOO_LONG',
  VALIDATION_FIELD_TOO_SHORT = 'VALIDATION_FIELD_TOO_SHORT',
  VALIDATION_INVALID_EMAIL = 'VALIDATION_INVALID_EMAIL',
  VALIDATION_INVALID_PHONE = 'VALIDATION_INVALID_PHONE',
  VALIDATION_INVALID_URL = 'VALIDATION_INVALID_URL',
  VALIDATION_INVALID_DATE = 'VALIDATION_INVALID_DATE',
  VALIDATION_INVALID_JSON = 'VALIDATION_INVALID_JSON',
  
  // ========== 资源错误 (3000-3999) ==========
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_ACCESS_DENIED = 'RESOURCE_ACCESS_DENIED',
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',
  RESOURCE_EXPIRED = 'RESOURCE_EXPIRED',
  RESOURCE_QUOTA_EXCEEDED = 'RESOURCE_QUOTA_EXCEEDED',
  RESOURCE_SIZE_LIMIT_EXCEEDED = 'RESOURCE_SIZE_LIMIT_EXCEEDED',
  
  // ========== 数据库错误 (4000-4999) ==========
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  DATABASE_QUERY_ERROR = 'DATABASE_QUERY_ERROR',
  DATABASE_TRANSACTION_ERROR = 'DATABASE_TRANSACTION_ERROR',
  DATABASE_CONSTRAINT_VIOLATION = 'DATABASE_CONSTRAINT_VIOLATION',
  DATABASE_DEADLOCK = 'DATABASE_DEADLOCK',
  DATABASE_TIMEOUT = 'DATABASE_TIMEOUT',
  
  // ========== 网络和外部服务错误 (5000-5999) ==========
  NETWORK_ERROR = 'NETWORK_ERROR',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_CONNECTION_REFUSED = 'NETWORK_CONNECTION_REFUSED',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  EXTERNAL_SERVICE_UNAVAILABLE = 'EXTERNAL_SERVICE_UNAVAILABLE',
  EXTERNAL_SERVICE_TIMEOUT = 'EXTERNAL_SERVICE_TIMEOUT',
  EXTERNAL_API_RATE_LIMITED = 'EXTERNAL_API_RATE_LIMITED',
  
  // ========== 系统错误 (6000-6999) ==========
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  SYSTEM_OVERLOADED = 'SYSTEM_OVERLOADED',
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',
  MEMORY_LIMIT_EXCEEDED = 'MEMORY_LIMIT_EXCEEDED',
  DISK_SPACE_FULL = 'DISK_SPACE_FULL',
  
  // ========== 限流和配额错误 (7000-7999) ==========
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  CONCURRENT_LIMIT_EXCEEDED = 'CONCURRENT_LIMIT_EXCEEDED',
  
  // ========== 超时错误 (8000-8999) ==========
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  REQUEST_TIMEOUT = 'REQUEST_TIMEOUT',
  OPERATION_TIMEOUT = 'OPERATION_TIMEOUT',
  
  // ========== 业务逻辑错误 (9000-9999) ==========
  BUSINESS_LOGIC_ERROR = 'BUSINESS_LOGIC_ERROR',
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  WORKFLOW_ERROR = 'WORKFLOW_ERROR',
  STATE_TRANSITION_ERROR = 'STATE_TRANSITION_ERROR',
  
  // ========== 文件和存储错误 (10000-10999) ==========
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_ACCESS_DENIED = 'FILE_ACCESS_DENIED',
  FILE_SIZE_TOO_LARGE = 'FILE_SIZE_TOO_LARGE',
  FILE_TYPE_NOT_SUPPORTED = 'FILE_TYPE_NOT_SUPPORTED',
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
  STORAGE_ERROR = 'STORAGE_ERROR',
  
  // ========== 通用错误 (99000+) ==========
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
  DEPRECATED_API = 'DEPRECATED_API'
}

/**
 * 错误代码到HTTP状态码的映射
 */
export const ERROR_CODE_TO_HTTP_STATUS: Record<UnifiedErrorCode, number> = {
  // 认证和授权错误 -> 401/403
  [UnifiedErrorCode.AUTH_INVALID_TOKEN]: 401,
  [UnifiedErrorCode.AUTH_TOKEN_EXPIRED]: 401,
  [UnifiedErrorCode.AUTH_INSUFFICIENT_PERMISSIONS]: 403,
  [UnifiedErrorCode.AUTH_INVALID_CREDENTIALS]: 401,
  [UnifiedErrorCode.AUTH_SESSION_EXPIRED]: 401,
  [UnifiedErrorCode.AUTH_ACCOUNT_LOCKED]: 423,
  [UnifiedErrorCode.AUTH_ACCOUNT_DISABLED]: 403,
  [UnifiedErrorCode.AUTH_TWO_FACTOR_REQUIRED]: 401,
  
  // 验证错误 -> 400
  [UnifiedErrorCode.VALIDATION_ERROR]: 400,
  [UnifiedErrorCode.VALIDATION_INVALID_FORMAT]: 400,
  [UnifiedErrorCode.VALIDATION_REQUIRED_FIELD]: 400,
  [UnifiedErrorCode.VALIDATION_INVALID_VALUE]: 400,
  [UnifiedErrorCode.VALIDATION_FIELD_TOO_LONG]: 400,
  [UnifiedErrorCode.VALIDATION_FIELD_TOO_SHORT]: 400,
  [UnifiedErrorCode.VALIDATION_INVALID_EMAIL]: 400,
  [UnifiedErrorCode.VALIDATION_INVALID_PHONE]: 400,
  [UnifiedErrorCode.VALIDATION_INVALID_URL]: 400,
  [UnifiedErrorCode.VALIDATION_INVALID_DATE]: 400,
  [UnifiedErrorCode.VALIDATION_INVALID_JSON]: 400,
  
  // 资源错误 -> 404/409/403
  [UnifiedErrorCode.RESOURCE_NOT_FOUND]: 404,
  [UnifiedErrorCode.RESOURCE_ALREADY_EXISTS]: 409,
  [UnifiedErrorCode.RESOURCE_ACCESS_DENIED]: 403,
  [UnifiedErrorCode.RESOURCE_LOCKED]: 423,
  [UnifiedErrorCode.RESOURCE_EXPIRED]: 410,
  [UnifiedErrorCode.RESOURCE_QUOTA_EXCEEDED]: 429,
  [UnifiedErrorCode.RESOURCE_SIZE_LIMIT_EXCEEDED]: 413,
  
  // 数据库错误 -> 500
  [UnifiedErrorCode.DATABASE_CONNECTION_ERROR]: 500,
  [UnifiedErrorCode.DATABASE_QUERY_ERROR]: 500,
  [UnifiedErrorCode.DATABASE_TRANSACTION_ERROR]: 500,
  [UnifiedErrorCode.DATABASE_CONSTRAINT_VIOLATION]: 409,
  [UnifiedErrorCode.DATABASE_DEADLOCK]: 500,
  [UnifiedErrorCode.DATABASE_TIMEOUT]: 504,
  
  // 网络和外部服务错误 -> 502/503/504
  [UnifiedErrorCode.NETWORK_ERROR]: 502,
  [UnifiedErrorCode.NETWORK_TIMEOUT]: 504,
  [UnifiedErrorCode.NETWORK_CONNECTION_REFUSED]: 502,
  [UnifiedErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  [UnifiedErrorCode.EXTERNAL_SERVICE_UNAVAILABLE]: 503,
  [UnifiedErrorCode.EXTERNAL_SERVICE_TIMEOUT]: 504,
  [UnifiedErrorCode.EXTERNAL_API_RATE_LIMITED]: 429,
  
  // 系统错误 -> 500/503
  [UnifiedErrorCode.INTERNAL_SERVER_ERROR]: 500,
  [UnifiedErrorCode.SERVICE_UNAVAILABLE]: 503,
  [UnifiedErrorCode.SYSTEM_OVERLOADED]: 503,
  [UnifiedErrorCode.SYSTEM_MAINTENANCE]: 503,
  [UnifiedErrorCode.MEMORY_LIMIT_EXCEEDED]: 507,
  [UnifiedErrorCode.DISK_SPACE_FULL]: 507,
  
  // 限流和配额错误 -> 429
  [UnifiedErrorCode.RATE_LIMIT_ERROR]: 429,
  [UnifiedErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [UnifiedErrorCode.QUOTA_EXCEEDED]: 429,
  [UnifiedErrorCode.CONCURRENT_LIMIT_EXCEEDED]: 429,
  
  // 超时错误 -> 408/504
  [UnifiedErrorCode.TIMEOUT_ERROR]: 408,
  [UnifiedErrorCode.REQUEST_TIMEOUT]: 408,
  [UnifiedErrorCode.OPERATION_TIMEOUT]: 504,
  
  // 业务逻辑错误 -> 422
  [UnifiedErrorCode.BUSINESS_LOGIC_ERROR]: 422,
  [UnifiedErrorCode.BUSINESS_RULE_VIOLATION]: 422,
  [UnifiedErrorCode.WORKFLOW_ERROR]: 422,
  [UnifiedErrorCode.STATE_TRANSITION_ERROR]: 422,
  
  // 文件和存储错误 -> 404/403/413/415/507
  [UnifiedErrorCode.FILE_NOT_FOUND]: 404,
  [UnifiedErrorCode.FILE_ACCESS_DENIED]: 403,
  [UnifiedErrorCode.FILE_SIZE_TOO_LARGE]: 413,
  [UnifiedErrorCode.FILE_TYPE_NOT_SUPPORTED]: 415,
  [UnifiedErrorCode.STORAGE_QUOTA_EXCEEDED]: 507,
  [UnifiedErrorCode.STORAGE_ERROR]: 500,
  
  // 通用错误 -> 500/501/410
  [UnifiedErrorCode.UNKNOWN_ERROR]: 500,
  [UnifiedErrorCode.NOT_IMPLEMENTED]: 501,
  [UnifiedErrorCode.DEPRECATED_API]: 410
};

/**
 * 错误代码的用户友好消息映射
 */
export const ERROR_CODE_MESSAGES: Record<UnifiedErrorCode, string> = {
  // 认证和授权错误
  [UnifiedErrorCode.AUTH_INVALID_TOKEN]: '无效的访问令牌',
  [UnifiedErrorCode.AUTH_TOKEN_EXPIRED]: '访问令牌已过期',
  [UnifiedErrorCode.AUTH_INSUFFICIENT_PERMISSIONS]: '权限不足',
  [UnifiedErrorCode.AUTH_INVALID_CREDENTIALS]: '用户名或密码错误',
  [UnifiedErrorCode.AUTH_SESSION_EXPIRED]: '会话已过期，请重新登录',
  [UnifiedErrorCode.AUTH_ACCOUNT_LOCKED]: '账户已被锁定',
  [UnifiedErrorCode.AUTH_ACCOUNT_DISABLED]: '账户已被禁用',
  [UnifiedErrorCode.AUTH_TWO_FACTOR_REQUIRED]: '需要双因素认证',
  
  // 验证错误
  [UnifiedErrorCode.VALIDATION_ERROR]: '数据验证失败',
  [UnifiedErrorCode.VALIDATION_INVALID_FORMAT]: '数据格式无效',
  [UnifiedErrorCode.VALIDATION_REQUIRED_FIELD]: '必填字段缺失',
  [UnifiedErrorCode.VALIDATION_INVALID_VALUE]: '字段值无效',
  [UnifiedErrorCode.VALIDATION_FIELD_TOO_LONG]: '字段长度超出限制',
  [UnifiedErrorCode.VALIDATION_FIELD_TOO_SHORT]: '字段长度不足',
  [UnifiedErrorCode.VALIDATION_INVALID_EMAIL]: '邮箱格式无效',
  [UnifiedErrorCode.VALIDATION_INVALID_PHONE]: '手机号格式无效',
  [UnifiedErrorCode.VALIDATION_INVALID_URL]: 'URL格式无效',
  [UnifiedErrorCode.VALIDATION_INVALID_DATE]: '日期格式无效',
  [UnifiedErrorCode.VALIDATION_INVALID_JSON]: 'JSON格式无效',
  
  // 资源错误
  [UnifiedErrorCode.RESOURCE_NOT_FOUND]: '资源未找到',
  [UnifiedErrorCode.RESOURCE_ALREADY_EXISTS]: '资源已存在',
  [UnifiedErrorCode.RESOURCE_ACCESS_DENIED]: '资源访问被拒绝',
  [UnifiedErrorCode.RESOURCE_LOCKED]: '资源已被锁定',
  [UnifiedErrorCode.RESOURCE_EXPIRED]: '资源已过期',
  [UnifiedErrorCode.RESOURCE_QUOTA_EXCEEDED]: '资源配额已超限',
  [UnifiedErrorCode.RESOURCE_SIZE_LIMIT_EXCEEDED]: '资源大小超出限制',
  
  // 数据库错误
  [UnifiedErrorCode.DATABASE_CONNECTION_ERROR]: '数据库连接失败',
  [UnifiedErrorCode.DATABASE_QUERY_ERROR]: '数据库查询错误',
  [UnifiedErrorCode.DATABASE_TRANSACTION_ERROR]: '数据库事务错误',
  [UnifiedErrorCode.DATABASE_CONSTRAINT_VIOLATION]: '数据库约束违反',
  [UnifiedErrorCode.DATABASE_DEADLOCK]: '数据库死锁',
  [UnifiedErrorCode.DATABASE_TIMEOUT]: '数据库操作超时',
  
  // 网络和外部服务错误
  [UnifiedErrorCode.NETWORK_ERROR]: '网络错误',
  [UnifiedErrorCode.NETWORK_TIMEOUT]: '网络超时',
  [UnifiedErrorCode.NETWORK_CONNECTION_REFUSED]: '网络连接被拒绝',
  [UnifiedErrorCode.EXTERNAL_SERVICE_ERROR]: '外部服务错误',
  [UnifiedErrorCode.EXTERNAL_SERVICE_UNAVAILABLE]: '外部服务不可用',
  [UnifiedErrorCode.EXTERNAL_SERVICE_TIMEOUT]: '外部服务超时',
  [UnifiedErrorCode.EXTERNAL_API_RATE_LIMITED]: '外部API限流',
  
  // 系统错误
  [UnifiedErrorCode.INTERNAL_SERVER_ERROR]: '内部服务器错误',
  [UnifiedErrorCode.SERVICE_UNAVAILABLE]: '服务不可用',
  [UnifiedErrorCode.SYSTEM_OVERLOADED]: '系统过载',
  [UnifiedErrorCode.SYSTEM_MAINTENANCE]: '系统维护中',
  [UnifiedErrorCode.MEMORY_LIMIT_EXCEEDED]: '内存限制超出',
  [UnifiedErrorCode.DISK_SPACE_FULL]: '磁盘空间不足',
  
  // 限流和配额错误
  [UnifiedErrorCode.RATE_LIMIT_ERROR]: '请求频率限制',
  [UnifiedErrorCode.RATE_LIMIT_EXCEEDED]: '请求频率超限',
  [UnifiedErrorCode.QUOTA_EXCEEDED]: '配额已超限',
  [UnifiedErrorCode.CONCURRENT_LIMIT_EXCEEDED]: '并发限制超出',
  
  // 超时错误
  [UnifiedErrorCode.TIMEOUT_ERROR]: '操作超时',
  [UnifiedErrorCode.REQUEST_TIMEOUT]: '请求超时',
  [UnifiedErrorCode.OPERATION_TIMEOUT]: '操作超时',
  
  // 业务逻辑错误
  [UnifiedErrorCode.BUSINESS_LOGIC_ERROR]: '业务逻辑错误',
  [UnifiedErrorCode.BUSINESS_RULE_VIOLATION]: '业务规则违反',
  [UnifiedErrorCode.WORKFLOW_ERROR]: '工作流错误',
  [UnifiedErrorCode.STATE_TRANSITION_ERROR]: '状态转换错误',
  
  // 文件和存储错误
  [UnifiedErrorCode.FILE_NOT_FOUND]: '文件未找到',
  [UnifiedErrorCode.FILE_ACCESS_DENIED]: '文件访问被拒绝',
  [UnifiedErrorCode.FILE_SIZE_TOO_LARGE]: '文件大小过大',
  [UnifiedErrorCode.FILE_TYPE_NOT_SUPPORTED]: '文件类型不支持',
  [UnifiedErrorCode.STORAGE_QUOTA_EXCEEDED]: '存储配额已超限',
  [UnifiedErrorCode.STORAGE_ERROR]: '存储错误',
  
  // 通用错误
  [UnifiedErrorCode.UNKNOWN_ERROR]: '未知错误',
  [UnifiedErrorCode.NOT_IMPLEMENTED]: '功能未实现',
  [UnifiedErrorCode.DEPRECATED_API]: 'API已废弃'
};

/**
 * 错误严重程度枚举
 */
// 导入统一的错误严重级别枚举
import { ErrorSeverity } from '@/lib/types/enums';

/**
 * 错误代码到严重程度的映射
 */
export const ERROR_CODE_SEVERITY: Record<UnifiedErrorCode, ErrorSeverity> = {
  // 认证和授权错误 - 中等严重程度
  [UnifiedErrorCode.AUTH_INVALID_TOKEN]: ErrorSeverity.MEDIUM,
  [UnifiedErrorCode.AUTH_TOKEN_EXPIRED]: ErrorSeverity.LOW,
  [UnifiedErrorCode.AUTH_INSUFFICIENT_PERMISSIONS]: ErrorSeverity.MEDIUM,
  [UnifiedErrorCode.AUTH_INVALID_CREDENTIALS]: ErrorSeverity.LOW,
  [UnifiedErrorCode.AUTH_SESSION_EXPIRED]: ErrorSeverity.LOW,
  [UnifiedErrorCode.AUTH_ACCOUNT_LOCKED]: ErrorSeverity.HIGH,
  [UnifiedErrorCode.AUTH_ACCOUNT_DISABLED]: ErrorSeverity.HIGH,
  [UnifiedErrorCode.AUTH_TWO_FACTOR_REQUIRED]: ErrorSeverity.MEDIUM,
  
  // 验证错误 - 低严重程度
  [UnifiedErrorCode.VALIDATION_ERROR]: ErrorSeverity.LOW,
  [UnifiedErrorCode.VALIDATION_INVALID_FORMAT]: ErrorSeverity.LOW,
  [UnifiedErrorCode.VALIDATION_REQUIRED_FIELD]: ErrorSeverity.LOW,
  [UnifiedErrorCode.VALIDATION_INVALID_VALUE]: ErrorSeverity.LOW,
  [UnifiedErrorCode.VALIDATION_FIELD_TOO_LONG]: ErrorSeverity.LOW,
  [UnifiedErrorCode.VALIDATION_FIELD_TOO_SHORT]: ErrorSeverity.LOW,
  [UnifiedErrorCode.VALIDATION_INVALID_EMAIL]: ErrorSeverity.LOW,
  [UnifiedErrorCode.VALIDATION_INVALID_PHONE]: ErrorSeverity.LOW,
  [UnifiedErrorCode.VALIDATION_INVALID_URL]: ErrorSeverity.LOW,
  [UnifiedErrorCode.VALIDATION_INVALID_DATE]: ErrorSeverity.LOW,
  [UnifiedErrorCode.VALIDATION_INVALID_JSON]: ErrorSeverity.LOW,
  
  // 资源错误 - 中等严重程度
  [UnifiedErrorCode.RESOURCE_NOT_FOUND]: ErrorSeverity.LOW,
  [UnifiedErrorCode.RESOURCE_ALREADY_EXISTS]: ErrorSeverity.LOW,
  [UnifiedErrorCode.RESOURCE_ACCESS_DENIED]: ErrorSeverity.MEDIUM,
  [UnifiedErrorCode.RESOURCE_LOCKED]: ErrorSeverity.MEDIUM,
  [UnifiedErrorCode.RESOURCE_EXPIRED]: ErrorSeverity.LOW,
  [UnifiedErrorCode.RESOURCE_QUOTA_EXCEEDED]: ErrorSeverity.HIGH,
  [UnifiedErrorCode.RESOURCE_SIZE_LIMIT_EXCEEDED]: ErrorSeverity.MEDIUM,
  
  // 数据库错误 - 高严重程度
  [UnifiedErrorCode.DATABASE_CONNECTION_ERROR]: ErrorSeverity.CRITICAL,
  [UnifiedErrorCode.DATABASE_QUERY_ERROR]: ErrorSeverity.HIGH,
  [UnifiedErrorCode.DATABASE_TRANSACTION_ERROR]: ErrorSeverity.HIGH,
  [UnifiedErrorCode.DATABASE_CONSTRAINT_VIOLATION]: ErrorSeverity.MEDIUM,
  [UnifiedErrorCode.DATABASE_DEADLOCK]: ErrorSeverity.HIGH,
  [UnifiedErrorCode.DATABASE_TIMEOUT]: ErrorSeverity.HIGH,
  
  // 网络和外部服务错误 - 中等到高严重程度
  [UnifiedErrorCode.NETWORK_ERROR]: ErrorSeverity.MEDIUM,
  [UnifiedErrorCode.NETWORK_TIMEOUT]: ErrorSeverity.MEDIUM,
  [UnifiedErrorCode.NETWORK_CONNECTION_REFUSED]: ErrorSeverity.HIGH,
  [UnifiedErrorCode.EXTERNAL_SERVICE_ERROR]: ErrorSeverity.MEDIUM,
  [UnifiedErrorCode.EXTERNAL_SERVICE_UNAVAILABLE]: ErrorSeverity.HIGH,
  [UnifiedErrorCode.EXTERNAL_SERVICE_TIMEOUT]: ErrorSeverity.MEDIUM,
  [UnifiedErrorCode.EXTERNAL_API_RATE_LIMITED]: ErrorSeverity.MEDIUM,
  
  // 系统错误 - 关键严重程度
  [UnifiedErrorCode.INTERNAL_SERVER_ERROR]: ErrorSeverity.CRITICAL,
  [UnifiedErrorCode.SERVICE_UNAVAILABLE]: ErrorSeverity.CRITICAL,
  [UnifiedErrorCode.SYSTEM_OVERLOADED]: ErrorSeverity.CRITICAL,
  [UnifiedErrorCode.SYSTEM_MAINTENANCE]: ErrorSeverity.MEDIUM,
  [UnifiedErrorCode.MEMORY_LIMIT_EXCEEDED]: ErrorSeverity.CRITICAL,
  [UnifiedErrorCode.DISK_SPACE_FULL]: ErrorSeverity.CRITICAL,
  
  // 限流和配额错误 - 中等严重程度
  [UnifiedErrorCode.RATE_LIMIT_ERROR]: ErrorSeverity.MEDIUM,
  [UnifiedErrorCode.RATE_LIMIT_EXCEEDED]: ErrorSeverity.MEDIUM,
  [UnifiedErrorCode.QUOTA_EXCEEDED]: ErrorSeverity.HIGH,
  [UnifiedErrorCode.CONCURRENT_LIMIT_EXCEEDED]: ErrorSeverity.HIGH,
  
  // 超时错误 - 中等严重程度
  [UnifiedErrorCode.TIMEOUT_ERROR]: ErrorSeverity.MEDIUM,
  [UnifiedErrorCode.REQUEST_TIMEOUT]: ErrorSeverity.MEDIUM,
  [UnifiedErrorCode.OPERATION_TIMEOUT]: ErrorSeverity.MEDIUM,
  
  // 业务逻辑错误 - 中等严重程度
  [UnifiedErrorCode.BUSINESS_LOGIC_ERROR]: ErrorSeverity.MEDIUM,
  [UnifiedErrorCode.BUSINESS_RULE_VIOLATION]: ErrorSeverity.MEDIUM,
  [UnifiedErrorCode.WORKFLOW_ERROR]: ErrorSeverity.MEDIUM,
  [UnifiedErrorCode.STATE_TRANSITION_ERROR]: ErrorSeverity.MEDIUM,
  
  // 文件和存储错误 - 低到中等严重程度
  [UnifiedErrorCode.FILE_NOT_FOUND]: ErrorSeverity.LOW,
  [UnifiedErrorCode.FILE_ACCESS_DENIED]: ErrorSeverity.MEDIUM,
  [UnifiedErrorCode.FILE_SIZE_TOO_LARGE]: ErrorSeverity.LOW,
  [UnifiedErrorCode.FILE_TYPE_NOT_SUPPORTED]: ErrorSeverity.LOW,
  [UnifiedErrorCode.STORAGE_QUOTA_EXCEEDED]: ErrorSeverity.HIGH,
  [UnifiedErrorCode.STORAGE_ERROR]: ErrorSeverity.HIGH,
  
  // 通用错误
  [UnifiedErrorCode.UNKNOWN_ERROR]: ErrorSeverity.HIGH,
  [UnifiedErrorCode.NOT_IMPLEMENTED]: ErrorSeverity.LOW,
  [UnifiedErrorCode.DEPRECATED_API]: ErrorSeverity.LOW
};

/**
 * 获取错误代码对应的HTTP状态码
 */
export function getHttpStatusForErrorCode(errorCode: UnifiedErrorCode): number {
  return ERROR_CODE_TO_HTTP_STATUS[errorCode] || 500;
}

/**
 * 获取错误代码对应的用户友好消息
 */
export function getMessageForErrorCode(errorCode: UnifiedErrorCode): string {
  return ERROR_CODE_MESSAGES[errorCode] || '未知错误';
}

/**
 * 获取错误代码对应的严重程度
 */
export function getSeverityForErrorCode(errorCode: UnifiedErrorCode): ErrorSeverity {
  return ERROR_CODE_SEVERITY[errorCode] || ErrorSeverity.MEDIUM;
}

/**
 * 判断错误是否可重试
 */
export function isRetryableError(errorCode: UnifiedErrorCode): boolean {
  const retryableErrors = [
    UnifiedErrorCode.NETWORK_TIMEOUT,
    UnifiedErrorCode.EXTERNAL_SERVICE_TIMEOUT,
    UnifiedErrorCode.DATABASE_TIMEOUT,
    UnifiedErrorCode.TIMEOUT_ERROR,
    UnifiedErrorCode.REQUEST_TIMEOUT,
    UnifiedErrorCode.OPERATION_TIMEOUT,
    UnifiedErrorCode.SYSTEM_OVERLOADED,
    UnifiedErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
    UnifiedErrorCode.SERVICE_UNAVAILABLE
  ];
  
  return retryableErrors.includes(errorCode);
}

/**
 * 判断错误是否需要立即告警
 */
export function shouldAlertError(errorCode: UnifiedErrorCode): boolean {
  const severity = getSeverityForErrorCode(errorCode);
  return severity === ErrorSeverity.HIGH || severity === ErrorSeverity.CRITICAL;
}

// 向后兼容的错误代码别名
export const ErrorCode = UnifiedErrorCode;
export type ErrorCode = UnifiedErrorCode;