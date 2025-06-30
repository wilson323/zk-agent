import type { AgentDefinition, Tool } from "./types"
import { 
  IAgentManager, 
  CreateAgentParams, 
  UpdateAgentParams, 
  AgentValidationResult, 
  AgentExportData,
  AgentValidationError,
  AgentNotFoundError
} from '../../interfaces/agent-manager.interface'

/**
 * AG-UI智能体管理器
 * 负责智能体的创建、配置和管理
 */
export class AgUIAgentManager implements IAgentManager {
  private fastGPTBaseUrl: string = process.env.FASTGPT_BASE_URL || 'https://api.fastgpt.run'
  private agents: Map<string, AgentDefinition> = new Map()

  /**
   * 从FastGPT配置创建智能体
   */
  async createAgentFromFastGPT(params: CreateAgentParams): Promise<AgentDefinition> {
    const { appId, apiKey, name, description, config } = params
    // 输入验证
    if (!appId?.trim()) {
      throw new AgentValidationError('AppId is required and cannot be empty', ['appId is required'])
    }
    if (!apiKey?.trim()) {
      throw new AgentValidationError('API Key is required and cannot be empty', ['apiKey is required'])
    }

    try {
      // 初始化FastGPT应用
      const initResponse = await fetch(`${this.fastGPTBaseUrl}/api/core/app/detail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ appId })
      })

      if (!initResponse.ok) {
        throw new Error(`Failed to initialize FastGPT app: ${initResponse.statusText}`)
      }

      const appData = await initResponse.json()
      
      // 验证响应结构
      if (!appData || typeof appData !== 'object') {
        throw new AgentValidationError('Invalid response structure from FastGPT API', ['Invalid FastGPT API response format'])
      }

      // 构建标准AG-UI智能体定义
      const agent: AgentDefinition = {
        id: appId,
        name: appData.app?.name || `Agent-${appId}`,
        description: appData.app?.intro || "FastGPT智能体",
        instructions: appData.app?.chatConfig?.systemPrompt || "",
        model: appData.app?.chatConfig?.model || "gpt-3.5-turbo",
        tools: this.convertFastGPTTools(appData.app?.modules || []),
        temperature: appData.app?.chatConfig?.temperature || 0.7,
        maxTokens: appData.app?.chatConfig?.maxTokens || 2000,
        variables: this.extractVariables(appData.app?.userGuide?.variables || []),
        metadata: {
          fastgptAppId: appId,
          chatId: appData.chatId,
          welcomeText: appData.app?.userGuide?.welcomeText,
          questionGuide: appData.app?.userGuide?.questionGuide,
          tts: appData.app?.chatConfig?.tts,
          whisper: appData.app?.chatConfig?.whisper,
          scheduledTriggerConfig: appData.app?.chatConfig?.scheduledTriggerConfig,
        },
      }

      // 保存智能体
      this.agents.set(agent.id, agent)

      return agent
    } catch (error) {
      console.error("Error creating agent from FastGPT:", error)
      throw error
    }
  }

  /**
   * 转换FastGPT模块为AG-UI工具
   */
  private convertFastGPTTools(modules: any[]): Tool[] {
    const tools: Tool[] = []

    for (const module of modules) {
      switch (module.flowType) {
        case "tools":
        case "httpRequest468":
          tools.push({
            type: "function",
            function: {
              name: module.name || `tool_${module.moduleId}`,
              description: module.intro || "FastGPT工具",
              parameters: {
                type: "object",
                properties: this.extractToolParameters(module.inputs || []),
                required: this.extractRequiredParameters(module.inputs || []),
              },
            },
          })
          break
        case "pluginModule":
          if (module.pluginId) {
            tools.push({
              type: "function",
              function: {
                name: module.name || `plugin_${module.pluginId}`,
                description: module.intro || "FastGPT插件",
                parameters: {
                  type: "object",
                  properties: this.extractToolParameters(module.inputs || []),
                  required: this.extractRequiredParameters(module.inputs || []),
                },
              },
            })
          }
          break
      }
    }

    return tools
  }

  /**
   * 提取工具参数
   */
  private extractToolParameters(inputs: any[]): Record<string, any> {
    const parameters: Record<string, any> = {}

    for (const input of inputs) {
      if (input.key && input.toolDescription) {
        parameters[input.key] = {
          type: this.mapFastGPTTypeToJsonSchema(input.valueType),
          description: input.toolDescription,
        }

        if (input.enum && input.enum.length > 0) {
          parameters[input.key].enum = input.enum.map((e: any) => e.value)
        }
      }
    }

    return parameters
  }

  /**
   * 提取必需参数
   */
  private extractRequiredParameters(inputs: any[]): string[] {
    return inputs.filter((input) => input.required && input.key).map((input) => input.key)
  }

  /**
   * 映射FastGPT类型到JSON Schema类型
   */
  private mapFastGPTTypeToJsonSchema(valueType: string): string {
    switch (valueType) {
      case "string":
      case "textarea":
        return "string"
      case "number":
        return "number"
      case "boolean":
        return "boolean"
      case "arrayString":
        return "array"
      case "arrayNumber":
        return "array"
      case "object":
        return "object"
      default:
        return "string"
    }
  }

  /**
   * 提取全局变量
   */
  private extractVariables(variables: any[]): Record<string, any> {
    const result: Record<string, any> = {}

    for (const variable of variables) {
      if (variable.key) {
        result[variable.key] = {
          label: variable.label,
          type: variable.type,
          required: variable.required,
          defaultValue: variable.defaultValue,
          description: variable.description,
        }
      }
    }

    return result
  }

  /**
   * 更新智能体配置
   */
  async updateAgent(params: UpdateAgentParams): Promise<AgentDefinition> {
    const { id, name, description, config, tools } = params
    
    const agent = this.agents.get(id)
    if (!agent) {
      throw new AgentNotFoundError(id)
    }

    const updatedAgent: AgentDefinition = {
      ...agent,
      ...(name && { name: name.trim() }),
      ...(description && { description: description.trim() }),
      ...(tools && { tools }),
      ...(config && { metadata: { ...agent.metadata, ...config } })
    }

    const validation = this.validateAgent(updatedAgent)
    if (!validation.valid) {
      throw new AgentValidationError('智能体配置验证失败', validation.errors)
    }

    this.agents.set(id, updatedAgent)
    return updatedAgent
  }

  /**
   * 删除智能体
   */
  async deleteAgent(id: string): Promise<boolean> {
    if (!id || typeof id !== 'string') {
      throw new AgentValidationError('智能体ID无效', ['Invalid agent ID'])
    }
    
    return this.agents.delete(id)
  }

  /**
   * 获取智能体
   */
  async getAgent(id: string): Promise<AgentDefinition | null> {
    return this.agents.get(id) || null
  }

  /**
   * 获取所有智能体
   */
  getAllAgents(): AgentDefinition[] {
    return Array.from(this.agents.values())
  }

  /**
   * 根据ID获取智能体 (异步版本)
   */
  async getAgentAsync(id: string): Promise<AgentDefinition | null> {
    return this.agents.get(id) || null
  }

  /**
   * 获取智能体列表
   */
  async listAgents(): Promise<AgentDefinition[]> {
    return Array.from(this.agents.values())
  }

  /**
   * 验证智能体配置
   */
  validateAgent(agent: AgentDefinition): AgentValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // 验证智能体对象本身
    if (!agent || typeof agent !== 'object') {
      errors.push('智能体配置不能为空且必须是对象')
      return { valid: false, errors, warnings }
    }

    // 验证基本信息
    if (!agent.id || typeof agent.id !== 'string' || agent.id.trim().length === 0) {
      errors.push('智能体ID不能为空')
    }
    if (!agent.name || typeof agent.name !== 'string' || agent.name.trim().length === 0) {
      errors.push('智能体名称不能为空')
    }
    if (!agent.description || typeof agent.description !== 'string') {
      errors.push('智能体描述必须是字符串')
    }

    // 验证模型配置
    if (!agent.model || typeof agent.model !== 'string') {
      errors.push('模型配置不能为空')
    }

    // 验证工具配置
    if (agent.tools && Array.isArray(agent.tools)) {
      agent.tools.forEach((tool, index) => {
        if (!tool || typeof tool !== 'object') {
          errors.push(`工具[${index}]配置无效`)
          return
        }
        if (!tool.function.name || typeof tool.function.name !== 'string') {
          errors.push(`工具[${index}]名称不能为空`)
        }
        if (!tool.function.description || typeof tool.function.description !== 'string') {
          errors.push(`工具[${index}]描述不能为空`)
        }
        if (tool.function.parameters && typeof tool.function.parameters !== 'object') {
          errors.push(`工具[${index}]参数配置必须是对象`)
        }
      })
    }

    // 验证版本号
    if (agent.metadata?.version && typeof agent.metadata.version !== 'string') {
      errors.push('版本号必须是字符串')
    }

    // 验证标签
    if (agent.metadata?.tags && !Array.isArray(agent.metadata.tags)) {
      errors.push('标签必须是数组')
    }

    // 添加警告检查
    if (agent.temperature && (agent.temperature < 0 || agent.temperature > 2)) {
      warnings.push('温度参数建议在0-2之间')
    }
    if (agent.maxTokens && agent.maxTokens > 4096) {
      warnings.push('最大令牌数过大可能影响性能')
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * 导出智能体配置
   */
  async exportAgent(id: string): Promise<AgentExportData> {
    const agent = this.agents.get(id)
    if (!agent) {
      throw new AgentNotFoundError(id)
    }

    return {
      agent,
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        checksum: this.calculateChecksum(agent)
      }
    }
  }

  /**
   * 导入智能体配置
   */
  async importAgent(data: AgentExportData): Promise<AgentDefinition> {
    const { agent } = data
    
    const validation = this.validateAgent(agent)
    if (!validation.valid) {
      throw new AgentValidationError('导入的智能体配置无效', validation.errors)
    }

    this.agents.set(agent.id, agent)
    return agent
  }

  /**
   * 计算校验和
   */
  private calculateChecksum(agent: AgentDefinition): string {
    const content = JSON.stringify(agent, Object.keys(agent).sort())
    // 简单的哈希实现
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    return Math.abs(hash).toString(16)
  }
}
