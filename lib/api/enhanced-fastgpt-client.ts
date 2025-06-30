// @ts-nocheck
/// <reference lib="dom" />
import { Observable, BehaviorSubject } from "rxjs"
import { retry, catchError, timeout } from "rxjs/operators"
import { v4 as uuidv4 } from "uuid"

export interface FastGPTConfig {
  apiKey: string
  baseUrl: string
  useProxy: boolean
  timeout: number
  maxRetries: number
  retryDelay: number
}

import { ChatMessage } from '../types/interfaces';

export interface ChatContext {
  sessionId: string
  appId: string
  userId: string
  messages: ChatMessage[]
  variables: Record<string, any>
  systemPrompt?: string
  maxContextLength: number
}

export interface StreamResponse {
  id: string
  content: string
  delta: string
  isComplete: boolean
  metadata?: Record<string, any>
}

export interface ConnectionStatus {
  isConnected: boolean
  lastPing: Date | null
  latency: number
  errorCount: number
  retryCount: number
}

/**
 * 增强的FastGPT客户端
 * 支持上下文记忆、错误重试、连接监控等高级功能
 */
export class EnhancedFastGPTClient {
  private config: FastGPTConfig
  private connectionStatus$ = new BehaviorSubject<ConnectionStatus>({
    isConnected: false,
    lastPing: null,
    latency: 0,
    errorCount: 0,
    retryCount: 0,
  })

  private contextCache = new Map<string, ChatContext>()
  private messageQueue: Array<{ context: ChatContext; resolve: Function; reject: Function }> = []
  private isProcessing = false

  constructor(config: FastGPTConfig) {
    this.config = config
    this.startHealthCheck()
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): Observable<ConnectionStatus> {
    return this.connectionStatus$.asObservable()
  }

  /**
   * 初始化聊天上下文
   */
  async initializeContext(appId: string, userId: string, systemPrompt?: string): Promise<ChatContext> {
    const sessionId = uuidv4()

    try {
      // 调用FastGPT初始化接口
      const response = await this.makeRequest("/api/fastgpt/init-chat", {
        method: "POST",
        body: JSON.stringify({ appId, userId, systemPrompt }),
      })

      const data = await response.json()

      const context: ChatContext = {
        sessionId,
        appId,
        userId,
        messages: [],
        variables: data.variables || {},
        systemPrompt: systemPrompt || data.systemPrompt,
        maxContextLength: 4000, // 可配置的上下文长度限制
      }

      // 添加欢迎消息
      if (data.welcomeMessage) {
        context.messages.push({
          id: uuidv4(),
          role: "assistant",
          content: data.welcomeMessage,
          timestamp: new Date(),
          metadata: { isWelcome: true },
        })
      }

      // 缓存上下文
      this.contextCache.set(sessionId, context)

      return context
    } catch (error) {
      console.error("Failed to initialize context:", error)
      throw new Error(`Context initialization failed: ${error.message}`)
    }
  }

  /**
   * 发送消息并获取流式响应
   */
  sendMessage(sessionId: string, content: string, files?: File[]): Observable<StreamResponse> {
    return new Observable((observer) => {
      const context = this.contextCache.get(sessionId)
      if (!context) {
        observer.error(new Error("Context not found"))
        return
      }

      // 添加用户消息到上下文
      const userMessage: ChatMessage = {
        id: uuidv4(),
        role: "user",
        content,
        timestamp: new Date(),
        metadata: files ? { files: files.map((f) => f.name) } : undefined,
      }

      context.messages.push(userMessage)

      // 智能上下文管理
      this.manageContext(context)

      // 准备API请求
      const messages = this.prepareMessages(context)
      const requestBody = {
        appId: context.appId,
        chatId: sessionId,
        messages,
        stream: true,
        detail: true,
        system: context.systemPrompt,
        variables: context.variables,
        userId: context.userId,
      }

      // 发送请求
      this.streamRequest("/api/fastgpt/chat", requestBody)
        .pipe(
          timeout(this.config.timeout),
          retry({
            count: this.config.maxRetries,
            delay: (error, retryCount) => {
              console.warn(`Retry attempt ${retryCount} for session ${sessionId}:`, error.message)
              this.updateConnectionStatus({ retryCount })
              return new Promise((resolve) => setTimeout(resolve, this.config.retryDelay * retryCount))
            },
          }),
          catchError((error) => {
            this.updateConnectionStatus({ errorCount: this.connectionStatus$.value.errorCount + 1 })
            observer.error(new Error(`Stream request failed: ${error.message}`))
            return []
          }),
        )
        .subscribe({
          next: (response) => {
            observer.next(response)

            // 如果响应完成，添加到上下文
            if (response.isComplete) {
              const assistantMessage: ChatMessage = {
                id: response.id,
                role: "assistant",
                content: response.content,
                timestamp: new Date(),
                metadata: response.metadata,
              }
              context.messages.push(assistantMessage)
              this.contextCache.set(sessionId, context)
            }
          },
          error: (error) => observer.error(error),
          complete: () => observer.complete(),
        })
    })
  }

