/**
 * Multi-Agent Team Templates API Routes
 * 多智能体团队模板API路由
 *
 * 端点:
 * - POST /api/multi-agent/templates/software-dev - 创建软件开发团队模板
 * - POST /api/multi-agent/templates/zk-research - 创建ZK研究团队模板
 * - GET /api/multi-agent/templates - 获取所有可用模板
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import MultiAgentOrchestrationService from '../../../../lib/services/multi-agent-orchestration-service';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();
import { z } from 'zod';

// ==================== 验证模式 ====================

const SoftwareDevTeamSchema = z.object({
  projectName: z.string().min(1).max(100),
});

const ZKResearchTeamSchema = z.object({
  researchTopic: z.string().min(1).max(100),
});

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

// ==================== 模板定义 ====================

const AVAILABLE_TEMPLATES = {
  'software-dev': {
    name: '软件开发团队',
    description: '包含产品经理、系统架构师、全栈工程师和QA工程师的完整软件开发团队',
    agents: [
      { role: '产品经理', template: 'ProductManager' },
      { role: '系统架构师', template: 'SystemArchitect' },
      { role: '全栈工程师', template: 'FullStackEngineer' },
      { role: 'QA工程师', template: 'QAEngineer' },
    ],
    workflowType: 'sequential',
    estimatedTime: '5-15分钟',
    useCase: '适用于软件项目开发、架构设计、代码实现和质量保证',
  },
  'zk-research': {
    name: 'ZK研究团队',
    description: '专注于零知识证明研究的专业团队，包含ZK专家、系统架构师和安全分析师',
    agents: [
      { role: '零知识证明专家', template: 'ZKProofSpecialist' },
      { role: '系统架构师', template: 'SystemArchitect' },
      { role: '安全分析师', template: 'SecurityAnalyst' },
    ],
    workflowType: 'hierarchical',
    estimatedTime: '10-30分钟',
    useCase: '适用于ZK协议研究、安全性分析、性能优化和实现方案设计',
  },
  'data-analysis': {
    name: '数据分析团队',
    description: '专业的数据分析和洞察团队',
    agents: [
      { role: '数据科学家', template: 'DataScientist' },
      { role: '业务分析师', template: 'BusinessAnalyst' },
      { role: '可视化专家', template: 'VisualizationExpert' },
    ],
    workflowType: 'parallel',
    estimatedTime: '3-10分钟',
    useCase: '适用于数据挖掘、趋势分析、报告生成和业务洞察',
  },
  'content-creation': {
    name: '内容创作团队',
    description: '多媒体内容创作和营销团队',
    agents: [
      { role: '内容策划师', template: 'ContentStrategist' },
      { role: '文案写手', template: 'Copywriter' },
      { role: '设计师', template: 'Designer' },
      { role: '营销专家', template: 'MarketingExpert' },
    ],
    workflowType: 'sequential',
    estimatedTime: '5-20分钟',
    useCase: '适用于品牌推广、内容营销、社交媒体运营和创意设计',
  },
};

// ==================== API 路由处理器 ====================

/**
 * GET /api/multi-agent/templates
 * 获取所有可用模板
 */
export async function GET(request: NextRequest) {
  try {
    await getAuthenticatedUser(request); // 验证用户身份

    return NextResponse.json({
      success: true,
      data: {
        templates: AVAILABLE_TEMPLATES,
        total: Object.keys(AVAILABLE_TEMPLATES).length,
      },
      message: '获取模板列表成功',
    });
  } catch (error) {
    return handleError(error, 'GET /api/multi-agent/templates');
  }
}

/**
 * POST /api/multi-agent/templates
 * 根据模板类型创建团队
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    const body = await request.json();

    const { templateType, ...templateData } = body;

    if (!templateType) {
      return NextResponse.json({ error: '缺少模板类型参数' }, { status: 400 });
    }

    const service = getOrchestrationService();
    let team;

    switch (templateType) {
      case 'software-dev':
        const softwareDevData = SoftwareDevTeamSchema.parse(templateData);
        team = await service.createSoftwareDevelopmentTeam(userId, softwareDevData.projectName);
        break;

      case 'zk-research':
        const zkResearchData = ZKResearchTeamSchema.parse(templateData);
        team = await service.createZKResearchTeam(userId, zkResearchData.researchTopic);
        break;

      default:
        return NextResponse.json({ error: `不支持的模板类型: ${templateType}` }, { status: 400 });
    }

    logger.info(`Template team created: ${team.id} (${templateType}) by user ${userId}`);

    return NextResponse.json({
      success: true,
      data: {
        team,
        template: AVAILABLE_TEMPLATES[templateType as keyof typeof AVAILABLE_TEMPLATES],
      },
      message: `${AVAILABLE_TEMPLATES[templateType as keyof typeof AVAILABLE_TEMPLATES]?.name}创建成功`,
    });
  } catch (error) {
    return handleError(error, 'POST /api/multi-agent/templates');
  }
}
