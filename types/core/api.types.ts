// @ts-nocheck
/**
 * @file API Types
 * @description API相关的类型定义
 * @author ZK-Agent Team A
 * @date 2024-12-19
 */

// API响应基础类型
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  timestamp: string
}

// API错误类型
export interface ApiError {
  code: string
  message: string
  details?: any
  timestamp?: string
}

// 分页参数
export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// 搜索参数
export interface SearchParams {
  query?: string
  filters?: Record<string, any>
}

// HTTP方法类型
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

// API请求配置
export interface ApiRequestConfig {
  method: HttpMethod
  url: string
  data?: any
  params?: Record<string, any>
  headers?: Record<string, string>
  timeout?: number
}

// API客户端接口
export interface ApiClient {
  get<T>(url: string, config?: Partial<ApiRequestConfig>): Promise<ApiResponse<T>>
  post<T>(url: string, data?: any, config?: Partial<ApiRequestConfig>): Promise<ApiResponse<T>>
  put<T>(url: string, data?: any, config?: Partial<ApiRequestConfig>): Promise<ApiResponse<T>>
  delete<T>(url: string, config?: Partial<ApiRequestConfig>): Promise<ApiResponse<T>>
  patch<T>(url: string, data?: any, config?: Partial<ApiRequestConfig>): Promise<ApiResponse<T>>
}

// 文件上传响应
export interface FileUploadResponse {
  id: string
  filename: string
  originalName: string
  mimetype: string
  size: number
  url: string
  uploadedAt: string
}

// 批量操作响应
export interface BatchOperationResponse {
  total: number
  successful: number
  failed: number
  errors?: Array<{
    id: string
    error: string
  }>
}

// 健康检查响应
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  services: Record<string, {
    status: 'up' | 'down'
    responseTime?: number
    error?: string
  }>
}

// 版本信息响应
export interface VersionResponse {
  version: string
  buildDate: string
  gitCommit?: string
  environment: string
} 