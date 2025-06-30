// @ts-nocheck
"use client"

import { useEffect, useRef } from "react"
import type { BaseEvent } from "@/lib/ag-ui/types"

interface AgUIEventListenerProps {
  events: BaseEvent[]
  onTextMessageContent?: (_messageId: string, _content: string) => void
  onTextMessageEnd?: (_messageId: string) => void
  onToolCall?: (_toolCallId: string, _name: string, _args: string) => void
  onStateChange?: (_state: Record<string, any>) => void
  onSuggestedQuestions?: (_questions: string[]) => void
  onFeedbackResult?: (_result: any) => void
  onLongImageGenerated?: (_imageUrl: string) => void
  onBatchForwardResult?: (_result: any) => void
  onError?: (_error: Error) => void
}

export function AgUIEventListener({
  events,
  onTextMessageContent,
  onTextMessageEnd,
  onToolCall,
  onStateChange,
  onSuggestedQuestions,
  onFeedbackResult,
  onLongImageGenerated,
  onBatchForwardResult,
  onError,
}: AgUIEventListenerProps) {
  // 使用ref跟踪上次处理的事件索引
  const lastProcessedIndexRef = useRef(-1)

  useEffect(() => {
    // 只处理新事件
    if (events.length <= lastProcessedIndexRef.current + 1) {return}

    // 处理从上次处理位置之后的所有新事件
    for (let i = lastProcessedIndexRef.current + 1; i < events.length; i++) {
      const event = events[i]

      try {
        switch (event.type) {
          case "TEXT_MESSAGE_CONTENT":
            onTextMessageContent?.((event as any).messageId, (event as any).delta)
            break

          case "TEXT_MESSAGE_END":
            onTextMessageEnd?.((event as any).messageId)
            break

          case "TOOL_CALL_ARGS":
            onToolCall?.(
              (event as any).toolCallId,
              events.find((e) => e.type === "TOOL_CALL_START" && (e as any).toolCallId === (event as any).toolCallId)
                ? (
                    events.find(
                      (e) => e.type === "TOOL_CALL_START" && (e as any).toolCallId === (event as any).toolCallId,
                    ) as any
                  ).toolCallName
                : "unknown",
              (event as any).delta,
            )
            break

          case "STATE_SNAPSHOT":
            onStateChange?.((event as any).snapshot)
            break

          case "CUSTOM":
            const customEvent = event as any
            if (customEvent.name === "suggested_questions") {
              onSuggestedQuestions?.(customEvent.value)
            } else if (customEvent.name === "message_feedback") {
              onFeedbackResult?.(customEvent.value)
            } else if (customEvent.name === "long_image_generated") {
              onLongImageGenerated?.(customEvent.value.imageUrl)
            } else if (customEvent.name === "batch_forward_completed") {
              onBatchForwardResult?.(customEvent.value)
            }
            break

          case "RUN_ERROR":
            onError?.(new Error((event as any).message))
            break
        }
      } catch (error) {
        // console.error("Error processing AG-UI event:", error)
      }
    }

    // 更新最后处理的事件索引
    lastProcessedIndexRef.current = events.length - 1
  }, [
    events,
    onTextMessageContent,
    onTextMessageEnd,
    onToolCall,
    onStateChange,
    onSuggestedQuestions,
    onFeedbackResult,
    onLongImageGenerated,
    onBatchForwardResult,
    onError,
  ])

  // 这个组件不渲染任何内容
  return null
}
