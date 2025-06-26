/**
 * AG-UI API路由错误处理测试
 * 测试AG-UI相关功能的各种错误场景
 */

import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '@/app/api/ag-ui/route';
import { GlobalErrorHandler } from '@/lib/middleware/global-error-handler';
import { AgentError, AgentErrorType, ErrorSeverity } from '@/lib/errors/agent-errors';

// Mock dependencies
jest.mock('../../../lib/services/ag-ui-manager', () => ({
  getAgentList: jest.fn(),
  getAgentDetails: jest.fn(),
  createAgent: jest.fn(),
  updateAgent: jest.fn(),
  deleteAgent: jest.fn(),
  validateAgentConfig: jest.fn(),
  checkAgentPermissions: jest.fn(),
  getAgentMetrics: jest.fn(),
  deployAgent: jest.fn(),
  testAgentConnection: jest.fn()
}));

jest.mock('../../../lib/services/cad-analysis-service', () => ({
  analyzeCADFile: jest.fn(),
  getAnalysisHistory: jest.fn(),
  validateCADFormat: jest.fn(),
  extractCADMetadata: jest.fn(),
  generateAnalysisReport: jest.fn()
}));

jest.mock('../../../lib/services/chat-service', () => ({
  initializeChat: jest.fn(),
  sendMessage: jest.fn(),
  getChatHistory: jest.fn(),
  validateChatSession: jest.fn(),
  endChatSession: jest.fn(),
  getChatMetrics: jest.fn()
}));

jest.mock('../../../lib/services/compliance-service', () => ({
  performComplianceAudit: jest.fn(),
  getComplianceReport: jest.fn(),
  validateComplianceRules: jest.fn(),
  updateComplianceConfig: jest.fn(),
  getComplianceHistory: jest.fn()
}));

jest.mock('../../../lib/auth/session', () => ({
  validateSession: jest.fn(),
  getUserPermissions: jest.fn(),
  checkAdminAccess: jest.fn()
}));

jest.mock('../../../lib/storage/agent-store', () => ({
  storeAgent: jest.fn(),
  getAgent: jest.fn(),
  updateAgent: jest.fn(),
  deleteAgent: jest.fn(),
  listAgents: jest.fn()
}));

