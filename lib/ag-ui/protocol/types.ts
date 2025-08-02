/**
 * AG-UI协议类型定义
 * @description 严格遵循官方AG-UI协议标准的类型定义
 * @see https://docs.ag-ui.com/
 * @author ZK-Agent Team
 * @date 2024-12-19
 * @version 1.0.0 - 对齐官方AG-UI协议标准
 */

/**
 * AG-UI协议版本
 */
export const AG_UI_PROTOCOL_VERSION = '1.0.0';

/**
 * 官方AG-UI事件类型枚举
 * 严格遵循官方16种标准事件类型
 */
export enum EventType {
  // 运行生命周期事件
  RUN_STARTED = 'run.started',
  RUN_FINISHED = 'run.finished',
  RUN_ERROR = 'run.error',
  
  // 消息事件
  TEXT_MESSAGE_START = 'text_message.start',
  TEXT_MESSAGE_CONTENT = 'text_message.content',
  TEXT_MESSAGE_CHUNK = 'text_message.chunk',
  TEXT_MESSAGE_END = 'text_message.end',
  
  // 工具调用事件
  TOOL_CALL_START = 'tool_call.start',
  TOOL_CALL_ARGS = 'tool_call.args',
  TOOL_CALL_RESULT = 'tool_call.result',
  TOOL_CALL_END = 'tool_call.end',
  
  // 状态管理事件
  STATE_DELTA = 'state.delta',
  STATE_SNAPSHOT = 'state.snapshot',
  
  // 媒体和UI事件
  MEDIA_FRAME = 'media.frame',
  UI_COMPONENT = 'ui.component',
  
  // 用户交互事件
  USER_INPUT = 'user.input'
}

/**
 * 工具函数定义
 */
