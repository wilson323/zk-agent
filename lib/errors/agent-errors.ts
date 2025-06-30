/**
 * ZK-Agent 智能体错误处理系统
 * 统一的错误分类体系和错误处理机制
 */

// 智能体错误类型枚举
export enum AgentErrorType {
  // CAD分析错误
  CAD_FILE_PARSE_ERROR = 'CAD_FILE_PARSE_ERROR',
  CAD_FORMAT_UNSUPPORTED = 'CAD_FORMAT_UNSUPPORTED',
  CAD_FILE_CORRUPTED = 'CAD_FILE_CORRUPTED',
  CAD_ANALYSIS_TIMEOUT = 'CAD_ANALYSIS_TIMEOUT',
  
  // 海报生成错误
  POSTER_GENERATION_FAILED = 'POSTER_GENERATION_FAILED',
  POSTER_TEMPLATE_ERROR = 'POSTER_TEMPLATE_ERROR',
  POSTER_RESOURCE_LIMIT = 'POSTER_RESOURCE_LIMIT',
  POSTER_TIMEOUT = 'POSTER_TIMEOUT',
  
  // 对话智能体错误
  CHAT_CONTEXT_LOST = 'CHAT_CONTEXT_LOST',
  CHAT_API_ERROR = 'CHAT_API_ERROR',
  CHAT_RATE_LIMIT = 'CHAT_RATE_LIMIT',
  CHAT_MODEL_UNAVAILABLE = 'CHAT_MODEL_UNAVAILABLE',
  
  // 系统级错误
  AGENT_COMMUNICATION_ERROR = 'AGENT_COMMUNICATION_ERROR',
  RESOURCE_EXHAUSTED = 'RESOURCE_EXHAUSTED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR'
}

// 导入统一的错误严重级别枚举
import { ErrorSeverity } from '@/lib/types/enums';

// 资源状态枚举
export enum ResourceStatus {
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// 熔断器状态
export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

// 基础智能体错误类
export class AgentError extends Error {
  public readonly type: AgentErrorType;
  public readonly severity: ErrorSeverity;
  public readonly agentType: string;
  public readonly context: Record<string, any>;
  public readonly timestamp: Date;
  public readonly sessionId: string | undefined;
  public readonly userAgent: string | undefined;

  constructor(
    type: AgentErrorType,
    message: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    agentType: string = 'unknown',
    context: Record<string, any> = {},
    sessionId?: string,
    userAgent?: string
  ) {
    super(message);
    this.name = 'AgentError';
    this.type = type;
    this.severity = severity;
    this.agentType = agentType;
    this.context = context;
    this.timestamp = new Date();
    this.sessionId = sessionId;
    this.userAgent = userAgent;
  }
}

// CAD分析相关错误
export class CADParseError extends AgentError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(
      AgentErrorType.CAD_FILE_PARSE_ERROR,
      message,
      ErrorSeverity.MEDIUM,
      'cad-analyzer',
      context
    );
  }
}

export class CADAnalysisTimeout extends AgentError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(
      AgentErrorType.CAD_ANALYSIS_TIMEOUT,
      message,
      ErrorSeverity.HIGH,
      'cad-analyzer',
      context
    );
  }
}

// 海报生成相关错误
export class PosterGenerationFailed extends AgentError {
  constructor(message: string, originalError?: Error, context: Record<string, any> = {}) {
    super(
      AgentErrorType.POSTER_GENERATION_FAILED,
      message,
      ErrorSeverity.HIGH,
      'poster-generator',
      { ...context, originalError: originalError?.message }
    );
  }
}

export class PosterResourceLimit extends AgentError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(
      AgentErrorType.POSTER_RESOURCE_LIMIT,
      message,
      ErrorSeverity.HIGH,
      'poster-generator',
      context
    );
  }
}

export class PosterTemplateError extends AgentError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(
      AgentErrorType.POSTER_TEMPLATE_ERROR,
      message,
      ErrorSeverity.MEDIUM,
      'poster-generator',
      context
    );
  }
}

