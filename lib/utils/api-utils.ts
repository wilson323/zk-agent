/**
 * API请求和响应处理工具函数
 * 提供HTTP请求、错误处理、重试机制等功能
 * @author ZK-Agent Team
 * @version 1.0.0
 */

import { ApiResponse, ErrorInfo, RequestConfig, RetryConfig, RequestInterceptor } from '../types/interfaces';
import { HTTP_STATUS, API_ENDPOINTS, REQUEST_HEADERS, CONTENT_TYPES, API_REQUEST_DEFAULT_CONFIG } from '../constants';
import { AppError as ApiError, NetworkError, TimeoutError } from '@/lib/errors/app-error';
import { delay } from './index';

/**
 * 计算重试延迟时间
 * @param attempt - 重试次数
 * @param config - 重试配置
 * @returns 延迟时间（毫秒）
 */
function calculateRetryDelay(attempt: number, config: RetryConfig): number {
  const delay = config.baseDelay * Math.pow(config.backoffFactor, attempt - 1);
  return Math.min(delay, config.maxDelay);
}

/**
 * 带重试机制的请求函数
 * @param url - 请求URL
 * @param config - 请求配置
 * @param retryConfig - 重试配置
 * @returns Promise<Response>
 */
async function requestWithRetry(
  url: string,
  config: RequestConfig,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<Response> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= retryConfig.maxRetries + 1; attempt++) {
    try {
      const response = await createTimeoutFetch(url, config);
      
      // 检查响应状态
      if (!response.ok) {
        const error = new ApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          response.statusText,
          null,
          url,
          config.method || 'GET'
        );
        
        // 检查是否需要重试
        if (attempt <= retryConfig.maxRetries && retryConfig.retryCondition?.(error, attempt)) {
          lastError = error;
          const delayTime = calculateRetryDelay(attempt, retryConfig);
          await delay(delayTime);
          continue;
        }
        
        throw error;
      }
      
      return response;
    } catch (error) {
      lastError = error;
      
      // 检查是否需要重试
      if (attempt <= retryConfig.maxRetries && retryConfig.retryCondition?.(error, attempt)) {
        const delayTime = calculateRetryDelay(attempt, retryConfig);
        await delay(delayTime);
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
}

// ============================================================================
// 主要API函数
// ============================================================================

/**
 * 发送HTTP请求
 * @param url - 请求URL
 * @param config - 请求配置
 * @returns Promise<ApiResponse<T>>
 */
export async function request<T = any>(
  url: string,
  config: RequestConfig = {}
): Promise<ApiResponse<T>> {
  try {
    // 合并配置
    const mergedConfig = {
      ...DEFAULT_CONFIG,
      ...config,
      headers: {
        ...DEFAULT_CONFIG.headers,
        ...config.headers
      }
    };

    // 处理请求体
    if (mergedConfig.body && typeof mergedConfig.body === 'object') {
      if (mergedConfig.headers?.[REQUEST_HEADERS.CONTENT_TYPE] === CONTENT_TYPES.JSON) {
        mergedConfig.body = JSON.stringify(mergedConfig.body);
      } else if (mergedConfig.headers?.[REQUEST_HEADERS.CONTENT_TYPE] === CONTENT_TYPES.FORM_URLENCODED) {
        mergedConfig.body = new URLSearchParams(mergedConfig.body).toString();
      }
    }

    // 应用请求拦截器
    const processedConfig = await interceptors.processRequest(mergedConfig);

    // 发送请求
    let response = await requestWithRetry(url, processedConfig);

    // 应用响应拦截器
    response = await interceptors.processResponse(response);

    // 解析响应数据
    let data: T;
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else if (contentType?.includes('text/')) {
      data = await response.text() as any;
    } else {
      data = await response.blob() as any;
    }

    return {
      success: true,
      data,
      message: 'Request successful',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        version: '1.0.0',
        status: response.status,
        headers: Object.fromEntries(response.headers.entries())
      }
    };
  } catch (error) {
    // 应用错误拦截器
    const processedError = await interceptors.processError(error);
    
    return {
      success: false,
      data: null as any,
      message: processedError.message || 'Request failed',
      error: {
        code: processedError.code || 'UNKNOWN_ERROR',
        message: processedError.message || 'Unknown error',
        details: processedError.details || processedError
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        version: '1.0.0',
        status: processedError.status || 0
      }
    };
  }
}

/**
 * GET请求
 * @param url - 请求URL
 * @param config - 请求配置
 * @returns Promise<ApiResponse<T>>
 */
