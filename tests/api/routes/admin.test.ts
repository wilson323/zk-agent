/**
 * 管理员API路由错误处理测试
 * 测试管理员功能端点的各种错误场景和权限控制
 */

import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '../../../app/api/admin/route';
import { GlobalErrorHandler } from '../../../lib/middleware/global-error-handler';
import { AgentError, AgentErrorType, ErrorSeverity } from '../../../lib/errors/agent-errors';

// Mock dependencies
jest.mock('../../../lib/services/admin-service', () => ({
  getSystemStats: jest.fn(),
  getUserManagement: jest.fn(),
  updateSystemConfig: jest.fn(),
  performMaintenance: jest.fn(),
  getAuditLogs: jest.fn(),
  managePermissions: jest.fn(),
  backupSystem: jest.fn(),
  restoreSystem: jest.fn()
}));

jest.mock('../../../lib/auth/admin-auth', () => ({
  validateAdminSession: jest.fn(),
  checkSuperAdminPermissions: jest.fn(),
  validateAdminToken: jest.fn(),
  logAdminAction: jest.fn()
}));

jest.mock('../../../lib/storage/audit-logger', () => ({
  logSecurityEvent: jest.fn(),
  logSystemChange: jest.fn(),
  getAuditTrail: jest.fn()
}));

