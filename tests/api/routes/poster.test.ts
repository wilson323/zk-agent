/**
 * 海报生成API路由错误处理测试
 * 测试海报生成端点的各种错误场景和恢复机制
 */

import { NextRequest } from 'next/server';
import { POST } from '../../../app/api/poster/generate/route';
import { GlobalErrorHandler } from '../../../lib/middleware/global-error-handler';
import { PosterGenerationFailed, PosterResourceLimit } from '../../../lib/errors/agent-errors';

// Mock dependencies
jest.mock('../../../lib/services/poster-generator', () => ({
  generatePoster: jest.fn(),
  validateTemplate: jest.fn(),
  checkResourceLimits: jest.fn()
}));

jest.mock('../../../lib/storage/file-manager', () => ({
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
  getFileUrl: jest.fn()
}));

jest.mock('../../../lib/auth/session', () => ({
  validateSession: jest.fn(),
  getUserLimits: jest.fn()
}));

describe('Poster Generation API Error Handling', () => {
  let mockRequest: NextRequest;
  let errorHandler: GlobalErrorHandler;

  beforeEach(() => {
    const requestBody = {
      template: 'security-awareness',
      title: 'Test Poster',
      content: 'Test content',
      style: {
        theme: 'corporate',
        colors: ['#1f2937', '#3b82f6']
      }
    };
    
    mockRequest = new NextRequest('http://localhost:3000/api/poster/generate', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-token'
      }
    });
    
    errorHandler = GlobalErrorHandler.getInstance();
    jest.clearAllMocks();
  });

  describe('Template Validation Errors', () => {
    it('should handle invalid template format', async () => {
      const { validateTemplate } = require('../../../lib/services/poster-generator');
      validateTemplate.mockRejectedValue(new Error('Invalid template format'));

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid template format');
    });

    it('should handle missing required template fields', async () => {
      const invalidRequest = new NextRequest('http://localhost:3000/api/poster/generate', {
        method: 'POST',
        body: JSON.stringify({ template: 'security-awareness' }), // Missing required fields
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(invalidRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.details).toContain('title');
    });

    it('should handle unsupported template type', async () => {
      const { validateTemplate } = require('../../../lib/services/poster-generator');
      validateTemplate.mockRejectedValue(new Error('Template type not supported'));

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('Template type not supported');
    });
  });

  describe('Resource Limit Errors', () => {
    it('should handle memory limit exceeded', async () => {
      const { generatePoster } = require('../../../lib/services/poster-generator');
      const resourceError = new PosterResourceLimit(
        'Memory limit exceeded during poster generation',
        { memoryUsage: '512MB', limit: '256MB' }
      );
      generatePoster.mockRejectedValue(resourceError);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error.code).toBe('POSTER_RESOURCE_LIMIT');
      expect(data.error.message).toContain('Memory limit exceeded');
      expect(data.error.retryAfter).toBeDefined();
    });

    it('should handle concurrent generation limit', async () => {
      const { checkResourceLimits } = require('../../../lib/services/poster-generator');
      checkResourceLimits.mockRejectedValue(new Error('Too many concurrent poster generations'));

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error.message).toContain('Too many concurrent');
    });

    it('should handle storage quota exceeded', async () => {
      const { uploadFile } = require('../../../lib/storage/file-manager');
      uploadFile.mockRejectedValue(new Error('Storage quota exceeded'));

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(413);
      expect(data.error.message).toContain('Storage quota exceeded');
    });
  });

  describe('Generation Process Errors', () => {
    it('should handle poster generation timeout', async () => {
      const { generatePoster } = require('../../../lib/services/poster-generator');
      generatePoster.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Generation timeout')), 100)
        )
      );

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(408);
      expect(data.error.message).toContain('Generation timeout');
    });

    it('should handle rendering engine failure', async () => {
      const { generatePoster } = require('../../../lib/services/poster-generator');
      const generationError = new PosterGenerationFailed(
        'Rendering engine crashed',
        new Error('Canvas rendering failed'),
        { template: 'security-awareness', step: 'rendering' }
      );
      generatePoster.mockRejectedValue(generationError);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.code).toBe('POSTER_GENERATION_FAILED');
      expect(data.error.message).toContain('Rendering engine crashed');
    });

    it('should handle image processing failure', async () => {
      const { generatePoster } = require('../../../lib/services/poster-generator');
      generatePoster.mockRejectedValue(new Error('Image processing failed'));

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Image processing failed');
    });

    it('should handle font loading failure', async () => {
      const { generatePoster } = require('../../../lib/services/poster-generator');
      generatePoster.mockRejectedValue(new Error('Failed to load custom font'));

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Failed to load custom font');
    });
  });

  describe('Authentication and Authorization Errors', () => {
    it('should handle missing authentication token', async () => {
      const unauthRequest = new NextRequest('http://localhost:3000/api/poster/generate', {
        method: 'POST',
        body: JSON.stringify({ template: 'test' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(unauthRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should handle invalid authentication token', async () => {
      const { validateSession } = require('../../../lib/auth/session');
      validateSession.mockRejectedValue(new Error('Invalid token'));

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.message).toContain('Invalid token');
    });

    it('should handle expired authentication token', async () => {
      const { validateSession } = require('../../../lib/auth/session');
      validateSession.mockRejectedValue(new Error('Token expired'));

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.message).toContain('Token expired');
    });

    it('should handle insufficient permissions', async () => {
      const { getUserLimits } = require('../../../lib/auth/session');
      getUserLimits.mockResolvedValue({ canGeneratePosters: false });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AUTHORIZATION_ERROR');
    });
  });

  describe('File Storage Errors', () => {
    it('should handle file upload failure', async () => {
      const { generatePoster } = require('../../../lib/services/poster-generator');
      const { uploadFile } = require('../../../lib/storage/file-manager');
      
      generatePoster.mockResolvedValue({ imageBuffer: Buffer.from('test') });
      uploadFile.mockRejectedValue(new Error('Upload failed'));

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Upload failed');
    });

    it('should handle storage service unavailable', async () => {
      const { uploadFile } = require('../../../lib/storage/file-manager');
      uploadFile.mockRejectedValue(new Error('Storage service unavailable'));

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error.message).toContain('Storage service unavailable');
    });

    it('should handle file corruption during upload', async () => {
      const { uploadFile } = require('../../../lib/storage/file-manager');
      uploadFile.mockRejectedValue(new Error('File corruption detected'));

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('File corruption detected');
    });
  });

  describe('Input Validation Errors', () => {
    it('should handle malformed JSON request', async () => {
      const malformedRequest = new NextRequest('http://localhost:3000/api/poster/generate', {
        method: 'POST',
        body: '{invalid json}',
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(malformedRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid JSON');
    });

    it('should handle oversized request payload', async () => {
      const largeContent = 'x'.repeat(10000000); // 10MB string
      const largeRequest = new NextRequest('http://localhost:3000/api/poster/generate', {
        method: 'POST',
        body: JSON.stringify({ template: 'test', content: largeContent }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(largeRequest);
      const data = await response.json();

      expect(response.status).toBe(413);
      expect(data.error.message).toContain('Payload too large');
    });

    it('should handle invalid color format', async () => {
      const invalidColorRequest = new NextRequest('http://localhost:3000/api/poster/generate', {
        method: 'POST',
        body: JSON.stringify({
          template: 'security-awareness',
          title: 'Test',
          content: 'Test',
          style: { colors: ['invalid-color'] }
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(invalidColorRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('Invalid color format');
    });
  });

  describe('Error Recovery and Retry Logic', () => {
    it('should implement exponential backoff for retries', async () => {
      const { generatePoster } = require('../../../lib/services/poster-generator');
      let attemptCount = 0;
      generatePoster.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve({ imageBuffer: Buffer.from('success') });
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(attemptCount).toBe(3);
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should provide fallback template on generation failure', async () => {
      const { generatePoster } = require('../../../lib/services/poster-generator');
      generatePoster.mockRejectedValue(new Error('Template rendering failed'));

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.fallbackUsed).toBe(true);
    });

    it('should clean up resources on failure', async () => {
      const { generatePoster } = require('../../../lib/services/poster-generator');
      const { deleteFile } = require('../../../lib/storage/file-manager');
      
      generatePoster.mockRejectedValue(new Error('Generation failed'));

      await POST(mockRequest);

      expect(deleteFile).toHaveBeenCalled();
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should trigger circuit breaker after multiple failures', async () => {
      const { generatePoster } = require('../../../lib/services/poster-generator');
      generatePoster.mockRejectedValue(new Error('Service failure'));

      // Simulate multiple failures
      for (let i = 0; i < 5; i++) {
        await POST(mockRequest);
      }

      const stats = errorHandler.getErrorStats();
      expect(stats.errorCount).toBeGreaterThan(0);
    });

    it('should return circuit breaker response when open', async () => {
      // Force circuit breaker to open state
      errorHandler['circuitBreakerOpen'] = true;
      errorHandler['circuitBreakerOpen'] = true;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error.code).toBe('CIRCUIT_BREAKER_OPEN');
    });
  });

  describe('Performance and Monitoring', () => {
    it('should include generation metrics in response', async () => {
      const { generatePoster } = require('../../../lib/services/poster-generator');
      generatePoster.mockResolvedValue({
        imageBuffer: Buffer.from('test'),
        metrics: {
          generationTime: 1500,
          memoryUsed: '128MB',
          templateComplexity: 'medium'
        }
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(data.data.metrics).toBeDefined();
      expect(data.data.metrics.generationTime).toBe(1500);
    });

    it('should log performance warnings for slow generation', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const { generatePoster } = require('../../../lib/services/poster-generator');
      
      generatePoster.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ imageBuffer: Buffer.from('test') }), 5000)
        )
      );

      await POST(mockRequest);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow poster generation detected')
      );
      consoleSpy.mockRestore();
    });
  });
});