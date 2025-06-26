// @ts-nocheck
/**
 * 系统配置类型定义
 */

// 语音识别配置
export interface SpeechRecognitionConfig {
  // 全局语音识别模型
  globalModel: string // 模型ID

  // 语音识别参数
  language: string // 识别语言 zh-CN, en-US, etc.
  sampleRate: number // 采样率 16000, 44100, etc.
  audioFormat: "wav" | "mp3" | "flac" | "webm" // 音频格式
  encoding: "LINEAR16" | "FLAC" | "MULAW" | "AMR" // 编码格式

  // 识别质量设置
  enableAutomaticPunctuation: boolean // 自动标点
  enableWordTimeOffsets: boolean // 词级时间戳
  enableSpeakerDiarization: boolean // 说话人分离
  maxSpeakers: number // 最大说话人数

  // 实时识别设置
  enableStreamingRecognition: boolean // 流式识别
  interimResults: boolean // 中间结果
  singleUtterance: boolean // 单次发言
  maxAlternatives: number // 最大候选数

  // 噪音处理
  enableNoiseReduction: boolean // 降噪
  enableEchoCancellation: boolean // 回声消除
  enableAutoGainControl: boolean // 自动增益

  // FastGPT集成
  fastgptIntegration: {
    enabled: boolean
    autoSendToChat: boolean // 自动发送到对话
    confidenceThreshold: number // 置信度阈值
    enableContextAwareness: boolean // 上下文感知
    enableEmotionDetection: boolean // 情感检测
  }

  // 后处理配置
  postProcessing: {
    enableTextNormalization: boolean // 文本标准化
    enableProfanityFilter: boolean // 敏感词过滤
    enableCustomDictionary: boolean // 自定义词典
    customWords: string[] // 自定义词汇
  }

  // 性能配置
  performance: {
    maxRecordingDuration: number // 最大录音时长(秒)
    silenceTimeout: number // 静音超时(毫秒)
    vadSensitivity: number // 语音活动检测灵敏度 0-1
    bufferSize: number // 缓冲区大小
  }
}

// 系统全局配置
export interface SystemConfig {
  // 语音识别配置
  speechRecognition: SpeechRecognitionConfig

  // 其他系统配置
  general: {
    systemName: string
    systemDescription: string
    defaultLanguage: string
    timezone: string
    dateFormat: string
    enableAnalytics: boolean
    enableErrorReporting: boolean
  }

  // 安全配置
  security: {
    enableRateLimit: boolean
    maxRequestsPerMinute: number
    enableIPWhitelist: boolean
    allowedIPs: string[]
    enableAuditLog: boolean
  }

  // 性能配置
  performance: {
    enableCaching: boolean
    cacheExpiration: number
    maxConcurrentRequests: number
    requestTimeout: number
  }
}

// 语音识别状态
export interface SpeechRecognitionStatus {
  isRecording: boolean
  isProcessing: boolean
  currentText: string
  confidence: number
  duration: number
  error?: string
}

// 语音识别结果
export interface SpeechRecognitionResult {
  text: string
  confidence: number
  alternatives: Array<{
    text: string
    confidence: number
  }>
  isFinal: boolean
  timestamp: number
  duration: number
  language: string
  speakerId?: string
  emotion?: {
    type: string
    confidence: number
  }
}
