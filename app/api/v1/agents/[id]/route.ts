/**
 * @file v1\agents\[id]\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { AgentService } from '@/lib/services/agent-service';
import { UpdateAgentRequest } from '@/lib/types';
import { UnifiedErrorCode } from '@/types/core/unified-error-codes';

export const GET = createApiRoute(
  RouteConfigs.protectedGet(),
  async (req: NextRequest, { params }) => {
    try {
      const agentService = new AgentService();
      const agentId = params.id as string;
      
      if (!agentId) {
        return ApiResponseWrapper.error(UnifiedErrorCode.VALIDATION_ERROR, 'Agent ID is required', { status: 400 });
      }
      
      // 获取Agent信息
      const agent = await agentService.getAgentById(agentId);
      
      if (!agent) {
        return ApiResponseWrapper.error(UnifiedErrorCode.RESOURCE_NOT_FOUND, `No agent found with ID: ${agentId}`, { status: 404 });
      }
      
      return ApiResponseWrapper.success(agent, 'Agent retrieved successfully');
    } catch (error) {
      console.error('Error retrieving agent:', error);
      return ApiResponseWrapper.error(UnifiedErrorCode.INTERNAL_SERVER_ERROR, 'Failed to retrieve agent', { 
        status: 500,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export const PUT = createApiRoute(
  RouteConfigs.protectedPut(),
  async (req: NextRequest, { params, validatedBody }) => {
    try {
      const agentService = new AgentService();
      const agentId = params.id as string;
      const updateRequest = validatedBody as UpdateAgentRequest;
      
      if (!agentId) {
        return ApiResponseWrapper.error(UnifiedErrorCode.VALIDATION_ERROR, 'Agent ID is required', { status: 400 });
      }
      
      // 更新Agent
      const updatedAgent = await agentService.updateAgent(agentId, {
        ...updateRequest,
        updatedAt: new Date()
      });
      
      if (!updatedAgent) {
        return ApiResponseWrapper.error(UnifiedErrorCode.RESOURCE_NOT_FOUND, `No agent found with ID: ${agentId}`, { status: 404 });
      }
      
      return ApiResponseWrapper.success(updatedAgent, 'Agent updated successfully');
    } catch (error) {
      console.error('Error updating agent:', error);
      return ApiResponseWrapper.error(UnifiedErrorCode.INTERNAL_SERVER_ERROR, 'Failed to update agent', { 
        status: 500,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export const DELETE = createApiRoute(
  RouteConfigs.protectedDelete(),
  async (req: NextRequest, { params }) => {
    try {
      const agentService = new AgentService();
      const agentId = params.id as string;
      
      if (!agentId) {
        return ApiResponseWrapper.error(UnifiedErrorCode.VALIDATION_ERROR, 'Agent ID is required', { status: 400 });
      }
      
      // 删除Agent
      const deleted = await agentService.deleteAgent(agentId);
      
      if (!deleted) {
        return ApiResponseWrapper.error(UnifiedErrorCode.RESOURCE_NOT_FOUND, `No agent found with ID: ${agentId}`, { status: 404 });
      }
      
      return ApiResponseWrapper.success(null, 'Agent deleted successfully');
    } catch (error) {
      console.error('Error deleting agent:', error);
      return ApiResponseWrapper.error(UnifiedErrorCode.INTERNAL_SERVER_ERROR, 'Failed to delete agent', { 
        status: 500,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

