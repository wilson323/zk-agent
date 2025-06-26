/**
 * @file ag-ui\compliance\audit\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs, CommonValidations } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { AgentComplianceAudit } from "@/lib/ag-ui/compliance/agent-compliance-audit"

export const GET = createApiRoute(
  RouteConfigs.publicGet(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    const auditor = new AgentComplianceAudit();
    const auditResult = await auditor.auditAllAgents();
  
    return ApiResponseWrapper.success({
      success: true,
      data: auditResult,
    });
  }
);

export const POST = createApiRoute(
  RouteConfigs.protectedPost(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    const body = await req.json();
    const { agentTypes, includeDetails = true } = body;
  
    const auditor = new AgentComplianceAudit();
  
    if (agentTypes && Array.isArray(agentTypes)) {
      // 审计指定的智能体类型
      const results = [];
  
      for (const agentType of agentTypes) {
        let report;
        switch (agentType) {
          case "conversation":
            // 这里可以添加特定的审计逻辑
            break;
          case "cad":
            // 这里可以添加特定的审计逻辑
            break;
          case "poster":
            // 这里可以添加特定的审计逻辑
            break;
          default:
            continue;
        }
  
        if (report) {
          results.push(report);
        }
      }
  
      return ApiResponseWrapper.success({
        success: true,
        data: {
          timestamp: Date.now(),
          totalAgents: results.length,
          reports: includeDetails
            ? results
            : results.map((r) => ({ agentId: r.agentId, isCompliant: r.isCompliant, overallScore: r.overallScore })),
        },
      });
    } else {
      // 审计所有智能体
      const auditResult = await auditor.auditAllAgents();
  
      return ApiResponseWrapper.success({
        success: true,
        data: includeDetails
          ? auditResult
          : {
              timestamp: auditResult.timestamp,
              totalAgents: auditResult.totalAgents,
              compliantAgents: auditResult.compliantAgents,
              overallScore: auditResult.overallScore,
              isCompliant: auditResult.isCompliant,
              recommendations: auditResult.recommendations,
            },
      });
    }
  }
);

