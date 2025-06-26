// @ts-nocheck
/**
 * 海报实时预览系统
 * 支持实时渲染、缓存优化、性能监控
 */

export interface PreviewConfig {
  width: number
  height: number
  quality: "low" | "medium" | "high"
  format: "webp" | "png" | "jpeg"
  enableCache: boolean
  enableOptimization: boolean
}

export interface PreviewResult {
  success: boolean
  previewUrl?: string
  thumbnailUrl?: string
  renderTime: number
  cacheHit: boolean
  error?: string
}

export class PreviewSystem {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private cache: Map<string, string> = new Map()
  private renderQueue: Map<string, Promise<PreviewResult>> = new Map()

  constructor() {
    if (typeof window !== "undefined") {
      this.initializeCanvas()
    }
  }

  /**
   * 生成实时预览
   */
  async generatePreview(
    template: any,
    userContent: any,
    config: PreviewConfig = this.getDefaultConfig(),
  ): Promise<PreviewResult> {
    const startTime = Date.now()
    const cacheKey = this.generateCacheKey(template, userContent, config)

    // 检查缓存
    if (config.enableCache && this.cache.has(cacheKey)) {
      return {
        success: true,
        previewUrl: this.cache.get(cacheKey)!,
        renderTime: Date.now() - startTime,
        cacheHit: true,
      }
    }

    // 检查是否正在渲染
    if (this.renderQueue.has(cacheKey)) {
      return await this.renderQueue.get(cacheKey)!
    }

    // 开始渲染
    const renderPromise = this.performRender(template, userContent, config, startTime)
    this.renderQueue.set(cacheKey, renderPromise)

    try {
      const result = await renderPromise

      // 缓存结果
      if (config.enableCache && result.success && result.previewUrl) {
        this.cache.set(cacheKey, result.previewUrl)
      }

      return result
    } finally {
      this.renderQueue.delete(cacheKey)
    }
  }

  /**
   * 执行渲染
   */
  private async performRender(
    template: any,
    userContent: any,
    config: PreviewConfig,
    startTime: number,
  ): Promise<PreviewResult> {
    try {
      if (!this.canvas || !this.ctx) {
        throw new Error("Canvas not initialized")
      }

      // 设置画布尺寸
      this.canvas.width = config.width
      this.canvas.height = config.height

      // 清空画布
      this.ctx.clearRect(0, 0, config.width, config.height)

      // 渲染背景
      await this.renderBackground(template, config)

      // 渲染元素
      for (const element of template.elements || []) {
        await this.renderElement(element, userContent, config)
      }

      // 应用后处理效果
      if (config.enableOptimization) {
        await this.applyPostProcessing(template, config)
      }

      // 生成预览图
      const previewUrl = this.canvas.toDataURL(
        config.format === "jpeg" ? "image/jpeg" : "image/png",
        config.quality === "high" ? 0.95 : config.quality === "medium" ? 0.8 : 0.6,
      )

      // 生成缩略图
      const thumbnailUrl = await this.generateThumbnail(previewUrl)

      return {
        success: true,
        previewUrl,
        thumbnailUrl,
        renderTime: Date.now() - startTime,
        cacheHit: false,
      }
    } catch (error) {
      console.error("Preview render failed:", error)
      return {
        success: false,
        renderTime: Date.now() - startTime,
        cacheHit: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  /**
   * 渲染背景
   */
  private async renderBackground(template: any, config: PreviewConfig): Promise<void> {
    if (!this.ctx) {return}

    const bgElement = template.elements?.find((e: any) => e.type === "background")
    if (!bgElement) {return}

    const { style } = bgElement

    if (style.gradient) {
      // 渲染渐变背景
      const gradient = this.parseGradient(style.gradient, config.width, config.height)
      this.ctx.fillStyle = gradient
    } else if (style.backgroundColor) {
      // 渲染纯色背景
      this.ctx.fillStyle = style.backgroundColor
    }

    this.ctx.fillRect(0, 0, config.width, config.height)
  }

  /**
   * 渲染元素
   */
  private async renderElement(element: any, userContent: any, config: PreviewConfig): Promise<void> {
    if (!this.ctx || element.type === "background") {return}

    const { position, style, content, type } = element
    const x = (position.x / 100) * config.width
    const y = (position.y / 100) * config.height
    const width = (position.width / 100) * config.width
    const height = (position.height / 100) * config.height

    this.ctx.save()

    // 应用变换
    if (style.transform) {
      this.applyTransform(style.transform, x + width / 2, y + height / 2)
    }

    // 应用透明度
    if (style.opacity !== undefined) {
      this.ctx.globalAlpha = style.opacity
    }

    switch (type) {
      case "text":
        await this.renderText(content, x, y, width, height, style, userContent)
        break
      case "image":
        await this.renderImage(content, x, y, width, height, style)
        break
      case "shape":
        await this.renderShape(x, y, width, height, style)
        break
      case "icon":
        await this.renderIcon(content, x, y, width, height, style)
        break
    }

    this.ctx.restore()
  }

  /**
   * 渲染文本
   */
  private async renderText(
    content: string,
    x: number,
    y: number,
    width: number,
    height: number,
    style: any,
    userContent: any,
  ): Promise<void> {
    if (!this.ctx) {return}

    // 替换占位符
    let text = content || ""
    if (userContent) {
      text = text.replace(/\{\{(\w+)\}\}/g, (match, key) => userContent[key] || match)
    }

    // 设置字体样式
    const fontSize = (style.fontSize || 16) * (this.canvas!.width / 800) // 响应式字体大小
    const fontWeight = style.fontWeight || "normal"
    const fontFamily = style.fontFamily || "Arial"

    this.ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
    this.ctx.fillStyle = style.color || "#000000"
    this.ctx.textAlign = style.textAlign || "left"
    this.ctx.textBaseline = "top"

    // 文本换行处理
    const lines = this.wrapText(text, width)
    const lineHeight = fontSize * 1.2

    lines.forEach((line, index) => {
      const lineY = y + index * lineHeight
      if (lineY + lineHeight <= y + height) {
        this.ctx!.fillText(line, x, lineY)
      }
    })
  }

  /**
   * 渲染图片
   */
  private async renderImage(
    src: string,
    x: number,
    y: number,
    width: number,
    height: number,
    style: any,
  ): Promise<void> {
    if (!this.ctx || !src) {return}

    try {
      const img = new Image()
      img.crossOrigin = "anonymous"

      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = src
      })

      // 计算适配尺寸
      const { drawX, drawY, drawWidth, drawHeight } = this.calculateImageFit(
        img.width,
        img.height,
        x,
        y,
        width,
        height,
        style.objectFit || "cover",
      )

      this.ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)
    } catch (error) {
      console.error("Failed to render image:", error)
      // 渲染占位符
      this.ctx.fillStyle = "#f3f4f6"
      this.ctx.fillRect(x, y, width, height)
      this.ctx.fillStyle = "#9ca3af"
      this.ctx.font = "16px Arial"
      this.ctx.textAlign = "center"
      this.ctx.fillText("图片加载失败", x + width / 2, y + height / 2)
    }
  }

