// @ts-nocheck
/**
 * 海报设计智能体类型定义
 * 严格按照设计文档的数据结构要求
 */

// 海报生成请求
export interface PosterGenerationRequest {
  description: string
  style?: string
  size?: string
  palette?: string
  referenceImageUrl?: string | null
  timestamp: Date
}

// 海报生成结果
export interface PosterGenerationResult {
  id: string
  imageUrl: string
  thumbnailUrl?: string
  metadata: {
    generationTime: number
    style: string
    size: string
    palette: string
  }
  createdAt: Date
}

// 海报任务 - 按照设计文档定义
export interface PosterTask {
  id: string
  userId: string
  description: string
  style: string
  size: string
  palette: string
  referenceImageUrl?: string
  resultImageUrl: string
  createdAt: Date
}

// 海报风格定义
export interface PosterStyle {
  id: string
  name: string
  description: string
  category: string
  previewUrl?: string
}

// 海报尺寸定义
export interface PosterSize {
  id: string
  name: string
  dimensions: string
  ratio: string
  width: number
  height: number
}

// 配色方案定义
export interface ColorPalette {
  id: string
  name: string
  colors: string[]
  description?: string
}
