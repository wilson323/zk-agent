/**
 * 认证工具函数
 * 统一的认证相关工具方法
 */

import * as jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import type { NextRequest } from 'next/server'

// 环境变量
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

// 用户类型定义
export interface User {
  id: string
  email: string
  role: 'user' | 'admin'
  name?: string
}

export interface JWTPayload {
  userId: string
  email: string
  role: string
  iat?: number
  exp?: number
}

/**
 * 生成JWT令牌
 */
export function generateToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role
  }
  
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  })
}

/**
 * 验证JWT令牌
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    return decoded
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

/**
 * 认证请求（兼容旧代码）
 */
export async function authenticateRequest(request: NextRequest): Promise<User | null> {
  const token = extractTokenFromRequest(request)
  if (!token) {return null}
  
  const payload = verifyToken(token)
  if (!payload) {return null}
  
  return {
    id: payload.userId,
    email: payload.email,
    role: payload.role as 'user' | 'admin'
  }
}

/**
 * 从请求中提取令牌
 */
export function extractTokenFromRequest(request: NextRequest): string | null {
  // 从Authorization header提取
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  
  // 从cookie提取
  const tokenCookie = request.cookies.get('auth_token')
  if (tokenCookie) {
    return tokenCookie.value
  }
  
  return null
}

/**
 * 验证用户权限
 */
export function checkUserPermission(user: User, requiredRole: 'user' | 'admin'): boolean {
  if (requiredRole === 'admin') {
    return user.role === 'admin'
  }
  return true // 所有用户都有基础权限
}

/**
 * 哈希密码
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

/**
 * 验证密码
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

/**
 * 生成安全的随机字符串
 */
export function generateSecureRandom(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length]
  }
  
  return result
}

/**
 * 验证邮箱格式
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// 密码验证函数已移至 ./password.ts，请从那里导入
export { validatePassword as validatePasswordStrength } from './password';

/**
 * 生成刷新令牌
 */
export function generateRefreshToken(): string {
  return generateSecureRandom(64)
}

/**
 * 检查令牌是否即将过期
 */
export function isTokenExpiringSoon(token: string, bufferMinutes: number = 15): boolean {
  try {
    const decoded = jwt.decode(token) as JWTPayload
    if (!decoded.exp) {return false}
    
    const expirationTime = decoded.exp * 1000 // 转换为毫秒
    const bufferTime = bufferMinutes * 60 * 1000 // 缓冲时间（毫秒）
    const currentTime = Date.now()
    
    return (expirationTime - currentTime) <= bufferTime
  } catch {
    return true // 如果解析失败，认为需要刷新
  }
}