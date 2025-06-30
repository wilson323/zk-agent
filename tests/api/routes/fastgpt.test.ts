/**
 * @file fastgpt.test.ts
 * @description FastGPT相关API路由错误处理测试
 * @author ZK-Agent Team
 * @date 2025-01-27
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type { MockedFunction } from 'jest-mock';
import { NextRequest } from 'next/server';
import { POST as chatHandler } from '@/app/api/fastgpt/chat/route';
import { POST as testConnectionHandler } from '@/app/api/fastgpt/test-connection/route';
import { GET as healthHandler } from '@/app/api/fastgpt/health/route';
import { POST as initChatHandler } from '@/app/api/fastgpt/init-chat/route';
import { POST as feedbackHandler } from '@/app/api/fastgpt/feedback/route';
import { GlobalErrorHandler } from '@/lib/middleware/global-error-handler';

// Mock fetch globally
global.fetch = jest.fn() as MockedFunction<typeof fetch>;

describe('FastGPT API Routes Error Handling', () => {
  let errorHandler: GlobalErrorHandler;

  beforeEach(() => {
    errorHandler = GlobalErrorHandler.getInstance();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up test state
  });

  describe('Chat Route (/api/fastgpt/chat)', () => {
    it('should handle missing API key error', async () => {
      // Mock missing API key
      const originalApiKey = process.env['FASTGPT_API_KEY'];
      delete process.env['FASTGPT_API_KEY'];

      try {
        const request = new NextRequest('http://localhost:3000/api/fastgpt/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: 'Hello' }]
          })
        });

        const response = await chatHandler(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBeDefined();
        expect(data.code).toBe('CONFIGURATION_ERROR');
      } finally {
        if (originalApiKey) {
          process.env['FASTGPT_API_KEY'] = originalApiKey;
        }
      }
    });

    it('should handle invalid message format error', async () => {
      const request = new NextRequest('http://localhost:3000/api/fastgpt/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: 'invalid format'
        })
      });

      const response = await chatHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('should handle FastGPT API timeout error', async () => {
      // Mock fetch to simulate timeout
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      const request = new NextRequest('http://localhost:3000/api/fastgpt/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }]
        })
      });

      const response = await chatHandler(request);
      const data = await response.json();

      expect(response.status).toBe(504);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('TIMEOUT_ERROR');
    });

    it('should handle FastGPT API rate limit error', async () => {
      // Mock fetch to simulate rate limit
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ error: 'Rate limit exceeded' })
      } as Response);

      const request = new NextRequest('http://localhost:3000/api/fastgpt/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }]
        })
      });

      const response = await chatHandler(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('RATE_LIMIT_ERROR');
    });

    it('should handle FastGPT API server error', async () => {
      // Mock fetch to simulate server error
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' })
      } as Response);

      const request = new NextRequest('http://localhost:3000/api/fastgpt/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }]
        })
      });

      const response = await chatHandler(request);
      const data = await response.json();

      expect(response.status).toBe(502);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('EXTERNAL_API_ERROR');
    });
  });

  describe('Test Connection Route (/api/fastgpt/test-connection)', () => {
    it('should handle missing base URL error', async () => {
      const request = new NextRequest('http://localhost:3000/api/fastgpt/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          useProxy: false
        })
      });

      const response = await testConnectionHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('should handle invalid URL format error', async () => {
      const request = new NextRequest('http://localhost:3000/api/fastgpt/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: 'invalid-url',
          useProxy: false
        })
      });

      const response = await testConnectionHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('should handle connection refused error', async () => {
      // Mock fetch to simulate connection refused
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

      const request = new NextRequest('http://localhost:3000/api/fastgpt/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: 'https://unreachable-server.com',
          useProxy: false
        })
      });

      const response = await testConnectionHandler(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('CONNECTION_ERROR');
    });
  });

  describe('Health Route (/api/fastgpt/health)', () => {
    it('should handle service unavailable error', async () => {
      // Mock fetch to simulate service unavailable
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.resolve({ error: 'Service unavailable' })
      }) as Response;

      const request = new NextRequest('http://localhost:3000/api/fastgpt/health', {
        method: 'GET'
      });

      const response = await healthHandler(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('SERVICE_UNAVAILABLE');
    });
  });

  describe('Init Chat Route (/api/fastgpt/init-chat)', () => {
    it('should handle missing chat configuration error', async () => {
      const request = new NextRequest('http://localhost:3000/api/fastgpt/init-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const response = await initChatHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Feedback Route (/api/fastgpt/feedback)', () => {
    it('should handle missing feedback data error', async () => {
      const request = new NextRequest('http://localhost:3000/api/fastgpt/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const response = await feedbackHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('should handle invalid rating value error', async () => {
      const request = new NextRequest('http://localhost:3000/api/fastgpt/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: 10, // Invalid rating (should be 1-5)
          comment: 'Test feedback'
        })
      });

      const response = await feedbackHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Error Recovery and Retry Logic', () => {
    it('should implement exponential backoff for retries', async () => {
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      }) as MockedFunction<typeof fetch>;

      const request = new NextRequest('http://localhost:3000/api/fastgpt/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }]
        })
      });

      const response = await chatHandler(request);
      
      expect(callCount).toBe(3);
      expect(response.status).toBe(200);
    });

    it('should fallback to cached response on API failure', async () => {
      // Mock persistent API failure
      global.fetch = jest.fn().mockRejectedValue(new Error('API unavailable')) as MockedFunction<typeof fetch>;

      const request = new NextRequest('http://localhost:3000/api/fastgpt/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }]
        })
      });

      const response = await chatHandler(request);
      const data = await response.json();

      // Should return fallback response instead of error
      expect(response.status).toBe(200);
      expect(data.fallback).toBe(true);
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should open circuit breaker after consecutive failures', async () => {
      // Configure low threshold for testing
      const originalThreshold = (errorHandler as any).errorThreshold;
      Object.defineProperty(errorHandler, 'errorThreshold', { value: 2, writable: true, configurable: true });

      try {
        // Mock persistent failures
        global.fetch = jest.fn().mockRejectedValue(new Error('API failure')) as MockedFunction<typeof fetch>;

        // Trigger multiple failures
        for (let i = 0; i < 3; i++) {
          const request = new NextRequest('http://localhost:3000/api/fastgpt/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [{ role: 'user', content: 'Hello' }]
            })
          });
          await chatHandler(request).catch(() => {});
        }

        expect(errorHandler.isCircuitBreakerOpen()).toBe(true);
      } finally {
        Object.defineProperty(errorHandler, 'errorThreshold', { value: originalThreshold, writable: true, configurable: true });
      }
    });

    it('should return circuit breaker response when open', async () => {
      // Open circuit breaker
      Object.defineProperty(errorHandler, 'circuitBreakerOpen', { value: true, writable: true, configurable: true });

      const request = new NextRequest('http://localhost:3000/api/fastgpt/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }]
        })
      });

      const response = await chatHandler(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('CIRCUIT_BREAKER_OPEN');
    });
  });
});