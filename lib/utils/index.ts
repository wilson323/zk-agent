/**
 * 统一工具函数库
 * 集中管理项目中所有的工具函数，避免重复定义
 * @author ZK-Agent Team
 * @version 1.0.0
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { REGEX_PATTERNS, TIME_INTERVALS } from '../constants';
import type { ValidationResult, PaginationParams, PaginationResult } from '../types/interfaces';

// ============================================================================
// 样式工具函数
// ============================================================================

/**
 * 合并CSS类名
 * 使用clsx和tailwind-merge优化类名合并
 * @param inputs - 类名输入
 * @returns 合并后的类名字符串
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * 生成随机颜色
 * 生成用于头像或UI组件的随机颜色
 * @param seed - 种子值，相同种子生成相同颜色
 * @returns HSL颜色字符串
 */
export function generateRandomColor(seed?: string): string {
  const hash = seed ? hashString(seed) : Math.random();
  const hue = Math.floor(hash * 360);
  const saturation = 65 + Math.floor(hash * 20); // 65-85%
  const lightness = 45 + Math.floor(hash * 20); // 45-65%
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * 字符串哈希函数
 * 将字符串转换为数字哈希值
 * @param str - 输入字符串
 * @returns 0-1之间的数字
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) / 2147483647;
}

// ============================================================================
// 数据验证工具函数
// ============================================================================

/**
 * 验证邮箱地址
 * @param email - 邮箱地址
 * @returns 验证结果
 */
export function validateEmail(email: string): ValidationResult {
  const isValid = REGEX_PATTERNS.EMAIL.test(email);
  return {
    isValid,
    errors: isValid ? [] : ['请输入有效的邮箱地址']
  };
}

/**
 * 验证手机号码
 * @param phone - 手机号码
 * @returns 验证结果
 */
export function validatePhone(phone: string): ValidationResult {
  const isValid = REGEX_PATTERNS.PHONE.test(phone);
  return {
    isValid,
    errors: isValid ? [] : ['请输入有效的手机号码']
  };
}

// 密码验证函数已移至 ../auth/password.ts，请从那里导入
export { validatePassword } from '../auth/password';

/**
 * 验证用户名
 * @param username - 用户名
 * @returns 验证结果
 */
export function validateUsername(username: string): ValidationResult {
  const isValid = REGEX_PATTERNS.USERNAME.test(username);
  return {
    isValid,
    errors: isValid ? [] : ['用户名只能包含字母、数字和下划线，长度3-20位']
  };
}

/**
 * 验证URL
 * @param url - URL地址
 * @returns 验证结果
 */
export function validateUrl(url: string): ValidationResult {
  const isValid = REGEX_PATTERNS.URL.test(url);
  return {
    isValid,
    errors: isValid ? [] : ['请输入有效的URL地址']
  };
}

// ============================================================================
// 字符串处理工具函数
// ============================================================================

/**
 * 截断字符串
 * @param str - 原字符串
 * @param maxLength - 最大长度
 * @param suffix - 后缀，默认为'...'
 * @returns 截断后的字符串
 */
export function truncateString(str: string, maxLength: number, suffix = '...'): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * 首字母大写
 * @param str - 输入字符串
 * @returns 首字母大写的字符串
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * 驼峰命名转换
 * @param str - 输入字符串
 * @returns 驼峰命名字符串
 */
export function toCamelCase(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, '');
}

/**
 * 短横线命名转换
 * @param str - 输入字符串
 * @returns 短横线命名字符串
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * 生成随机字符串
 * @param length - 字符串长度
 * @param charset - 字符集，默认为字母数字
 * @returns 随机字符串
 */
