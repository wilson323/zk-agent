import { DEFAULT_API_CONFIG } from "@/config/fastgpt"

interface ApiConfig {
  baseUrl: string
  apiKey: string
  useProxy: boolean
}

interface ApiTestResult {
  success: boolean
  message: string
}

export const loadApiConfig = (): ApiConfig => {
  try {
    const localConfig = localStorage.getItem("ai_chat_api_config")
    if (localConfig) {
      try {
        const config = JSON.parse(localConfig)
        return {
          baseUrl: config.baseUrl || DEFAULT_API_CONFIG.baseUrl,
          apiKey: config.apiKey || "",
          useProxy: config.useProxy === undefined ? true : config.useProxy,
        }
      } catch (e) {
        console.error("解析本地存储的API配置失败:", e)
        return { baseUrl: DEFAULT_API_CONFIG.baseUrl, apiKey: "", useProxy: true }
      }
    }
  } catch (error) {
    console.error("加载API配置失败:", error)
  }
  return { baseUrl: DEFAULT_API_CONFIG.baseUrl, apiKey: "", useProxy: true }
}

export const saveApiConfig = async (config: ApiConfig): Promise<void> => {
  try {
    localStorage.setItem("ai_chat_api_config", JSON.stringify(config))
    console.log("API配置已保存到本地存储")

    // 尝试保存到服务器文件
    try {
      await fetch("/api/db/api-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      })
      console.log("API配置已保存到服务器文件")
    } catch (error) {
      console.error("保存API配置到服务器文件失败:", error)
    }
  } catch (error) {
    console.error("保存API配置失败:", error)
  }
}

export const testApiConnection = async (baseUrl: string, apiKey: string, useProxy: boolean): Promise<ApiTestResult> => {
  // This is a simplified test. In a real application, you'd make a small API call
  // to the FastGPT service to verify the connection.
  // For now, we'll just simulate success/failure based on basic validation.
  if (!baseUrl || !apiKey) {
    return { success: false, message: "API URL 和 API 密钥不能为空" }
  }

  // Simulate a network request
  return new Promise((resolve) => {
    setTimeout(() => {
      if (baseUrl.startsWith("http") && apiKey.length > 10) {
        resolve({ success: true, message: "API连接成功！" })
      } else {
        resolve({ success: false, message: "API URL 或 API 密钥格式不正确" })
      }
    }, 500)
  })
}
