/**
 * Multi-Agent LangChain Workflows API Routes
 * 多智能体LangChain工作流API路由
 *
 * 端点:
 * - POST /api/multi-agent/workflows - 创建LangChain工作流
 * - GET /api/multi-agent/workflows - 列出LangChain工作流
 * - POST /api/multi-agent/workflows/parse - 解析自然语言工作流描述
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { logger } from '../../../../lib/utils/logger';

// ==================== 类型定义 ====================

interface CreateWorkflowRequest {
  description: string;
  name?: string;
  config?: Record<string, any>;
}

interface ParseWorkflowRequest {
  description: string;
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
 * POST /api/multi-agent/workflows
 * 创建LangChain工作流
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    const body: CreateWorkflowRequest = await request.json();

    logger.info('Creating LangChain workflow', {
      userId,
      description: body.description,
      name: body.name
    });

    // 调用后端API创建工作流
    const result = await callBackendAPI('/create', {
      method: 'POST',
      body: JSON.stringify({
        description: body.description,
        name: body.name,
        config: body.config || {}
      })
    });

    logger.info('LangChain workflow created successfully', {
      userId,
      workflowId: result.data?.workflow_id
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message || 'LangChain工作流创建成功'
    });

  } catch (error) {
    logger.error('Failed to create LangChain workflow', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '创建LangChain工作流失败'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/multi-agent/workflows
 * 列出LangChain工作流
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);

    logger.info('Listing LangChain workflows', { userId });

    // 调用后端API获取工作流列表
    const result = await callBackendAPI('', {
      method: 'GET'
    });

    logger.info('LangChain workflows listed successfully', {
      userId,
      count: result.data?.length || 0
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message || '获取LangChain工作流列表成功'
    });

  } catch (error) {
    logger.error('Failed to list LangChain workflows', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '获取LangChain工作流列表失败'
      },
      { status: 500 }
    );
  }
}