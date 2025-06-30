// @ts-nocheck
// FastGPT API 相关类型定义

// 应用/智能体类型
export interface FastGPTApp {
  id: string
  name: string
  avatar?: string
  description: string
  modelId: string
  status: "active" | "inactive"
  createdAt: string
  updatedAt: string
  type: "fastgpt" | "custom" | "openai" // 添加智能体类型字段
  config: {
    systemPrompt?: string
    temperature?: number
    maxTokens?: number
    fileUpload?: boolean
    speechToText?: boolean
    textToSpeech?: boolean
    tools?: AppTool[]
    apiKey?: string // 每个智能体的专用API密钥
    baseUrl?: string // 每个智能体可以有不同的API端点
    avatarColor?: string // 添加头像颜色字段
  }
}

// 工具类型
export interface AppTool {
  id: string
  name: string
  description: string
  type: "function" | "retrieval" | "plugin"
  config: any
}

import { ChatMessage } from './core/interfaces';

// 聊天会话类型
export interface ChatSession {
  id: string
  appId: string
  title: string
  createdAt: string
  updatedAt: string
  lastMessageAt: string
  messageCount: number
  isPinned?: boolean // 是否置顶
}

// 文件类型
export interface FastGPTFile {
  id: string
  filename: string
  size: number
  type: string
  url: string
  appId: string
  createdAt: string
}

// 模型类型
export interface FastGPTModel {
  id: string
  name: string
  provider: string
  maxTokens: number
  price: number
  available: boolean
  features: string[]
}

// 语音模型类型
export interface VoiceModel {
  id: string
  name: string
  gender: "male" | "female"
  language: string[]
  available: boolean
}

// API配置类型
export interface ApiConfig {
  baseUrl: string
  apiKey: string
}

// 用户类型
export interface User {
  id: string
  name: string
  email?: string
  avatar?: string
  role: "admin" | "user"
  createdAt: string
}

// 聊天API请求类型
export interface ChatRequest {
  appId: string
  chatId?: string
  messages: ChatMessage[]
  stream?: boolean
  detail?: boolean
  system?: string
  variables?: Record<string, any>
  tools?: any[]
  context?: any
}

// 聊天API响应类型
export interface ChatResponse {
  id: string
  object: string
  created: number
  model: string
  choices: ChatChoice[]
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

// 聊天选择类型
export interface ChatChoice {
  index: number
  message?: ChatMessage
  delta?: {
    content?: string
    tool_calls?: ToolCall[]
  }
  finish_reason?: string
}

// 工具调用类型
export interface ToolCall {
  index: number
  id: string
  type: string
  function: {
    name: string
    arguments: string
  }
}

// AG-UI事件类型
export interface AgUiEvent {
  type: string
  timestamp: number
  [key: string]: any
}
