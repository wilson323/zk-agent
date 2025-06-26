// @ts-nocheck
/**
 * AI模型管理系统类型定义
 */

// 模型类型枚举
export enum ModelType {
  TEXT = "text", // 文本生成
  MULTIMODAL = "multimodal", // 多模态
  SPEECH_TO_TEXT = "speech_to_text", // 语音识别
  TEXT_TO_SPEECH = "text_to_speech", // 语音合成
  IMAGE_GENERATION = "image_generation", // 图片生成
  IMAGE_UNDERSTANDING = "image_understanding", // 图片理解
  EMBEDDING = "embedding", // 向量嵌入
  CODE_GENERATION = "code_generation", // 代码生成
}

// 模型厂商枚举
export enum ModelProvider {
  OPENAI = "openai",
  ALIBABA_QWEN = "alibaba_qwen",
  BAIDU_WENXIN = "baidu_wenxin",
  TENCENT_HUNYUAN = "tencent_hunyuan",
  ZHIPU_GLM = "zhipu_glm",
  MOONSHOT_KIMI = "moonshot_kimi",
  BYTEDANCE_DOUBAO = "bytedance_doubao",
  IFLYTEK_SPARK = "iflytek_spark",
  SENSETIME_NOVA = "sensetime_nova",
  KUNLUN_TIANGONG = "kunlun_tiangong",
  MINIMAX_ABAB = "minimax_abab",
  YI_01AI = "yi_01ai",
  DEEPSEEK = "deepseek",
  MIANBEI_CPM = "mianbei_cpm",
  ANTHROPIC_CLAUDE = "anthropic_claude",
  GOOGLE_GEMINI = "google_gemini",
  MICROSOFT_AZURE = "microsoft_azure",
  STABILITY_AI = "stability_ai",
  MIDJOURNEY = "midjourney",
  RUNWAY = "runway",
}

// 模型配置接口
export interface AIModelConfig {
  id: string
  name: string
  provider: ModelProvider
  type: ModelType
  modelId: string
  apiKey: string
  baseUrl?: string
  apiVersion?: string
  maxTokens?: number
  temperature?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  timeout?: number
  retryAttempts?: number
  customHeaders?: Record<string, string>
  customParams?: Record<string, any>
  isActive: boolean
  createdAt: string
  updatedAt: string
  metadata?: {
    description?: string
    capabilities?: string[]
    pricing?: {
      inputTokenPrice?: number
      outputTokenPrice?: number
      currency?: string
    }
    limits?: {
      maxRequestsPerMinute?: number
      maxTokensPerRequest?: number
    }
  }
}

// 智能体模型配置
export interface AgentModelConfig {
  // 主要对话模型
  primaryModel: string // 模型ID

  // CAD智能体专用模型
  cadModels?: {
    structureAnalysis?: string // 结构分析模型
    deviceRecognition?: string // 设备识别模型
    riskAssessment?: string // 风险评估模型
    complianceCheck?: string // 合规检查模型
    reportGeneration?: string // 报告生成模型
  }

  // 海报智能体专用模型
  posterModels?: {
    designAnalysis?: string // 设计分析模型
    imageGeneration?: string // 图片生成模型
    textGeneration?: string // 文案生成模型
    styleRecommendation?: string // 风格推荐模型
    colorAnalysis?: string // 色彩分析模型
  }

  // 通用功能模型
  commonModels?: {
    speechToText?: string // 语音识别
    textToSpeech?: string // 语音合成
    imageUnderstanding?: string // 图片理解
    embedding?: string // 向量嵌入
    translation?: string // 翻译模型
  }
}

// 模型调用结果
export interface ModelCallResult {
  success: boolean
  data?: any
  error?: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    cost?: number
  }
  latency?: number
  modelId: string
  provider: ModelProvider
}

// 模型性能指标
export interface ModelMetrics {
  modelId: string
  totalCalls: number
  successRate: number
  averageLatency: number
  totalCost: number
  errorCount: number
  lastUsed: string
  dailyUsage: {
    date: string
    calls: number
    cost: number
  }[]
}