  /**
   * 渲染形状
   */
  private async renderShape(x: number, y: number, width: number, height: number, style: any): Promise<void> {
    if (!this.ctx) {return}

    this.ctx.fillStyle = style.backgroundColor || "#000000"

    switch (style.shape) {
      case "circle":
        const radius = Math.min(width, height) / 2
        this.ctx.beginPath()
        this.ctx.arc(x + width / 2, y + height / 2, radius, 0, 2 * Math.PI)
        this.ctx.fill()
        break
      case "rectangle":
      default:
        this.ctx.fillRect(x, y, width, height)
        break
    }
  }

  /**
   * 渲染图标
   */
  private async renderIcon(
    iconName: string,
    x: number,
    y: number,
    width: number,
    height: number,
    style: any,
  ): Promise<void> {
    // 图标渲染逻辑（可以集成图标库）
    if (!this.ctx) {return}

    this.ctx.fillStyle = style.color || "#000000"
    this.ctx.font = `${Math.min(width, height)}px "Lucide Icons"`
    this.ctx.textAlign = "center"
    this.ctx.textBaseline = "middle"
    this.ctx.fillText("📄", x + width / 2, y + height / 2)
  }

  /**
   * 应用后处理效果
   */
  private async applyPostProcessing(template: any, config: PreviewConfig): Promise<void> {
    if (!this.ctx || !template.style?.effects) {return}

    for (const effect of template.style.effects) {
      switch (effect.type) {
        case "shadow":
          this.applyShadowEffect(effect.config)
          break
        case "blur":
          this.applyBlurEffect(effect.config)
          break
      }
    }
  }

  /**
   * 应用阴影效果
   */
  private applyShadowEffect(config: any): void {
    if (!this.ctx) {return}

    this.ctx.shadowColor = config.color || "#000000"
    this.ctx.shadowBlur = config.blur || 10
    this.ctx.shadowOffsetX = config.offsetX || 0
    this.ctx.shadowOffsetY = config.offsetY || 0
  }

