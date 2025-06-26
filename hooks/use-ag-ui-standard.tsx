// @ts-nocheck
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { AgUIRuntime } from "@/lib/ag-ui/protocol/runtime"
import { AgUIAgentManager } from "@/lib/ag-ui/protocol/agent-manager"
import type { AgUIEvent, Message, AgentDefinition, RunConfig } from "@/lib/ag-ui/protocol/types"
import type { Subscription } from "rxjs"

interface UseAgUIStandardOptions {
  threadId?: string
  debug?: boolean
  apiEndpoint?: string
}

/**
 * 标准AG-UI React Hook
 * 严格遵循AG-UI协议规范
 */
export function useAgUIStandard(options: UseAgUIStandardOptions = {}) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [currentAgent, setCurrentAgent] = useState<AgentDefinition | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [state, setState] = useState<Record<string, any>>({})
  const [events, setEvents] = useState<AgUIEvent[]>([])
  const [error, setError] = useState<Error | null>(null)

  const runtimeRef = useRef<AgUIRuntime | null>(null)
  const agentManagerRef = useRef<AgUIAgentManager | null>(null)
  const subscriptionRef = useRef<Subscription | null>(null)

  const threadId = options.threadId || `thread-${Date.now()}`

  // 初始化
  useEffect(() => {
    agentManagerRef.current = new AgUIAgentManager()
    runtimeRef.current = new AgUIRuntime({
      threadId,
      debug: options.debug,
      apiEndpoint: options.apiEndpoint,
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
            break

          case "run-error":
            setIsRunning(false)
            setError(new Error((event as any).error.message))
            break

          case "state-snapshot":
            setState((event as any).state)
            break

          case "text-message-end":
            // 消息完成，可以在这里处理后续逻辑
            break
        }
      },
      error: (err) => {
        // Error handled by setting error state
        setError(err instanceof Error ? err : new Error(String(err)))
        setIsRunning(false)
      },
    })

    // 订阅消息流
    const messagesSubscription = runtimeRef.current.getMessagesStream().subscribe({
      next: (newMessages) => {
        setMessages(newMessages)
      },
    })

    setIsInitialized(true)

    // 清理
    return () => {
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
  }, [threadId, options.debug, options.apiEndpoint])

  /**
   * 初始化智能体
   */
  const initializeAgent = useCallback(async (appId: string, apiKey: string, chatId?: string) => {
    if (!agentManagerRef.current || !runtimeRef.current) {
      throw new Error("AG-UI not initialized")
    }

    try {
      setError(null)

      // 从FastGPT创建智能体定义
      const agent = await agentManagerRef.current.createAgentFromFastGPT(appId, apiKey, chatId)

      // 设置智能体到运行时
      runtimeRef.current.setAgent(agent)
      setCurrentAgent(agent)

      // 初始化状态
      const _initialState = {
        appId,
        chatId: agent.metadata?.chatId || chatId,
        variables: agent.variables || {},
        apiKey,
      }

      runtimeRef.current.getStateStream().subscribe({
        next: (newState) => setState(newState),
      })

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
      // Error handled by setting error state
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
        // Error handled by setting error state
        setError(error instanceof Error ? error : new Error(String(error)))
        throw error
      }
    },
    [threadId, messages, currentAgent, state],
  )

  /**
   * 更新变量
   */
  const updateVariables = useCallback(
    (variables: Record<string, any>) => {
      if (runtimeRef.current) {
        const newState = {
          ...state,
          variables: { ...state.variables, ...variables },
        }
        setState(newState)
      }
    },
    [state],
  )

  /**
   * 获取智能体列表
   */
  const getAgents = useCallback(() => {
    return agentManagerRef.current?.getAllAgents() || []
  }, [])

  /**
   * 重置会话
   */
  const resetSession = useCallback(() => {
    setMessages([])
    setEvents([])
    setError(null)
    setIsRunning(false)

    // 如果有欢迎消息，重新添加
    if (currentAgent?.metadata?.welcomeText) {
      const welcomeMessage: Message = {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        content: currentAgent.metadata.welcomeText,
        timestamp: Date.now(),
      }
      setMessages([welcomeMessage])
    }
  }, [currentAgent])

  /**
   * 获取建议问题
   */
  const getSuggestedQuestions = useCallback(() => {
    if (currentAgent?.metadata?.questionGuide) {
      return currentAgent.metadata.questionGuide
    }
    return []
  }, [currentAgent])

  return {
    // 状态
    isInitialized,
    isRunning,
    currentAgent,
    messages,
    state,
    events,
    error,
    threadId,

    // 方法
    initializeAgent,
    sendMessage,
    updateVariables,
    getAgents,
    resetSession,
    getSuggestedQuestions,
  }
}
