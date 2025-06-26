// @ts-nocheck
/**
 * 智能体配置管理
 * 配置第一个智能体的appid和密钥
 */

export interface AgentConfig {
  id: string
  name: string
  appId: string
  apiKey: string
  baseUrl: string
  description: string
  enabled: boolean
  capabilities: string[]
  config: {
    temperature?: number
    maxTokens?: number
    systemPrompt?: string
    model?: string
  }
}

// 第一个智能体配置
export const FIRST_AGENT_CONFIG: AgentConfig = {
  id: 'agent-001',
  name: '第一个智能体',
  appId: '6708e788c6ba48baa62419a5',
  apiKey: 'fastgpt-gMV3BYuHrT8bZyy0tjLiWG8KIxegvh6f22f7XJXi1tROXTJJPWAnO9o3YPqDsG',
  baseUrl: 'https://api.fastgpt.in',
  description: '第一个配置的FastGPT智能体，用于全功能测试',
  enabled: true,
  capabilities: [
    'text-chat',
    'context-memory',
    'file-upload',
    'knowledge-base',
    'tool-calling'
  ],
  config: {
    temperature: 0.7,
    maxTokens: 4000,
    systemPrompt: '你是一个专业的AI助手，能够帮助用户解决各种问题。',
    model: 'gpt-3.5-turbo'
  }
}

// 智能体配置列表
export const AGENT_CONFIGS: AgentConfig[] = [
  FIRST_AGENT_CONFIG
]

// 获取智能体配置
export function getAgentConfig(id: string): AgentConfig | undefined {
  return AGENT_CONFIGS.find(config => config.id === id)
}

// 获取默认智能体配置
export function getDefaultAgentConfig(): AgentConfig {
  return FIRST_AGENT_CONFIG
}

// 验证智能体配置
export function validateAgentConfig(config: AgentConfig): boolean {
  return !!(
    config.id &&
    config.appId &&
    config.apiKey &&
    config.baseUrl &&
    config.name
  )
}

// 环境变量配置映射
export const ENV_CONFIG = {
  FASTGPT_BASE_URL: FIRST_AGENT_CONFIG.baseUrl,
  FASTGPT_API_KEY: FIRST_AGENT_CONFIG.apiKey,
  FASTGPT_APP_ID: FIRST_AGENT_CONFIG.appId,
} 