/**
 * Multi-Agent Workflow Execution API Routes
 * 多智能体工作流执行API路由
 *
 * 端点:
 * - POST /api/multi-agent/execute - 执行工作流
 * - GET /api/multi-agent/execute - 查询工作流执行历史
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import MultiAgentOrchestrationService from '../../../../lib/services/multi-agent-orchestration-service';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();

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

  if (error.name === 'ZodError') {
    return NextResponse.json(
      {
        error: '请求参数验证失败',
        details: error.errors,
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ error: error.message || '服务器内部错误' }, { status: 500 });
}

// ==================== API 路由处理器 ====================

/**
 * POST /api/multi-agent/execute
 * 执行工作流
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    const body = await request.json();

    const service = getOrchestrationService();
    const executionId = await service.executeWorkflow(userId, body);

    logger.info(`Workflow execution started: ${executionId} by user ${userId}`);

    return NextResponse.json({
      success: true,
      data: {
        executionId,
        status: 'pending',
        message: '工作流已开始执行，请使用executionId查询执行状态',
      },
      message: '工作流执行请求提交成功',
    });
  } catch (error) {
    return handleError(error, 'POST /api/multi-agent/execute');
  }
}

/**
 * GET /api/multi-agent/execute
 * 查询工作流执行历史
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    const { searchParams } = new URL(request.url);

    const query = {
      teamId: searchParams.get('teamId') || undefined,
      status: searchParams.get('status') as
        | 'created'
        | 'running'
        | 'completed'
        | 'failed'
        | undefined,
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0'),
    };

    const service = getOrchestrationService();
    const result = await service.queryWorkflowExecutions(userId, query);

    return NextResponse.json({
      success: true,
      data: result,
      message: '获取工作流执行历史成功',
    });
  } catch (error) {
    return handleError(error, 'GET /api/multi-agent/execute');
  }
}
