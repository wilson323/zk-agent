/**
 * @file cad.test.ts
 * @description CAD分析相关API路由错误处理测试
 * @author ZK-Agent Team
 * @date 2025-01-27
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as uploadHandler } from '@/app/api/cad/upload/route';
import { POST as analyzeHandler } from '@/app/api/cad/analyze/route';
import { GET as historyHandler } from '@/app/api/cad/history/route';
import { GET as statisticsHandler } from '@/app/api/cad/statistics/route';
import { POST as exportHandler } from '@/app/api/cad/export/route';
import { POST as uploadEnhancedHandler } from '@/app/api/cad/upload-enhanced/route';
import { GlobalErrorHandler } from '@/lib/middleware/global-error-handler';

describe('CAD API Routes Error Handling', () => {
  let errorHandler: GlobalErrorHandler;

  beforeEach(() => {
    errorHandler = GlobalErrorHandler.getInstance();
    errorHandler.reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    errorHandler.reset();
  });

  describe('Upload Route (/api/cad/upload)', () => {
    it('should handle missing file error', async () => {
      const request = new NextRequest('http://localhost:3000/api/cad/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const response = await uploadHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.error).toContain('file');
    });

    it('should handle unsupported file format error', async () => {
      const formData = new FormData();
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      formData.append('file', file);

      const request = new NextRequest('http://localhost:3000/api/cad/upload', {
        method: 'POST',
        body: formData
      });

      const response = await uploadHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.error).toContain('format');
    });

    it('should handle file size limit exceeded error', async () => {
      const formData = new FormData();
      // Create a large file (simulate > 100MB)
      const largeContent = 'x'.repeat(100 * 1024 * 1024 + 1);
      const file = new File([largeContent], 'large.dwg', { type: 'application/dwg' });
      formData.append('file', file);

      const request = new NextRequest('http://localhost:3000/api/cad/upload', {
        method: 'POST',
        body: formData
      });

      const response = await uploadHandler(request);
      const data = await response.json();

      expect(response.status).toBe(413);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('FILE_TOO_LARGE');
    });

    it('should handle corrupted file error', async () => {
      const formData = new FormData();
      const file = new File(['corrupted data'], 'corrupted.dwg', { type: 'application/dwg' });
      formData.append('file', file);

      const request = new NextRequest('http://localhost:3000/api/cad/upload', {
        method: 'POST',
        body: formData
      });

      const response = await uploadHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('FILE_CORRUPTED');
    });

    it('should handle storage quota exceeded error', async () => {
      // Mock storage service to simulate quota exceeded
      vi.mock('@/lib/storage/file-storage', () => ({
        uploadFile: vi.fn().mockRejectedValue(new Error('Storage quota exceeded'))
      }));

      const formData = new FormData();
      const file = new File(['test content'], 'test.dwg', { type: 'application/dwg' });
      formData.append('file', file);

      const request = new NextRequest('http://localhost:3000/api/cad/upload', {
        method: 'POST',
        body: formData
      });

      const response = await uploadHandler(request);
      const data = await response.json();

      expect(response.status).toBe(507);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('STORAGE_QUOTA_EXCEEDED');
    });
  });

  describe('Analyze Route (/api/cad/analyze)', () => {
    it('should handle missing file ID error', async () => {
      const request = new NextRequest('http://localhost:3000/api/cad/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const response = await analyzeHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('should handle file not found error', async () => {
      const request = new NextRequest('http://localhost:3000/api/cad/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: 'non-existent-file-id'
        })
      });

      const response = await analyzeHandler(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('FILE_NOT_FOUND');
    });

    it('should handle analysis timeout error', async () => {
      // Mock analysis service to simulate timeout
      vi.mock('@/lib/cad/analyzer', () => ({
        analyzeCADFile: vi.fn().mockImplementation(() => 
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Analysis timeout')), 100)
          )
        )
      }));

      const request = new NextRequest('http://localhost:3000/api/cad/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: 'valid-file-id'
        })
      });

      const response = await analyzeHandler(request);
      const data = await response.json();

      expect(response.status).toBe(504);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('ANALYSIS_TIMEOUT');
    });

    it('should handle insufficient memory error', async () => {
      // Mock analysis service to simulate memory error
      vi.mock('@/lib/cad/analyzer', () => ({
        analyzeCADFile: vi.fn().mockRejectedValue(new Error('Insufficient memory'))
      }));

      const request = new NextRequest('http://localhost:3000/api/cad/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: 'large-file-id'
        })
      });

      const response = await analyzeHandler(request);
      const data = await response.json();

      expect(response.status).toBe(507);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('INSUFFICIENT_MEMORY');
    });

    it('should handle concurrent analysis limit error', async () => {
      // Mock analysis service to simulate concurrent limit
      vi.mock('@/lib/cad/analyzer', () => ({
        analyzeCADFile: vi.fn().mockRejectedValue(new Error('Too many concurrent analyses'))
      }));

      const request = new NextRequest('http://localhost:3000/api/cad/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: 'valid-file-id'
        })
      });

      const response = await analyzeHandler(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('TOO_MANY_REQUESTS');
    });
  });

  describe('History Route (/api/cad/history)', () => {
    it('should handle unauthorized access error', async () => {
      const request = new NextRequest('http://localhost:3000/api/cad/history', {
        method: 'GET'
      });

      const response = await historyHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should handle invalid pagination parameters error', async () => {
      const request = new NextRequest('http://localhost:3000/api/cad/history?page=-1&limit=0', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid_token'
        }
      });

      const response = await historyHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('should handle database query timeout error', async () => {
      // Mock database to simulate timeout
      vi.mock('@/lib/database/connection', () => ({
        default: {
          cadAnalysis: {
            findMany: vi.fn().mockRejectedValue(new Error('Query timeout'))
          }
        }
      }));

      const request = new NextRequest('http://localhost:3000/api/cad/history', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid_token'
        }
      });

      const response = await historyHandler(request);
      const data = await response.json();

      expect(response.status).toBe(504);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('DATABASE_TIMEOUT');
    });
  });

  describe('Statistics Route (/api/cad/statistics)', () => {
    it('should handle invalid date range error', async () => {
      const request = new NextRequest('http://localhost:3000/api/cad/statistics?startDate=invalid&endDate=invalid', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid_token'
        }
      });

      const response = await statisticsHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('should handle date range too large error', async () => {
      const startDate = '2020-01-01';
      const endDate = '2025-12-31';
      const request = new NextRequest(`http://localhost:3000/api/cad/statistics?startDate=${startDate}&endDate=${endDate}`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid_token'
        }
      });

      const response = await statisticsHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('DATE_RANGE_TOO_LARGE');
    });
  });

  describe('Export Route (/api/cad/export)', () => {
    it('should handle missing analysis ID error', async () => {
      const request = new NextRequest('http://localhost:3000/api/cad/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const response = await exportHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('should handle unsupported export format error', async () => {
      const request = new NextRequest('http://localhost:3000/api/cad/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId: 'valid-analysis-id',
          format: 'unsupported-format'
        })
      });

      const response = await exportHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('UNSUPPORTED_FORMAT');
    });

    it('should handle export generation failure error', async () => {
      // Mock export service to simulate failure
      vi.mock('@/lib/cad/exporter', () => ({
        generateExport: vi.fn().mockRejectedValue(new Error('Export generation failed'))
      }));

      const request = new NextRequest('http://localhost:3000/api/cad/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId: 'valid-analysis-id',
          format: 'pdf'
        })
      });

      const response = await exportHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('EXPORT_GENERATION_FAILED');
    });
  });

  describe('Upload Enhanced Route (/api/cad/upload-enhanced)', () => {
    it('should handle missing preprocessing options error', async () => {
      const formData = new FormData();
      const file = new File(['test content'], 'test.dwg', { type: 'application/dwg' });
      formData.append('file', file);

      const request = new NextRequest('http://localhost:3000/api/cad/upload-enhanced', {
        method: 'POST',
        body: formData
      });

      const response = await uploadEnhancedHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('should handle preprocessing failure error', async () => {
      // Mock preprocessing service to simulate failure
      vi.mock('@/lib/cad/preprocessor', () => ({
        preprocessCADFile: vi.fn().mockRejectedValue(new Error('Preprocessing failed'))
      }));

      const formData = new FormData();
      const file = new File(['test content'], 'test.dwg', { type: 'application/dwg' });
      formData.append('file', file);
      formData.append('options', JSON.stringify({ autoFix: true, optimize: true }));

      const request = new NextRequest('http://localhost:3000/api/cad/upload-enhanced', {
        method: 'POST',
        body: formData
      });

      const response = await uploadEnhancedHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
      expect(data.code).toBe('PREPROCESSING_FAILED');
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should implement retry logic for transient failures', async () => {
      let callCount = 0;
      vi.mock('@/lib/cad/analyzer', () => ({
        analyzeCADFile: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount < 3) {
            return Promise.reject(new Error('Transient failure'));
          }
          return Promise.resolve({ success: true, results: {} });
        })
      }));

      const request = new NextRequest('http://localhost:3000/api/cad/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: 'valid-file-id'
        })
      });

      const response = await analyzeHandler(request);
      
      expect(callCount).toBe(3);
      expect(response.status).toBe(200);
    });

    it('should gracefully degrade when analysis service is unavailable', async () => {
      // Mock persistent service failure
      vi.mock('@/lib/cad/analyzer', () => ({
        analyzeCADFile: vi.fn().mockRejectedValue(new Error('Service unavailable'))
      }));

      const request = new NextRequest('http://localhost:3000/api/cad/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: 'valid-file-id'
        })
      });

      const response = await analyzeHandler(request);
      const data = await response.json();

      // Should return basic analysis instead of complete failure
      expect(response.status).toBe(200);
      expect(data.degraded).toBe(true);
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should track CAD analysis errors in global error handler', async () => {
      // Mock analysis failures
      vi.mock('@/lib/cad/analyzer', () => ({
        analyzeCADFile: vi.fn().mockRejectedValue(new Error('Analysis failed'))
      }));

      const requests = Array(5).fill(null).map(() => 
        new NextRequest('http://localhost:3000/api/cad/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId: 'test-file-id' })
        })
      );

      for (const request of requests) {
        await analyzeHandler(request).catch(() => {});
      }

      const stats = errorHandler.getErrorStats();
      expect(stats.errorCount).toBeGreaterThan(0);
    });
  });
});