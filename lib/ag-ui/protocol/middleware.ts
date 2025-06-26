// @ts-nocheck
import type { AgUIEvent, Message, RunInput } from "./types"

/**
 * AG-UI中间件接口
 * 用于扩展和自定义协议行为
 */
export interface AgUIMiddleware {
  name: string
  version: string

  // 事件中间件
  onEvent?(event: AgUIEvent): AgUIEvent | null

  // 消息中间件
  onMessage?(message: Message): Message | null

  // 运行中间件
  onRun?(input: RunInput): RunInput | Promise<RunInput>

  // 错误中间件
  onError?(error: Error, context: any): Error | null

  // 初始化和清理
  initialize?(): Promise<void> | void
  dispose?(): Promise<void> | void
}

/**
 * AG-UI中间件管理器
 */
export class AgUIMiddlewareManager {
  private middlewares: Map<string, AgUIMiddleware> = new Map()
  private initialized = false

  /**
   * 注册中间件
   */
  register(middleware: AgUIMiddleware): void {
    if (this.middlewares.has(middleware.name)) {
      throw new Error(`Middleware ${middleware.name} already registered`)
    }

    this.middlewares.set(middleware.name, middleware)

    if (this.initialized && middleware.initialize) {
      middleware.initialize()
    }
  }

  /**
   * 注销中间件
   */
  unregister(name: string): boolean {
    const middleware = this.middlewares.get(name)
    if (middleware) {
      if (middleware.dispose) {
        middleware.dispose()
      }
      return this.middlewares.delete(name)
    }
    return false
  }

  /**
   * 初始化所有中间件
   */
  async initialize(): Promise<void> {
    for (const middleware of this.middlewares.values()) {
      if (middleware.initialize) {
        await middleware.initialize()
      }
    }
    this.initialized = true
  }

  /**
   * 处理事件
   */
  processEvent(event: AgUIEvent): AgUIEvent | null {
    let processedEvent = event

    for (const middleware of this.middlewares.values()) {
      if (middleware.onEvent) {
        const result = middleware.onEvent(processedEvent)
        if (result === null) {
          return null // 中间件决定丢弃事件
        }
        processedEvent = result
      }
    }

    return processedEvent
  }

  /**
   * 处理消息
   */
  processMessage(message: Message): Message | null {
    let processedMessage = message

    for (const middleware of this.middlewares.values()) {
      if (middleware.onMessage) {
        const result = middleware.onMessage(processedMessage)
        if (result === null) {
          return null
        }
        processedMessage = result
      }
    }

    return processedMessage
  }

  /**
   * 处理运行输入
   */
  async processRun(input: RunInput): Promise<RunInput> {
    let processedInput = input

    for (const middleware of this.middlewares.values()) {
      if (middleware.onRun) {
        processedInput = await middleware.onRun(processedInput)
      }
    }

    return processedInput
  }

  /**
   * 处理错误
   */
  processError(error: Error, context: any): Error | null {
    let processedError = error

    for (const middleware of this.middlewares.values()) {
      if (middleware.onError) {
        const result = middleware.onError(processedError, context)
        if (result === null) {
          return null // 中间件决定忽略错误
        }
        processedError = result
      }
    }

    return processedError
  }

  /**
   * 清理所有中间件
   */
  async dispose(): Promise<void> {
    for (const middleware of this.middlewares.values()) {
      if (middleware.dispose) {
        await middleware.dispose()
      }
    }
    this.middlewares.clear()
    this.initialized = false
  }
}

/**
 * 内置中间件：日志记录
 */
export class LoggingMiddleware implements AgUIMiddleware {
  name = "logging"
  version = "1.0.0"

  constructor(private options: { debug?: boolean; logLevel?: "info" | "debug" | "error" } = {}) {}

  onEvent(event: AgUIEvent): AgUIEvent {
    if (this.options.debug) {
      console.debug(`[AG-UI Event] ${event.type}:`, event)
    }
    return event
  }

  onError(error: Error, context: any): Error {
    console.error(`[AG-UI Error] ${error.message}:`, { error, context })
    return error
  }
}

/**
 * 内置中间件：性能监控
 */
export class PerformanceMiddleware implements AgUIMiddleware {
  name = "performance"
  version = "1.0.0"

  private metrics: Map<string, { start: number; end?: number }> = new Map()

  onEvent(event: AgUIEvent): AgUIEvent {
    switch (event.type) {
      case "run-started":
        this.metrics.set((event as any).runId, { start: Date.now() })
        break
      case "run-finished":
      case "run-error":
        const metric = this.metrics.get((event as any).runId)
        if (metric) {
          metric.end = Date.now()
          const duration = metric.end - metric.start
          console.info(`[AG-UI Performance] Run ${(event as any).runId} took ${duration}ms`)
        }
        break
    }
    return event
  }

  getMetrics(): Record<string, number> {
    const result: Record<string, number> = {}
    for (const [runId, metric] of this.metrics.entries()) {
      if (metric.end) {
        result[runId] = metric.end - metric.start
      }
    }
    return result
  }
}

/**
 * 内置中间件：安全验证
 */
export class SecurityMiddleware implements AgUIMiddleware {
  name = "security"
  version = "1.0.0"

  constructor(
    private options: {
      allowedTools?: string[]
      maxMessageLength?: number
      rateLimitPerMinute?: number
    } = {},
  ) {}

  onMessage(message: Message): Message | null {
    // 检查消息长度
    if (
      this.options.maxMessageLength &&
      typeof message.content === "string" &&
      message.content.length > this.options.maxMessageLength
    ) {
      throw new Error(`Message too long: ${message.content.length} > ${this.options.maxMessageLength}`)
    }

    return message
  }

  onRun(input: RunInput): RunInput {
    // 检查工具权限
    if (this.options.allowedTools) {
      const filteredTools = input.tools.filter((tool) => this.options.allowedTools!.includes(tool.function.name))
      return { ...input, tools: filteredTools }
    }

    return input
  }
}
