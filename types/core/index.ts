/**
 * @file types/core/index.ts
 * @description 核心类型定义，包含API响应、通用接口等全局类型
 * @author zk-agent开发团队
 * @lastUpdate 2024-12-19
 * @updateLog
 *   - 2024-12-19 初始创建核心类型系统
 */

import { ERROR_CODES } from '../../config/constants';

// 导入核心接口定义
import { ApiResponse, PaginationParams } from './core-interfaces';

// 搜索参数
export interface SearchParams {
  query?: string;
  filters?: Record<string, unknown>;
}

// 文件上传相关
export interface FileUpload {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
  uploadedAt: string;
}

// 通用实体基类
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// 用户角色枚举 - 使用与user.types.ts一致的值
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  PREMIUM = 'premium',
  SUPER_ADMIN = 'super_admin'
}

// 用户状态枚举 - 使用与user.types.ts一致的值
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

// 错误代码枚举
export enum ErrorCode {
  // 验证错误
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  
  // 认证和授权错误
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  
  // 资源错误
  NOT_FOUND = 'NOT_FOUND',
  
  // 服务器错误
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  
  // 限流错误
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // 超时错误
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  
  // 外部服务错误
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  
  // 服务不可用
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}

// 导出所有类型
export * from './api.types';
export * from './user.types';
export * from './error.types';