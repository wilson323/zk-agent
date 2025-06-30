/**
 * @file 认证服务接口定义
 * @description 定义认证服务的标准接口，确保类型安全和一致性
 * @author ZK-Agent Team
 * @date 2025-06-29
 */

import { z } from 'zod';

// Zod validation schema for login
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Zod validation schema for registration
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  avatar: z.string().optional(),
});

// Zod validation schema for password change
export const changePasswordSchema = z.object({
  oldPassword: z.string(),
  newPassword: z.string().min(8),
});

export interface IAuthService {
  login(data: z.infer<typeof loginSchema>): Promise<{
    user: {
      id: string;
      email: string;
      name: string | null;
      avatar: string | null;
      role: string;
    };
    tokens: { accessToken: string; refreshToken: string };
  }>;
  register(data: z.infer<typeof registerSchema>): Promise<{
    user: {
      id: string;
      email: string;
      name: string | null;
      avatar: string | null;
      role: string;
    };
    tokens: { accessToken: string; refreshToken: string };
  }>;
  refreshToken(token: string): Promise<{ accessToken: string; refreshToken: string }>;
  changePassword(userId: string, data: z.infer<typeof changePasswordSchema>): Promise<void>;
}
