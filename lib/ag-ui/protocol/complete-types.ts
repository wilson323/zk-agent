// @ts-nocheck
/**
 * AG-UI协议完整类型定义
 * 包含所有可能的协议特性，为未来扩展做准备
 */

// 基础协议版本
export const AG_UI_PROTOCOL_VERSION = "1.0.0"

// 扩展事件类型
export interface BaseEvent {
  type: string
  timestamp: number
  id?: string
  source?: string
  metadata?: Record<string, any>
}

// 运行生命周期事件
export interface RunStartedEvent extends BaseEvent {
  type: "run-started"
  threadId: string
  runId: string
  agentId?: string
  config?: RunConfig
}

export interface RunFinishedEvent extends BaseEvent {
  type: "run-finished"
  threadId: string
  runId: string
  duration?: number
  tokensUsed?: number
  cost?: number
}

export interface RunErrorEvent extends BaseEvent {
  type: "run-error"
  threadId: string
  runId: string
  error: {
    code: string
    message: string
    details?: any
    stack?: string
  }
}

export interface RunCancelledEvent extends BaseEvent {
  type: "run-cancelled"
  threadId: string
  runId: string
  reason?: string
}

export interface RunPausedEvent extends BaseEvent {
  type: "run-paused"
  threadId: string
  runId: string
}

export interface RunResumedEvent extends BaseEvent {
  type: "run-resumed"
  threadId: string
  runId: string
}

// 消息事件
export interface TextMessageStartEvent extends BaseEvent {
  type: "text-message-start"
  messageId: string
  role: "user" | "assistant" | "system" | "tool"
  parentMessageId?: string
}

export interface TextMessageContentEvent extends BaseEvent {
  type: "text-message-content"
  messageId: string
  delta: string
  contentType?: "text" | "markdown" | "html" | "json"
}

export interface TextMessageEndEvent extends BaseEvent {
  type: "text-message-end"
  messageId: string
  finalContent?: string
  tokensUsed?: number
}

// 多媒体消息事件
export interface ImageMessageEvent extends BaseEvent {
  type: "image-message"
  messageId: string
  imageUrl: string
  imageType: "png" | "jpg" | "gif" | "webp" | "svg"
  width?: number
  height?: number
  alt?: string
}

export interface AudioMessageEvent extends BaseEvent {
  type: "audio-message"
  messageId: string
  audioUrl: string
  audioType: "mp3" | "wav" | "ogg" | "m4a"
  duration?: number
  transcript?: string
}

export interface VideoMessageEvent extends BaseEvent {
  type: "video-message"
  messageId: string
  videoUrl: string
  videoType: "mp4" | "webm" | "avi" | "mov"
  duration?: number
  width?: number
  height?: number
  thumbnail?: string
}

export interface FileMessageEvent extends BaseEvent {
  type: "file-message"
  messageId: string
  fileUrl: string
  fileName: string
  fileType: string
  fileSize: number
  checksum?: string
}

// 工具调用事件
export interface ToolCallStartEvent extends BaseEvent {
  type: "tool-call-start"
  toolCallId: string
  toolName: string
  parentMessageId: string
  expectedDuration?: number
}

export interface ToolCallArgsEvent extends BaseEvent {
  type: "tool-call-args"
  toolCallId: string
  argsJson: string
  argsSchema?: any
}

export interface ToolCallProgressEvent extends BaseEvent {
  type: "tool-call-progress"
  toolCallId: string
  progress: number
  status: string
  estimatedTimeRemaining?: number
}

export interface ToolCallResultEvent extends BaseEvent {
  type: "tool-call-result"
  toolCallId: string
  result: any
  resultType?: "success" | "error" | "partial"
  executionTime?: number
}

export interface ToolCallEndEvent extends BaseEvent {
  type: "tool-call-end"
  toolCallId: string
  success: boolean
  error?: string
}

// 状态管理事件
export interface StateSnapshotEvent extends BaseEvent {
  type: "state-snapshot"
  state: Record<string, any>
  version?: number
  checksum?: string
}

export interface StateDeltaEvent extends BaseEvent {
  type: "state-delta"
  delta: any[]
  version: number
  previousVersion: number
}

export interface StateResetEvent extends BaseEvent {
  type: "state-reset"
  reason?: string
}

export interface StateValidationEvent extends BaseEvent {
  type: "state-validation"
  isValid: boolean
  errors?: string[]
}

// 用户交互事件
export interface UserInputStartEvent extends BaseEvent {
  type: "user-input-start"
  inputType: "text" | "voice" | "file" | "image" | "video"
  expectedFormat?: string
}

export interface UserInputEndEvent extends BaseEvent {
  type: "user-input-end"
  inputType: "text" | "voice" | "file" | "image" | "video"
  inputData: any
}

export interface UserFeedbackEvent extends BaseEvent {
  type: "user-feedback"
  messageId: string
  feedbackType: "like" | "dislike" | "flag" | "share" | "bookmark"
  comment?: string
  rating?: number
}

// 系统事件
export interface SystemStatusEvent extends BaseEvent {
  type: "system-status"
  status: "healthy" | "degraded" | "unhealthy"
  details?: Record<string, any>
}

export interface SystemMetricsEvent extends BaseEvent {
  type: "system-metrics"
  metrics: {
    cpu?: number
    memory?: number
    network?: number
    latency?: number
    throughput?: number
  }
}

