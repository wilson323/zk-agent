/**
 * ZK-Agent Swarms Framework Integration
 * 基于Swarms开源框架的多智能体系统集成实现
 *
 * 功能特性:
 * - 企业级多智能体编排
 * - 与现有ZK-Agent服务无缝集成
 * - 支持多种工作流模式
 * - 智能体生命周期管理
 * - 性能监控和缓存优化
 */

import { EventEmitter } from 'events';
import { Redis } from 'ioredis';
import { UnifiedAIAdapter } from './unified-ai-adapter';
import { getEnhancedDb } from '../database/enhanced-database-manager';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();

// ==================== 类型定义 ====================

export interface AgentConfig {
  name: string;
  role: string;
  systemPrompt: string;
  modelName: string;
  maxLoops?: number;
  temperature?: number;
  tools?: string[];
  enableMemory?: boolean;
  enableCache?: boolean;
  metadata?: Record<string, any>;
}

export interface WorkflowConfig {
  name: string;
  type: 'sequential' | 'hierarchical' | 'parallel' | 'graph';
  agents: AgentConfig[];
  maxConcurrency?: number;
  timeout?: number;
  retryAttempts?: number;
}

export interface AgentMessage {
  id: string;
  fromAgent: string;
  toAgent?: string;
  content: string;
  type: 'task' | 'response' | 'broadcast' | 'error';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface WorkflowResult {
  workflowId: string;
  status: 'completed' | 'failed' | 'timeout';
  results: Record<string, any>;
  metrics: {
    totalTime: number;
    agentExecutionTimes: Record<string, number>;
    tokenUsage: Record<string, number>;
    errorCount: number;
  };
  messages: AgentMessage[];
}

// ==================== 核心智能体类 ====================

export class ZKAgent extends EventEmitter {
  private config: AgentConfig;
  private aiAdapter: UnifiedAIAdapter;
  private redis?: Redis;
  private conversationHistory: AgentMessage[] = [];
  private isActive: boolean = false;
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    averageResponseTime: 0,
    totalTokenUsage: 0,
  };

  constructor(config: AgentConfig, aiAdapter: UnifiedAIAdapter, redis?: Redis) {
    super();
    this.config = config;
    this.aiAdapter = aiAdapter;
    this.redis = redis;

    logger.info(`ZKAgent created: ${config.name} with role: ${config.role}`);
  }

  async initialize(): Promise<void> {
    try {
      // 验证AI模型连接
      await this.aiAdapter.validateConnection(this.config.modelName);

      // 初始化工具
      if (this.config.tools && this.config.tools.length > 0) {
        await this.initializeTools();
      }

      this.isActive = true;
      this.emit('initialized', { agentName: this.config.name });

      logger.info(`ZKAgent initialized successfully: ${this.config.name}`);
    } catch (error) {
      logger.error(`Failed to initialize ZKAgent ${this.config.name}:`, error);
      throw error;
    }
  }

