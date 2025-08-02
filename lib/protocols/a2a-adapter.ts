/**
 * A2A (Agent-to-Agent) 协议适配层
 * 实现与现有AG-UI协议的兼容，支持智能体间标准化通信
 */

import { EventEmitter } from 'events';
import { Tool, AgentMetadata } from '../ag-ui/protocol/types';

// A2A协议核心接口定义
export interface AgentCard {
  id: string;
  name: string;
  description: string;
  version: string;
  capabilities: AgentCapability[];
  endpoints: AgentEndpoint[];
  authentication: AuthenticationConfig;
  metadata: Record<string, any>;
}

export interface AgentCapability {
  type: 'tool' | 'service' | 'workflow';
  name: string;
  description: string;
  inputSchema: any;
  outputSchema: any;
  modalities: ('text' | 'audio' | 'video' | 'image')[];
}

export interface AgentEndpoint {
  protocol: 'http' | 'sse' | 'websocket' | 'jsonrpc';
  url: string;
  methods: string[];
  authentication?: string;
}

export interface AuthenticationConfig {
  type: 'did' | 'oauth' | 'apikey' | 'none';
  config: Record<string, any>;
}

export interface A2AMessage {
  id: string;
  from: string;
  to: string;
  type: 'request' | 'response' | 'event' | 'error';
  payload: any;
  timestamp: number;
  correlationId?: string;
}

export interface TaskLifecycle {
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startTime: number;
  endTime?: number;
  result?: any;
  error?: string;
}

/**
 * A2A协议适配器
 * 负责A2A协议与AG-UI协议之间的转换和兼容
 */
export class A2AProtocolAdapter extends EventEmitter {
  private agentCard: AgentCard;
  private discoveredAgents: Map<string, AgentCard> = new Map();
  private activeTasks: Map<string, TaskLifecycle> = new Map();
  private messageHandlers: Map<string, Function> = new Map();

  constructor(agentCard: AgentCard) {
    super();
    this.agentCard = agentCard;
    this.setupMessageHandlers();
  }

  /**
   * 初始化消息处理器
   */
  private setupMessageHandlers(): void {
    this.messageHandlers.set('agent.discover', this.handleAgentDiscovery.bind(this));
    this.messageHandlers.set('agent.capability', this.handleCapabilityQuery.bind(this));
    this.messageHandlers.set('task.create', this.handleTaskCreation.bind(this));
    this.messageHandlers.set('task.status', this.handleTaskStatus.bind(this));
    this.messageHandlers.set('task.cancel', this.handleTaskCancellation.bind(this));
  }

  /**
   * 将AG-UI工具转换为A2A能力
   */
  public convertToolToCapability(tool: Tool): AgentCapability {
    return {
      type: 'tool',
      name: tool.function.name,
      description: tool.function.description || '',
      inputSchema: tool.function.parameters,
      outputSchema: {}, // AG-UI协议中没有输出模式定义
      modalities: ['text'] // 默认支持文本模态
    };
  }

  /**
   * 将AG-UI智能体元数据转换为A2A智能体卡片
   */
  public convertMetadataToAgentCard(metadata: AgentMetadata): AgentCard {
    const capabilities = metadata.tools?.map(tool => this.convertToolToCapability(tool)) || [];

    return {
      id: metadata.id || this.generateAgentId(),
      name: metadata.name || 'Unknown Agent',
      description: metadata.description || '',
      version: metadata.version || '1.0.0',
      capabilities,
      endpoints: this.generateDefaultEndpoints(),
      authentication: { type: 'none', config: {} },
      metadata: {
        agUiCompatible: true,
        originalMetadata: metadata
      }
    };
  }

  /**
   * 智能体发现机制
   */
  public async discoverAgents(query?: string): Promise<AgentCard[]> {
    // 广播发现请求
    const message: A2AMessage = {
      id: this.generateMessageId(),
      from: this.agentCard.id,
      to: 'broadcast',
      type: 'request',
      payload: {
        action: 'agent.discover',
        query
      },
      timestamp: Date.now()
    };

    await this.sendMessage(message);
    return Array.from(this.discoveredAgents.values());
  }

  /**
   * 查询智能体能力
   */
  public async queryCapabilities(agentId: string): Promise<AgentCapability[]> {
    const agent = this.discoveredAgents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    return agent.capabilities;
  }

