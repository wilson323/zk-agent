// @ts-nocheck
/**
 * JWT Token管理
 * 包含token生成、验证、刷新等功能
 */

import jwt from "jsonwebtoken"
import type { User } from "@prisma/client"

// JWT配置
const JWT_CONFIG = {
  accessTokenSecret: process.env.JWT_ACCESS_SECRET || "ai-chat-access-secret-key",
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET || "ai-chat-refresh-secret-key",
  accessTokenExpiry: "15m", // 访问令牌15分钟过期
  refreshTokenExpiry: "7d", // 刷新令牌7天过期
  issuer: "ai-chat-platform",
  audience: "ai-chat-users",
}

// Token载荷接口
export interface TokenPayload {
  userId: string
  email: string
  role: "user" | "admin"
  permissions?: string[]
}

// Token对接口
export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

/**
 * 生成访问令牌
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(
    {
      ...payload,
      type: "access",
    },
    JWT_CONFIG.accessTokenSecret,
    {
      expiresIn: JWT_CONFIG.accessTokenExpiry,
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
    },
  )
}

/**
 * 生成刷新令牌
 */
export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      type: "refresh",
    },
    JWT_CONFIG.refreshTokenSecret,
    {
      expiresIn: JWT_CONFIG.refreshTokenExpiry,
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
    },
  )
}

/**
 * 生成令牌对
 */
export function generateTokenPair(user: Pick<User, "id" | "email"> & { role?: string }): TokenPair {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: (user.role as "user" | "admin") || "user",
  }

  const accessToken = generateAccessToken(payload)
  const refreshToken = generateRefreshToken(payload)

  // 计算过期时间（15分钟）
  const expiresIn = 15 * 60 * 1000

  return {
    accessToken,
    refreshToken,
    expiresIn,
  }
}

/**
 * 验证访问令牌
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_CONFIG.accessTokenSecret, {
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
    }) as any

    if (decoded.type !== "access") {
      throw new Error("Invalid token type")
    }

    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions,
    }
  } catch (error) {
    console.error("访问令牌验证失败:", error)
    return null
  }
}

/**
 * 验证刷新令牌
 */
export function verifyRefreshToken(token: string): Pick<TokenPayload, "userId" | "email"> | null {
  try {
    const decoded = jwt.verify(token, JWT_CONFIG.refreshTokenSecret, {
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
    }) as any

    if (decoded.type !== "refresh") {
      throw new Error("Invalid token type")
    }

    return {
      userId: decoded.userId,
      email: decoded.email,
    }
  } catch (error) {
    console.error("刷新令牌验证失败:", error)
    return null
  }
}

/**
 * 从请求头中提取Bearer token
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null
  }
  return authHeader.substring(7)
}

/**
 * 检查令牌是否即将过期（5分钟内）
 */
export function isTokenExpiringSoon(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as any
    if (!decoded || !decoded.exp) {
      return true
    }

    const expirationTime = decoded.exp * 1000
    const currentTime = Date.now()
    const fiveMinutes = 5 * 60 * 1000

    return expirationTime - currentTime < fiveMinutes
  } catch (error) {
    return true
  }
}
