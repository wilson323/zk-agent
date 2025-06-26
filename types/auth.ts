// @ts-nocheck
/**
 * 认证相关类型定义
 */

export interface User {
  id: string
  email: string
  name?: string
  avatar?: string
  role: "user" | "admin"
  createdAt: Date
  updatedAt: Date
}

export interface LoginRequest {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterRequest {
  email: string
  password: string
  name?: string
  inviteCode?: string
}

export interface LoginResponse {
  success: boolean
  user?: User
  tokens?: {
    accessToken: string
    refreshToken: string
    expiresIn: number
  }
  error?: string
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface ResetPasswordRequest {
  email: string
}

export interface ResetPasswordConfirmRequest {
  token: string
  newPassword: string
}

export interface UserProfile {
  id: string
  email: string
  name?: string
  avatar?: string
  role: string
  createdAt: Date
  updatedAt: Date
  lastLoginAt?: Date
  loginCount: number
}

export interface AuthSession {
  user: User
  expiresAt: Date
  isValid: boolean
}

export interface AuthError {
  code: string
  message: string
  details?: any
}

// 认证状态枚举
export enum AuthStatus {
  LOADING = "loading",
  AUTHENTICATED = "authenticated",
  UNAUTHENTICATED = "unauthenticated",
  ERROR = "error",
}

// 权限相关类型
export interface Permission {
  id: string
  name: string
  description: string
  resource: string
  action: string
}

export interface Role {
  id: string
  name: string
  description: string
  permissions: Permission[]
  isDefault: boolean
}
