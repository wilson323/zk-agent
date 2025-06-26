// @ts-nocheck
import { EnhancedAgUIRuntime } from "../protocol/enhanced-runtime"
import { AgUIAgentManager } from "../protocol/agent-manager"
import type { AgentDefinition, Message, RunInput } from "../protocol/complete-types"

/**
 * 对话智能体AG-UI适配器
 * 确保对话智能体完全遵循AG-UI协议
 */
export class ConversationAgentAdapter {
  private runtime: EnhancedAgUIRuntime
  private agentManager: AgUIAgentManager
  private currentAgent: AgentDefinition | null = null

  constructor(threadId: string, options: { debug?: boolean } = {}) {
    this.runtime = new EnhancedAgUIRuntime({
      threadId,
      debug: options.debug,
      apiEndpoint: "/api/fastgpt/chat",
      enableMiddleware: true,
      enableBuiltinTools: true,
    })

    this.agentManager = new AgUIAgentManager()
  }

  /**
   * 初始化对话智能体
   */
  async initialize(appId: string, apiKey: string, chatId?: string): Promise<AgentDefinition> {
    try {
      // 从FastGPT创建智能体定义
      const agent = await this.agentManager.createAgentFromFastGPT(appId, apiKey, chatId)

      // 确保智能体符合AG-UI协议
      agent.metadata = {
        ...agent.metadata,
        protocolVersion: "1.0.0",
        capabilities: ["text-chat", "file-upload", "context-memory"],
        category: "conversation",
        type: "conversation-agent",
      }

      // 添加对话专用工具
      agent.tools.push(
        {
          type: "function",
          function: {
            name: "get_conversation_history",
            description: "获取对话历史",
            parameters: {
              type: "object",
              properties: {
                limit: { type: "number", description: "返回消息数量", default: 10 },
                before: { type: "string", description: "在此消息之前的历史" },
              },
              required: [],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "summarize_conversation",
            description: "总结对话内容",
            parameters: {
              type: "object",
              properties: {
                messageCount: { type: "number", description: "要总结的消息数量", default: 20 },
              },
              required: [],
            },
          },
        },
      )

      // 设置智能体到运行时
      this.runtime.setAgent(agent)
      this.currentAgent = agent

      return agent
    } catch (error) {
      console.error("Error initializing conversation agent:", error)
      throw error
    }
  }

  /**
   * 发送消息
   */
  async sendMessage(content: string, attachments?: File[]): Promise<void> {
    if (!this.currentAgent) {
      throw new Error("Conversation agent not initialized")
    }

    // 创建用户消息
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: Date.now(),
      threadId: this.runtime.getState().threadId,
      attachments: attachments?.map((file) => ({
        id: `file-${Date.now()}-${Math.random()}`,
        name: file.name,
        type: file.type,
        url: URL.createObjectURL(file),
        size: file.size,
      })),
    }

    // 准备运行输入
    const runInput: RunInput = {
      threadId: this.runtime.getState().threadId || `thread-${Date.now()}`,
      runId: `run-${Date.now()}`,
      messages: [...this.runtime.getMessages(), userMessage],
      tools: this.currentAgent.tools,
      state: this.runtime.getState(),
    }

    // 执行运行
    await this.runtime.run(runInput)
  }

  /**
   * 获取事件流
   */
  getEventStream() {
    return this.runtime.getEventStream()
  }

  /**
   * 获取消息流
   */
  getMessagesStream() {
    return this.runtime.getMessagesStream()
  }

  /**
   * 获取状态流
   */
  getStateStream() {
    return this.runtime.getStateStream()
  }

  /**
   * 获取当前状态
   */
  getState() {
    return this.runtime.getState()
  }

  /**
   * 获取当前消息
   */
  getMessages() {
    return this.runtime.getMessages()
  }

  /**
   * 获取当前智能体
   */
  getCurrentAgent() {
    return this.currentAgent
  }

  /**
   * 清理资源
   */
  dispose() {
    this.runtime.dispose()
  }
}
