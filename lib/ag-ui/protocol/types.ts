// @ts-nocheck
/**
 * AG-UI协议标准类型定义
 * 严格遵循 https://github.com/ag-ui-protocol/ag-ui 规范
 */

// 基础事件接口
export interface BaseEvent {
  type: string
  timestamp: number
}

// 运行相关事件
export interface RunStartedEvent extends BaseEvent {
  type: "run-started"
  threadId: string
  runId: string
}

export interface RunFinishedEvent extends BaseEvent {
  type: "run-finished"
  threadId: string
  runId: string
}

export interface RunErrorEvent extends BaseEvent {
  type: "run-error"
  threadId: string
  runId: string
  error: {
    message: string
    code?: string
    details?: any
  }
}

// 消息相关事件
export interface TextMessageStartEvent extends BaseEvent {
  type: "text-message-start"
  messageId: string
  role: "user" | "assistant" | "system"
}

export interface TextMessageContentEvent extends BaseEvent {
  type: "text-message-content"
  messageId: string
  delta: string
}

export interface TextMessageEndEvent extends BaseEvent {
  type: "text-message-end"
  messageId: string
}

// 工具调用事件
export interface ToolCallStartEvent extends BaseEvent {
  type: "tool-call-start"
  toolCallId: string
  toolName: string
  parentMessageId: string
}

export interface ToolCallArgsEvent extends BaseEvent {
  type: "tool-call-args"
  toolCallId: string
  argsJson: string
}

export interface ToolCallResultEvent extends BaseEvent {
  type: "tool-call-result"
  toolCallId: string
  result: any
}

export interface ToolCallEndEvent extends BaseEvent {
  type: "tool-call-end"
  toolCallId: string
}

// 状态相关事件
export interface StateSnapshotEvent extends BaseEvent {
  type: "state-snapshot"
  state: Record<string, any>
}

export interface StateDeltaEvent extends BaseEvent {
  type: "state-delta"
  delta: any[]
}

// 自定义事件
export interface CustomEvent extends BaseEvent {
  type: "custom"
  name: string
  data: any
}

// 联合类型
export type AgUIEvent =
  | RunStartedEvent
  | RunFinishedEvent
  | RunErrorEvent
  | TextMessageStartEvent
  | TextMessageContentEvent
  | TextMessageEndEvent
  | ToolCallStartEvent
  | ToolCallArgsEvent
  | ToolCallResultEvent
  | ToolCallEndEvent
  | StateSnapshotEvent
  | StateDeltaEvent
  | CustomEvent

// 消息类型
export interface Message {
  id: string
  role: "user" | "assistant" | "system" | "tool"
  content: string | ToolCall[]
  name?: string
  timestamp: number
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
  type: "function"
  function: {
    name: string
    description: string
    parameters: {
      type: "object"
      properties: Record<string, any>
      required?: string[]
    }
  }
}

// Agent定义
export interface AgentDefinition {
  id: string
  name: string
  description: string
  instructions: string
  model: string
  tools: Tool[]
  temperature?: number
  maxTokens?: number
  variables?: Record<string, any>
  metadata?: Record<string, any>
}

// 运行输入
export interface RunInput {
  threadId: string
  runId: string
  messages: Message[]
  tools: Tool[]
  state: Record<string, any>
  context?: any[]
  forwardedProps?: Record<string, any>
}

// 运行配置
export interface RunConfig {
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
  tools?: Tool[]
}
