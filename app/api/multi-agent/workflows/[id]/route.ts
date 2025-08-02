/**
 * Multi-Agent LangChain Workflow Detail API Routes
 * 多智能体LangChain工作流详情API路由
 *
 * 端点:
 * - DELETE /api/multi-agent/workflows/[id] - 删除LangChain工作流
 * - POST /api/multi-agent/workflows/[id]/execute - 执行LangChain工作流
 * - GET /api/multi-agent/workflows/[id]/status - 获取工作流执行状态
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { logger } from '../../../../../lib/utils/logger';

// ==================== 类型定义 ====================

interface ExecuteWorkflowRequest {
  inputs: Record<string, any>;
}

// ==================== 辅助函数 ====================

/**
 * 获取认证用户
 */
async function getAuthenticatedUser(request: NextRequest): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('未认证的用户');
  }
  return session.user.id;
}

/**
 * 调用后端API
 */
async function callBackendAPI(endpoint: string, options: RequestInit = {}) {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
  const url = `${backendUrl}/api/v1/workflows/langchain${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Backend API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// ==================== API 路由处理器 ====================

/**
 * DELETE /api/multi-agent/workflows/[id]
 * 删除LangChain工作流
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getAuthenticatedUser(request);
    const workflowId = id;

    if (!workflowId) {
      return NextResponse.json(
        { success: false, error: '缺少工作流ID参数' },
        { status: 400 }
      );
    }

    logger.info('Deleting LangChain workflow', {
      userId,
      workflowId
    });

    // 调用后端API删除工作流
    const result = await callBackendAPI(`/${workflowId}`, {
      method: 'DELETE'
    });

    logger.info('LangChain workflow deleted successfully', {
      userId,
      workflowId
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message || 'LangChain工作流删除成功'
    });

  } catch (error) {
    logger.error('Failed to delete LangChain workflow', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '删除LangChain工作流失败'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/multi-agent/workflows/[id]/execute
 * 执行LangChain工作流
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getAuthenticatedUser(request);
    const workflowId = id;
    const body: ExecuteWorkflowRequest = await request.json();

    if (!workflowId) {
      return NextResponse.json(
        { success: false, error: '缺少工作流ID参数' },
        { status: 400 }
      );
    }

    logger.info('Executing LangChain workflow', {
      userId,
      workflowId,
      inputs: body.inputs
    });

    // 调用后端API执行工作流
    const result = await callBackendAPI(`/${workflowId}/execute`, {
      method: 'POST',
      body: JSON.stringify({
        inputs: body.inputs || {}
      })
    });

    logger.info('LangChain workflow execution started', {
      userId,
      workflowId,
      executionId: result.data?.execution_id
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message || 'LangChain工作流执行已启动'
    });

  } catch (error) {
    logger.error('Failed to execute LangChain workflow', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '执行LangChain工作流失败'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/multi-agent/workflows/[id]/status
 * 获取工作流执行状态
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getAuthenticatedUser(request);
    const executionId = id;

    if (!executionId) {
      return NextResponse.json(
        { success: false, error: '缺少执行ID参数' },
        { status: 400 }
      );
    }

    logger.info('Getting LangChain workflow status', {
      userId,
      executionId
    });

    // 调用后端API获取执行状态
    const result = await callBackendAPI(`/${executionId}/status`, {
      method: 'GET'
    });

    logger.info('LangChain workflow status retrieved', {
      userId,
      executionId,
      status: result.data?.status
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message || '获取LangChain工作流状态成功'
    });

  } catch (error) {
    logger.error('Failed to get LangChain workflow status', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '获取LangChain工作流状态失败'
      },
      { status: 500 }
    );
  }
}