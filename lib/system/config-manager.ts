import type { SystemConfig } from "@/types/system-config"

interface ConfigManagerResult<T> {
  success: boolean
  data?: T
  error?: string
}

export const loadSystemConfig = (): SystemConfig | null => {
  try {
    const savedConfig = localStorage.getItem("system_config")
    if (savedConfig) {
      return JSON.parse(savedConfig)
    }
  } catch (error) {
    console.error("Failed to load system config from localStorage:", error)
  }
  return null
}

export const saveSystemConfig = async (config: SystemConfig): Promise<ConfigManagerResult<boolean>> => {
  try {
    // 保存到本地存储
    localStorage.setItem("system_config", JSON.stringify(config))

    // 保存到服务器
    const response = await fetch("/api/system/config", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(config),
    })

    if (response.ok) {
      return { success: true, data: true }
    } else {
      const errorData = await response.json()
      return { success: false, error: errorData.message || "Failed to save config to server" }
    }
  } catch (error: any) {
    console.error("Failed to save config:", error)
    return { success: false, error: error.message || "未知错误" }
  }
}

export const testSpeechRecognitionApi = async (modelId: string, config: any): Promise<ConfigManagerResult<{ latency: number }>> => {
  try {
    const response = await fetch("/api/speech/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        modelId,
        config,
      }),
    })

    const result = await response.json()

    if (result.success) {
      return { success: true, data: { latency: result.latency } }
    } else {
      return { success: false, error: result.error || "语音识别测试失败" }
    }
  } catch (error: any) {
    console.error("语音识别测试失败:", error)
    return { success: false, error: error.message || "无法连接到语音识别服务" }
  }
}
