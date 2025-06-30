/**
 * @file ag-ui\compliance\audit\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { UnifiedErrorCode } from '@/types/core/unified-error-codes';
import { AgentComplianceAudit } from '@/lib/ag-ui/compliance/agent-compliance-audit';

/**
 * POST /api/ag-ui/compliance/audit
 * 执行代理合规审计
 */
export const POST = createApiRoute(
  RouteConfigs.protectedPost(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const { agentId, auditConfig } = await req.json();
      
      // 实现合规审计逻辑
      const audit = new AgentComplianceAudit();
      
      // 验证输入参数
      if (!agentId) {
        return ApiResponseWrapper.error(UnifiedErrorCode.VALIDATION_ERROR, 'Agent ID is required', { status: 400 });
      }
      
      // 执行合规审计
      const result = await audit.performAudit(agentId, {
        checkSecurity: auditConfig?.checkSecurity ?? true,
        checkPerformance: auditConfig?.checkPerformance ?? true,
        checkCompliance: auditConfig?.checkCompliance ?? true,
        checkDataPrivacy: auditConfig?.checkDataPrivacy ?? true,
        generateReport: auditConfig?.generateReport ?? true,
        ...auditConfig
      });
      
      // 记录审计日志
      console.log(`Compliance audit completed for agent ${agentId}:`, {
        score: result.overallScore,
        // issues: result.issues?.length || 0,
        timestamp: new Date().toISOString()
      });
      
      return ApiResponseWrapper.success(result);
    } catch (error) {
      console.error('Error performing compliance audit:', error);
      return ApiResponseWrapper.error(
        UnifiedErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to perform compliance audit',
        { 
          status: 500,
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      );
    }
  }
);

