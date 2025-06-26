// @ts-nocheck
/**
 * 海报导出系统
 * 支持多格式导出、批量处理、质量优化
 */

export interface ExportConfig {
  format: "png" | "jpeg" | "pdf" | "svg" | "webp"
  quality: number
  width: number
  height: number
  dpi: number
  compression: boolean
  watermark?: WatermarkConfig
  metadata?: ExportMetadata
}

export interface WatermarkConfig {
  enabled: boolean
  text?: string
  image?: string
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center"
  opacity: number
  size: number
}

export interface ExportMetadata {
  title?: string
  author?: string
  subject?: string
  keywords?: string[]
  creator?: string
  producer?: string
}

export interface ExportResult {
  success: boolean
  downloadUrl?: string
  fileSize?: number
  exportTime: number
  error?: string
}

export class ExportSystem {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null

  constructor() {
    if (typeof window !== "undefined") {
      this.initializeCanvas()
    }
  }

  /**
   * 导出海报
   */
  async exportPoster(template: any, userContent: any, config: ExportConfig): Promise<ExportResult> {
    const startTime = Date.now()

    try {
      // 验证配置
      this.validateConfig(config)

      // 根据格式选择导出方法
      let result: ExportResult

      switch (config.format) {
        case "png":
        case "jpeg":
        case "webp":
          result = await this.exportRasterImage(template, userContent, config)
          break
        case "pdf":
          result = await this.exportPDF(template, userContent, config)
          break
        case "svg":
          result = await this.exportSVG(template, userContent, config)
          break
        default:
          throw new Error(`Unsupported format: ${config.format}`)
      }

      result.exportTime = Date.now() - startTime
      return result
    } catch (error) {
      console.error("Export failed:", error)
      return {
        success: false,
        exportTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  /**
   * 批量导出
   */
  async exportBatch(templates: any[], userContents: any[], configs: ExportConfig[]): Promise<ExportResult[]> {
    const results: ExportResult[] = []

    for (let i = 0; i < templates.length; i++) {
      const template = templates[i]
      const userContent = userContents[i] || {}
      const config = configs[i] || this.getDefaultConfig()

      const result = await this.exportPoster(template, userContent, config)
      results.push(result)
    }

    return results
  }

  /**
   * 导出光栅图像
   */
  private async exportRasterImage(template: any, userContent: any, config: ExportConfig): Promise<ExportResult> {
    if (!this.canvas || !this.ctx) {
      throw new Error("Canvas not initialized")
    }

    // 设置高分辨率画布
    const scaleFactor = config.dpi / 72 // 72 DPI 是默认值
    const canvasWidth = config.width * scaleFactor
    const canvasHeight = config.height * scaleFactor

    this.canvas.width = canvasWidth
    this.canvas.height = canvasHeight
    this.ctx.scale(scaleFactor, scaleFactor)

    // 渲染海报
    await this.renderPosterToCanvas(template, userContent, config)

    // 添加水印
    if (config.watermark?.enabled) {
      await this.addWatermark(config.watermark, config)
    }

    // 生成图像数据
    const mimeType = this.getMimeType(config.format)
    const quality = config.format === "jpeg" ? config.quality : undefined
    const dataUrl = this.canvas.toDataURL(mimeType, quality)

    // 转换为 Blob
    const blob = await this.dataUrlToBlob(dataUrl)

    // 压缩（如果启用）
    const finalBlob = config.compression ? await this.compressImage(blob, config) : blob

    // 上传到服务器
    const downloadUrl = await this.uploadBlob(finalBlob, config.format)

    return {
      success: true,
      downloadUrl,
      fileSize: finalBlob.size,
      exportTime: 0, // 将在调用方设置
    }
  }

  /**
   * 导出PDF
   */
  private async exportPDF(template: any, userContent: any, config: ExportConfig): Promise<ExportResult> {
    try {
      // 首先生成高质量的PNG
      const pngConfig: ExportConfig = {
        ...config,
        format: "png",
        quality: 1.0,
        compression: false,
      }

      const pngResult = await this.exportRasterImage(template, userContent, pngConfig)
      if (!pngResult.success || !pngResult.downloadUrl) {
        throw new Error("Failed to generate PNG for PDF conversion")
      }

      // 调用PDF转换API
      const response = await fetch("/api/poster/convert-to-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: pngResult.downloadUrl,
          width: config.width,
          height: config.height,
          metadata: config.metadata,
        }),
      })

      if (!response.ok) {
        throw new Error("PDF conversion failed")
      }

      const result = await response.json()

      return {
        success: true,
        downloadUrl: result.pdfUrl,
        fileSize: result.fileSize,
        exportTime: 0,
      }
    } catch (error) {
      throw new Error(`PDF export failed: ${error}`)
    }
  }

