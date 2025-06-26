// @ts-nocheck
import { type Observable, Subject, BehaviorSubject } from "rxjs"
import type {
  AgUIEvent,
  RunInput,
  RunConfig,
  Message,
  Tool,
  AgentDefinition,
  RunStartedEvent,
  RunFinishedEvent,
  RunErrorEvent,
  TextMessageStartEvent,
  TextMessageContentEvent,
  TextMessageEndEvent,
  ToolCallStartEvent,
  ToolCallArgsEvent,
  ToolCallResultEvent,
  ToolCallEndEvent,
  StateSnapshotEvent,
} from "./types"

/**
 * AG-UI协议标准运行时
 * 严格遵循AG-UI协议规范实现
 */
export class AgUIRuntime {
  private eventSubject = new Subject<AgUIEvent>()
  private stateSubject = new BehaviorSubject<Record<string, any>>({})
  private messagesSubject = new BehaviorSubject<Message[]>([])

  private currentState: Record<string, any> = {}
  private currentMessages: Message[] = []
  private tools: Tool[] = []
  private agent: AgentDefinition | null = null

  constructor(
    private config: {
      threadId: string
      debug?: boolean
      apiEndpoint?: string
    },
  ) {}

  /**
   * 设置智能体定义
   */
  setAgent(agent: AgentDefinition): void {
    this.agent = agent
    this.tools = agent.tools || []
    this.updateState({ agentId: agent.id, ...agent.variables })
  }

  /**
   * 执行运行
   */
  async run(input: RunInput, config?: RunConfig): Promise<void> {
    const { threadId, runId, messages, tools, state } = input

    // 发送运行开始事件
    this.emitEvent({
      type: "run-started",
      threadId,
      runId,
      timestamp: Date.now(),
    } as RunStartedEvent)

    try {
      // 更新状态和消息
      this.updateState(state)
      this.updateMessages(messages)
      this.tools = tools

      // 处理最后一条用户消息
      const lastMessage = messages[messages.length - 1]
      if (lastMessage && lastMessage.role === "user") {
        await this.processUserMessage(lastMessage, config)
      }

      // 发送运行完成事件
      this.emitEvent({
        type: "run-finished",
        threadId,
        runId,
        timestamp: Date.now(),
      } as RunFinishedEvent)
    } catch (error) {
      // 发送错误事件
      this.emitEvent({
        type: "run-error",
        threadId,
        runId,
        error: {
          message: error instanceof Error ? error.message : "Unknown error",
          details: error,
        },
        timestamp: Date.now(),
      } as RunErrorEvent)
    }
  }

  /**
   * 处理用户消息
   */
  private async processUserMessage(message: Message, config?: RunConfig): Promise<void> {
    const messageId = `assistant-${Date.now()}`

    // 发送消息开始事件
    this.emitEvent({
      type: "text-message-start",
      messageId,
      role: "assistant",
      timestamp: Date.now(),
    } as TextMessageStartEvent)

    try {
      // 准备请求数据
      const requestData = {
        appId: this.currentState.appId,
        chatId: this.currentState.chatId,
        messages: this.currentMessages.map((msg) => ({
          role: msg.role,
          content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
        })),
        variables: this.currentState.variables || {},
        stream: true,
        ...config,
      }

      // 调用FastGPT API
      const response = await fetch(this.config.apiEndpoint || "/api/fastgpt/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`)
      }

      // 处理流式响应
      await this.handleStreamResponse(response.body!, messageId)
    } catch (error) {
      console.error("Error processing user message:", error)

      // 发送错误内容
      this.emitEvent({
        type: "text-message-content",
        messageId,
        delta: "抱歉，处理您的请求时遇到了错误。",
        timestamp: Date.now(),
      } as TextMessageContentEvent)
    }

    // 发送消息结束事件
    this.emitEvent({
      type: "text-message-end",
      messageId,
      timestamp: Date.now(),
    } as TextMessageEndEvent)
  }

  /**
   * 处理流式响应
   */
  private async handleStreamResponse(stream: ReadableStream, messageId: string): Promise<void> {
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let buffer = ""
    let fullContent = ""

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) {break}

        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk

        // 处理完整的行
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.substring(6).trim()

            if (data === "[DONE]") {continue}

