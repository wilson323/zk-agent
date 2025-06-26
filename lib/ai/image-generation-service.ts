// @ts-nocheck
/**
 * AI图像生成服务
 * 集成多种AI图像生成API
 */

export interface ImageGenerationRequest {
  prompt: string
  style?: string
  size?: string
  quality?: number
  negativePrompt?: string
  seed?: number
  steps?: number
  guidance?: number
}

export interface ImageGenerationResponse {
  success: boolean
  imageUrl?: string
  thumbnailUrl?: string
  metadata?: {
    model: string
    prompt: string
    seed: number
    steps: number
    guidance: number
    generationTime: number
  }
  error?: string
}

export class ImageGenerationService {
  private apiKey: string
  private baseUrl: string
  private model: string

  constructor(config: {
    apiKey: string
    baseUrl: string
    model?: string
  }) {
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl
    this.model = config.model || "stable-diffusion-xl"
  }

  /**
   * 生成图像
   */
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    try {
      const startTime = Date.now()

      // 优化提示词
      const optimizedPrompt = this.optimizePrompt(request.prompt, request.style)

      // 调用AI服务
      const response = await fetch(`${this.baseUrl}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          prompt: optimizedPrompt,
          negative_prompt: request.negativePrompt || this.getDefaultNegativePrompt(),
          width: this.getSizeConfig(request.size).width,
          height: this.getSizeConfig(request.size).height,
          num_inference_steps: request.steps || 30,
          guidance_scale: request.guidance || 7.5,
          seed: request.seed || Math.floor(Math.random() * 1000000),
          quality: request.quality || 0.8,
        }),
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`)
      }

      const result = await response.json()
      const generationTime = Date.now() - startTime

      // 处理结果
      if (result.images && result.images.length > 0) {
        const imageUrl = await this.uploadToStorage(result.images[0])
        const thumbnailUrl = await this.generateThumbnail(imageUrl)

        return {
          success: true,
          imageUrl,
          thumbnailUrl,
          metadata: {
            model: this.model,
            prompt: optimizedPrompt,
            seed: result.seed || request.seed || 0,
            steps: request.steps || 30,
            guidance: request.guidance || 7.5,
            generationTime,
          },
        }
      } else {
        throw new Error("No images generated")
      }
    } catch (error) {
      console.error("Image generation failed:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  /**
   * 批量生成图像
   */
  async generateBatch(requests: ImageGenerationRequest[]): Promise<ImageGenerationResponse[]> {
    const results = await Promise.allSettled(requests.map((request) => this.generateImage(request)))

    return results.map((result) =>
      result.status === "fulfilled" ? result.value : { success: false, error: "Generation failed" },
    )
  }

  /**
   * 优化提示词
   */
  private optimizePrompt(prompt: string, style?: string): string {
    let optimized = prompt.trim()

    // 添加风格关键词
    if (style) {
      const styleKeywords = this.getStyleKeywords(style)
      optimized = `${optimized}, ${styleKeywords.join(", ")}`
    }

    // 添加质量提升关键词
    optimized += ", high quality, professional design, clean composition, detailed, masterpiece"

    return optimized
  }

  /**
   * 获取风格关键词
   */
  private getStyleKeywords(style: string): string[] {
    const styleMap: Record<string, string[]> = {
      modern: ["modern", "minimalist", "clean lines", "geometric", "contemporary"],
      vintage: ["vintage", "retro", "classic", "nostalgic", "aged"],
      artistic: ["artistic", "creative", "abstract", "expressive", "painterly"],
      tech: ["futuristic", "digital", "gradient", "neon", "cyberpunk"],
      nature: ["natural", "organic", "green", "eco-friendly", "botanical"],
      business: ["professional", "corporate", "clean", "trustworthy", "elegant"],
    }

    return styleMap[style] || []
  }

  /**
   * 获取默认负面提示词
   */
  private getDefaultNegativePrompt(): string {
    return "low quality, blurry, distorted, watermark, text, signature, ugly, bad anatomy, extra limbs"
  }

  /**
   * 获取尺寸配置
   */
  private getSizeConfig(size?: string): { width: number; height: number } {
    const sizeMap: Record<string, { width: number; height: number }> = {
      square: { width: 1024, height: 1024 },
      portrait: { width: 768, height: 1024 },
      landscape: { width: 1024, height: 768 },
      a4: { width: 595, height: 842 },
      a3: { width: 842, height: 1191 },
      banner: { width: 1920, height: 1080 },
      story: { width: 1080, height: 1920 },
    }

    return sizeMap[size || "square"] || sizeMap.square
  }

  /**
   * 上传到存储服务
   */
  private async uploadToStorage(imageData: string): Promise<string> {
    try {
      // 将base64转换为blob
      const response = await fetch(imageData)
      const blob = await response.blob()

      // 上传到存储服务
      const formData = new FormData()
      formData.append("file", blob, `generated_${Date.now()}.png`)

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error("Upload failed")
      }

      const result = await uploadResponse.json()
      return result.url
    } catch (error) {
      console.error("Upload failed:", error)
      // 返回临时URL作为fallback
      return `/api/images/temp/${Date.now()}.png`
    }
  }

  /**
   * 生成缩略图
   */
  private async generateThumbnail(imageUrl: string): Promise<string> {
    try {
      const response = await fetch("/api/images/thumbnail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl,
          width: 300,
          height: 300,
        }),
      })

      if (!response.ok) {
        throw new Error("Thumbnail generation failed")
      }

      const result = await response.json()
      return result.thumbnailUrl
    } catch (error) {
      console.error("Thumbnail generation failed:", error)
      return imageUrl // 返回原图作为fallback
    }
  }
}

// 创建默认实例
export const imageGenerationService = new ImageGenerationService({
  apiKey: process.env.AI_IMAGE_API_KEY || "",
  baseUrl: process.env.AI_IMAGE_API_URL || "https://api.stability.ai/v1",
  model: process.env.AI_IMAGE_MODEL || "stable-diffusion-xl",
})
