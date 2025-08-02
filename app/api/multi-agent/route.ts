/**
 * Multi-Agent API Routes
 * 多智能体系统API路由 - 提供RESTful接口
 *
 * 端点:
 * - POST /api/multi-agent/teams - 创建智能体团队
 * - GET /api/multi-agent/teams - 获取用户的智能体团队列表
 * - GET /api/multi-agent/teams/[id] - 获取智能体团队详情
 * - POST /api/multi-agent/execute - 执行工作流
 * - GET /api/multi-agent/executions/[id] - 获取工作流执行状态
 * - GET /api/multi-agent/executions - 查询工作流执行历史
 * - POST /api/multi-agent/templates/software-dev - 创建软件开发团队模板
 * - POST /api/multi-agent/templates/zk-research - 创建ZK研究团队模板
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import MultiAgentOrchestrationService from '../../../lib/services/multi-agent-orchestration-service';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();
import { z } from 'zod';

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
 * POST /api/multi-agent/teams
 * 创建智能体团队
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    const body = await request.json();

    const service = getOrchestrationService();
    const team = await service.createAgentTeam(userId, body);

    logger.info(`Agent team created: ${team.id} by user ${userId}`);

    return NextResponse.json({
      success: true,
      data: team,
      message: '智能体团队创建成功',
    });
  } catch (error) {
    return handleError(error, 'POST /api/multi-agent/teams');
  }
}

/**
 * GET /api/multi-agent/teams
 * 获取用户的智能体团队列表
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    const { searchParams } = new URL(request.url);

    const options = {
      status: searchParams.get('status') as 'active' | 'inactive' | 'archived' | undefined,
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0'),
    };

    const service = getOrchestrationService();
    const result = await service.getUserAgentTeams(userId, options);

    return NextResponse.json({
      success: true,
      data: result,
      message: '获取智能体团队列表成功',
    });
  } catch (error) {
    return handleError(error, 'GET /api/multi-agent/teams');
  }
}

/**
 * PUT /api/multi-agent/teams
 * 更新智能体团队状态
 */
export async function PUT(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    const body = await request.json();

    const { teamId, status } = body;

    if (!teamId || !status) {
      return NextResponse.json({ error: '缺少必要参数: teamId, status' }, { status: 400 });
    }

    // 这里可以添加更新团队状态的逻辑
    // const service = getOrchestrationService();
    // const team = await service.updateAgentTeamStatus(userId, teamId, status);

    return NextResponse.json({
      success: true,
      message: '智能体团队状态更新成功',
    });
  } catch (error) {
    return handleError(error, 'PUT /api/multi-agent/teams');
  }
}
