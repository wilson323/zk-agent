// @ts-nocheck
/**
 * AG-UI协议标准类型定义
 * 严格遵循 https://github.com/ag-ui-protocol/ag-ui 规范
 * @deprecated 请使用 ../../shared/ag-ui-types.ts 中的统一类型定义
 */

// 重新导出统一的类型定义
export {
  BaseEvent,
  RunStartedEvent,
  RunFinishedEvent,
  RunErrorEvent,
  RunCancelledEvent,
  TextMessageStartEvent,
  TextMessageContentEvent,
  TextMessageEndEvent,
  ToolCallStartEvent,
  ToolCallEndEvent,
  AgUiEvent,
  EventHandler,
  AgUiEventEmitter,
  AG_UI_PROTOCOL_VERSION
} from '../../shared/ag-ui-types';

// 协议特定的类型别名（保持向后兼容）
export type { BaseEvent as ProtocolBaseEvent } from '../../shared/ag-ui-types';
export type { RunStartedEvent as ProtocolRunStartedEvent } from '../../shared/ag-ui-types';
export type { RunFinishedEvent as ProtocolRunFinishedEvent } from '../../shared/ag-ui-types';
export type { RunErrorEvent as ProtocolRunErrorEvent } from '../../shared/ag-ui-types';
export type { TextMessageStartEvent as ProtocolTextMessageStartEvent } from '../../shared/ag-ui-types';
export type { TextMessageContentEvent as ProtocolTextMessageContentEvent } from '../../shared/ag-ui-types';
export type { TextMessageEndEvent as ProtocolTextMessageEndEvent } from '../../shared/ag-ui-types';

export interface TextMessageEndEventProtocol extends BaseEvent {
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