describe('AG-UI API Error Handling', () => {
  let errorHandler: GlobalErrorHandler;

  beforeEach(() => {
    errorHandler = GlobalErrorHandler.getInstance();
    jest.clearAllMocks();
  });

  describe('GET /api/ag-ui - Get Agent List', () => {
    it('should handle agent service unavailable', async () => {
      const { getAgentList } = require('../../../lib/services/ag-ui-manager');
      getAgentList.mockRejectedValue(new Error('Agent service temporarily unavailable'));

      const request = new NextRequest('http://localhost:3000/api/ag-ui');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error.message).toContain('Agent service temporarily unavailable');
    });

    it('should handle invalid pagination parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/ag-ui?page=-1&limit=0');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid pagination parameters');
    });

    it('should handle agent list retrieval timeout', async () => {
      const { getAgentList } = require('../../../lib/services/ag-ui-manager');
      getAgentList.mockRejectedValue(new Error('Agent list retrieval timeout'));

      const request = new NextRequest('http://localhost:3000/api/ag-ui?timeout=1000');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(504);
      expect(data.error.message).toContain('Agent list retrieval timeout');
    });

    it('should handle insufficient permissions for agent access', async () => {
      const { checkAgentPermissions } = require('../../../lib/services/ag-ui-manager');
      checkAgentPermissions.mockRejectedValue(new Error('Insufficient permissions to access agents'));

      const request = new NextRequest('http://localhost:3000/api/ag-ui', {
        headers: { 'Authorization': 'Bearer limited-user-token' }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AUTHORIZATION_ERROR');
      expect(data.error.message).toContain('Insufficient permissions');
    });

    it('should handle agent storage corruption', async () => {
      const { listAgents } = require('../../../lib/storage/agent-store');
      listAgents.mockRejectedValue(new Error('Agent storage corruption detected'));

      const request = new NextRequest('http://localhost:3000/api/ag-ui');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Agent storage corruption detected');
    });

    it('should handle invalid filter parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/ag-ui?status=invalid&type=unknown');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid filter parameters');
    });

    it('should handle agent metrics calculation failure', async () => {
      const { getAgentMetrics } = require('../../../lib/services/ag-ui-manager');
      getAgentMetrics.mockRejectedValue(new Error('Failed to calculate agent metrics'));

      const request = new NextRequest('http://localhost:3000/api/ag-ui?include_metrics=true');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Failed to calculate agent metrics');
    });
  });

  describe('POST /api/ag-ui - Create Agent', () => {
    let validAgentData: any;

    beforeEach(() => {
      validAgentData = {
        name: 'Test Agent',
        type: 'chat',
        config: {
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          maxTokens: 1000
        },
        description: 'Test agent for validation'
      };
    });

    it('should handle missing required agent fields', async () => {
      const invalidData = { ...validAgentData };
      delete invalidData.name;
      delete invalidData.type;

      const request = new NextRequest('http://localhost:3000/api/ag-ui', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.details).toContain('name');
      expect(data.error.details).toContain('type');
    });

    it('should handle invalid agent configuration', async () => {
      const { validateAgentConfig } = require('../../../lib/services/ag-ui-manager');
      validateAgentConfig.mockRejectedValue(new Error('Invalid agent configuration: temperature out of range'));

      const invalidConfigData = {
        ...validAgentData,
        config: {
          ...validAgentData.config,
          temperature: 2.5 // Invalid temperature
        }
      };

      const request = new NextRequest('http://localhost:3000/api/ag-ui', {
        method: 'POST',
        body: JSON.stringify(invalidConfigData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('Invalid agent configuration');
    });

    it('should handle unauthenticated agent creation', async () => {
      const { validateSession } = require('../../../lib/auth/session');
      validateSession.mockRejectedValue(new Error('Authentication required'));

      const request = new NextRequest('http://localhost:3000/api/ag-ui', {
        method: 'POST',
        body: JSON.stringify(validAgentData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('AUTHENTICATION_ERROR');
      expect(data.error.message).toContain('Authentication required');
    });

    it('should handle agent creation permission denied', async () => {
      const { checkAgentPermissions } = require('../../../lib/services/ag-ui-manager');
      checkAgentPermissions.mockRejectedValue(new Error('Insufficient permissions to create agents'));

      const request = new NextRequest('http://localhost:3000/api/ag-ui', {
        method: 'POST',
        body: JSON.stringify(validAgentData),
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

    it('should handle duplicate agent name', async () => {
      const { createAgent } = require('../../../lib/services/ag-ui-manager');
      createAgent.mockRejectedValue(new Error('Agent with this name already exists'));

      const request = new NextRequest('http://localhost:3000/api/ag-ui', {
        method: 'POST',
        body: JSON.stringify({ ...validAgentData, name: 'Existing Agent' }),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error.code).toBe('CONFLICT');
      expect(data.error.message).toContain('Agent with this name already exists');
    });

    it('should handle agent storage failure', async () => {
      const { storeAgent } = require('../../../lib/storage/agent-store');
      storeAgent.mockRejectedValue(new Error('Failed to store agent: database write error'));

      const request = new NextRequest('http://localhost:3000/api/ag-ui', {
        method: 'POST',
        body: JSON.stringify(validAgentData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Failed to store agent');
    });

    it('should handle agent deployment failure', async () => {
      const { deployAgent } = require('../../../lib/services/ag-ui-manager');
      deployAgent.mockRejectedValue(new Error('Failed to deploy agent: service unavailable'));

      const request = new NextRequest('http://localhost:3000/api/ag-ui', {
        method: 'POST',
        body: JSON.stringify({ ...validAgentData, deploy: true }),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Failed to deploy agent');
    });

    it('should handle invalid agent type', async () => {
      const invalidTypeData = {
        ...validAgentData,
        type: 'invalid-type'
      };

      const request = new NextRequest('http://localhost:3000/api/ag-ui', {
        method: 'POST',
        body: JSON.stringify(invalidTypeData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid agent type');
    });

    it('should handle malformed JSON in request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/ag-ui', {
        method: 'POST',
        body: '{invalid json}',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid JSON');
    });

    it('should handle agent configuration validation timeout', async () => {
      const { validateAgentConfig } = require('../../../lib/services/ag-ui-manager');
      validateAgentConfig.mockRejectedValue(new Error('Agent configuration validation timeout'));

      const request = new NextRequest('http://localhost:3000/api/ag-ui', {
        method: 'POST',
        body: JSON.stringify(validAgentData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(504);
      expect(data.error.message).toContain('Agent configuration validation timeout');
    });
  });

  describe('PUT /api/ag-ui - Update Agent', () => {
    it('should handle agent not found for update', async () => {
      const { getAgent } = require('../../../lib/storage/agent-store');
      getAgent.mockRejectedValue(new Error('Agent not found'));

      const updateData = {
        id: 'nonexistent-agent',
        name: 'Updated Agent'
      };

      const request = new NextRequest('http://localhost:3000/api/ag-ui', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(data.error.message).toContain('Agent not found');
    });

    it('should handle concurrent agent update conflict', async () => {
      const { updateAgent } = require('../../../lib/services/ag-ui-manager');
      updateAgent.mockRejectedValue(new Error('Concurrent update detected: agent modified by another user'));

      const updateData = {
        id: 'agent-123',
        name: 'Updated Agent',
        version: 1
      };

      const request = new NextRequest('http://localhost:3000/api/ag-ui', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error.code).toBe('CONFLICT');
      expect(data.error.message).toContain('Concurrent update detected');
    });

    it('should handle agent update permission denied', async () => {
      const { checkAgentPermissions } = require('../../../lib/services/ag-ui-manager');
      checkAgentPermissions.mockRejectedValue(new Error('Insufficient permissions to update this agent'));

      const updateData = {
        id: 'agent-123',
        name: 'Updated Agent'
      };

      const request = new NextRequest('http://localhost:3000/api/ag-ui', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer limited-user-token'
        }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AUTHORIZATION_ERROR');
      expect(data.error.message).toContain('Insufficient permissions');
    });

    it('should handle agent in use during update', async () => {
      const { updateAgent } = require('../../../lib/services/ag-ui-manager');
      updateAgent.mockRejectedValue(new Error('Cannot update agent: currently in use by active sessions'));

      const updateData = {
        id: 'active-agent-123',
        config: { temperature: 0.8 }
      };

      const request = new NextRequest('http://localhost:3000/api/ag-ui', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error.message).toContain('Cannot update agent: currently in use');
    });
  });

  describe('DELETE /api/ag-ui - Delete Agent', () => {
    it('should handle agent not found for deletion', async () => {
      const { getAgent } = require('../../../lib/storage/agent-store');
      getAgent.mockRejectedValue(new Error('Agent not found'));

      const request = new NextRequest('http://localhost:3000/api/ag-ui?id=nonexistent-agent', {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer admin-token' }
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(data.error.message).toContain('Agent not found');
    });

    it('should handle agent deletion permission denied', async () => {
      const { checkAgentPermissions } = require('../../../lib/services/ag-ui-manager');
      checkAgentPermissions.mockRejectedValue(new Error('Insufficient permissions to delete agents'));

      const request = new NextRequest('http://localhost:3000/api/ag-ui?id=agent-123', {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer limited-user-token' }
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AUTHORIZATION_ERROR');
      expect(data.error.message).toContain('Insufficient permissions');
    });

    it('should handle agent with active dependencies', async () => {
      const { deleteAgent } = require('../../../lib/services/ag-ui-manager');
      deleteAgent.mockRejectedValue(new Error('Cannot delete agent: has active dependencies'));

      const request = new NextRequest('http://localhost:3000/api/ag-ui?id=agent-with-deps', {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer admin-token' }
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error.message).toContain('Cannot delete agent: has active dependencies');
    });

    it('should handle agent deletion storage failure', async () => {
      const { deleteAgent } = require('../../../lib/storage/agent-store');
      deleteAgent.mockRejectedValue(new Error('Failed to delete agent: storage error'));

      const request = new NextRequest('http://localhost:3000/api/ag-ui?id=agent-123', {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer admin-token' }
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Failed to delete agent');
    });
  });

  describe('CAD Analysis API Error Handling', () => {
    it('should handle CAD file upload failure', async () => {
      const { analyzeCADFile } = require('../../../lib/services/cad-analysis-service');
      analyzeCADFile.mockRejectedValue(new Error('CAD file upload failed: file too large'));

      const request = new NextRequest('http://localhost:3000/api/ag-ui/cad-analysis', {
        method: 'POST',
        body: JSON.stringify({ file: 'large-cad-file.dwg' }),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(413);
      expect(data.error.message).toContain('CAD file upload failed: file too large');
    });

    it('should handle unsupported CAD format', async () => {
      const { validateCADFormat } = require('../../../lib/services/cad-analysis-service');
      validateCADFormat.mockRejectedValue(new Error('Unsupported CAD format: .xyz'));

      const request = new NextRequest('http://localhost:3000/api/ag-ui/cad-analysis', {
        method: 'POST',
        body: JSON.stringify({ file: 'unsupported.xyz' }),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(415);
      expect(data.error.message).toContain('Unsupported CAD format');
    });

    it('should handle CAD analysis timeout', async () => {
      const { analyzeCADFile } = require('../../../lib/services/cad-analysis-service');
      analyzeCADFile.mockRejectedValue(new Error('CAD analysis timeout: file too complex'));

      const request = new NextRequest('http://localhost:3000/api/ag-ui/cad-analysis', {
        method: 'POST',
        body: JSON.stringify({ file: 'complex-model.dwg', timeout: 30000 }),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(504);
      expect(data.error.message).toContain('CAD analysis timeout');
    });

    it('should handle corrupted CAD file', async () => {
      const { extractCADMetadata } = require('../../../lib/services/cad-analysis-service');
      extractCADMetadata.mockRejectedValue(new Error('CAD file corruption detected'));

      const request = new NextRequest('http://localhost:3000/api/ag-ui/cad-analysis', {
        method: 'POST',
        body: JSON.stringify({ file: 'corrupted.dwg' }),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.error.message).toContain('CAD file corruption detected');
    });
  });

  describe('Chat API Error Handling', () => {
    it('should handle chat session initialization failure', async () => {
      const { initializeChat } = require('../../../lib/services/chat-service');
      initializeChat.mockRejectedValue(new Error('Failed to initialize chat session'));

      const request = new NextRequest('http://localhost:3000/api/ag-ui/chat', {
        method: 'POST',
        body: JSON.stringify({ agentId: 'agent-123' }),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Failed to initialize chat session');
    });

    it('should handle invalid chat session', async () => {
      const { validateChatSession } = require('../../../lib/services/chat-service');
      validateChatSession.mockRejectedValue(new Error('Invalid or expired chat session'));

      const request = new NextRequest('http://localhost:3000/api/ag-ui/chat', {
        method: 'POST',
        body: JSON.stringify({ sessionId: 'invalid-session', message: 'Hello' }),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.message).toContain('Invalid or expired chat session');
    });

    it('should handle chat message rate limit', async () => {
      const { sendMessage } = require('../../../lib/services/chat-service');
      sendMessage.mockRejectedValue(new Error('Chat rate limit exceeded'));

      const request = new NextRequest('http://localhost:3000/api/ag-ui/chat', {
        method: 'POST',
        body: JSON.stringify({ sessionId: 'session-123', message: 'Rapid message' }),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error.code).toBe('RATE_LIMIT_ERROR');
      expect(data.error.message).toContain('Chat rate limit exceeded');
    });

    it('should handle chat service unavailable', async () => {
      const { sendMessage } = require('../../../lib/services/chat-service');
      sendMessage.mockRejectedValue(new Error('Chat service temporarily unavailable'));

      const request = new NextRequest('http://localhost:3000/api/ag-ui/chat', {
        method: 'POST',
        body: JSON.stringify({ sessionId: 'session-123', message: 'Hello' }),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error.message).toContain('Chat service temporarily unavailable');
    });
  });

  describe('Compliance API Error Handling', () => {
    it('should handle compliance audit failure', async () => {
      const { performComplianceAudit } = require('../../../lib/services/compliance-service');
      performComplianceAudit.mockRejectedValue(new Error('Compliance audit failed: missing required data'));

      const request = new NextRequest('http://localhost:3000/api/ag-ui/compliance/audit', {
        method: 'POST',
        body: JSON.stringify({ auditType: 'security' }),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.error.message).toContain('Compliance audit failed');
    });

    it('should handle invalid compliance rules', async () => {
      const { validateComplianceRules } = require('../../../lib/services/compliance-service');
      validateComplianceRules.mockRejectedValue(new Error('Invalid compliance rules configuration'));

      const request = new NextRequest('http://localhost:3000/api/ag-ui/compliance/audit', {
        method: 'POST',
        body: JSON.stringify({ rules: 'invalid-rules' }),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('Invalid compliance rules configuration');
    });

    it('should handle compliance report generation timeout', async () => {
      const { getComplianceReport } = require('../../../lib/services/compliance-service');
      getComplianceReport.mockRejectedValue(new Error('Compliance report generation timeout'));

      const request = new NextRequest('http://localhost:3000/api/ag-ui/compliance/audit?reportId=report-123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(504);
      expect(data.error.message).toContain('Compliance report generation timeout');
    });
  });

  describe('Error Recovery and Monitoring', () => {
    it('should provide AG-UI operation recovery suggestions', async () => {
      const { createAgent } = require('../../../lib/services/ag-ui-manager');
      createAgent.mockRejectedValue(new Error('Temporary AG-UI service outage'));

      const validAgentData = {
        name: 'Test Agent',
        type: 'chat',
        config: { model: 'gpt-3.5-turbo' }
      };

      const request = new NextRequest('http://localhost:3000/api/ag-ui', {
        method: 'POST',
        body: JSON.stringify(validAgentData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.error.recovery).toBeDefined();
      expect(data.error.recovery.suggestions).toContain('Retry agent creation');
    });

    it('should track AG-UI operation performance', async () => {
      const { createAgent } = require('../../../lib/services/ag-ui-manager');
      createAgent.mockRejectedValue(new Error('Test error'));

      const validAgentData = {
        name: 'Test Agent',
        type: 'chat'
      };

      const request = new NextRequest('http://localhost:3000/api/ag-ui', {
        method: 'POST',
        body: JSON.stringify(validAgentData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      await POST(request);

      const stats = errorHandler.getErrorStats();
      expect(stats.agUiErrorCount).toBeGreaterThan(0);
    });

    it('should include AG-UI context in error responses', async () => {
      const { createAgent } = require('../../../lib/services/ag-ui-manager');
      createAgent.mockRejectedValue(new Error('Test error'));

      const validAgentData = {
        name: 'Test Agent',
        type: 'chat'
      };

      const request = new NextRequest('http://localhost:3000/api/ag-ui', {
        method: 'POST',
        body: JSON.stringify(validAgentData),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.error.context).toBeDefined();
      expect(data.error.context.operation).toBe('createAgent');
      expect(data.error.context.agentName).toBe('Test Agent');
    });
  });
});