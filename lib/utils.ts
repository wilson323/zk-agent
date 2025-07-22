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