describe('Admin API Error Handling', () => {
  let errorHandler: GlobalErrorHandler;

  beforeEach(() => {
    errorHandler = GlobalErrorHandler.getInstance();
    jest.clearAllMocks();
  });

  describe('Authentication and Authorization', () => {
    it('should handle missing admin authentication', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/stats');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('AUTHENTICATION_ERROR');
      expect(data.error.message).toContain('Admin authentication required');
    });

    it('should handle invalid admin token', async () => {
      const { validateAdminToken } = require('../../../lib/auth/admin-auth');
      validateAdminToken.mockRejectedValue(new Error('Invalid admin token'));

      const request = new NextRequest('http://localhost:3000/api/admin/stats', {
        headers: { 'Authorization': 'Bearer invalid-token' }
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.message).toContain('Invalid admin token');
    });

    it('should handle expired admin session', async () => {
      const { validateAdminSession } = require('../../../lib/auth/admin-auth');
      validateAdminSession.mockRejectedValue(new Error('Admin session expired'));

      const request = new NextRequest('http://localhost:3000/api/admin/stats', {
        headers: { 'Authorization': 'Bearer expired-token' }
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.message).toContain('Admin session expired');
    });

    it('should handle insufficient admin permissions', async () => {
      const { checkSuperAdminPermissions } = require('../../../lib/auth/admin-auth');
      checkSuperAdminPermissions.mockRejectedValue(new Error('Super admin permissions required'));

      const request = new NextRequest('http://localhost:3000/api/admin/system/config', {
        method: 'PUT',
        headers: { 'Authorization': 'Bearer admin-token' },
        body: JSON.stringify({ setting: 'value' })
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AUTHORIZATION_ERROR');
      expect(data.error.message).toContain('Super admin permissions required');
    });

    it('should handle role-based access control violations', async () => {
      const { validateAdminSession } = require('../../../lib/auth/admin-auth');
      validateAdminSession.mockResolvedValue({ role: 'moderator', permissions: ['read'] });

      const request = new NextRequest('http://localhost:3000/api/admin/users/delete', {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer moderator-token' }
      });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.message).toContain('Insufficient permissions');
    });
  });

  describe('System Statistics Errors', () => {
    it('should handle database connection failure for stats', async () => {
      const { getSystemStats } = require('../../../lib/services/admin-service');
      getSystemStats.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/admin/stats', {
        headers: { 'Authorization': 'Bearer valid-admin-token' }
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Database connection failed');
    });

    it('should handle metrics collection service unavailable', async () => {
      const { getSystemStats } = require('../../../lib/services/admin-service');
      getSystemStats.mockRejectedValue(new Error('Metrics service unavailable'));

      const request = new NextRequest('http://localhost:3000/api/admin/stats', {
        headers: { 'Authorization': 'Bearer valid-admin-token' }
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error.message).toContain('Metrics service unavailable');
    });

    it('should handle partial stats collection failure', async () => {
      const { getSystemStats } = require('../../../lib/services/admin-service');
      getSystemStats.mockResolvedValue({
        users: { total: 100, active: 80 },
        system: null, // Failed to collect system stats
        errors: ['Failed to collect system metrics']
      });

      const request = new NextRequest('http://localhost:3000/api/admin/stats', {
        headers: { 'Authorization': 'Bearer valid-admin-token' }
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(206); // Partial content
      expect(data.data.errors).toContain('Failed to collect system metrics');
    });
  });

  describe('User Management Errors', () => {
    it('should handle user not found for management operations', async () => {
      const { getUserManagement } = require('../../../lib/services/admin-service');
      getUserManagement.mockRejectedValue(new Error('User not found'));

      const request = new NextRequest('http://localhost:3000/api/admin/users/nonexistent-id', {
        headers: { 'Authorization': 'Bearer valid-admin-token' }
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(data.error.message).toContain('User not found');
    });

    it('should handle invalid user ID format', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/users/invalid-id-format', {
        headers: { 'Authorization': 'Bearer valid-admin-token' }
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('Invalid user ID format');
    });

    it('should handle attempt to modify super admin account', async () => {
      const { getUserManagement } = require('../../../lib/services/admin-service');
      getUserManagement.mockRejectedValue(new Error('Cannot modify super admin account'));

      const request = new NextRequest('http://localhost:3000/api/admin/users/super-admin-id', {
        method: 'PUT',
        headers: { 'Authorization': 'Bearer admin-token' },
        body: JSON.stringify({ role: 'user' })
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.message).toContain('Cannot modify super admin account');
    });

    it('should handle bulk user operation failure', async () => {
      const { getUserManagement } = require('../../../lib/services/admin-service');
      getUserManagement.mockRejectedValue(new Error('Bulk operation failed: some users not found'));

      const request = new NextRequest('http://localhost:3000/api/admin/users/bulk', {
        method: 'PUT',
        headers: { 'Authorization': 'Bearer valid-admin-token' },
        body: JSON.stringify({ userIds: ['id1', 'id2', 'id3'], action: 'suspend' })
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(207); // Multi-status
      expect(data.error.message).toContain('Bulk operation failed');
    });
  });

  describe('System Configuration Errors', () => {
    it('should handle invalid configuration format', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/system/config', {
        method: 'PUT',
        headers: { 'Authorization': 'Bearer valid-admin-token' },
        body: JSON.stringify({ invalidConfig: 'value' })
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid configuration format');
    });

    it('should handle configuration validation failure', async () => {
      const { updateSystemConfig } = require('../../../lib/services/admin-service');
      updateSystemConfig.mockRejectedValue(new Error('Configuration validation failed: invalid database URL'));

      const request = new NextRequest('http://localhost:3000/api/admin/system/config', {
        method: 'PUT',
        headers: { 'Authorization': 'Bearer valid-admin-token' },
        body: JSON.stringify({ databaseUrl: 'invalid-url' })
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('Configuration validation failed');
    });

    it('should handle configuration backup failure', async () => {
      const { updateSystemConfig } = require('../../../lib/services/admin-service');
      updateSystemConfig.mockRejectedValue(new Error('Failed to backup current configuration'));

      const request = new NextRequest('http://localhost:3000/api/admin/system/config', {
        method: 'PUT',
        headers: { 'Authorization': 'Bearer valid-admin-token' },
        body: JSON.stringify({ setting: 'value' })
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Failed to backup current configuration');
    });

    it('should handle configuration rollback on apply failure', async () => {
      const { updateSystemConfig } = require('../../../lib/services/admin-service');
      updateSystemConfig.mockRejectedValue(new Error('Configuration apply failed, rolled back to previous version'));

      const request = new NextRequest('http://localhost:3000/api/admin/system/config', {
        method: 'PUT',
        headers: { 'Authorization': 'Bearer valid-admin-token' },
        body: JSON.stringify({ setting: 'value' })
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Configuration apply failed, rolled back');
    });
  });

  describe('Maintenance Operations Errors', () => {
    it('should handle maintenance mode activation failure', async () => {
      const { performMaintenance } = require('../../../lib/services/admin-service');
      performMaintenance.mockRejectedValue(new Error('Failed to activate maintenance mode'));

      const request = new NextRequest('http://localhost:3000/api/admin/maintenance', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer valid-admin-token' },
        body: JSON.stringify({ action: 'enable', reason: 'System update' })
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Failed to activate maintenance mode');
    });

    it('should handle database maintenance operation failure', async () => {
      const { performMaintenance } = require('../../../lib/services/admin-service');
      performMaintenance.mockRejectedValue(new Error('Database maintenance failed: table lock timeout'));

      const request = new NextRequest('http://localhost:3000/api/admin/maintenance/database', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer valid-admin-token' },
        body: JSON.stringify({ operation: 'optimize' })
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Database maintenance failed');
    });

    it('should handle cache clear operation failure', async () => {
      const { performMaintenance } = require('../../../lib/services/admin-service');
      performMaintenance.mockRejectedValue(new Error('Cache clear failed: Redis connection error'));

      const request = new NextRequest('http://localhost:3000/api/admin/maintenance/cache', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer valid-admin-token' },
        body: JSON.stringify({ action: 'clear' })
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Cache clear failed');
    });
  });

  describe('Audit Log Errors', () => {
    it('should handle audit log retrieval failure', async () => {
      const { getAuditLogs } = require('../../../lib/services/admin-service');
      getAuditLogs.mockRejectedValue(new Error('Audit log service unavailable'));

      const request = new NextRequest('http://localhost:3000/api/admin/audit-logs', {
        headers: { 'Authorization': 'Bearer valid-admin-token' }
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error.message).toContain('Audit log service unavailable');
    });

    it('should handle invalid audit log query parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/audit-logs?startDate=invalid&endDate=also-invalid', {
        headers: { 'Authorization': 'Bearer valid-admin-token' }
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid date format');
    });

    it('should handle audit log export failure', async () => {
      const { getAuditLogs } = require('../../../lib/services/admin-service');
      getAuditLogs.mockRejectedValue(new Error('Export failed: insufficient disk space'));

      const request = new NextRequest('http://localhost:3000/api/admin/audit-logs/export', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer valid-admin-token' },
        body: JSON.stringify({ format: 'csv', dateRange: '30d' })
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(507); // Insufficient storage
      expect(data.error.message).toContain('insufficient disk space');
    });
  });

  describe('Backup and Restore Errors', () => {
    it('should handle backup creation failure', async () => {
      const { backupSystem } = require('../../../lib/services/admin-service');
      backupSystem.mockRejectedValue(new Error('Backup failed: storage quota exceeded'));

      const request = new NextRequest('http://localhost:3000/api/admin/backup', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer valid-admin-token' },
        body: JSON.stringify({ type: 'full', compression: true })
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(507);
      expect(data.error.message).toContain('storage quota exceeded');
    });

    it('should handle backup corruption detection', async () => {
      const { backupSystem } = require('../../../lib/services/admin-service');
      backupSystem.mockRejectedValue(new Error('Backup verification failed: data corruption detected'));

      const request = new NextRequest('http://localhost:3000/api/admin/backup', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer valid-admin-token' },
        body: JSON.stringify({ type: 'incremental' })
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('data corruption detected');
    });

    it('should handle restore operation failure', async () => {
      const { restoreSystem } = require('../../../lib/services/admin-service');
      restoreSystem.mockRejectedValue(new Error('Restore failed: backup file not found'));

      const request = new NextRequest('http://localhost:3000/api/admin/restore', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer valid-admin-token' },
        body: JSON.stringify({ backupId: 'backup-123' })
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.message).toContain('backup file not found');
    });

    it('should handle restore validation failure', async () => {
      const { restoreSystem } = require('../../../lib/services/admin-service');
      restoreSystem.mockRejectedValue(new Error('Restore validation failed: incompatible backup version'));

      const request = new NextRequest('http://localhost:3000/api/admin/restore', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer valid-admin-token' },
        body: JSON.stringify({ backupId: 'backup-old-version' })
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('incompatible backup version');
    });
  });

  describe('Permission Management Errors', () => {
    it('should handle invalid permission assignment', async () => {
      const { managePermissions } = require('../../../lib/services/admin-service');
      managePermissions.mockRejectedValue(new Error('Invalid permission: NONEXISTENT_PERMISSION'));

      const request = new NextRequest('http://localhost:3000/api/admin/permissions', {
        method: 'PUT',
        headers: { 'Authorization': 'Bearer valid-admin-token' },
        body: JSON.stringify({ userId: 'user-123', permissions: ['NONEXISTENT_PERMISSION'] })
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('Invalid permission');
    });

    it('should handle circular role dependency', async () => {
      const { managePermissions } = require('../../../lib/services/admin-service');
      managePermissions.mockRejectedValue(new Error('Circular role dependency detected'));

      const request = new NextRequest('http://localhost:3000/api/admin/roles', {
        method: 'PUT',
        headers: { 'Authorization': 'Bearer valid-admin-token' },
        body: JSON.stringify({ roleId: 'role-a', inheritsFrom: ['role-b'] })
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('Circular role dependency');
    });

    it('should handle permission escalation attempt', async () => {
      const { managePermissions } = require('../../../lib/services/admin-service');
      managePermissions.mockRejectedValue(new Error('Permission escalation not allowed'));

      const request = new NextRequest('http://localhost:3000/api/admin/permissions', {
        method: 'PUT',
        headers: { 'Authorization': 'Bearer admin-token' },
        body: JSON.stringify({ userId: 'user-123', permissions: ['SUPER_ADMIN'] })
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.message).toContain('Permission escalation not allowed');
    });
  });

  describe('Security and Audit Logging', () => {
    it('should log all admin actions for audit trail', async () => {
      const { logAdminAction } = require('../../../lib/auth/admin-auth');
      const { getSystemStats } = require('../../../lib/services/admin-service');
      getSystemStats.mockResolvedValue({ users: 100 });

      const request = new NextRequest('http://localhost:3000/api/admin/stats', {
        headers: { 'Authorization': 'Bearer valid-admin-token' }
      });
      await GET(request);

      expect(logAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'VIEW_SYSTEM_STATS',
          adminId: expect.any(String),
          timestamp: expect.any(Date)
        })
      );
    });

    it('should log security violations', async () => {
      const { logSecurityEvent } = require('../../../lib/storage/audit-logger');
      
      const request = new NextRequest('http://localhost:3000/api/admin/stats', {
        headers: { 'Authorization': 'Bearer invalid-token' }
      });
      await GET(request);

      expect(logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'UNAUTHORIZED_ADMIN_ACCESS',
          severity: 'HIGH',
          details: expect.any(Object)
        })
      );
    });

    it('should handle audit logging failure gracefully', async () => {
      const { logAdminAction } = require('../../../lib/auth/admin-auth');
      const { getSystemStats } = require('../../../lib/services/admin-service');
      
      logAdminAction.mockRejectedValue(new Error('Audit log service down'));
      getSystemStats.mockResolvedValue({ users: 100 });

      const request = new NextRequest('http://localhost:3000/api/admin/stats', {
        headers: { 'Authorization': 'Bearer valid-admin-token' }
      });
      const response = await GET(request);

      // Should still succeed even if audit logging fails
      expect(response.status).toBe(200);
    });
  });

  describe('Rate Limiting and DDoS Protection', () => {
    it('should handle admin API rate limiting', async () => {
      const requests = Array.from({ length: 20 }, () => 
        new NextRequest('http://localhost:3000/api/admin/stats', {
          headers: { 'Authorization': 'Bearer valid-admin-token' }
        })
      );

      const responses = await Promise.all(requests.map(req => GET(req)));
      const rateLimitedResponses = responses.filter(res => res.status === 429);

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should implement stricter rate limits for sensitive operations', async () => {
      const sensitiveRequests = Array.from({ length: 5 }, () => 
        new NextRequest('http://localhost:3000/api/admin/system/config', {
          method: 'PUT',
          headers: { 'Authorization': 'Bearer valid-admin-token' },
          body: JSON.stringify({ setting: 'value' })
        })
      );

      const responses = await Promise.all(sensitiveRequests.map(req => PUT(req)));
      const rateLimitedResponses = responses.filter(res => res.status === 429);

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery and Monitoring', () => {
    it('should provide detailed error context for debugging', async () => {
      const { getSystemStats } = require('../../../lib/services/admin-service');
      getSystemStats.mockRejectedValue(new Error('Database query timeout'));

      const request = new NextRequest('http://localhost:3000/api/admin/stats', {
        headers: { 'Authorization': 'Bearer valid-admin-token' }
      });
      const response = await GET(request);
      const data = await response.json();

      expect(data.error.context).toBeDefined();
      expect(data.error.context.operation).toBe('getSystemStats');
      expect(data.error.context.timestamp).toBeDefined();
    });

    it('should include system health indicators in error responses', async () => {
      const { getSystemStats } = require('../../../lib/services/admin-service');
      getSystemStats.mockRejectedValue(new Error('Service degraded'));

      const request = new NextRequest('http://localhost:3000/api/admin/stats', {
        headers: { 'Authorization': 'Bearer valid-admin-token' }
      });
      const response = await GET(request);
      const data = await response.json();

      expect(data.error.systemHealth).toBeDefined();
      expect(data.error.systemHealth.status).toBe('degraded');
    });

    it('should track admin error patterns for monitoring', async () => {
      const { getSystemStats } = require('../../../lib/services/admin-service');
      getSystemStats.mockRejectedValue(new Error('Repeated failure'));

      // Simulate multiple failures
      for (let i = 0; i < 3; i++) {
        const request = new NextRequest('http://localhost:3000/api/admin/stats', {
          headers: { 'Authorization': 'Bearer valid-admin-token' }
        });
        await GET(request);
      }

      const stats = errorHandler.getErrorStats();
      expect(stats.adminErrorCount).toBeGreaterThan(0);
    });
  });
});