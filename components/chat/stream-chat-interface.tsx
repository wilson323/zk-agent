// @ts-nocheck
"use client"

import type React from "react"
import { useState, useEffect, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Send, ImageIcon, Mic, Paperclip, Smile } from "lucide-react"
import { useMobile } from "@/hooks/use-mobile"
import { MobileHeader } from "./mobile-header"
import { EnhancedChatMessage } from "./enhanced-chat-message"
import { SuggestedQuestions } from "./suggested-questions"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { getContrastTextColor } from "@/lib/utils/avatar-utils"
import { enhancedFastGPTClient, type ChatContext } from "@/lib/api/enhanced-fastgpt-client"
import { contextMemoryManager } from "@/lib/chat/context-memory-manager"
import { createStreamOptimizer } from "@/lib/chat/stream-optimizer"
import { errorRetryManager } from "@/lib/chat/error-retry-manager"
import { map } from "rxjs"

interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  isFavorite?: boolean
}

export default function StreamChatInterface({
  agentId = "",
  initialSystemPrompt = "",
  userId = "anonymous",
  agentName = "AI 助手",
  agentAvatar = "/images/zkteco-mascot.png",
  onBackClick,
  selectedAgent,
}: {
  agentId?: string
  initialSystemPrompt?: string
  userId?: string
  agentName?: string
  agentAvatar?: string
  onBackClick?: () => void
  selectedAgent?: any // Make sure the selectedAgent is available in this component
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [welcomeMessage, setWelcomeMessage] = useState("")
  const [chatId, setChatId] = useState<string>(`chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`)
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const isMobile = useMobile()
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const recordingInterval = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()
  const [chatContext, setChatContext] = useState<ChatContext | null>(null)
  const [connectionStatus, setConnectionStatus] = useState({ isConnected: false, latency: 0 })
  const [streamMetrics, setStreamMetrics] = useState({ chunksPerSecond: 0, totalBytes: 0 })
  const streamOptimizer = useMemo(() => createStreamOptimizer(), [])

  // Initialize chat
  useEffect(() => {
    const initChat = async () => {
      try {
        // 使用增强的客户端初始化上下文
        const context = await enhancedFastGPTClient.initializeContext(agentId, userId, initialSystemPrompt)

        setChatContext(context)
        setMessages(context.messages)

        // 监听连接状态
        const statusSub = enhancedFastGPTClient.getConnectionStatus().subscribe((status) => {
          setConnectionStatus(status)
        })

        // 监听流式指标
        const metricsSub = streamOptimizer.getMetrics().subscribe((metrics) => {
          setStreamMetrics(metrics)
        })

        return () => {
          statusSub.unsubscribe()
          metricsSub.unsubscribe()
        }
      } catch (error) {
        console.error("Failed to initialize enhanced chat:", error)
        toast({
          title: "初始化失败",
          description: "无法初始化聊天，请刷新页面重试",
          variant: "destructive",
        })
      }
    }

    initChat()
  }, [agentId, initialSystemPrompt, userId])

  // Scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingContent])

  // Focus input on desktop
  useEffect(() => {
    if (!isMobile && inputRef.current && !isLoading) {
      inputRef.current.focus()
    }
  }, [isMobile, isLoading, messages])

  // Adjust padding for mobile header
  useEffect(() => {
    if (isMobile && chatContainerRef.current) {
      chatContainerRef.current.style.paddingTop = "60px"
    } else if (chatContainerRef.current) {
      chatContainerRef.current.style.paddingTop = "0px"
    }
  }, [isMobile])

  // Process streaming response
  const processStreamResponse = async (response: Response) => {
    if (!response.body) {
      throw new Error("Response body is null")
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let done = false
    let accumulatedContent = ""

    setStreamingContent("")

    try {
      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading

        if (done) {break}

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split("\n").filter((line) => line.trim() !== "")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6)

            if (data === "[DONE]") {
              // Stream ended
              break
            }

            try {
              const parsed = JSON.parse(data)
              if (parsed.choices && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                const content = parsed.choices[0].delta.content
                accumulatedContent += content
                setStreamingContent(accumulatedContent)
              }
            } catch (e) {
              console.error("Error parsing stream data:", e)
            }
          }
        }
      }

      // Stream ended, add complete message
      if (accumulatedContent) {
        const newMessage = {
          id: `resp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          role: "assistant" as const,
          content: accumulatedContent,
          timestamp: new Date(),
        }

        setMessages((prev) => [...prev, newMessage])
        setStreamingContent("")

        // Generate new suggested questions based on the conversation
        generateSuggestedQuestions(accumulatedContent)
      }
    } catch (error) {
      console.error("Error processing stream:", error)
    } finally {
      reader.releaseLock()
    }
  }

  // Generate suggested questions based on the conversation
  const generateSuggestedQuestions = (lastResponse: string) => {
    // In a real implementation, this would call an API to generate relevant questions
    // For now, we'll use a simple approach with predefined questions
    const defaultQuestions = [
      "能详细介绍一下这个功能吗？",
      "有没有相关的使用案例？",
      "这个技术的优势是什么？",
      "如何解决常见问题？",
    ]

    setSuggestedQuestions(defaultQuestions)
  }

  // Handle sending message
  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !chatContext) {return}

    setInput("")
    setIsLoading(true)
    setSuggestedQuestions([])

    try {
      // 使用增强客户端发送消息
      const messageStream = enhancedFastGPTClient.sendMessage(
        chatContext.sessionId,
        input,
        [], // 文件支持待实现
      )

      // 应用流式优化
      const optimizedStream = streamOptimizer.optimizeStream(
        messageStream.pipe(
          map((response) => ({
            id: response.id,
            content: response.content,
            delta: response.delta,
            timestamp: Date.now(),
            metadata: response.metadata,
          })),
        ),
      )

      // 使用错误重试
      const retriedStream = errorRetryManager.withRetry(optimizedStream, `chat_${chatContext.sessionId}`)

      // 订阅流式响应
      retriedStream.subscribe({
        next: (chunk) => {
          setStreamingContent(chunk.content)

          if (chunk.metadata?.optimized) {
            console.log("Received optimized chunk:", chunk.metadata)
          }
        },
        error: (error) => {
          console.error("Stream error:", error)
          toast({
            title: "发送失败",
            description: error.message || "消息发送失败，请重试",
            variant: "destructive",
          })
          setStreamingContent("")
        },
        complete: () => {
          // 更新上下文
          const updatedContext = enhancedFastGPTClient.getContext(chatContext.sessionId)
          if (updatedContext) {
            // 应用记忆管理
            const optimizedContext = contextMemoryManager.manageSessionMemory(chatContext.sessionId, updatedContext)

            setChatContext(optimizedContext)
            setMessages(optimizedContext.messages)
          }

          setStreamingContent("")
          setIsLoading(false)

          // 生成建议问题
          generateSuggestedQuestions("")
        },
      })
    } catch (error) {
      console.error("Failed to send message:", error)
      toast({
        title: "发送失败",
        description: "消息发送失败，请重试",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Handle voice input
  const handleVoiceInput = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false)
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current)
        recordingInterval.current = null
      }
      setRecordingTime(0)

      // Simulate voice recognition result
      setTimeout(() => {
        setInput((prev) => prev + "这是通过语音输入的文字。")
      }, 500)
    } else {
      // Start recording
      setIsRecording(true)

      // Timer
      recordingInterval.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    }
  }

  // Format recording time
  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Handle message feedback
  const handleMessageFeedback = (messageId: string, type: "like" | "dislike", comment?: string) => {
    // In a real implementation, this would send feedback to the server
    toast({
      title: type === "like" ? "感谢您的反馈" : "感谢您的反馈",
      description: comment ? `您的意见：${comment}` : "您的反馈已记录",
    })
  }

  // Handle message copy
  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
    toast({
      title: "已复制",
      description: "消息内容已复制到剪贴板",
    })
  }

  // Handle message favorite
  const handleFavoriteMessage = (messageId: string) => {
    setMessages(messages.map((msg) => (msg.id === messageId ? { ...msg, isFavorite: !msg.isFavorite } : msg)))

    toast({
      title: messages.find((m) => m.id === messageId)?.isFavorite ? "已取消收藏" : "已收藏",
      description: messages.find((m) => m.id === messageId)?.isFavorite ? "消息已从收藏夹中移除" : "消息已添加到收藏夹",
    })
  }

  // Handle suggested question selection
  const handleSelectQuestion = (question: string) => {
    setInput(question)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  return (
    <div className="flex flex-col h-full w-full relative">
      {/* Mobile Header */}
      <MobileHeader title={agentName} subtitle="在线" avatarSrc={agentAvatar} onBackClick={onBackClick} />

      {/* 连接状态指示器 */}
      <div className="fixed top-4 right-4 z-50">
        <div
          className={cn(
            "flex items-center space-x-2 px-3 py-1 rounded-full text-xs",
            connectionStatus.isConnected
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
          )}
        >
          <div className={cn("w-2 h-2 rounded-full", connectionStatus.isConnected ? "bg-green-500" : "bg-red-500")} />
          <span>{connectionStatus.isConnected ? `已连接 (${connectionStatus.latency}ms)` : "连接中断"}</span>
        </div>
      </div>

      {/* 性能指标（开发模式下显示） */}
      {process.env.NODE_ENV === "development" && (
        <div className="fixed bottom-4 left-4 z-50 bg-black/80 text-white text-xs p-2 rounded">
          <div>流速: {streamMetrics.chunksPerSecond.toFixed(1)} chunks/s</div>
          <div>数据: {(streamMetrics.totalBytes / 1024).toFixed(1)} KB</div>
        </div>
      )}

      {/* Chat Container */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto w-full h-full"
        style={{
          height: isMobile ? "calc(100vh - 120px)" : "100%",
          paddingBottom: isMobile ? "70px" : "60px",
        }}
      >
        <div className="flex flex-col w-full h-full p-2 md:p-4 space-y-3 md:space-y-4">
          {/* Suggested Questions */}
          {suggestedQuestions.length > 0 && (
            <SuggestedQuestions
              questions={suggestedQuestions}
              onSelectQuestion={handleSelectQuestion}
              className="mb-2"
            />
          )}

          {/* Messages */}
          {messages
            .filter((msg) => msg.role !== "system")
            .map((message) => (
              <EnhancedChatMessage
                key={message.id}
                message={message}
                agentAvatar={agentAvatar}
                agentName={agentName}
                onCopy={handleCopyMessage}
                onFeedback={handleMessageFeedback}
                onFavorite={handleFavoriteMessage}
              />
            ))}

          {/* Streaming response display */}
          {streamingContent && (
            <div className="flex justify-start animate-fadeIn w-full">
              <div className="flex flex-row max-w-[90%] md:max-w-[80%]">
                <Avatar className="h-8 w-8 mr-2 flex-shrink-0 bg-green-500">
                  {selectedAgent ? (
                    <AvatarFallback
                      style={{
                        backgroundColor: selectedAgent?.config?.avatarColor || "#6cb33f",
                        color: selectedAgent?.config?.avatarColor
                          ? getContrastTextColor(selectedAgent.config.avatarColor)
                          : "#ffffff",
                      }}
                    >
                      {selectedAgent?.name?.charAt(0).toUpperCase() || "AI"}
                    </AvatarFallback>
                  ) : (
                    <AvatarImage src={agentAvatar || "/placeholder.svg"} alt={agentName} />
                  )}
                  {!selectedAgent && <AvatarFallback>{agentName.charAt(0)}</AvatarFallback>}
                </Avatar>
                <Card className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                  <CardContent className="p-2 md:p-3">
                    <div className="whitespace-pre-wrap text-sm md:text-base">{streamingContent}</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {isLoading && !streamingContent && (
            <div className="flex justify-start animate-fadeIn w-full">
              <div className="flex flex-row max-w-[90%] md:max-w-[80%]">
                <Avatar className="h-8 w-8 mr-2 flex-shrink-0 bg-green-500">
                  {selectedAgent ? (
                    <AvatarFallback
                      style={{
                        backgroundColor: selectedAgent?.config?.avatarColor || "#6cb33f",
                        color: selectedAgent?.config?.avatarColor
                          ? getContrastTextColor(selectedAgent.config.avatarColor)
                          : "#ffffff",
                      }}
                    >
                      {selectedAgent?.name?.charAt(0).toUpperCase() || "AI"}
                    </AvatarFallback>
                  ) : (
                    <AvatarImage src={agentAvatar || "/placeholder.svg"} alt={agentName} />
                  )}
                  {!selectedAgent && <AvatarFallback>{agentName.charAt(0)}</AvatarFallback>}
                </Avatar>
                <Card className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                  <CardContent className="p-2 md:p-3 flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-sm md:text-base">思考中...</span>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-2 md:p-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200/80 dark:border-gray-700/80">
        <div className="flex items-end space-x-2 w-full">
          <div className="flex-1 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-2 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus-within:ring-2 focus-within:ring-primary-500/50">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isRecording ? "正在录音..." : "输入消息..."}
              disabled={isLoading || isRecording}
              className="min-h-[40px] w-full resize-none bg-transparent border-0 focus:ring-0 p-2 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-sm md:text-base"
            />

            {isRecording && (
              <div className="flex items-center justify-between px-2 py-1">
                <div className="flex items-center">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse"></span>
                  <span className="text-sm text-red-500">{formatRecordingTime(recordingTime)}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsRecording(false)
                    if (recordingInterval.current) {
                      clearInterval(recordingInterval.current)
                      recordingInterval.current = null
                    }
                    setRecordingTime(0)
                  }}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 py-1 h-7"
                >
                  取消
                </Button>
              </div>
            )}

            <div className="flex justify-between items-center px-2 pt-2">
              <div className="flex space-x-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 rounded-full",
                    isRecording ? "text-red-500 bg-red-100 dark:bg-red-900/30" : "text-gray-500 hover:text-primary-500",
                  )}
                  onClick={handleVoiceInput}
                  disabled={isLoading}
                >
                  <Mic className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-gray-500 hover:text-primary-500"
                  disabled={isLoading || isRecording}
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-gray-500 hover:text-primary-500"
                  disabled={isLoading || isRecording}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-gray-500 hover:text-primary-500"
                  disabled={isLoading || isRecording}
                >
                  <Smile className="h-4 w-4" />
                </Button>
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading || isRecording}
                className={cn(
                  "bg-primary-500 hover:bg-primary-600 text-white rounded-full h-9 w-9 p-0 transition-all duration-200",
                  (!input.trim() || isLoading || isRecording) && "opacity-50 cursor-not-allowed",
                )}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
