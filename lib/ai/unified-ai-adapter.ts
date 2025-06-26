// @ts-nocheck
/**
 * @file lib/ai/unified-ai-adapter.ts
 * @description 统一AI服务适配器 - B团队核心组件
 * @author B团队AI集成架构师
 * @lastUpdate 2024-12-19
 * @integrations FastGPT、千问、硅基流动标准化适配器
 */

import { Logger } from '@/lib/utils/logger';
import { performanceMonitor } from '@/lib/middleware/performance-monitor';

// AI服务提供商枚举
export enum AIProvider {
  FASTGPT = 'fastgpt',
  QIANWEN = 'qianwen',
  SILICONFLOW = 'siliconflow',
}

// 统一的AI请求接口
export interface AIRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  metadata?: Record<string, any>;
}

// 统一的AI响应接口
export interface AIResponse {
  success: boolean;
  data?: {
    content: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    model: string;
    finishReason?: string;
  };
  error?: string;
  provider: AIProvider;
  requestId: string;
  latency: number;
}

// AI服务配置接口
export interface AIServiceConfig {
  provider: AIProvider;
  baseUrl: string;
  apiKey: string;
  model: string;
  timeout?: number;
  retryAttempts?: number;
  circuitBreakerThreshold?: number;
}

// 熔断器状态
enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

// 熔断器类
class CircuitBreaker {
  private state = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly threshold: number;
  private readonly timeout: number;

  constructor(threshold = 5, timeout = 60000) {
    this.threshold = threshold;
    this.timeout = timeout;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = CircuitBreakerState.HALF_OPEN;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = CircuitBreakerState.CLOSED;
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.threshold) {
      this.state = CircuitBreakerState.OPEN;
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }
}

// 统一AI适配器类
export class UnifiedAIAdapter {
  private logger = new Logger('UnifiedAIAdapter');
  private circuitBreakers = new Map<AIProvider, CircuitBreaker>();
  private configs = new Map<AIProvider, AIServiceConfig>();

  constructor() {
    // 初始化熔断器
    Object.values(AIProvider).forEach(provider => {
      this.circuitBreakers.set(provider, new CircuitBreaker());
    });
  }

  /**
   * 注册AI服务配置
   */
  registerService(config: AIServiceConfig): void {
    this.configs.set(config.provider, config);
    this.logger.info('AI service registered', {
      provider: config.provider,
      model: config.model,
    });
  }

  /**
   * 统一的AI调用接口
   */
  async call(
    provider: AIProvider,
    request: AIRequest
  ): Promise<AIResponse> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      const config = this.configs.get(provider);
      if (!config) {
        throw new Error(`AI service not configured: ${provider}`);
      }

      const circuitBreaker = this.circuitBreakers.get(provider)!;
      
      const response = await circuitBreaker.execute(async () => {
        return await this.executeRequest(config, request, requestId);
      });

      const latency = Date.now() - startTime;

      this.logger.info('AI request completed', {
        provider,
        requestId,
        latency,
        model: config.model,
      });

