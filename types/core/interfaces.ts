/**
 * @file types/core/interfaces.ts
 * @description 核心接口定义，包含API响应、分页参数等全局接口
 * @author zk-agent开发团队
 * @lastUpdate 2024-12-19
 */

// API响应接口
export interface ApiResponse<T = any> {  
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  message?: string;
  timestamp?: string;
}

// 分页参数接口
export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  total?: number;
}
