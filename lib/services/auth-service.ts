/**
 * 认证服务
 */
import { apiClient, ApiResponse } from '@/lib/api-client';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  full_name?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface UserUpdateRequest {
  full_name?: string;
  avatar_url?: string;
}

export class AuthService {
  /**
   * 用户登录
   */
  static async login(credentials: LoginRequest): Promise<ApiResponse<TokenResponse>> {
    const response = await apiClient.post<TokenResponse>('/users/login', credentials);
    
    // 登录成功后设置token
    if (response.success && response.data) {
      apiClient.setToken(response.data.access_token);
    }
    
    return response;
  }

  /**
   * 用户注册
   */
  static async register(userData: RegisterRequest): Promise<ApiResponse<User>> {
    return apiClient.post<User>('/users/register', userData);
  }

  /**
   * 用户登出
   */
  static async logout(): Promise<void> {
    // 清除本地token
    apiClient.setToken(null);
    
    // 这里可以调用后端登出接口（如果需要）
    // await apiClient.post('/users/logout');
  }

  /**
   * 获取当前用户信息
   */
  static async getCurrentUser(): Promise<ApiResponse<User>> {
    return apiClient.get<User>('/users/me');
  }

  /**
   * 更新当前用户信息
   */
  static async updateCurrentUser(userData: UserUpdateRequest): Promise<ApiResponse<User>> {
    return apiClient.put<User>('/users/me', userData);
  }

  /**
   * 检查是否已登录
   */
  static isLoggedIn(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('access_token');
  }

  /**
   * 获取存储的token
   */
  static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }
}