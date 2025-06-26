// @ts-nocheck
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { StandardAgUIRuntime } from "@/lib/ag-ui/standard-runtime"
import { StandardAgentManager } from "@/lib/ag-ui/standard-agent-manager"
import type { BaseEvent, Message, AgentDefinition } from "@/lib/ag-ui/types"
import type { Subscription } from "rxjs"

/**
 * 标准AG-UI Hook
 * 完全符合AG-UI协议规范
 */
export function useStandardAgUI(
  options: {
    threadId?: string
    debug?: boolean
  } = {},
) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [currentAgent, setCurrentAgent] = useState<AgentDefinition | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [state, setState] = useState<Record<string, any>>({})
  const [events, setEvents] = useState<BaseEvent[]>([])

  const runtimeRef = useRef<StandardAgUIRuntime | null>(null)
  const agentManagerRef = useRef<StandardAgentManager | null>(null)
  const subscriptionRef = useRef<Subscription | null>(null)

  const threadId = options.threadId || `thread-${Date.now()}`

  // 初始化
  useEffect(() => {
    agentManagerRef.current = new StandardAgentManager()
    setIsInitialized(true)
  }, [])

  /**
   * 初始化智能体
   */
  const initializeAgent = useCallback(
    async (appId: string, apiKey: string) => {
      if (!agentManagerRef.current) {
        throw new Error("Agent manager not initialized")
      }

      // 从FastGPT创建智能体定义
      const agent = await agentManagerRef.current.createAgentFromFastGPT(appId, apiKey)
      setCurrentAgent(agent)

      // 创建运行时
      const runId = `run-${Date.now()}`
      runtimeRef.current = new StandardAgUIRuntime({
        threadId,
        runId,
        debug: options.debug,
      })

      // 订阅事件流
      subscriptionRef.current = runtimeRef.current.getEventStream().subscribe({
        next: (event) => {
          setEvents((prev) => [...prev, event])

          // 处理特定事件
          switch (event.type) {
            case "RUN_STARTED":
              setIsRunning(true)
              break

            case "RUN_FINISHED":
            case "RUN_ERROR":
              setIsRunning(false)
              break

            case "STATE_SNAPSHOT":
              setState((event as any).snapshot)
              break

            case "TEXT_MESSAGE_END":
              // 可以在这里处理消息完成逻辑
              break
          }
        },
        error: (_error) => {
          // Handle AG-UI event stream error
          // Error logged internally by AG-UI runtime
          setIsRunning(false)
        },
      })

      // 初始化状态
      runtimeRef.current.updateState({
        appId,
        agentId: agent.id,
        variables: agent.variables || {},
      })

      return agent
    },
    [threadId, options.debug],
  )

  /**
   * 发送消息
   */
  const sendMessage = useCallback(
    async (content: string, variables?: Record<string, any>) => {
      if (!runtimeRef.current || !currentAgent) {
        throw new Error("Runtime or agent not initialized")
      }

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
        timestamp: Date.now(),
      }

      // 添加用户消息
      setMessages((prev) => [...prev, userMessage])

      // 准备运行输入
      const runInput = {
        threadId,
        runId: `run-${Date.now()}`,
        state: {
          ...state,
          ...(variables && { variables: { ...state.variables, ...variables } }),
        },
        messages: [...messages, userMessage],
        tools: currentAgent.tools || [],
        context: [],
        forwardedProps: {},
      }

      // 执行智能体
      await runtimeRef.current.executeAgent(runInput)
    },
    [threadId, state, messages, currentAgent],
  )

  /**
   * 更新变量
   */
  const updateVariables = useCallback(
    (variables: Record<string, any>) => {
      if (runtimeRef.current) {
        runtimeRef.current.updateState({
          ...state,
          variables: { ...state.variables, ...variables },
        })
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
   * 清理
   */
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }
    }
  }, [])

  return {
    isInitialized,
    isRunning,
    currentAgent,
    messages,
    state,
    events,
    threadId,
    initializeAgent,
    sendMessage,
    updateVariables,
    getAgents,
  }
}
