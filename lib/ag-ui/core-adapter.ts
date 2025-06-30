// @ts-nocheck
import { Observable, Subject } from "rxjs"
import type {
  BaseEvent,
  TextMessageStartEvent,
  TextMessageContentEvent,
  TextMessageEndEvent,
  RunStartedEvent,
  RunFinishedEvent,
  StateSnapshotEvent,
  ToolCallStartEvent,
  ToolCallArgsEvent,
  ToolCallEndEvent,
  CustomEvent,
} from "./types"

/**
 * AG-UI核心适配器 - 将FastGPT的所有功能转换为AG-UI事件流
 */
export class AgUICoreAdapter {
  private eventSubject = new Subject<BaseEvent>()
  private messageIdCounter = 0
  private toolCallIdCounter = 0
  private state: Record<string, any> = {}

  constructor(
    private options: {
      debug?: boolean
      threadId?: string
      proxyUrl?: string
    } = {},
  ) {
    this.options.threadId = this.options.threadId || `thread-${Date.now()}`
    this.options.debug = this.options.debug || false
    this.options.proxyUrl = this.options.proxyUrl || "/api/proxy"
  }

  /**
   * 获取事件流Observable
   */
  public getEventStream(): Observable<BaseEvent> {
    return this.eventSubject.asObservable()
  }