export interface SystemLogEvent extends BaseEvent {
  type: "system-log"
  level: "debug" | "info" | "warn" | "error" | "fatal"
  message: string
  context?: Record<string, any>
}

// 协作事件
export interface CollaborationJoinEvent extends BaseEvent {
  type: "collaboration-join"
  userId: string
  userName: string
  role?: string
}

export interface CollaborationLeaveEvent extends BaseEvent {
  type: "collaboration-leave"
  userId: string
  reason?: string
}

export interface CollaborationCursorEvent extends BaseEvent {
  type: "collaboration-cursor"
  userId: string
  position: { x: number; y: number }
  selection?: any
}

export interface CollaborationEditEvent extends BaseEvent {
  type: "collaboration-edit"
  userId: string
  operation: any
  timestamp: number
}

// 自定义事件
export interface CustomEvent extends BaseEvent {
  type: "custom"
  name: string
  data: any
  schema?: any
}

// 联合类型
export type AgUIEvent =
  | RunStartedEvent
  | RunFinishedEvent
  | RunErrorEvent
  | RunCancelledEvent
  | RunPausedEvent
  | RunResumedEvent
  | TextMessageStartEvent
  | TextMessageContentEvent
  | TextMessageEndEvent
  | ImageMessageEvent
  | AudioMessageEvent
  | VideoMessageEvent
  | FileMessageEvent
  | ToolCallStartEvent
  | ToolCallArgsEvent
  | ToolCallProgressEvent
  | ToolCallResultEvent
  | ToolCallEndEvent
  | StateSnapshotEvent
  | StateDeltaEvent
  | StateResetEvent
  | StateValidationEvent
  | UserInputStartEvent
  | UserInputEndEvent
  | UserFeedbackEvent
  | SystemStatusEvent
  | SystemMetricsEvent
  | SystemLogEvent
  | CollaborationJoinEvent
  | CollaborationLeaveEvent
  | CollaborationCursorEvent
  | CollaborationEditEvent
  | CustomEvent

// 扩展消息类型
export interface Message {
  id: string
  role: "user" | "assistant" | "system" | "tool"
  content: string | ToolCall[] | MediaContent[]
  name?: string
  timestamp: number
  parentId?: string
  threadId?: string
  metadata?: Record<string, any>
  attachments?: Attachment[]
  reactions?: Reaction[]
  editHistory?: MessageEdit[]
}

export interface MediaContent {
  type: "image" | "audio" | "video" | "file"
  url: string
  mimeType: string
  size?: number
  metadata?: Record<string, any>
}

export interface Attachment {
  id: string
  name: string
  type: string
  url: string
  size: number
  metadata?: Record<string, any>
}

export interface Reaction {
  type: string
  userId: string
  timestamp: number
}

export interface MessageEdit {
  timestamp: number
  previousContent: string
  reason?: string
}

// 扩展工具类型
export interface Tool {
  type: "function" | "plugin" | "service" | "workflow"
  function: {
    name: string
    description: string
    parameters: {
      type: "object"
      properties: Record<string, any>
      required?: string[]
    }
    returns?: {
      type: string
      description: string
      schema?: any
    }
  }
  metadata?: {
    version?: string
    author?: string
    category?: string
    tags?: string[]
    documentation?: string
    examples?: any[]
  }
  config?: {
    timeout?: number
    retries?: number
    rateLimit?: number
    permissions?: string[]
  }
}

export interface ToolCall {
  id: string
  type: "function" | "plugin" | "service" | "workflow"
  function: {
    name: string
    arguments: string
  }
  metadata?: Record<string, any>
}

// 扩展智能体定义
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
  metadata?: {
    version?: string
    author?: string
    category?: string
    tags?: string[]
    protocolVersion?: string
    capabilities?: string[]
    limitations?: string[]
    documentation?: string
    examples?: any[]
  }
  config?: {
    timeout?: number
    retries?: number
    rateLimit?: number
    memoryLimit?: number
    permissions?: string[]
    security?: {
      allowedDomains?: string[]
      blockedDomains?: string[]
      maxFileSize?: number
      allowedFileTypes?: string[]
    }
  }
  ui?: {
    avatar?: string
    theme?: string
    layout?: string
    customComponents?: any[]
  }
}

// 扩展运行配置
export interface RunConfig {
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
  tools?: Tool[]
  timeout?: number
  retries?: number
  parallel?: boolean
  priority?: "low" | "normal" | "high"
  metadata?: Record<string, any>
  callbacks?: {
    onProgress?: (progress: number) => void
    onError?: (error: Error) => void
    onComplete?: (result: any) => void
  }
}

// 扩展运行输入
export interface RunInput {
  threadId: string
  runId: string
  messages: Message[]
  tools: Tool[]
  state: Record<string, any>
  context?: any[]
  forwardedProps?: Record<string, any>
  config?: RunConfig
  user?: {
    id: string
    name?: string
    role?: string
    permissions?: string[]
  }
  session?: {
    id: string
    startTime: number
    metadata?: Record<string, any>
  }
}

// 协议扩展接口
export interface ProtocolExtension {
  name: string
  version: string
  eventTypes: string[]
  messageTypes: string[]
  toolTypes: string[]
  initialize(): Promise<void>
  dispose(): Promise<void>
}

// 插件接口
export interface AgUIPlugin {
  name: string
  version: string
  description: string
  dependencies?: string[]
  install(): Promise<void>
  uninstall(): Promise<void>
  activate(): Promise<void>
  deactivate(): Promise<void>
}
