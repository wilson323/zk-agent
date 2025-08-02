import { DEFAULT_API_CONFIG } from '@/config/fastgpt';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();

interface ApiConfig {
  baseUrl: string;
  apiKey: string;
  useProxy: boolean;
}

interface ApiTestResult {
  success: boolean;
  message: string;
}

export const loadApiConfig = (): ApiConfig => {
  try {
    const localConfig = localStorage.getItem('ai_chat_api_config');
    if (localConfig) {
      try {
        const config = JSON.parse(localConfig);
        return {
          baseUrl: config.baseUrl || DEFAULT_API_CONFIG.baseUrl,
          apiKey: config.apiKey || '',
          useProxy: config.useProxy === undefined ? true : config.useProxy,
        };
      } catch (e) {
        logger.error('解析本地存储的API配置失败:', e);
        return { baseUrl: DEFAULT_API_CONFIG.baseUrl, apiKey: '', useProxy: true };
      }
    }
  } catch (error) {
    logger.error('加载API配置失败:', error);
  }
  return { baseUrl: DEFAULT_API_CONFIG.baseUrl, apiKey: '', useProxy: true };
};

export const saveApiConfig = async (config: ApiConfig): Promise<void> => {
  try {
    localStorage.setItem('ai_chat_api_config', JSON.stringify(config));
  } catch (error) {
    logger.error('保存API配置失败:', error);
    throw error;
  }
};

export const testApiConfig = async (config: ApiConfig): Promise<ApiTestResult> => {
  try {
    const testUrl = `${config.baseUrl}/health`;
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      return { success: true, message: 'API连接测试成功' };
    } else {
      return { success: false, message: `API连接失败: ${response.status} ${response.statusText}` };
    }
  } catch (error) {
    logger.error('测试API配置失败:', error);
    return {
      success: false,
      message: `API连接失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
};
