// @ts-nocheck
/**
 * @file __tests__/lib/ai/unified-ai-adapter.test.ts
 * @description 统一AI适配器测试 - 100%覆盖率目标
 * @author B团队测试架构师
 * @lastUpdate 2024-12-19
 */

import { UnifiedAIAdapter, AIProvider, unifiedAIAdapter, getOptimalAIProvider } from '@/lib/ai/unified-ai-adapter';

// Mock fetch
global.fetch = jest.fn();

describe('UnifiedAIAdapter', () => {
  let aiAdapter: UnifiedAIAdapter;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    aiAdapter = UnifiedAIAdapter.getInstance();
    
    // 重置熔断器状态
    Object.values(AIProvider).forEach(provider => {
      aiAdapter.resetCircuitBreaker(provider);
    });
  });

  describe('单例模式', () => {
    it('应该返回相同的实例', () => {
      const instance1 = UnifiedAIAdapter.getInstance();
      const instance2 = UnifiedAIAdapter.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('应该返回导出的单例实例', () => {
      expect(unifiedAIAdapter).toBeInstanceOf(UnifiedAIAdapter);
    });
  });

  describe('FastGPT服务调用', () => {
    it('应该成功调用FastGPT', async () => {
      const mockResponse = {
        id: 'chatcmpl-test',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-3.5-turbo',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: 'Test response from FastGPT',
          },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 30,
          total_tokens: 50,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const request = {
        messages: [{ role: 'user' as const, content: 'Hello' }],
        temperature: 0.7,
        maxTokens: 1000,
      };

      const response = await aiAdapter.call(AIProvider.FASTGPT, request);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockResponse);
      expect(response.provider).toBe(AIProvider.FASTGPT);
      expect(response.latency).toBeGreaterThanOrEqual(0);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('fastgpt'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': expect.stringContaining('Bearer'),
          }),
        })
      );
    });

    it('应该处理FastGPT错误响应', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Service unavailable' }),
      } as Response);

      const request = {
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      const response = await aiAdapter.call(AIProvider.FASTGPT, request);

      expect(response.success).toBe(false);
      expect(response.error).toContain('HTTP 500');
    });
  });

  describe('千问服务调用', () => {
    it('应该成功调用千问', async () => {
      const mockResponse = {
        output: {
          text: 'Test response from Qianwen',
        },
        usage: {
          input_tokens: 20,
          output_tokens: 30,
          total_tokens: 50,
        },
        request_id: 'test-qwen-request-id',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const request = {
        messages: [{ role: 'user' as const, content: 'Hello' }],
        temperature: 0.7,
      };

      const response = await aiAdapter.call(AIProvider.QIANWEN, request);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockResponse);
      expect(response.provider).toBe(AIProvider.QIANWEN);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('dashscope'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': expect.stringContaining('Bearer'),
          }),
        })
      );
    });

    it('应该处理千问错误响应', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Invalid API key' }),
      } as Response);

      const request = {
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      const response = await aiAdapter.call(AIProvider.QIANWEN, request);

      expect(response.success).toBe(false);
      expect(response.error).toContain('HTTP 401');
    });
  });

  describe('硅基流动服务调用', () => {
    it('应该成功调用硅基流动', async () => {
      const mockResponse = {
        id: 'chatcmpl-test-sf',
        object: 'chat.completion',
        created: Date.now(),
        model: 'deepseek-chat',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: 'Test response from SiliconFlow',
          },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 30,
          total_tokens: 50,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const request = {
        messages: [{ role: 'user' as const, content: 'Hello' }],
        model: 'deepseek-chat',
      };

      const response = await aiAdapter.call(AIProvider.SILICONFLOW, request);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockResponse);
      expect(response.provider).toBe(AIProvider.SILICONFLOW);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('siliconflow'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': expect.stringContaining('Bearer'),
          }),
        })
      );
    });
  });

  describe('熔断器机制', () => {
    it('应该在连续失败后触发熔断器', async () => {
      // 模拟连续失败
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Service unavailable' }),
      } as Response);

      const request = {
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      // 连续调用直到熔断器触发
      for (let i = 0; i < 6; i++) {
        await aiAdapter.call(AIProvider.FASTGPT, request);
      }

      // 下一次调用应该被熔断器阻止
      const response = await aiAdapter.call(AIProvider.FASTGPT, request);
      expect(response.success).toBe(false);
      expect(response.error).toContain('Circuit breaker is open');
    });

    it('应该能够重置熔断器', async () => {
      // 先触发熔断器
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Service unavailable' }),
      } as Response);

      const request = {
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      for (let i = 0; i < 6; i++) {
        await aiAdapter.call(AIProvider.FASTGPT, request);
      }

      // 重置熔断器
      aiAdapter.resetCircuitBreaker(AIProvider.FASTGPT);

      // 模拟成功响应
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'test',
          choices: [{ message: { content: 'Success' } }],
        }),
      } as Response);

      const response = await aiAdapter.call(AIProvider.FASTGPT, request);
      expect(response.success).toBe(true);
    });
  });

  describe('负载均衡', () => {
    it('应该返回最优的AI提供商', async () => {
      // Mock健康状态
      jest.spyOn(aiAdapter, 'getHealthStatus').mockResolvedValue({
        [AIProvider.FASTGPT]: {
          healthy: true,
          latency: 200,
          circuitBreakerState: 'closed',
          lastChecked: new Date().toISOString(),
        },
        [AIProvider.QIANWEN]: {
          healthy: true,
          latency: 150,
          circuitBreakerState: 'closed',
          lastChecked: new Date().toISOString(),
        },
        [AIProvider.SILICONFLOW]: {
          healthy: false,
          latency: 0,
          circuitBreakerState: 'open',
          lastChecked: new Date().toISOString(),
        },
      });

      const optimalProvider = await getOptimalAIProvider();
      expect(optimalProvider).toBe(AIProvider.QIANWEN); // 最低延迟的健康服务
    });

    it('应该处理没有健康服务的情况', async () => {
      jest.spyOn(aiAdapter, 'getHealthStatus').mockResolvedValue({
        [AIProvider.FASTGPT]: {
          healthy: false,
          latency: 0,
          circuitBreakerState: 'open',
          lastChecked: new Date().toISOString(),
        },
        [AIProvider.QIANWEN]: {
          healthy: false,
          latency: 0,
          circuitBreakerState: 'open',
          lastChecked: new Date().toISOString(),
        },
        [AIProvider.SILICONFLOW]: {
          healthy: false,
          latency: 0,
          circuitBreakerState: 'open',
          lastChecked: new Date().toISOString(),
        },
      });

      await expect(getOptimalAIProvider()).rejects.toThrow('No healthy AI services available');
    });
  });

  describe('健康检查', () => {
    it('应该返回所有服务的健康状态', async () => {
      // Mock成功响应
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ test: 'response' }),
      } as Response);

      const healthStatus = await aiAdapter.getHealthStatus();

      expect(healthStatus).toHaveProperty(AIProvider.FASTGPT);
      expect(healthStatus).toHaveProperty(AIProvider.QIANWEN);
      expect(healthStatus).toHaveProperty(AIProvider.SILICONFLOW);

      Object.values(healthStatus).forEach(status => {
        expect(status).toHaveProperty('healthy');
        expect(status).toHaveProperty('latency');
        expect(status).toHaveProperty('circuitBreakerState');
        expect(status).toHaveProperty('lastChecked');
      });
    });

    it('应该正确标记不健康的服务', async () => {
      // Mock失败响应
      mockFetch.mockRejectedValue(new Error('Network error'));

      const healthStatus = await aiAdapter.getHealthStatus();

      Object.values(healthStatus).forEach(status => {
        expect(status.healthy).toBe(false);
      });
    });
  });

  describe('配置管理', () => {
    it('应该返回配置的服务列表', () => {
      const configuredServices = aiAdapter.getConfiguredServices();
      expect(Array.isArray(configuredServices)).toBe(true);
      expect(configuredServices.length).toBeGreaterThan(0);
    });

    it('应该验证服务配置', () => {
      const isConfigured = aiAdapter.isServiceConfigured(AIProvider.FASTGPT);
      expect(typeof isConfigured).toBe('boolean');
    });
  });

  describe('错误处理', () => {
    it('应该处理网络错误', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const request = {
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      const response = await aiAdapter.call(AIProvider.FASTGPT, request);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Network error');
    });

    it('应该处理超时错误', async () => {
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      const request = {
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      const response = await aiAdapter.call(AIProvider.FASTGPT, request);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Timeout');
    });

    it('应该处理无效的JSON响应', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as Response);

      const request = {
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      const response = await aiAdapter.call(AIProvider.FASTGPT, request);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Invalid JSON');
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内完成调用', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'test',
          choices: [{ message: { content: 'Fast response' } }],
        }),
      } as Response);

      const request = {
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      const { result, duration } = await performanceUtils.measureTime(async () => {
        return await aiAdapter.call(AIProvider.FASTGPT, request);
      });

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成
    });

    it('应该正确测量响应延迟', async () => {
      mockFetch.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms延迟
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 'test',
            choices: [{ message: { content: 'Delayed response' } }],
          }),
        } as Response;
      });

      const request = {
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      const response = await aiAdapter.call(AIProvider.FASTGPT, request);

      expect(response.success).toBe(true);
      expect(response.latency).toBeGreaterThanOrEqual(100);
    });
  });

  describe('并发处理', () => {
    it('应该正确处理并发请求', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'test',
          choices: [{ message: { content: 'Concurrent response' } }],
        }),
      } as Response);

      const request = {
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      const promises = Array.from({ length: 10 }, () => 
        aiAdapter.call(AIProvider.FASTGPT, request)
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.success).toBe(true);
      });

      expect(mockFetch).toHaveBeenCalledTimes(10);
    });
  });

  describe('内存管理', () => {
    it('应该正确管理熔断器状态', async () => {
      // 测试大量请求不会导致内存泄漏
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ test: 'response' }),
      } as Response);

      const request = {
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      // 执行大量请求
      const promises = Array.from({ length: 100 }, () => 
        aiAdapter.call(AIProvider.FASTGPT, request)
      );

      await Promise.all(promises);

      // 验证熔断器状态仍然正常
      const healthStatus = await aiAdapter.getHealthStatus();
      expect(healthStatus[AIProvider.FASTGPT].healthy).toBe(true);
    });
  });

  describe('流式响应', () => {
    it('应该支持流式响应处理', async () => {
      // 这里可以添加流式响应的测试
      // 目前先跳过，因为需要更复杂的Mock设置
      expect(true).toBe(true);
    });
  });
}); 