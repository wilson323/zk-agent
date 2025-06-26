/**
 * 代理API路由错误处理测试
 * 测试代理服务、请求转发、响应处理等各种错误场景
 */

import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '@/app/api/proxy/route';
// import { GlobalErrorHandler } from '../../../lib/middleware/global-error-handler';
// import { AgentError, AgentErrorType, ErrorSeverity } from '@/lib/errors/agent-errors';

// Mock dependencies
jest.mock('../../../lib/services/proxy-manager', () => ({
  forwardRequest: jest.fn(),
  validateProxyTarget: jest.fn(),
  checkProxyPermissions: jest.fn(),
  transformRequest: jest.fn(),
  transformResponse: jest.fn(),
  getProxyConfiguration: jest.fn(),
  updateProxyRules: jest.fn(),
  logProxyActivity: jest.fn()
}));

jest.mock('../../../lib/security/proxy-security', () => ({
  validateTargetUrl: jest.fn(),
  checkRateLimits: jest.fn(),
  sanitizeHeaders: jest.fn(),
  validateRequestBody: jest.fn(),
  checkBlacklist: jest.fn(),
  enforceSecurityPolicies: jest.fn()
}));

jest.mock('../../../lib/cache/proxy-cache', () => ({
  getCachedResponse: jest.fn(),
  setCachedResponse: jest.fn(),
  invalidateCache: jest.fn(),
  checkCachePolicy: jest.fn()
}));

jest.mock('../../../lib/auth/session', () => ({
  validateSession: jest.fn(),
  checkProxyPermissions: jest.fn()
}));

