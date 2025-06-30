/**
 * @file 智能体管理器接口定义
 * @description 定义智能体管理器的标准接口，确保类型安全和一致性
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

import { AgentDefinition } from '../ag-ui/protocol/types'
interface Agent { /* Placeholder for Prisma Agent type */ }

/**
 * 智能体验证结果
 */
export interface AgentValidationResult {
  valid: boolean
  errors: string[]
  warnings?: string[]
}

/**
 * 智能体创建参数
 */
export interface CreateAgentParams {
  appId: string
  apiKey: string
  name?: string
  description?: string
  config?: Record<string, unknown>
}

/**
 * 智能体更新参数
 */
export interface UpdateAgentParams {
  id: string
  name?: string
  description?: string
  config?: Record<string, unknown>
  tools?: AgentDefinition['tools']
}

/**
 * 智能体导出数据
 */
export interface AgentExportData {
  agent: AgentDefinition
  metadata: {
    exportedAt: string
    version: string
    checksum: string
  }
}

/**
 * 智能体管理器基础接口
 */
export interface IAgentManager {
  /**
   * 从FastGPT配置创建智能体
   */
  createAgentFromFastGPT(params: CreateAgentParams): Promise<AgentDefinition>

  /**
   * 更新智能体配置
   */
  updateAgent(params: UpdateAgentParams): Promise<AgentDefinition>

  /**
   * 删除智能体
   */
  deleteAgent(id: string): Promise<boolean>

  /**
   * 验证智能体配置
   */
  validateAgent(agent: AgentDefinition): AgentValidationResult

  /**
   * 导出智能体配置
   */
  exportAgent(id: string): Promise<AgentExportData>

  /**
   * 导入智能体配置
   */
  importAgent(data: AgentExportData): Promise<AgentDefinition>

  /**
   * 获取智能体列表
   */
  listAgents(): Promise<AgentDefinition[]>

  /**
   * 根据ID获取智能体
   */
  getAgent(id: string): Promise<AgentDefinition | null>
}

/**
 * 智能体服务接口
 */
export interface IAgentService {
  /**
   * 创建智能体
   */
  createAgent(data: CreateAgentData): Promise<Agent>

  /**
   * 获取智能体列表
   */
  listAgents(params?: ListAgentsParams): Promise<{
    agents: Agent[]
    total: number
    page: number
    pageSize: number
  }>

  /**
   * 根据ID获取智能体
   */
  getAgentById(id: string): Promise<Agent | null>

  /**
   * 更新智能体
   */
  updateAgent(id: string, data: UpdateAgentData): Promise<Agent>

  /**
   * 删除智能体
   */
  deleteAgent(id: string): Promise<boolean>

  /**
   * 搜索智能体
   */
  searchAgents(query: string): Promise<Agent[]>
}

/**
 * 智能体创建数据类型
 */
export interface CreateAgentData {
  name: string
  description: string
  type?: 'CONVERSATION' | 'CAD_ANALYZER' | 'POSTER_GENERATOR'
  status?: 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'MAINTENANCE'
  avatar?: string
  tags?: string[]
  apiEndpoint?: string
  capabilities?: string[]
  config?: Record<string, unknown>
  version?: string
  isPublic?: boolean
  ownerId: string
}

/**
 * 智能体更新数据类型
 */
export interface UpdateAgentData {
  name?: string
  description?: string
  type?: 'CONVERSATION' | 'CAD_ANALYZER' | 'POSTER_GENERATOR'
  status?: 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'MAINTENANCE'
  avatar?: string
  tags?: string[]
  apiEndpoint?: string
  capabilities?: string[]
  config?: Record<string, unknown>
  version?: string
  isPublic?: boolean
}

/**
 * 智能体列表查询参数
 */
export interface ListAgentsParams {
  page?: number
  pageSize?: number
  search?: string
  type?: 'CONVERSATION' | 'CAD_ANALYZER' | 'POSTER_GENERATOR'
  status?: 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'MAINTENANCE'
  isPublic?: boolean
  ownerId?: string
  sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'usageCount' | 'rating'
  sortOrder?: 'asc' | 'desc'
}

/**
 * 智能体错误类型
 */
export class AgentError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AgentError'
  }
}

/**
 * 智能体验证错误
 */
export class AgentValidationError extends AgentError {
  constructor(message: string, public validationErrors: string[]) {
    super(message, 'VALIDATION_ERROR', { validationErrors })
    this.name = 'AgentValidationError'
  }
}

/**
 * 智能体未找到错误
 */
export class AgentNotFoundError extends AgentError {
  constructor(id: string) {
    super(`智能体未找到: ${id}`, 'AGENT_NOT_FOUND', { id })
    this.name = 'AgentNotFoundError'
  }
}