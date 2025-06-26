/* eslint-disable */
// @ts-nocheck
/**
 * @file lib/services/agent-service.ts
 * @description 智能体业务逻辑服务，提供CRUD操作、搜索筛选、权限控制等功能
 * @author zk-agent开发团队
 * @lastUpdate 2024-12-19
 * @updateLog
 *   - 2024-12-19 完成智能体服务基础实现
 *   - 2024-12-19 添加命名规范备注和方法说明
 * 
 * 🔤 命名规范说明：
 * - 服务类：Service后缀（如：AgentService）
 * - CRUD方法：create/get/update/delete + 实体名（如：createAgent）
 * - 查询方法：find/list + 条件（如：findAgentById, listAgents）
 * - 验证方法：validate + 对象（如：validateAgentData）
 * - 权限方法：check + 权限类型（如：checkOwnership）
 * - 参数对象：接口名 + Params（如：ListAgentsParams）
 */

import { prisma } from '@/lib/database';
import { PrismaClient, Prisma } from '@prisma/client'
import type { Agent } from '@prisma/client'
import { 
  Agent, 
  AgentQueryParams, 
  CreateAgentRequest, 
  UpdateAgentRequest,
  AgentType,
  AgentStatus 
} from '@/types/agents';
import { PaginationParams } from '@/types/core';
import { 
  IAgentService, 
  CreateAgentData, 
  UpdateAgentData, 
  ListAgentsParams,
  AgentError,
  AgentValidationError,
  AgentNotFoundError
} from '../interfaces/agent-manager.interface'
import { injectable } from '../di/container'

// 📝 命名规范：参数接口使用描述性名称 + Params后缀
export interface ListAgentsParams extends PaginationParams, AgentQueryParams {
  type?: AgentType
  status?: AgentStatus
  tags?: string[]
  sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'rating' | 'usageCount'
  sortOrder?: 'asc' | 'desc'
  visibility?: 'public' | 'private' | 'all'
}

// 📝 命名规范：创建数据接口使用Create + 实体名 + Data
export interface CreateAgentData {
  name: string
  description: string
  type: AgentType
  capabilities: string[]
  configuration: Record<string, any>
  tags?: string[]
  visibility?: 'public' | 'private'
  isActive?: boolean
}

// 📝 命名规范：更新数据接口使用Update + 实体名 + Data
export interface UpdateAgentData {
  name?: string
  description?: string
  capabilities?: string[]
  configuration?: Record<string, any>
  tags?: string[]
  visibility?: 'public' | 'private'
  isActive?: boolean
  status?: AgentStatus
}

