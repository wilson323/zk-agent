// @ts-nocheck
/**
 * @file types/agents/index.ts
 * @description 智能体相关类型定义，包含Agent、AgentConfig等
 * @author zk-agent开发团队
 * @lastUpdate 2024-12-19
 * @updateLog
 *   - 2024-12-19 初始创建智能体类型系统
 */

import { BaseEntity } from '../core';

// 智能体类型枚举
export enum AgentType {
  CHAT = 'CHAT',
  CAD_ANALYZER = 'CAD_ANALYZER',
  POSTER_GENERATOR = 'POSTER_GENERATOR',
  CUSTOM = 'CUSTOM'
}

// 智能体状态枚举
export enum AgentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MAINTENANCE = 'MAINTENANCE'
}

// 智能体基本信息
export interface Agent extends BaseEntity {
  name: string;
  description: string;
  type: AgentType;
  status: AgentStatus;
  avatar?: string;
  tags: string[];
  apiEndpoint: string;
  capabilities: string[];
  configuration: AgentConfiguration;
  metrics: AgentMetrics;
  version: string;
  isPublic: boolean;
  ownerId?: string;
}

// 智能体配置
export interface AgentConfiguration {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  tools: AgentTool[];
  rateLimits: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  security: {
    requireAuth: boolean;
    allowedRoles: string[];
    ipWhitelist?: string[];
  };
}

// 智能体工具
export interface AgentTool {
  id: string;
  name: string;
  description: string;
  type: 'function' | 'plugin' | 'api';
  endpoint?: string;
  parameters: Record<string, any>;
  isEnabled: boolean;
}

// 智能体指标
export interface AgentMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  rating: number;
  reviewCount: number;
  lastUsedAt?: string;
  uptime: number;
}

// 智能体会话
export interface AgentSession extends BaseEntity {
  agentId: string;
  userId: string;
  title?: string;
  context: Record<string, any>;
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    location?: string;
  };
  isActive: boolean;
  endedAt?: string;
}

// 智能体消息
export interface AgentMessage extends BaseEntity {
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: {
    tokenCount?: number;
    processingTime?: number;
    model?: string;
    temperature?: number;
    tools?: string[];
  };
  attachments?: MessageAttachment[];
}

// 消息附件
export interface MessageAttachment {
  id: string;
  type: 'image' | 'file' | 'audio' | 'video';
  url: string;
  filename: string;
  size: number;
  mimetype: string;
}

// 智能体查询参数
export interface AgentQueryParams {
  type?: AgentType;
  status?: AgentStatus;
  tags?: string[];
  search?: string;
  sortBy?: 'name' | 'createdAt' | 'rating' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  isPublic?: boolean;
  ownerId?: string;
}

// 智能体创建/更新请求
export interface CreateAgentRequest {
  name: string;
  description: string;
  type: AgentType;
  avatar?: string;
  tags: string[];
  apiEndpoint: string;
  capabilities: string[];
  configuration: AgentConfiguration;
  isPublic?: boolean;
}

export interface UpdateAgentRequest extends Partial<CreateAgentRequest> {
  status?: AgentStatus;
}

// 智能体交互请求
export interface AgentInteractionRequest {
  agentId: string;
  message: string;
  sessionId?: string;
  context?: Record<string, any>;
  attachments?: MessageAttachment[];
}

// 智能体响应
export interface AgentResponse {
  message: string;
  sessionId: string;
  messageId: string;
  metadata: {
    tokenCount: number;
    processingTime: number;
    model: string;
    confidence?: number;
  };
  actions?: AgentAction[];
  suggestions?: string[];
}

// 智能体动作
export interface AgentAction {
  type: string;
  description: string;
  parameters: Record<string, any>;
  isExecuted: boolean;
  result?: any;
} 