// @ts-nocheck
/**
 * @file __tests__/mocks/handlers.ts
 * @description MSW处理器 - 模拟所有API端点
 * @author B团队测试架构师
 * @lastUpdate 2024-12-19
 */

import { http, HttpResponse } from 'msw';

export const handlers = [
  // 认证API
  http.post('/api/auth/login', () => {
    return HttpResponse.json({
      success: true,
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          username: 'testuser',
          role: 'USER',
        },
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
      },
    });
  }),

  http.post('/api/auth/register', () => {
    return HttpResponse.json({
      success: true,
      data: {
        user: {
          id: 'new-user-id',
          email: 'newuser@example.com',
          username: 'newuser',
          role: 'USER',
        },
      },
    });
  }),

  http.post('/api/auth/refresh', () => {
    return HttpResponse.json({
      success: true,
      data: {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      },
    });
  }),

  // 智能体API
  http.get('/api/v1/agents', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    return HttpResponse.json({
      success: true,
      data: {
        agents: Array.from({ length: limit }, (_, i) => ({
          id: `agent-${page}-${i + 1}`,
          name: `Test Agent ${page}-${i + 1}`,
          description: `Test agent description ${page}-${i + 1}`,
          systemPrompt: 'You are a test agent',
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          maxTokens: 1000,
          isPublic: true,
          createdBy: 'test-user-id',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),
        pagination: {
          page,
          limit,
          total: 100,
          totalPages: Math.ceil(100 / limit),
        },
      },
    });
  }),

  http.post('/api/v1/agents', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: {
        id: 'new-agent-id',
        ...body,
        createdBy: 'test-user-id',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  }),

  http.get('/api/v1/agents/:id', ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: {
        id: params.id,
        name: 'Test Agent',
        description: 'Test agent description',
        systemPrompt: 'You are a test agent',
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 1000,
        isPublic: true,
        createdBy: 'test-user-id',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  }),

  http.put('/api/v1/agents/:id', async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: {
        id: params.id,
        ...body,
        updatedAt: new Date().toISOString(),
      },
    });
  }),

  http.delete('/api/v1/agents/:id', ({ params }) => {
    return HttpResponse.json({
      success: true,
      message: `Agent ${params.id} deleted successfully`,
    });
  }),

  // 聊天API
  http.post('/api/ag-ui/chat', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: {
        id: 'test-message-id',
        content: 'This is a test response',
        role: 'assistant',
        timestamp: new Date().toISOString(),
        metadata: {
          model: 'gpt-3.5-turbo',
          tokens: 50,
          latency: 200,
        },
      },
    });
  }),

  // CAD分析API
  http.post('/api/cad/upload', () => {
    return HttpResponse.json({
      success: true,
      data: {
        fileId: 'test-file-id',
        filename: 'test.dwg',
        size: 1024000,
        status: 'uploaded',
        uploadedAt: new Date().toISOString(),
      },
    });
  }),

  http.post('/api/cad/analyze', () => {
    return HttpResponse.json({
      success: true,
      data: {
        analysisId: 'test-analysis-id',
        status: 'completed',
        result: {
          complexity: 75,
          errors: 2,
          warnings: 5,
          suggestions: [
            'Optimize geometry complexity',
            'Fix overlapping surfaces',
          ],
        },
        completedAt: new Date().toISOString(),
      },
    });
  }),

  // 海报生成API
  http.post('/api/poster/generate', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: {
        taskId: 'test-poster-task-id',
        status: 'generating',
        config: body,
        createdAt: new Date().toISOString(),
      },
    });
  }),

  http.get('/api/poster/history', () => {
    return HttpResponse.json({
      success: true,
      data: {
        posters: Array.from({ length: 10 }, (_, i) => ({
          id: `poster-${i + 1}`,
          title: `Test Poster ${i + 1}`,
          status: 'completed',
          createdAt: new Date().toISOString(),
        })),
        total: 10,
      },
    });
  }),

  // 管理员API
  http.get('/api/admin/users', () => {
    return HttpResponse.json({
      success: true,
      data: {
        users: Array.from({ length: 10 }, (_, i) => ({
          id: `user-${i + 1}`,
          email: `user${i + 1}@example.com`,
          username: `user${i + 1}`,
          role: i === 0 ? 'ADMIN' : 'USER',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
        })),
        total: 10,
      },
    });
  }),

  http.get('/api/admin/system-monitor', ({ request }) => {
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'overview';

    const responses = {
      overview: {
        timestamp: new Date().toISOString(),
        uptime: 3600,
        version: '1.0.0',
        environment: 'test',
        system: {
          status: 'healthy',
          services: 5,
          healthyServices: 5,
        },
        performance: {
          totalRequests: 1000,
          averageResponseTime: 150,
          currentQps: 50,
          errorRate: 0.1,
        },
        database: {
          connected: true,
          latency: 25,
          activeConnections: 5,
          cacheHitRate: 85,
        },
        ai: {
          totalProviders: 3,
          healthyProviders: 3,
        },
      },
      performance: {
        timestamp: new Date().toISOString(),
        api: {
          totalRequests: 1000,
          averageResponseTime: 150,
          currentQps: 50,
          errorRate: 0.1,
          uptime: 3600,
        },
        memory: {
          heapUsed: 50 * 1024 * 1024,
          heapTotal: 100 * 1024 * 1024,
          usage: 50,
        },
        cpu: {
          usage: 25,
          loadAverage: [0.5, 0.7, 0.8],
        },
      },
      health: {
        timestamp: new Date().toISOString(),
        overall: 'healthy',
        services: {
          database: { status: 'healthy', latency: 25 },
          'ai-fastgpt': { status: 'healthy', latency: 200 },
          'ai-qianwen': { status: 'healthy', latency: 180 },
          'ai-siliconflow': { status: 'healthy', latency: 220 },
        },
        checks: [
          { name: 'Database Connection', status: 'pass', latency: 25 },
          { name: 'Memory Usage', status: 'pass', usage: 50 },
          { name: 'Response Time', status: 'pass', value: 150 },
          { name: 'Error Rate', status: 'pass', value: 0.1 },
        ],
      },
    };

    return HttpResponse.json({
      success: true,
      data: responses[type] || responses.overview,
    });
  }),

  // AI服务API
  http.post('/api/fastgpt/chat', () => {
    return HttpResponse.json({
      success: true,
      data: {
        id: 'test-fastgpt-response',
        content: 'FastGPT test response',
        model: 'gpt-3.5-turbo',
        usage: {
          promptTokens: 20,
          completionTokens: 30,
          totalTokens: 50,
        },
      },
    });
  }),

  // 文件上传API
  http.post('/api/images/temp/:filename', () => {
    return HttpResponse.json({
      success: true,
      data: {
        url: 'https://example.com/temp/test-image.jpg',
        filename: 'test-image.jpg',
        size: 1024000,
        uploadedAt: new Date().toISOString(),
      },
    });
  }),

  // 健康检查API
  http.get('/api/health', () => {
    return HttpResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: 3600,
      version: '1.0.0',
    });
  }),

  // 错误处理测试
  http.get('/api/test/error', () => {
    return HttpResponse.json(
      { error: 'Test error' },
      { status: 500 }
    );
  }),

  // 延迟测试
  http.get('/api/test/slow', async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return HttpResponse.json({
      success: true,
      message: 'Slow response',
    });
  }),

  // 外部AI服务Mock
  http.post('https://api.fastgpt.test/v1/chat/completions', () => {
    return HttpResponse.json({
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
    });
  }),

  http.post('https://dashscope.test.com/api/v1/services/aigc/text-generation/generation', () => {
    return HttpResponse.json({
      output: {
        text: 'Test response from Qianwen',
      },
      usage: {
        input_tokens: 20,
        output_tokens: 30,
        total_tokens: 50,
      },
      request_id: 'test-qwen-request-id',
    });
  }),

  http.post('https://api.siliconflow.test/v1/chat/completions', () => {
    return HttpResponse.json({
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
    });
  }),
]; 