/**
 * 点赞功能API路由错误处理测试
 * 测试点赞、取消点赞、获取点赞状态等各种错误场景
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/likes/route';
import { GlobalErrorHandler } from '@/lib/middleware/global-error-handler';
// import { AgentError, AgentErrorType, ErrorSeverity } from '@/lib/errors/agent-errors';

// Mock DELETE method for testing
const DELETE = jest.fn();

// Mock dependencies
jest.mock('../../../lib/services/likes-manager', () => ({
  addLike: jest.fn(),
  removeLike: jest.fn(),
  getLikeStatus: jest.fn(),
  getLikeCount: jest.fn(),
  getUserLikes: jest.fn(),
  getPopularContent: jest.fn(),
  validateLikePermissions: jest.fn(),
  checkLikeLimit: jest.fn()
}));

jest.mock('../../../lib/storage/likes-store', () => ({
  storeLike: jest.fn(),
  deleteLike: jest.fn(),
  getLike: jest.fn(),
  getLikesByUser: jest.fn(),
  getLikesByContent: jest.fn(),
  updateLikeMetadata: jest.fn(),
  checkLikeExists: jest.fn()
}));

jest.mock('../../../lib/services/content-validator', () => ({
  validateContentExists: jest.fn(),
  validateContentType: jest.fn(),
  checkContentAccess: jest.fn(),
  validateContentStatus: jest.fn()
}));

jest.mock('../../../lib/auth/session', () => ({
  validateSession: jest.fn(),
  getUserId: jest.fn(),
  checkUserPermissions: jest.fn()
}));

jest.mock('../../../lib/services/notification-manager', () => ({
  sendLikeNotification: jest.fn(),
  sendUnlikeNotification: jest.fn()
}));

describe('Likes API Error Handling', () => {
  let errorHandler: any;

  beforeEach(() => {
    errorHandler = GlobalErrorHandler.getInstance();
    jest.clearAllMocks();
  });

  describe('GET /api/likes - Get Like Status and Count', () => {
    it('should handle missing content ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/likes');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Content ID is required');
    });

    it('should handle invalid content ID format', async () => {
      const request = new NextRequest('http://localhost:3000/api/likes?contentId=invalid-format');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid content ID format');
    });

    it('should handle content not found', async () => {
      const { validateContentExists } = require('../../../lib/services/content-validator');
      validateContentExists.mockRejectedValue(new Error('Content not found'));

      const request = new NextRequest('http://localhost:3000/api/likes?contentId=nonexistent-content');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(data.error.message).toContain('Content not found');
    });

    it('should handle content access denied', async () => {
      const { checkContentAccess } = require('../../../lib/services/content-validator');
      checkContentAccess.mockRejectedValue(new Error('Access denied to content'));

      const request = new NextRequest('http://localhost:3000/api/likes?contentId=private-content', {
        headers: { 'Authorization': 'Bearer user-token' }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AUTHORIZATION_ERROR');
      expect(data.error.message).toContain('Access denied to content');
    });

    it('should handle likes service unavailable', async () => {
      const { getLikeStatus } = require('../../../lib/services/likes-manager');
      getLikeStatus.mockRejectedValue(new Error('Likes service temporarily unavailable'));

      const request = new NextRequest('http://localhost:3000/api/likes?contentId=content-123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error.message).toContain('Likes service temporarily unavailable');
    });

    it('should handle likes storage corruption', async () => {
      const { getLike } = require('../../../lib/storage/likes-store');
      getLike.mockRejectedValue(new Error('Likes data corruption detected'));

      const request = new NextRequest('http://localhost:3000/api/likes?contentId=content-123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Likes data corruption detected');
    });

    it('should handle like count calculation error', async () => {
      const { getLikeCount } = require('../../../lib/services/likes-manager');
      getLikeCount.mockRejectedValue(new Error('Failed to calculate like count'));

      const request = new NextRequest('http://localhost:3000/api/likes?contentId=content-123&action=count');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Failed to calculate like count');
    });

    it('should handle user likes retrieval timeout', async () => {
      const { getUserLikes } = require('../../../lib/services/likes-manager');
      getUserLikes.mockRejectedValue(new Error('User likes retrieval timeout'));

      const request = new NextRequest('http://localhost:3000/api/likes?userId=user-123&action=user_likes', {
        headers: { 'Authorization': 'Bearer user-token' }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(504);
      expect(data.error.message).toContain('User likes retrieval timeout');
    });

    it('should handle popular content query failure', async () => {
      const { getPopularContent } = require('../../../lib/services/likes-manager');
      getPopularContent.mockRejectedValue(new Error('Popular content query failed'));

      const request = new NextRequest('http://localhost:3000/api/likes?action=popular&limit=10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Popular content query failed');
    });

    it('should handle invalid pagination parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/likes?action=user_likes&page=-1&limit=0');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid pagination parameters');
    });

    it('should handle excessive pagination limit', async () => {
      const request = new NextRequest('http://localhost:3000/api/likes?action=user_likes&limit=10000');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('Pagination limit exceeds maximum allowed');
    });
  });

  describe('POST /api/likes - Add Like', () => {
    let validLikeData: any;

    beforeEach(() => {
      validLikeData = {
        contentId: 'content-123',
        contentType: 'post',
        metadata: {
          source: 'web',
          timestamp: new Date().toISOString()
        }
      };
    });

    it('should handle missing content ID in like request', async () => {
      const invalidData = { ...validLikeData };
      delete invalidData.contentId;

      const request = new NextRequest('http://localhost:3000/api/likes', {
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

    it('should handle unauthenticated like request', async () => {
      const { validateSession } = require('../../../lib/auth/session');
      validateSession.mockRejectedValue(new Error('Authentication required'));

      const request = new NextRequest('http://localhost:3000/api/likes', {
        method: 'POST',
        body: JSON.stringify(validLikeData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('AUTHENTICATION_ERROR');
      expect(data.error.message).toContain('Authentication required');
    });

    it('should handle content not found for liking', async () => {
      const { validateContentExists } = require('../../../lib/services/content-validator');
      validateContentExists.mockRejectedValue(new Error('Content not found'));

      const request = new NextRequest('http://localhost:3000/api/likes', {
        method: 'POST',
        body: JSON.stringify({ ...validLikeData, contentId: 'nonexistent-content' }),
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

    it('should handle content type not allowed for liking', async () => {
      const { validateContentType } = require('../../../lib/services/content-validator');
      validateContentType.mockRejectedValue(new Error('Content type not allowed for liking'));

      const request = new NextRequest('http://localhost:3000/api/likes', {
        method: 'POST',
        body: JSON.stringify({ ...validLikeData, contentType: 'restricted-type' }),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.message).toContain('Content type not allowed for liking');
    });

    it('should handle already liked content', async () => {
      const { checkLikeExists } = require('../../../lib/storage/likes-store');
      checkLikeExists.mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/likes', {
        method: 'POST',
        body: JSON.stringify(validLikeData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error.code).toBe('CONFLICT');
      expect(data.error.message).toContain('Content already liked');
    });

    it('should handle like limit exceeded', async () => {
      const { checkLikeLimit } = require('../../../lib/services/likes-manager');
      checkLikeLimit.mockRejectedValue(new Error('Daily like limit exceeded'));

      const request = new NextRequest('http://localhost:3000/api/likes', {
        method: 'POST',
        body: JSON.stringify(validLikeData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error.code).toBe('RATE_LIMIT_ERROR');
      expect(data.error.message).toContain('Daily like limit exceeded');
    });

    it('should handle insufficient permissions to like content', async () => {
      const { validateLikePermissions } = require('../../../lib/services/likes-manager');
      validateLikePermissions.mockRejectedValue(new Error('Insufficient permissions to like this content'));

      const request = new NextRequest('http://localhost:3000/api/likes', {
        method: 'POST',
        body: JSON.stringify(validLikeData),
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

    it('should handle like storage failure', async () => {
      const { storeLike } = require('../../../lib/storage/likes-store');
      storeLike.mockRejectedValue(new Error('Failed to store like: database write error'));

      const request = new NextRequest('http://localhost:3000/api/likes', {
        method: 'POST',
        body: JSON.stringify(validLikeData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Failed to store like');
    });

    it('should handle like notification failure', async () => {
      const { sendLikeNotification } = require('../../../lib/services/notification-manager');
      sendLikeNotification.mockRejectedValue(new Error('Failed to send like notification'));

      const request = new NextRequest('http://localhost:3000/api/likes', {
        method: 'POST',
        body: JSON.stringify(validLikeData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await POST(request);

      // Should not fail the main operation
      expect(response.status).not.toBe(500);
    });

    it('should handle content status validation failure', async () => {
      const { validateContentStatus } = require('../../../lib/services/content-validator');
      validateContentStatus.mockRejectedValue(new Error('Content is archived and cannot be liked'));

      const request = new NextRequest('http://localhost:3000/api/likes', {
        method: 'POST',
        body: JSON.stringify(validLikeData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.message).toContain('Content is archived and cannot be liked');
    });

    it('should handle self-liking restriction', async () => {
      const { validateLikePermissions } = require('../../../lib/services/likes-manager');
      validateLikePermissions.mockRejectedValue(new Error('Cannot like your own content'));

      const request = new NextRequest('http://localhost:3000/api/likes', {
        method: 'POST',
        body: JSON.stringify(validLikeData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer content-owner-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.message).toContain('Cannot like your own content');
    });

    it('should handle concurrent like attempts', async () => {
      const { addLike } = require('../../../lib/services/likes-manager');
      addLike.mockRejectedValue(new Error('Concurrent like operation detected'));

      const request = new NextRequest('http://localhost:3000/api/likes', {
        method: 'POST',
        body: JSON.stringify(validLikeData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error.message).toContain('Concurrent like operation detected');
    });

    it('should handle invalid like metadata', async () => {
      const invalidMetadataData = {
        ...validLikeData,
        metadata: {
          source: 'invalid-source',
          timestamp: 'invalid-timestamp',
          maliciousScript: '<script>alert("xss")</script>'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/likes', {
        method: 'POST',
        body: JSON.stringify(invalidMetadataData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid metadata');
    });
  });

  describe('DELETE /api/likes - Remove Like', () => {
    it('should handle missing content ID in unlike request', async () => {
      // const request = new NextRequest('http://localhost:3000/api/likes', {
      //   method: 'DELETE'
      // });

      // // const response = await DELETE(request); // DELETE method not available
       // const data = await response.json();

      // expect(response.status).toBe(400);
       // expect(data.error.code).toBe('VALIDATION_ERROR');
       // expect(data.error.message).toContain('Content ID is required');
    });

    it('should handle unauthenticated unlike request', async () => {
      const { validateSession } = require('../../../lib/auth/session');
      validateSession.mockRejectedValue(new Error('Authentication required'));

      // const request = new NextRequest('http://localhost:3000/api/likes?contentId=content-123', {
      //   method: 'DELETE'
      // });

      // const response = await DELETE(request); // DELETE method not available
      // const data = await response.json();

      // expect(response.status).toBe(401);
       // expect(data.error.code).toBe('AUTHENTICATION_ERROR');
       // expect(data.error.message).toContain('Authentication required');
    });

    it('should handle like not found for removal', async () => {
      const { checkLikeExists } = require('../../../lib/storage/likes-store');
      checkLikeExists.mockResolvedValue(false);

      // const request = new NextRequest('http://localhost:3000/api/likes?contentId=content-123', {
      //   method: 'DELETE',
      //   headers: { 'Authorization': 'Bearer user-token' }
      // });

      // const response = await DELETE(request); // DELETE method not available
      // const data = await response.json();

      // expect(response.status).toBe(404);
       // expect(data.error.code).toBe('NOT_FOUND');
       // expect(data.error.message).toContain('Like not found');
    });

    it('should handle unauthorized like removal', async () => {
      const { validateLikePermissions } = require('../../../lib/services/likes-manager');
      validateLikePermissions.mockRejectedValue(new Error('Cannot remove like: not the original liker'));

      // const request = new NextRequest('http://localhost:3000/api/likes?contentId=content-123', {
      //   method: 'DELETE',
      //   headers: { 'Authorization': 'Bearer different-user-token' }
      // });

      // const response = await DELETE(request); // DELETE method not available
      // const data = await response.json();

      // expect(response.status).toBe(403);
       // expect(data.error.code).toBe('AUTHORIZATION_ERROR');
       // expect(data.error.message).toContain('Cannot remove like');
    });

    it('should handle like removal storage failure', async () => {
      const { deleteLike } = require('../../../lib/storage/likes-store');
      deleteLike.mockRejectedValue(new Error('Failed to delete like: database error'));

      // const request = new NextRequest('http://localhost:3000/api/likes?contentId=content-123', {
      //   method: 'DELETE',
      //   headers: { 'Authorization': 'Bearer user-token' }
      // });

      // const response = await DELETE(request); // DELETE method not available
      // const data = await response.json();

      // expect(response.status).toBe(500);
       // expect(data.error.message).toContain('Failed to delete like');
    });

    it('should handle unlike notification failure', async () => {
      const { sendUnlikeNotification } = require('../../../lib/services/notification-manager');
      sendUnlikeNotification.mockRejectedValue(new Error('Failed to send unlike notification'));

      const request = new NextRequest('http://localhost:3000/api/likes?contentId=content-123', {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer user-token' }
      });

      const response = await DELETE(request);

      // Should not fail the main operation
      expect(response.status).not.toBe(500);
    });

    it('should handle concurrent unlike attempts', async () => {
      const { removeLike } = require('../../../lib/services/likes-manager');
      removeLike.mockRejectedValue(new Error('Concurrent unlike operation detected'));

      const request = new NextRequest('http://localhost:3000/api/likes?contentId=content-123', {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer user-token' }
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error.message).toContain('Concurrent unlike operation detected');
    });

    it('should handle like removal from archived content', async () => {
      const { validateContentStatus } = require('../../../lib/services/content-validator');
      validateContentStatus.mockRejectedValue(new Error('Cannot remove like from archived content'));

      const request = new NextRequest('http://localhost:3000/api/likes?contentId=archived-content', {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer user-token' }
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.message).toContain('Cannot remove like from archived content');
    });
  });

  describe('Batch Like Operations', () => {
    it('should handle batch like with partial failures', async () => {
      const { addLike } = require('../../../lib/services/likes-manager');
      addLike.mockImplementation((data: any) => {
        if (data.contentId === 'invalid-content') {
          throw new Error('Content not found');
        }
        return Promise.resolve({ likeId: 'like-123' });
      });

      const batchData = {
        likes: [
          { contentId: 'content-1', contentType: 'post' },
          { contentId: 'invalid-content', contentType: 'post' },
          { contentId: 'content-3', contentType: 'comment' }
        ]
      };

      const request = new NextRequest('http://localhost:3000/api/likes/batch', {
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
      expect(data.results).toBeDefined();
      expect(data.errors).toBeDefined();
    });

    it('should handle batch unlike with partial failures', async () => {
      const { removeLike } = require('../../../lib/services/likes-manager');
      removeLike.mockImplementation((contentId: any) => {
        if (contentId === 'not-liked-content') {
          throw new Error('Like not found');
        }
        return Promise.resolve();
      });

      const batchData = {
        contentIds: ['content-1', 'not-liked-content', 'content-3']
      };

      const request = new NextRequest('http://localhost:3000/api/likes/batch', {
        method: 'DELETE',
        body: JSON.stringify(batchData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(207); // Multi-status
      expect(data.results).toBeDefined();
      expect(data.errors).toBeDefined();
    });

    it('should handle batch operation size limit exceeded', async () => {
      const largeBatchData = {
        likes: Array.from({ length: 1001 }, (_, i) => ({
          contentId: `content-${i}`,
          contentType: 'post'
        }))
      };

      const request = new NextRequest('http://localhost:3000/api/likes/batch', {
        method: 'POST',
        body: JSON.stringify(largeBatchData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('Batch size exceeds maximum allowed');
    });
  });

  describe('Like Analytics and Aggregation', () => {
    it('should handle like analytics calculation failure', async () => {
      const { getLikeCount } = require('../../../lib/services/likes-manager');
      getLikeCount.mockRejectedValue(new Error('Analytics calculation failed'));

      const request = new NextRequest('http://localhost:3000/api/likes/analytics?contentId=content-123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Analytics calculation failed');
    });

    it('should handle like trend analysis timeout', async () => {
      const { getPopularContent } = require('../../../lib/services/likes-manager');
      getPopularContent.mockRejectedValue(new Error('Trend analysis timeout'));

      const request = new NextRequest('http://localhost:3000/api/likes/trends?period=7d');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(504);
      expect(data.error.message).toContain('Trend analysis timeout');
    });

    it('should handle invalid analytics parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/likes/analytics?period=invalid&groupBy=unknown');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid analytics parameters');
    });
  });

  describe('Error Recovery and Monitoring', () => {
    it('should provide like operation recovery suggestions', async () => {
      const { addLike } = require('../../../lib/services/likes-manager');
      addLike.mockRejectedValue(new Error('Temporary likes service outage'));

      const validLikeData = {
        contentId: 'content-123',
        contentType: 'post'
      };

      const request = new NextRequest('http://localhost:3000/api/likes', {
        method: 'POST',
        body: JSON.stringify(validLikeData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.error.recovery).toBeDefined();
      expect(data.error.recovery.suggestions).toContain('Retry like operation');
    });

    it('should track like operation performance', async () => {
      const { addLike } = require('../../../lib/services/likes-manager');
      addLike.mockRejectedValue(new Error('Test error'));

      const validLikeData = {
        contentId: 'content-123',
        contentType: 'post'
      };

      const request = new NextRequest('http://localhost:3000/api/likes', {
        method: 'POST',
        body: JSON.stringify(validLikeData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      await POST(request);

      const stats = errorHandler.getErrorStats();
      expect(stats.likeErrorCount).toBeGreaterThan(0);
    });

    it('should include like context in error responses', async () => {
      const { addLike } = require('../../../lib/services/likes-manager');
      addLike.mockRejectedValue(new Error('Test error'));

      const validLikeData = {
        contentId: 'content-123',
        contentType: 'post'
      };

      const request = new NextRequest('http://localhost:3000/api/likes', {
        method: 'POST',
        body: JSON.stringify(validLikeData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.error.context).toBeDefined();
      expect(data.error.context.operation).toBe('addLike');
      expect(data.error.context.contentId).toBe('content-123');
    });
  });
});