export function generateRandomString(
  length: number,
  charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

// ============================================================================
// 数字处理工具函数
// ============================================================================

// 文件大小格式化函数已移至 ./file-utils.ts，请从那里导入
export { formatFileSize } from './file-utils';

/**
 * 格式化数字
 * @param num - 数字
 * @param options - 格式化选项
 * @returns 格式化后的数字字符串
 */
export function formatNumber(
  num: number,
  options: Intl.NumberFormatOptions = {}
): string {
  return new Intl.NumberFormat('zh-CN', options).format(num);
}

/**
 * 生成范围内的随机数
 * @param min - 最小值
 * @param max - 最大值
 * @param integer - 是否返回整数，默认为true
 * @returns 随机数
 */
export function randomBetween(min: number, max: number, integer = true): number {
  const random = Math.random() * (max - min) + min;
  return integer ? Math.floor(random) : random;
}

// ============================================================================
// 时间处理工具函数
// ============================================================================

/**
 * 格式化时间
 * @param date - 日期对象或时间戳
 * @param format - 格式字符串，默认为'YYYY-MM-DD HH:mm:ss'
 * @returns 格式化后的时间字符串
 */
export function formatDate(date: Date | number | string, format = 'YYYY-MM-DD HH:mm:ss'): string {
  const d = new Date(date);
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * 获取相对时间
 * @param date - 日期对象或时间戳
 * @returns 相对时间字符串
 */
export function getRelativeTime(date: Date | number | string): string {
  const now = new Date();
  const target = new Date(date);
  const diff = now.getTime() - target.getTime();
  
  if (diff < TIME_INTERVALS.MINUTE) {
    return '刚刚';
  } else if (diff < TIME_INTERVALS.HOUR) {
    const minutes = Math.floor(diff / TIME_INTERVALS.MINUTE);
    return `${minutes}分钟前`;
  } else if (diff < TIME_INTERVALS.DAY) {
    const hours = Math.floor(diff / TIME_INTERVALS.HOUR);
    return `${hours}小时前`;
  } else if (diff < TIME_INTERVALS.WEEK) {
    const days = Math.floor(diff / TIME_INTERVALS.DAY);
    return `${days}天前`;
  } else {
    return formatDate(target, 'YYYY-MM-DD');
  }
}

/**
 * 格式化时间（毫秒转可读格式）
 * @param ms - 毫秒数
 * @returns 格式化后的时间字符串
 */
export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}小时${minutes % 60}分钟`;
  } else if (minutes > 0) {
    return `${minutes}分钟${seconds % 60}秒`;
  } else {
    return `${seconds}秒`;
  }
}

/**
 * 格式化时间距离（使用date-fns的formatDistanceToNow）
 * @param dateString - 日期字符串
 * @returns 格式化后的时间距离字符串
 */
export function formatTimeDistance(dateString: string): string {
  try {
    // 注意：这里需要确保项目中已安装date-fns和date-fns/locale/zh-CN
    // 如果没有安装，可以使用简单的实现
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) { // 1分钟内
      return '刚刚';
    } else if (diff < 3600000) { // 1小时内
      const minutes = Math.floor(diff / 60000);
      return `${minutes}分钟前`;
    } else if (diff < 86400000) { // 1天内
      const hours = Math.floor(diff / 3600000);
      return `${hours}小时前`;
    } else if (diff < 604800000) { // 1周内
      const days = Math.floor(diff / 86400000);
      return `${days}天前`;
    } else {
      return formatDate(date, 'YYYY-MM-DD');
    }
  } catch (e) {
    return '未知时间';
  }
}

/**
 * 生成唯一ID
 * @returns 唯一ID字符串
 */
export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 生成短ID
 * @param length - ID长度，默认为8
 * @returns 短ID字符串
 */
export function generateShortId(length: number = 8): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * 延迟执行
 * @param ms - 延迟毫秒数
 * @returns Promise
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// 数组处理工具函数
// ============================================================================

/**
 * 数组去重
 * @param array - 输入数组
 * @param key - 对象数组的去重键名
 * @returns 去重后的数组
 */
export function uniqueArray<T>(array: T[], key?: keyof T): T[] {
  if (!key) {
    return [...new Set(array)];
  }
  
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

/**
 * 数组分块
 * @param array - 输入数组
 * @param size - 块大小
 * @returns 分块后的二维数组
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * 数组随机排序
 * @param array - 输入数组
 * @returns 随机排序后的数组
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 数组分组
 * @param array - 输入数组
 * @param keyFn - 分组键函数
 * @returns 分组后的对象
 */
export function groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

/**
 * 数组排序
 * @param array - 输入数组
 * @param keyFn - 排序键函数
 * @param order - 排序顺序，'asc' 或 'desc'
 * @returns 排序后的数组
 */
export function sortBy<T>(array: T[], keyFn: (item: T) => any, order: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const aVal = keyFn(a);
    const bVal = keyFn(b);
    
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
}

// ============================================================================
// 对象处理工具函数
// ============================================================================

/**
 * 深度克隆对象
 * @param obj - 输入对象
 * @returns 克隆后的对象
 */
export function deepClone<T extends object>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as T;
  }
  
  if (typeof obj === 'object') {
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  
  return obj;
}

/**
 * 对象属性过滤
 * @param obj - 输入对象
 * @param keys - 要保留的键名数组
 * @returns 过滤后的对象
 */
export function pickObject<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

/**
 * 对象属性排除
 * @param obj - 输入对象
 * @param keys - 要排除的键名数组
 * @returns 排除后的对象
 */
export function omitObject<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  keys.forEach(key => {
    delete result[key];
  });
  return result;
}

// ============================================================================
// URL和查询参数工具函数
// ============================================================================

/**
 * 构建查询字符串
 * @param params - 参数对象
 * @returns 查询字符串
 */
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(key, String(item)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });
  
  return searchParams.toString();
}

/**
 * 解析查询字符串
 * @param queryString - 查询字符串
 * @returns 参数对象
 */
export function parseQueryString(queryString: string): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {};
  const searchParams = new URLSearchParams(queryString);
  
  searchParams.forEach((value, key) => {
    if (params[key]) {
      if (Array.isArray(params[key])) {
        (params[key] as string[]).push(value);
      } else {
        params[key] = [params[key] as string, value];
      }
    } else {
      params[key] = value;
    }
  });
  
  return params;
}

// ============================================================================
// 分页工具函数
// ============================================================================

/**
 * 计算分页信息
 * @param params - 分页参数
 * @param totalCount - 总数量
 * @returns 分页结果
 */
export function calculatePagination<T>(
  params: PaginationParams,
  totalCount: number
): PaginationResult<T> {
  const { page, limit } = params;
  const totalPages = Math.ceil(totalCount / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  const offset = (page - 1) * limit;
  
  return {
    page,
    limit,
    totalCount,
    totalPages,
    hasNext,
    hasPrev,
    offset
  };
}

// ============================================================================
// 错误处理工具函数
// ============================================================================

/**
 * 安全执行异步函数
 * @param fn - 异步函数
 * @param defaultValue - 默认返回值
 * @returns 执行结果或默认值
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  defaultValue: T
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error('Safe async execution failed:', error);
    return defaultValue;
  }
}

/**
 * 重试执行函数
 * @param fn - 要执行的函数
 * @param maxRetries - 最大重试次数
 * @param delay - 重试间隔（毫秒）
 * @returns 执行结果
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries) {
        await delay(delayMs * Math.pow(2, i)); // 指数退避
      }
    }
  }
  
  throw lastError!;
}

// ============================================================================
// 性能监控工具函数
// ============================================================================

/**
 * 性能计时器
 * @param label - 计时器标签
 * @returns 停止计时的函数
 */
export function createTimer(label: string): () => number {
  const start = performance.now();
  
  return () => {
    const end = performance.now();
    const duration = end - start;
    console.log(`${label}: ${duration.toFixed(2)}ms`);
    return duration;
  };
}

/**
 * 函数执行时间测量
 * @param fn - 要测量的函数
 * @param label - 标签
 * @returns 包装后的函数
 */
export function measureTime<T extends (...args: any[]) => any>(
  fn: T,
  label?: string
): T {
  return ((...args: Parameters<T>) => {
    const timer = createTimer(label || fn.name || 'Anonymous function');
    const result = fn(...args);
    timer();
    return result;
  }) as T;
}

// ============================================================================
// 导出所有工具函数
// ============================================================================

export * from './file-utils';
export * from './crypto-utils';
export * from './device-utils';
export * from './api-utils';
export * from './array-utils'; // Add array-utils export