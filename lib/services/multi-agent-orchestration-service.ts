/**
 * Multi-Agent Orchestration Service
 * 多智能体编排服务 - 集成Swarms框架到ZK-Agent业务层
 *
 * 功能特性:
 * - 与现有用户认证系统集成
 * - 智能体团队管理
 * - 工作流执行和监控
 * - 结果持久化和查询
 * - 权限控制和资源管理
 */

import { Redis } from 'ioredis';
import {
  ZKWorkflowOrchestrator,
  ZKAgentFactory,
  AgentConfig,
  WorkflowConfig,
  WorkflowResult,
  AgentTemplates,
} from '../ai/swarms-integration';
import { UnifiedAIAdapter } from '../ai/unified-ai-adapter';
import { getEnhancedDb } from '../database/enhanced-database-manager';
import { getLogger } from '@/lib/utils/logger';
// 使用成熟的LangChain工作流服务替代自定义引擎
import { 
  LangChainWorkflowClient, 
  langchainWorkflowClient,
  createAndExecuteWorkflow,
  waitForWorkflowCompletion,
  type LangChainWorkflowConfig,
  type WorkflowExecutionResult
} from './langchain-workflow-client';

const logger = getLogger();
import { z } from 'zod';

// ==================== 验证模式 ====================

const CreateAgentTeamSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  projectType: z.enum(['software_development', 'research', 'analysis', 'custom']),
  agents: z
    .array(
      z.object({
        name: z.string().min(1).max(50),
        role: z.string().min(1).max(100),
        template: z
          .enum([
            'ProductManager',
            'SystemArchitect',
            'FullStackEngineer',
            'ZKProofSpecialist',
            'QAEngineer',
          ])
          .optional(),
        systemPrompt: z.string().optional(),
        modelName: z.string().default('gpt-4o-mini'),
        tools: z.array(z.string()).optional(),
        enableMemory: z.boolean().default(true),
        enableCache: z.boolean().default(true),
      })
    )
    .min(1)
    .max(10),
  workflowType: z.enum(['sequential', 'parallel', 'hierarchical']).default('sequential'),
  maxConcurrency: z.number().min(1).max(5).optional(),
  timeout: z.number().min(1000).max(300000).optional(), // 1秒到5分钟
});

const ExecuteWorkflowSchema = z.object({
  teamId: z.string().uuid(),
  task: z.string().min(1).max(5000),
  context: z.record(z.any()).optional(),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
});

const ExecuteNaturalLanguageWorkflowSchema = z.object({
  description: z.string().min(10).max(10000),
  context: z.record(z.any()).optional(),
  constraints: z.array(z.string()).optional(),
  expectedOutput: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  deadline: z.string().datetime().optional(),
  autoCreateTeam: z.boolean().default(true),
  preferredAgents: z.array(z.string()).optional(),
});

