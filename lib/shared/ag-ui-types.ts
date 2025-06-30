/**
 * AG-UI 统一类型定义
 * 整合所有 AG-UI 相关的重复接口定义
 */

// 基础事件接口
export interface BaseEvent {
  type: string;
  timestamp: number;
  id?: string;
  source?: string;
  metadata?: Record<string, any>;
  // 兼容旧版本字段
  threadId?: string;
  runId?: string;
  messageId?: string;
  toolCallId?: string;
  name?: string;
  snapshot?: Record<string, any>;
  message?: string;
  role?: string;
  delta?: string;
  toolCallName?: string;
  value?: any;
  code?: number;
  parentMessageId?: string;
}

// 运行配置接口
export interface RunConfig {
  agentId?: string;
  timeout?: number;
  maxTokens?: number;
  temperature?: number;
  [key: string]: any;
}

// 运行相关事件
export interface RunStartedEvent extends BaseEvent {
  type: "run-started" | "RUN_STARTED";
  threadId: string;
  runId: string;
  agentId?: string;
  config?: RunConfig;
}

export interface RunFinishedEvent extends BaseEvent {
  type: "run-finished" | "RUN_FINISHED";
  threadId: string;
  runId: string;
  duration?: number;
  tokensUsed?: number;
  cost?: number;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost?: number;
  };
}

export interface RunErrorEvent extends BaseEvent {
  type: "run-error" | "RUN_ERROR";
  threadId?: string;
  runId?: string;
  message: string;
  code?: string | number;
  error?: {
    code: string;
    message: string;
    details?: any;
    stack?: string;
  };
}

export interface RunCancelledEvent extends BaseEvent {
  type: "run-cancelled";
  threadId: string;
  runId: string;
  reason?: string;
}

// 消息相关事件
export interface TextMessageStartEvent extends BaseEvent {
  type: "text-message-start";
  messageId: string;
  role: "user" | "assistant" | "system";
}

export interface TextMessageContentEvent extends BaseEvent {
  type: "text-message-content";
  messageId: string;
  delta: string;
}

export interface TextMessageEndEvent extends BaseEvent {
  type: "text-message-end";
  messageId: string;
}

// 工具调用相关事件
export interface ToolCallStartEvent extends BaseEvent {
  type: "tool-call-start";
  toolCallId: string;
  toolName: string;
  args: Record<string, any>;
}

export interface ToolCallEndEvent extends BaseEvent {
  type: "tool-call-end";
  toolCallId: string;
  result?: any;
  error?: string;
}

// 联合类型
export type AgUiEvent = 
  | RunStartedEvent
  | RunFinishedEvent
  | RunErrorEvent
  | RunCancelledEvent
  | TextMessageStartEvent
  | TextMessageContentEvent
  | TextMessageEndEvent
  | ToolCallStartEvent
  | ToolCallEndEvent;

// 协议版本
export const AG_UI_PROTOCOL_VERSION = "1.0.0";

// 事件处理器类型
export type EventHandler<T extends BaseEvent = BaseEvent> = (event: T) => void | Promise<void>;

// 事件发射器接口
export interface AgUiEventEmitter {
  on<T extends AgUiEvent>(eventType: T['type'], handler: EventHandler<T>): void;
  off<T extends AgUiEvent>(eventType: T['type'], handler: EventHandler<T>): void;
  emit<T extends AgUiEvent>(event: T): void;
}