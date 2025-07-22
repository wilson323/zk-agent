import { NextRequest, NextResponse } from 'next/server';
import { multiAgentCoordinator } from '@/lib/multi-agent/coordinator';

/**
 * 获取所有智能体
 */
export async function GET(request: NextRequest) {
  try {
    const agents = multiAgentCoordinator.getAllAgents();

    return NextResponse.json({
      success: true,
      data: agents,
      count: agents.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to get agents:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get agents',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * 注册新智能体
 */
export async function POST(request: NextRequest) {
  try {
    const agentData = await request.json();

    // 验证必要字段
    if (!agentData.id || !agentData.name || !agentData.type) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          message: 'Agent ID, name, and type are required',
        },
        { status: 400 }
      );
    }

    // 创建智能体对象
    const agent = {
      id: agentData.id,
      name: agentData.name,
      type: agentData.type,
      capabilities: agentData.capabilities || [],
      specialization: agentData.specialization || agentData.type,
      performance: agentData.performance || {
        accuracy: 0.8,
        precision: 0.8,
        recall: 0.8,
        f1Score: 0.8,
        averageResponseTime: 2000,
        throughput: 10,
        resourceUtilization: 0.5,
        completeness: 0.8,
        consistency: 0.8,
        relevance: 0.8,
        learningRate: 0.1,
        adaptability: 0.7,
        knowledgeRetention: 0.8,
      },
      learningModel: agentData.learningModel || {
        id: `${agentData.id}-model`,
        type: 'reinforcement',
        algorithm: 'Q-Learning',
        parameters: { learningRate: 0.1, discountFactor: 0.9 },
        lastUpdate: new Date(),
        version: '1.0.0',
        performance: {
          accuracy: 0.8,
          precision: 0.8,
          recall: 0.8,
          f1Score: 0.8,
          averageResponseTime: 2000,
          throughput: 10,
          resourceUtilization: 0.5,
          completeness: 0.8,
          consistency: 0.8,
          relevance: 0.8,
          learningRate: 0.1,
          adaptability: 0.7,
          knowledgeRetention: 0.8,
        },
      },
      status: 'idle',
      workload: 0,
      experience: [],
      config: agentData.config || {
        learningEnabled: true,
        collaborationEnabled: true,
        autoUpdate: true,
        resourceLimits: {
          maxCpuUsage: 0.8,
          maxMemoryUsage: 0.8,
          maxNetworkBandwidth: 100,
          maxStorageUsage: 0.8,
          maxConcurrentTasks: 3,
        },
        behaviorSettings: {
          aggressiveness: 5,
          collaborativeness: 8,
          curiosity: 7,
          riskTolerance: 5,
          adaptability: 8,
        },
      },
    };

    await multiAgentCoordinator.registerAgent(agent);

    return NextResponse.json({
      success: true,
      message: 'Agent registered successfully',
      data: agent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to register agent:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to register agent',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
