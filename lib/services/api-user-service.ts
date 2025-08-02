/**
 * @file lib/services/api-user-service.ts
 * @description 基于API的用户服务，演示增强版API客户端的使用
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { enhancedApiClient } from '@/lib/api/enhanced-api-client';
import { injectable } from '@/lib/di/container';
import { z } from 'zod';

// 用户接口
export interface ApiUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'INACTIVE' | 'DELETED';
  createdAt: string;
  updatedAt: string;
}

// 用户创建验证模式
const apiCreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  avatar: z.string().optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
});

// 用户更新验证模式
const apiUpdateUserSchema = z.object({
  name: z.string().optional(),
  avatar: z.string().optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DELETED']).optional(),
});

// 用户服务接口
export interface IApiUserService {
  getUsers(options: { page: number; limit: number }): Promise<{
    users: ApiUser[];
    pagination: { total: number; page: number; limit: number };
  }>;
  createUser(data: z.infer<typeof apiCreateUserSchema>): Promise<ApiUser>;
  getUserById(id: string): Promise<ApiUser | null>;
  updateUser(id: string, data: z.infer<typeof apiUpdateUserSchema>): Promise<ApiUser>;
  deleteUser(id: string): Promise<boolean>;
}

/**
 * 基于API的用户服务
 * 使用增强版API客户端进行HTTP请求
 */
@injectable(ApiUserService)
export class ApiUserService implements IApiUserService {
  private readonly baseUrl = '/api/users';

  /**
   * 获取用户列表
   *
   * @param options 分页选项
   * @returns 用户列表和分页信息
   */
  async getUsers({ page = 1, limit = 10 }: { page: number; limit: number }) {
    const response = await enhancedApiClient.get<{
      users: ApiUser[];
      pagination: { total: number; page: number; limit: number };
    }>(this.baseUrl, {
      params: { page, limit },
    });

    if (!response.success) {
      throw new Error(response.error?.message || '获取用户列表失败');
    }

    return response.data;
  }

  /**
   * 创建用户
   *
   * @param data 用户数据
   * @returns 创建的用户
   */
  async createUser(data: z.infer<typeof apiCreateUserSchema>): Promise<ApiUser> {
    const response = await enhancedApiClient.post<ApiUser>(this.baseUrl, data);

    if (!response.success) {
      throw new Error(response.error?.message || '创建用户失败');
    }

    return response.data;
  }

  /**
   * 获取用户详情
   *
   * @param id 用户ID
   * @returns 用户详情
   */
  async getUserById(id: string): Promise<ApiUser | null> {
    const response = await enhancedApiClient.get<ApiUser>(`${this.baseUrl}/${id}`);

    if (!response.success) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(response.error?.message || '获取用户详情失败');
    }

    return response.data;
  }

  /**
   * 更新用户
   *
   * @param id 用户ID
   * @param data 更新数据
   * @returns 更新后的用户
   */
  async updateUser(id: string, data: z.infer<typeof apiUpdateUserSchema>): Promise<ApiUser> {
    const response = await enhancedApiClient.put<ApiUser>(`${this.baseUrl}/${id}`, data);

    if (!response.success) {
      throw new Error(response.error?.message || '更新用户失败');
    }

    return response.data;
  }

  /**
   * 删除用户
   *
   * @param id 用户ID
   * @returns 是否成功
   */
  async deleteUser(id: string): Promise<boolean> {
    const response = await enhancedApiClient.delete(`${this.baseUrl}/${id}`);

    return response.success;
  }

  /**
   * 检查API健康状态
   *
   * @returns 健康状态
   */
  async checkHealth() {
    const response = await enhancedApiClient.get('/api/health');

    return {
      status: response.success ? 'UP' : 'DOWN',
      timestamp: new Date(),
      details: { api: response.success ? 'Connected' : 'Disconnected' },
      error: response.error?.message,
    };
  }
}

// 导出服务实例
export const apiUserService = new ApiUserService();
