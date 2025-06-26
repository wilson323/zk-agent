/**
 * 健康检查API路由错误处理测试
 * 测试健康检查端点的各种错误场景和恢复机制
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/health/route';
import { GlobalErrorHandler } from '@/lib/middleware/global-error-handler';
import { AgentError, AgentErrorType, ErrorSeverity } from '@/lib/errors/agent-errors';

// Mock dependencies
jest.mock('../../../lib/database/connection', () => ({
  testConnection: jest.fn(),
  getConnectionStatus: jest.fn()
}));

jest.mock('../../../lib/cache/redis', () => ({
  ping: jest.fn(),
  isConnected: jest.fn()
}));

jest.mock('../../../lib/api/fastgpt', () => ({
  testConnection: jest.fn(),
  getHealthStatus: jest.fn()
}));

jest.mock('fs/promises', () => ({
  access: jest.fn(),
  stat: jest.fn()
}));

describe('Health Check API Error Handling', () => {
  let mockRequest: NextRequest;
  let errorHandler: GlobalErrorHandler;

  beforeEach(() => {
    mockRequest = new NextRequest('http://localhost:3000/api/health');
    errorHandler = GlobalErrorHandler.getInstance();
    jest.clearAllMocks();
  });

  describe('Database Connection Errors', () => {
    it('should handle database connection timeout', async () => {
      const { testConnection } = require('../../../lib/database/connection');
      testConnection.mockRejectedValue(new Error('Connection timeout'));

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('SERVICE_UNAVAILABLE');
      expect(data.services.database.status).toBe('down');
      expect(data.services.database.error).toContain('Connection timeout');
    });

    it('should handle database authentication failure', async () => {
      const { testConnection } = require('../../../lib/database/connection');
      testConnection.mockRejectedValue(new Error('Authentication failed'));

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.services.database.status).toBe('down');
      expect(data.services.database.error).toContain('Authentication failed');
    });

    it('should handle database connection pool exhaustion', async () => {
      const { testConnection } = require('../../../lib/database/connection');
      testConnection.mockRejectedValue(new Error('Connection pool exhausted'));

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.services.database.status).toBe('down');
      expect(data.services.database.error).toContain('Connection pool exhausted');
    });
  });

  describe('Redis Connection Errors', () => {
    it('should handle Redis connection refused', async () => {
      const { ping } = require('../../../lib/cache/redis');
      ping.mockRejectedValue(new Error('Connection refused'));

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.services.redis.status).toBe('down');
      expect(data.services.redis.error).toContain('Connection refused');
    });

    it('should handle Redis authentication error', async () => {
      const { ping } = require('../../../lib/cache/redis');
      ping.mockRejectedValue(new Error('NOAUTH Authentication required'));

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.services.redis.status).toBe('down');
      expect(data.services.redis.error).toContain('NOAUTH Authentication required');
    });

    it('should handle Redis memory limit exceeded', async () => {
      const { ping } = require('../../../lib/cache/redis');
      ping.mockRejectedValue(new Error('OOM command not allowed when used memory > maxmemory'));

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.services.redis.status).toBe('down');
      expect(data.services.redis.error).toContain('OOM command not allowed');
    });
  });

  describe('FastGPT Service Errors', () => {
    it('should handle FastGPT API key invalid', async () => {
      const { testConnection } = require('../../../lib/api/fastgpt');
      testConnection.mockRejectedValue(new Error('Invalid API key'));

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.services.fastgpt.status).toBe('down');
      expect(data.services.fastgpt.error).toContain('Invalid API key');
    });

    it('should handle FastGPT service unavailable', async () => {
      const { testConnection } = require('../../../lib/api/fastgpt');
      testConnection.mockRejectedValue(new Error('Service temporarily unavailable'));

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.services.fastgpt.status).toBe('down');
      expect(data.services.fastgpt.error).toContain('Service temporarily unavailable');
    });

    it('should handle FastGPT rate limit exceeded', async () => {
      const { testConnection } = require('../../../lib/api/fastgpt');
      testConnection.mockRejectedValue(new Error('Rate limit exceeded'));

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.services.fastgpt.status).toBe('down');
      expect(data.services.fastgpt.error).toContain('Rate limit exceeded');
    });
  });

  describe('File System Errors', () => {
    it('should handle file system permission denied', async () => {
      const fs = require('fs/promises');
      fs.access.mockRejectedValue(new Error('EACCES: permission denied'));

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.services.filesystem.status).toBe('down');
      expect(data.services.filesystem.error).toContain('EACCES: permission denied');
    });

    it('should handle file system disk full', async () => {
      const fs = require('fs/promises');
      fs.access.mockRejectedValue(new Error('ENOSPC: no space left on device'));

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.services.filesystem.status).toBe('down');
      expect(data.services.filesystem.error).toContain('ENOSPC: no space left on device');
    });

    it('should handle file system path not found', async () => {
      const fs = require('fs/promises');
      fs.access.mockRejectedValue(new Error('ENOENT: no such file or directory'));

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.services.filesystem.status).toBe('down');
      expect(data.services.filesystem.error).toContain('ENOENT: no such file or directory');
    });
  });

  describe('Partial Service Failures', () => {
    it('should handle mixed service status', async () => {
      const { testConnection: dbTest } = require('../../../lib/database/connection');
      const { ping } = require('../../../lib/cache/redis');
      const { testConnection: fastgptTest } = require('../../../lib/api/fastgpt');
      const fs = require('fs/promises');

      // Database OK, Redis fails, FastGPT OK, FileSystem OK
      dbTest.mockResolvedValue(true);
      ping.mockRejectedValue(new Error('Connection refused'));
      fastgptTest.mockResolvedValue(true);
      fs.access.mockResolvedValue(undefined);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.services.database.status).toBe('up');
      expect(data.services.redis.status).toBe('down');
      expect(data.services.fastgpt.status).toBe('up');
      expect(data.services.filesystem.status).toBe('up');
    });

    it('should return healthy when all services are up', async () => {
      const { testConnection: dbTest } = require('../../../lib/database/connection');
      const { ping } = require('../../../lib/cache/redis');
      const { testConnection: fastgptTest } = require('../../../lib/api/fastgpt');
      const fs = require('fs/promises');

      dbTest.mockResolvedValue(true);
      ping.mockResolvedValue('PONG');
      fastgptTest.mockResolvedValue(true);
      fs.access.mockResolvedValue(undefined);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.status).toBe('healthy');
      expect(data.services.database.status).toBe('up');
      expect(data.services.redis.status).toBe('up');
      expect(data.services.fastgpt.status).toBe('up');
      expect(data.services.filesystem.status).toBe('up');
    });
  });

  describe('Error Recovery and Circuit Breaker', () => {
    it('should trigger circuit breaker after multiple failures', async () => {
      const { testConnection } = require('../../../lib/database/connection');
      testConnection.mockRejectedValue(new Error('Connection timeout'));

      // Simulate multiple failures to trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        await GET(mockRequest);
      }

      const stats = errorHandler.getErrorStats();
      expect(stats.errorCount).toBeGreaterThan(0);
    });

    it('should include response time metrics', async () => {
      const { testConnection: dbTest } = require('../../../lib/database/connection');
      const { ping } = require('../../../lib/cache/redis');
      const { testConnection: fastgptTest } = require('../../../lib/api/fastgpt');
      const fs = require('fs/promises');

      dbTest.mockResolvedValue(true);
      ping.mockResolvedValue('PONG');
      fastgptTest.mockResolvedValue(true);
      fs.access.mockResolvedValue(undefined);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data.services.database.responseTime).toBeDefined();
      expect(data.services.redis.responseTime).toBeDefined();
      expect(data.services.fastgpt.responseTime).toBeDefined();
      expect(data.services.filesystem.responseTime).toBeDefined();
    });

    it('should handle timeout scenarios gracefully', async () => {
      const { testConnection } = require('../../../lib/database/connection');
      
      // Simulate a long-running operation
      testConnection.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Operation timeout')), 100)
        )
      );

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.services.database.status).toBe('down');
      expect(data.services.database.error).toContain('Operation timeout');
    });
  });

  describe('Global Error Handler Integration', () => {
    it('should properly classify health check errors', async () => {
      const { testConnection } = require('../../../lib/database/connection');
      const agentError = new AgentError(
        AgentErrorType.SERVICE_UNAVAILABLE,
        'Database service unavailable',
        ErrorSeverity.CRITICAL
      );
      testConnection.mockRejectedValue(agentError);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error.code).toBe('SERVICE_UNAVAILABLE');
      expect(data.error.severity).toBe('critical');
    });

    it('should include error correlation ID', async () => {
      const { testConnection } = require('../../../lib/database/connection');
      testConnection.mockRejectedValue(new Error('Database error'));

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data.error.correlationId).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });

    it('should log errors for monitoring', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const { testConnection } = require('../../../lib/database/connection');
      testConnection.mockRejectedValue(new Error('Critical database error'));

      await GET(mockRequest);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});