  /**
   * 导出SVG
   */
  private async exportSVG(template: any, userContent: any, config: ExportConfig): Promise<ExportResult> {
    try {
      // 生成SVG内容
      const svgContent = this.generateSVG(template, userContent, config)

      // 创建Blob
      const blob = new Blob([svgContent], { type: "image/svg+xml" })

      // 上传到服务器
      const downloadUrl = await this.uploadBlob(blob, "svg")

      return {
        success: true,
        downloadUrl,
        fileSize: blob.size,
        exportTime: 0,
      }
    } catch (error) {
      throw new Error(`SVG export failed: ${error}`)
    }
  }

  /**
   * 渲染海报到画布
   */
  private async renderPosterToCanvas(template: any, userContent: any, config: ExportConfig): Promise<void> {
    if (!this.ctx) {return}

    // 清空画布
    this.ctx.clearRect(0, 0, config.width, config.height)

    // 设置高质量渲染
    this.ctx.imageSmoothingEnabled = true
    this.ctx.imageSmoothingQuality = "high"

    // 渲染背景
    await this.renderBackground(template, config)

    // 渲染所有元素
    for (const element of template.elements || []) {
      if (element.type !== "background") {
        await this.renderElement(element, userContent, config)
      }
    }
  }

  /**
   * 渲染背景
   */
  private async renderBackground(template: any, config: ExportConfig): Promise<void> {
    if (!this.ctx) {return}

    const bgElement = template.elements?.find((e: any) => e.type === "background")
    if (!bgElement) {
      // 默认白色背景
      this.ctx.fillStyle = "#ffffff"
      this.ctx.fillRect(0, 0, config.width, config.height)
      return
    }

    const { style } = bgElement

    if (style.gradient) {
      const gradient = this.parseGradient(style.gradient, config.width, config.height)
      this.ctx.fillStyle = gradient
    } else if (style.backgroundColor) {
      this.ctx.fillStyle = style.backgroundColor
    } else {
      this.ctx.fillStyle = "#ffffff"
    }

    this.ctx.fillRect(0, 0, config.width, config.height)
  }

  /**
   * 渲染元素
   */
  private async renderElement(element: any, userContent: any, config: ExportConfig): Promise<void> {
    if (!this.ctx) {return}

    const { position, style, content, type } = element
    const x = (position.x / 100) * config.width
    const y = (position.y / 100) * config.height
    const width = (position.width / 100) * config.width
    const height = (position.height / 100) * config.height

    this.ctx.save()

    // 应用样式
    if (style.opacity !== undefined) {
      this.ctx.globalAlpha = style.opacity
    }

    switch (type) {
      case "text":
        await this.renderTextElement(content, x, y, width, height, style, userContent, config)
        break
      case "image":
        await this.renderImageElement(content, x, y, width, height, style, config)
        break
      case "shape":
        await this.renderShapeElement(x, y, width, height, style)
        break
    }

    this.ctx.restore()
  }

