import { secureStorage } from '@/lib/utils/secure-storage';

/**
 * @file enhanced-api-client.ts
 * @description 增强版API客户端，集成JWT安全机制和请求/响应拦截器
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  isSecureTokenExpiringSoon,
  refreshSecureTokenPair,
} from '@/lib/auth/enhanced-jwt-security';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();

const logger = getLogger();
import type { ApiClient, ApiRequestConfig, ApiResponse } from '@/types/core/api.types';

// API客户端配置
export interface EnhancedApiClientConfig {
  baseURL: string;
  timeout: number;
  headers?: Record<string, string>;
  enableTokenRefresh?: boolean;
  enableRequestLogging?: boolean;
  enableResponseLogging?: boolean;
  enableErrorLogging?: boolean;
}

// 默认配置
const DEFAULT_CONFIG: EnhancedApiClientConfig = {
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || '/api',
  timeout: 30000, // 30秒
  enableTokenRefresh: true,
  enableRequestLogging: process.env.NODE_ENV !== 'production',
  enableResponseLogging: process.env.NODE_ENV !== 'production',
  enableErrorLogging: true,
};

/**
 * 增强版API客户端
 * 支持JWT令牌自动刷新、请求/响应拦截、错误处理等功能
 */
export class EnhancedApiClient implements ApiClient {
  private axiosInstance: AxiosInstance;
  private config: EnhancedApiClientConfig;
  private isRefreshing: boolean = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor(config: Partial<EnhancedApiClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.axiosInstance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers,
      },
    });

    this.setupInterceptors();
  }

  /**
   * 设置请求/响应拦截器
   */
  private setupInterceptors(): void {
    // 请求拦截器
    this.axiosInstance.interceptors.request.use(
      config => this.handleRequest(config),
      error => this.handleRequestError(error)
    );

    // 响应拦截器
    this.axiosInstance.interceptors.response.use(
      response => this.handleResponse(response),
      error => this.handleResponseError(error)
    );
  }

  /**
   * 处理请求
   */
  private async handleRequest(config: AxiosRequestConfig): Promise<AxiosRequestConfig> {
    // 生成请求ID
    const requestId = uuidv4();
    config.headers = config.headers || {};
    config.headers['X-Request-ID'] = requestId;

    // 添加认证令牌
    if (typeof window !== 'undefined') {
      const token = secureStorage.getItem('accessToken');

      if (token) {
        // 检查令牌是否即将过期
        if (this.config.enableTokenRefresh && isSecureTokenExpiringSoon(token)) {
          // 如果令牌即将过期且未在刷新中，则刷新令牌
          if (!this.isRefreshing) {
            return this.refreshTokenAndUpdateRequest(config);
          } else {
            // 如果已经在刷新中，则将请求添加到队列
            return new Promise(resolve => {
              this.refreshSubscribers.push(newToken => {
                config.headers!['Authorization'] = `Bearer ${newToken}`;
                resolve(config);
              });
            });
          }
        }

        // 添加令牌到请求头
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }

    // 记录请求日志
    if (this.config.enableRequestLogging) {
      logger.info(`API请求: ${config.method?.toUpperCase()} ${config.url}`, {
        requestId,
        params: config.params,
        data: config.data,
      });
    }

    return config;
  }

  /**
   * 处理请求错误
   */
  private handleRequestError(error: any): Promise<never> {
    if (this.config.enableErrorLogging) {
      logger.error('API请求错误:', error);
    }
    return Promise.reject(error);
  }

  /**
   * 处理响应
   */
  private handleResponse(response: AxiosResponse): AxiosResponse {
    // 记录响应日志
    if (this.config.enableResponseLogging) {
      logger.info(`API响应: ${response.status} ${response.config.url}`, {
        requestId: response.config.headers?.['X-Request-ID'],
        status: response.status,
        data: response.data,
      });
    }
    return response;
  }

  /**
   * 处理响应错误
   */
  private async handleResponseError(error: any): Promise<any> {
    // 处理401错误（未授权）
    if (error.response?.status === 401 && this.config.enableTokenRefresh) {
      // 尝试刷新令牌
      const originalRequest = error.config;

      // 防止无限循环
      if (!originalRequest._retry) {
        originalRequest._retry = true;

        if (!this.isRefreshing) {
          return this.refreshTokenAndRetry(originalRequest);
        } else {
          // 如果已经在刷新中，则将请求添加到队列
          return new Promise((resolve, reject) => {
            this.refreshSubscribers.push(newToken => {
              originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
              resolve(this.axiosInstance(originalRequest));
            });
          });
        }
      }
    }

    // 记录错误日志
    if (this.config.enableErrorLogging) {
      logger.error('API响应错误:', {
        status: error.response?.status,
        url: error.config?.url,
        message: error.message,
        data: error.response?.data,
      });
    }

    return Promise.reject(error);
  }

  /**
   * 刷新令牌并更新请求
   */
  private async refreshTokenAndUpdateRequest(
    config: AxiosRequestConfig
  ): Promise<AxiosRequestConfig> {
    this.isRefreshing = true;

    try {
      const refreshToken = secureStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('刷新令牌不存在');
      }

      // 调用刷新令牌API
      const tokenPair = await refreshSecureTokenPair(refreshToken);
      if (!tokenPair) {
        throw new Error('令牌刷新失败');
      }

      // 更新本地存储的令牌
      secureStorage.setItem('accessToken', tokenPair.accessToken);
      secureStorage.setItem('refreshToken', tokenPair.refreshToken);

      // 更新当前请求的令牌
      config.headers!['Authorization'] = `Bearer ${tokenPair.accessToken}`;

      // 通知所有等待的请求
      this.onTokenRefreshed(tokenPair.accessToken);

      return config;
    } catch (error) {
      // 刷新失败，清除令牌并重定向到登录页
      secureStorage.removeItem('accessToken');
      secureStorage.removeItem('refreshToken');

      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login?expired=true';
      }

      return Promise.reject(error);
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * 刷新令牌并重试失败的请求
   */
  private async refreshTokenAndRetry(originalRequest: AxiosRequestConfig): Promise<any> {
    this.isRefreshing = true;

    try {
      const refreshToken = secureStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('刷新令牌不存在');
      }

      // 调用刷新令牌API
      const tokenPair = await refreshSecureTokenPair(refreshToken);
      if (!tokenPair) {
        throw new Error('令牌刷新失败');
      }

      // 更新本地存储的令牌
      secureStorage.setItem('accessToken', tokenPair.accessToken);
      secureStorage.setItem('refreshToken', tokenPair.refreshToken);

      // 更新失败请求的令牌
      originalRequest.headers['Authorization'] = `Bearer ${tokenPair.accessToken}`;

      // 通知所有等待的请求
      this.onTokenRefreshed(tokenPair.accessToken);

      // 重试原始请求
      return this.axiosInstance(originalRequest);
    } catch (error) {
      // 刷新失败，清除令牌并重定向到登录页
      secureStorage.removeItem('accessToken');
      secureStorage.removeItem('refreshToken');

      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login?expired=true';
      }

      return Promise.reject(error);
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * 令牌刷新成功后通知所有等待的请求
   */
  private onTokenRefreshed(newToken: string): void {
    this.refreshSubscribers.forEach(callback => callback(newToken));
    this.refreshSubscribers = [];
  }

  /**
   * GET请求
   */
  public async get<T>(url: string, config?: Partial<ApiRequestConfig>): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.get<T>(url, config);
      return {
        success: true,
        data: response.data,
        status: response.status,
        headers: response.headers,
      };
    } catch (error: any) {
      return this.handleApiError<T>(error);
    }
  }

  /**
   * POST请求
   */
  public async post<T>(
    url: string,
    data?: any,
    config?: Partial<ApiRequestConfig>
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.post<T>(url, data, config);
      return {
        success: true,
        data: response.data,
        status: response.status,
        headers: response.headers,
      };
    } catch (error: any) {
      return this.handleApiError<T>(error);
    }
  }

  /**
   * PUT请求
   */
  public async put<T>(
    url: string,
    data?: any,
    config?: Partial<ApiRequestConfig>
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.put<T>(url, data, config);
      return {
        success: true,
        data: response.data,
        status: response.status,
        headers: response.headers,
      };
    } catch (error: any) {
      return this.handleApiError<T>(error);
    }
  }

  /**
   * DELETE请求
   */
  public async delete<T>(url: string, config?: Partial<ApiRequestConfig>): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.delete<T>(url, config);
      return {
        success: true,
        data: response.data,
        status: response.status,
        headers: response.headers,
      };
    } catch (error: any) {
      return this.handleApiError<T>(error);
    }
  }

  /**
   * PATCH请求
   */
  public async patch<T>(
    url: string,
    data?: any,
    config?: Partial<ApiRequestConfig>
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.patch<T>(url, data, config);
      return {
        success: true,
        data: response.data,
        status: response.status,
        headers: response.headers,
      };
    } catch (error: any) {
      return this.handleApiError<T>(error);
    }
  }

  /**
   * 处理API错误
   */
  private handleApiError<T>(error: any): ApiResponse<T> {
    return {
      success: false,
      error: {
        message: error.response?.data?.message || error.message || '未知错误',
        code: error.response?.data?.code || error.code || 'UNKNOWN_ERROR',
        status: error.response?.status || 500,
      },
      status: error.response?.status || 500,
      headers: error.response?.headers,
    };
  }

  /**
   * 设置默认请求头
   */
  public setHeader(key: string, value: string): void {
    this.axiosInstance.defaults.headers.common[key] = value;
  }

  /**
   * 删除默认请求头
   */
  public removeHeader(key: string): void {
    delete this.axiosInstance.defaults.headers.common[key];
  }

  /**
   * 设置基础URL
   */
  public setBaseURL(baseURL: string): void {
    this.axiosInstance.defaults.baseURL = baseURL;
  }

  /**
   * 设置超时时间
   */
  public setTimeout(timeout: number): void {
    this.axiosInstance.defaults.timeout = timeout;
  }
}

// 创建默认API客户端实例
export const enhancedApiClient = new EnhancedApiClient();
