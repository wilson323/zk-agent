import { type Observable, Subject } from "rxjs"
import type { BaseEvent, RunAgentInput, Tool, Message } from "./types"
import type { AgentDefinition } from "./protocol/types"

/**
 * 标准AG-UI运行时实现
 * 完全符合AG-UI协议规范
 */
export class StandardAgUIRuntime {
  private eventSubject = new Subject<BaseEvent>()
  private state: Record<string, unknown> = {}
  private messages: Message[] = []
  private tools: Tool[] = []
  private agent: AgentDefinition | null = null

  constructor(
    private options: {
      threadId: string
      runId: string
      debug?: boolean
    },
  ) {}

  /**
   * 执行Agent - AG-UI标准接口
   */
  async executeAgent(input: RunAgentInput): Promise<void> {
    const { threadId, runId, state, messages, tools, context, forwardedProps } = input

    // 发送运行开始事件
    this.emitEvent({
      type: "RUN_STARTED",
      threadId,
      runId,
      timestamp: Date.now(),
    })

    try {
      // 更新状态
      this.state = { ...this.state, ...state }
      this.messages = messages
      this.tools = tools

      // 处理消息
      for (const message of messages) {
        if (message.role === "user") {
          await this.processUserMessage(message)
        }
      }

      // 发送运行完成事件
      this.emitEvent({
        type: "RUN_FINISHED",
        threadId,
        runId,
        timestamp: Date.now(),
      })
    } catch (error) {
      // 发送错误事件
      this.emitEvent({
        type: "RUN_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
        code: 500,
        timestamp: Date.now(),
      })
    }
  }

  /**
   * 处理用户消息
   */
  private async processUserMessage(message: Message): Promise<void> {
    const messageId = `msg-${Date.now()}`

    // 发送消息开始事件
    this.emitEvent({
      type: "TEXT_MESSAGE_START",
      messageId,
      role: "assistant",
      timestamp: Date.now(),
    })

    // 调用FastGPT API
    try {
      const response = await this.callFastGPT(message.content)

      // 处理流式响应
      await this.handleStreamResponse(response, messageId)
    } catch (error) {
      console.error("Error calling FastGPT:", error)

      // 发送错误消息
      this.emitEvent({
        type: "TEXT_MESSAGE_CONTENT",
        messageId,
        delta: "Sorry, I encountered an error processing your request.",
        timestamp: Date.now(),
      })
    }

    // 发送消息结束事件
    this.emitEvent({
      type: "TEXT_MESSAGE_END",
      messageId,
      timestamp: Date.now(),
    })
  }

  /**
   * 调用FastGPT API
   */
  private async callFastGPT(content: string): Promise<ReadableStream> {
    const response = await fetch("/api/fastgpt/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        appId: this.state.appId,
        chatId: this.state.chatId,
        messages: [
          ...this.messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          { role: "user", content },
        ],
        stream: true,
        variables: this.state.variables,
      }),
    })

    if (!response.ok) {
      throw new Error(`FastGPT API error: ${response.statusText}`)
    }

    return response.body!
  }

  /**
   * 处理流式响应
   */
  private async handleStreamResponse(stream: ReadableStream, messageId: string): Promise<void> {
    const reader = stream.getReader()
    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) {break}

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.substring(6)

            if (data === "[DONE]") {continue}

            try {
              const parsed = JSON.parse(data)

              if (parsed.choices?.[0]?.delta?.content) {
                // 发送文本内容事件
                this.emitEvent({
                  type: "TEXT_MESSAGE_CONTENT",
                  messageId,
                  delta: parsed.choices[0].delta.content,
                  timestamp: Date.now(),
                })
              }

              // 处理工具调用
              if (parsed.choices?.[0]?.delta?.tool_calls) {
                await this.handleToolCalls(parsed.choices[0].delta.tool_calls, messageId)
              }
            } catch (e) {
              console.error("Error parsing SSE data:", e)
            }
          }
        }
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
      const toolCallId = `tool-${Date.now()}-${Math.random()}`

      // 发送工具调用开始事件
      this.emitEvent({
        type: "TOOL_CALL_START",
        toolCallId,
        toolCallName: toolCall.function?.name || "unknown",
        parentMessageId,
        timestamp: Date.now(),
      })

      // 发送工具调用参数事件
      if (toolCall.function?.arguments) {
        this.emitEvent({
          type: "TOOL_CALL_ARGS",
          toolCallId,
          delta: toolCall.function.arguments,
          timestamp: Date.now(),
        })
      }

      // 执行工具
      try {
        const result = await this.executeTool(toolCall.function?.name, toolCall.function?.arguments)

        // 发送工具调用结果（可以通过自定义事件）
        this.emitEvent({
          type: "CUSTOM",
          name: "tool_call_result",
          value: {
            toolCallId,
            result,
          },
          timestamp: Date.now(),
        })
      } catch (error) {
        console.error("Tool execution error:", error)
      }

      // 发送工具调用结束事件
      this.emitEvent({
        type: "TOOL_CALL_END",
        toolCallId,
        timestamp: Date.now(),
      })
    }
  }

  /**
   * 执行工具
   */
  private async executeTool(toolName: string, args: string): Promise<any> {
    const tool = this.tools.find((t) => t.name === toolName)

    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`)
    }

    // 解析参数
    let parsedArgs: any = {}
    try {
      parsedArgs = JSON.parse(args)
    } catch (e) {
      console.error("Error parsing tool arguments:", e)
    }

    // 这里应该调用实际的工具执行逻辑
    // 暂时返回模拟结果
    return {
      success: true,
      result: `Tool ${toolName} executed with args: ${args}`,
    }
  }

  /**
   * 获取事件流
   */
  getEventStream(): Observable<BaseEvent> {
    return this.eventSubject.asObservable()
  }

  /**
   * 更新状态
   */
  updateState(newState: Record<string, any>): void {
    this.state = { ...this.state, ...newState }

    // 发送状态快照事件
    this.emitEvent({
      type: "STATE_SNAPSHOT",
      snapshot: this.state,
      timestamp: Date.now(),
    })
  }

  /**
   * 获取当前状态
   */
  getState(): Record<string, any> {
    return { ...this.state }
  }

  /**
   * 发送事件
   */
  private emitEvent(event: BaseEvent): void {
    if (this.options.debug) {
      console.debug("AG-UI Event:", event)
    }
    this.eventSubject.next(event)
  }
}