  /**
   * 渲染文本元素
   */
  private async renderTextElement(
    content: string,
    x: number,
    y: number,
    width: number,
    height: number,
    style: any,
    userContent: any,
    config: ExportConfig,
  ): Promise<void> {
    if (!this.ctx) {return}

    // 替换占位符
    let text = content || ""
    if (userContent) {
      text = text.replace(/\{\{(\w+)\}\}/g, (match, key) => userContent[key] || match)
    }

    // 计算字体大小（基于DPI）
    const baseFontSize = style.fontSize || 16
    const scaledFontSize = baseFontSize * (config.dpi / 72)

    // 设置字体
    const fontWeight = style.fontWeight || "normal"
    const fontFamily = style.fontFamily || "Arial"
    this.ctx.font = `${fontWeight} ${scaledFontSize}px ${fontFamily}`
    this.ctx.fillStyle = style.color || "#000000"
    this.ctx.textAlign = style.textAlign || "left"

    // 高质量文本渲染
    this.ctx.textBaseline = "top"

    // 文本换行和渲染
    const lines = this.wrapText(text, width)
    const lineHeight = scaledFontSize * 1.2

    lines.forEach((line, index) => {
      const lineY = y + index * lineHeight
      if (lineY + lineHeight <= y + height) {
        this.ctx!.fillText(line, x, lineY)
      }
    })
  }

