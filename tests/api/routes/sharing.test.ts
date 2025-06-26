/**
 * Sharing API路由错误处理测试
 * 测试分享功能相关的各种错误场景
 */

import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '../../../app/api/sharing/route';
// import { GlobalErrorHandler } from '../../../lib/middleware/global-error-handler';
// import { AgentError, AgentErrorType, ErrorSeverity } from '../../../lib/errors/agent-errors';

// Mock dependencies
jest.mock('../../../lib/services/sharing-service', () => ({
  createShare: jest.fn(),
  getShare: jest.fn(),
  updateShare: jest.fn(),
  deleteShare: jest.fn(),
  validateShareToken: jest.fn(),
  generateShareLink: jest.fn(),
  checkSharePermissions: jest.fn(),
  getShareAnalytics: jest.fn(),
  trackShareAccess: jest.fn(),
  validateShareExpiration: jest.fn()
}));

jest.mock('../../../lib/services/content-service', () => ({
  getContent: jest.fn(),
  validateContentAccess: jest.fn(),
  checkContentOwnership: jest.fn(),
  getContentMetadata: jest.fn(),
  validateContentType: jest.fn()
}));

jest.mock('../../../lib/services/notification-service', () => ({
  sendShareNotification: jest.fn(),
  notifyShareAccess: jest.fn(),
  sendShareExpiredNotification: jest.fn()
}));

jest.mock('../../../lib/auth/session', () => ({
  validateSession: jest.fn(),
  getUserPermissions: jest.fn(),
  checkUserAccess: jest.fn()
}));

jest.mock('../../../lib/storage/share-store', () => ({
  storeShare: jest.fn(),
  getShare: jest.fn(),
  updateShare: jest.fn(),
  deleteShare: jest.fn(),
  listShares: jest.fn(),
  cleanupExpiredShares: jest.fn()
}));

jest.mock('../../../lib/security/access-control', () => ({
  validateShareAccess: jest.fn(),
  checkRateLimit: jest.fn(),
  detectSuspiciousActivity: jest.fn(),
  validateIPAccess: jest.fn()
}));

