import { NextRequest, NextResponse } from 'next/server';
import { multiAgentCoordinator } from '@/lib/multi-agent/coordinator';

/**
 * 获取所有任务
 */
export async function GET(request: NextRequest) {
  try {
    const tasks = multiAgentCoordinator.getAllActiveTasks();

    return NextResponse.json({
      success: true,
      data: tasks,
      count: tasks.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get tasks',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * 创建新任务
 */
export async function POST(request: NextRequest) {
  try {
    const taskData = await request.json();

    // 验证必要字段
    if (!taskData.title || !taskData.description) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          message: 'Task title and description are required',
        },
        { status: 400 }
      );
    }

    // 创建任务对象
    const task = {
      id: `task_${Date.now()}`,
      title: taskData.title,
      description: taskData.description,
      complexity: taskData.complexity || 'moderate',
      domain: taskData.domain || [],
      requirements: taskData.requirements || [],
      deadline: taskData.deadline
        ? new Date(taskData.deadline)
        : new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: 'pending',
      priority: taskData.priority || 'medium',
      creator: taskData.creator || { id: 'system', name: 'System' },
      assignedAgents: [],
      subtasks: [],
      results: [],
      learningData: {
        experienceRecords: [],
        performanceHistory: [],
        knowledgeUpdates: [],
        feedbackHistory: [],
      },
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        estimatedDuration: taskData.estimatedDuration || 60 * 60 * 1000,
        resourceRequirements: taskData.resourceRequirements || {
          minCpuCores: 1,
          minMemoryMb: 512,
          minNetworkMbps: 10,
          minStorageMb: 100,
          preferredAgentType: 'research',
          requiredCapabilities: [],
        },
        qualityRequirements: taskData.qualityRequirements || {
          minAccuracy: 0.8,
          minCompleteness: 0.8,
          minRelevance: 0.8,
          maxResponseTime: 30000,
          confidenceThreshold: 0.7,
        },
        tags: taskData.tags || [],
        category: taskData.category || 'research',
      },
    };

    const taskId = await multiAgentCoordinator.submitTask(task);

    return NextResponse.json({
      success: true,
      message: 'Task created successfully',
      data: { id: taskId, ...task },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create task',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