  async run(input: string, context?: Record<string, any>): Promise<string> {
    if (!this.isActive) {
      throw new Error(`Agent ${this.config.name} is not active`);
    }

    const startTime = Date.now();
    const messageId = this.generateMessageId();

    try {
      this.metrics.totalRequests++;

      // 检查缓存
      if (this.config.enableCache && this.redis) {
        const cachedResponse = await this.getCachedResponse(input);
        if (cachedResponse) {
          logger.debug(`Cache hit for agent ${this.config.name}`);
          return cachedResponse;
        }
      }

      // 构建完整的提示词
      const fullPrompt = this.buildPrompt(input, context);

      // 调用AI模型
      const response = await this.aiAdapter.chat({
        model: this.config.modelName,
        messages: [
          { role: 'system', content: this.config.systemPrompt },
          { role: 'user', content: fullPrompt },
        ],
        temperature: this.config.temperature || 0.7,
        maxTokens: 4000,
      });

      const result = response.data?.content || '';
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // 更新指标
      this.updateMetrics(responseTime, response.data?.usage?.totalTokens || 0);

      // 记录对话历史
      this.addToHistory({
        id: messageId,
        fromAgent: this.config.name,
        content: input,
        type: 'task',
        timestamp: new Date(startTime),
      });

      this.addToHistory({
        id: this.generateMessageId(),
        fromAgent: this.config.name,
        content: result,
        type: 'response',
        timestamp: new Date(endTime),
      });

      // 缓存结果
      if (this.config.enableCache && this.redis) {
        await this.setCachedResponse(input, result);
      }

      this.emit('taskCompleted', {
        agentName: this.config.name,
        input,
        output: result,
        responseTime,
        tokenUsage: response.data?.usage?.totalTokens || 0,
      });

      this.metrics.successfulRequests++;
      return result;
    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Agent ${this.config.name} execution failed:`, error);

      this.addToHistory({
        id: this.generateMessageId(),
        fromAgent: this.config.name,
        content: `Error: ${errorMessage}`,
        type: 'error',
        timestamp: new Date(endTime),
      });

      this.emit('taskFailed', {
        agentName: this.config.name,
        input,
        error: errorMessage,
        responseTime,
      });

      throw error;
    }
  }

  private buildPrompt(input: string, context?: Record<string, any>): string {
    let prompt = input;

    if (context) {
      prompt += `\n\n上下文信息:\n${JSON.stringify(context, null, 2)}`;
    }

    if (this.config.enableMemory && this.conversationHistory.length > 0) {
      const recentHistory = this.conversationHistory
        .slice(-5) // 最近5条记录
        .map(msg => `${msg.type}: ${msg.content}`)
        .join('\n');

      prompt += `\n\n最近对话历史:\n${recentHistory}`;
    }

    return prompt;
  }

  private async initializeTools(): Promise<void> {
    // 工具初始化逻辑
    logger.info(`Initializing tools for agent ${this.config.name}:`, this.config.tools);
  }

  private async getCachedResponse(input: string): Promise<string | null> {
    if (!this.redis) return null;

    const key = `agent:${this.config.name}:${this.hashInput(input)}`;
    return await this.redis.get(key);
  }

  private async setCachedResponse(input: string, response: string): Promise<void> {
    if (!this.redis) return;

    const key = `agent:${this.config.name}:${this.hashInput(input)}`;
    await this.redis.setex(key, 3600, response); // 1小时缓存
  }

  private hashInput(input: string): string {
    // 简单的哈希函数
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addToHistory(message: AgentMessage): void {
    this.conversationHistory.push(message);

    // 限制历史记录长度
    if (this.conversationHistory.length > 100) {
      this.conversationHistory = this.conversationHistory.slice(-50);
    }
  }

  private updateMetrics(responseTime: number, tokenUsage: number): void {
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime) /
      this.metrics.totalRequests;

    this.metrics.totalTokenUsage += tokenUsage;
  }

  getMetrics() {
    return {
      ...this.metrics,
      successRate:
        this.metrics.totalRequests > 0
          ? this.metrics.successfulRequests / this.metrics.totalRequests
          : 0,
    };
  }

  getHistory(): AgentMessage[] {
    return [...this.conversationHistory];
  }

  async shutdown(): Promise<void> {
    this.isActive = false;
    this.emit('shutdown', { agentName: this.config.name });
    logger.info(`ZKAgent shutdown: ${this.config.name}`);
  }
}

// ==================== 工作流编排器 ====================

export class ZKWorkflowOrchestrator extends EventEmitter {
  private agents: Map<string, ZKAgent> = new Map();
  private workflows: Map<string, WorkflowConfig> = new Map();
  private activeWorkflows: Map<string, Promise<WorkflowResult>> = new Map();
  private aiAdapter: UnifiedAIAdapter;
  private redis?: Redis;

  constructor(aiAdapter: UnifiedAIAdapter, redis?: Redis) {
    super();
    this.aiAdapter = aiAdapter;
    this.redis = redis;
  }

  async createAgent(config: AgentConfig): Promise<ZKAgent> {
    const agent = new ZKAgent(config, this.aiAdapter, this.redis);
    await agent.initialize();

    this.agents.set(config.name, agent);

    // 监听智能体事件
    agent.on('taskCompleted', data => {
      this.emit('agentTaskCompleted', data);
    });

    agent.on('taskFailed', data => {
      this.emit('agentTaskFailed', data);
    });

    logger.info(`Agent created and registered: ${config.name}`);
    return agent;
  }

  async createWorkflow(config: WorkflowConfig): Promise<string> {
    const workflowId = this.generateWorkflowId();

    // 创建工作流中的所有智能体
    for (const agentConfig of config.agents) {
      if (!this.agents.has(agentConfig.name)) {
        await this.createAgent(agentConfig);
      }
    }

    this.workflows.set(workflowId, config);

    // 保存到数据库
    const enhancedDb = getEnhancedDb();
    await enhancedDb?.workflow.create({
      data: {
        id: workflowId,
        name: config.name,
        type: config.type,
        config: config as any,
        status: 'created',
        createdAt: new Date(),
      },
    });

    logger.info(`Workflow created: ${config.name} (${workflowId})`);
    return workflowId;
  }

  async executeWorkflow(
    workflowId: string,
    input: string,
    context?: Record<string, any>
  ): Promise<WorkflowResult> {
    const config = this.workflows.get(workflowId);
    if (!config) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    // 检查是否已在执行
    if (this.activeWorkflows.has(workflowId)) {
      throw new Error(`Workflow ${workflowId} is already running`);
    }

    const workflowPromise = this.executeWorkflowInternal(workflowId, config, input, context);
    this.activeWorkflows.set(workflowId, workflowPromise);

    try {
      const result = await workflowPromise;
      return result;
    } finally {
      this.activeWorkflows.delete(workflowId);
    }
  }

  private async executeWorkflowInternal(
    workflowId: string,
    config: WorkflowConfig,
    input: string,
    context?: Record<string, any>
  ): Promise<WorkflowResult> {
    const startTime = Date.now();
    const messages: AgentMessage[] = [];
    const results: Record<string, any> = {};
    const agentExecutionTimes: Record<string, number> = {};
    const tokenUsage: Record<string, number> = {};
    let errorCount = 0;

    this.emit('workflowStarted', { workflowId, config: config.name });

    try {
      switch (config.type) {
        case 'sequential':
          await this.executeSequentialWorkflow(
            config,
            input,
            context,
            results,
            agentExecutionTimes,
            tokenUsage,
            messages
          );
          break;
        case 'parallel':
          await this.executeParallelWorkflow(
            config,
            input,
            context,
            results,
            agentExecutionTimes,
            tokenUsage,
            messages
          );
          break;
        case 'hierarchical':
          await this.executeHierarchicalWorkflow(
            config,
            input,
            context,
            results,
            agentExecutionTimes,
            tokenUsage,
            messages
          );
          break;
        default:
          throw new Error(`Unsupported workflow type: ${config.type}`);
      }

      const endTime = Date.now();
      const result: WorkflowResult = {
        workflowId,
        status: 'completed',
        results,
        metrics: {
          totalTime: endTime - startTime,
          agentExecutionTimes,
          tokenUsage,
          errorCount,
        },
        messages,
      };

      // 更新数据库状态
      const enhancedDb = getEnhancedDb();
      await enhancedDb?.workflow.update({
        where: { id: workflowId },
        data: {
          status: 'completed',
          result: result as any,
          completedAt: new Date(),
        },
      });

      this.emit('workflowCompleted', result);
      return result;
    } catch (error) {
      errorCount++;
      const endTime = Date.now();

      const result: WorkflowResult = {
        workflowId,
        status: 'failed',
        results,
        metrics: {
          totalTime: endTime - startTime,
          agentExecutionTimes,
          tokenUsage,
          errorCount,
        },
        messages,
      };

      const enhancedDbForError = getEnhancedDb();
      await enhancedDbForError?.workflow.update({
        where: { id: workflowId },
        data: {
          status: 'failed',
          result: result as any,
          error: error instanceof Error ? error.message : String(error),
          completedAt: new Date(),
        },
      });

      this.emit('workflowFailed', { workflowId, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  private async executeSequentialWorkflow(
    config: WorkflowConfig,
    input: string,
    context: Record<string, any> = {},
    results: Record<string, any>,
    agentExecutionTimes: Record<string, number>,
    tokenUsage: Record<string, number>,
    messages: AgentMessage[]
  ): Promise<void> {
    let currentInput = input;

    for (const agentConfig of config.agents) {
      const agent = this.agents.get(agentConfig.name);
      if (!agent) {
        throw new Error(`Agent not found: ${agentConfig.name}`);
      }

      const agentStartTime = Date.now();

      try {
        const result = await agent.run(currentInput, context);
        const agentEndTime = Date.now();

        results[agentConfig.name] = result;
        agentExecutionTimes[agentConfig.name] = agentEndTime - agentStartTime;

        const agentMetrics = agent.getMetrics();
        tokenUsage[agentConfig.name] = agentMetrics.totalTokenUsage;

        // 下一个智能体的输入是当前智能体的输出
        currentInput = result;

        logger.info(`Sequential workflow step completed: ${agentConfig.name}`);
      } catch (error) {
        logger.error(`Sequential workflow step failed: ${agentConfig.name}`, error);
        throw error;
      }
    }
  }

  private async executeParallelWorkflow(
    config: WorkflowConfig,
    input: string,
    context: Record<string, any> = {},
    results: Record<string, any>,
    agentExecutionTimes: Record<string, number>,
    tokenUsage: Record<string, number>,
    messages: AgentMessage[]
  ): Promise<void> {
    const maxConcurrency = config.maxConcurrency || config.agents.length;
    const agentPromises: Promise<void>[] = [];

    // 创建并发执行的Promise
    for (let i = 0; i < config.agents.length; i += maxConcurrency) {
      const batch = config.agents.slice(i, i + maxConcurrency);

      const batchPromises = batch.map(async agentConfig => {
        const agent = this.agents.get(agentConfig.name);
        if (!agent) {
          throw new Error(`Agent not found: ${agentConfig.name}`);
        }

        const agentStartTime = Date.now();

        try {
          const result = await agent.run(input, context);
          const agentEndTime = Date.now();

          results[agentConfig.name] = result;
          agentExecutionTimes[agentConfig.name] = agentEndTime - agentStartTime;

          const agentMetrics = agent.getMetrics();
          tokenUsage[agentConfig.name] = agentMetrics.totalTokenUsage;

          logger.info(`Parallel workflow step completed: ${agentConfig.name}`);
        } catch (error) {
          logger.error(`Parallel workflow step failed: ${agentConfig.name}`, error);
          throw error;
        }
      });

      agentPromises.push(...batchPromises);

      // 等待当前批次完成再处理下一批次
      await Promise.all(batchPromises);
    }
  }

  private async executeHierarchicalWorkflow(
    config: WorkflowConfig,
    input: string,
    context: Record<string, any> = {},
    results: Record<string, any>,
    agentExecutionTimes: Record<string, number>,
    tokenUsage: Record<string, number>,
    messages: AgentMessage[]
  ): Promise<void> {
    // 层次化工作流：第一个智能体作为协调者，其他智能体作为执行者
    const [coordinatorConfig, ...executorConfigs] = config.agents;

    const coordinator = this.agents.get(coordinatorConfig.name);
    if (!coordinator) {
      throw new Error(`Coordinator agent not found: ${coordinatorConfig.name}`);
    }

    // 协调者分析任务并分配给执行者
    const coordinatorStartTime = Date.now();
    const taskAnalysis = await coordinator.run(
      `分析以下任务并为每个子智能体分配具体任务：\n任务：${input}\n可用智能体：${executorConfigs.map(c => `${c.name}(${c.role})`).join(', ')}`,
      context
    );
    const coordinatorEndTime = Date.now();

    results[coordinatorConfig.name] = taskAnalysis;
    agentExecutionTimes[coordinatorConfig.name] = coordinatorEndTime - coordinatorStartTime;

    // 执行者并行执行任务
    const executorPromises = executorConfigs.map(async agentConfig => {
      const agent = this.agents.get(agentConfig.name);
      if (!agent) {
        throw new Error(`Executor agent not found: ${agentConfig.name}`);
      }

      const agentStartTime = Date.now();

      const result = await agent.run(
        `根据协调者的分析执行你的任务：\n协调者分析：${taskAnalysis}\n原始任务：${input}`,
        context
      );
      const agentEndTime = Date.now();

      results[agentConfig.name] = result;
      agentExecutionTimes[agentConfig.name] = agentEndTime - agentStartTime;

      const agentMetrics = agent.getMetrics();
      tokenUsage[agentConfig.name] = agentMetrics.totalTokenUsage;
    });

    await Promise.all(executorPromises);

    // 协调者汇总结果
    const summaryStartTime = Date.now();
    const executorResults = executorConfigs
      .map(config => `${config.name}: ${results[config.name]}`)
      .join('\n\n');

    const finalSummary = await coordinator.run(
      `汇总以下执行结果并提供最终答案：\n${executorResults}`,
      context
    );
    const summaryEndTime = Date.now();

    results['final_summary'] = finalSummary;
    agentExecutionTimes[coordinatorConfig.name] += summaryEndTime - summaryStartTime;
  }

  private generateWorkflowId(): string {
    return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getWorkflowStatus(workflowId: string): Promise<any> {
    const enhancedDb = getEnhancedDb();
    return await enhancedDb?.workflow.findUnique({
      where: { id: workflowId },
    });
  }

  async listWorkflows(): Promise<any[]> {
    const enhancedDb = getEnhancedDb();
    return await enhancedDb?.workflow.findMany({
      orderBy: { createdAt: 'desc' },
    }) || [];
  }

  getAgent(name: string): ZKAgent | undefined {
    return this.agents.get(name);
  }

  listAgents(): ZKAgent[] {
    return Array.from(this.agents.values());
  }

  async shutdown(): Promise<void> {
    // 关闭所有智能体
    for (const agent of this.agents.values()) {
      await agent.shutdown();
    }

    this.agents.clear();
    this.workflows.clear();
    this.activeWorkflows.clear();

    logger.info('ZKWorkflowOrchestrator shutdown completed');
  }
}

// ==================== 预定义智能体模板 ====================

export const AgentTemplates = {
  // MetaGPT风格的角色模板
  ProductManager: {
    role: 'Product Manager',
    systemPrompt: `你是一个资深产品经理，具备以下核心能力：

1. **需求分析**: 深入理解用户需求，识别核心问题和痛点
2. **用户故事编写**: 将需求转化为清晰的用户故事和验收标准
3. **竞品分析**: 分析市场竞争态势，识别差异化机会
4. **产品规划**: 制定产品路线图和优先级排序
5. **跨团队协作**: 与技术、设计、运营团队有效沟通

请始终以用户价值为中心，提供专业、可执行的产品建议。`,
    tools: ['market_research', 'user_story_generator', 'competitor_analysis'],
  },

  SystemArchitect: {
    role: 'System Architect',
    systemPrompt: `你是一个系统架构师，专注于以下领域：

1. **架构设计**: 设计可扩展、高可用的系统架构
2. **技术选型**: 基于需求选择合适的技术栈和工具
3. **API设计**: 设计RESTful API和GraphQL接口
4. **数据建模**: 设计数据库结构和数据流
5. **性能优化**: 识别性能瓶颈并提供优化方案
6. **安全设计**: 确保系统安全性和数据保护

请提供技术可行、架构清晰的设计方案。`,
    tools: ['architecture_designer', 'api_generator', 'database_designer'],
  },

  FullStackEngineer: {
    role: 'Full Stack Engineer',
    systemPrompt: `你是一个全栈工程师，擅长：

1. **前端开发**: React/Vue.js/Angular等现代前端框架
2. **后端开发**: Node.js/Python/Java等后端技术
3. **数据库操作**: SQL/NoSQL数据库设计和优化
4. **API开发**: RESTful API和GraphQL接口实现
5. **测试编写**: 单元测试、集成测试、E2E测试
6. **DevOps**: CI/CD流水线和部署自动化

请编写高质量、可维护、有良好测试覆盖的代码。`,
    tools: ['code_generator', 'test_writer', 'code_reviewer'],
  },

  ZKProofSpecialist: {
    role: 'Zero-Knowledge Proof Specialist',
    systemPrompt: `你是零知识证明领域的专家，专注于：

1. **ZK电路设计**: 设计高效的零知识证明电路
2. **隐私保护**: 分析隐私需求并设计保护方案
3. **证明系统**: 熟悉zk-SNARKs、zk-STARKs等证明系统
4. **性能优化**: 优化证明生成和验证性能
5. **安全分析**: 评估ZK方案的安全性
6. **应用场景**: 识别ZK技术的适用场景

请提供安全、高效、实用的零知识证明解决方案。`,
    tools: ['zk_circuit_designer', 'proof_generator', 'privacy_analyzer'],
  },

  QAEngineer: {
    role: 'QA Engineer',
    systemPrompt: `你是一个质量保证工程师，负责：

1. **测试策略**: 制定全面的测试计划和策略
2. **测试用例设计**: 设计覆盖各种场景的测试用例
3. **自动化测试**: 实现UI自动化和API自动化测试
4. **性能测试**: 进行负载测试和压力测试
5. **安全测试**: 识别安全漏洞和风险
6. **质量分析**: 分析缺陷趋势和质量指标

请确保产品质量达到生产级标准。`,
    tools: ['test_case_generator', 'automation_tester', 'performance_analyzer'],
  },
};

// ==================== 工厂函数 ====================

export class ZKAgentFactory {
  private orchestrator: ZKWorkflowOrchestrator;

  constructor(orchestrator: ZKWorkflowOrchestrator) {
    this.orchestrator = orchestrator;
  }

  async createAgentFromTemplate(
    name: string,
    template: keyof typeof AgentTemplates,
    modelName: string = 'gpt-4o-mini',
    customConfig?: Partial<AgentConfig>
  ): Promise<ZKAgent> {
    const templateConfig = AgentTemplates[template];

    const config: AgentConfig = {
      name,
      role: templateConfig.role,
      systemPrompt: templateConfig.systemPrompt,
      modelName,
      tools: templateConfig.tools,
      enableMemory: true,
      enableCache: true,
      ...customConfig,
    };

    return await this.orchestrator.createAgent(config);
  }

  async createSoftwareDevelopmentTeam(projectName: string): Promise<string> {
    const workflowConfig: WorkflowConfig = {
      name: `${projectName}-development-team`,
      type: 'sequential',
      agents: [
        {
          name: `${projectName}-pm`,
          role: AgentTemplates.ProductManager.role,
          systemPrompt: AgentTemplates.ProductManager.systemPrompt,
          modelName: 'gpt-4o-mini',
          tools: AgentTemplates.ProductManager.tools,
          enableMemory: true,
        },
        {
          name: `${projectName}-architect`,
          role: AgentTemplates.SystemArchitect.role,
          systemPrompt: AgentTemplates.SystemArchitect.systemPrompt,
          modelName: 'gpt-4o-mini',
          tools: AgentTemplates.SystemArchitect.tools,
          enableMemory: true,
        },
        {
          name: `${projectName}-engineer`,
          role: AgentTemplates.FullStackEngineer.role,
          systemPrompt: AgentTemplates.FullStackEngineer.systemPrompt,
          modelName: 'gpt-4o-mini',
          tools: AgentTemplates.FullStackEngineer.tools,
          enableMemory: true,
        },
        {
          name: `${projectName}-qa`,
          role: AgentTemplates.QAEngineer.role,
          systemPrompt: AgentTemplates.QAEngineer.systemPrompt,
          modelName: 'gpt-4o-mini',
          tools: AgentTemplates.QAEngineer.tools,
          enableMemory: true,
        },
      ],
    };

    return await this.orchestrator.createWorkflow(workflowConfig);
  }
}

// ==================== 导出 ====================

export default {
  ZKAgent,
  ZKWorkflowOrchestrator,
  ZKAgentFactory,
  AgentTemplates,
};
