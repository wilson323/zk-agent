import type { FastGPTApp, FastGPTModel, VoiceModel } from "@/types/fastgpt"
import FastGPTApi from "@/lib/api/fastgpt"
import { STORAGE_KEYS, isApiConfigured } from "@/lib/utils"
import { generateAvatarColor } from "@/lib/utils/avatar-utils"

interface AgentApiResult<T> {
  success: boolean
  data?: T
  error?: string
}

export const fetchModels = async (): Promise<AgentApiResult<{ models: FastGPTModel[]; voiceModels: VoiceModel[] }>> => {
  try {
    const apiConfigured = isApiConfigured()
    if (!apiConfigured) {
      console.warn("API not configured, using default models")
      return {
        success: true,
        data: {
          models: [
            { id: "default-model", name: "Default Model", available: true },
            { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", available: true },
            { id: "gpt-4", name: "GPT-4", available: true },
          ],
          voiceModels: [
            { id: "default-voice", name: "Default Voice", gender: "female" },
            { id: "male-voice", name: "Male Voice", gender: "male" },
            { id: "female-voice", name: "Female Voice", gender: "female" },
          ],
        },
      }
    }

    const modelList = await FastGPTApi.getModels()
    const voiceModelList = await FastGPTApi.getVoiceModels()

    return {
      success: true,
      data: {
        models: Array.isArray(modelList) ? modelList : [],
        voiceModels: Array.isArray(voiceModelList) ? voiceModelList : [],
      },
    }
  } catch (error: any) {
    console.error("Failed to get model list:", error)
    return {
      success: false,
      error: error.message || "无法获取模型列表",
    }
  }
}

export const addAgent = async (agent: Omit<FastGPTApp, "id" | "createdAt" | "updatedAt">): Promise<AgentApiResult<FastGPTApp>> => {
  try {
    const agentsStr = localStorage.getItem(STORAGE_KEYS.AGENTS)
    const agents = agentsStr ? JSON.parse(agentsStr) : []

    if (!agent.config.avatarColor) {
      agent.config.avatarColor = generateAvatarColor(agent.name)
    }

    const id = `agent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const now = new Date().toISOString()

    const newAgent: FastGPTApp = {
      ...agent,
      id,
      createdAt: now,
      updatedAt: now,
    }

    agents.push(newAgent)
    localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(agents))

    const adminAgentsStr = localStorage.getItem("admin_agents")
    const adminAgents = adminAgentsStr ? JSON.parse(adminAgentsStr) : []
    adminAgents.push(newAgent)
    localStorage.setItem("admin_agents", JSON.stringify(adminAgents))

    return { success: true, data: newAgent }
  } catch (error: any) {
    console.error("添加智能体失败:", error)
    return { success: false, error: error.message || "无法创建新智能体" }
  }
}

export const updateAgent = async (updatedAgent: FastGPTApp): Promise<AgentApiResult<FastGPTApp>> => {
  try {
    const agentsStr = localStorage.getItem(STORAGE_KEYS.AGENTS)
    const agents = agentsStr ? JSON.parse(agentsStr) : []

    if (!updatedAgent.config.avatarColor) {
      updatedAgent.config.avatarColor = generateAvatarColor(updatedAgent.name)
    }

    const index = agents.findIndex((a: FastGPTApp) => a.id === updatedAgent.id)

    if (index !== -1) {
      agents[index] = {
        ...agents[index],
        ...updatedAgent,
        config: {
          ...agents[index].config,
          ...updatedAgent.config,
        },
        updatedAt: new Date().toISOString(),
      }

      localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(agents))

      const adminAgentsStr = localStorage.getItem("admin_agents")
      const adminAgents = adminAgentsStr ? JSON.parse(adminAgentsStr) : []
      const adminIndex = adminAgents.findIndex((a: FastGPTApp) => a.id === updatedAgent.id)

      if (adminIndex !== -1) {
        adminAgents[adminIndex] = {
          ...adminAgents[adminIndex],
          ...updatedAgent,
          config: {
            ...adminAgents[adminIndex].config,
            ...updatedAgent.config,
          },
          updatedAt: new Date().toISOString(),
        }
      } else {
        adminAgents.push({
          ...updatedAgent,
          updatedAt: new Date().toISOString(),
        })
      }
      localStorage.setItem("admin_agents", JSON.stringify(adminAgents))

      return { success: true, data: agents[index] }
    } else {
      return { success: false, error: "智能体未找到" }
    }
  } catch (error: any) {
    console.error("更新智能体失败:", error)
    return { success: false, error: error.message || "无法更新智能体信息" }
  }
}

export const deleteAgent = async (id: string): Promise<AgentApiResult<boolean>> => {
  try {
    const agentsStr = localStorage.getItem(STORAGE_KEYS.AGENTS)
    const agents = agentsStr ? JSON.parse(agentsStr) : []

    const filteredAgents = agents.filter((agent: FastGPTApp) => agent.id !== id)
    localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(filteredAgents))

    const adminAgentsStr = localStorage.getItem("admin_agents")
    if (adminAgentsStr) {
      const adminAgents = JSON.parse(adminAgentsStr)
      const filteredAdminAgents = adminAgents.filter((agent: FastGPTApp) => agent.id !== id)
      localStorage.setItem("admin_agents", JSON.stringify(filteredAdminAgents))
    }

    return { success: true, data: true }
  } catch (error: any) {
    console.error("删除智能体失败:", error)
    return { success: false, error: error.message || "无法删除智能体" }
  }
}

export const toggleAgentStatus = async (id: string, status: "active" | "inactive"): Promise<AgentApiResult<FastGPTApp>> => {
  try {
    const agentsStr = localStorage.getItem(STORAGE_KEYS.AGENTS)
    const agents = agentsStr ? JSON.parse(agentsStr) : []

    const index = agents.findIndex((a: FastGPTApp) => a.id === id)

    if (index !== -1) {
      agents[index] = {
        ...agents[index],
        status,
        updatedAt: new Date().toISOString(),
      }
      localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(agents))
      return { success: true, data: agents[index] }
    } else {
      return { success: false, error: "智能体未找到" }
    }
  } catch (error: any) {
    console.error("更新智能体状态失败:", error)
    return { success: false, error: error.message || "无法更新智能体状态" }
  }
}

export const checkAuthentication = (): boolean => {
  const userJson = localStorage.getItem(STORAGE_KEYS.CURRENT_USER)
  if (!userJson) {
    console.warn("User not found in localStorage")
    return false
  }

  try {
    const user = JSON.parse(userJson)
    return !!user
  } catch (e) {
    console.error("Error parsing user data:", e)
    return false
  }
}
