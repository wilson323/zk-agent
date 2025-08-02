/// <reference lib="dom" />
import axios from 'axios';
import {
  DEFAULT_API_CONFIG,
  STORAGE_KEYS,
  PROXY_CONFIG,
  ERROR_MESSAGES,
  MODEL_TYPES,
} from '@/config/fastgpt';
// This is a client-side file, so we don't use any sensitive environment variables here
import { v4 as uuidv4 } from 'uuid';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();

// FastGPT API 响应类型
export interface FastGPTResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  detail?: any;
  responseData?: any[];
}

// FastGPT API 错误响应类型
export interface FastGPTErrorResponse {
  error: {
    code: number;
    message: string;
  };
}

// Define types for the API responses
interface ChatResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
  // Add other fields as needed
}

// FastGPT API 客户端类
export class FastGPTClient {
  private apiKey: string;
  private baseUrl: string;
  private useProxy: boolean;
  private retryConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    backoffMultiplier: 2,
  };

  constructor(apiKey: string, baseUrl?: string, useProxy = true) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || '';
    this.useProxy = useProxy;
  }

  // 获取API URL
  private getApiUrl(endpoint: string): string {
    if (this.useProxy) {
      return `/api/proxy${endpoint}`;
    }
    return `${this.baseUrl}${endpoint}`;
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt < this.retryConfig.maxRetries) {
          const delay =
            this.retryConfig.retryDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  // 发送聊天请求
  async sendChatRequest(
    messages: any[],
    model: string = MODEL_TYPES.GPT_3_5_TURBO
  ): Promise<FastGPTResponse> {
    return this.executeWithRetry(async () => {
      const response = await axios.post<FastGPTResponse>(
        this.getApiUrl('/chat/completions'),
        {
          model,
          messages,
          temperature: 0.7,
          max_tokens: 2000,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    });
  }

  // 测试API连接
  async testConnection(): Promise<boolean> {
    try {
      const testMessages = [{ role: 'user', content: 'Hello, this is a test message.' }];
      await this.sendChatRequest(testMessages);
      return true;
    } catch (error) {
      logger.error('FastGPT API connection test failed:', error);
      return false;
    }
  }
}

// 创建默认的FastGPT客户端实例
export const createFastGPTClient = (
  apiKey: string,
  baseUrl?: string,
  useProxy = true
): FastGPTClient => {
  return new FastGPTClient(apiKey, baseUrl, useProxy);
};

// 导出默认实例
export default FastGPTClient;