  /**
   * 渲染图像元素
   */
  private async renderImageElement(
    src: string,
    x: number,
    y: number,
    width: number,
    height: number,
    style: any,
    config: ExportConfig,
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

      // 高质量图像渲染
      this.ctx.imageSmoothingEnabled = true
      this.ctx.imageSmoothingQuality = "high"

      this.ctx.drawImage(img, x, y, width, height)
    } catch (error) {
      console.error("Failed to render image:", error)
      // 渲染占位符
      this.ctx.fillStyle = "#f3f4f6"
      this.ctx.fillRect(x, y, width, height)
    }
  }

  /**
   * 渲染形状元素
   */
  private async renderShapeElement(x: number, y: number, width: number, height: number, style: any): Promise<void> {
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
   * 添加水印
   */
  private async addWatermark(watermark: WatermarkConfig, config: ExportConfig): Promise<void> {
    if (!this.ctx) {return}

    this.ctx.save()
    this.ctx.globalAlpha = watermark.opacity

    const { x, y } = this.getWatermarkPosition(watermark.position, config, watermark.size)

    if (watermark.text) {
      // 文本水印
      this.ctx.font = `${watermark.size}px Arial`
      this.ctx.fillStyle = "#000000"
      this.ctx.fillText(watermark.text, x, y)
    } else if (watermark.image) {
      // 图像水印
      try {
        const img = new Image()
        img.crossOrigin = "anonymous"

        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
          img.src = watermark.image!
        })

        this.ctx.drawImage(img, x, y, watermark.size, watermark.size)
      } catch (error) {
        console.error("Failed to add image watermark:", error)
      }
    }

    this.ctx.restore()
  }

  /**
   * 获取水印位置
   */
  private getWatermarkPosition(position: string, config: ExportConfig, size: number): { x: number; y: number } {
    const margin = 20

    switch (position) {
      case "top-left":
        return { x: margin, y: margin }
      case "top-right":
        return { x: config.width - size - margin, y: margin }
      case "bottom-left":
        return { x: margin, y: config.height - size - margin }
      case "bottom-right":
        return { x: config.width - size - margin, y: config.height - size - margin }
      case "center":
      default:
        return { x: (config.width - size) / 2, y: (config.height - size) / 2 }
    }
  }

  /**
   * 生成SVG内容
   */
  private generateSVG(template: any, userContent: any, config: ExportConfig): string {
    let svgContent = `<svg width="${config.width}" height="${config.height}" xmlns="http://www.w3.org/2000/svg">`

    // 添加元数据
    if (config.metadata) {
      svgContent += `<metadata>`
      svgContent += `<title>${config.metadata.title || ""}</title>`
      svgContent += `<desc>${config.metadata.subject || ""}</desc>`
      svgContent += `</metadata>`
    }

    // 渲染元素
    for (const element of template.elements || []) {
      svgContent += this.elementToSVG(element, userContent, config)
    }

    svgContent += "</svg>"
    return svgContent
  }

  /**
   * 元素转SVG
   */
  private elementToSVG(element: any, userContent: any, config: ExportConfig): string {
    const { position, style, content, type } = element
    const x = (position.x / 100) * config.width
    const y = (position.y / 100) * config.height
    const width = (position.width / 100) * config.width
    const height = (position.height / 100) * config.height

    switch (type) {
      case "background":
        return `<rect x="0" y="0" width="${config.width}" height="${config.height}" fill="${style.backgroundColor || "#ffffff"}"/>`

      case "text":
        let text = content || ""
        if (userContent) {
          text = text.replace(/\{\{(\w+)\}\}/g, (match, key) => userContent[key] || match)
        }
        return `<text x="${x}" y="${y}" font-size="${style.fontSize || 16}" fill="${style.color || "#000000"}" font-family="${style.fontFamily || "Arial"}">${text}</text>`

      case "shape":
        if (style.shape === "circle") {
          const radius = Math.min(width, height) / 2
          return `<circle cx="${x + width / 2}" cy="${y + height / 2}" r="${radius}" fill="${style.backgroundColor || "#000000"}"/>`
        } else {
          return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${style.backgroundColor || "#000000"}"/>`
        }

      case "image":
        return `<image x="${x}" y="${y}" width="${width}" height="${height}" href="${content || ""}"/>`

      default:
        return ""
    }
  }

  /**
   * 解析渐变
   */
  private parseGradient(gradientStr: string, width: number, height: number): CanvasGradient {
    if (!this.ctx) {throw new Error("Canvas context not available")}

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

    const gradient = this.ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, "#f3f4f6")
    gradient.addColorStop(1, "#e5e7eb")
    return gradient
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
   * 获取MIME类型
   */
  private getMimeType(format: string): string {
    const mimeTypes: Record<string, string> = {
      png: "image/png",
      jpeg: "image/jpeg",
      webp: "image/webp",
    }
    return mimeTypes[format] || "image/png"
  }

  /**
   * DataURL转Blob
   */
  private async dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const response = await fetch(dataUrl)
    return await response.blob()
  }

  /**
   * 压缩图像
   */
  private async compressImage(blob: Blob, config: ExportConfig): Promise<Blob> {
    try {
      const response = await fetch("/api/images/compress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quality: config.quality,
          format: config.format,
        }),
      })

      if (!response.ok) {
        throw new Error("Compression failed")
      }

      return await response.blob()
    } catch (error) {
      console.error("Image compression failed:", error)
      return blob // 返回原始blob作为fallback
    }
  }

  /**
   * 上传Blob到服务器
   */
  private async uploadBlob(blob: Blob, format: string): Promise<string> {
    try {
      const formData = new FormData()
      formData.append("file", blob, `export_${Date.now()}.${format}`)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Upload failed")
      }

      const result = await response.json()
      return result.url
    } catch (error) {
      console.error("Upload failed:", error)
      // 返回临时URL作为fallback
      return URL.createObjectURL(blob)
    }
  }

  /**
   * 验证配置
   */
  private validateConfig(config: ExportConfig): void {
    if (config.width <= 0 || config.height <= 0) {
      throw new Error("Invalid dimensions")
    }

    if (config.quality < 0 || config.quality > 1) {
      throw new Error("Quality must be between 0 and 1")
    }

    if (config.dpi < 72 || config.dpi > 600) {
      throw new Error("DPI must be between 72 and 600")
    }
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): ExportConfig {
    return {
      format: "png",
      quality: 0.9,
      width: 800,
      height: 600,
      dpi: 150,
      compression: true,
      watermark: {
        enabled: false,
        position: "bottom-right",
        opacity: 0.5,
        size: 50,
      },
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
}

// 创建默认实例
export const exportSystem = new ExportSystem()
