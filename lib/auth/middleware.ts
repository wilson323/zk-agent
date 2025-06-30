// @ts-nocheck
/**
 * @file Authentication Middleware
 * @description 认证中间件，用于验证用户身份和权限
 * @author ZK-Agent Team A
 * @date 2024-12-19
 */

import { NextRequest, NextResponse } from 'next/server'
import { verify } from 'jsonwebtoken'
import { UserRole } from '../types/enums'

// 认证结果接口
export interface AuthResult {
  success: boolean
  user?: {
    id: string
    email: string
    role: UserRole
    username: string
  }
  error?: string
}

// JWT载荷接口
interface JWTPayload {
  userId: string
  email: string
  role: UserRole
  username: string
  iat: number
  exp: number
}

/**
 * 验证用户认证状态
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  try {
    // 从请求头获取token
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      // 尝试从cookie获取token
      const cookieToken = request.cookies.get('auth-token')?.value
      if (!cookieToken) {
        return {
          success: false,
          error: 'No authentication token provided'
        }
      }
    }

    const finalToken = token || request.cookies.get('auth-token')?.value

    if (!finalToken) {
      return {
        success: false,
        error: 'Authentication token not found'
      }
    }

    // 验证JWT token
    const jwtSecret = process.env.JWT_SECRET || 'default-secret-key'
    
    try {
      const decoded = verify(finalToken, jwtSecret) as JWTPayload
      
      return {
        success: true,
        user: {
          id: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          username: decoded.username
        }
      }
    } catch (jwtError) {
      // JWT验证失败，尝试从本地存储验证（开发环境）
      if (process.env.NODE_ENV === 'development') {
        return verifyLocalAuth(request)
      }
      
      return {
        success: false,
        error: 'Invalid or expired token'
      }
    }
  } catch (error) {
    console.error('Auth verification error:', error)
    return {
      success: false,
      error: 'Authentication verification failed'
    }
  }
}

/**
 * 本地认证验证（开发环境）
 */
function verifyLocalAuth(request: NextRequest): AuthResult {
  try {
    // 在开发环境中，可以从请求头获取用户信息
    const userHeader = request.headers.get('x-user-info')
    
    if (userHeader) {
      const userInfo = JSON.parse(userHeader)
      return {
        success: true,
        user: {
          id: userInfo.id || 'dev-user',
          email: userInfo.email || 'dev@example.com',
          role: userInfo.role || UserRole.USER,
          username: userInfo.username || 'Developer'
        }
      }
    }

    // 默认开发用户
    return {
      success: true,
      user: {
        id: 'dev-user-001',
        email: 'developer@zk-agent.com',
        role: UserRole.ADMIN,
        username: 'Developer'
      }
    }
  } catch (error) {
    return {
      success: false,
      error: 'Local auth verification failed'
    }
  }
}

/**
 * 验证管理员权限
 */
export async function verifyAdminAuth(request: NextRequest): Promise<AuthResult> {
  const authResult = await verifyAuth(request)
  
  if (!authResult.success) {
    return authResult
  }

  const user = authResult.user!
  const adminRoles = [UserRole.ADMIN, UserRole.SUPER_ADMIN]
  
  if (!adminRoles.includes(user.role)) {
    return {
      success: false,
      error: 'Insufficient permissions - admin access required'
    }
  }

  return authResult
}

/**
 * 验证超级管理员权限
 */
export async function verifySuperAdminAuth(request: NextRequest): Promise<AuthResult> {
  const authResult = await verifyAuth(request)
  
  if (!authResult.success) {
    return authResult
  }

  const user = authResult.user!
  
  if (user.role !== UserRole.SUPER_ADMIN) {
    return {
      success: false,
      error: 'Insufficient permissions - super admin access required'
    }
  }

  return authResult
}

/**
 * 创建认证中间件
 */
export function createAuthMiddleware(options: {
  requireAuth?: boolean
  requireAdmin?: boolean
  requireSuperAdmin?: boolean
} = {}) {
  return async (request: NextRequest) => {
    const { requireAuth = true, requireAdmin = false, requireSuperAdmin = false } = options

    if (!requireAuth) {
      return NextResponse.next()
    }

    let authResult: AuthResult

    if (requireSuperAdmin) {
      authResult = await verifySuperAdminAuth(request)
    } else if (requireAdmin) {
      authResult = await verifyAdminAuth(request)
    } else {
      authResult = await verifyAuth(request)
    }

    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      )
    }

    // 将用户信息添加到请求头中，供后续处理使用
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', authResult.user!.id)
    requestHeaders.set('x-user-email', authResult.user!.email)
    requestHeaders.set('x-user-role', authResult.user!.role)
    requestHeaders.set('x-user-username', authResult.user!.username)

    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    })
  }
}

/**
 * 从请求中获取用户信息
 */
export function getUserFromRequest(request: NextRequest) {
  return {
    id: request.headers.get('x-user-id'),
    email: request.headers.get('x-user-email'),
    role: request.headers.get('x-user-role') as UserRole,
    username: request.headers.get('x-user-username')
  }
}

/**
 * 获取当前用户信息（兼容旧版本API）
 */
export function getCurrentUser(request: NextRequest): {
  userId: string
  email: string
  role: string
} | null {
  const userId = request.headers.get('x-user-id')
  const email = request.headers.get('x-user-email')
  const role = request.headers.get('x-user-role')

  if (!userId || !email || !role) {
    return null
  }

  return { userId, email, role }
}

/**
 * 生成JWT token
 */
export function generateToken(user: {
  id: string
  email: string
  role: UserRole
  username: string
}): string {
  const jwtSecret = process.env.JWT_SECRET || 'default-secret-key'
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    userId: user.id,
    email: user.email,
    role: user.role,
    username: user.username
  }

  return require('jsonwebtoken').sign(payload, jwtSecret, {
    expiresIn: '7d' // 7天过期
  })
}

// 导出类型
export type { AuthResult, JWTPayload }
