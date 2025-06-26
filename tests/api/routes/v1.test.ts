/**
 * V1 API路由错误处理测试
 * 测试V1版本API的各种错误场景
 */

import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '../../../app/api/v1/route';
// import { GlobalErrorHandler } from '../../../lib/middleware/global-error-handler';
// import { AgentError, AgentErrorType, ErrorSeverity } from '../../../lib/errors/agent-errors';

// Mock dependencies
jest.mock('../../../lib/services/v1-api-service', () => ({
  handleV1Request: jest.fn(),
  validateV1ApiKey: jest.fn(),
  processV1Data: jest.fn(),
  transformV1Response: jest.fn(),
  checkV1RateLimit: jest.fn(),
  getV1ApiMetrics: jest.fn(),
  validateV1Endpoint: jest.fn(),
  migrateV1ToV2: jest.fn()
}));

jest.mock('../../../lib/services/legacy-support', () => ({
  handleLegacyRequest: jest.fn(),
  convertLegacyFormat: jest.fn(),
  validateLegacyData: jest.fn(),
  mapLegacyEndpoints: jest.fn(),
  getLegacyCompatibility: jest.fn()
}));

jest.mock('../../../lib/services/version-manager', () => ({
  getApiVersion: jest.fn(),
  checkVersionCompatibility: jest.fn(),
  getVersionMetadata: jest.fn(),
  validateVersionAccess: jest.fn(),
  getDeprecationInfo: jest.fn()
}));

jest.mock('../../../lib/auth/api-key-validator', () => ({
  validateApiKey: jest.fn(),
  checkApiKeyPermissions: jest.fn(),
  getApiKeyMetadata: jest.fn(),
  trackApiKeyUsage: jest.fn()
}));

jest.mock('../../../lib/middleware/rate-limiter', () => ({
  checkRateLimit: jest.fn(),
  updateRateLimit: jest.fn(),
  getRateLimitInfo: jest.fn()
}));

jest.mock('../../../lib/storage/v1-data-store', () => ({
  storeV1Data: jest.fn(),
  getV1Data: jest.fn(),
  updateV1Data: jest.fn(),
  deleteV1Data: jest.fn(),
  queryV1Data: jest.fn()
}));

