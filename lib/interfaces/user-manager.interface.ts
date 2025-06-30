/**
 * @file 用户服务接口定义
 * @description 定义用户服务的标准接口，确保类型安全和一致性
 * @author ZK-Agent Team
 * @date 2025-06-29
 */

import { z } from 'zod';

// Zod a validation schema for creating a user
export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  avatar: z.string().optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
});

// Zod a validation schema for updating a user
export const updateUserSchema = z.object({
  name: z.string().optional(),
  avatar: z.string().optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DELETED']).optional(),
});

export interface IUserService {
  getUsers(options: { where: object; skip: number; limit: number }): Promise<{
    users: any[];
    pagination: { total: number; page: number; limit: number };
  }>;
  createUser(data: z.infer<typeof createUserSchema>): Promise<any>;
  getUserById(id: string): Promise<any>;
  updateUser(id: string, data: z.infer<typeof updateUserSchema>): Promise<any>;
  deleteUser(id: string): Promise<void>;
}
