/**
 * Multi-Agent LangChain Workflow Parse API Routes
 * 多智能体LangChain工作流解析API路由
 *
 * 端点:
 * - POST /api/multi-agent/workflows/parse - 解析自然语言工作流描述
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { logger } from '../../../../../lib/utils/logger';

// ==================== 类型定义 ====================

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
 * POST /api/multi-agent/workflows/parse
 * 解析自然语言工作流描述
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    const body: ParseWorkflowRequest = await request.json();

    if (!body.description || body.description.trim() === '') {
      return NextResponse.json(
        { success: false, error: '工作流描述不能为空' },
        { status: 400 }
      );
    }

    logger.info('Parsing LangChain workflow description', {
      userId,
      description: body.description.substring(0, 100) + '...'
    });

    // 调用后端API解析工作流描述
    const result = await callBackendAPI('/parse', {
      method: 'POST',
      body: JSON.stringify({
        description: body.description
      })
    });

    logger.info('LangChain workflow description parsed successfully', {
      userId,
      workflowName: result.data?.name,
      workflowType: result.data?.type
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message || '自然语言工作流描述解析成功'
    });

  } catch (error) {
    logger.error('Failed to parse LangChain workflow description', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '解析自然语言工作流描述失败'
      },
      { status: 500 }
    );
  }
}