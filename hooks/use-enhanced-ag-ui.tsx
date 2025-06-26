// @ts-nocheck
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { EnhancedAgUIRuntime } from "@/lib/ag-ui/protocol/enhanced-runtime"
import { AgUIAgentManager } from "@/lib/ag-ui/protocol/agent-manager"
import type { AgUIEvent, Message, AgentDefinition, RunConfig } from "@/lib/ag-ui/protocol/types"
import type { Subscription } from "rxjs"

interface UseEnhancedAgUIOptions {
  threadId?: string
  debug?: boolean
  apiEndpoint?: string
  enableMiddleware?: boolean
  enableBuiltinTools?: boolean
  securityOptions?: {
    allowedTools?: string[]
    maxMessageLength?: number
    rateLimitPerMinute?: number
  }
}

/**
 * 增强版AG-UI React Hook
 * 集成所有协议特性
 */
export function useEnhancedAgUI(options: UseEnhancedAgUIOptions = {}) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [currentAgent, setCurrentAgent] = useState<AgentDefinition | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [state, setState] = useState<Record<string, any>>({})
  const [events, setEvents] = useState<AgUIEvent[]>([])
  const [error, setError] = useState<Error | null>(null)
  const [performanceMetrics, setPerformanceMetrics] = useState<Record<string, any>>({})
  const [healthStatus, setHealthStatus] = useState<"healthy" | "degraded" | "unhealthy">("healthy")

  const runtimeRef = useRef<EnhancedAgUIRuntime | null>(null)
  const agentManagerRef = useRef<AgUIAgentManager | null>(null)
  const subscriptionRef = useRef<Subscription | null>(null)

  const threadId = options.threadId || `thread-${Date.now()}`

  // 初始化
  useEffect(() => {
    agentManagerRef.current = new AgUIAgentManager()
    runtimeRef.current = new EnhancedAgUIRuntime({
      threadId,
      debug: options.debug,
      apiEndpoint: options.apiEndpoint,
      enableMiddleware: options.enableMiddleware,
      enableBuiltinTools: options.enableBuiltinTools,
      securityOptions: options.securityOptions,
    })

    // 订阅事件流
    subscriptionRef.current = runtimeRef.current.getEventStream().subscribe({
      next: (event) => {
        setEvents((prev) => [...prev, event])

        // 处理特定事件
        switch (event.type) {
          case "run-started":
            setIsRunning(true)
            setError(null)
            break

          case "run-finished":
            setIsRunning(false)
            // 更新性能指标
            if (runtimeRef.current) {
              setPerformanceMetrics(runtimeRef.current.getPerformanceMetrics())
            }
            break

          case "run-error":
            setIsRunning(false)
            setError(new Error((event as any).error.message))
            break

          case "state-snapshot":
            setState((event as any).state)
            break
        }
      },
      error: (err) => {
        // Error handled by setting error state
        setError(err instanceof Error ? err : new Error(String(err)))
        setIsRunning(false)
        setHealthStatus("unhealthy")
      },
    })

    // 订阅消息流
    const messagesSubscription = runtimeRef.current.getMessagesStream().subscribe({
      next: (newMessages) => {
        setMessages(newMessages)
      },
    })

    // 定期健康检查
    const healthCheckInterval = setInterval(async () => {
      if (runtimeRef.current) {
        try {
          const health = await runtimeRef.current.healthCheck()
          setHealthStatus(health.status)
        } catch (error) {
          setHealthStatus("unhealthy")
        }
      }
    }, 30000) // 每30秒检查一次

    setIsInitialized(true)

    // 清理
    return () => {
      clearInterval(healthCheckInterval)
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }
      if (messagesSubscription) {
        messagesSubscription.unsubscribe()
      }
      if (runtimeRef.current) {
        runtimeRef.current.dispose()
      }
    }
  }, [threadId, options.debug, options.apiEndpoint, options.enableMiddleware, options.enableBuiltinTools, options.securityOptions])

  /**
   * 初始化智能体
   */
  const initializeAgent = useCallback(async (appId: string, apiKey: string, chatId?: string) => {
    if (!agentManagerRef.current || !runtimeRef.current) {
      throw new Error("Enhanced AG-UI not initialized")
    }

    try {
      setError(null)

      // 从FastGPT创建智能体定义
      const agent = await agentManagerRef.current.createAgentFromFastGPT(appId, apiKey, chatId)

      // 设置智能体到运行时
      runtimeRef.current.setAgent(agent)
      setCurrentAgent(agent)

      // 如果有欢迎消息，添加到消息列表
      if (agent.metadata?.welcomeText) {
        const welcomeMessage: Message = {
          id: `welcome-${Date.now()}`,
          role: "assistant",
          content: agent.metadata.welcomeText,
          timestamp: Date.now(),
        }

        setMessages([welcomeMessage])
      }

      return agent
    } catch (error) {
      // Error handled by setting error state and re-throwing
      setError(error instanceof Error ? error : new Error(String(error)))
      throw error
    }
  }, [])

  /**
   * 发送消息
   */
  const sendMessage = useCallback(
    async (content: string, config?: RunConfig) => {
      if (!runtimeRef.current || !currentAgent) {
        throw new Error("Agent not initialized")
      }

      try {
        setError(null)

        // 创建用户消息
        const userMessage: Message = {
          id: `user-${Date.now()}`,
          role: "user",
          content,
          timestamp: Date.now(),
        }

        // 准备运行输入
        const runInput = {
          threadId,
          runId: `run-${Date.now()}`,
          messages: [...messages, userMessage],
          tools: currentAgent.tools,
          state: state,
        }

        // 执行运行
        await runtimeRef.current.run(runInput, config)
      } catch (error) {
        // Error handled by setting error state and re-throwing
        setError(error instanceof Error ? error : new Error(String(error)))
        throw error
      }
    },
    [threadId, messages, currentAgent, state],
  )

  /**
   * 注册自定义工具
   */
  const registerTool = useCallback((executor: any) => {
    if (runtimeRef.current) {
      runtimeRef.current.registerTool(executor)
    }
  }, [])

  /**
   * 注册中间件
   */
  const registerMiddleware = useCallback((middleware: any) => {
    if (runtimeRef.current) {
      runtimeRef.current.registerMiddleware(middleware)
    }
  }, [])

  /**
   * 获取可用工具
   */
  const getAvailableTools = useCallback(() => {
    return runtimeRef.current?.getAvailableTools() || []
  }, [])

  /**
   * 获取版本信息
   */
  const getVersionInfo = useCallback(() => {
    return runtimeRef.current?.getVersionInfo()
  }, [])

  /**
   * 执行健康检查
   */
  const performHealthCheck = useCallback(async () => {
    if (runtimeRef.current) {
      const health = await runtimeRef.current.healthCheck()
      setHealthStatus(health.status)
      return health
    }
    return null
  }, [])

  return {
    // 基础状态
    isInitialized,
    isRunning,
    currentAgent,
    messages,
    state,
    events,
    error,
    threadId,

    // 增强状态
    performanceMetrics,
    healthStatus,

    // 基础方法
    initializeAgent,
    sendMessage,

    // 增强方法
    registerTool,
    registerMiddleware,
    getAvailableTools,
    getVersionInfo,
    performHealthCheck,
  }
}