      return {
        success: true,
        data: response,
        provider,
        requestId,
        latency,
      };

    } catch (error) {
      const latency = Date.now() - startTime;
      
      this.logger.error('AI request failed', {
        provider,
        requestId,
        latency,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
        provider,
        requestId,
        latency,
      };
    }
  }

  /**
   * 执行具体的AI请求
   */
  private async executeRequest(
    config: AIServiceConfig,
    request: AIRequest,
    requestId: string
  ): Promise<any> {
    switch (config.provider) {
      case AIProvider.FASTGPT:
        return await this.callFastGPT(config, request, requestId);
      case AIProvider.QIANWEN:
        return await this.callQianwen(config, request, requestId);
      case AIProvider.SILICONFLOW:
        return await this.callSiliconFlow(config, request, requestId);
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }

  /**
   * FastGPT API调用
   */
  private async callFastGPT(
    config: AIServiceConfig,
    request: AIRequest,
    requestId: string
  ): Promise<any> {
    const response = await fetch(`${config.baseUrl}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'X-Request-ID': requestId,
      },
      body: JSON.stringify({
        messages: request.messages,
        model: request.model || config.model,
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 2048,
        stream: request.stream || false,
      }),
      signal: AbortSignal.timeout(config.timeout || 30000),
    });

    if (!response.ok) {
      throw new Error(`FastGPT API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: data.choices?.[0]?.message?.content || '',
      usage: data.usage,
      model: data.model,
      finishReason: data.choices?.[0]?.finish_reason,
    };
  }

  /**
   * 千问API调用
   */
  private async callQianwen(
    config: AIServiceConfig,
    request: AIRequest,
    requestId: string
  ): Promise<any> {
    const response = await fetch(`${config.baseUrl}/services/aigc/text-generation/generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'X-DashScope-SSE': request.stream ? 'enable' : 'disable',
        'X-Request-ID': requestId,
      },
      body: JSON.stringify({
        model: request.model || config.model,
        input: {
          messages: request.messages,
        },
        parameters: {
          temperature: request.temperature || 0.7,
          max_tokens: request.maxTokens || 2048,
          result_format: 'message',
        },
      }),
      signal: AbortSignal.timeout(config.timeout || 30000),
    });

    if (!response.ok) {
      throw new Error(`Qianwen API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.code && data.code !== '200') {
      throw new Error(`Qianwen API error: ${data.message}`);
    }

    return {
      content: data.output?.choices?.[0]?.message?.content || '',
      usage: data.usage,
      model: data.model,
      finishReason: data.output?.choices?.[0]?.finish_reason,
    };
  }

  /**
   * 硅基流动API调用
   */
  private async callSiliconFlow(
    config: AIServiceConfig,
    request: AIRequest,
    requestId: string
  ): Promise<any> {
    const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'X-Request-ID': requestId,
      },
      body: JSON.stringify({
        model: request.model || config.model,
        messages: request.messages,
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 2048,
        stream: request.stream || false,
      }),
      signal: AbortSignal.timeout(config.timeout || 30000),
    });

    if (!response.ok) {
      throw new Error(`SiliconFlow API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: data.choices?.[0]?.message?.content || '',
      usage: data.usage,
      model: data.model,
      finishReason: data.choices?.[0]?.finish_reason,
    };
  }

  /**
   * 批量调用（负载均衡）
   */
  async callWithLoadBalancing(
    providers: AIProvider[],
    request: AIRequest
  ): Promise<AIResponse> {
    const availableProviders = providers.filter(provider => {
      const circuitBreaker = this.circuitBreakers.get(provider);
      return circuitBreaker?.getState() !== CircuitBreakerState.OPEN;
    });

    if (availableProviders.length === 0) {
      throw new Error('No available AI providers');
    }

    // 简单的轮询负载均衡
    const selectedProvider = availableProviders[
      Math.floor(Math.random() * availableProviders.length)
    ];

    return await this.call(selectedProvider, request);
  }

  /**
   * 获取服务健康状态
   */
  async getHealthStatus(): Promise<Record<AIProvider, any>> {
    const status: Record<string, any> = {};

    for (const [provider, config] of this.configs.entries()) {
      const circuitBreaker = this.circuitBreakers.get(provider)!;
      
      try {
        const startTime = Date.now();
        const response = await fetch(`${config.baseUrl}/health`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
          },
          signal: AbortSignal.timeout(5000),
        });

        const latency = Date.now() - startTime;

        status[provider] = {
          healthy: response.ok,
          latency,
          circuitBreakerState: circuitBreaker.getState(),
          lastChecked: new Date().toISOString(),
        };
      } catch (error) {
        status[provider] = {
          healthy: false,
          error: error.message,
          circuitBreakerState: circuitBreaker.getState(),
          lastChecked: new Date().toISOString(),
        };
      }
    }

    return status as Record<AIProvider, any>;
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取配置的服务列表
   */
  getConfiguredServices(): AIProvider[] {
    return Array.from(this.configs.keys());
  }

  /**
   * 重置熔断器
   */
  resetCircuitBreaker(provider: AIProvider): void {
    const circuitBreaker = this.circuitBreakers.get(provider);
    if (circuitBreaker) {
      // 重新创建熔断器实例来重置状态
      this.circuitBreakers.set(provider, new CircuitBreaker());
      this.logger.info('Circuit breaker reset', { provider });
    }
  }
}

// 导出单例实例
export const unifiedAIAdapter = new UnifiedAIAdapter();

// 初始化默认配置
export function initializeAIServices(): void {
  // FastGPT配置
  if (process.env.FASTGPT_API_URL && process.env.FASTGPT_API_KEY) {
    unifiedAIAdapter.registerService({
      provider: AIProvider.FASTGPT,
      baseUrl: process.env.FASTGPT_API_URL,
      apiKey: process.env.FASTGPT_API_KEY,
      model: 'gpt-3.5-turbo',
      timeout: 30000,
    });
  }

  // 千问配置
  if (process.env.QWEN_BASE_URL && process.env.QWEN_API_KEY) {
    unifiedAIAdapter.registerService({
      provider: AIProvider.QIANWEN,
      baseUrl: process.env.QWEN_BASE_URL,
      apiKey: process.env.QWEN_API_KEY,
      model: 'qwen-turbo',
      timeout: 30000,
    });
  }

  // 硅基流动配置
  if (process.env.SILICONFLOW_BASE_URL && process.env.SILICONFLOW_API_KEY) {
    unifiedAIAdapter.registerService({
      provider: AIProvider.SILICONFLOW,
      baseUrl: process.env.SILICONFLOW_BASE_URL,
      apiKey: process.env.SILICONFLOW_API_KEY,
      model: 'deepseek-chat',
      timeout: 30000,
    });
  }
} 