describe('V1 API Error Handling', () => {
  let errorHandler: any;

  beforeEach(() => {
    // errorHandler = GlobalErrorHandler.getInstance();
    errorHandler = { errorCount: 0, circuitBreakerOpen: false };
    jest.clearAllMocks();
  });

  describe('GET /api/v1 - V1 API Requests', () => {
    it('should handle invalid V1 API key', async () => {
      const { validateV1ApiKey } = require('../../../lib/services/v1-api-service');
      validateV1ApiKey.mockRejectedValue(new Error('Invalid or expired V1 API key'));

      const request = new NextRequest('http://localhost:3000/api/v1/users', {
        headers: { 'X-API-Key': 'invalid-key' }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('AUTHENTICATION_ERROR');
      expect(data.error.message).toContain('Invalid or expired V1 API key');
    });

    it('should handle missing V1 API key', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('AUTHENTICATION_ERROR');
      expect(data.error.message).toContain('API key required for V1 endpoints');
    });

    it('should handle V1 endpoint not found', async () => {
      const { validateV1Endpoint } = require('../../../lib/services/v1-api-service');
      validateV1Endpoint.mockRejectedValue(new Error('V1 endpoint not found'));

      const request = new NextRequest('http://localhost:3000/api/v1/nonexistent', {
        headers: { 'X-API-Key': 'valid-key' }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(data.error.message).toContain('V1 endpoint not found');
    });

    it('should handle V1 API deprecation warning', async () => {
      const { getDeprecationInfo } = require('../../../lib/services/version-manager');
      getDeprecationInfo.mockResolvedValue({
        deprecated: true,
        deprecationDate: '2024-12-31',
        migrationGuide: 'https://docs.example.com/v2-migration'
      });

      const request = new NextRequest('http://localhost:3000/api/v1/users', {
        headers: { 'X-API-Key': 'valid-key' }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.headers.get('X-API-Deprecated')).toBe('true');
      expect(response.headers.get('X-Deprecation-Date')).toBe('2024-12-31');
      expect(data.deprecation).toBeDefined();
    });

    it('should handle V1 rate limit exceeded', async () => {
      const { checkV1RateLimit } = require('../../../lib/services/v1-api-service');
      checkV1RateLimit.mockRejectedValue(new Error('V1 API rate limit exceeded'));

      const request = new NextRequest('http://localhost:3000/api/v1/users', {
        headers: { 'X-API-Key': 'valid-key' }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error.code).toBe('RATE_LIMIT_ERROR');
      expect(data.error.message).toContain('V1 API rate limit exceeded');
    });

    it('should handle V1 service unavailable', async () => {
      const { handleV1Request } = require('../../../lib/services/v1-api-service');
      handleV1Request.mockRejectedValue(new Error('V1 API service temporarily unavailable'));

      const request = new NextRequest('http://localhost:3000/api/v1/users', {
        headers: { 'X-API-Key': 'valid-key' }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error.message).toContain('V1 API service temporarily unavailable');
    });

    it('should handle V1 data format incompatibility', async () => {
      const { processV1Data } = require('../../../lib/services/v1-api-service');
      processV1Data.mockRejectedValue(new Error('V1 data format no longer supported'));

      const request = new NextRequest('http://localhost:3000/api/v1/data?format=legacy', {
        headers: { 'X-API-Key': 'valid-key' }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(415);
      expect(data.error.message).toContain('V1 data format no longer supported');
    });

    it('should handle V1 query parameter validation errors', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/users?limit=-1&offset=invalid', {
        headers: { 'X-API-Key': 'valid-key' }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid query parameters');
    });

    it('should handle V1 response transformation failure', async () => {
      const { transformV1Response } = require('../../../lib/services/v1-api-service');
      transformV1Response.mockRejectedValue(new Error('Failed to transform V1 response format'));

      const request = new NextRequest('http://localhost:3000/api/v1/users', {
        headers: { 'X-API-Key': 'valid-key' }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Failed to transform V1 response format');
    });

    it('should handle V1 API version mismatch', async () => {
      const { checkVersionCompatibility } = require('../../../lib/services/version-manager');
      checkVersionCompatibility.mockRejectedValue(new Error('V1 API version mismatch'));

      const request = new NextRequest('http://localhost:3000/api/v1/users', {
        headers: { 
          'X-API-Key': 'valid-key',
          'X-API-Version': '1.5' // Unsupported sub-version
        }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('V1 API version mismatch');
    });
  });

  describe('POST /api/v1 - V1 API Data Creation', () => {
    let validV1Data: any;

    beforeEach(() => {
      validV1Data = {
        name: 'Test Item',
        type: 'document',
        data: {
          content: 'Test content',
          metadata: {
            version: '1.0',
            format: 'text'
          }
        }
      };
    });

    it('should handle V1 data validation errors', async () => {
      const { processV1Data } = require('../../../lib/services/v1-api-service');
      processV1Data.mockRejectedValue(new Error('V1 data validation failed: missing required fields'));

      const invalidData = { ...validV1Data };
      delete invalidData.name;
      delete invalidData.type;

      const request = new NextRequest('http://localhost:3000/api/v1/items', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': 'valid-key'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('V1 data validation failed');
    });

    it('should handle V1 legacy format conversion errors', async () => {
      const { convertLegacyFormat } = require('../../../lib/services/legacy-support');
      convertLegacyFormat.mockRejectedValue(new Error('Failed to convert legacy V1 format'));

      const legacyData = {
        ...validV1Data,
        format: 'legacy-v1',
        encoding: 'deprecated'
      };

      const request = new NextRequest('http://localhost:3000/api/v1/items', {
        method: 'POST',
        body: JSON.stringify(legacyData),
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': 'valid-key'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.error.message).toContain('Failed to convert legacy V1 format');
    });

    it('should handle V1 data size limit exceeded', async () => {
      const largeData = {
        ...validV1Data,
        data: {
          content: 'x'.repeat(10 * 1024 * 1024) // 10MB content
        }
      };

      const request = new NextRequest('http://localhost:3000/api/v1/items', {
        method: 'POST',
        body: JSON.stringify(largeData),
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': 'valid-key'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(413);
      expect(data.error.code).toBe('PAYLOAD_TOO_LARGE');
      expect(data.error.message).toContain('V1 data size limit exceeded');
    });

    it('should handle V1 storage quota exceeded', async () => {
      const { storeV1Data } = require('../../../lib/storage/v1-data-store');
      storeV1Data.mockRejectedValue(new Error('V1 storage quota exceeded for API key'));

      const request = new NextRequest('http://localhost:3000/api/v1/items', {
        method: 'POST',
        body: JSON.stringify(validV1Data),
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': 'quota-exceeded-key'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(507);
      expect(data.error.message).toContain('V1 storage quota exceeded');
    });

    it('should handle V1 duplicate resource creation', async () => {
      const { storeV1Data } = require('../../../lib/storage/v1-data-store');
      storeV1Data.mockRejectedValue(new Error('V1 resource with this identifier already exists'));

      const duplicateData = {
        ...validV1Data,
        id: 'existing-item-id'
      };

      const request = new NextRequest('http://localhost:3000/api/v1/items', {
        method: 'POST',
        body: JSON.stringify(duplicateData),
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': 'valid-key'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error.code).toBe('CONFLICT');
      expect(data.error.message).toContain('V1 resource with this identifier already exists');
    });

    it('should handle V1 API permission denied', async () => {
      const { checkApiKeyPermissions } = require('../../../lib/auth/api-key-validator');
      checkApiKeyPermissions.mockRejectedValue(new Error('API key does not have V1 write permissions'));

      const request = new NextRequest('http://localhost:3000/api/v1/items', {
        method: 'POST',
        body: JSON.stringify(validV1Data),
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': 'read-only-key'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AUTHORIZATION_ERROR');
      expect(data.error.message).toContain('API key does not have V1 write permissions');
    });

    it('should handle V1 malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/items', {
        method: 'POST',
        body: '{invalid json}',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': 'valid-key'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid JSON in V1 request body');
    });

    it('should handle V1 unsupported content type', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/items', {
        method: 'POST',
        body: 'xml-data',
        headers: { 
          'Content-Type': 'application/xml',
          'X-API-Key': 'valid-key'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(415);
      expect(data.error.message).toContain('Unsupported content type for V1 API');
    });
  });

  describe('PUT /api/v1 - V1 API Data Updates', () => {
    it('should handle V1 resource not found for update', async () => {
      const { getV1Data } = require('../../../lib/storage/v1-data-store');
      getV1Data.mockRejectedValue(new Error('V1 resource not found'));

      const updateData = {
        id: 'nonexistent-item',
        name: 'Updated Item'
      };

      const request = new NextRequest('http://localhost:3000/api/v1/items/nonexistent-item', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': 'valid-key'
        }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(data.error.message).toContain('V1 resource not found');
    });

    it('should handle V1 concurrent update conflict', async () => {
      const { updateV1Data } = require('../../../lib/storage/v1-data-store');
      updateV1Data.mockRejectedValue(new Error('V1 resource modified by another request'));

      const updateData = {
        id: 'item-123',
        name: 'Updated Item',
        version: 1
      };

      const request = new NextRequest('http://localhost:3000/api/v1/items/item-123', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': 'valid-key'
        }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error.code).toBe('CONFLICT');
      expect(data.error.message).toContain('V1 resource modified by another request');
    });

    it('should handle V1 update validation errors', async () => {
      const { processV1Data } = require('../../../lib/services/v1-api-service');
      processV1Data.mockRejectedValue(new Error('V1 update validation failed: invalid field values'));

      const invalidUpdateData = {
        id: 'item-123',
        name: '', // Empty name
        type: 'invalid-type'
      };

      const request = new NextRequest('http://localhost:3000/api/v1/items/item-123', {
        method: 'PUT',
        body: JSON.stringify(invalidUpdateData),
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': 'valid-key'
        }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('V1 update validation failed');
    });

    it('should handle V1 partial update not supported', async () => {
      const { updateV1Data } = require('../../../lib/storage/v1-data-store');
      updateV1Data.mockRejectedValue(new Error('V1 API does not support partial updates'));

      const partialUpdateData = {
        name: 'Updated Name' // Missing other required fields
      };

      const request = new NextRequest('http://localhost:3000/api/v1/items/item-123', {
        method: 'PUT',
        body: JSON.stringify(partialUpdateData),
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': 'valid-key'
        }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.error.message).toContain('V1 API does not support partial updates');
    });
  });

  describe('DELETE /api/v1 - V1 API Data Deletion', () => {
    it('should handle V1 resource not found for deletion', async () => {
      const { getV1Data } = require('../../../lib/storage/v1-data-store');
      getV1Data.mockRejectedValue(new Error('V1 resource not found'));

      const request = new NextRequest('http://localhost:3000/api/v1/items/nonexistent-item', {
        method: 'DELETE',
        headers: { 'X-API-Key': 'valid-key' }
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(data.error.message).toContain('V1 resource not found');
    });

    it('should handle V1 resource with dependencies', async () => {
      const { deleteV1Data } = require('../../../lib/storage/v1-data-store');
      deleteV1Data.mockRejectedValue(new Error('Cannot delete V1 resource: has active dependencies'));

      const request = new NextRequest('http://localhost:3000/api/v1/items/item-with-deps', {
        method: 'DELETE',
        headers: { 'X-API-Key': 'valid-key' }
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error.message).toContain('Cannot delete V1 resource: has active dependencies');
    });

    it('should handle V1 deletion permission denied', async () => {
      const { checkApiKeyPermissions } = require('../../../lib/auth/api-key-validator');
      checkApiKeyPermissions.mockRejectedValue(new Error('API key does not have V1 delete permissions'));

      const request = new NextRequest('http://localhost:3000/api/v1/items/item-123', {
        method: 'DELETE',
        headers: { 'X-API-Key': 'no-delete-key' }
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AUTHORIZATION_ERROR');
      expect(data.error.message).toContain('API key does not have V1 delete permissions');
    });

    it('should handle V1 deletion storage failure', async () => {
      const { deleteV1Data } = require('../../../lib/storage/v1-data-store');
      deleteV1Data.mockRejectedValue(new Error('Failed to delete V1 resource: storage error'));

      const request = new NextRequest('http://localhost:3000/api/v1/items/item-123', {
        method: 'DELETE',
        headers: { 'X-API-Key': 'valid-key' }
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Failed to delete V1 resource');
    });
  });

  describe('Legacy Support and Migration', () => {
    it('should handle legacy endpoint mapping failure', async () => {
      const { mapLegacyEndpoints } = require('../../../lib/services/legacy-support');
      mapLegacyEndpoints.mockRejectedValue(new Error('Legacy endpoint mapping failed'));

      const request = new NextRequest('http://localhost:3000/api/v1/legacy/old-endpoint', {
        headers: { 'X-API-Key': 'valid-key' }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.message).toContain('Legacy endpoint mapping failed');
    });

    it('should handle V1 to V2 migration errors', async () => {
      const { migrateV1ToV2 } = require('../../../lib/services/v1-api-service');
      migrateV1ToV2.mockRejectedValue(new Error('V1 to V2 migration failed: incompatible data format'));

      const request = new NextRequest('http://localhost:3000/api/v1/migrate', {
        method: 'POST',
        body: JSON.stringify({ resourceId: 'item-123' }),
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': 'valid-key'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.error.message).toContain('V1 to V2 migration failed');
    });

    it('should handle legacy data validation errors', async () => {
      const { validateLegacyData } = require('../../../lib/services/legacy-support');
      validateLegacyData.mockRejectedValue(new Error('Legacy data format validation failed'));

      const legacyRequest = {
        format: 'legacy-xml',
        data: '<invalid>xml</data>'
      };

      const request = new NextRequest('http://localhost:3000/api/v1/legacy/import', {
        method: 'POST',
        body: JSON.stringify(legacyRequest),
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': 'valid-key'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('Legacy data format validation failed');
    });

    it('should handle legacy compatibility check failure', async () => {
      const { getLegacyCompatibility } = require('../../../lib/services/legacy-support');
      getLegacyCompatibility.mockRejectedValue(new Error('Legacy compatibility check failed'));

      const request = new NextRequest('http://localhost:3000/api/v1/compatibility', {
        headers: { 
          'X-API-Key': 'valid-key',
          'X-Legacy-Version': '0.9'
        }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.error.message).toContain('Legacy compatibility check failed');
    });
  });

  describe('V1 API Metrics and Monitoring', () => {
    it('should handle V1 metrics collection failure', async () => {
      const { getV1ApiMetrics } = require('../../../lib/services/v1-api-service');
      getV1ApiMetrics.mockRejectedValue(new Error('Failed to collect V1 API metrics'));

      const request = new NextRequest('http://localhost:3000/api/v1/metrics', {
        headers: { 'X-API-Key': 'admin-key' }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Failed to collect V1 API metrics');
    });

    it('should handle V1 API usage tracking failure', async () => {
      const { trackApiKeyUsage } = require('../../../lib/auth/api-key-validator');
      trackApiKeyUsage.mockRejectedValue(new Error('Failed to track V1 API usage'));

      const request = new NextRequest('http://localhost:3000/api/v1/users', {
        headers: { 'X-API-Key': 'valid-key' }
      });

      const response = await GET(request);
      const data = await response.json();

      // Should not fail the main request, but log the tracking error
      expect(response.status).not.toBe(500);
      expect(data).toBeDefined();
    });

    it('should handle V1 rate limit info retrieval failure', async () => {
      const { getRateLimitInfo } = require('../../../lib/middleware/rate-limiter');
      getRateLimitInfo.mockRejectedValue(new Error('Failed to get V1 rate limit info'));

      const request = new NextRequest('http://localhost:3000/api/v1/rate-limit', {
        headers: { 'X-API-Key': 'valid-key' }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Failed to get V1 rate limit info');
    });
  });

  describe('Error Recovery and Monitoring', () => {
    it('should provide V1 API operation recovery suggestions', async () => {
      const { handleV1Request } = require('../../../lib/services/v1-api-service');
      handleV1Request.mockRejectedValue(new Error('Temporary V1 API service outage'));

      const request = new NextRequest('http://localhost:3000/api/v1/users', {
        headers: { 'X-API-Key': 'valid-key' }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.error.recovery).toBeDefined();
      expect(data.error.recovery.suggestions).toContain('Consider migrating to V2 API');
      expect(data.error.recovery.suggestions).toContain('Retry V1 request');
    });

    it('should track V1 API operation performance', async () => {
      const { handleV1Request } = require('../../../lib/services/v1-api-service');
      handleV1Request.mockRejectedValue(new Error('Test error'));

      const request = new NextRequest('http://localhost:3000/api/v1/users', {
        headers: { 'X-API-Key': 'valid-key' }
      });

      await GET(request);

      const stats = errorHandler.getErrorStats();
      expect(stats.errorCount).toBeGreaterThan(0);
    });

    it('should include V1 API context in error responses', async () => {
      const { handleV1Request } = require('../../../lib/services/v1-api-service');
      handleV1Request.mockRejectedValue(new Error('Test error'));

      const request = new NextRequest('http://localhost:3000/api/v1/users', {
        headers: { 'X-API-Key': 'valid-key' }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.error.context).toBeDefined();
      expect(data.error.context.apiVersion).toBe('v1');
      expect(data.error.context.endpoint).toBe('/api/v1/users');
      expect(data.error.context.deprecationWarning).toBeDefined();
    });

    it('should provide migration guidance in error responses', async () => {
      const { handleV1Request } = require('../../../lib/services/v1-api-service');
      handleV1Request.mockRejectedValue(new Error('V1 endpoint deprecated'));

      const request = new NextRequest('http://localhost:3000/api/v1/deprecated-endpoint', {
        headers: { 'X-API-Key': 'valid-key' }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.error.migration).toBeDefined();
      expect(data.error.migration.v2Endpoint).toBeDefined();
      expect(data.error.migration.migrationGuide).toBeDefined();
    });
  });
});