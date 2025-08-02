// @ts-nocheck
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const STORAGE_KEYS = {
  API_URL: 'fastgpt_api_url',
  API_KEY: 'fastgpt_api_key',
  USE_PROXY: 'fastgpt_use_proxy',
  CURRENT_USER: 'currentUser',
  DEFAULT_AGENT_INITIALIZED: 'default_agent_initialized',
};

export const isApiConfigured = () => {
  try {
    const configJson = localStorage.getItem('ai_chat_api_config');
    if (!configJson) {
      return false;
    }

    const config = JSON.parse(configJson);
    return !!(config && config.baseUrl && config.apiKey);
  } catch (error) {
    logger.error('Error checking API configuration:', error);
    return false;
  }
};

/**
 * 延迟指定毫秒数
 * @param ms 毫秒数
 * @returns Promise<void>
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 生成唯一ID
 * @param prefix 前缀
 * @returns 唯一ID字符串
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}_${timestamp}_${randomStr}` : `${timestamp}_${randomStr}`;
}

/**
 * 按指定键对数组进行分组
 * @param array 要分组的数组
 * @param keyFn 获取分组键的函数
 * @returns 分组后的对象
 */
export function groupBy<T, K extends string | number | symbol>(
  array: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return array.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<K, T[]>);
}
