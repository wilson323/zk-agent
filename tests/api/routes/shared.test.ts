/**
 * 共享功能API路由错误处理测试
 * 测试内容共享、权限管理、链接生成等各种错误场景
 */

import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '@/app/api/shared/route';
// import { GlobalErrorHandler } from '@/lib/middleware/global-error-handler';
// import { AgentError, AgentErrorType, ErrorSeverity } from '@/lib/errors/agent-errors';

// Mock dependencies
jest.mock('../../../lib/services/sharing-manager', () => ({
  createShareLink: jest.fn(),
  validateShareAccess: jest.fn(),
  updateShareSettings: jest.fn(),
  revokeShareLink: jest.fn(),
  getSharedContent: jest.fn(),
  trackShareActivity: jest.fn(),
  generateShareToken: jest.fn(),
  validateShareToken: jest.fn()
}));

jest.mock('../../../lib/storage/content-store', () => ({
  getContent: jest.fn(),
  storeSharedContent: jest.fn(),
  updateContentMetadata: jest.fn(),
  deleteSharedContent: jest.fn(),
  checkContentExists: jest.fn(),
  validateContentAccess: jest.fn()
}));

jest.mock('../../../lib/security/share-security', () => ({
  validateSharePermissions: jest.fn(),
  checkShareLimits: jest.fn(),
  sanitizeShareData: jest.fn(),
  enforceSharePolicies: jest.fn(),
  validateExpirationDate: jest.fn(),
  checkPasswordStrength: jest.fn()
}));

jest.mock('../../../lib/auth/session', () => ({
  validateSession: jest.fn(),
  checkUserPermissions: jest.fn(),
  getUserId: jest.fn()
}));

