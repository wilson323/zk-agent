// @ts-nocheck
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Brain, Zap, Mic, ImageIcon, Globe, AlertCircle } from "lucide-react"
import { aiModelManager } from "@/lib/ai-models/model-manager"
import { ModelType, type AIModelConfig, type AgentModelConfig } from "@/types/ai-models"

interface AgentModelConfigProps {
  agentType: "cad" | "poster" | "general"
  value: AgentModelConfig
  onChange: (config: AgentModelConfig) => void
}

// 模型用途配置
const MODEL_PURPOSES = {
  cad: {
    structureAnalysis: {
      label: "结构分析模型",
      description: "用于分析CAD文件的建筑结构、房间布局等",
      icon: Brain,
      requiredTypes: [ModelType.TEXT, ModelType.MULTIMODAL],
    },
    deviceRecognition: {
      label: "设备识别模型",
      description: "识别CAD图纸中的安防设备、电气设备等",
      icon: Zap,
      requiredTypes: [ModelType.MULTIMODAL, ModelType.IMAGE_UNDERSTANDING],
    },
    riskAssessment: {
      label: "风险评估模型",
      description: "评估设计中的安全风险和合规性问题",
      icon: AlertCircle,
      requiredTypes: [ModelType.TEXT],
    },
    complianceCheck: {
      label: "合规检查模型",
      description: "检查设计是否符合相关标准和规范",
      icon: Brain,
      requiredTypes: [ModelType.TEXT],
    },
    reportGeneration: {
      label: "报告生成模型",
      description: "生成专业的CAD分析报告",
      icon: Brain,
      requiredTypes: [ModelType.TEXT],
    },
  },
  poster: {
    designAnalysis: {
      label: "设计分析模型",
      description: "分析设计需求和风格偏好",
      icon: Brain,
      requiredTypes: [ModelType.TEXT],
    },
    imageGeneration: {
      label: "图片生成模型",
      description: "生成海报图片和视觉元素",
      icon: ImageIcon,
      requiredTypes: [ModelType.IMAGE_GENERATION],
    },
    textGeneration: {
      label: "文案生成模型",
      description: "生成海报文案和标语",
      icon: Brain,
      requiredTypes: [ModelType.TEXT],
    },
    styleRecommendation: {
      label: "风格推荐模型",
      description: "推荐适合的设计风格和模板",
      icon: Zap,
      requiredTypes: [ModelType.TEXT, ModelType.MULTIMODAL],
    },
    colorAnalysis: {
      label: "色彩分析模型",
      description: "分析和推荐色彩搭配方案",
      icon: Brain,
      requiredTypes: [ModelType.TEXT, ModelType.MULTIMODAL],
    },
  },
  common: {
    speechToText: {
      label: "语音识别模型",
      description: "将语音转换为文字",
      icon: Mic,
      requiredTypes: [ModelType.SPEECH_TO_TEXT],
    },
    textToSpeech: {
      label: "语音合成模型",
      description: "将文字转换为语音",
      icon: Mic,
      requiredTypes: [ModelType.TEXT_TO_SPEECH],
    },
    imageUnderstanding: {
      label: "图片理解模型",
      description: "理解和分析图片内容",
      icon: ImageIcon,
      requiredTypes: [ModelType.IMAGE_UNDERSTANDING, ModelType.MULTIMODAL],
    },
    embedding: {
      label: "向量嵌入模型",
      description: "生成文本和图片的向量表示",
      icon: Globe,
      requiredTypes: [ModelType.EMBEDDING],
    },
    translation: {
      label: "翻译模型",
      description: "多语言翻译功能",
      icon: Globe,
      requiredTypes: [ModelType.TEXT],
    },
  },
}

