// @ts-nocheck
/**
 * AG-UI 事件类型定义
 */

// 基础事件接口
export interface BaseEvent {
  type: string
  timestamp: number
}

// 运行开始事件
export interface RunStartedEvent extends BaseEvent {
  type: "RUN_STARTED"
  threadId: string
  runId: string
}

// 运行结束事件
export interface RunFinishedEvent extends BaseEvent {
  type: "RUN_FINISHED"
  threadId: string
  runId: string
}

// 运行错误事件
export interface RunErrorEvent extends BaseEvent {
  type: "RUN_ERROR"
  message: string
  code: number
}

// 文本消息开始事件
export interface TextMessageStartEvent extends BaseEvent {
  type: "TEXT_MESSAGE_START"
  messageId: string
  role: string
}

// 文本消息内容事件
export interface TextMessageContentEvent extends BaseEvent {
  type: "TEXT_MESSAGE_CONTENT"
  messageId: string
  delta: string
}

// 文本消息结束事件
export interface TextMessageEndEvent extends BaseEvent {
  type: "TEXT_MESSAGE_END"
  messageId: string
}

// 文本消息块事件（优化版）
export interface TextMessageChunkEvent extends BaseEvent {
  type: "TEXT_MESSAGE_CHUNK"
  messageId: string
  role: string
  delta: string
}

// 工具调用开始事件
export interface ToolCallStartEvent extends BaseEvent {
  type: "TOOL_CALL_START"
  toolCallId: string
  toolCallName: string
  parentMessageId: string
}

// 工具调用参数事件
export interface ToolCallArgsEvent extends BaseEvent {
  type: "TOOL_CALL_ARGS"
  toolCallId: string
  delta: string
}

// 工具调用结束事件
export interface ToolCallEndEvent extends BaseEvent {
  type: "TOOL_CALL_END"
  toolCallId: string
}

// 工具调用块事件（优化版）
export interface ToolCallChunkEvent extends BaseEvent {
  type: "TOOL_CALL_CHUNK"
  toolCallId: string
  toolCallName: string
  parentMessageId: string
  delta: string
}

// 状态快照事件
export interface StateSnapshotEvent extends BaseEvent {
  type: "STATE_SNAPSHOT"
  snapshot: Record<string, any>
}

// 状态增量事件
export interface StateDeltaEvent extends BaseEvent {
  type: "STATE_DELTA"
  delta: any[] // JSON Patch 数组
}

// 消息快照事件
export interface MessagesSnapshotEvent extends BaseEvent {
  type: "MESSAGES_SNAPSHOT"
  messages: any[]
}

// 原始事件
export interface RawEvent extends BaseEvent {
  type: "RAW"
  event: any
  source: string
}

// 自定义事件
export interface CustomEvent extends BaseEvent {
  type: "CUSTOM"
  name: string
  value: any
}

// 步骤开始事件
export interface StepStartedEvent extends BaseEvent {
  type: "STEP_STARTED"
  stepName: string
}

// 步骤结束事件
export interface StepFinishedEvent extends BaseEvent {
  type: "STEP_FINISHED"
  stepName: string
}

// 消息类型
export interface Message {
  id: string
  role: "user" | "assistant" | "tool" | "developer" | "system"
  content: string
  name?: string
  toolCalls?: ToolCall[]
}

// 工具调用
export interface ToolCall {
  id: string
  type: "function"
  function: {
    name: string
    arguments: string
  }
}

// 工具定义
export interface Tool {
  name: string
  description: string
  parameters: Record<string, any> // JSON Schema
}

// Agent执行输入
export interface RunAgentInput {
  threadId: string
  runId: string
  state: Record<string, any>
  messages: Message[]
  tools: Tool[]
  context: any[]
  forwardedProps: Record<string, any>
}