export function get<T = any>(
  url: string,
  config: Omit<RequestConfig, 'method' | 'body'> = {}
): Promise<ApiResponse<T>> {
  return request<T>(url, { ...config, method: 'GET' });
}

/**
 * POST请求
 * @param url - 请求URL
 * @param data - 请求数据
 * @param config - 请求配置
 * @returns Promise<ApiResponse<T>>
 */
export function post<T = any>(
  url: string,
  data?: any,
  config: Omit<RequestConfig, 'method'> = {}
): Promise<ApiResponse<T>> {
  return request<T>(url, { ...config, method: 'POST', body: data });
}

/**
 * PUT请求
 * @param url - 请求URL
 * @param data - 请求数据
 * @param config - 请求配置
 * @returns Promise<ApiResponse<T>>
 */
export function put<T = any>(
  url: string,
  data?: any,
  config: Omit<RequestConfig, 'method'> = {}
): Promise<ApiResponse<T>> {
  return request<T>(url, { ...config, method: 'PUT', body: data });
}

/**
 * DELETE请求
 * @param url - 请求URL
 * @param config - 请求配置
 * @returns Promise<ApiResponse<T>>
 */
export function del<T = any>(
  url: string,
  config: Omit<RequestConfig, 'method' | 'body'> = {}
): Promise<ApiResponse<T>> {
  return request<T>(url, { ...config, method: 'DELETE' });
}

/**
 * PATCH请求
 * @param url - 请求URL
 * @param data - 请求数据
 * @param config - 请求配置
 * @returns Promise<ApiResponse<T>>
 */
export function patch<T = any>(
  url: string,
  data?: any,
  config: Omit<RequestConfig, 'method'> = {}
): Promise<ApiResponse<T>> {
  return request<T>(url, { ...config, method: 'PATCH', body: data });
}

// ============================================================================
// 文件上传
// ============================================================================

/**
 * 上传文件
 * @param url - 上传URL
 * @param file - 文件对象
 * @param fieldName - 字段名称
 * @param additionalData - 额外数据
 * @param onProgress - 进度回调
 * @returns Promise<ApiResponse<T>>
 */
export function uploadFile<T = any>(
  url: string,
  file: File,
  fieldName: string = 'file',
  additionalData: Record<string, any> = {},
  onProgress?: (progress: number) => void
): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    
    // 添加文件
    formData.append(fieldName, file);
    
    // 添加额外数据
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });
    
    // 监听进度
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });
    }
    
    // 监听完成
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve({
            success: true,
            data,
            message: 'Upload successful',
            status: xhr.status
          });
        } catch (error) {
          resolve({
            success: true,
            data: xhr.responseText as any,
            message: 'Upload successful',
            status: xhr.status
          });
        }
      } else {
        reject(new ApiError(
          `Upload failed: ${xhr.statusText}`,
          'UPLOAD_FAILED',
          xhr.statusText,
          xhr.status,
          xhr.responseText,
          url,
          'POST'
        ));
      }
    });
    
    // 监听错误
    xhr.addEventListener('error', () => {
      reject(new NetworkError('Upload failed'));
    });
    
    // 发送请求
    xhr.open('POST', url);
    xhr.send(formData);
  });
}

/**
 * 批量上传文件
 * @param url - 上传URL
 * @param files - 文件列表
 * @param fieldName - 字段名称
 * @param additionalData - 额外数据
 * @param onProgress - 进度回调
 * @returns Promise<ApiResponse<T>[]>
 */
export async function uploadFiles<T = any>(
  url: string,
  files: File[],
  fieldName: string = 'files',
  additionalData: Record<string, any> = {},
  onProgress?: (progress: number, fileIndex: number) => void
): Promise<ApiResponse<T>[]> {
  const results: ApiResponse<T>[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const progressCallback = onProgress ? (progress: number) => onProgress(progress, i) : undefined;
    
    try {
      const result = await uploadFile<T>(url, file, fieldName, additionalData, progressCallback);
      results.push(result);
    } catch (error) {
      results.push({
        success: false,
        data: null as any,
        message: error instanceof Error ? error.message : 'Upload failed',
        error: {
          code: error instanceof ApiError ? error.code : 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : 'Upload failed',
          details: error
        }
      });
    }
  }
  
  return results;
}

// ============================================================================
// URL构建工具
// ============================================================================