export function AgentModelConfig({ agentType, value, onChange }: AgentModelConfigProps) {
  const [availableModels, setAvailableModels] = useState<AIModelConfig[]>([])

  useEffect(() => {
    // 加载可用模型
    const models = aiModelManager.getAllModels().filter((model) => model.isActive)
    setAvailableModels(models)
  }, [])

  const getModelsForType = (requiredTypes: ModelType[]): AIModelConfig[] => {
    return availableModels.filter((model) => requiredTypes.includes(model.type as ModelType))
  }

  const handleModelChange = (purpose: string, modelId: string) => {
    const newConfig = { ...value }

    if (agentType === "cad") {
      newConfig.cadModels = {
        ...newConfig.cadModels,
        [purpose]: modelId,
      }
    } else if (agentType === "poster") {
      newConfig.posterModels = {
        ...newConfig.posterModels,
        [purpose]: modelId,
      }
    } else {
      newConfig.commonModels = {
        ...newConfig.commonModels,
        [purpose]: modelId,
      }
    }

    onChange(newConfig)
  }

  const getCurrentValue = (purpose: string): string => {
    if (agentType === "cad") {
      return value.cadModels?.[purpose] || ""
    } else if (agentType === "poster") {
      return value.posterModels?.[purpose] || ""
    } else {
      return value.commonModels?.[purpose] || ""
    }
  }

  const renderModelSelector = (purpose: string, config: any) => {
    const Icon = config.icon
    const availableModelsForType = getModelsForType(config.requiredTypes)
    const currentValue = getCurrentValue(purpose)

    return (
      <div key={purpose} className="space-y-3">
        <div className="flex items-start gap-3">
          <Icon className="h-5 w-5 text-green-600 mt-0.5" />
          <div className="flex-1">
            <Label className="text-base font-medium">{config.label}</Label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{config.description}</p>
            <div className="flex gap-1 mt-2">
              {config.requiredTypes.map((type: ModelType) => (
                <Badge key={type} variant="outline" className="text-xs">
                  {type}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <Select value={currentValue} onValueChange={(modelId) => handleModelChange(purpose, modelId)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="选择模型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">不使用</SelectItem>
            {availableModelsForType.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                <div className="flex items-center justify-between w-full">
                  <span>{model.name}</span>
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {model.provider}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {availableModelsForType.length === 0 && (
          <div className="text-sm text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 p-2 rounded">
            <AlertCircle className="h-4 w-4 inline mr-1" />
            暂无支持的模型类型，请先添加相应的AI模型
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 主要对话模型 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-green-600" />
            主要对话模型
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Label className="text-base">选择主要对话模型</Label>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              用于处理用户的主要对话和问答，建议选择性能较强的文本生成模型
            </p>
            <Select
              value={value.primaryModel || ""}
              onValueChange={(modelId) => onChange({ ...value, primaryModel: modelId })}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择主要对话模型" />
              </SelectTrigger>
              <SelectContent>
                {getModelsForType([ModelType.TEXT, ModelType.MULTIMODAL]).map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{model.name}</span>
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {model.provider}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 专用功能模型 */}
      {agentType === "cad" && (
        <Card>
          <CardHeader>
            <CardTitle>CAD分析专用模型</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(MODEL_PURPOSES.cad).map(([purpose, config]) => renderModelSelector(purpose, config))}
          </CardContent>
        </Card>
      )}

      {agentType === "poster" && (
        <Card>
          <CardHeader>
            <CardTitle>海报生成专用模型</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(MODEL_PURPOSES.poster).map(([purpose, config]) => renderModelSelector(purpose, config))}
          </CardContent>
        </Card>
      )}

      {/* 通用功能模型 */}
      <Card>
        <CardHeader>
          <CardTitle>通用功能模型</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(MODEL_PURPOSES.common).map(([purpose, config]) => renderModelSelector(purpose, config))}
        </CardContent>
      </Card>

      {/* 配置摘要 */}
      <Card>
        <CardHeader>
          <CardTitle>配置摘要</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>主要对话模型:</span>
              <span className="font-medium">
                {value.primaryModel
                  ? availableModels.find((m) => m.id === value.primaryModel)?.name || "未知模型"
                  : "未配置"}
              </span>
            </div>

            {agentType === "cad" && value.cadModels && (
              <>
                <Separator />
                <div className="font-medium">CAD专用模型:</div>
                {Object.entries(value.cadModels).map(([purpose, modelId]) => {
                  if (!modelId) {return null}
                  const model = availableModels.find((m) => m.id === modelId)
                  const purposeConfig = MODEL_PURPOSES.cad[purpose as keyof typeof MODEL_PURPOSES.cad]
                  return (
                    <div key={purpose} className="flex justify-between pl-4">
                      <span>{purposeConfig?.label}:</span>
                      <span className="font-medium">{model?.name || "未知模型"}</span>
                    </div>
                  )
                })}
              </>
            )}

            {agentType === "poster" && value.posterModels && (
              <>
                <Separator />
                <div className="font-medium">海报专用模型:</div>
                {Object.entries(value.posterModels).map(([purpose, modelId]) => {
                  if (!modelId) {return null}
                  const model = availableModels.find((m) => m.id === modelId)
                  const purposeConfig = MODEL_PURPOSES.poster[purpose as keyof typeof MODEL_PURPOSES.poster]
                  return (
                    <div key={purpose} className="flex justify-between pl-4">
                      <span>{purposeConfig?.label}:</span>
                      <span className="font-medium">{model?.name || "未知模型"}</span>
                    </div>
                  )
                })}
              </>
            )}

            {value.commonModels && (
              <>
                <Separator />
                <div className="font-medium">通用功能模型:</div>
                {Object.entries(value.commonModels).map(([purpose, modelId]) => {
                  if (!modelId) {return null}
                  const model = availableModels.find((m) => m.id === modelId)
                  const purposeConfig = MODEL_PURPOSES.common[purpose as keyof typeof MODEL_PURPOSES.common]
                  return (
                    <div key={purpose} className="flex justify-between pl-4">
                      <span>{purposeConfig?.label}:</span>
                      <span className="font-medium">{model?.name || "未知模型"}</span>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