  /**
   * 应用模糊效果
   */
  private applyBlurEffect(config: any): void {
    if (!this.ctx) {return}

    this.ctx.filter = `blur(${config.radius || 2}px)`
  }

  /**
   * 解析渐变
   */
  private parseGradient(gradientStr: string, width: number, height: number): CanvasGradient {
    if (!this.ctx) {throw new Error("Canvas context not available")}

    // 简化的渐变解析（实际项目中需要更完整的解析）
    if (gradientStr.includes("linear-gradient")) {
      const gradient = this.ctx.createLinearGradient(0, 0, width, height)
      gradient.addColorStop(0, "#667eea")
      gradient.addColorStop(1, "#764ba2")
      return gradient
    } else if (gradientStr.includes("radial-gradient")) {
      const gradient = this.ctx.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        Math.min(width, height) / 2,
      )
      gradient.addColorStop(0, "#fbbf24")
      gradient.addColorStop(1, "#d97706")
      return gradient
    }

    // 默认渐变
    const gradient = this.ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, "#f3f4f6")
    gradient.addColorStop(1, "#e5e7eb")
    return gradient
  }

  /**
   * 应用变换
   */
  private applyTransform(transform: string, centerX: number, centerY: number): void {
    if (!this.ctx) {return}

    this.ctx.translate(centerX, centerY)

    if (transform.includes("rotate")) {
      const match = transform.match(/rotate$$([^)]+)$$/)
      if (match) {
        const angle = Number.parseFloat(match[1]) * (Math.PI / 180)
        this.ctx.rotate(angle)
      }
    }

    this.ctx.translate(-centerX, -centerY)
  }

  /**
   * 文本换行
   */
  private wrapText(text: string, maxWidth: number): string[] {
    if (!this.ctx) {return [text]}

    const words = text.split(" ")
    const lines: string[] = []
    let currentLine = ""

    for (const word of words) {
      const testLine = currentLine + (currentLine ? " " : "") + word
      const metrics = this.ctx.measureText(testLine)

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    }

    if (currentLine) {
      lines.push(currentLine)
    }

    return lines
  }

  /**
   * 计算图片适配
   */
  private calculateImageFit(
    imgWidth: number,
    imgHeight: number,
    x: number,
    y: number,
    width: number,
    height: number,
    objectFit: string,
  ): { drawX: number; drawY: number; drawWidth: number; drawHeight: number } {
    const imgAspect = imgWidth / imgHeight
    const containerAspect = width / height

    let drawWidth = width
    let drawHeight = height
    let drawX = x
    let drawY = y

    if (objectFit === "cover") {
      if (imgAspect > containerAspect) {
        drawWidth = height * imgAspect
        drawX = x - (drawWidth - width) / 2
      } else {
        drawHeight = width / imgAspect
        drawY = y - (drawHeight - height) / 2
      }
    } else if (objectFit === "contain") {
      if (imgAspect > containerAspect) {
        drawHeight = width / imgAspect
        drawY = y + (height - drawHeight) / 2
      } else {
        drawWidth = height * imgAspect
        drawX = x + (width - drawWidth) / 2
      }
    }

    return { drawX, drawY, drawWidth, drawHeight }
  }

  /**
   * 生成缩略图
   */
  private async generateThumbnail(previewUrl: string): Promise<string> {
    try {
      const thumbnailCanvas = document.createElement("canvas")
      const thumbnailCtx = thumbnailCanvas.getContext("2d")
      if (!thumbnailCtx) {throw new Error("Failed to get thumbnail context")}

      thumbnailCanvas.width = 300
      thumbnailCanvas.height = 300

      const img = new Image()
      img.crossOrigin = "anonymous"

      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = previewUrl
      })

      thumbnailCtx.drawImage(img, 0, 0, 300, 300)
      return thumbnailCanvas.toDataURL("image/jpeg", 0.8)
    } catch (error) {
      console.error("Thumbnail generation failed:", error)
      return previewUrl
    }
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(template: any, userContent: any, config: PreviewConfig): string {
    const data = {
      templateId: template.id,
      userContent,
      config: {
        width: config.width,
        height: config.height,
        quality: config.quality,
      },
    }
    return btoa(JSON.stringify(data))
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): PreviewConfig {
    return {
      width: 800,
      height: 600,
      quality: "medium",
      format: "webp",
      enableCache: true,
      enableOptimization: true,
    }
  }

  /**
   * 初始化画布
   */
  private initializeCanvas(): void {
    this.canvas = document.createElement("canvas")
    this.ctx = this.canvas.getContext("2d")

    if (!this.ctx) {
      console.error("Failed to get canvas context")
    }
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    }
  }
}

// 创建默认实例
export const previewSystem = new PreviewSystem()