describe('Shared API Error Handling', () => {
  let errorHandler: any;

  beforeEach(() => {
    // errorHandler = GlobalErrorHandler.getInstance();
    errorHandler = { errorCount: 0, circuitBreakerOpen: false };
    jest.clearAllMocks();
  });

  describe('GET /api/shared - Get Shared Content', () => {
    it('should handle invalid share token', async () => {
      const { validateShareToken } = require('../../../lib/services/sharing-manager');
      validateShareToken.mockRejectedValue(new Error('Invalid share token'));

      const request = new NextRequest('http://localhost:3000/api/shared?token=invalid-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('AUTHENTICATION_ERROR');
      expect(data.error.message).toContain('Invalid share token');
    });

    it('should handle missing share token', async () => {
      const request = new NextRequest('http://localhost:3000/api/shared');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Share token is required');
    });

    it('should handle expired share link', async () => {
      const { validateShareAccess } = require('../../../lib/services/sharing-manager');
      validateShareAccess.mockRejectedValue(new Error('Share link has expired'));

      const request = new NextRequest('http://localhost:3000/api/shared?token=expired-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(410); // Gone
      expect(data.error.message).toContain('Share link has expired');
    });

    it('should handle revoked share link', async () => {
      const { validateShareAccess } = require('../../../lib/services/sharing-manager');
      validateShareAccess.mockRejectedValue(new Error('Share link has been revoked'));

      const request = new NextRequest('http://localhost:3000/api/shared?token=revoked-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AUTHORIZATION_ERROR');
      expect(data.error.message).toContain('Share link has been revoked');
    });

    it('should handle shared content not found', async () => {
      const { getSharedContent } = require('../../../lib/services/sharing-manager');
      getSharedContent.mockRejectedValue(new Error('Shared content not found'));

      const request = new NextRequest('http://localhost:3000/api/shared?token=valid-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(data.error.message).toContain('Shared content not found');
    });

    it('should handle password-protected share without password', async () => {
      const { validateShareAccess } = require('../../../lib/services/sharing-manager');
      validateShareAccess.mockRejectedValue(new Error('Password required for protected share'));

      const request = new NextRequest('http://localhost:3000/api/shared?token=protected-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.message).toContain('Password required for protected share');
    });

    it('should handle incorrect share password', async () => {
      const { validateShareAccess } = require('../../../lib/services/sharing-manager');
      validateShareAccess.mockRejectedValue(new Error('Incorrect share password'));

      const request = new NextRequest('http://localhost:3000/api/shared?token=protected-token&password=wrong');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.message).toContain('Incorrect share password');
    });

    it('should handle share access limit exceeded', async () => {
      const { validateShareAccess } = require('../../../lib/services/sharing-manager');
      validateShareAccess.mockRejectedValue(new Error('Share access limit exceeded'));

      const request = new NextRequest('http://localhost:3000/api/shared?token=limited-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error.code).toBe('RATE_LIMIT_ERROR');
      expect(data.error.message).toContain('Share access limit exceeded');
    });

    it('should handle corrupted shared content', async () => {
      const { getSharedContent } = require('../../../lib/services/sharing-manager');
      getSharedContent.mockRejectedValue(new Error('Shared content is corrupted'));

      const request = new NextRequest('http://localhost:3000/api/shared?token=corrupted-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Shared content is corrupted');
    });

    it('should handle content storage service unavailable', async () => {
      const { getContent } = require('../../../lib/storage/content-store');
      getContent.mockRejectedValue(new Error('Content storage service unavailable'));

      const request = new NextRequest('http://localhost:3000/api/shared?token=valid-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error.message).toContain('Content storage service unavailable');
    });
  });

  describe('POST /api/shared - Create Share Link', () => {
    let validShareData: any;

    beforeEach(() => {
      validShareData = {
        contentId: 'content-123',
        contentType: 'document',
        permissions: {
          read: true,
          download: false,
          comment: false
        },
        settings: {
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          maxAccess: 100,
          requirePassword: false,
          allowAnonymous: true
        }
      };
    });

    it('should handle missing content ID', async () => {
      const invalidData = { ...validShareData };
      delete invalidData.contentId;

      const request = new NextRequest('http://localhost:3000/api/shared', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.details).toContain('contentId');
    });

    it('should handle content not found for sharing', async () => {
      const { checkContentExists } = require('../../../lib/storage/content-store');
      checkContentExists.mockRejectedValue(new Error('Content not found'));

      const request = new NextRequest('http://localhost:3000/api/shared', {
        method: 'POST',
        body: JSON.stringify(validShareData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(data.error.message).toContain('Content not found');
    });

    it('should handle insufficient permissions to share content', async () => {
      const { validateContentAccess } = require('../../../lib/storage/content-store');
      validateContentAccess.mockRejectedValue(new Error('Insufficient permissions to share content'));

      const request = new NextRequest('http://localhost:3000/api/shared', {
        method: 'POST',
        body: JSON.stringify(validShareData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AUTHORIZATION_ERROR');
    });

    it('should handle invalid expiration date', async () => {
      const { validateExpirationDate } = require('../../../lib/security/share-security');
      validateExpirationDate.mockRejectedValue(new Error('Invalid expiration date: must be in the future'));

      const invalidExpirationData = {
        ...validShareData,
        settings: {
          ...validShareData.settings,
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
        }
      };

      const request = new NextRequest('http://localhost:3000/api/shared', {
        method: 'POST',
        body: JSON.stringify(invalidExpirationData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('Invalid expiration date');
    });

    it('should handle weak password for protected share', async () => {
      const { checkPasswordStrength } = require('../../../lib/security/share-security');
      checkPasswordStrength.mockRejectedValue(new Error('Password does not meet security requirements'));

      const weakPasswordData = {
        ...validShareData,
        settings: {
          ...validShareData.settings,
          requirePassword: true,
          password: '123'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/shared', {
        method: 'POST',
        body: JSON.stringify(weakPasswordData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('Password does not meet security requirements');
    });

    it('should handle share limit exceeded for user', async () => {
      const { checkShareLimits } = require('../../../lib/security/share-security');
      checkShareLimits.mockRejectedValue(new Error('User share limit exceeded'));

      const request = new NextRequest('http://localhost:3000/api/shared', {
        method: 'POST',
        body: JSON.stringify(validShareData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error.message).toContain('User share limit exceeded');
    });

    it('should handle share token generation failure', async () => {
      const { generateShareToken } = require('../../../lib/services/sharing-manager');
      generateShareToken.mockRejectedValue(new Error('Failed to generate share token'));

      const request = new NextRequest('http://localhost:3000/api/shared', {
        method: 'POST',
        body: JSON.stringify(validShareData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Failed to generate share token');
    });

    it('should handle share link creation failure', async () => {
      const { createShareLink } = require('../../../lib/services/sharing-manager');
      createShareLink.mockRejectedValue(new Error('Failed to create share link'));

      const request = new NextRequest('http://localhost:3000/api/shared', {
        method: 'POST',
        body: JSON.stringify(validShareData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Failed to create share link');
    });

    it('should handle invalid content type for sharing', async () => {
      const { enforceSharePolicies } = require('../../../lib/security/share-security');
      enforceSharePolicies.mockRejectedValue(new Error('Content type not allowed for sharing'));

      const invalidTypeData = {
        ...validShareData,
        contentType: 'restricted-type'
      };

      const request = new NextRequest('http://localhost:3000/api/shared', {
        method: 'POST',
        body: JSON.stringify(invalidTypeData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.message).toContain('Content type not allowed for sharing');
    });
  });

  describe('PUT /api/shared - Update Share Settings', () => {
    let validUpdateData: any;

    beforeEach(() => {
      validUpdateData = {
        shareId: 'share-123',
        settings: {
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
          maxAccess: 200,
          requirePassword: true,
          password: 'new-secure-password-123'
        }
      };
    });

    it('should handle share not found for update', async () => {
      const { updateShareSettings } = require('../../../lib/services/sharing-manager');
      updateShareSettings.mockRejectedValue(new Error('Share not found'));

      const request = new NextRequest('http://localhost:3000/api/shared', {
        method: 'PUT',
        body: JSON.stringify({ shareId: 'nonexistent-share', settings: {} }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(data.error.message).toContain('Share not found');
    });

    it('should handle unauthorized share update', async () => {
      const { validateSharePermissions } = require('../../../lib/security/share-security');
      validateSharePermissions.mockRejectedValue(new Error('Not authorized to update this share'));

      const request = new NextRequest('http://localhost:3000/api/shared', {
        method: 'PUT',
        body: JSON.stringify(validUpdateData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer unauthorized-token'
        }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AUTHORIZATION_ERROR');
    });

    it('should handle invalid share settings update', async () => {
      const { updateShareSettings } = require('../../../lib/services/sharing-manager');
      updateShareSettings.mockRejectedValue(new Error('Invalid share settings'));

      const invalidSettings = {
        shareId: 'share-123',
        settings: {
          maxAccess: -1, // Invalid negative value
          expiresAt: 'invalid-date'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/shared', {
        method: 'PUT',
        body: JSON.stringify(invalidSettings),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle share update conflict', async () => {
      const { updateShareSettings } = require('../../../lib/services/sharing-manager');
      updateShareSettings.mockRejectedValue(new Error('Share has been modified by another user'));

      const request = new NextRequest('http://localhost:3000/api/shared', {
        method: 'PUT',
        body: JSON.stringify(validUpdateData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error.message).toContain('Share has been modified by another user');
    });

    it('should handle share update service failure', async () => {
      const { updateShareSettings } = require('../../../lib/services/sharing-manager');
      updateShareSettings.mockRejectedValue(new Error('Share update service temporarily unavailable'));

      const request = new NextRequest('http://localhost:3000/api/shared', {
        method: 'PUT',
        body: JSON.stringify(validUpdateData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error.message).toContain('Share update service temporarily unavailable');
    });
  });

  describe('DELETE /api/shared - Revoke Share Link', () => {
    it('should handle share not found for revocation', async () => {
      const { revokeShareLink } = require('../../../lib/services/sharing-manager');
      revokeShareLink.mockRejectedValue(new Error('Share not found'));

      const request = new NextRequest('http://localhost:3000/api/shared?shareId=nonexistent-share', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(data.error.message).toContain('Share not found');
    });

    it('should handle unauthorized share revocation', async () => {
      const { validateSharePermissions } = require('../../../lib/security/share-security');
      validateSharePermissions.mockRejectedValue(new Error('Not authorized to revoke this share'));

      const request = new NextRequest('http://localhost:3000/api/shared?shareId=share-123', {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer unauthorized-token' }
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AUTHORIZATION_ERROR');
    });

    it('should handle already revoked share', async () => {
      const { revokeShareLink } = require('../../../lib/services/sharing-manager');
      revokeShareLink.mockRejectedValue(new Error('Share has already been revoked'));

      const request = new NextRequest('http://localhost:3000/api/shared?shareId=revoked-share', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(410); // Gone
      expect(data.error.message).toContain('Share has already been revoked');
    });

    it('should handle share revocation failure', async () => {
      const { revokeShareLink } = require('../../../lib/services/sharing-manager');
      revokeShareLink.mockRejectedValue(new Error('Failed to revoke share link'));

      const request = new NextRequest('http://localhost:3000/api/shared?shareId=share-123', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Failed to revoke share link');
    });
  });

  describe('Share Activity Tracking', () => {
    it('should handle activity tracking failure', async () => {
      const { trackShareActivity } = require('../../../lib/services/sharing-manager');
      trackShareActivity.mockRejectedValue(new Error('Activity tracking service unavailable'));

      const request = new NextRequest('http://localhost:3000/api/shared?token=valid-token');
      const response = await GET(request);

      // Should not fail the main request
      expect(response.status).not.toBe(500);
    });

    it('should handle activity log storage failure', async () => {
      const { trackShareActivity } = require('../../../lib/services/sharing-manager');
      trackShareActivity.mockRejectedValue(new Error('Activity log storage full'));

      const request = new NextRequest('http://localhost:3000/api/shared?token=valid-token');
      await GET(request);

      // Should continue processing despite logging failure
      expect(trackShareActivity).toHaveBeenCalled();
    });
  });

  describe('Share Security Validation', () => {
    it('should handle malicious share data', async () => {
      const { sanitizeShareData } = require('../../../lib/security/share-security');
      sanitizeShareData.mockRejectedValue(new Error('Malicious content detected in share data'));

      const maliciousData = {
        contentId: 'content-123',
        contentType: '<script>alert("xss")</script>',
        permissions: { read: true }
      };

      const request = new NextRequest('http://localhost:3000/api/shared', {
        method: 'POST',
        body: JSON.stringify(maliciousData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('Malicious content detected');
    });

    it('should handle suspicious share access pattern', async () => {
      const { enforceSharePolicies } = require('../../../lib/security/share-security');
      enforceSharePolicies.mockRejectedValue(new Error('Suspicious access pattern detected'));

      const request = new NextRequest('http://localhost:3000/api/shared?token=valid-token', {
        headers: {
          'User-Agent': 'Bot/1.0',
          'X-Forwarded-For': '192.168.1.1, 10.0.0.1, 172.16.0.1'
        }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.message).toContain('Suspicious access pattern detected');
    });
  });

  describe('Batch Share Operations', () => {
    it('should handle batch share creation with partial failures', async () => {
      const { createShareLink } = require('../../../lib/services/sharing-manager');
      createShareLink.mockImplementation((data) => {
        if (data.contentId === 'invalid-content') {
          throw new Error('Content not found');
        }
        return Promise.resolve({ shareId: 'share-123', token: 'token-123' });
      });

      const batchData = {
        shares: [
          { contentId: 'content-1', contentType: 'document' },
          { contentId: 'invalid-content', contentType: 'document' },
          { contentId: 'content-3', contentType: 'image' }
        ]
      };

      const request = new NextRequest('http://localhost:3000/api/shared/batch', {
        method: 'POST',
        body: JSON.stringify(batchData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(207); // Multi-status
      expect(data.results).toBeDefined();
      expect(data.errors).toBeDefined();
    });

    it('should handle batch share revocation with partial failures', async () => {
      const { revokeShareLink } = require('../../../lib/services/sharing-manager');
      revokeShareLink.mockImplementation((shareId) => {
        if (shareId === 'nonexistent-share') {
          throw new Error('Share not found');
        }
        return Promise.resolve();
      });

      const batchData = {
        shareIds: ['share-1', 'nonexistent-share', 'share-3']
      };

      const request = new NextRequest('http://localhost:3000/api/shared/batch', {
        method: 'DELETE',
        body: JSON.stringify(batchData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(207); // Multi-status
      expect(data.results).toBeDefined();
      expect(data.errors).toBeDefined();
    });
  });

  describe('Error Recovery and Monitoring', () => {
    it('should provide share operation recovery suggestions', async () => {
      const { createShareLink } = require('../../../lib/services/sharing-manager');
      createShareLink.mockRejectedValue(new Error('Temporary sharing service outage'));

      const validShareData = {
        contentId: 'content-123',
        contentType: 'document',
        permissions: { read: true }
      };

      const request = new NextRequest('http://localhost:3000/api/shared', {
        method: 'POST',
        body: JSON.stringify(validShareData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.error.recovery).toBeDefined();
      expect(data.error.recovery.suggestions).toContain('Retry share creation');
    });

    it('should track share operation performance', async () => {
      const { createShareLink } = require('../../../lib/services/sharing-manager');
      createShareLink.mockRejectedValue(new Error('Test error'));

      const validShareData = {
        contentId: 'content-123',
        contentType: 'document',
        permissions: { read: true }
      };

      const request = new NextRequest('http://localhost:3000/api/shared', {
        method: 'POST',
        body: JSON.stringify(validShareData),
        headers: { 'Content-Type': 'application/json' }
      });

      await POST(request);

      const stats = errorHandler.getErrorStats();
      expect(stats.shareErrorCount).toBeGreaterThan(0);
    });

    it('should include share context in error responses', async () => {
      const { createShareLink } = require('../../../lib/services/sharing-manager');
      createShareLink.mockRejectedValue(new Error('Test error'));

      const validShareData = {
        contentId: 'content-123',
        contentType: 'document',
        permissions: { read: true }
      };

      const request = new NextRequest('http://localhost:3000/api/shared', {
        method: 'POST',
        body: JSON.stringify(validShareData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.error.context).toBeDefined();
      expect(data.error.context.operation).toBe('createShareLink');
      expect(data.error.context.contentId).toBe('content-123');
    });
  });
});