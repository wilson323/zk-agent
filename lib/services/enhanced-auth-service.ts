/**
 * @file enhanced-auth-service.ts
 * @description 增强版认证服务，使用增强的JWT安全实现
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { z } from 'zod';
import { enhancedDb, dbTransaction } from '@/lib/database';
import { hashPassword, verifyPassword } from '@/lib/auth/enhanced-password-security';
import {
  createSecureTokenPair,
  verifySecureAccessToken,
  verifySecureRefreshToken,
  refreshSecureTokenPair,
  revokeTokens,
  SecureTokenPair,
} from '@/lib/auth/enhanced-jwt-security';
import { ErrorCode } from '@/types/core';
import {
  IAuthService,
  loginSchema,
  registerSchema,
  changePasswordSchema,
} from '../interfaces/auth-manager.interface';
import { injectable } from '../di/container';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();

@injectable(EnhancedAuthService)
export class EnhancedAuthService implements IAuthService {
  /**
   * 用户登录
   */
  async login(data: z.infer<typeof loginSchema>) {
    const { email, password } = data;

    // 查找用户
    const prisma = enhancedDb.getClient();
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        avatar: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      throw new Error('Invalid email or password.');
    }

    // 验证密码
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      // 记录失败的登录尝试
      await this.recordFailedLoginAttempt(email);
      throw new Error('Invalid email or password.');
    }

    if (user.status !== 'ACTIVE') {
      throw new Error('Account is not active.');
    }

    // 更新登录统计
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        loginCount: { increment: 1 },
      },
    });

    // 生成安全的令牌对
    const tokens = createSecureTokenPair(user);

    // 记录刷新令牌（可选，用于令牌撤销）
    await this.storeRefreshToken(user.id, tokens);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
      },
      tokens,
    };
  }

  /**
   * 用户注册
   */
  async register(data: z.infer<typeof registerSchema>) {
    const { email, password, name, avatar } = data;

    return dbTransaction(async prisma => {
      // 检查用户是否已存在
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        throw new Error('User with this email already exists.');
      }

      // 哈希密码
      const hashedPassword = await hashPassword(password);

      // 创建新用户
      const newUser = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          name,
          avatar,
          role: 'USER',
          status: 'ACTIVE',
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          role: true,
        },
      });

      // 生成安全的令牌对
      const tokens = createSecureTokenPair(newUser);

      // 记录刷新令牌
      await this.storeRefreshToken(newUser.id, tokens);

      return {
        user: newUser,
        tokens,
      };
    });
  }

  /**
   * 刷新令牌
   */
  async refreshToken(token: string) {
    // 验证刷新令牌
    const newTokens = await refreshSecureTokenPair(token);
    if (!newTokens) {
      throw new Error('Invalid refresh token.');
    }

    // 获取令牌中的用户信息
    const payload = verifySecureRefreshToken(token);
    if (!payload) {
      throw new Error('Invalid refresh token payload.');
    }

    // 更新刷新令牌记录
    await this.updateRefreshToken(payload.userId, newTokens);

    return newTokens;
  }

  /**
   * 修改密码
   */
  async changePassword(userId: string, data: z.infer<typeof changePasswordSchema>) {
    const { oldPassword, newPassword } = data;

    return dbTransaction(async prisma => {
      // 查找用户
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          password: true,
        },
      });

      if (!user) {
        throw new Error('User not found.');
      }

      // 验证旧密码
      const isValidPassword = await verifyPassword(oldPassword, user.password);
      if (!isValidPassword) {
        throw new Error('Invalid current password.');
      }

      // 哈希新密码
      const hashedPassword = await hashPassword(newPassword);

      // 更新密码
      await prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
          updatedAt: new Date(),
        },
      });

      // 撤销所有现有令牌（可选）
      await this.revokeAllUserTokens(userId);
    });
  }

  /**
   * 登出用户
   */
  async logout(userId: string, sessionId?: string) {
    try {
      if (sessionId) {
        // 撤销特定会话
        await revokeTokens(sessionId);
      } else {
        // 撤销所有会话
        await this.revokeAllUserTokens(userId);
      }
      return true;
    } catch (error) {
      logger.error('Logout error:', error);
      return false;
    }
  }

  /**
   * 健康检查
   */
  async checkHealth(): Promise<HealthCheckResult> {
    try {
      const prisma = enhancedDb.getClient();
      await prisma.$queryRaw`SELECT 1`;
      return {
        status: 'UP',
        timestamp: new Date(),
        details: { database: 'Connected' },
      };
    } catch (error: any) {
      return {
        status: 'DOWN',
        timestamp: new Date(),
        details: { database: 'Disconnected' },
        error: error.message,
      };
    }
  }

  /**
   * 记录失败的登录尝试
   * 此方法可以与增强密码安全模块集成
   */
  private async recordFailedLoginAttempt(email: string) {
    try {
      // 这里可以集成增强密码安全模块的账户锁定功能
      // 例如：await EnhancedPasswordSecurity.recordLoginAttempt(email, false);

      // 记录失败尝试
      const prisma = enhancedDb.getClient();
      await prisma.loginAttempt.create({
        data: {
          email,
          success: false,
          ipAddress: '0.0.0.0', // 实际实现中应获取真实IP
          userAgent: 'Unknown', // 实际实现中应获取真实User-Agent
        },
      });
    } catch (error) {
      logger.error('Failed to record login attempt:', error);
    }
  }

  /**
   * 存储刷新令牌
   * 用于实现令牌撤销功能
   */
  private async storeRefreshToken(userId: string, tokens: SecureTokenPair) {
    try {
      // 在实际实现中，应该将刷新令牌的哈希值存储在数据库中
      // 这里仅作为示例
      const prisma = enhancedDb.getClient();
      await prisma.refreshToken.create({
        data: {
          token: tokens.refreshToken, // 实际应存储哈希值
          userId,
          expiresAt: new Date(Date.now() + tokens.expiresIn),
        },
      });
    } catch (error) {
      logger.error('Failed to store refresh token:', error);
    }
  }

  /**
   * 更新刷新令牌
   */
  private async updateRefreshToken(userId: string, tokens: SecureTokenPair) {
    try {
      // 在实际实现中，应该更新数据库中的刷新令牌记录
      // 这里仅作为示例
      const prisma = enhancedDb.getClient();
      await prisma.refreshToken.updateMany({
        where: { userId },
        data: {
          token: tokens.refreshToken, // 实际应存储哈希值
          expiresAt: new Date(Date.now() + tokens.expiresIn),
        },
      });
    } catch (error) {
      logger.error('Failed to update refresh token:', error);
    }
  }

  /**
   * 撤销用户的所有令牌
   */
  private async revokeAllUserTokens(userId: string) {
    try {
      // 在实际实现中，应该将用户的所有刷新令牌标记为已撤销
      // 这里仅作为示例
      const prisma = enhancedDb.getClient();
      await prisma.refreshToken.deleteMany({
        where: { userId },
      });
    } catch (error) {
      logger.error('Failed to revoke user tokens:', error);
    }
  }
}

// 导出服务实例
const enhancedAuthService = new EnhancedAuthService();

// 导出单独的方法（向后兼容）
export const secureLogin = enhancedAuthService.login.bind(enhancedAuthService);
export const secureRegister = enhancedAuthService.register.bind(enhancedAuthService);
export const secureChangePassword = enhancedAuthService.changePassword.bind(enhancedAuthService);
export const secureRefreshToken = enhancedAuthService.refreshToken.bind(enhancedAuthService);
export const secureLogout = enhancedAuthService.logout.bind(enhancedAuthService);
export const secureCheckHealth = enhancedAuthService.checkHealth.bind(enhancedAuthService);