describe('Sharing API Error Handling', () => {
  let errorHandler: any;

  beforeEach(() => {
    // errorHandler = GlobalErrorHandler.getInstance();
    errorHandler = { errorCount: 0, circuitBreakerOpen: false };
    jest.clearAllMocks();
  });

  describe('GET /api/sharing - Get Share Information', () => {
    it('should handle invalid share token', async () => {
      const { validateShareToken } = require('../../../lib/services/sharing-service');
      validateShareToken.mockRejectedValue(new Error('Invalid or malformed share token'));

      const request = new NextRequest('http://localhost:3000/api/sharing?token=invalid-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid or malformed share token');
    });

    it('should handle expired share token', async () => {
      const { validateShareExpiration } = require('../../../lib/services/sharing-service');
      validateShareExpiration.mockRejectedValue(new Error('Share token has expired'));

      const request = new NextRequest('http://localhost:3000/api/sharing?token=expired-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(410);
      expect(data.error.code).toBe('EXPIRED');
      expect(data.error.message).toContain('Share token has expired');
    });

    it('should handle share not found', async () => {
      const { getShare } = require('../../../lib/services/sharing-service');
      getShare.mockRejectedValue(new Error('Share not found'));

      const request = new NextRequest('http://localhost:3000/api/sharing?token=nonexistent-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(data.error.message).toContain('Share not found');
    });

    it('should handle share access denied', async () => {
      const { checkSharePermissions } = require('../../../lib/services/sharing-service');
      checkSharePermissions.mockRejectedValue(new Error('Access denied: insufficient permissions'));

      const request = new NextRequest('http://localhost:3000/api/sharing?token=restricted-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AUTHORIZATION_ERROR');
      expect(data.error.message).toContain('Access denied');
    });

    it('should handle password protected share without password', async () => {
      const { getShare } = require('../../../lib/services/sharing-service');
      getShare.mockRejectedValue(new Error('Password required for protected share'));

      const request = new NextRequest('http://localhost:3000/api/sharing?token=protected-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('AUTHENTICATION_ERROR');
      expect(data.error.message).toContain('Password required');
    });

    it('should handle incorrect share password', async () => {
      const { validateShareToken } = require('../../../lib/services/sharing-service');
      validateShareToken.mockRejectedValue(new Error('Incorrect password for protected share'));

      const request = new NextRequest('http://localhost:3000/api/sharing?token=protected-token&password=wrong');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('AUTHENTICATION_ERROR');
      expect(data.error.message).toContain('Incorrect password');
    });

    it('should handle share access limit exceeded', async () => {
      const { trackShareAccess } = require('../../../lib/services/sharing-service');
      trackShareAccess.mockRejectedValue(new Error('Share access limit exceeded'));

      const request = new NextRequest('http://localhost:3000/api/sharing?token=limited-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error.code).toBe('RATE_LIMIT_ERROR');
      expect(data.error.message).toContain('Share access limit exceeded');
    });

    it('should handle corrupted share content', async () => {
      const { getContent } = require('../../../lib/services/content-service');
      getContent.mockRejectedValue(new Error('Share content is corrupted or unavailable'));

      const request = new NextRequest('http://localhost:3000/api/sharing?token=corrupted-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.error.message).toContain('Share content is corrupted');
    });

    it('should handle sharing service unavailable', async () => {
      const { getShare } = require('../../../lib/services/sharing-service');
      getShare.mockRejectedValue(new Error('Sharing service temporarily unavailable'));

      const request = new NextRequest('http://localhost:3000/api/sharing?token=valid-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error.message).toContain('Sharing service temporarily unavailable');
    });

    it('should handle missing share token parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/sharing');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Share token is required');
    });
  });

  describe('POST /api/sharing - Create Share', () => {
    let validShareData: any;

    beforeEach(() => {
      validShareData = {
        contentId: 'content-123',
        contentType: 'document',
        permissions: ['read'],
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        password: null,
        maxAccess: 10
      };
    });

    it('should handle missing content ID', async () => {
      const invalidData = { ...validShareData };
      delete invalidData.contentId;

      const request = new NextRequest('http://localhost:3000/api/sharing', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.details).toContain('contentId');
    });

    it('should handle content not found', async () => {
      const { getContent } = require('../../../lib/services/content-service');
      getContent.mockRejectedValue(new Error('Content not found'));

      const request = new NextRequest('http://localhost:3000/api/sharing', {
        method: 'POST',
        body: JSON.stringify({ ...validShareData, contentId: 'nonexistent-content' }),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(data.error.message).toContain('Content not found');
    });

    it('should handle insufficient permissions to share content', async () => {
      const { checkContentOwnership } = require('../../../lib/services/content-service');
      checkContentOwnership.mockRejectedValue(new Error('Insufficient permissions to share this content'));

      const request = new NextRequest('http://localhost:3000/api/sharing', {
        method: 'POST',
        body: JSON.stringify(validShareData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer limited-user-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AUTHORIZATION_ERROR');
      expect(data.error.message).toContain('Insufficient permissions');
    });

    it('should handle invalid expiration date', async () => {
      const invalidExpirationData = {
        ...validShareData,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Past date
      };

      const request = new NextRequest('http://localhost:3000/api/sharing', {
        method: 'POST',
        body: JSON.stringify(invalidExpirationData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid expiration date');
    });

    it('should handle weak password for protected share', async () => {
      const weakPasswordData = {
        ...validShareData,
        password: '123' // Too weak
      };

      const request = new NextRequest('http://localhost:3000/api/sharing', {
        method: 'POST',
        body: JSON.stringify(weakPasswordData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Password too weak');
    });

    it('should handle share limit exceeded for user', async () => {
      const { createShare } = require('../../../lib/services/sharing-service');
      createShare.mockRejectedValue(new Error('Share limit exceeded for user'));

      const request = new NextRequest('http://localhost:3000/api/sharing', {
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
      expect(data.error.code).toBe('RATE_LIMIT_ERROR');
      expect(data.error.message).toContain('Share limit exceeded');
    });

    it('should handle share token generation failure', async () => {
      const { generateShareLink } = require('../../../lib/services/sharing-service');
      generateShareLink.mockRejectedValue(new Error('Failed to generate share token'));

      const request = new NextRequest('http://localhost:3000/api/sharing', {
        method: 'POST',
        body: JSON.stringify(validShareData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Failed to generate share token');
    });

    it('should handle invalid content type for sharing', async () => {
      const { validateContentType } = require('../../../lib/services/content-service');
      validateContentType.mockRejectedValue(new Error('Content type not supported for sharing'));

      const invalidContentTypeData = {
        ...validShareData,
        contentType: 'unsupported-type'
      };

      const request = new NextRequest('http://localhost:3000/api/sharing', {
        method: 'POST',
        body: JSON.stringify(invalidContentTypeData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(415);
      expect(data.error.message).toContain('Content type not supported');
    });

    it('should handle share storage failure', async () => {
      const { storeShare } = require('../../../lib/storage/share-store');
      storeShare.mockRejectedValue(new Error('Failed to store share: database error'));

      const request = new NextRequest('http://localhost:3000/api/sharing', {
        method: 'POST',
        body: JSON.stringify(validShareData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Failed to store share');
    });

    it('should handle notification service failure', async () => {
      const { sendShareNotification } = require('../../../lib/services/notification-service');
      sendShareNotification.mockRejectedValue(new Error('Failed to send share notification'));

      const notificationData = {
        ...validShareData,
        notifyUsers: ['user@example.com']
      };

      const request = new NextRequest('http://localhost:3000/api/sharing', {
        method: 'POST',
        body: JSON.stringify(notificationData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Failed to send share notification');
    });
  });

  describe('PUT /api/sharing - Update Share', () => {
    it('should handle share not found for update', async () => {
      const { getShare } = require('../../../lib/storage/share-store');
      getShare.mockRejectedValue(new Error('Share not found'));

      const updateData = {
        shareId: 'nonexistent-share',
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      };

      const request = new NextRequest('http://localhost:3000/api/sharing', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(data.error.message).toContain('Share not found');
    });

    it('should handle unauthorized share update', async () => {
      const { checkSharePermissions } = require('../../../lib/services/sharing-service');
      checkSharePermissions.mockRejectedValue(new Error('Unauthorized to update this share'));

      const updateData = {
        shareId: 'share-123',
        maxAccess: 20
      };

      const request = new NextRequest('http://localhost:3000/api/sharing', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer other-user-token'
        }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AUTHORIZATION_ERROR');
      expect(data.error.message).toContain('Unauthorized to update');
    });

    it('should handle invalid share update data', async () => {
      const invalidUpdateData = {
        shareId: 'share-123',
        maxAccess: -1, // Invalid value
        expiresAt: 'invalid-date'
      };

      const request = new NextRequest('http://localhost:3000/api/sharing', {
        method: 'PUT',
        body: JSON.stringify(invalidUpdateData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid update data');
    });

    it('should handle concurrent share update conflict', async () => {
      const { updateShare } = require('../../../lib/services/sharing-service');
      updateShare.mockRejectedValue(new Error('Concurrent update detected: share modified by another user'));

      const updateData = {
        shareId: 'share-123',
        version: 1,
        maxAccess: 15
      };

      const request = new NextRequest('http://localhost:3000/api/sharing', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error.code).toBe('CONFLICT');
      expect(data.error.message).toContain('Concurrent update detected');
    });

    it('should handle share update storage failure', async () => {
      const { updateShare } = require('../../../lib/storage/share-store');
      updateShare.mockRejectedValue(new Error('Failed to update share: storage error'));

      const updateData = {
        shareId: 'share-123',
        maxAccess: 15
      };

      const request = new NextRequest('http://localhost:3000/api/sharing', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Failed to update share');
    });
  });

  describe('DELETE /api/sharing - Delete Share', () => {
    it('should handle share not found for deletion', async () => {
      const { getShare } = require('../../../lib/storage/share-store');
      getShare.mockRejectedValue(new Error('Share not found'));

      const request = new NextRequest('http://localhost:3000/api/sharing?shareId=nonexistent-share', {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer user-token' }
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(data.error.message).toContain('Share not found');
    });

    it('should handle unauthorized share deletion', async () => {
      const { checkSharePermissions } = require('../../../lib/services/sharing-service');
      checkSharePermissions.mockRejectedValue(new Error('Unauthorized to delete this share'));

      const request = new NextRequest('http://localhost:3000/api/sharing?shareId=share-123', {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer other-user-token' }
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AUTHORIZATION_ERROR');
      expect(data.error.message).toContain('Unauthorized to delete');
    });

    it('should handle share deletion storage failure', async () => {
      const { deleteShare } = require('../../../lib/storage/share-store');
      deleteShare.mockRejectedValue(new Error('Failed to delete share: storage error'));

      const request = new NextRequest('http://localhost:3000/api/sharing?shareId=share-123', {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer user-token' }
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Failed to delete share');
    });

    it('should handle missing share ID parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/sharing', {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer user-token' }
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Share ID is required');
    });
  });

  describe('Security and Access Control', () => {
    it('should handle malicious share data injection', async () => {
      const maliciousData = {
        contentId: '<script>alert("xss")</script>',
        contentType: 'document',
        permissions: ['read', 'execute'] // Suspicious permission
      };

      const request = new NextRequest('http://localhost:3000/api/sharing', {
        method: 'POST',
        body: JSON.stringify(maliciousData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('SECURITY_VIOLATION');
      expect(data.error.message).toContain('Malicious data detected');
    });

    it('should handle suspicious share access patterns', async () => {
      const { detectSuspiciousActivity } = require('../../../lib/security/access-control');
      detectSuspiciousActivity.mockRejectedValue(new Error('Suspicious access pattern detected'));

      const request = new NextRequest('http://localhost:3000/api/sharing?token=valid-token', {
        headers: { 'X-Forwarded-For': '192.168.1.100' }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('SECURITY_VIOLATION');
      expect(data.error.message).toContain('Suspicious access pattern');
    });

    it('should handle IP address restriction violations', async () => {
      const { validateIPAccess } = require('../../../lib/security/access-control');
      validateIPAccess.mockRejectedValue(new Error('Access denied: IP address not allowed'));

      const request = new NextRequest('http://localhost:3000/api/sharing?token=restricted-token', {
        headers: { 'X-Forwarded-For': '10.0.0.1' }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('ACCESS_DENIED');
      expect(data.error.message).toContain('IP address not allowed');
    });

    it('should handle share rate limiting', async () => {
      const { checkRateLimit } = require('../../../lib/security/access-control');
      checkRateLimit.mockRejectedValue(new Error('Rate limit exceeded for sharing operations'));

      const request = new NextRequest('http://localhost:3000/api/sharing', {
        method: 'POST',
        body: JSON.stringify({
          contentId: 'content-123',
          contentType: 'document'
        }),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error.code).toBe('RATE_LIMIT_ERROR');
      expect(data.error.message).toContain('Rate limit exceeded');
    });
  });

  describe('Batch Operations and Analytics', () => {
    it('should handle batch share creation with partial failures', async () => {
      const { createShare } = require('../../../lib/services/sharing-service');
      createShare.mockImplementation((data: any) => {
        if (data.contentId === 'invalid-content') {
          throw new Error('Content not found');
        }
        return Promise.resolve({ shareId: 'share-' + data.contentId });
      });

      const batchData = {
        shares: [
          { contentId: 'content-1', contentType: 'document' },
          { contentId: 'invalid-content', contentType: 'document' },
          { contentId: 'content-3', contentType: 'document' }
        ]
      };

      const request = new NextRequest('http://localhost:3000/api/sharing/batch', {
        method: 'POST',
        body: JSON.stringify(batchData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(207); // Multi-status
      expect(data.results).toHaveLength(3);
      expect(data.results[1].error).toBeDefined();
    });

    it('should handle share analytics calculation failure', async () => {
      const { getShareAnalytics } = require('../../../lib/services/sharing-service');
      getShareAnalytics.mockRejectedValue(new Error('Failed to calculate share analytics'));

      const request = new NextRequest('http://localhost:3000/api/sharing/analytics?shareId=share-123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Failed to calculate share analytics');
    });

    it('should handle large batch operation size limit', async () => {
      const largeBatchData = {
        shares: Array(1001).fill({ contentId: 'content-1', contentType: 'document' })
      };

      const request = new NextRequest('http://localhost:3000/api/sharing/batch', {
        method: 'POST',
        body: JSON.stringify(largeBatchData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(413);
      expect(data.error.code).toBe('PAYLOAD_TOO_LARGE');
      expect(data.error.message).toContain('Batch size exceeds limit');
    });
  });

  describe('Error Recovery and Monitoring', () => {
    it('should provide sharing operation recovery suggestions', async () => {
      const { createShare } = require('../../../lib/services/sharing-service');
      createShare.mockRejectedValue(new Error('Temporary sharing service outage'));

      const validShareData = {
        contentId: 'content-123',
        contentType: 'document'
      };

      const request = new NextRequest('http://localhost:3000/api/sharing', {
        method: 'POST',
        body: JSON.stringify(validShareData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.error.recovery).toBeDefined();
      expect(data.error.recovery.suggestions).toContain('Retry share creation');
    });

    it('should track sharing operation performance', async () => {
      const { createShare } = require('../../../lib/services/sharing-service');
      createShare.mockRejectedValue(new Error('Test error'));

      const validShareData = {
        contentId: 'content-123',
        contentType: 'document'
      };

      const request = new NextRequest('http://localhost:3000/api/sharing', {
        method: 'POST',
        body: JSON.stringify(validShareData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      await POST(request);

      const stats = errorHandler.getErrorStats();
      expect(stats.errorCount).toBeGreaterThan(0);
    });

    it('should include sharing context in error responses', async () => {
      const { createShare } = require('../../../lib/services/sharing-service');
      createShare.mockRejectedValue(new Error('Test error'));

      const validShareData = {
        contentId: 'content-123',
        contentType: 'document'
      };

      const request = new NextRequest('http://localhost:3000/api/sharing', {
        method: 'POST',
        body: JSON.stringify(validShareData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.error.context).toBeDefined();
      expect(data.error.context.operation).toBe('createShare');
      expect(data.error.context.contentId).toBe('content-123');
    });
  });
});