const QueryWorkflowsSchema = z.object({
  userId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  status: z.enum(['created', 'running', 'completed', 'failed']).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

// ==================== 类型定义 ====================

export interface AgentTeam {
  id: string;
  name: string;
  description?: string;
  projectType: string;
  workflowId: string;
  ownerId: string;
  config: WorkflowConfig;
  status: 'active' | 'inactive' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  metrics?: {
    totalExecutions: number;
    successRate: number;
    averageExecutionTime: number;
    totalTokenUsage: number;
  };
}

export interface WorkflowExecution {
  id: string;
  teamId: string;
  userId: string;
  task: string;
  context?: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout';
  result?: WorkflowResult;
  error?: string;
  priority: 'low' | 'normal' | 'high';
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

// ==================== 主服务类 ====================

export class MultiAgentOrchestrationService {
  private orchestrator: ZKWorkflowOrchestrator;
  private agentFactory: ZKAgentFactory;
  private aiAdapter: UnifiedAIAdapter;
  private redis: Redis;
  private executionQueue: Map<string, Promise<WorkflowResult>> = new Map();
  private logger: typeof logger;
  // 使用成熟的LangChain工作流客户端
  private langchainClient: LangChainWorkflowClient;

  constructor() {
    this.logger = logger;
    this.aiAdapter = UnifiedAIAdapter.getInstance();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
    });

    this.orchestrator = new ZKWorkflowOrchestrator(this.aiAdapter, this.redis);
    this.agentFactory = new ZKAgentFactory(this.orchestrator);
    
    // 初始化LangChain工作流客户端
     this.langchainClient = langchainWorkflowClient;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.orchestrator.on('workflowStarted', async data => {
      this.logger.info(`Workflow started: ${data.workflowId}`);
      await this.updateExecutionStatus(data.workflowId, 'running', { startedAt: new Date() });
    });

    this.orchestrator.on('workflowCompleted', async (result: WorkflowResult) => {
      this.logger.info(`Workflow completed: ${result.workflowId}`);
      await this.updateExecutionStatus(result.workflowId, 'completed', {
        result,
        completedAt: new Date(),
      });
      await this.updateTeamMetrics(result.workflowId, result);
    });

    this.orchestrator.on('workflowFailed', async data => {
      this.logger.error(`Workflow failed: ${data.workflowId}`, data.error);
      await this.updateExecutionStatus(data.workflowId, 'failed', {
        error: data.error,
        completedAt: new Date(),
      });
    });

    this.orchestrator.on('agentTaskCompleted', data => {
      this.logger.debug(`Agent task completed: ${data.agentName}`, {
        responseTime: data.responseTime,
        tokenUsage: data.tokenUsage,
      });
    });
  }


  // ==================== 智能体团队管理 ====================

  /**
   * 创建智能体团队
   */
  async createAgentTeam(
    userId: string,
    teamData: z.infer<typeof CreateAgentTeamSchema>
  ): Promise<AgentTeam> {
    try {
      // 验证输入数据
      const validatedData = CreateAgentTeamSchema.parse(teamData);

      // 检查用户权限
      await this.validateUserPermissions(userId, 'create_team');

      // 构建工作流配置
      const workflowConfig: WorkflowConfig = {
        name: validatedData.name,
        type: validatedData.workflowType,
        agents: await this.buildAgentConfigs(validatedData.agents),
        maxConcurrency: validatedData.maxConcurrency,
        timeout: validatedData.timeout,
      };

      // 创建工作流
      const workflowId = await this.orchestrator.createWorkflow(workflowConfig);

      // 保存团队信息到数据库
      const enhancedDb = getEnhancedDb();
      const prisma = enhancedDb?.getClient();
      if (!prisma) throw new Error('Database not available');

      // 使用AgentConfig模型存储团队信息
      const team = await prisma.agentConfig.create({
        data: {
          agentId: workflowId,
          name: validatedData.name,
          type: 'CONVERSATION',
          description: validatedData.description || '',
          status: 'ACTIVE',
          config: {
            projectType: validatedData.projectType,
            workflowId,
            ownerId: userId,
            workflowConfig: JSON.parse(JSON.stringify(workflowConfig)), // 将 WorkflowConfig 转换为纯 JSON 对象
            teamStatus: 'active'
          },
        },
      });

      this.logger.info(`Agent team created: ${team.id} by user ${userId}`);

      // 从 config 字段中提取团队信息
      const teamConfig = team.config as any;

      return {
        id: team.id,
        name: team.name,
        description: team.description,
        projectType: teamConfig.projectType,
        workflowId: teamConfig.workflowId,
        ownerId: teamConfig.ownerId,
        config: workflowConfig,
        status: team.status as 'active' | 'inactive' | 'archived',
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
      };
    } catch (error: any) {
      this.logger.error('Failed to create agent team:', error);
      throw new Error(`创建智能体团队失败: ${error?.message || String(error)}`);
    }
  }

  /**
   * 获取用户的智能体团队列表
   */
  async getUserAgentTeams(
    userId: string,
    options: {
      status?: 'active' | 'inactive' | 'archived';
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ teams: AgentTeam[]; total: number }> {
    try {
      const { status, limit = 20, offset = 0 } = options;

      const where: any = { ownerId: userId };
      if (status) {
        where.status = status;
      }

      const enhancedDb = getEnhancedDb();
      const prisma = enhancedDb?.getClient();
      if (!prisma) throw new Error('Database not available');

      const [teams, total] = await Promise.all([
        prisma.agentConfig.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.agentConfig.count({ where }),
      ]);

      const teamsWithMetrics = await Promise.all(
        (teams || []).map(async team => {
          const metrics = await this.getTeamMetrics(team.id);
          return {
            id: team.id,
            name: team.name,
            description: team.description,
            projectType: (team.config as any).projectType,
            workflowId: (team.config as any).workflowId,
            ownerId: (team.config as any).ownerId,
            config: (team.config as any).workflowConfig,
            status: (team.config as any).teamStatus as 'active' | 'inactive' | 'archived',
            createdAt: team.createdAt,
            updatedAt: team.updatedAt,
            metrics,
          };
        })
      );

      return { teams: teamsWithMetrics, total };
    } catch (error) {
      this.logger.error('Failed to get user agent teams:', error);
      throw new Error(`获取智能体团队列表失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取智能体团队详情
   */
  async getAgentTeam(userId: string, teamId: string): Promise<AgentTeam> {
    try {
      const enhancedDb = getEnhancedDb();
      const prisma = enhancedDb?.getClient();
      if (!prisma) throw new Error('Database not available');

      const team = await prisma.agentConfig.findFirst({
        where: {
          id: teamId,
          config: {
            path: ['ownerId'],
            equals: userId
          }
        },
      });

      if (!team) {
        throw new Error('智能体团队不存在或无权限访问');
      }

      const metrics = await this.getTeamMetrics(teamId);

      return {
        id: team.id,
        name: team.name,
        description: team.description,
        projectType: (team.config as any).projectType,
        workflowId: (team.config as any).workflowId,
        ownerId: (team.config as any).ownerId,
        config: (team.config as any).workflowConfig,
        status: (team.config as any).teamStatus as 'active' | 'inactive' | 'archived',
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
      };
    } catch (error) {
      this.logger.error('Failed to get agent team:', error);
      throw new Error(`获取智能体团队详情失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ==================== 工作流执行 ====================

  /**
   * 执行工作流
   */
  async executeWorkflow(
    userId: string,
    executionData: z.infer<typeof ExecuteWorkflowSchema>
  ): Promise<string> {
    try {
      // 验证输入数据
      const validatedData = ExecuteWorkflowSchema.parse(executionData);

      // 验证团队权限
      const team = await this.getAgentTeam(userId, validatedData.teamId);

      if (team.status !== 'active') {
        throw new Error('智能体团队未激活，无法执行任务');
      }

      // 创建执行记录
      const enhancedDb = getEnhancedDb();
      const prisma = enhancedDb?.getClient();
      if (!prisma) throw new Error('Database not available');

      // 使用AgentConfig模型存储执行记录
      const execution = await prisma.agentConfig.create({
        data: {
          agentId: `execution-${Date.now()}`,
          name: `Execution for ${validatedData.teamId}`,
          type: 'CONVERSATION',
          description: 'Workflow execution record',
          status: 'ACTIVE',
          config: {
            teamId: validatedData.teamId,
            userId,
            task: validatedData.task,
            context: validatedData.context,
            executionStatus: 'pending',
            priority: validatedData.priority,
            createdAt: new Date(),
          },
        },
      });

      // 异步执行工作流
      const executionPromise = this.executeWorkflowInternal(
        execution.id,
        team.workflowId,
        validatedData.task,
        validatedData.context
      );

      this.executionQueue.set(execution.id, executionPromise);

      // 不等待执行完成，立即返回执行ID
      this.logger.info(`Workflow execution queued: ${execution.id} for team ${validatedData.teamId}`);

      return execution.id;
    } catch (error) {
      this.logger.error('Failed to execute workflow:', error);
      throw new Error(`执行工作流失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 内部工作流执行逻辑
   */
  private async executeWorkflowInternal(
    executionId: string,
    workflowId: string,
    task: string,
    context?: Record<string, any>
  ): Promise<WorkflowResult> {
    try {
      // 更新状态为运行中
      await this.updateExecutionStatus(executionId, 'running', { startedAt: new Date() });

      // 执行工作流
      const result = await this.orchestrator.executeWorkflow(workflowId, task, context);

      // 更新执行结果
      await this.updateExecutionStatus(executionId, 'completed', {
        result,
        completedAt: new Date(),
      });

      return result;
    } catch (error) {
      this.logger.error(`Workflow execution failed: ${executionId}`, error);

      await this.updateExecutionStatus(executionId, 'failed', {
        error: error instanceof Error ? error.message : String(error),
        completedAt: new Date(),
      });

      throw error;
    } finally {
      this.executionQueue.delete(executionId);
    }
  }

  /**
   * 执行自然语言工作流（使用LangChain后端服务）
   */
  async executeNaturalLanguageWorkflow(
    userId: string,
    workflowData: z.infer<typeof ExecuteNaturalLanguageWorkflowSchema>
  ): Promise<string> {
    try {
      // 验证输入数据
      const validatedData = ExecuteNaturalLanguageWorkflowSchema.parse(workflowData);

      this.logger.info(`Starting LangChain workflow execution for user ${userId}`);
      this.logger.info(`Workflow description: ${validatedData.description}`);

      // 使用LangChain工作流客户端创建工作流
      const workflowName = `User-${userId}-${Date.now()}`;
      const workflowId = await this.langchainClient.createWorkflowFromDescription(
        validatedData.description,
        workflowName
      );
      
      // 准备执行输入
      const executionInputs = {
        description: validatedData.description,
        context: validatedData.context || {},
        constraints: validatedData.constraints || [],
        expected_output: validatedData.expectedOutput,
        priority: validatedData.priority,
        user_id: userId,
      };

      // 执行LangChain工作流
      const executionResult = await this.langchainClient.executeWorkflow(
        workflowId,
        executionInputs,
        {
          deadline: validatedData.deadline,
          auto_create_team: validatedData.autoCreateTeam,
          preferred_agents: validatedData.preferredAgents,
        }
      );

      // 创建本地执行记录
      const enhancedDb = getEnhancedDb();
      const prisma = enhancedDb?.getClient();
      if (!prisma) throw new Error('Database not available');

      const execution = await prisma.agentConfig.create({
        data: {
          agentId: executionResult.execution_id,
          name: `LangChain Workflow: ${validatedData.description.substring(0, 50)}...`,
          type: 'CONVERSATION',
          description: 'LangChain workflow execution record',
          status: 'ACTIVE',
          config: {
            userId,
            workflowId,
            langchainExecutionId: executionResult.execution_id,
            originalDescription: validatedData.description,
            executionInputs,
            executionStatus: executionResult.status,
            createdAt: new Date(),
          },
        },
      });

      this.logger.info(`LangChain workflow execution started: ${executionResult.execution_id}`);
      return executionResult.execution_id;
    } catch (error) {
      this.logger.error('Failed to execute natural language workflow:', error);
      throw new Error(`执行自然语言工作流失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取LangChain工作流执行状态
   */
  async getLangChainWorkflowStatus(executionId: string): Promise<WorkflowExecutionResult | null> {
    try {
      return await this.langchainClient.getWorkflowStatus(executionId);
    } catch (error) {
      this.logger.error('Failed to get LangChain workflow status:', error);
      throw error;
    }
  }

  /**
   * 列出用户的LangChain工作流
   */
  async listLangChainWorkflows(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    type: string;
    agents_count: number;
  }>> {
    try {
      return await this.langchainClient.listWorkflows();
    } catch (error) {
      this.logger.error('Failed to list LangChain workflows:', error);
      throw error;
    }
  }

  /**
   * 删除LangChain工作流
   */
  async deleteLangChainWorkflow(workflowId: string): Promise<boolean> {
    try {
      return await this.langchainClient.deleteWorkflow(workflowId);
    } catch (error) {
      this.logger.error('Failed to delete LangChain workflow:', error);
      throw error;
    }
  }

  /**
   * 解析自然语言工作流描述（不执行）
   */
  async parseLangChainWorkflowDescription(description: string): Promise<LangChainWorkflowConfig> {
    try {
      return await this.langchainClient.parseWorkflowDescription(description);
    } catch (error) {
      this.logger.error('Failed to parse workflow description:', error);
      throw error;
    }
  }

  /**
   * 根据解析的工作流创建智能体团队（保留用于传统工作流）
   */
  private async createTeamFromParsedWorkflow(
    userId: string,
    parsedWorkflow: any, // 改为any类型，因为ParsedWorkflow类型已不可用
    preferredAgents?: string[]
  ): Promise<AgentTeam> {
    // 简化实现，直接创建基础团队
    const agentSpecs = [{
      name: 'Assistant',
      role: 'General Assistant',
      template: 'ProductManager',
      systemPrompt: 'You are a helpful assistant.',
      modelName: 'gpt-4o-mini',
      tools: [],
      enableMemory: true,
      enableCache: true,
    }];

    const teamData = {
      name: `自动生成团队 - ${parsedWorkflow.name}`,
      description: parsedWorkflow.description,
      projectType: this.inferProjectType(parsedWorkflow.tasks),
      agents: agentSpecs,
      workflowType: parsedWorkflow.executionPlan.type,
      maxConcurrency: parsedWorkflow.executionPlan.maxConcurrency,
      timeout: parsedWorkflow.executionPlan.timeout,
    } as z.infer<typeof CreateAgentTeamSchema>;

    return await this.createAgentTeam(userId, teamData);
  }

  /**
   * 将智能体能力映射到模板
   */
  private mapCapabilityToTemplate(capabilities: string[]): string | undefined {
    const capabilityMap: Record<string, string> = {
      'product_management': 'ProductManager',
      'system_architecture': 'SystemArchitect',
      'full_stack_development': 'FullStackEngineer',
      'zk_proof_development': 'ZKProofSpecialist',
      'quality_assurance': 'QAEngineer',
    };

    for (const capability of capabilities) {
      if (capabilityMap[capability]) {
        return capabilityMap[capability];
      }
    }
    return undefined;
  }

  /**
   * 推断项目类型
   */
  private inferProjectType(tasks: any[]): 'software_development' | 'research' | 'analysis' | 'custom' {
    const taskDescriptions = tasks.map(task => task.description.toLowerCase()).join(' ');
    
    if (taskDescriptions.includes('develop') || taskDescriptions.includes('code') || taskDescriptions.includes('implement')) {
      return 'software_development';
    } else if (taskDescriptions.includes('research') || taskDescriptions.includes('analyze') || taskDescriptions.includes('study')) {
      return 'research';
    } else if (taskDescriptions.includes('analyze') || taskDescriptions.includes('evaluate') || taskDescriptions.includes('assess')) {
      return 'analysis';
    }
    return 'custom';
  }

  /**
   * 等待LangChain工作流完成（便捷方法）
   */
  async waitForLangChainWorkflowCompletion(
    executionId: string,
    maxWaitTime: number = 300000, // 5分钟
    pollInterval: number = 2000 // 2秒
  ): Promise<WorkflowExecutionResult> {
    try {
      return await waitForWorkflowCompletion(executionId, maxWaitTime, pollInterval);
    } catch (error) {
      this.logger.error('Failed to wait for LangChain workflow completion:', error);
      throw error;
    }
  }

  /**
   * 创建并执行LangChain工作流（便捷方法）
   */
  async createAndExecuteLangChainWorkflow(
    description: string,
    inputs: Record<string, any>,
    name?: string
  ): Promise<WorkflowExecutionResult> {
    try {
      return await createAndExecuteWorkflow(description, inputs, name);
    } catch (error) {
      this.logger.error('Failed to create and execute LangChain workflow:', error);
      throw error;
    }
  }

  /**
   * 内部工作流执行逻辑（保留用于传统Swarms工作流）
   */
  private async executeWorkflowInternalLegacy(
    executionId: string,
    teamId: string,
    task: string
  ): Promise<WorkflowResult> {
    try {
      this.logger.info(`Executing legacy workflow: ${executionId}`);
      
      // 更新执行状态为运行中
      await this.updateExecutionStatus(executionId, 'running', {
        startedAt: new Date(),
      });

      // 执行传统Swarms工作流
      const result = await this.orchestrator.executeWorkflow(
        teamId,
        task
      );

      // 更新执行状态为完成
      await this.updateExecutionStatus(executionId, 'completed', {
        completedAt: new Date(),
        result,
      });

      this.logger.info(`Legacy workflow completed: ${executionId}`);
      return result;
    } catch (error) {
      this.logger.error(`Legacy workflow execution failed: ${executionId}`, error);
      
      // 更新执行状态为失败
      await this.updateExecutionStatus(executionId, 'failed', {
        completedAt: new Date(),
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    } finally {
      // 从执行队列中移除
      this.executionQueue.delete(executionId);
    }
  }

  /**
   * 获取工作流执行状态
   * 
   * @param userId - 用户ID
   * @param executionId - 执行ID
   * @returns 工作流执行状态信息
   */
  async getWorkflowExecution(userId: string, executionId: string): Promise<WorkflowExecution> {
    try {
      this.logger.info(`Getting workflow execution: ${executionId} for user: ${userId}`);

      // 检查内存中的执行队列
      const executionPromise = this.executionQueue.get(executionId);
      if (executionPromise) {
        // 如果执行还在进行中，返回运行状态
        return {
          id: executionId,
          teamId: '', // 从执行上下文获取
          userId,
          task: '', // 从执行上下文获取
          status: 'running',
          priority: 'normal',
          createdAt: new Date(),
        };
      }

      // 从数据库中查询执行记录
      const enhancedDb = getEnhancedDb();
      const prisma = enhancedDb?.getClient();
      if (!prisma) throw new Error('数据库不可用');

      const execution = await prisma.agentConfig.findUnique({
        where: { id: executionId },
      });

      if (execution && execution.config) {
        const config = execution.config as any;

        // 确保配置中包含必要的执行信息
        if (config.userId === userId || userId === 'system') {
          return {
            id: executionId,
            teamId: config.teamId || '',
            userId: config.userId || userId,
            task: config.task || '',
            context: config.context,
            status: config.executionStatus || 'pending',
            result: config.result,
            error: config.error,
            priority: config.priority || 'normal',
            startedAt: config.startedAt ? new Date(config.startedAt) : undefined,
            completedAt: config.completedAt ? new Date(config.completedAt) : undefined,
            createdAt: execution.createdAt
          };
        }
      }

      // 尝试从Redis中查询执行记录
      if (this.redis) {
        const executionData = await this.redis.hgetall(`execution:${executionId}`);

        if (executionData && Object.keys(executionData).length > 0) {
          return {
            id: executionId,
            teamId: executionData.teamId || '',
            userId: executionData.userId || userId,
            task: executionData.task || '',
            context: executionData.context ? JSON.parse(executionData.context) : undefined,
            status: executionData.status as any || 'pending',
            result: executionData.result ? JSON.parse(executionData.result) : undefined,
            error: executionData.error,
            priority: executionData.priority as any || 'normal',
            startedAt: executionData.startedAt ? new Date(executionData.startedAt) : undefined,
            completedAt: executionData.completedAt ? new Date(executionData.completedAt) : undefined,
            createdAt: executionData.createdAt ? new Date(executionData.createdAt) : new Date()
          };
        }
      }

      // 如果没有找到执行记录，抛出错误
      throw new Error('工作流执行记录不存在');
    } catch (error: any) {
      this.logger.error('Failed to get workflow execution:', error);
      throw new Error(`获取工作流执行记录失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 查询工作流执行历史
   */
  async queryWorkflowExecutions(
    userId: string,
    query: z.infer<typeof QueryWorkflowsSchema>
  ): Promise<{ executions: WorkflowExecution[]; total: number }> {
    try {
      const validatedQuery = QueryWorkflowsSchema.parse(query);

      // TODO: 实现真正的工作流执行历史查询
      // 目前返回空结果，因为数据库中还没有专门的执行历史表
      this.logger.info(`Querying workflow executions for user: ${userId}`, validatedQuery);

      // 从Redis或内存中获取执行历史（如果有的话）
      const executions: WorkflowExecution[] = [];
      const total = 0;

      return {
        executions,
        total,
      };
    } catch (error) {
      this.logger.error('Failed to query workflow executions:', error);
      throw new Error(`查询工作流执行历史失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ==================== 快速创建模板 ====================

  /**
   * 创建软件开发团队
   */
  async createSoftwareDevelopmentTeam(userId: string, projectName: string): Promise<AgentTeam> {
    const teamData = {
      name: `${projectName} 开发团队`,
      description: `${projectName} 项目的软件开发智能体团队`,
      projectType: 'software_development' as const,
      agents: [
        {
          name: `${projectName}-产品经理`,
          role: '产品经理',
          template: 'ProductManager' as const,
          modelName: 'gpt-4o-mini',
          enableMemory: true,
          enableCache: true,
        },
        {
          name: `${projectName}-系统架构师`,
          role: '系统架构师',
          template: 'SystemArchitect' as const,
          modelName: 'gpt-4o-mini',
          enableMemory: true,
          enableCache: true,
        },
        {
          name: `${projectName}-全栈工程师`,
          role: '全栈工程师',
          template: 'FullStackEngineer' as const,
          modelName: 'gpt-4o-mini',
          enableMemory: true,
          enableCache: true,
        },
        {
          name: `${projectName}-QA工程师`,
          role: 'QA工程师',
          template: 'QAEngineer' as const,
          modelName: 'gpt-4o-mini',
          enableMemory: true,
          enableCache: true,
        },
      ],
      workflowType: 'sequential' as const,
    };

    return await this.createAgentTeam(userId, teamData);
  }

  /**
   * 创建ZK研究团队
   */
  async createZKResearchTeam(userId: string, researchTopic: string): Promise<AgentTeam> {
    const teamData = {
      name: `${researchTopic} ZK研究团队`,
      description: `专注于${researchTopic}的零知识证明研究团队`,
      projectType: 'research' as const,
      agents: [
        {
          name: `${researchTopic}-ZK专家`,
          role: '零知识证明专家',
          template: 'ZKProofSpecialist' as const,
          modelName: 'gpt-4o-mini',
          enableMemory: true,
          enableCache: true,
        },
        {
          name: `${researchTopic}-系统架构师`,
          role: '系统架构师',
          template: 'SystemArchitect' as const,
          modelName: 'gpt-4o-mini',
          enableMemory: true,
          enableCache: true,
        },
        {
          name: `${researchTopic}-安全分析师`,
          role: '安全分析师',
          systemPrompt: `你是一个区块链和密码学安全专家，专注于分析零知识证明系统的安全性、识别潜在漏洞和攻击向量。`,
          modelName: 'gpt-4o-mini',
          enableMemory: true,
          enableCache: true,
        },
      ],
      workflowType: 'hierarchical' as const,
    };

    return await this.createAgentTeam(userId, teamData);
  }

  // ==================== 辅助方法 ====================

  private async buildAgentConfigs(agentSpecs: any[]): Promise<AgentConfig[]> {
    return agentSpecs.map(spec => {
      const config: AgentConfig = {
        name: spec.name,
        role: spec.role,
        systemPrompt:
          spec.systemPrompt || (spec.template ? (AgentTemplates as any)[spec.template]?.systemPrompt : '') || '',
        modelName: spec.modelName,
        tools: spec.tools || (spec.template ? (AgentTemplates as any)[spec.template]?.tools : []) || [],
        enableMemory: spec.enableMemory,
        enableCache: spec.enableCache,
      };

      return config;
    });
  }

  private async validateUserPermissions(userId: string, action: string): Promise<void> {
    // 这里可以集成现有的权限系统
    const enhancedDb = getEnhancedDb();
    const prisma = enhancedDb?.getClient();
    if (!prisma) throw new Error('Database not available');

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    // 可以根据用户角色和权限进行更细粒度的控制
    this.logger.debug(`User ${userId} validated for action: ${action}`);
  }

  private async updateExecutionStatus(
    executionId: string,
    status: string,
    data: Record<string, any>
  ): Promise<void> {
    // TODO: 实现真正的执行状态更新
    // 目前只记录日志，因为没有专门的执行历史表
    this.logger.info('Updating execution status:', {
      executionId,
      status,
      data,
    });

    // 可以考虑存储到Redis或其他缓存中
    if (this.redis) {
      await this.redis.hset(
        `execution:${executionId}`,
        'status',
        status,
        'updatedAt',
        new Date().toISOString(),
        ...Object.entries(data).flat()
      );
    }
  }

  private async getTeamMetrics(teamId: string): Promise<any> {
    const enhancedDb = getEnhancedDb();
    const prisma = enhancedDb?.getClient();
    if (!prisma) throw new Error('Database not available');

    const executions = await prisma.agentConfig.findMany({
      where: {
        config: {
          path: ['teamId'],
          equals: teamId
        }
      },
    });

    const totalExecutions = executions.length;
    const completedExecutions = executions.filter((e: any) => e.status === 'completed');
    const successRate = totalExecutions > 0 ? completedExecutions.length / totalExecutions : 0;

    const executionTimes = completedExecutions
      .filter((e: any) => e.startedAt && e.completedAt)
      .map((e: any) => e.completedAt!.getTime() - e.startedAt!.getTime());

    const averageExecutionTime =
      executionTimes.length > 0
        ? executionTimes.reduce((a: number, b: number) => a + b, 0) / executionTimes.length
        : 0;

    const totalTokenUsage = completedExecutions
      .filter((e: any) => e.result)
      .reduce((total: number, e: any) => {
        const result = e.result as WorkflowResult;
        return total + Object.values(result.metrics.tokenUsage).reduce((a: number, b: number) => a + b, 0);
      }, 0);

    return {
      totalExecutions,
      successRate,
      averageExecutionTime,
      totalTokenUsage,
    };
  }

  private async updateTeamMetrics(workflowId: string, result: WorkflowResult): Promise<void> {
    // 更新团队的使用指标
    const enhancedDb = getEnhancedDb();
    const prisma = enhancedDb?.getClient();
    if (!prisma) throw new Error('Database not available');

    const team = await prisma.agentConfig.findFirst({
      where: {
        config: {
          path: ['workflowId'],
          equals: workflowId
        }
      },
    });

    if (team) {
      const metrics = await this.getTeamMetrics(team.id);

      await prisma.agentConfig.update({
        where: { id: team.id },
        data: {
          updatedAt: new Date(),
          // 可以在这里更新其他统计信息
        },
      });
    }
  }

  // ==================== 清理和关闭 ====================

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down MultiAgentOrchestrationService...');

    // 等待所有正在执行的工作流完成
    if (this.executionQueue.size > 0) {
      this.logger.info(`Waiting for ${this.executionQueue.size} workflows to complete...`);
      await Promise.allSettled(Array.from(this.executionQueue.values()));
    }

    // 关闭编排器
    await this.orchestrator.shutdown();

    // 关闭Redis连接
    await this.redis.quit();

    this.logger.info('MultiAgentOrchestrationService shutdown completed');
  }
}

// ==================== 导出 ====================

export {
  CreateAgentTeamSchema,
  ExecuteWorkflowSchema,
  ExecuteNaturalLanguageWorkflowSchema,
  QueryWorkflowsSchema,
};

export default MultiAgentOrchestrationService;

// 导出类型定义
export type {
  AgentTeam,
  WorkflowExecution,
};
