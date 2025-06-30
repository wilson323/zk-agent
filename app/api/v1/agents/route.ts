/**
 * @file v1\agents\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { AgentService } from '@/lib/services/agent-service';
import { CreateAgentRequest, AgentType } from '@/lib/types';
import { UnifiedErrorCode } from '@/types/core/unified-error-codes';

export const POST = createApiRoute(
  RouteConfigs.protectedPost(),
  async (req: NextRequest, { validatedBody }) => {
    try {
      const agentService = new AgentService();
      const createRequest = validatedBody as CreateAgentRequest;
      
      // 验证请求数据
      if (!createRequest.name) {
        return ApiResponseWrapper.error(UnifiedErrorCode.VALIDATION_ERROR, 'Agent name is required', { status: 400 });
      }
      
      // 创建新的Agent
      const newAgent = await agentService.createAgent({
        name: createRequest.name,
        description: createRequest.description || '',
      });
      
      return ApiResponseWrapper.success(newAgent, 'Agent created successfully');
    } catch (error) {
      console.error('Error creating agent:', error);
      return ApiResponseWrapper.error(UnifiedErrorCode.INTERNAL_SERVER_ERROR, 'Failed to create agent', {
        status: 500,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

