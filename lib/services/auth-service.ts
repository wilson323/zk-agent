/**
 * @file lib/services/auth-service.ts
 * @description Authentication service for handling user authentication and authorization.
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { z } from 'zod';
import { enhancedDb, dbTransaction } from '@/lib/database';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { generateToken, verifyToken } from '@/lib/auth/jwt';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { ErrorCode } from '@/types/core';
import { IAuthService, loginSchema, registerSchema, changePasswordSchema } from '../interfaces/auth-manager.interface';
import { injectable } from '../di/container';

@injectable()
export class AuthService implements IAuthService {
  async login(data: z.infer<typeof loginSchema>) {
    const { email, password } = data;

    const user = await enhancedDb.prisma.user.findUnique({
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

    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password.');
    }

    if (user.status !== 'ACTIVE') {
      throw new Error('Account is not active.');
    }

    // Update login stats
    await enhancedDb.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        loginCount: { increment: 1 },
      },
    });

    const { accessToken, refreshToken } = await generateToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
      },
      tokens: { accessToken, refreshToken },
    }
  }

  async register(data: z.infer<typeof registerSchema>) {
    const { email, password, name, avatar } = data;

    return dbTransaction(async (prisma) => {
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        throw new Error('User with this email already exists.');
      }

      const hashedPassword = await hashPassword(password);

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

      const { accessToken, refreshToken } = await generateToken(newUser);

      return {
        user: newUser,
        tokens: { accessToken, refreshToken },
      };
    });
  }

  async refreshToken(token: string) {
    const payload = await verifyToken(token, 'refresh');
    if (!payload) {
      throw new Error('Invalid refresh token.');
    }

    const user = await enhancedDb.prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        status: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new Error('User not found or inactive.');
    }

    const { accessToken, refreshToken: newRefreshToken } = await generateToken(user);

    return { accessToken, refreshToken: newRefreshToken };
  }

  async changePassword(userId: string, data: z.infer<typeof changePasswordSchema>) {
    const { oldPassword, newPassword } = data;

    return dbTransaction(async (prisma) => {
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

      const isValidPassword = await verifyPassword(oldPassword, user.password);
      if (!isValidPassword) {
        throw new Error('Invalid current password.');
      }

      const hashedPassword = await hashPassword(newPassword);

      await prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
          updatedAt: new Date(),
        },
      });
    });
  }

  async checkHealth(): Promise<HealthCheckResult> {
    try {
      await enhancedDb.prisma.$queryRaw`SELECT 1`;
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
}

// Export service instance
const authService = new AuthService();

// Export individual methods for backward compatibility
export const login = authService.login.bind(authService);
export const register = authService.register.bind(authService);
export const changePassword = authService.changePassword.bind(authService);
export const refreshToken = authService.refreshToken.bind(authService);
export const checkHealth = authService.checkHealth.bind(authService);

// Export the service instance
export { authService };
export default authService;