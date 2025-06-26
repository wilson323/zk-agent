/**
 * AI模型API路由错误处理测试
 * 测试AI模型管理端点的各种错误场景和恢复机制
 */

import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '@/app/api/ai-models/route';
import { GlobalErrorHandler } from '@/lib/middleware/global-error-handler';
import { AgentError, AgentErrorType, ErrorSeverity } from '@/lib/errors/agent-errors';

// Mock dependencies
jest.mock('../../../lib/services/ai-model-manager', () => ({
  listModels: jest.fn(),
  getModel: jest.fn(),
  createModel: jest.fn(),
  updateModel: jest.fn(),
  deleteModel: jest.fn(),
  validateModelConfig: jest.fn(),
  testModelConnection: jest.fn()
}));

jest.mock('../../../lib/auth/session', () => ({
  validateSession: jest.fn(),
  checkAdminPermissions: jest.fn()
}));

jest.mock('../../../lib/storage/model-registry', () => ({
  registerModel: jest.fn(),
  unregisterModel: jest.fn(),
  getModelMetadata: jest.fn()
}));

describe('AI Models API Error Handling', () => {
  let errorHandler: GlobalErrorHandler;

  beforeEach(() => {
    errorHandler = GlobalErrorHandler.getInstance();
    jest.clearAllMocks();
  });

  describe('GET /api/ai-models - List Models', () => {
    it('should handle database connection failure', async () => {
      const { listModels } = require('../../../lib/services/ai-model-manager');
      listModels.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/ai-models');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('Database connection failed');
    });

    it('should handle model registry service unavailable', async () => {
      const { listModels } = require('../../../lib/services/ai-model-manager');
      listModels.mockRejectedValue(new Error('Model registry service unavailable'));

      const request = new NextRequest('http://localhost:3000/api/ai-models');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error.message).toContain('Model registry service unavailable');
    });

    it('should handle pagination parameter validation errors', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai-models?page=-1&limit=abc');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid pagination parameters');
    });

    it('should handle authentication failure', async () => {
      const { validateSession } = require('../../../lib/auth/session');
      validateSession.mockRejectedValue(new Error('Invalid session'));

      const request = new NextRequest('http://localhost:3000/api/ai-models');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('AUTHENTICATION_ERROR');
    });
  });

  describe('POST /api/ai-models - Create Model', () => {
    let validModelData: any;

    beforeEach(() => {
      validModelData = {
        name: 'test-model',
        type: 'chat',
        provider: 'openai',
        config: {
          apiKey: 'test-key',
          model: 'gpt-3.5-turbo',
          maxTokens: 4096
        },
        description: 'Test model'
      };
    });

    it('should handle missing required fields', async () => {
      const invalidData = { name: 'test-model' }; // Missing required fields
      const request = new NextRequest('http://localhost:3000/api/ai-models', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.details).toContain('type');
      expect(data.error.details).toContain('provider');
    });

    it('should handle invalid model configuration', async () => {
      const { validateModelConfig } = require('../../../lib/services/ai-model-manager');
      validateModelConfig.mockRejectedValue(new Error('Invalid API key format'));

      const request = new NextRequest('http://localhost:3000/api/ai-models', {
        method: 'POST',
        body: JSON.stringify(validModelData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('Invalid API key format');
    });

    it('should handle model connection test failure', async () => {
      const { testModelConnection } = require('../../../lib/services/ai-model-manager');
      testModelConnection.mockRejectedValue(new Error('Connection test failed: Invalid credentials'));

      const request = new NextRequest('http://localhost:3000/api/ai-models', {
        method: 'POST',
        body: JSON.stringify(validModelData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('Connection test failed');
    });

    it('should handle duplicate model name', async () => {
      const { createModel } = require('../../../lib/services/ai-model-manager');
      createModel.mockRejectedValue(new Error('Model name already exists'));

      const request = new NextRequest('http://localhost:3000/api/ai-models', {
        method: 'POST',
        body: JSON.stringify(validModelData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error.message).toContain('Model name already exists');
    });

    it('should handle insufficient admin permissions', async () => {
      const { checkAdminPermissions } = require('../../../lib/auth/session');
      checkAdminPermissions.mockRejectedValue(new Error('Admin permissions required'));

      const request = new NextRequest('http://localhost:3000/api/ai-models', {
        method: 'POST',
        body: JSON.stringify(validModelData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AUTHORIZATION_ERROR');
    });

    it('should handle model registry registration failure', async () => {
      const { registerModel } = require('../../../lib/storage/model-registry');
      registerModel.mockRejectedValue(new Error('Registry service unavailable'));

      const request = new NextRequest('http://localhost:3000/api/ai-models', {
        method: 'POST',
        body: JSON.stringify(validModelData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error.message).toContain('Registry service unavailable');
    });

    it('should handle malformed JSON request', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai-models', {
        method: 'POST',
        body: '{invalid json}',
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid JSON');
    });
  });

  describe('PUT /api/ai-models/[id] - Update Model', () => {
    it('should handle model not found', async () => {
      const { getModel } = require('../../../lib/services/ai-model-manager');
      getModel.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/ai-models/nonexistent-id', {
        method: 'PUT',
        body: JSON.stringify({ name: 'updated-name' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(data.error.message).toContain('Model not found');
    });

    it('should handle invalid model ID format', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai-models/invalid-id-format', {
        method: 'PUT',
        body: JSON.stringify({ name: 'updated-name' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('Invalid model ID format');
    });

    it('should handle model in use error', async () => {
      const { updateModel } = require('../../../lib/services/ai-model-manager');
      updateModel.mockRejectedValue(new Error('Cannot update model: currently in use'));

      const request = new NextRequest('http://localhost:3000/api/ai-models/model-123', {
        method: 'PUT',
        body: JSON.stringify({ name: 'updated-name' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error.message).toContain('currently in use');
    });

    it('should handle configuration validation failure', async () => {
      const { validateModelConfig } = require('../../../lib/services/ai-model-manager');
      validateModelConfig.mockRejectedValue(new Error('Invalid configuration: missing required parameter'));

      const request = new NextRequest('http://localhost:3000/api/ai-models/model-123', {
        method: 'PUT',
        body: JSON.stringify({ config: { invalidParam: 'value' } }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('Invalid configuration');
    });
  });

  describe('DELETE /api/ai-models/[id] - Delete Model', () => {
    it('should handle model not found', async () => {
      const { getModel } = require('../../../lib/services/ai-model-manager');
      getModel.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/ai-models/nonexistent-id', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    it('should handle model deletion with active dependencies', async () => {
      const { deleteModel } = require('../../../lib/services/ai-model-manager');
      deleteModel.mockRejectedValue(new Error('Cannot delete model: has active dependencies'));

      const request = new NextRequest('http://localhost:3000/api/ai-models/model-123', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error.message).toContain('has active dependencies');
    });

    it('should handle registry unregistration failure', async () => {
      const { unregisterModel } = require('../../../lib/storage/model-registry');
      unregisterModel.mockRejectedValue(new Error('Failed to unregister from registry'));

      const request = new NextRequest('http://localhost:3000/api/ai-models/model-123', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Failed to unregister');
    });

    it('should handle cascade deletion failure', async () => {
      const { deleteModel } = require('../../../lib/services/ai-model-manager');
      deleteModel.mockRejectedValue(new Error('Failed to delete associated resources'));

      const request = new NextRequest('http://localhost:3000/api/ai-models/model-123', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Failed to delete associated resources');
    });
  });

  describe('Provider-Specific Errors', () => {
    it('should handle OpenAI API key validation failure', async () => {
      const { testModelConnection } = require('../../../lib/services/ai-model-manager');
      testModelConnection.mockRejectedValue(new Error('OpenAI API key is invalid'));

      const request = new NextRequest('http://localhost:3000/api/ai-models', {
        method: 'POST',
        body: JSON.stringify({
          name: 'openai-model',
          type: 'chat',
          provider: 'openai',
          config: { apiKey: 'invalid-key' }
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('OpenAI API key is invalid');
    });

    it('should handle Azure OpenAI endpoint configuration error', async () => {
      const { testModelConnection } = require('../../../lib/services/ai-model-manager');
      testModelConnection.mockRejectedValue(new Error('Azure endpoint URL is invalid'));

      const request = new NextRequest('http://localhost:3000/api/ai-models', {
        method: 'POST',
        body: JSON.stringify({
          name: 'azure-model',
          type: 'chat',
          provider: 'azure-openai',
          config: { endpoint: 'invalid-url' }
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('Azure endpoint URL is invalid');
    });

    it('should handle Anthropic API quota exceeded', async () => {
      const { testModelConnection } = require('../../../lib/services/ai-model-manager');
      testModelConnection.mockRejectedValue(new Error('Anthropic API quota exceeded'));

      const request = new NextRequest('http://localhost:3000/api/ai-models', {
        method: 'POST',
        body: JSON.stringify({
          name: 'claude-model',
          type: 'chat',
          provider: 'anthropic',
          config: { apiKey: 'test-key' }
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error.message).toContain('API quota exceeded');
    });
  });

  describe('Rate Limiting and Throttling', () => {
    it('should handle rate limit exceeded for model operations', async () => {
      // Simulate multiple rapid requests
      const requests = Array.from({ length: 10 }, () => 
        new NextRequest('http://localhost:3000/api/ai-models', {
          method: 'POST',
          body: JSON.stringify({ name: 'test-model', type: 'chat', provider: 'openai' }),
          headers: { 'Content-Type': 'application/json' }
        })
      );

      const responses = await Promise.all(requests.map(req => POST(req)));
      const rateLimitedResponses = responses.filter(res => res.status === 429);

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should include retry-after header in rate limit response', async () => {
      const { createModel } = require('../../../lib/services/ai-model-manager');
      createModel.mockRejectedValue(new Error('Rate limit exceeded'));

      const request = new NextRequest('http://localhost:3000/api/ai-models', {
        method: 'POST',
        body: JSON.stringify({ name: 'test-model', type: 'chat', provider: 'openai' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);

      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBeDefined();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent model creation conflicts', async () => {
      const { createModel } = require('../../../lib/services/ai-model-manager');
      createModel.mockRejectedValue(new Error('Concurrent modification detected'));

      const request = new NextRequest('http://localhost:3000/api/ai-models', {
        method: 'POST',
        body: JSON.stringify({ name: 'test-model', type: 'chat', provider: 'openai' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error.message).toContain('Concurrent modification detected');
    });

    it('should handle database lock timeout', async () => {
      const { updateModel } = require('../../../lib/services/ai-model-manager');
      updateModel.mockRejectedValue(new Error('Database lock timeout'));

      const request = new NextRequest('http://localhost:3000/api/ai-models/model-123', {
        method: 'PUT',
        body: JSON.stringify({ name: 'updated-name' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(408);
      expect(data.error.message).toContain('Database lock timeout');
    });
  });

  describe('Error Recovery and Cleanup', () => {
    it('should clean up partial model creation on failure', async () => {
      const { createModel, deleteModel } = require('../../../lib/services/ai-model-manager');
      createModel.mockRejectedValue(new Error('Creation failed after partial setup'));

      const request = new NextRequest('http://localhost:3000/api/ai-models', {
        method: 'POST',
        body: JSON.stringify({ name: 'test-model', type: 'chat', provider: 'openai' }),
        headers: { 'Content-Type': 'application/json' }
      });

      await POST(request);

      // Verify cleanup was attempted
      expect(deleteModel).toHaveBeenCalled();
    });

    it('should provide recovery suggestions in error response', async () => {
      const { testModelConnection } = require('../../../lib/services/ai-model-manager');
      testModelConnection.mockRejectedValue(new Error('Network timeout'));

      const request = new NextRequest('http://localhost:3000/api/ai-models', {
        method: 'POST',
        body: JSON.stringify({ name: 'test-model', type: 'chat', provider: 'openai' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.error.recovery).toBeDefined();
      expect(data.error.recovery.suggestions).toContain('Check network connectivity');
    });
  });

  describe('Monitoring and Metrics', () => {
    it('should track error metrics for model operations', async () => {
      const { createModel } = require('../../../lib/services/ai-model-manager');
      createModel.mockRejectedValue(new Error('Test error'));

      const request = new NextRequest('http://localhost:3000/api/ai-models', {
        method: 'POST',
        body: JSON.stringify({ name: 'test-model', type: 'chat', provider: 'openai' }),
        headers: { 'Content-Type': 'application/json' }
      });

      await POST(request);

      const stats = errorHandler.getErrorStats();
      expect(stats.errorCount).toBeGreaterThan(0);
    });

    it('should include correlation ID in error responses', async () => {
      const { createModel } = require('../../../lib/services/ai-model-manager');
      createModel.mockRejectedValue(new Error('Test error'));

      const request = new NextRequest('http://localhost:3000/api/ai-models', {
        method: 'POST',
        body: JSON.stringify({ name: 'test-model', type: 'chat', provider: 'openai' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.error.correlationId).toBeDefined();
      expect(typeof data.error.correlationId).toBe('string');
    });
  });
});