// @ts-nocheck
import type { AgentDefinition, Tool } from "./types"

/**
 * 标准AG-UI智能体管理器
 */
export class StandardAgentManager {
  private agents: Map<string, AgentDefinition> = new Map()

  /**
   * 注册智能体
   */
  registerAgent(agent: AgentDefinition): void {
    this.agents.set(agent.id, agent)
  }

  /**
   * 获取智能体定义
   */
  getAgent(agentId: string): AgentDefinition | null {
    return this.agents.get(agentId) || null
  }

  /**
   * 从FastGPT配置创建智能体定义
   */
  async createAgentFromFastGPT(appId: string, apiKey: string): Promise<AgentDefinition> {
    // 调用FastGPT API获取智能体信息
    const response = await fetch("/api/fastgpt/init-chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ appId }),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch agent info: ${response.statusText}`)
    }

    const data = await response.json()

    // 转换为标准AG-UI智能体定义
    const agent: AgentDefinition = {
      id: appId,
      name: data.name || `Agent ${appId}`,
      description: data.description || data.welcomeMessage || "",
      instructions: data.systemPrompt || "",
      tools: this.convertFastGPTTools(data.tools || []),
      model: data.model || "gpt-3.5-turbo",
      temperature: data.temperature || 0.7,
      maxTokens: data.maxTokens || 2000,
      variables: data.variables || {},
      welcomeMessage: data.welcomeMessage,
    }

    // 注册智能体
    this.registerAgent(agent)

    return agent
  }

  /**
   * 转换FastGPT工具为标准AG-UI工具格式
   */
  private convertFastGPTTools(fastgptTools: any[]): Tool[] {
    return fastgptTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters || {
        type: "object",
        properties: {},
        required: [],
      },
    }))
  }

  /**
   * 获取所有智能体
   */
  getAllAgents(): AgentDefinition[] {
    return Array.from(this.agents.values())
  }

  /**
   * 删除智能体
   */
  removeAgent(agentId: string): boolean {
    return this.agents.delete(agentId)
  }

  /**
   * 更新智能体
   */
  updateAgent(agentId: string, updates: Partial<AgentDefinition>): boolean {
    const agent = this.agents.get(agentId)
    if (!agent) {return false}

    const updatedAgent = { ...agent, ...updates }
    this.agents.set(agentId, updatedAgent)
    return true
  }
}