  /**
   * 智能上下文管理
   * 当上下文过长时，保留重要消息并压缩历史
   */
  private manageContext(context: ChatContext): void {
    if (this.calculateContextLength(context) <= context.maxContextLength) {
      return
    }

    console.log(`Context too long for session ${context.sessionId}, managing...`)

    // 保留系统消息、最近的消息和重要消息
    const importantMessages = context.messages.filter(
      (msg) => msg.role === "system" || msg.metadata?.isWelcome || msg.metadata?.isImportant,
    )

    const recentMessages = context.messages.slice(-10) // 保留最近10条消息

    // 合并并去重
    const preservedMessages = [
      ...importantMessages,
      ...recentMessages.filter((msg) => !importantMessages.some((im) => im.id === msg.id)),
    ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    // 如果还是太长，进一步压缩
    if (this.calculateContextLength({ ...context, messages: preservedMessages }) > context.maxContextLength) {
      // 创建摘要消息
      const summaryContent = this.createContextSummary(context.messages.slice(0, -10))
      const summaryMessage: ChatMessage = {
        id: uuidv4(),
        role: "system",
        content: `[Context Summary] ${summaryContent}`,
        timestamp: new Date(),
        metadata: { isSummary: true },
      }

      context.messages = [summaryMessage, ...recentMessages]
    } else {
      context.messages = preservedMessages
    }

    console.log(`Context managed: ${context.messages.length} messages remaining`)
  }

  /**
   * 计算上下文长度（简单的字符计数，实际应该用token计数）
   */
  private calculateContextLength(context: ChatContext): number {
    return context.messages.reduce((total, msg) => total + msg.content.length, 0)
  }

  /**
   * 创建上下文摘要
   */
  private createContextSummary(messages: ChatMessage[]): string {
    const topics = new Set<string>()
    const keyPoints: string[] = []

    messages.forEach((msg) => {
      if (msg.role === "user") {
        // 提取关键词
        const words = msg.content.split(/\s+/).filter((word) => word.length > 3)
        words.slice(0, 3).forEach((word) => topics.add(word))
      } else if (msg.role === "assistant" && msg.content.length > 100) {
        // 提取重要回答的开头
        keyPoints.push(msg.content.substring(0, 50) + "...")
      }
    })

    return `Topics discussed: ${Array.from(topics).join(", ")}. Key points: ${keyPoints.join(" ")}`
  }

  /**
   * 准备发送给API的消息格式
   */
  private prepareMessages(context: ChatContext): Array<{ role: string; content: string }> {
    return context.messages
      .filter((msg) => !msg.metadata?.isSummary) // 过滤掉摘要消息，避免重复
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))
  }

  /**
   * 流式请求处理
   */
  private streamRequest(endpoint: string, body: any): Observable<StreamResponse> {
    return new Observable((observer) => {
      const responseId = uuidv4()
      let accumulatedContent = ""

      fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          const reader = response.body?.getReader()
          if (!reader) {
            throw new Error("Response body is null")
          }

          const decoder = new TextDecoder()
          let buffer = ""

          const processChunk = async () => {
            try {
              const { done, value } = await reader.read()

              if (done) {
                // 发送最终完成响应
                observer.next({
                  id: responseId,
                  content: accumulatedContent,
                  delta: "",
                  isComplete: true,
                })
                observer.complete()
                return
              }

              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split("\n")
              buffer = lines.pop() || "" // 保留不完整的行

              for (const line of lines) {
                if (line.trim() === "") {continue}

                if (line.startsWith("data: ")) {
                  const data = line.slice(6)

                  if (data === "[DONE]") {
                    observer.next({
                      id: responseId,
                      content: accumulatedContent,
                      delta: "",
                      isComplete: true,
                    })
                    observer.complete()
                    return
                  }

                  try {
                    const parsed = JSON.parse(data)

                    if (parsed.choices?.[0]?.delta?.content) {
                      const delta = parsed.choices[0].delta.content
                      accumulatedContent += delta

                      observer.next({
                        id: responseId,
                        content: accumulatedContent,
                        delta,
                        isComplete: false,
                        metadata: parsed.metadata,
                      })
                    }
                  } catch (e) {
                    console.warn("Failed to parse SSE data:", data)
                  }
                }
              }

              processChunk()
            } catch (error) {
              observer.error(error)
            }
          }

          processChunk()
        })
        .catch((error) => observer.error(error))
    })
  }

  /**
   * 通用请求方法，支持重试
   */
  private async makeRequest(endpoint: string, options: RequestInit): Promise<Response> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await fetch(endpoint, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...options.headers,
          },
        })

        if (response.ok) {
          this.updateConnectionStatus({
            isConnected: true,
            lastPing: new Date(),
            errorCount: 0,
          })
          return response
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
      } catch (error) {
        lastError = error as Error

        if (attempt < this.config.maxRetries) {
          console.warn(`Request attempt ${attempt + 1} failed, retrying...`, error.message)
          await new Promise((resolve) => setTimeout(resolve, this.config.retryDelay * (attempt + 1)))
        }
      }
    }

    this.updateConnectionStatus({
      isConnected: false,
      errorCount: this.connectionStatus$.value.errorCount + 1,
    })

    throw lastError!
  }

  /**
   * 更新连接状态
   */
  private updateConnectionStatus(updates: Partial<ConnectionStatus>): void {
    const current = this.connectionStatus$.value
    this.connectionStatus$.next({ ...current, ...updates })
  }

  /**
   * 健康检查
   */
  private startHealthCheck(): void {
    setInterval(async () => {
      try {
        const start = Date.now()
        await this.makeRequest("/api/fastgpt/health", { method: "GET" })
        const latency = Date.now() - start

        this.updateConnectionStatus({
          isConnected: true,
          lastPing: new Date(),
          latency,
        })
      } catch (error) {
        this.updateConnectionStatus({
          isConnected: false,
          errorCount: this.connectionStatus$.value.errorCount + 1,
        })
      }
    }, 30000) // 每30秒检查一次
  }

  /**
   * 获取上下文信息
   */
  getContext(sessionId: string): ChatContext | undefined {
    return this.contextCache.get(sessionId)
  }

  /**
   * 清理上下文
   */
  clearContext(sessionId: string): void {
    this.contextCache.delete(sessionId)
  }

  /**
   * 获取所有活跃会话
   */
  getActiveSessions(): string[] {
    return Array.from(this.contextCache.keys())
  }

  /**
   * 导出聊天历史
   */
  exportChatHistory(sessionId: string): ChatMessage[] | null {
    const context = this.contextCache.get(sessionId)
    return context ? [...context.messages] : null
  }

  /**
   * 设置消息为重要
   */
  markMessageAsImportant(sessionId: string, messageId: string): void {
    const context = this.contextCache.get(sessionId)
    if (context) {
      const message = context.messages.find((m) => m.id === messageId)
      if (message) {
        message.metadata = { ...message.metadata, isImportant: true }
        this.contextCache.set(sessionId, context)
      }
    }
  }
}

// 默认配置
export const defaultFastGPTConfig: FastGPTConfig = {
  apiKey: process.env.FASTGPT_API_KEY || "",
  baseUrl: process.env.FASTGPT_API_URL || "https://zktecoaihub.com",
  useProxy: true,
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
}

// 全局客户端实例
export const enhancedFastGPTClient = new EnhancedFastGPTClient(defaultFastGPTConfig)
