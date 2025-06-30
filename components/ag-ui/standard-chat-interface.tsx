// @ts-nocheck
"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { useAgUIStandard } from "@/hooks/use-ag-ui-standard"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Send, Bot, User, AlertCircle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface StandardChatInterfaceProps {
  appId?: string
  apiKey?: string
  chatId?: string
  className?: string
}

/**
 * 标准AG-UI聊天界面
 * 严格遵循AG-UI协议和系统设计规范
 */
export function StandardChatInterface({ appId, apiKey, chatId, className }: StandardChatInterfaceProps) {
  const { toast } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState("")
  const [requiredVariables, setRequiredVariables] = useState<Record<string, any>>({})
  const [variableValues, setVariableValues] = useState<Record<string, any>>({})
  const [showVariableForm, setShowVariableForm] = useState(false)

  // 使用标准AG-UI Hook
  const {
    isInitialized,
    isRunning,
    currentAgent,
    messages,
    _state,
    events,
    error,
    threadId,
    initializeAgent,
    sendMessage,
    updateVariables,
    resetSession,
    getSuggestedQuestions,
  } = useAgUIStandard({
    debug: process.env.NODE_ENV === "development",
  })

  // 初始化智能体
  useEffect(() => {
    if (isInitialized && appId && apiKey && !currentAgent) {
      initializeAgent(appId, apiKey, chatId).catch((error) => {
        toast({
          title: "初始化失败",
          description: error.message,
          variant: "destructive",
        })
      })
    }
  }, [isInitialized, appId, apiKey, chatId, currentAgent, initializeAgent, toast])

  // 检查必填变量
  useEffect(() => {
    if (currentAgent?.variables) {
      const required = Object.entries(currentAgent.variables).reduce(
        (acc, [key, config]: [string, any]) => {
          if (config.required) {
            acc[key] = config
          }
          return acc
        },
        {} as Record<string, any>,
      )

      if (Object.keys(required).length > 0) {
        setRequiredVariables(required)
        setShowVariableForm(true)
      }
    }
  }, [currentAgent])

  // 自动滚动到底部
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  // 处理发送消息
  const handleSendMessage = useCallback(async () => {
    if (!input.trim() || isRunning) {return}

    const messageContent = input
    setInput("")

    try {
      await sendMessage(messageContent)
    } catch (error) {
      toast({
        title: "发送失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      })
    }
  }, [input, isRunning, sendMessage, toast])

  // 处理变量提交
  const handleSubmitVariables = useCallback(() => {
    // 检查必填变量
    const missingVariables = Object.keys(requiredVariables).filter((key) => !variableValues[key])

    if (missingVariables.length > 0) {
      toast({
        title: "缺少必填信息",
        description: `请填写: ${missingVariables.map((key) => requiredVariables[key].label).join(", ")}`,
        variant: "destructive",
      })
      return
    }

    // 更新变量
    updateVariables(variableValues)
    setShowVariableForm(false)

    toast({
      title: "配置已保存",
      description: "智能体配置已更新",
    })
  }, [requiredVariables, variableValues, updateVariables, toast])

  // 处理键盘事件
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSendMessage()
      }
    },
    [handleSendMessage],
  )

  // 渲染消息
  const renderMessage = useCallback((message: any, index: number) => {
    const isUser = message.role === "user"
    const isAssistant = message.role === "assistant"

    return (
      <div key={message.id || index} className={cn("flex gap-3 p-4", isUser ? "justify-end" : "justify-start")}>
        {!isUser && (
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
          </div>
        )}

        <div className={cn("max-w-[80%] space-y-2", isUser && "order-first")}>
          <div
            className={cn(
              "rounded-lg px-4 py-2 text-sm",
              isUser ? "bg-primary text-primary-foreground ml-auto" : "bg-muted text-muted-foreground",
            )}
          >
            {typeof message.content === "string" ? (
              <div className="whitespace-pre-wrap">{message.content}</div>
            ) : (
              <div>复杂内容类型</div>
            )}
          </div>

          <div className="text-xs text-muted-foreground">{new Date(message.timestamp).toLocaleTimeString()}</div>
        </div>

        {isUser && (
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
          </div>
        )}
      </div>
    )
  }, [])

  // 如果未初始化
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="ml-2">初始化中...</span>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* 智能体信息 */}
      {currentAgent && (
        <div className="p-4 border-b bg-muted/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">{currentAgent.name}</h3>
              <p className="text-sm text-muted-foreground">{currentAgent.description}</p>
            </div>
            <Badge variant="secondary" className="ml-auto">
              {currentAgent.model}
            </Badge>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <Alert variant="destructive" className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* 变量配置表单 */}
      {showVariableForm && (
        <Card className="m-4 p-4">
          <h3 className="font-medium mb-4">请填写必要信息</h3>
          <div className="space-y-4">
            {Object.entries(requiredVariables).map(([key, config]: [string, any]) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1">
                  {config.label}
                  {config.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-md"
                  placeholder={config.description}
                  value={variableValues[key] || ""}
                  onChange={(e) =>
                    setVariableValues((prev) => ({
                      ...prev,
                      [key]: e.target.value,
                    }))
                  }
                />
              </div>
            ))}
            <Button onClick={handleSubmitVariables} className="w-full">
              确认配置
            </Button>
          </div>
        </Card>
      )}

      {/* 消息列表 */}
      <ScrollArea className="flex-1">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>开始与智能体对话吧</p>
              {getSuggestedQuestions().length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm">建议问题：</p>
                  {getSuggestedQuestions()
                    .slice(0, 3)
                    .map((question: string, index: number) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => setInput(question)}
                        className="block mx-auto"
                      >
                        {question}
                      </Button>
                    ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-0">
            {messages.map(renderMessage)}
            {isRunning && (
              <div className="flex gap-3 p-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg px-4 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* 输入区域 */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={currentAgent ? `与 ${currentAgent.name} 对话...` : "输入消息..."}
            className="flex-1 min-h-[60px] resize-none"
            disabled={isRunning || showVariableForm}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!input.trim() || isRunning || showVariableForm}
            size="icon"
            className="h-[60px] w-[60px]"
          >
            {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>

        {/* 状态信息 */}
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>Thread: {threadId}</span>
          <span>Events: {events.length}</span>
        </div>
      </div>
    </div>
  )
}
