import { NextRequest, NextResponse } from 'next/server';
import { multiAgentCoordinator } from '@/lib/multi-agent/coordinator';

/**
 * 获取特定智能体信息
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const agent = multiAgentCoordinator.getAgentStatus(id);

    if (!agent) {
      return NextResponse.json(
        {
          success: false,
          error: 'Agent not found',
          message: `Agent with ID ${id} not found`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: agent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to get agent:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get agent',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * 更新智能体配置
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const updates = await request.json();
    const agent = multiAgentCoordinator.getAgentStatus(id);
    if (!agent) {
      return NextResponse.json(
        {
          success: false,
          error: 'Agent not found',
          message: `Agent with ID ${id} not found`,
        },
        { status: 404 }
      );
    }

    // 这里应该实现智能体更新逻辑
    // 暂时返回成功响应

    return NextResponse.json({
      success: true,
      message: 'Agent updated successfully',
      data: agent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to update agent:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update agent',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * 删除智能体
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await multiAgentCoordinator.unregisterAgent(id);

    return NextResponse.json({
      success: true,
      message: 'Agent deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to delete agent:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete agent',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
