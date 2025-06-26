// @ts-nocheck
import { AgUIRuntime } from "./runtime"
import { AgUIMiddlewareManager, LoggingMiddleware, PerformanceMiddleware, SecurityMiddleware } from "./middleware"
import { ToolRegistry, WeatherTool, WebSearchTool, CADAnalysisTool, PosterGeneratorTool } from "./tool-registry"
import { AgUIErrorCode, ErrorHandler } from "./error-codes"
import { VersionCompatibility } from "./version"
import type { AgUIEvent, RunInput, RunConfig, AgentDefinition } from "./types"

/**
 * 增强版AG-UI运行时
 * 集成所有协议特性
 */
export class EnhancedAgUIRuntime extends AgUIRuntime {
  private middlewareManager: AgUIMiddlewareManager
  private toolRegistry: ToolRegistry
  private performanceMetrics: Map<string, any> = new Map()

  constructor(config: {
    threadId: string
    debug?: boolean
    apiEndpoint?: string
    enableMiddleware?: boolean
    enableBuiltinTools?: boolean
    securityOptions?: {
      allowedTools?: string[]
      maxMessageLength?: number
      rateLimitPerMinute?: number
    }
  }) {
    super(config)

    // 初始化中间件管理器
    this.middlewareManager = new AgUIMiddlewareManager()

    // 初始化工具注册表
    this.toolRegistry = new ToolRegistry()

    // 注册内置中间件
    if (config.enableMiddleware !== false) {
      this.middlewareManager.register(new LoggingMiddleware({ debug: config.debug }))
      this.middlewareManager.register(new PerformanceMiddleware())

      if (config.securityOptions) {
        this.middlewareManager.register(new SecurityMiddleware(config.securityOptions))
      }
    }

    // 注册内置工具
    if (config.enableBuiltinTools !== false) {
      this.toolRegistry.register(new WeatherTool())
      this.toolRegistry.register(new WebSearchTool())
      this.toolRegistry.register(new CADAnalysisTool())
      this.toolRegistry.register(new PosterGeneratorTool())
    }

    // 初始化中间件
    this.middlewareManager.initialize()
  }

  /**
   * 设置智能体（增强版）
   */
  setAgent(agent: AgentDefinition): void {
    try {
      // 版本兼容性检查
      if (agent.metadata?.protocolVersion) {
        if (!VersionCompatibility.isCompatible(agent.metadata.protocolVersion)) {
          throw ErrorHandler.createError(
            AgUIErrorCode.AGENT_INVALID_CONFIG,
            { protocolVersion: agent.metadata.protocolVersion },
            { agentId: agent.id },
          )
        }
      }

      // 验证工具定义
      for (const tool of agent.tools) {
        if (!this.toolRegistry.has(tool.function.name)) {
          console.warn(`Tool ${tool.function.name} not found in registry`)
        }
      }

      super.setAgent(agent)
    } catch (error) {
      throw ErrorHandler.handleError(error, { agentId: agent.id })
    }
  }

  /**
   * 执行运行（增强版）
   */
  async run(input: RunInput, config?: RunConfig): Promise<void> {
    const startTime = Date.now()

    try {
      // 通过中间件处理输入
      const processedInput = await this.middlewareManager.processRun(input)

      // 记录性能指标
      this.performanceMetrics.set(input.runId, {
        startTime,
        input: processedInput,
        config,
      })

      // 执行运行
      await super.run(processedInput, config)

      // 更新性能指标
      const metric = this.performanceMetrics.get(input.runId)
      if (metric) {
        metric.endTime = Date.now()
        metric.duration = metric.endTime - metric.startTime
      }
    } catch (error) {
      // 通过中间件处理错误
      const processedError = this.middlewareManager.processError(ErrorHandler.handleError(error), {
        runId: input.runId,
        threadId: input.threadId,
      })

      if (processedError) {
        throw processedError
      }
    }
  }

  /**
   * 执行工具（增强版）
   */
  protected async executeTool(toolName: string, argsJson: string): Promise<any> {
    try {
      let args: any = {}
      try {
        args = JSON.parse(argsJson)
      } catch (e) {
        throw ErrorHandler.createError(AgUIErrorCode.TOOL_INVALID_ARGS, { argsJson, parseError: e }, { toolName })
      }

      // 使用工具注册表执行
      if (this.toolRegistry.has(toolName)) {
        return await this.toolRegistry.execute(toolName, args, {
          threadId: this.config.threadId,
          timestamp: Date.now(),
        })
      }

      // 回退到父类实现
      return await super.executeTool(toolName, argsJson)
    } catch (error) {
      throw ErrorHandler.handleError(error, { toolName, argsJson })
    }
  }

  /**
   * 发送事件（增强版）
   */
  protected emitEvent(event: AgUIEvent): void {
    try {
      // 通过中间件处理事件
      const processedEvent = this.middlewareManager.processEvent(event)

      if (processedEvent) {
        super.emitEvent(processedEvent)
      }
    } catch (error) {
      console.error("Error processing event through middleware:", error)
      // 即使中间件出错，也要发送原始事件
      super.emitEvent(event)
    }
  }

  /**
   * 注册自定义工具
   */
  registerTool(executor: any): void {
    this.toolRegistry.register(executor)
  }

  /**
   * 注册中间件
   */
  registerMiddleware(middleware: any): void {
    this.middlewareManager.register(middleware)
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics(): Record<string, any> {
    const result: Record<string, any> = {}
    for (const [runId, metric] of this.performanceMetrics.entries()) {
      result[runId] = { ...metric }
    }
    return result
  }

  /**
   * 获取工具列表
   */
  getAvailableTools(): string[] {
    return this.toolRegistry.getToolNames()
  }

  /**
   * 获取版本信息
   */
  getVersionInfo() {
    return VersionCompatibility.getCurrentVersionInfo()
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy"
    details: Record<string, any>
  }> {
    const details: Record<string, any> = {
      version: VersionCompatibility.getCurrentVersionInfo(),
      tools: this.toolRegistry.getToolNames(),
      middleware: Array.from((this.middlewareManager as any).middlewares.keys()),
      metrics: Object.keys(this.performanceMetrics).length,
    }

    try {
      // 测试基本功能
      const testEvent: AgUIEvent = {
        type: "custom",
        name: "health-check",
        data: { timestamp: Date.now() },
        timestamp: Date.now(),
      }

      this.middlewareManager.processEvent(testEvent)

      details.status = "healthy"
      return { status: "healthy", details }
    } catch (error) {
      details.error = error instanceof Error ? error.message : String(error)
      return { status: "unhealthy", details }
    }
  }

  /**
   * 清理资源（增强版）
   */
  dispose(): void {
    // 清理中间件
    this.middlewareManager.dispose()

    // 清理性能指标
    this.performanceMetrics.clear()

    // 调用父类清理
    super.dispose()
  }
}