  /**
   * 初始化会话
   * 处理FastGPT初始化会话接口，包括全局变量处理
   */
  public async initializeSession(appId: string, chatId?: string): Promise<any> {
    try {
      const response = await fetch(`${this.options.proxyUrl}/fastgpt/init-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ appId, chatId }),
      })

      if (!response.ok) {
        throw new Error(`Failed to initialize session: ${response.statusText}`)
      }

      const data = await response.json()

      // 更新状态，包括全局变量
      this.updateState({
        appId,
        chatId: chatId || data.chatId,
        welcomeMessage: data.welcomeMessage,
        systemPrompt: data.systemPrompt,
        variables: data.variables || {},
        suggestedQuestions: data.suggestedQuestions || [],
      })

      // 发送状态快照事件
      this.emitEvent({
        type: "STATE_SNAPSHOT",
        snapshot: this.state,
        timestamp: Date.now(),
      } as StateSnapshotEvent)

      // 如果有欢迎消息，发送文本消息事件
      if (data.welcomeMessage) {
        const messageId = `msg-${++this.messageIdCounter}`

        this.emitEvent({
          type: "TEXT_MESSAGE_START",
          messageId,
          role: "assistant",
          timestamp: Date.now(),
        } as TextMessageStartEvent)

        this.emitEvent({
          type: "TEXT_MESSAGE_CONTENT",
          messageId,
          delta: data.welcomeMessage,
          timestamp: Date.now(),
        } as TextMessageContentEvent)

        this.emitEvent({
          type: "TEXT_MESSAGE_END",
          messageId,
          timestamp: Date.now(),
        } as TextMessageEndEvent)
      }

      return data
    } catch (error) {
      console.error("Error initializing session:", error)
      throw error
    }
  }

  /**
   * 处理来自FastGPT的流式响应
   * 将其转换为AG-UI事件流
   */
  public async handleChatCompletion(
    appId: string,
    chatId: string,
    messages: Array<{ role: string; content: string }>,
    systemPrompt?: string,
    variables?: Record<string, any>,
  ): Promise<Observable<any>> {
    // 生成唯一消息ID和运行ID
    const messageId = `msg-${++this.messageIdCounter}`
    const runId = `run-${Date.now()}`

    // 更新状态
    if (variables) {
      this.updateState({ variables })
    }

    // 发送运行开始事件
    this.emitEvent({
      type: "RUN_STARTED",
      threadId: this.options.threadId,
      runId,
      timestamp: Date.now(),
    } as RunStartedEvent)

    try {
      // 调用FastGPT API
      const response = await fetch(`${this.options.proxyUrl}/fastgpt/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appId,
          chatId,
          messages,
          stream: true,
          detail: true,
          system: systemPrompt,
          variables,
        }),
      })

      if (!response.ok) {
        throw new Error(`FastGPT API error: ${response.statusText}`)
      }

      // 发送消息开始事件
      this.emitEvent({
        type: "TEXT_MESSAGE_START",
        messageId,
        role: "assistant",
        timestamp: Date.now(),
      } as TextMessageStartEvent)

      // 创建一个新的Observable来处理流式响应
      return new Observable<any>((observer) => {
        // 处理流式响应
        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ""
        let fullContent = ""

        const processChunk = async () => {
          try {
            const { done, value } = await reader.read()

            if (done) {
              // 处理缓冲区中剩余的数据
              if (buffer) {
                const chunk = buffer
                buffer = ""
                observer.next({ text: chunk, isEnd: true })
              }

              // 发送消息结束事件
              this.emitEvent({
                type: "TEXT_MESSAGE_END",
                messageId,
                timestamp: Date.now(),
              } as TextMessageEndEvent)

              // 发送运行结束事件
              this.emitEvent({
                type: "RUN_FINISHED",
                threadId: this.options.threadId,
                runId,
                timestamp: Date.now(),
              } as RunFinishedEvent)

              // 尝试获取建议问题
              this.fetchSuggestedQuestions(appId, chatId).catch(console.error)

              observer.complete()
              return
            }

            // 解码二进制数据
            const chunk = decoder.decode(value, { stream: true })
            buffer += chunk

            // 处理完整的JSON对象
            let boundary = buffer.indexOf("\n")
            while (boundary !== -1) {
              const part = buffer.substring(0, boundary)
              buffer = buffer.substring(boundary + 1)

              if (part.trim()) {
                try {
                  // 处理SSE格式数据
                  if (part.startsWith("data: ")) {
                    const jsonStr = part.substring(6)

                    if (jsonStr === "[DONE]") {
                      continue
                    }

                    const data = JSON.parse(jsonStr)

                    if (data.usage) {
                      accumulatedUsage = {
                        promptTokens: (accumulatedUsage.promptTokens || 0) + (data.usage.prompt_tokens || 0),
                        completionTokens: (accumulatedUsage.completionTokens || 0) + (data.usage.completion_tokens || 0),
                        totalTokens: (accumulatedUsage.totalTokens || 0) + (data.usage.total_tokens || 0),
                        cost: (accumulatedUsage.cost || 0) + (data.usage.cost || 0),
                      };
                    }

                    const data = JSON.parse(jsonStr)

                    // 处理工具调用
                    if (data.choices && data.choices[0].delta && data.choices[0].delta.tool_calls) {
                      this.handleToolCall(data.choices[0].delta.tool_calls[0], runId)
                    }

                    // 处理文本内容
                    if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
                      const content = data.choices[0].delta.content
                      fullContent += content

                      // 发送消息内容事件
                      this.emitEvent({
                        type: "TEXT_MESSAGE_CONTENT",
                        messageId,
                        delta: content,
                        timestamp: Date.now(),
                      } as TextMessageContentEvent)

                      // 将原始数据传递给观察者
                      observer.next({ text: content })
                    }
                  } else {
                    const data = JSON.parse(part)
                    observer.next(data)
                  }
                } catch (e) {
                  if (this.options.debug) {
                    console.error("Failed to parse JSON:", part, e)
                  }
                }
              }

              boundary = buffer.indexOf("\n")
            }

            // 继续处理下一个块
            processChunk()
          } catch (error) {
            if (this.options.debug) {
              console.error("Error processing stream:", error)
            }
            observer.error(error)
          }
        }

        processChunk()

        // 返回清理函数
        return () => {
          reader.cancel().catch((err) => {
            if (this.options.debug) {
              console.error("Error cancelling reader:", err)
            }
          })
        }
      })
    } catch (error) {
      console.error("Error in chat completion:", error)

      // 发送错误事件
      this.emitEvent({
        type: "RUN_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
        code: 500,
        timestamp: Date.now(),
      })

      // 发送消息结束和运行结束事件
      this.emitEvent({
        type: "TEXT_MESSAGE_END",
        messageId,
        timestamp: Date.now(),
      } as TextMessageEndEvent)

      this.emitEvent({
        type: "RUN_FINISHED",
        threadId: this.options.threadId,
        runId,
        timestamp: Date.now(),
      } as RunFinishedEvent)

      throw error
    }
  }

  /**
   * 处理工具调用
   */
  private handleToolCall(toolCall: any, runId: string) {
    const toolCallId = `tool-${++this.toolCallIdCounter}`

    // 发送工具调用开始事件
    this.emitEvent({
      type: "TOOL_CALL_START",
      toolCallId,
      toolCallName: toolCall.function?.name || "unknown",
      parentMessageId: `msg-${this.messageIdCounter}`,
      timestamp: Date.now(),
    } as ToolCallStartEvent)

    // 发送工具调用参数事件
    if (toolCall.function?.arguments) {
      this.emitEvent({
        type: "TOOL_CALL_ARGS",
        toolCallId,
        delta: toolCall.function.arguments,
        timestamp: Date.now(),
      } as ToolCallArgsEvent)
    }

    // 发送工具调用结束事件
    this.emitEvent({
      type: "TOOL_CALL_END",
      toolCallId,
      timestamp: Date.now(),
    } as ToolCallEndEvent)
  }

  /**
   * 获取聊天历史记录
   */
  public async fetchChatHistory(appId: string, chatId: string): Promise<any> {
    try {
      const response = await fetch(`${this.options.proxyUrl}/fastgpt/chat-history`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ appId, chatId }),
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch chat history: ${response.statusText}`)
      }

      const data = await response.json()

      // 发送消息快照事件
      this.emitEvent({
        type: "MESSAGES_SNAPSHOT",
        messages: data.messages || [],
        timestamp: Date.now(),
      })

      return data
    } catch (error) {
      console.error("Error fetching chat history:", error)
      throw error
    }
  }

  /**
   * 获取建议问题
   */
  public async fetchSuggestedQuestions(appId: string, chatId: string): Promise<string[]> {
    try {
      const response = await fetch(`${this.options.proxyUrl}/fastgpt/suggested-questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ appId, chatId }),
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch suggested questions: ${response.statusText}`)
      }

      const data = await response.json()
      const questions = data.questions || []

      // 更新状态
      this.updateState({ suggestedQuestions: questions })

      // 发送自定义事件
      this.emitEvent({
        type: "CUSTOM",
        name: "suggested_questions",
        value: questions,
        timestamp: Date.now(),
      } as CustomEvent)

      return questions
    } catch (error) {
      console.error("Error fetching suggested questions:", error)
      return []
    }
  }

  /**
   * 提交消息反馈（点赞/点踩）
   */
  public async submitFeedback(
    appId: string,
    chatId: string,
    messageId: string,
    feedback: "like" | "dislike",
    comment?: string,
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.options.proxyUrl}/fastgpt/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appId,
          chatId,
          messageId,
          feedback,
          comment,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to submit feedback: ${response.statusText}`)
      }

      // 发送自定义事件
      this.emitEvent({
        type: "CUSTOM",
        name: "message_feedback",
        value: {
          messageId,
          feedback,
          comment,
          success: true,
        },
        timestamp: Date.now(),
      } as CustomEvent)

      return true
    } catch (error) {
      console.error("Error submitting feedback:", error)

      // 发送自定义事件
      this.emitEvent({
        type: "CUSTOM",
        name: "message_feedback",
        value: {
          messageId,
          feedback,
          comment,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        timestamp: Date.now(),
      } as CustomEvent)

      return false
    }
  }

  /**
   * 生成长图
   */
  public async generateLongImage(appId: string, chatId: string, includeWelcome = true): Promise<string> {
    try {
      const response = await fetch(`${this.options.proxyUrl}/fastgpt/generate-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appId,
          chatId,
          includeWelcome,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to generate long image: ${response.statusText}`)
      }

      const data = await response.json()
      const imageUrl = data.imageUrl

      // 发送自定义事件
      this.emitEvent({
        type: "CUSTOM",
        name: "long_image_generated",
        value: {
          imageUrl,
          chatId,
        },
        timestamp: Date.now(),
      } as CustomEvent)

      return imageUrl
    } catch (error) {
      console.error("Error generating long image:", error)
      throw error
    }
  }

  /**
   * 批量转发消息
   */
  public async batchForward(
    sourceAppId: string,
    sourceChatId: string,
    targetAppIds: string[],
    messageIds: string[],
  ): Promise<any> {
    try {
      const response = await fetch(`${this.options.proxyUrl}/fastgpt/batch-forward`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceAppId,
          sourceChatId,
          targetAppIds,
          messageIds,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to batch forward: ${response.statusText}`)
      }

      const data = await response.json()

      // 发送自定义事件
      this.emitEvent({
        type: "CUSTOM",
        name: "batch_forward_completed",
        value: {
          results: data.results,
          success: data.success,
        },
        timestamp: Date.now(),
      } as CustomEvent)

      return data
    } catch (error) {
      console.error("Error in batch forward:", error)
      throw error
    }
  }

  /**
   * 更新状态
   */
  private updateState(newState: Record<string, any>): void {
    this.state = {
      ...this.state,
      ...newState,
    }
  }

  /**
   * 发送事件到事件流
   */
  private emitEvent(event: BaseEvent): void {
    if (this.options.debug) {
      console.debug("AG-UI Event:", event)
    }
    this.eventSubject.next(event)
  }
}