describe('Proxy API Error Handling', () => {
  let errorHandler: any;

  beforeEach(() => {
    // errorHandler = GlobalErrorHandler.getInstance();
    errorHandler = { errorCount: 0, circuitBreakerOpen: false };
    jest.clearAllMocks();
  });

  describe('GET /api/proxy - Forward GET Requests', () => {
    it('should handle invalid target URL', async () => {
      const { validateTargetUrl } = require('../../../lib/security/proxy-security');
      validateTargetUrl.mockRejectedValue(new Error('Invalid target URL format'));

      const request = new NextRequest('http://localhost:3000/api/proxy?target=invalid-url');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid target URL format');
    });

    it('should handle missing target parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/proxy');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Target URL is required');
    });

    it('should handle blacklisted target URL', async () => {
      const { checkBlacklist } = require('../../../lib/security/proxy-security');
      checkBlacklist.mockRejectedValue(new Error('Target URL is blacklisted'));

      const request = new NextRequest('http://localhost:3000/api/proxy?target=https://blacklisted.com');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AUTHORIZATION_ERROR');
      expect(data.error.message).toContain('Target URL is blacklisted');
    });

    it('should handle proxy rate limit exceeded', async () => {
      const { checkRateLimits } = require('../../../lib/security/proxy-security');
      checkRateLimits.mockRejectedValue(new Error('Proxy rate limit exceeded'));

      const request = new NextRequest('http://localhost:3000/api/proxy?target=https://api.example.com');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error.code).toBe('RATE_LIMIT_ERROR');
      expect(data.error.message).toContain('Proxy rate limit exceeded');
    });

    it('should handle target server connection timeout', async () => {
      const { forwardRequest } = require('../../../lib/services/proxy-manager');
      forwardRequest.mockRejectedValue(new Error('Connection timeout to target server'));

      const request = new NextRequest('http://localhost:3000/api/proxy?target=https://slow.example.com');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(504); // Gateway timeout
      expect(data.error.message).toContain('Connection timeout to target server');
    });

    it('should handle target server unavailable', async () => {
      const { forwardRequest } = require('../../../lib/services/proxy-manager');
      forwardRequest.mockRejectedValue(new Error('Target server unavailable'));

      const request = new NextRequest('http://localhost:3000/api/proxy?target=https://down.example.com');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(502); // Bad gateway
      expect(data.error.message).toContain('Target server unavailable');
    });

    it('should handle DNS resolution failure', async () => {
      const { forwardRequest } = require('../../../lib/services/proxy-manager');
      forwardRequest.mockRejectedValue(new Error('DNS resolution failed for target'));

      const request = new NextRequest('http://localhost:3000/api/proxy?target=https://nonexistent.example.com');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(502);
      expect(data.error.message).toContain('DNS resolution failed');
    });

    it('should handle SSL certificate verification failure', async () => {
      const { forwardRequest } = require('../../../lib/services/proxy-manager');
      forwardRequest.mockRejectedValue(new Error('SSL certificate verification failed'));

      const request = new NextRequest('http://localhost:3000/api/proxy?target=https://invalid-ssl.example.com');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(502);
      expect(data.error.message).toContain('SSL certificate verification failed');
    });

    it('should handle insufficient proxy permissions', async () => {
      const { checkProxyPermissions } = require('../../../lib/auth/session');
      checkProxyPermissions.mockRejectedValue(new Error('Insufficient proxy permissions'));

      const request = new NextRequest('http://localhost:3000/api/proxy?target=https://restricted.example.com', {
        headers: { 'Authorization': 'Bearer user-token' }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AUTHORIZATION_ERROR');
    });

    it('should handle proxy configuration not found', async () => {
      const { getProxyConfiguration } = require('../../../lib/services/proxy-manager');
      getProxyConfiguration.mockRejectedValue(new Error('Proxy configuration not found'));

      const request = new NextRequest('http://localhost:3000/api/proxy?target=https://unconfigured.example.com');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(data.error.message).toContain('Proxy configuration not found');
    });
  });

  describe('POST /api/proxy - Forward POST Requests', () => {
    let validRequestBody: any;

    beforeEach(() => {
      validRequestBody = {
        target: 'https://api.example.com/data',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer target-token'
        },
        body: {
          data: 'test data'
        }
      };
    });

    it('should handle invalid request body format', async () => {
      const { validateRequestBody } = require('../../../lib/security/proxy-security');
      validateRequestBody.mockRejectedValue(new Error('Invalid request body format'));

      const invalidBody = 'invalid json';
      const request = new NextRequest('http://localhost:3000/api/proxy', {
        method: 'POST',
        body: invalidBody,
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid request body format');
    });

    it('should handle malicious headers injection', async () => {
      const { sanitizeHeaders } = require('../../../lib/security/proxy-security');
      sanitizeHeaders.mockRejectedValue(new Error('Malicious headers detected'));

      const maliciousBody = {
        ...validRequestBody,
        headers: {
          'X-Forwarded-For': '127.0.0.1; rm -rf /',
          'Host': 'evil.com'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/proxy', {
        method: 'POST',
        body: JSON.stringify(maliciousBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('Malicious headers detected');
    });

    it('should handle request body size limit exceeded', async () => {
      const { validateRequestBody } = require('../../../lib/security/proxy-security');
      validateRequestBody.mockRejectedValue(new Error('Request body size limit exceeded'));

      const largeBody = {
        ...validRequestBody,
        body: 'x'.repeat(10 * 1024 * 1024) // 10MB
      };

      const request = new NextRequest('http://localhost:3000/api/proxy', {
        method: 'POST',
        body: JSON.stringify(largeBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(413); // Payload too large
      expect(data.error.message).toContain('Request body size limit exceeded');
    });

    it('should handle target server authentication failure', async () => {
      const { forwardRequest } = require('../../../lib/services/proxy-manager');
      forwardRequest.mockRejectedValue(new Error('Target server authentication failed'));

      const request = new NextRequest('http://localhost:3000/api/proxy', {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.message).toContain('Target server authentication failed');
    });

    it('should handle target server validation error', async () => {
      const { forwardRequest } = require('../../../lib/services/proxy-manager');
      forwardRequest.mockRejectedValue(new Error('Target server validation error: Invalid data format'));

      const invalidDataBody = {
        ...validRequestBody,
        body: { invalid: 'data' }
      };

      const request = new NextRequest('http://localhost:3000/api/proxy', {
        method: 'POST',
        body: JSON.stringify(invalidDataBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('Target server validation error');
    });

    it('should handle request transformation failure', async () => {
      const { transformRequest } = require('../../../lib/services/proxy-manager');
      transformRequest.mockRejectedValue(new Error('Request transformation failed'));

      const request = new NextRequest('http://localhost:3000/api/proxy', {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Request transformation failed');
    });

    it('should handle response transformation failure', async () => {
      const { transformResponse } = require('../../../lib/services/proxy-manager');
      transformResponse.mockRejectedValue(new Error('Response transformation failed'));

      const request = new NextRequest('http://localhost:3000/api/proxy', {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Response transformation failed');
    });

    it('should handle concurrent proxy request limit', async () => {
      const { forwardRequest } = require('../../../lib/services/proxy-manager');
      forwardRequest.mockRejectedValue(new Error('Concurrent proxy request limit exceeded'));

      const request = new NextRequest('http://localhost:3000/api/proxy', {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error.message).toContain('Concurrent proxy request limit exceeded');
    });
  });

  describe('PUT /api/proxy/config - Update Proxy Configuration', () => {
    let validProxyConfig: any;

    beforeEach(() => {
      validProxyConfig = {
        rules: [
          {
            pattern: '/api/external/*',
            target: 'https://external-api.example.com',
            methods: ['GET', 'POST'],
            headers: {
              'X-API-Key': 'secret-key'
            },
            timeout: 30000,
            retries: 3
          }
        ],
        security: {
          rateLimits: {
            requests: 100,
            window: 3600
          },
          blacklist: ['malicious.com'],
          whitelist: ['trusted.com']
        }
      };
    });

    it('should handle invalid proxy configuration format', async () => {
      const { updateProxyRules } = require('../../../lib/services/proxy-manager');
      updateProxyRules.mockRejectedValue(new Error('Invalid proxy configuration format'));

      const invalidConfig = { rules: 'invalid' };
      const request = new NextRequest('http://localhost:3000/api/proxy/config', {
        method: 'PUT',
        body: JSON.stringify(invalidConfig),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid proxy configuration format');
    });

    it('should handle conflicting proxy rules', async () => {
      const { updateProxyRules } = require('../../../lib/services/proxy-manager');
      updateProxyRules.mockRejectedValue(new Error('Conflicting proxy rules detected'));

      const conflictingConfig = {
        rules: [
          { pattern: '/api/*', target: 'https://api1.example.com' },
          { pattern: '/api/*', target: 'https://api2.example.com' }
        ]
      };

      const request = new NextRequest('http://localhost:3000/api/proxy/config', {
        method: 'PUT',
        body: JSON.stringify(conflictingConfig),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error.message).toContain('Conflicting proxy rules detected');
    });

    it('should handle invalid target URL in configuration', async () => {
      const { updateProxyRules } = require('../../../lib/services/proxy-manager');
      updateProxyRules.mockRejectedValue(new Error('Invalid target URL in proxy rule'));

      const invalidTargetConfig = {
        rules: [
          { pattern: '/api/*', target: 'invalid-url' }
        ]
      };

      const request = new NextRequest('http://localhost:3000/api/proxy/config', {
        method: 'PUT',
        body: JSON.stringify(invalidTargetConfig),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('Invalid target URL in proxy rule');
    });

    it('should handle proxy configuration save failure', async () => {
      const { updateProxyRules } = require('../../../lib/services/proxy-manager');
      updateProxyRules.mockRejectedValue(new Error('Failed to save proxy configuration'));

      const request = new NextRequest('http://localhost:3000/api/proxy/config', {
        method: 'PUT',
        body: JSON.stringify(validProxyConfig),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Failed to save proxy configuration');
    });

    it('should handle insufficient permissions for configuration update', async () => {
      const { checkProxyPermissions } = require('../../../lib/auth/session');
      checkProxyPermissions.mockRejectedValue(new Error('Admin permissions required for proxy configuration'));

      const request = new NextRequest('http://localhost:3000/api/proxy/config', {
        method: 'PUT',
        body: JSON.stringify(validProxyConfig),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AUTHORIZATION_ERROR');
    });
  });

  describe('DELETE /api/proxy/cache - Clear Proxy Cache', () => {
    it('should handle cache invalidation failure', async () => {
      const { invalidateCache } = require('../../../lib/cache/proxy-cache');
      invalidateCache.mockRejectedValue(new Error('Cache invalidation failed'));

      const request = new NextRequest('http://localhost:3000/api/proxy/cache', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Cache invalidation failed');
    });

    it('should handle cache service unavailable', async () => {
      const { invalidateCache } = require('../../../lib/cache/proxy-cache');
      invalidateCache.mockRejectedValue(new Error('Cache service unavailable'));

      const request = new NextRequest('http://localhost:3000/api/proxy/cache', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error.message).toContain('Cache service unavailable');
    });

    it('should handle partial cache invalidation', async () => {
      const { invalidateCache } = require('../../../lib/cache/proxy-cache');
      invalidateCache.mockRejectedValue(new Error('Partial cache invalidation: some entries could not be cleared'));

      const request = new NextRequest('http://localhost:3000/api/proxy/cache?pattern=/api/external/*', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(207); // Multi-status
      expect(data.error.message).toContain('Partial cache invalidation');
    });
  });

  describe('Proxy Security Enforcement', () => {
    it('should handle security policy violation', async () => {
      const { enforceSecurityPolicies } = require('../../../lib/security/proxy-security');
      enforceSecurityPolicies.mockRejectedValue(new Error('Security policy violation: SSRF attempt detected'));

      const request = new NextRequest('http://localhost:3000/api/proxy?target=http://localhost:22');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.message).toContain('Security policy violation');
    });

    it('should handle suspicious request pattern', async () => {
      const { enforceSecurityPolicies } = require('../../../lib/security/proxy-security');
      enforceSecurityPolicies.mockRejectedValue(new Error('Suspicious request pattern detected'));

      const request = new NextRequest('http://localhost:3000/api/proxy?target=https://api.example.com/../../../etc/passwd');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.message).toContain('Suspicious request pattern detected');
    });

    it('should handle IP address restriction violation', async () => {
      const { enforceSecurityPolicies } = require('../../../lib/security/proxy-security');
      enforceSecurityPolicies.mockRejectedValue(new Error('IP address not allowed for proxy requests'));

      const request = new NextRequest('http://localhost:3000/api/proxy?target=https://restricted.example.com', {
        headers: { 'X-Forwarded-For': '192.168.1.100' }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.message).toContain('IP address not allowed');
    });
  });

  describe('Proxy Cache Management', () => {
    it('should handle cache policy validation failure', async () => {
      const { checkCachePolicy } = require('../../../lib/cache/proxy-cache');
      checkCachePolicy.mockRejectedValue(new Error('Invalid cache policy for target'));

      const request = new NextRequest('http://localhost:3000/api/proxy?target=https://no-cache.example.com');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('Invalid cache policy');
    });

    it('should handle cache storage failure', async () => {
      const { setCachedResponse } = require('../../../lib/cache/proxy-cache');
      setCachedResponse.mockRejectedValue(new Error('Cache storage failure'));

      const request = new NextRequest('http://localhost:3000/api/proxy?target=https://cacheable.example.com');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Cache storage failure');
    });

    it('should handle corrupted cache data', async () => {
      const { getCachedResponse } = require('../../../lib/cache/proxy-cache');
      getCachedResponse.mockRejectedValue(new Error('Corrupted cache data detected'));

      const request = new NextRequest('http://localhost:3000/api/proxy?target=https://cached.example.com');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Corrupted cache data detected');
    });
  });

  describe('Proxy Activity Logging', () => {
    it('should handle logging service failure', async () => {
      const { logProxyActivity } = require('../../../lib/services/proxy-manager');
      logProxyActivity.mockRejectedValue(new Error('Proxy activity logging failed'));

      const request = new NextRequest('http://localhost:3000/api/proxy?target=https://api.example.com');
      const response = await GET(request);
      const data = await response.json();

      // Should not fail the main request, but log the tracking error
      expect(response.status).not.toBe(500);
      expect(data).toBeDefined();
    });

    it('should handle log storage capacity exceeded', async () => {
      const { logProxyActivity } = require('../../../lib/services/proxy-manager');
      logProxyActivity.mockRejectedValue(new Error('Log storage capacity exceeded'));

      const request = new NextRequest('http://localhost:3000/api/proxy?target=https://api.example.com');
      await GET(request);

      // Should continue processing despite logging failure
      expect(logProxyActivity).toHaveBeenCalled();
    });
  });

  describe('Error Recovery and Monitoring', () => {
    it('should provide proxy operation recovery suggestions', async () => {
      const { forwardRequest } = require('../../../lib/services/proxy-manager');
      forwardRequest.mockRejectedValue(new Error('Temporary proxy service outage'));

      const request = new NextRequest('http://localhost:3000/api/proxy?target=https://api.example.com');
      const response = await GET(request);
      const data = await response.json();

      expect(data.error.recovery).toBeDefined();
      expect(data.error.recovery.suggestions).toContain('Retry proxy request');
    });

    it('should track proxy operation performance', async () => {
      const { forwardRequest } = require('../../../lib/services/proxy-manager');
      forwardRequest.mockRejectedValue(new Error('Test error'));

      const request = new NextRequest('http://localhost:3000/api/proxy?target=https://api.example.com');
      await GET(request);

      const stats = errorHandler.getErrorStats();
      expect(stats.errorCount).toBeGreaterThan(0);
    });

    it('should include proxy context in error responses', async () => {
      const { forwardRequest } = require('../../../lib/services/proxy-manager');
      forwardRequest.mockRejectedValue(new Error('Test error'));

      const request = new NextRequest('http://localhost:3000/api/proxy?target=https://api.example.com');
      const response = await GET(request);
      const data = await response.json();

      expect(data.error.context).toBeDefined();
      expect(data.error.context.operation).toBe('forwardRequest');
      expect(data.error.context.targetUrl).toBe('https://api.example.com');
    });
  });
});