// 对话智能体相关错误
export class ChatContextLost extends AgentError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(
      AgentErrorType.CHAT_CONTEXT_LOST,
      message,
      ErrorSeverity.MEDIUM,
      'chat-agent',
      context
    );
  }
}

export class ChatAPIError extends AgentError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(
      AgentErrorType.CHAT_API_ERROR,
      message,
      ErrorSeverity.HIGH,
      'chat-agent',
      context
    );
  }
}

export class ChatRateLimit extends AgentError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(
      AgentErrorType.CHAT_RATE_LIMIT,
      message,
      ErrorSeverity.MEDIUM,
      'chat-agent',
      context
    );
  }
}

export class ChatModelUnavailable extends AgentError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(
      AgentErrorType.CHAT_MODEL_UNAVAILABLE,
      message,
      ErrorSeverity.HIGH,
      'chat-agent',
      context
    );
  }
}

// 系统级错误
export class ServiceUnavailable extends AgentError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(
      AgentErrorType.SERVICE_UNAVAILABLE,
      message,
      ErrorSeverity.CRITICAL,
      'system',
      context
    );
  }
}

export class ChatServiceUnavailable extends AgentError {
  constructor(message: string, originalError?: Error, context: Record<string, any> = {}) {
    super(
      AgentErrorType.SERVICE_UNAVAILABLE,
      message,
      ErrorSeverity.HIGH,
      'chat-service',
      { ...context, originalError: originalError?.message }
    );
  }
}

export class CommunicationError extends AgentError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(
      AgentErrorType.AGENT_COMMUNICATION_ERROR,
      message,
      ErrorSeverity.MEDIUM,
      'communication',
      context
    );
  }
}

// 错误恢复建议接口
export interface RecoveryAdvice {
  userMessage: string;
  technicalSteps: string[];
  autoRecovery: boolean;
}

// 错误恢复推荐接口
export interface ErrorRecoveryRecommendation {
  errorType: AgentErrorType;
  severity: ErrorSeverity;
  description: string;
  recommendations: RecoveryAdvice[];
  priority: number;
}

// 错误报告接口
export interface ErrorReport {
  id: string;
  timestamp: Date;
  agentType: string;
  errorType: AgentErrorType;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  context: Record<string, any>;
  userAgent?: string;
  sessionId?: string;
  error?: AgentError;
  resolved?: boolean;
}

// 聊天上下文接口
export interface ChatContext {
  chatId: string;
  messages: any[];
  isTemporary?: boolean;
  warningMessage?: string;
}

// 海报配置接口
export interface PosterConfig {
  template: string;
  quality: 'low' | 'medium' | 'high';
  width: number;
  height: number;
  elements: any[];
}

// 海报结果接口
export interface PosterResult {
  success: boolean;
  imageUrl?: string;
  message?: string;
  metadata?: Record<string, any>;
}

// CAD分析结果接口
export interface CADAnalysisResult {
  fileName: string;
  fileSize: number;
  format: string;
  status: 'success' | 'partial_analysis' | 'failed';
  message?: string;
  analysisData?: Record<string, any>;
}

// 智能体事件接口
export interface AgentEvent {
  id: string;
  type: string;
  source: string;
  target?: string;
  data: Record<string, any>;
  timestamp: Date;
  sourceAgentId: string | undefined;
  targetAgentId: string | undefined;
}

// 智能体请求接口
export interface AgentRequest {
  id: string;
  type: string;
  data: Record<string, any>;
  timeout?: number;
  sourceAgentId?: string;
}

// 智能体响应接口
export interface AgentResponse {
  id: string;
  success: boolean;
  data?: Record<string, any>;
  error?: string;
}

// 聊天响应接口
export interface ChatResponse {
  message: string;
  context: ChatContext;
  metadata?: Record<string, any>;
}

import { generateId, delay } from '@/lib/utils';

// 延迟函数已从统一工具库导入

// 工具函数：指数退避计算
export function calculateBackoffDelay(attempt: number, baseDelay: number = 1000): number {
  return Math.min(baseDelay * Math.pow(2, attempt - 1), 30000); // 最大30秒
}