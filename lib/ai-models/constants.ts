import { Brain, Zap, Mic, ImageIcon, Code, Globe } from "lucide-react"
import { ModelType } from "@/types/ai-models"

// 模型类型图标映射
export const MODEL_TYPE_ICONS = {
  [ModelType.TEXT]: Brain,
  [ModelType.MULTIMODAL]: Zap,
  [ModelType.SPEECH_TO_TEXT]: Mic,
  [ModelType.TEXT_TO_SPEECH]: Mic,
  [ModelType.IMAGE_GENERATION]: ImageIcon,
  [ModelType.IMAGE_UNDERSTANDING]: ImageIcon,
  [ModelType.EMBEDDING]: Globe,
  [ModelType.CODE_GENERATION]: Code,
}

// 模型类型中文名称
export const MODEL_TYPE_NAMES = {
  [ModelType.TEXT]: "文本生成",
  [ModelType.MULTIMODAL]: "多模态",
  [ModelType.SPEECH_TO_TEXT]: "语音识别",
  [ModelType.TEXT_TO_SPEECH]: "语音合成",
  [ModelType.IMAGE_GENERATION]: "图片生成",
  [ModelType.IMAGE_UNDERSTANDING]: "图片理解",
  [ModelType.EMBEDDING]: "向量嵌入",
  [ModelType.CODE_GENERATION]: "代码生成",
}
