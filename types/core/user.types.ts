// @ts-nocheck
/**
 * @file User Types
 * @description 用户相关的类型定义
 * @author ZK-Agent Team A
 * @date 2024-12-19
 */

// 用户角色枚举
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  PREMIUM = 'premium',
  SUPER_ADMIN = 'super_admin'
}

// 用户状态枚举
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  DELETED = 'deleted'
}

// 基础用户信息
export interface BaseUser {
  id: string
  username: string
  email: string
  avatar?: string
  role: UserRole
  status: UserStatus
  createdAt: Date
  updatedAt: Date
  lastLoginAt?: Date
  isActive: boolean
}

// 用户资料信息
export interface UserProfile {
  firstName: string
  lastName: string
  bio?: string
  company?: string
  location?: string
  website?: string
  phone?: string
  dateOfBirth?: Date
}

// 用户偏好设置
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto'
  language: string
  timezone?: string
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
    marketing: boolean
  }
  privacy: {
    profileVisibility: 'public' | 'private' | 'friends'
    showEmail: boolean
    showPhone: boolean
  }
}

// 用户订阅信息
export interface UserSubscription {
  plan: 'free' | 'pro' | 'enterprise'
  status: 'active' | 'inactive' | 'expired' | 'cancelled'
  startDate: Date
  expiresAt?: Date
  autoRenew: boolean
  features: string[]
}

// 用户使用统计
export interface UserUsage {
  chatMessages: number
  cadAnalyses: number
  posterGenerations: number
  storageUsed: number // bytes
  apiCalls: number
  lastActivityAt: Date
}

// 用户限制
export interface UserLimits {
  chatMessages: number
  cadAnalyses: number
  posterGenerations: number
  storageLimit: number // bytes
  apiCallsPerDay: number
  concurrentSessions: number
}

// 完整用户信息
export interface User extends BaseUser {
  profile: UserProfile
  preferences: UserPreferences
  subscription: UserSubscription
  usage: UserUsage
  limits: UserLimits
}

// 用户创建请求
export interface CreateUserRequest {
  username: string
  email: string
  password: string
  profile: Partial<UserProfile>
  role?: UserRole
}

// 用户更新请求
export interface UpdateUserRequest {
  username?: string
  email?: string
  profile?: Partial<UserProfile>
  preferences?: Partial<UserPreferences>
  role?: UserRole
  status?: UserStatus
}

// 用户登录请求
export interface LoginRequest {
  email: string
  password: string
  rememberMe?: boolean
}

// 用户注册请求
export interface RegisterRequest {
  username: string
  email: string
  password: string
  confirmPassword: string
  profile: {
    firstName: string
    lastName: string
  }
  inviteCode?: string
  acceptTerms: boolean
}

// 密码重置请求
export interface PasswordResetRequest {
  email: string
}

// 密码更新请求
export interface PasswordUpdateRequest {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

// 用户会话信息
export interface UserSession {
  id: string
  userId: string
  deviceId?: string
  userAgent?: string
  ipAddress?: string
  location?: string
  createdAt: Date
  expiresAt: Date
  isActive: boolean
}

// 用户活动日志
export interface UserActivity {
  id: string
  userId: string
  action: string
  resource?: string
  resourceId?: string
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  timestamp: Date
}

// 用户搜索参数
export interface UserSearchParams {
  query?: string
  role?: UserRole
  status?: UserStatus
  createdAfter?: Date
  createdBefore?: Date
  lastLoginAfter?: Date
  lastLoginBefore?: Date
}

// 用户统计信息
export interface UserStats {
  totalUsers: number
  activeUsers: number
  newUsersToday: number
  newUsersThisWeek: number
  newUsersThisMonth: number
  usersByRole: Record<UserRole, number>
  usersByStatus: Record<UserStatus, number>
} 