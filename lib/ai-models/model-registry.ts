// @ts-nocheck
/**
 * AI模型注册表
 * 管理所有支持的AI模型厂商和模型信息
 */

import { ModelProvider, ModelType } from "@/types/ai-models"

// 模型厂商配置
export const MODEL_PROVIDERS = {
  [ModelProvider.OPENAI]: {
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    authType: "bearer",
    supportedTypes: [
      ModelType.TEXT,
      ModelType.MULTIMODAL,
      ModelType.IMAGE_GENERATION,
      ModelType.SPEECH_TO_TEXT,
      ModelType.TEXT_TO_SPEECH,
      ModelType.EMBEDDING,
    ],
    models: {
      "gpt-4o": { type: ModelType.MULTIMODAL, maxTokens: 128000 },
      "gpt-4o-mini": { type: ModelType.MULTIMODAL, maxTokens: 128000 },
      "gpt-4-turbo": { type: ModelType.TEXT, maxTokens: 128000 },
      "gpt-3.5-turbo": { type: ModelType.TEXT, maxTokens: 16385 },
      "dall-e-3": { type: ModelType.IMAGE_GENERATION },
      "whisper-1": { type: ModelType.SPEECH_TO_TEXT },
      "tts-1": { type: ModelType.TEXT_TO_SPEECH },
      "text-embedding-3-large": { type: ModelType.EMBEDDING },
    },
  },

  [ModelProvider.ALIBABA_QWEN]: {
    name: "阿里云千问",
    baseUrl: "https://dashscope.aliyuncs.com/api/v1",
    authType: "api-key",
    supportedTypes: [
      ModelType.TEXT,
      ModelType.MULTIMODAL,
      ModelType.IMAGE_GENERATION,
      ModelType.SPEECH_TO_TEXT,
      ModelType.TEXT_TO_SPEECH,
    ],
    models: {
      "qwen-max": { type: ModelType.TEXT, maxTokens: 30000 },
      "qwen-plus": { type: ModelType.TEXT, maxTokens: 30000 },
      "qwen-turbo": { type: ModelType.TEXT, maxTokens: 30000 },
      "qwen-vl-plus": { type: ModelType.MULTIMODAL, maxTokens: 30000 },
      "qwen-vl-max": { type: ModelType.MULTIMODAL, maxTokens: 30000 },
      "qwen-audio-turbo": { type: ModelType.SPEECH_TO_TEXT },
      "wanx-v1": { type: ModelType.IMAGE_GENERATION },
    },
  },

  [ModelProvider.BAIDU_WENXIN]: {
    name: "百度文心一言",
    baseUrl: "https://aip.baidubce.com/rpc/2.0/ai_custom/v1",
    authType: "access-token",
    supportedTypes: [ModelType.TEXT, ModelType.MULTIMODAL, ModelType.IMAGE_GENERATION],
    models: {
      "ernie-4.0-8k": { type: ModelType.TEXT, maxTokens: 8192 },
      "ernie-3.5-8k": { type: ModelType.TEXT, maxTokens: 8192 },
      "ernie-bot-turbo": { type: ModelType.TEXT, maxTokens: 8192 },
      "ernie-vil-g": { type: ModelType.MULTIMODAL, maxTokens: 8192 },
      "stable-diffusion-xl": { type: ModelType.IMAGE_GENERATION },
    },
  },

  [ModelProvider.TENCENT_HUNYUAN]: {
    name: "腾讯混元",
    baseUrl: "https://hunyuan.tencentcloudapi.com",
    authType: "signature",
    supportedTypes: [ModelType.TEXT, ModelType.MULTIMODAL, ModelType.IMAGE_GENERATION],
    models: {
      "hunyuan-pro": { type: ModelType.TEXT, maxTokens: 32000 },
      "hunyuan-standard": { type: ModelType.TEXT, maxTokens: 32000 },
      "hunyuan-lite": { type: ModelType.TEXT, maxTokens: 32000 },
      "hunyuan-vision": { type: ModelType.MULTIMODAL, maxTokens: 32000 },
    },
  },

  [ModelProvider.ZHIPU_GLM]: {
    name: "智谱GLM",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    authType: "bearer",
    supportedTypes: [ModelType.TEXT, ModelType.MULTIMODAL, ModelType.IMAGE_GENERATION, ModelType.EMBEDDING],
    models: {
      "glm-4": { type: ModelType.TEXT, maxTokens: 128000 },
      "glm-4v": { type: ModelType.MULTIMODAL, maxTokens: 128000 },
      "glm-3-turbo": { type: ModelType.TEXT, maxTokens: 128000 },
      "cogview-3": { type: ModelType.IMAGE_GENERATION },
      "embedding-2": { type: ModelType.EMBEDDING },
    },
  },

  [ModelProvider.MOONSHOT_KIMI]: {
    name: "月之暗面Kimi",
    baseUrl: "https://api.moonshot.cn/v1",
    authType: "bearer",
    supportedTypes: [ModelType.TEXT],
    models: {
      "moonshot-v1-8k": { type: ModelType.TEXT, maxTokens: 8192 },
      "moonshot-v1-32k": { type: ModelType.TEXT, maxTokens: 32768 },
      "moonshot-v1-128k": { type: ModelType.TEXT, maxTokens: 131072 },
    },
  },

  [ModelProvider.BYTEDANCE_DOUBAO]: {
    name: "字节跳动豆包",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    authType: "bearer",
    supportedTypes: [ModelType.TEXT, ModelType.MULTIMODAL, ModelType.IMAGE_GENERATION],
    models: {
      "doubao-pro-4k": { type: ModelType.TEXT, maxTokens: 4096 },
      "doubao-pro-32k": { type: ModelType.TEXT, maxTokens: 32768 },
      "doubao-pro-128k": { type: ModelType.TEXT, maxTokens: 131072 },
    },
  },

  [ModelProvider.IFLYTEK_SPARK]: {
    name: "科大讯飞星火",
    baseUrl: "https://spark-api.xf-yun.com/v1.1",
    authType: "app-key",
    supportedTypes: [ModelType.TEXT, ModelType.MULTIMODAL, ModelType.SPEECH_TO_TEXT, ModelType.TEXT_TO_SPEECH],
    models: {
      "spark-3.5": { type: ModelType.TEXT, maxTokens: 8192 },
      "spark-pro": { type: ModelType.TEXT, maxTokens: 8192 },
      "spark-lite": { type: ModelType.TEXT, maxTokens: 4096 },
    },
  },

  [ModelProvider.DEEPSEEK]: {
    name: "深度求索DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    authType: "bearer",
    supportedTypes: [ModelType.TEXT, ModelType.CODE_GENERATION],
    models: {
      "deepseek-chat": { type: ModelType.TEXT, maxTokens: 32768 },
      "deepseek-coder": { type: ModelType.CODE_GENERATION, maxTokens: 16384 },
    },
  },

  [ModelProvider.YI_01AI]: {
    name: "零一万物Yi",
    baseUrl: "https://api.lingyiwanwu.com/v1",
    authType: "bearer",
    supportedTypes: [ModelType.TEXT, ModelType.MULTIMODAL],
    models: {
      "yi-large": { type: ModelType.TEXT, maxTokens: 32768 },
      "yi-medium": { type: ModelType.TEXT, maxTokens: 16384 },
      "yi-vision": { type: ModelType.MULTIMODAL, maxTokens: 16384 },
    },
  },

  [ModelProvider.MINIMAX_ABAB]: {
    name: "MiniMax海螺",
    baseUrl: "https://api.minimax.chat/v1",
    authType: "bearer",
    supportedTypes: [ModelType.TEXT, ModelType.SPEECH_TO_TEXT, ModelType.TEXT_TO_SPEECH],
    models: {
      "abab6.5s-chat": { type: ModelType.TEXT, maxTokens: 245760 },
      "abab6.5-chat": { type: ModelType.TEXT, maxTokens: 8192 },
      "speech-01": { type: ModelType.SPEECH_TO_TEXT },
      "speech-01-turbo": { type: ModelType.TEXT_TO_SPEECH },
    },
  },
}

// 获取厂商支持的模型类型
export function getProviderSupportedTypes(provider: ModelProvider): ModelType[] {
  return MODEL_PROVIDERS[provider]?.supportedTypes || []
}

// 获取厂商的模型列表
export function getProviderModels(provider: ModelProvider, type?: ModelType) {
  const providerConfig = MODEL_PROVIDERS[provider]
  if (!providerConfig) {return []}

  const models = Object.entries(providerConfig.models)
  if (type) {
    return models.filter(([_, config]) => config.type === type)
  }
  return models
}

// 获取模型配置
export function getModelConfig(provider: ModelProvider, modelId: string) {
  return MODEL_PROVIDERS[provider]?.models[modelId]
}
