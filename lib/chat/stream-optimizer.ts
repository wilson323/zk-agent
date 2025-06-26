// @ts-nocheck
/**
 * 流式响应优化器
 * 优化AI对话的流式响应性能和用户体验
 */

export interface StreamConfig {
  chunkSize: number
  delayBetweenChunks: number
  enableCompression: boolean
  enableBuffering: boolean
  maxBufferSize: number
  retryAttempts: number
  retryDelay: number
  // 新增智能优化配置
  enableAdaptiveChunking: boolean
  networkSpeedDetection: boolean
  priorityBasedDelivery: boolean
  contentAwareOptimization: boolean
}

export interface StreamMetrics {
  totalChunks: number
  processedChunks: number
  averageChunkSize: number
  totalLatency: number
  throughput: number
  errorRate: number
}

export class StreamOptimizer {
  private config: StreamConfig
  private metrics: StreamMetrics
  private buffer: string[] = []
  private isBuffering = false

  constructor(config: Partial<StreamConfig> = {}) {
    this.config = {
      chunkSize: 50,
      delayBetweenChunks: 10,
      enableCompression: true,
      enableBuffering: true,
      maxBufferSize: 1000,
      retryAttempts: 3,
      retryDelay: 1000,
      enableAdaptiveChunking: false,
      networkSpeedDetection: false,
      priorityBasedDelivery: false,
      contentAwareOptimization: false,
      ...config,
    }

    this.metrics = {
      totalChunks: 0,
      processedChunks: 0,
      averageChunkSize: 0,
      totalLatency: 0,
      throughput: 0,
      errorRate: 0,
    }
  }

  /**
   * 优化流式响应
   */
  async optimizeStream(
    stream: ReadableStream<Uint8Array>,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void,
  ): Promise<void> {
    const startTime = Date.now()
    const reader = stream.getReader()
    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          // 处理缓冲区中剩余的内容
          if (this.buffer.length > 0) {
            await this.flushBuffer(onChunk)
          }

          this.updateMetrics(startTime)
          onComplete()
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        await this.processChunk(chunk, onChunk)
      }
    } catch (error) {
      this.metrics.errorRate++
      onError(error as Error)
    } finally {
      reader.releaseLock()
    }
  }

  /**
   * 处理单个数据块
   */
  private async processChunk(chunk: string, onChunk: (chunk: string) => void): Promise<void> {
    this.metrics.totalChunks++

    if (this.config.enableBuffering) {
      await this.bufferChunk(chunk, onChunk)
    } else {
      await this.directProcess(chunk, onChunk)
    }
  }

  /**
   * 缓冲处理
   */
  private async bufferChunk(chunk: string, onChunk: (chunk: string) => void): Promise<void> {
    this.buffer.push(chunk)

    if (this.buffer.join("").length >= this.config.maxBufferSize || !this.isBuffering) {
      await this.flushBuffer(onChunk)
    }
  }

  /**
   * 刷新缓冲区
   */
  private async flushBuffer(onChunk: (chunk: string) => void): Promise<void> {
    if (this.buffer.length === 0) {return}

    const content = this.buffer.join("")
    this.buffer = []

    // 按配置的块大小分割内容
    let chunks = this.splitIntoChunks(content, this.config.chunkSize)

    // 自适应块大小调整
    if (this.config.enableAdaptiveChunking) {
      const networkSpeed = await this.detectNetworkSpeed()
      const adaptedChunkSize = this.adaptChunkSize(networkSpeed, "text") // 假设内容类型为 'text'
      chunks = this.splitIntoChunks(content, adaptedChunkSize)
    }

    for (const chunk of chunks) {
      onChunk(chunk)
      this.metrics.processedChunks++

      if (this.config.delayBetweenChunks > 0) {
        await this.delay(this.config.delayBetweenChunks)
      }
    }
  }

  /**
   * 直接处理
   */
  private async directProcess(chunk: string, onChunk: (chunk: string) => void): Promise<void> {
    let chunks = this.splitIntoChunks(chunk, this.config.chunkSize)

    // 自适应块大小调整
    if (this.config.enableAdaptiveChunking) {
      const networkSpeed = await this.detectNetworkSpeed()
      const adaptedChunkSize = this.adaptChunkSize(networkSpeed, "text") // 假设内容类型为 'text'
      chunks = this.splitIntoChunks(chunk, adaptedChunkSize)
    }

    for (const processedChunk of chunks) {
      onChunk(processedChunk)
      this.metrics.processedChunks++

      if (this.config.delayBetweenChunks > 0) {
        await this.delay(this.config.delayBetweenChunks)
      }
    }
  }

  /**
   * 分割内容为指定大小的块
   */
  private splitIntoChunks(content: string, chunkSize: number): string[] {
    const chunks: string[] = []

    for (let i = 0; i < content.length; i += chunkSize) {
      chunks.push(content.slice(i, i + chunkSize))
    }

    return chunks
  }

  /**
   * 更新性能指标
   */
  private updateMetrics(startTime: number): void {
    const endTime = Date.now()
    this.metrics.totalLatency = endTime - startTime
    this.metrics.averageChunkSize =
      this.metrics.totalChunks > 0 ? this.metrics.processedChunks / this.metrics.totalChunks : 0
    this.metrics.throughput = this.metrics.processedChunks / (this.metrics.totalLatency / 1000)
  }

  /**
   * 获取性能指标
   */
  getMetrics(): StreamMetrics {
    return { ...this.metrics }
  }

  /**
   * 重置指标
   */
  resetMetrics(): void {
    this.metrics = {
      totalChunks: 0,
      processedChunks: 0,
      averageChunkSize: 0,
      totalLatency: 0,
      throughput: 0,
      errorRate: 0,
    }
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * 启用/禁用缓冲
   */
  setBuffering(enabled: boolean): void {
    this.isBuffering = enabled
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<StreamConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * 自适应块大小调整
   */
  private adaptChunkSize(networkSpeed: number, contentType: string): number {
    let baseSize = this.config.chunkSize

    // 根据网络速度调整
    if (networkSpeed < 1000) {
      // 慢速网络
      baseSize = Math.max(20, baseSize * 0.5)
    } else if (networkSpeed > 10000) {
      // 高速网络
      baseSize = Math.min(200, baseSize * 2)
    }

    // 根据内容类型调整
    if (contentType === "code") {
      baseSize = Math.min(baseSize, 100) // 代码块较小
    } else if (contentType === "analysis") {
      baseSize = Math.max(baseSize, 80) // 分析结果较大
    }

    return baseSize
  }

  /**
   * 网络速度检测
   */
  private async detectNetworkSpeed(): Promise<number> {
    const startTime = Date.now()
    try {
      await fetch("/api/ping", { method: "HEAD" })
      const endTime = Date.now()
      return 1000 / (endTime - startTime) // 简化的速度计算
    } catch {
      return 1000 // 默认速度
    }
  }
}
