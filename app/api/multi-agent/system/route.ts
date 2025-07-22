import { NextRequest, NextResponse } from 'next/server';
import { multiAgentCoordinator } from '@/lib/multi-agent/coordinator';

/**
 * 多智能体系统状态API
 */
export async function GET(request: NextRequest) {
  try {
    const status = await multiAgentCoordinator.getSystemStatus();

    return NextResponse.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to get system status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get system status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * 更新系统配置
 */
export async function PUT(request: NextRequest) {
  try {
    const config = await request.json();

    // 这里应该实现系统配置更新逻辑
    // 暂时返回成功响应

    return NextResponse.json({
      success: true,
      message: 'System configuration updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to update system configuration:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update system configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