  /**
   * 创建跨智能体任务
   */
  public async createTask(
    targetAgentId: string,
    capability: string,
    input: any
  ): Promise<string> {
    const taskId = this.generateTaskId();
    const task: TaskLifecycle = {
      taskId,
      status: 'pending',
      progress: 0,
      startTime: Date.now()
    };

    this.activeTasks.set(taskId, task);

    const message: A2AMessage = {
      id: this.generateMessageId(),
      from: this.agentCard.id,
      to: targetAgentId,
      type: 'request',
      payload: {
        action: 'task.create',
        taskId,
        capability,
        input
      },
      timestamp: Date.now()
    };

    await this.sendMessage(message);
    return taskId;
  }

  /**
   * 获取任务状态
   */
  public getTaskStatus(taskId: string): TaskLifecycle | undefined {
    return this.activeTasks.get(taskId);
  }

  /**
   * 取消任务
   */
  public async cancelTask(taskId: string): Promise<void> {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.status = 'cancelled';
    task.endTime = Date.now();

    // 通知目标智能体取消任务
    const message: A2AMessage = {
      id: this.generateMessageId(),
      from: this.agentCard.id,
      to: 'broadcast', // 广播取消消息
      type: 'request',
      payload: {
        action: 'task.cancel',
        taskId
      },
      timestamp: Date.now()
    };

    await this.sendMessage(message);
  }

  /**
   * 处理接收到的A2A消息
   */
  public async handleMessage(message: A2AMessage): Promise<void> {
    const handler = this.messageHandlers.get(message.payload.action);
    if (handler) {
      await handler(message);
    } else {
      console.warn(`Unknown message action: ${message.payload.action}`);
    }
  }

  /**
   * 处理智能体发现请求
   */
  private async handleAgentDiscovery(message: A2AMessage): Promise<void> {
    if (message.type === 'request') {
      // 响应发现请求
      const response: A2AMessage = {
        id: this.generateMessageId(),
        from: this.agentCard.id,
        to: message.from,
        type: 'response',
        payload: {
          action: 'agent.discover',
          agentCard: this.agentCard
        },
        timestamp: Date.now(),
        correlationId: message.id
      };
      await this.sendMessage(response);
    } else if (message.type === 'response') {
      // 记录发现的智能体
      const agentCard = message.payload.agentCard;
      if (agentCard) {
        this.discoveredAgents.set(agentCard.id, agentCard);
        this.emit('agentDiscovered', agentCard);
      }
    }
  }

  /**
   * 处理能力查询
   */
  private async handleCapabilityQuery(message: A2AMessage): Promise<void> {
    if (message.type === 'request') {
      const response: A2AMessage = {
        id: this.generateMessageId(),
        from: this.agentCard.id,
        to: message.from,
        type: 'response',
        payload: {
          action: 'agent.capability',
          capabilities: this.agentCard.capabilities
        },
        timestamp: Date.now(),
        correlationId: message.id
      };
      await this.sendMessage(response);
    }
  }

  /**
   * 处理任务创建
   */
  private async handleTaskCreation(message: A2AMessage): Promise<void> {
    if (message.type === 'request') {
      const { taskId, capability, input } = message.payload;

      try {
        // 执行任务（这里需要与AG-UI协议集成）
        const result = await this.executeCapability(capability, input);

        const response: A2AMessage = {
          id: this.generateMessageId(),
          from: this.agentCard.id,
          to: message.from,
          type: 'response',
          payload: {
            action: 'task.create',
            taskId,
            status: 'completed',
            result
          },
          timestamp: Date.now(),
          correlationId: message.id
        };
        await this.sendMessage(response);
      } catch (error) {
        const errorResponse: A2AMessage = {
          id: this.generateMessageId(),
          from: this.agentCard.id,
          to: message.from,
          type: 'error',
          payload: {
            action: 'task.create',
            taskId,
            error: error instanceof Error ? error.message : 'Unknown error'
          },
          timestamp: Date.now(),
          correlationId: message.id
        };
        await this.sendMessage(errorResponse);
      }
    }
  }