// 📝 命名规范：服务类使用PascalCase，Service后缀明确表示业务逻辑层
@injectable
export class AgentService implements IAgentService {
  // 获取智能体列表（支持分页、搜索、筛选）
  static async getAgents(
    queryParams: ListAgentsParams = {}
  ) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      type,
      status,
      tags,
      search,
      isPublic,
      ownerId
    } = queryParams;

    // 输入验证
    if (page < 1) {
      throw new AgentValidationError('页码必须大于0', ['invalid page number'])
    }
    if (limit < 1 || limit > 100) {
      throw new AgentValidationError('每页数量必须在1-100之间', ['invalid page size'])
    }

    const skip: any = (page - 1) * limit;
    
    // 构建查询条件
    const where: any = {};
    
    if (type) where.type = type;
    if (status) where.status = status;
    if (isPublic !== undefined) where.isPublic = isPublic;
    if (ownerId) where.ownerId = ownerId;
    
    // 标签筛选
    if (tags && tags.length > 0) {
      where.tags = {
        hasSome: tags
      };
    }
    
    // 搜索功能
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { capabilities: { hasSome: [search] } }
      ];
    }

    // 执行查询
    const [agents, total] = await Promise.all([
      prisma.agentConfig.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: {
              sessions: true,
              messages: true
            }
          }
        }
      }),
      prisma.agentConfig.count({ where })
    ]);

    return {
      agents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // 根据ID获取单个智能体
  async getAgentById(id: string): Promise<Agent | null> {
    if (!id?.trim()) {
      throw new AgentValidationError('智能体ID不能为空', ['id is required'])
    }

    try {
      const agent: any = await prisma.agentConfig.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              sessions: true,
              messages: true
            }
          }
        }
      });

      if (!agent) return null;

      // 转换为前端类型格式
      return this.transformPrismaToAgent(agent);
    } catch (error) {
      console.error('获取智能体详情失败:', error)
      throw new AgentError('获取智能体详情失败', 'GET_FAILED', { originalError: error })
    }
  }

  // 创建新智能体
  static async createAgent(
    data: CreateAgentData,
    ownerId?: string
  ): Promise<Agent> {
    // 输入验证
    if (!data.name?.trim()) {
      throw new AgentValidationError('智能体名称不能为空', ['name is required'])
    }
    if (!data.description?.trim()) {
      throw new AgentValidationError('智能体描述不能为空', ['description is required'])
    }
    if (ownerId && !ownerId.trim()) {
      throw new AgentValidationError('所有者ID不能为空', ['ownerId is required'])
    }

    // 验证类型枚举
    const validTypes = ['CONVERSATION', 'CAD_ANALYZER', 'POSTER_GENERATOR'] as const
    if (data.type && !validTypes.includes(data.type)) {
      throw new AgentValidationError(`无效的智能体类型: ${data.type}`, ['invalid agent type'])
    }

    try {
      const agent: any = await prisma.agentConfig.create({
        data: {
          name: data.name.trim(),
          description: data.description.trim(),
          type: data.type,
          status: AgentStatus.ACTIVE,
          avatar: data.avatar?.trim() || null,
          tags: Array.isArray(data.tags) ? data.tags.filter(tag => tag?.trim()) : [],
          apiEndpoint: data.apiEndpoint?.trim() || null,
          capabilities: Array.isArray(data.capabilities) ? data.capabilities.filter(cap => cap?.trim()) : [],
          configuration: typeof data.configuration === 'object' && data.configuration !== null ? data.configuration : {},
          version: '1.0.0',
          isPublic: data.isPublic ?? true,
          ownerId,
          metrics: {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            dailyActiveUsers: 0,
            weeklyActiveUsers: 0,
            monthlyActiveUsers: 0,
            rating: 0,
            reviewCount: 0,
            uptime: 0
          }
        },
        include: {
          _count: {
            select: {
              sessions: true,
              messages: true
            }
          }
        }
      });

      return this.transformPrismaToAgent(agent);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new AgentError('智能体名称已存在', 'DUPLICATE_NAME')
        }
        if (error.code === 'P2003') {
          throw new AgentError('所有者不存在', 'OWNER_NOT_FOUND')
        }
      }
      console.error('创建智能体失败:', error)
      throw new AgentError('创建智能体失败', 'CREATE_FAILED', { originalError: error })
    }
  }

  // 更新智能体
  async updateAgent(
    id: string,
    data: UpdateAgentData,
    ownerId?: string
  ): Promise<Agent | null> {
    if (!id?.trim()) {
      throw new AgentValidationError('智能体ID不能为空', ['id is required'])
    }

    // 验证更新数据
    if (data.name !== undefined && !data.name.trim()) {
      throw new AgentValidationError('智能体名称不能为空', ['name cannot be empty'])
    }
    if (data.description !== undefined && !data.description.trim()) {
      throw new AgentValidationError('智能体描述不能为空', ['description cannot be empty'])
    }

    // 验证权限（如果有ownerId，确保只能更新自己的agent）
    if (ownerId) {
      const existingAgent: any = await prisma.agentConfig.findUnique({
        where: { id },
        select: { ownerId: true }
      });

      if (!existingAgent) {
        throw new AgentNotFoundError(id)
      }
      if (existingAgent.ownerId !== ownerId) {
        throw new AgentError('无权限更新此智能体', 'UNAUTHORIZED')
      }
    }

    try {
      const updateData: any = {};
      
      if (data.name) updateData.name = data.name.trim();
      if (data.description) updateData.description = data.description.trim();
      if (data.type) updateData.type = data.type;
      if (data.status) updateData.status = data.status;
      if (data.tags) updateData.tags = data.tags.filter(tag => tag?.trim());
      if (data.capabilities) updateData.capabilities = data.capabilities.filter(cap => cap?.trim());
      if (data.configuration) updateData.configuration = data.configuration;
      if (data.visibility) updateData.isPublic = data.visibility === 'public';
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      const agent: any = await prisma.agentConfig.update({
        where: { id },
        data: updateData,
        include: {
          _count: {
            select: {
              sessions: true,
              messages: true
            }
          }
        }
      });

      return this.transformPrismaToAgent(agent);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new AgentError('智能体名称已存在', 'DUPLICATE_NAME')
        }
        if (error.code === 'P2025') {
          throw new AgentNotFoundError(id)
        }
      }
      console.error('更新智能体失败:', error)
      throw new AgentError('更新智能体失败', 'UPDATE_FAILED', { originalError: error })
    }
  }

  // 删除智能体
  async deleteAgent(id: string, ownerId?: string): Promise<boolean> {
    if (!id?.trim()) {
      throw new AgentValidationError('智能体ID不能为空', ['id is required'])
    }

    // 验证权限
    if (ownerId) {
      const existingAgent: any = await prisma.agentConfig.findUnique({
        where: { id },
        select: { ownerId: true }
      });

      if (!existingAgent) {
        throw new AgentNotFoundError(id)
      }
      if (existingAgent.ownerId !== ownerId) {
        throw new AgentError('无权限删除此智能体', 'UNAUTHORIZED')
      }
    }

    try {
      await prisma.agentConfig.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new AgentNotFoundError(id)
        }
      }
      console.error('删除智能体失败:', error)
      throw new AgentError('删除智能体失败', 'DELETE_FAILED', { originalError: error })
    }
  }

  // 获取推荐智能体
  static async getRecommendedAgents(limit: number = 6): Promise<Agent[]> {
    const agents: any = await prisma.agentConfig.findMany({
      where: {
        isPublic: true,
        status: AgentStatus.ACTIVE
      },
      orderBy: [
        { metrics: { path: ['rating'], order: 'desc' } },
        { metrics: { path: ['totalRequests'], order: 'desc' } }
      ],
      take: limit,
      include: {
        _count: {
          select: {
            sessions: true,
            messages: true
          }
        }
      }
    });

    return agents.map(this.transformPrismaToAgent);
  }

  // 获取热门标签
  static async getPopularTags(limit: number = 20): Promise<string[]> {
    const agents: any = await prisma.agentConfig.findMany({
      where: {
        isPublic: true,
        status: AgentStatus.ACTIVE
      },
      select: {
        tags: true
      }
    });

    // 统计标签频次
    const tagCount: Record<string, number> = {};
    agents.forEach(agent => {
      agent.tags.forEach(tag => {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      });
    });

    // 按频次排序并返回前N个
    return Object.entries(tagCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([tag]) => tag);
  }

  // 更新智能体指标
  static async updateAgentMetrics(
    agentId: string,
    metrics: Partial<any>
  ): Promise<void> {
    await prisma.agentConfig.update({
      where: { id: agentId },
      data: {
        metrics: {
          ...(await this.getAgentMetrics(agentId)),
          ...metrics
        }
      }
    });
  }

  // 获取智能体指标
  static async getAgentMetrics(agentId: string): Promise<any> {
    const agent: any = await prisma.agentConfig.findUnique({
      where: { id: agentId },
      select: { metrics: true }
    });

    return agent?.metrics || {};
  }

  // 数据转换：Prisma模型 -> 前端类型
  private static transformPrismaToAgent(prismaAgent: any): Agent {
    return {
      id: prismaAgent.id,
      name: prismaAgent.name,
      description: prismaAgent.description,
      type: prismaAgent.type as AgentType,
      status: prismaAgent.status as AgentStatus,
      avatar: prismaAgent.avatar,
      tags: prismaAgent.tags,
      apiEndpoint: prismaAgent.apiEndpoint,
      capabilities: prismaAgent.capabilities,
      configuration: prismaAgent.configuration,
      metrics: prismaAgent.metrics,
      version: prismaAgent.version,
      isPublic: prismaAgent.isPublic,
      ownerId: prismaAgent.ownerId,
      createdAt: prismaAgent.createdAt.toISOString(),
      updatedAt: prismaAgent.updatedAt.toISOString()
    };
  }
}