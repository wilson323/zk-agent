import type { FastGPTApp } from "@/types/fastgpt"

interface FeedbackItem {
  id: string
  appId: string
  appName: string
  messageId: string
  messageContent: string
  responseContent: string
  type: "like" | "dislike"
  timestamp: string
}

interface FeedbackApiResult<T> {
  success: boolean
  data?: T
  error?: string
}

export const fetchFeedback = async (applications: FastGPTApp[]): Promise<FeedbackApiResult<FeedbackItem[]>> => {
  try {
    // 模拟获取反馈数据
    // 实际应用中，这里应该是真正的API调用
    const mockFeedback: FeedbackItem[] = [
      {
        id: "1",
        appId: applications[0]?.id || "app1",
        appName: applications[0]?.name || "默认智能体",
        messageId: "msg1",
        messageContent: "如何重置我的密码？",
        responseContent: "要重置密码，请前往登录页面并点击&quot;忘记密码&quot;...",
        type: "like",
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      },
      {
        id: "2",
        appId: applications[0]?.id || "app1",
        appName: applications[0]?.name || "默认智能体",
        messageId: "msg2",
        messageContent: "你们的产品与竞争对手相比太贵了。",
        responseContent: "我理解您对价格的担忧。我们提供的高级功能可以证明成本是合理的...",
        type: "dislike",
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      },
      {
        id: "3",
        appId: applications[1]?.id || "app2",
        appName: applications[1]?.name || "销售助手",
        messageId: "msg3",
        messageContent: "小型企业最适合哪种方案？",
        responseContent: "对于小型企业，我推荐我们的商业专业版，其中包括...",
        type: "like",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      },
    ]

    return { success: true, data: mockFeedback }
  } catch (error: any) {
    console.error("获取反馈数据失败:", error)
    return { success: false, error: error.message || "无法获取反馈数据" }
  }
}