  /**
   * 处理任务状态查询
   */
  private async handleTaskStatus(message: A2AMessage): Promise<void> {
    if (message.type === 'request') {
      const { taskId } = message.payload;
      const task = this.activeTasks.get(taskId);

      const response: A2AMessage = {
        id: this.generateMessageId(),
        from: this.agentCard.id,
        to: message.from,
        type: 'response',
        payload: {
          action: 'task.status',
          taskId,
          task: task || null
        },
        timestamp: Date.now(),
        correlationId: message.id
      };
      await this.sendMessage(response);
    }
  }

  /**
   * 处理任务取消
   */
  private async handleTaskCancellation(message: A2AMessage): Promise<void> {
    const { taskId } = message.payload;
    const task = this.activeTasks.get(taskId);

    if (task && task.status === 'running') {
      task.status = 'cancelled';
      task.endTime = Date.now();
      this.emit('taskCancelled', taskId);
    }
  }

  /**
   * 执行智能体能力（需要与AG-UI协议集成）
   */
  private async executeCapability(capability: string, input: any): Promise<any> {
    // 这里需要与现有的AG-UI工具调用机制集成
    // 暂时返回模拟结果
    return {
      success: true,
      data: `Executed capability ${capability} with input`,
      timestamp: Date.now()
    };
  }

  /**
   * 发送A2A消息
   */
  private async sendMessage(message: A2AMessage): Promise<void> {
    // 这里需要实现实际的消息发送逻辑
    // 可以通过HTTP、WebSocket、SSE等方式发送
    console.log('Sending A2A message:', message);
    this.emit('messageSent', message);
  }

  /**
   * 生成默认端点
   */
  private generateDefaultEndpoints(): AgentEndpoint[] {
    return [
      {
        protocol: 'http',
        url: '/api/a2a',
        methods: ['POST'],
        authentication: 'none'
      },
      {
        protocol: 'sse',
        url: '/api/a2a/events',
        methods: ['GET']
      }
    ];
  }

  /**
   * 生成智能体ID
   */
  private generateAgentId(): string {
    return `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成消息ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成任务ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取智能体卡片
   */
  public getAgentCard(): AgentCard {
    return this.agentCard;
  }

  /**
   * 更新智能体卡片
   */
  public updateAgentCard(updates: Partial<AgentCard>): void {
    this.agentCard = { ...this.agentCard, ...updates };
    this.emit('agentCardUpdated', this.agentCard);
  }

  /**
   * 获取所有发现的智能体
   */
  public getDiscoveredAgents(): AgentCard[] {
    return Array.from(this.discoveredAgents.values());
  }

  /**
   * 获取活跃任务
   */
  public getActiveTasks(): TaskLifecycle[] {
    return Array.from(this.activeTasks.values());
  }
}

/**
 * A2A协议管理器
 * 管理多个A2A适配器实例
 */
export class A2AProtocolManager {
  private adapters: Map<string, A2AProtocolAdapter> = new Map();
  private messageRouter: Map<string, A2AProtocolAdapter> = new Map();

  /**
   * 注册A2A适配器
   */
  public registerAdapter(adapter: A2AProtocolAdapter): void {
    const agentId = adapter.getAgentCard().id;
    this.adapters.set(agentId, adapter);
    this.messageRouter.set(agentId, adapter);

    // 监听适配器事件
    adapter.on('messageSent', (message: A2AMessage) => {
      this.routeMessage(message);
    });
  }

  /**
   * 路由消息到目标适配器
   */
  private async routeMessage(message: A2AMessage): Promise<void> {
    if (message.to === 'broadcast') {
      // 广播消息到所有适配器
      for (const adapter of this.adapters.values()) {
        if (adapter.getAgentCard().id !== message.from) {
          await adapter.handleMessage(message);
        }
      }
    } else {
      // 路由到特定适配器
      const targetAdapter = this.messageRouter.get(message.to);
      if (targetAdapter) {
        await targetAdapter.handleMessage(message);
      }
    }
  }

  /**
   * 获取所有注册的适配器
   */
  public getAdapters(): A2AProtocolAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * 获取特定智能体的适配器
   */
  public getAdapter(agentId: string): A2AProtocolAdapter | undefined {
    return this.adapters.get(agentId);
  }

  /**
   * 移除适配器
   */
  public removeAdapter(agentId: string): void {
    this.adapters.delete(agentId);
    this.messageRouter.delete(agentId);
  }
}

// 导出单例管理器
export const a2aProtocolManager = new A2AProtocolManager();