export interface ToolFunction {
  /** 工具名称 */
  name: string;
  /** 工具描述 */
  description: string;
  /** 工具参数定义 */
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * 工具定义
 */
export interface Tool {
  /** 工具类型 */
  type: 'function';
  /** 工具函数定义 */
  function: ToolFunction;
}

/**
 * 智能体元数据
 */
export interface AgentMetadata {
  /** 协议版本 */
  protocolVersion?: string;
  /** 智能体能力列表 */
  capabilities?: string[];
  /** 智能体分类 */
  category?: string;
  /** 智能体类型 */
  type?: string;
  /** 创建时间 */
  createdAt?: string;
  /** 更新时间 */
  updatedAt?: string;
  /** 其他自定义元数据 */
  [key: string]: any;
}

/**
 * 基础事件接口
 * 所有AG-UI事件都必须实现此接口
 */
export interface BaseEvent {
  /** 事件类型 */
  type: EventType | string;
  /** 事件时间戳 */
  timestamp: number;
  /** 线程ID */
  threadId?: string;
  /** 运行ID */
  runId?: string;
  /** 消息ID */
  messageId?: string;
  /** 事件数据 */
  data?: any;
}

/**
 * 运行配置
 */
export interface RunConfig {
  /** 温度参数 */
  temperature?: number;
  /** 最大令牌数 */
  maxTokens?: number;
  /** 顶部P采样 */
  topP?: number;
  /** 频率惩罚 */
  frequencyPenalty?: number;
  /** 存在惩罚 */
  presencePenalty?: number;
  /** 其他配置参数 */
  [key: string]: any;
}

/**
 * 运行代理输入参数
 */
export interface RunAgentInput {
  /** 线程ID */
  threadId: string;
  /** 运行ID */
  runId: string;
  /** 消息列表 */
  messages: Message[];
  /** 可用工具 */
  tools?: Tool[];
  /** 运行状态 */
  state?: Record<string, any>;
  /** 运行配置 */
  config?: RunConfig;
}

/**
 * 运行输入参数（RunAgentInput的别名）
 */
export interface RunInput {
  /** 线程ID */
  threadId: string;
  /** 运行ID */
  runId: string;
  /** 消息列表 */
  messages: Message[];
  /** 可用工具 */
  tools?: Tool[];
  /** 运行状态 */
  state?: Record<string, any>;
  /** 运行配置 */
  config?: RunConfig;
}

/**
 * 智能体定义
 * 
 * 定义了AG-UI协议中智能体的完整结构，包括基本信息、
 * 配置参数、工具列表和元数据等。
 */
export interface AgentDefinition {
  /** 智能体唯一标识符 */
  id: string;
  /** 智能体名称 */
  name: string;
  /** 智能体描述 */
  description: string;
  /** 智能体指令/提示词 */
  instructions: string;
  /** 使用的AI模型 */
  model: string;
  /** 智能体可用工具列表 */
  tools: Tool[];
  /** 智能体变量 */
  variables?: Record<string, any>;
  /** 智能体元数据 */
  metadata?: AgentMetadata;
  /** 智能体配置 */
  config?: {
    /** 温度参数 */
    temperature?: number;
    /** 最大令牌数 */
    maxTokens?: number;
    /** 顶部P采样 */
    topP?: number;
    /** 频率惩罚 */
    frequencyPenalty?: number;
    /** 存在惩罚 */
    presencePenalty?: number;
    /** 其他配置参数 */
    [key: string]: any;
  };
}

/**
 * 智能体状态
 */
export enum AgentStatus {
  /** 活跃状态 */
  ACTIVE = 'active',
  /** 非活跃状态 */
  INACTIVE = 'inactive',
  /** 错误状态 */
  ERROR = 'error',
  /** 维护状态 */
  MAINTENANCE = 'maintenance',
}

/**
 * 智能体运行时状态
 */
export interface AgentRuntimeState {
  /** 智能体ID */
  agentId?: string;
  /** 线程ID */
  threadId?: string;
  /** 运行ID */
  runId?: string;
  /** 当前状态 */
  status: AgentStatus;
  /** 最后活动时间 */
  lastActivity?: Date;
  /** 错误信息 */
  error?: string;
  /** 运行时变量 */
  variables?: Record<string, any>;
}

/**
 * 工具执行结果
 */
export interface ToolExecutionResult {
  /** 是否成功 */
  success: boolean;
  /** 执行结果数据 */
  data?: any;
  /** 错误信息 */
  error?: string;
  /** 执行时间（毫秒） */
  executionTime?: number;
}

/**
 * 智能体执行上下文
 */
export interface AgentExecutionContext {
  /** 智能体定义 */
  agent: AgentDefinition;
  /** 运行时状态 */
  state: AgentRuntimeState;
  /** 可用工具 */
  tools: Map<string, Tool>;
  /** 执行历史 */
  history?: any[];
}

// 移除旧的接口定义，使用新的BaseEvent和RunAgentInput

/**
 * 消息接口
 */
export interface Message {
  /** 消息ID */
  id: string;
  /** 消息角色 */
  role: 'user' | 'assistant' | 'system';
  /** 消息内容 */
  content: string;
  /** 创建时间 */
  timestamp: number;
  /** 附加数据 */
  metadata?: Record<string, any>;
}

// ==================== 官方AG-UI协议事件接口 ====================

/**
 * 运行开始事件
 * 当代理开始执行时发出
 */
export interface RunStartedEvent extends BaseEvent {
  type: EventType.RUN_STARTED;
  threadId: string;
  runId: string;
}

/**
 * 运行完成事件
 * 当代理执行完成时发出
 */
export interface RunFinishedEvent extends BaseEvent {
  type: EventType.RUN_FINISHED;
  threadId: string;
  runId: string;
  result?: any;
  duration?: number;
}

/**
 * 运行错误事件
 * 当代理执行出错时发出
 */
export interface RunErrorEvent extends BaseEvent {
  type: EventType.RUN_ERROR;
  threadId: string;
  runId: string;
  error: {
    message: string;
    code?: string;
    details?: any;
  };
}

/**
 * 文本消息开始事件
 * 当开始生成文本消息时发出
 */
export interface TextMessageStartEvent extends BaseEvent {
  type: EventType.TEXT_MESSAGE_START;
  messageId: string;
  role?: 'user' | 'assistant' | 'system';
}

/**
 * 文本消息内容事件
 * 当接收到文本消息内容时发出
 */
export interface TextMessageContentEvent extends BaseEvent {
  type: EventType.TEXT_MESSAGE_CONTENT;
  messageId: string;
  content: string;
}

/**
 * 文本消息块事件
 * 用于流式文本传输
 */
export interface TextMessageChunkEvent extends BaseEvent {
  type: EventType.TEXT_MESSAGE_CHUNK;
  messageId: string;
  delta: string;
}

/**
 * 文本消息结束事件
 * 当文本消息生成完成时发出
 */
export interface TextMessageEndEvent extends BaseEvent {
  type: EventType.TEXT_MESSAGE_END;
  messageId: string;
  content?: string;
}

/**
 * 工具调用开始事件
 * 当开始调用工具时发出
 */
export interface ToolCallStartEvent extends BaseEvent {
  type: EventType.TOOL_CALL_START;
  toolCallId: string;
  toolName: string;
  parentMessageId?: string;
}

/**
 * 工具调用参数事件
 * 当接收到工具调用参数时发出
 */
export interface ToolCallArgsEvent extends BaseEvent {
  type: EventType.TOOL_CALL_ARGS;
  toolCallId: string;
  args: string | Record<string, any>;
  delta?: string;
}

/**
 * 工具调用结果事件
 * 当工具调用完成并返回结果时发出
 */
export interface ToolCallResultEvent extends BaseEvent {
  type: EventType.TOOL_CALL_RESULT;
  toolCallId: string;
  result: any;
  success: boolean;
  error?: string;
}

/**
 * 工具调用结束事件
 * 当工具调用流程结束时发出
 */
export interface ToolCallEndEvent extends BaseEvent {
  type: EventType.TOOL_CALL_END;
  toolCallId: string;
  duration?: number;
}

/**
 * 状态增量事件
 * 当状态发生变化时发出，只包含变化的部分
 */
export interface StateDeltaEvent extends BaseEvent {
  type: EventType.STATE_DELTA;
  delta: Record<string, any>;
  path?: string;
}

/**
 * 状态快照事件
 * 发送完整的状态快照
 */
export interface StateSnapshotEvent extends BaseEvent {
  type: EventType.STATE_SNAPSHOT;
  state: Record<string, any>;
  messages?: Message[];
}

/**
 * 媒体帧事件
 * 用于传输媒体内容
 */
export interface MediaFrameEvent extends BaseEvent {
  type: EventType.MEDIA_FRAME;
  mediaType: 'image' | 'video' | 'audio';
  data: string | ArrayBuffer;
  metadata?: Record<string, any>;
}

/**
 * UI组件事件
 * 用于传输UI组件信息
 */
export interface UIComponentEvent extends BaseEvent {
  type: EventType.UI_COMPONENT;
  component: {
    type: string;
    props: Record<string, any>;
    children?: any[];
  };
}

/**
 * 用户输入事件
 * 当用户提供输入时发出
 */
export interface UserInputEvent extends BaseEvent {
  type: EventType.USER_INPUT;
  input: {
    type: 'text' | 'file' | 'action';
    content: any;
    metadata?: Record<string, any>;
  };
}

/**
 * 所有AG-UI事件的联合类型
 */
export type AgUIEvent = 
  | RunStartedEvent
  | RunFinishedEvent
  | RunErrorEvent
  | TextMessageStartEvent
  | TextMessageContentEvent
  | TextMessageChunkEvent
  | TextMessageEndEvent
  | ToolCallStartEvent
  | ToolCallArgsEvent
  | ToolCallResultEvent
  | ToolCallEndEvent
  | StateDeltaEvent
  | StateSnapshotEvent
  | MediaFrameEvent
  | UIComponentEvent
  | UserInputEvent;

/**
 * AG-UI插件接口
 */
export interface AgUIPlugin {
  /** 插件ID */
  id: string;
  /** 插件名称 */
  name: string;
  /** 插件版本 */
  version: string;
  /** 插件描述 */
  description?: string;
  /** 插件初始化 */
  initialize?(): Promise<void> | void;
  /** 插件销毁 */
  destroy?(): Promise<void> | void;
  /** 事件处理器 */
  onEvent?(event: AgUIEvent): Promise<void> | void;
}

/**
 * 协议扩展接口
 */
export interface ProtocolExtension {
  /** 扩展ID */
  id: string;
  /** 扩展名称 */
  name: string;
  /** 扩展版本 */
  version: string;
  /** 扩展描述 */
  description?: string;
  /** 支持的事件类型 */
  supportedEvents?: EventType[];
  /** 扩展初始化 */
  initialize?(): Promise<void> | void;
  /** 扩展销毁 */
  destroy?(): Promise<void> | void;
  /** 处理事件 */
  handleEvent?(event: AgUIEvent): Promise<AgUIEvent | null> | AgUIEvent | null;
}