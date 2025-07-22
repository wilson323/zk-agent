import { NextRequest, NextResponse } from 'next/server';
import { DeepResearchService } from '@/lib/multi-agent/deep-research';

// 创建深度研究服务实例
const deepResearchService = new DeepResearchService();

/**
 * 执行深度研究任务
 */
export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();

    // 验证必要字段
    if (!requestData.query && !requestData.description) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          message: 'Query or description is required',
        },
        { status: 400 }
      );
    }

    // 创建研究任务对象
    const researchTask = {
      id: `research_${Date.now()}`,
      title: requestData.title || 'Deep Research Task',
      description: requestData.query || requestData.description,
      complexity: requestData.complexity || 'moderate',
      domain: requestData.domain || [
        { id: 'general', name: 'General', description: 'General research' },
      ],
      requirements: requestData.requirements || [],
      deadline: requestData.deadline
        ? new Date(requestData.deadline)
        : new Date(Date.now() + 2 * 60 * 60 * 1000),
      status: 'pending',
      priority: requestData.priority || 'medium',
      creator: requestData.creator || { id: 'system', name: 'System' },
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
        estimatedDuration: requestData.estimatedDuration || 120 * 60 * 1000,
        resourceRequirements: requestData.resourceRequirements || {
          minCpuCores: 2,
          minMemoryMb: 1024,
          minNetworkMbps: 50,
          minStorageMb: 500,
          preferredAgentType: 'research',
          requiredCapabilities: ['information_retrieval', 'data_analysis', 'reasoning'],
        },
        qualityRequirements: requestData.qualityRequirements || {
          minAccuracy: 0.85,
          minCompleteness: 0.9,
          minRelevance: 0.9,
          maxResponseTime: 120000,
          confidenceThreshold: 0.8,
        },
        tags: requestData.tags || ['deep-research'],
        category: 'research',
      },
    };

    // 执行深度研究
    const researchResult = await deepResearchService.executeResearch(researchTask);

    return NextResponse.json({
      success: true,
      message: 'Deep research completed successfully',
      data: researchResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Deep research failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Deep research failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * 获取深度研究服务状态
 */
export async function GET(request: NextRequest) {
  try {
    const statistics = deepResearchService.getServiceStatistics();

    return NextResponse.json({
      success: true,
      data: {
        status: 'active',
        ...statistics,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to get deep research status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get deep research status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
