/**
 * @file auth.test.ts
 * @description 认证相关API路由错误处理测试
 * @author ZK-Agent Team
 * @date 2025-01-27
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as loginHandler } from '@/app/api/auth/login/route';
import { POST as registerHandler } from '@/app/api/auth/register/route';
import { POST as logoutHandler } from '@/app/api/auth/logout/route';
import { GET as profileHandler } from '@/app/api/auth/profile/route';
import { POST as changePasswordHandler } from '@/app/api/auth/change-password/route';
import { POST as refreshHandler } from '@/app/api/auth/refresh/route';
import { GlobalErrorHandler } from '@/lib/middleware/global-error-handler';

describe('Auth API Routes Error Handling', () => {
  let errorHandler: GlobalErrorHandler;

  beforeEach(() => {
    errorHandler = GlobalErrorHandler.getInstance();
    errorHandler.reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    errorHandler.reset();
  });

  describe('Login Route (/api/auth/login)', () => {
    it('should handle missing credentials error', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('should handle invalid credentials error', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid@example.com',
          password: 'wrongpassword'
        })
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should handle malformed JSON error', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('should handle database connection error', async () => {
      // Mock database error
      vi.mock('@/lib/database/connection', () => ({
        default: {
          user: {
            findUnique: vi.fn().mockRejectedValue(new Error('Database connection failed'))
          }
        }
      }));

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        })
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('DATABASE_ERROR');
    });
  });

  describe('Register Route (/api/auth/register)', () => {
    it('should handle duplicate email error', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'existing@example.com',
          password: 'password123',
          name: 'Test User'
        })
      });

      const response = await registerHandler(request);
      const data = await response.json();

      expect([400, 409]).toContain(response.status);
      expect(data.error).toBeDefined();
    });

    it('should handle weak password error', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: '123',
          name: 'Test User'
        })
      });

      const response = await registerHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Profile Route (/api/auth/profile)', () => {
    it('should handle unauthorized access error', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/profile', {
        method: 'GET'
      });

      const response = await profileHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should handle invalid token error', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/profile', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid_token'
        }
      });

      const response = await profileHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('AUTHENTICATION_ERROR');
    });
  });

  describe('Change Password Route (/api/auth/change-password)', () => {
    it('should handle missing current password error', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword: 'newpassword123'
        })
      });

      const response = await changePasswordHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('should handle incorrect current password error', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid_token'
        },
        body: JSON.stringify({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123'
        })
      });

      const response = await changePasswordHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });

  describe('Error Handler Integration', () => {
    it('should track error statistics across auth routes', async () => {
      // Trigger multiple errors
      const requests = [
        new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          body: 'invalid json'
        }),
        new NextRequest('http://localhost:3000/api/auth/profile', {
          method: 'GET'
        }),
        new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({})
        })
      ];

      for (const request of requests) {
        await loginHandler(request).catch(() => {});
      }

      const stats = errorHandler.getErrorStats();
      expect(stats.errorCount).toBeGreaterThan(0);
    });

    it('should trigger circuit breaker on repeated failures', async () => {
      // Configure low threshold for testing
      const originalThreshold = errorHandler['errorThreshold'];
      errorHandler['errorThreshold'] = 2;

      try {
        // Trigger multiple errors to exceed threshold
        for (let i = 0; i < 3; i++) {
          const request = new NextRequest('http://localhost:3000/api/auth/login', {
            method: 'POST',
            body: 'invalid json'
          });
          await loginHandler(request).catch(() => {});
        }

        expect(errorHandler.isCircuitBreakerOpen()).toBe(true);
      } finally {
        errorHandler['errorThreshold'] = originalThreshold;
      }
    });
  });
});