            try {
              const parsed = JSON.parse(data)

              // 处理文本内容
              if (parsed.choices?.[0]?.delta?.content) {
                const delta = parsed.choices[0].delta.content
                fullContent += delta

                this.emitEvent({
                  type: "text-message-content",
                  messageId,
                  delta,
                  timestamp: Date.now(),
                } as TextMessageContentEvent)
              }

              // 处理工具调用
              if (parsed.choices?.[0]?.delta?.tool_calls) {
                await this.handleToolCalls(parsed.choices[0].delta.tool_calls, messageId)
              }
            } catch (e) {
              if (this.config.debug) {
                console.error("Error parsing SSE data:", e)
              }
            }
          }
        }
      }

      // 添加助手消息到消息列表
      if (fullContent) {
        const assistantMessage: Message = {
          id: messageId,
          role: "assistant",
          content: fullContent,
          timestamp: Date.now(),
        }

        this.updateMessages([...this.currentMessages, assistantMessage])
      }
    } finally {
      reader.releaseLock()
    }
  }

  /**
   * 处理工具调用
   */
  private async handleToolCalls(toolCalls: any[], parentMessageId: string): Promise<void> {
    for (const toolCall of toolCalls) {
      const toolCallId = toolCall.id || `tool-${Date.now()}-${Math.random()}`
      const toolName = toolCall.function?.name || "unknown"

      // 发送工具调用开始事件
      this.emitEvent({
        type: "tool-call-start",
        toolCallId,
        toolName,
        parentMessageId,
        timestamp: Date.now(),
      } as ToolCallStartEvent)

      // 发送工具调用参数事件
      if (toolCall.function?.arguments) {
        this.emitEvent({
          type: "tool-call-args",
          toolCallId,
          argsJson: toolCall.function.arguments,
          timestamp: Date.now(),
        } as ToolCallArgsEvent)
      }

      // 执行工具
      try {
        const result = await this.executeTool(toolName, toolCall.function?.arguments || "{}")

        // 发送工具调用结果事件
        this.emitEvent({
          type: "tool-call-result",
          toolCallId,
          result,
          timestamp: Date.now(),
        } as ToolCallResultEvent)
      } catch (error) {
        console.error("Tool execution error:", error)

        // 发送错误结果
        this.emitEvent({
          type: "tool-call-result",
          toolCallId,
          result: {
            error: error instanceof Error ? error.message : "Tool execution failed",
          },
          timestamp: Date.now(),
        } as ToolCallResultEvent)
      }

      // 发送工具调用结束事件
      this.emitEvent({
        type: "tool-call-end",
        toolCallId,
        timestamp: Date.now(),
      } as ToolCallEndEvent)
    }
  }

  /**
   * 执行工具
   */
  private async executeTool(toolName: string, argsJson: string): Promise<any> {
    const tool = this.tools.find((t) => t.function.name === toolName)

    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`)
    }

    let args: any = {}
    try {
      args = JSON.parse(argsJson)
    } catch (e) {
      console.error("Error parsing tool arguments:", e)
    }

    // 根据工具名称执行相应逻辑
    switch (toolName) {
      case "get_weather":
        return this.getWeather(args)
      case "search_web":
        return this.searchWeb(args)
      case "analyze_cad":
        return this.analyzeCAD(args)
      case "generate_poster":
        return this.generatePoster(args)
      default:
        throw new Error(`Unknown tool: ${toolName}`)
    }
  }

  /**
   * 工具实现示例
   */
  private async getWeather(args: any): Promise<any> {
    // 模拟天气查询
    return {
      location: args.location,
      temperature: "22°C",
      condition: "晴天",
      humidity: "65%",
    }
  }

  private async searchWeb(args: any): Promise<any> {
    // 模拟网络搜索
    return {
      query: args.query,
      results: [
        {
          title: "搜索结果1",
          url: "https://example.com/1",
          snippet: "这是搜索结果的摘要...",
        },
      ],
    }
  }

  private async analyzeCAD(args: any): Promise<any> {
    // CAD分析工具
    return {
      fileId: args.fileId,
      analysis: "CAD文件分析结果...",
      structures: [],
      devices: [],
      risks: [],
    }
  }

  private async generatePoster(args: any): Promise<any> {
    // 海报生成工具
    return {
      description: args.description,
      style: args.style,
      imageUrl: "/generated-poster.jpg",
    }
  }

  /**
   * 更新状态
   */
  private updateState(newState: Record<string, any>): void {
    this.currentState = { ...this.currentState, ...newState }
    this.stateSubject.next(this.currentState)

    // 发送状态快照事件
    this.emitEvent({
      type: "state-snapshot",
      state: this.currentState,
      timestamp: Date.now(),
    } as StateSnapshotEvent)
  }

  /**
   * 更新消息
   */
  private updateMessages(messages: Message[]): void {
    this.currentMessages = messages
    this.messagesSubject.next(this.currentMessages)
  }

  /**
   * 发送事件
   */
  private emitEvent(event: AgUIEvent): void {
    if (this.config.debug) {
      console.debug("AG-UI Event:", event)
    }
    this.eventSubject.next(event)
  }

  /**
   * 获取事件流
   */
  getEventStream(): Observable<AgUIEvent> {
    return this.eventSubject.asObservable()
  }

  /**
   * 获取状态流
   */
  getStateStream(): Observable<Record<string, any>> {
    return this.stateSubject.asObservable()
  }

  /**
   * 获取消息流
   */
  getMessagesStream(): Observable<Message[]> {
    return this.messagesSubject.asObservable()
  }

  /**
   * 获取当前状态
   */
  getState(): Record<string, any> {
    return { ...this.currentState }
  }

  /**
   * 获取当前消息
   */
  getMessages(): Message[] {
    return [...this.currentMessages]
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.eventSubject.complete()
    this.stateSubject.complete()
    this.messagesSubject.complete()
  }
}
