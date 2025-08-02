/**
 * @file AG-UI核心类型定义
 * @description 定义AG-UI系统中使用的核心类型和接口
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

// 重新导出协议类型
export type { Tool, ToolFunction, AgentDefinition, AgentMetadata, AgentRuntimeState, ToolExecutionResult, AgentExecutionContext } from './protocol/types';
export { AgentStatus } from './protocol/types';

/**
 * AG-UI系统配置
 */
export interface AgUIConfig {
  /** API端点 */
  apiEndpoint?: string;
  /** 是否启用调试模式 */
  debug?: boolean;
  /** 是否启用中间件 */
  enableMiddleware?: boolean;
  /** 是否启用内置工具 */
  enableBuiltinTools?: boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retryCount?: number;
}

/**
 * AG-UI运行时选项
 */
export interface AgUIRuntimeOptions extends AgUIConfig {
  /** 线程ID */
  threadId: string;
  /** 运行ID */
  runId?: string;
}

/**
 * AG-UI事件类型
 */
export enum AgUIEventType {
  /** 智能体状态变化 */
  AGENT_STATUS_CHANGED = 'agent_status_changed',
  /** 工具执行开始 */
  TOOL_EXECUTION_STARTED = 'tool_execution_started',
  /** 工具执行完成 */
  TOOL_EXECUTION_COMPLETED = 'tool_execution_completed',
  /** 工具执行失败 */
  TOOL_EXECUTION_FAILED = 'tool_execution_failed',
  /** 消息接收 */
  MESSAGE_RECEIVED = 'message_received',
  /** 消息发送 */
  MESSAGE_SENT = 'message_sent',
  /** 错误发生 */
  ERROR_OCCURRED = 'error_occurred',
}

/**
 * AG-UI事件数据
 */
export interface AgUIEventData {
  /** 事件类型 */
  type: AgUIEventType;
  /** 事件时间戳 */
  timestamp: Date;
  /** 事件数据 */
  data: any;
  /** 智能体ID */
  agentId?: string;
  /** 线程ID */
  threadId?: string;
}

/**
 * AG-UI错误类型
 */
export enum AgUIErrorType {
  /** 配置错误 */
  CONFIG_ERROR = 'config_error',
  /** 网络错误 */
  NETWORK_ERROR = 'network_error',
  /** 认证错误 */
  AUTH_ERROR = 'auth_error',
  /** 工具错误 */
  TOOL_ERROR = 'tool_error',
  /** 智能体错误 */
  AGENT_ERROR = 'agent_error',
  /** 运行时错误 */
  RUNTIME_ERROR = 'runtime_error',
}

/**
 * AG-UI错误信息
 */
export interface AgUIError {
  /** 错误类型 */
  type: AgUIErrorType;
  /** 错误消息 */
  message: string;
  /** 错误代码 */
  code?: string;
  /** 错误详情 */
  details?: any;
  /** 错误堆栈 */
  stack?: string;
}