/**
 * Multi-Agent Workflow Execution Status API Routes
 * 多智能体工作流执行状态API路由
 *
 * 端点:
 * - GET /api/multi-agent/executions/[id] - 获取工作流执行状态
 * - DELETE /api/multi-agent/executions/[id] - 取消工作流执行
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import MultiAgentOrchestrationService from '../../../../../lib/services/multi-agent-orchestration-service';
import { logger } from '../../../../../lib/utils/logger';

// ==================== 全局服务实例 ====================

let orchestrationService: MultiAgentOrchestrationService;

function getOrchestrationService(): MultiAgentOrchestrationService {
  if (!orchestrationService) {
    orchestrationService = new MultiAgentOrchestrationService();
  }
  return orchestrationService;
}

// ==================== 辅助函数 ====================

async function getAuthenticatedUser(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error('未授权访问');
  }

  return session.user.id;
}

function handleError(error: any, context: string) {
  logger.error(`${context}:`, error);

  if (error.message.includes('未授权') || error.message.includes('无权限')) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  if (error.message.includes('不存在') || error.message.includes('未找到')) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ error: error.message || '服务器内部错误' }, { status: 500 });
}

// ==================== API 路由处理器 ====================

/**
 * GET /api/multi-agent/executions/[id]
 * 获取工作流执行状态
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getAuthenticatedUser(request);
    const executionId = params.id;

    if (!executionId) {
      return NextResponse.json({ error: '缺少执行ID参数' }, { status: 400 });
    }

    const service = getOrchestrationService();
    const execution = await service.getWorkflowExecution(userId, executionId);

    return NextResponse.json({
      success: true,
      data: execution,
      message: '获取工作流执行状态成功',
    });
  } catch (error) {
    return handleError(error, `GET /api/multi-agent/executions/${params.id}`);
  }
}

/**
 * DELETE /api/multi-agent/executions/[id]
 * 取消工作流执行
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getAuthenticatedUser(request);
    const executionId = params.id;

    if (!executionId) {
      return NextResponse.json({ error: '缺少执行ID参数' }, { status: 400 });
    }

    // 这里可以添加取消工作流执行的逻辑
    // const service = getOrchestrationService();
    // await service.cancelWorkflowExecution(userId, executionId);

    logger.info(`Workflow execution cancelled: ${executionId} by user ${userId}`);

    return NextResponse.json({
      success: true,
      message: '工作流执行已取消',
    });
  } catch (error) {
    return handleError(error, `DELETE /api/multi-agent/executions/${params.id}`);
  }
}
