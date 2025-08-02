/**
 * @file enhanced-jwt-security.ts
 * @description 增强版JWT安全实现，包含令牌轮换机制
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import * as jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();
import { User } from '@prisma/client';

// JWT配置
export const JWT_SECURE_CONFIG = {
  accessTokenSecret: process.env.JWT_ACCESS_SECRET || randomBytes(32).toString('hex'),
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET || randomBytes(64).toString('hex'),
  accessTokenExpiry: '15m', // 访问令牌15分钟过期
  refreshTokenExpiry: '7d', // 刷新令牌7天过期
  issuer: 'zk-agent-system',
  audience: 'zk-agent-client',
  tokenType: 'Bearer',
  jwtid: () => randomBytes(16).toString('hex'), // 为每个令牌生成唯一ID
};

// 令牌负载接口
export interface SecureTokenPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin' | 'superadmin';
  permissions?: string[];
  sessionId?: string; // 用于跟踪会话并实现令牌撤销
}

// 令牌对接口
export interface SecureTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // 过期时间（毫秒）
  tokenType: 'Bearer';
}

/**
 * 生成安全的访问令牌
 */
export function generateSecureAccessToken(payload: SecureTokenPayload): string {
  return jwt.sign(
    {
      ...payload,
      type: 'access',
    },
    JWT_SECURE_CONFIG.accessTokenSecret,
    {
      expiresIn: JWT_SECURE_CONFIG.accessTokenExpiry,
      issuer: JWT_SECURE_CONFIG.issuer,
      audience: JWT_SECURE_CONFIG.audience,
      jwtid: JWT_SECURE_CONFIG.jwtid(),
    } as jwt.SignOptions
  );
}

/**
 * 生成安全的刷新令牌
 */
export function generateSecureRefreshToken(payload: SecureTokenPayload): string {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      sessionId: payload.sessionId,
      type: 'refresh',
    },
    JWT_SECURE_CONFIG.refreshTokenSecret,
    {
      expiresIn: JWT_SECURE_CONFIG.refreshTokenExpiry,
      issuer: JWT_SECURE_CONFIG.issuer,
      audience: JWT_SECURE_CONFIG.audience,
      jwtid: JWT_SECURE_CONFIG.jwtid(),
    } as jwt.SignOptions
  );
}

/**
 * 创建安全的令牌对
 */
export function createSecureTokenPair(
  user: Pick<User, 'id' | 'email'> & { role?: string; sessionId?: string }
): SecureTokenPair {
  // 生成会话ID（如果未提供）
  const sessionId = user.sessionId || randomBytes(16).toString('hex');

  const payload: SecureTokenPayload = {
    userId: user.id,
    email: user.email,
    role: (user.role as 'user' | 'admin' | 'superadmin') || 'user',
    sessionId,
  };

  const accessToken = generateSecureAccessToken(payload);
  const refreshToken = generateSecureRefreshToken(payload);

  // 计算过期时间（15分钟）
  const expiresIn = 15 * 60 * 1000;

  return {
    accessToken,
    refreshToken,
    expiresIn,
    tokenType: 'Bearer',
  };
}

/**
 * 验证安全的访问令牌
 */
export function verifySecureAccessToken(token: string): SecureTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECURE_CONFIG.accessTokenSecret, {
      issuer: JWT_SECURE_CONFIG.issuer,
      audience: JWT_SECURE_CONFIG.audience,
    }) as any;

    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions,
      sessionId: decoded.sessionId,
    };
  } catch (error) {
    logger.error('访问令牌验证失败:', error);
    return null;
  }
}

/**
 * 验证安全的刷新令牌
 */
export function verifySecureRefreshToken(
  token: string
): Pick<SecureTokenPayload, 'userId' | 'email' | 'sessionId'> | null {
  try {
    const decoded = jwt.verify(token, JWT_SECURE_CONFIG.refreshTokenSecret, {
      issuer: JWT_SECURE_CONFIG.issuer,
      audience: JWT_SECURE_CONFIG.audience,
    }) as any;

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return {
      userId: decoded.userId,
      email: decoded.email,
      sessionId: decoded.sessionId,
    };
  } catch (error) {
    logger.error('刷新令牌验证失败:', error);
    return null;
  }
}

/**
 * 从请求头中提取Bearer令牌
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * 检查令牌是否即将过期
 */
export function isSecureTokenExpiringSoon(token: string, bufferMinutes: number = 5): boolean {
  try {
    const decoded = jwt.decode(token) as any;
    if (!decoded || !decoded.exp) {
      return true;
    }

    const expirationTime = decoded.exp * 1000; // 转换为毫秒
    const currentTime = Date.now();
    const bufferTime = bufferMinutes * 60 * 1000; // 缓冲时间（毫秒）

    return expirationTime - currentTime < bufferTime;
  } catch (error) {
    return true;
  }
}

/**
 * 刷新令牌对
 * @param refreshToken 刷新令牌
 * @returns 新的令牌对或null（如果刷新令牌无效）
 */
export async function refreshSecureTokenPair(
  refreshToken: string
): Promise<SecureTokenPair | null> {
  const payload = verifySecureRefreshToken(refreshToken);
  if (!payload) {
    return null;
  }

  // 这里可以添加令牌撤销检查逻辑
  // 例如，检查Redis中是否存在会话ID的黑名单记录

  // 创建新的令牌对
  return createSecureTokenPair({
    id: payload.userId,
    email: payload.email,
    sessionId: payload.sessionId, // 保持相同的会话ID
  });
}

/**
 * 撤销令牌（需要与Redis或数据库集成）
 * 这是一个示例实现，实际使用时需要与缓存系统集成
 */
export async function revokeTokens(sessionId: string): Promise<boolean> {
  try {
    // 示例：将会话ID添加到黑名单
    // await redis.set(`revoked:${sessionId}`, '1', 'EX', 7 * 24 * 60 * 60); // 7天过期

    // 实际实现时，应该将此会话ID添加到Redis黑名单中
    console.log(`已撤销会话ID: ${sessionId}的所有令牌`);
    return true;
  } catch (error) {
    logger.error('令牌撤销失败:', error);
    return false;
  }
}

/**
 * 检查令牌是否已被撤销（需要与Redis或数据库集成）
 * 这是一个示例实现，实际使用时需要与缓存系统集成
 */
export async function isTokenRevoked(sessionId: string): Promise<boolean> {
  try {
    // 示例：检查会话ID是否在黑名单中
    // const result = await redis.get(`revoked:${sessionId}`);
    // return !!result;

    // 实际实现时，应该检查Redis黑名单
    return false;
  } catch (error) {
    logger.error('令牌撤销检查失败:', error);
    return false;
  }
}
