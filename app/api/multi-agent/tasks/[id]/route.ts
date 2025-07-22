import { NextRequest, NextResponse } from 'next/server';
import { multiAgentCoordinator } from '@/lib/multi-agent/coordinator';

/**
 * 获取特定任务信息
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const task = multiAgentCoordinator.getTaskStatus(params.id);

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          error: 'Task not found',
          message: `Task with ID ${params.id} not found`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: task,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to get task:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get task',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * 更新任务状态
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const updates = await request.json();

    const task = multiAgentCoordinator.getTaskStatus(params.id);
    if (!task) {
      return NextResponse.json(
        {
          success: false,
          error: 'Task not found',
          message: `Task with ID ${params.id} not found`,
        },
        { status: 404 }
      );
    }

    // 这里应该实现任务更新逻辑
    // 暂时返回成功响应

    return NextResponse.json({
      success: true,
      message: 'Task updated successfully',
      data: task,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to update task:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update task',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * 取消任务
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const task = multiAgentCoordinator.getTaskStatus(params.id);
    if (!task) {
      return NextResponse.json(
        {
          success: false,
          error: 'Task not found',
          message: `Task with ID ${params.id} not found`,
        },
        { status: 404 }
      );
    }

    // 这里应该实现任务取消逻辑
    // 暂时返回成功响应

    return NextResponse.json({
      success: true,
      message: 'Task cancelled successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to cancel task:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to cancel task',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