/**
 * 构建API URL
 * @param endpoint - API端点
 * @param params - 查询参数
 * @param baseUrl - 基础URL
 * @returns 完整URL
 */
export function buildApiUrl(
  endpoint: string,
  params: Record<string, any> = {},
  baseUrl: string = ''
): string {
  let url = baseUrl ? `${baseUrl}${endpoint}` : endpoint;
  
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      queryParams.append(key, String(value));
    }
  });
  
  const queryString = queryParams.toString();
  if (queryString) {
    url += `?${queryString}`;
  }
  
  return url;
}

/**
 * 替换URL中的路径参数
 * @param url - URL模板
 * @param params - 路径参数
 * @returns 替换后的URL
 */
export function replaceUrlParams(
  url: string,
  params: Record<string, string | number>
): string {
  let result = url;
  
  Object.entries(params).forEach(([key, value]) => {
    result = result.replace(new RegExp(`:${key}\\b`, 'g'), String(value));
    result = result.replace(new RegExp(`{${key}}`, 'g'), String(value));
  });
  
  return result;
}

// ============================================================================
// 缓存工具
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class ApiCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5分钟

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// 全局缓存实例
export const apiCache = new ApiCache();

/**
 * 带缓存的GET请求
 * @param url - 请求URL
 * @param config - 请求配置
 * @param cacheKey - 缓存键名
 * @param cacheTTL - 缓存时间（毫秒）
 * @returns Promise<ApiResponse<T>>
 */
export async function getCached<T = any>(
  url: string,
  config: Omit<RequestConfig, 'method' | 'body'> = {},
  cacheKey?: string,
  cacheTTL?: number
): Promise<ApiResponse<T>> {
  const key = cacheKey || url;
  
  // 检查缓存
  const cached = apiCache.get<ApiResponse<T>>(key);
  if (cached) {
    return cached;
  }
  
  // 发送请求
  const response = await get<T>(url, config);
  
  // 只缓存成功的响应
  if (response.success) {
    apiCache.set(key, response, cacheTTL);
  }
  
  return response;
}

// ============================================================================
// 请求取消
// ============================================================================

/**
 * 创建可取消的请求
 * @param url - 请求URL
 * @param config - 请求配置
 * @returns { promise: Promise<ApiResponse<T>>, cancel: () => void }
 */
export function createCancelableRequest<T = any>(
  url: string,
  config: RequestConfig = {}
): { promise: Promise<ApiResponse<T>>; cancel: () => void } {
  const controller = new AbortController();
  
  const promise = request<T>(url, {
    ...config,
    signal: controller.signal
  });
  
  const cancel = () => {
    controller.abort();
  };
  
  return { promise, cancel };
}

// ============================================================================
// 批量请求
// ============================================================================

/**
 * 并行发送多个请求
 * @param requests - 请求配置数组
 * @returns Promise<ApiResponse<any>[]>
 */
export async function batchRequests(
  requests: Array<{ url: string; config?: RequestConfig }>
): Promise<ApiResponse<any>[]> {
  const promises = requests.map(({ url, config }) => request(url, config));
  return Promise.all(promises);
}

/**
 * 串行发送多个请求
 * @param requests - 请求配置数组
 * @returns Promise<ApiResponse<any>[]>
 */
export async function sequentialRequests(
  requests: Array<{ url: string; config?: RequestConfig }>
): Promise<ApiResponse<any>[]> {
  const results: ApiResponse<any>[] = [];
  
  for (const { url, config } of requests) {
    const result = await request(url, config);
    results.push(result);
  }
  
  return results;
}

// ============================================================================
// 健康检查
// ============================================================================

/**
 * 检查API健康状态
 * @param url - 健康检查URL
 * @param timeout - 超时时间
 * @returns Promise<boolean>
 */
export async function checkApiHealth(
  url: string,
  timeout: number = 5000
): Promise<boolean> {
  try {
    const response = await request(url, {
      method: 'GET',
      timeout
    });
    return response.success;
  } catch (error) {
    return false;
  }
}

/**
 * 等待API可用
 * @param url - 健康检查URL
 * @param maxAttempts - 最大尝试次数
 * @param interval - 检查间隔（毫秒）
 * @returns Promise<boolean>
 */
export async function waitForApi(
  url: string,
  maxAttempts: number = 10,
  interval: number = 1000
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const isHealthy = await checkApiHealth(url);
    if (isHealthy) {
      return true;
    }
    
    if (i < maxAttempts - 1) {
      await delay(interval);
    }
  }
  
  return false;
}