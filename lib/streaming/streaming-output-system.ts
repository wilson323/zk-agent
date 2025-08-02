/**
 * 全链路流式输出系统
 * 实现端到端流式数据处理、传输和展示
 * 支持多种输出格式和低延迟响应
 */

import { EventEmitter } from 'events';
import { Transform, Readable, Writable } from 'stream';
import { createGzip, createDeflate } from 'zlib';
import { performance } from 'perf_hooks';

// 流式输出配置
export interface StreamingConfig {
  compression: 'gzip' | 'deflate' | 'none';
  bufferSize: number;
  flushInterval: number; // ms
  maxChunkSize: number;
  enableBackpressure: boolean;
  retryAttempts: number;
  timeout: number;
  formats: OutputFormat[];
}

// 输出格式定义
export interface OutputFormat {
  type: 'html' | 'markdown' | 'ppt' | 'json' | 'text' | 'xml';
  template?: string;
  options?: Record<string, any>;
  streaming: boolean;
}

// 流式数据块
export interface StreamChunk {
  id: string;
  sessionId: string;
  sequence: number;
  type: 'data' | 'metadata' | 'progress' | 'error' | 'complete';
  format: string;
  content: any;
  timestamp: number;
  size: number;
  checksum?: string;
}

// 流式会话
export interface StreamSession {
  id: string;
  startTime: number;
  endTime?: number;
  status: 'active' | 'paused' | 'completed' | 'error' | 'cancelled';
  totalChunks: number;
  processedChunks: number;
  totalSize: number;
  processedSize: number;
  progress: number;
  outputFormats: OutputFormat[];
  metadata: Record<string, any>;
  metrics: StreamMetrics;
}

// 流式指标
export interface StreamMetrics {
  throughput: number; // bytes/sec
  latency: number; // ms
  errorRate: number; // %
  compressionRatio: number;
  bufferUtilization: number; // %
  networkUtilization: number; // %
  cpuUsage: number; // %
  memoryUsage: number; // MB
}

// 进度信息
export interface ProgressInfo {
  sessionId: string;
  stage: string;
  progress: number; // 0-100
  eta: number; // estimated time remaining in ms
  currentTask: string;
  completedTasks: string[];
  totalTasks: number;
  metrics: Partial<StreamMetrics>;
}

// 错误信息
export interface StreamError {
  sessionId: string;
  errorCode: string;
  message: string;
  stack?: string;
  timestamp: number;
  recoverable: boolean;
  retryCount: number;
}

/**
 * 流式输出引擎
 */
export class StreamingOutputEngine extends EventEmitter {
  private sessions: Map<string, StreamSession> = new Map();
  private processors: Map<string, StreamProcessor> = new Map();
  private formatters: Map<string, OutputFormatter> = new Map();
  private compressors: Map<string, Transform> = new Map();
  private bufferManager: BufferManager;
  private metricsCollector: MetricsCollector;
  private config: StreamingConfig;

  constructor(config: Partial<StreamingConfig> = {}) {
    super();
    this.config = {
      compression: 'gzip',
      bufferSize: 64 * 1024, // 64KB
      flushInterval: 100, // 100ms
      maxChunkSize: 1024 * 1024, // 1MB
      enableBackpressure: true,
      retryAttempts: 3,
      timeout: 30000, // 30s
      formats: [
        { type: 'json', streaming: true },
        { type: 'html', streaming: true },
        { type: 'markdown', streaming: true }
      ],
      ...config
    };

    this.bufferManager = new BufferManager(this.config.bufferSize);
    this.metricsCollector = new MetricsCollector();
    this.initializeFormatters();
    this.initializeCompressors();
  }

  /**
   * 初始化格式化器
   */
  private initializeFormatters(): void {
    this.formatters.set('html', new HTMLFormatter());
    this.formatters.set('markdown', new MarkdownFormatter());
    this.formatters.set('ppt', new PPTFormatter());
    this.formatters.set('json', new JSONFormatter());
    this.formatters.set('text', new TextFormatter());
    this.formatters.set('xml', new XMLFormatter());
  }

  /**
   * 初始化压缩器
   */
  private initializeCompressors(): void {
    this.compressors.set('gzip', createGzip());
    this.compressors.set('deflate', createDeflate());
  }

  /**
   * 创建流式会话
   */
  public createSession(
    outputFormats: OutputFormat[],
    metadata: Record<string, any> = {}
  ): string {
    const sessionId = this.generateSessionId();
    const session: StreamSession = {
      id: sessionId,
      startTime: performance.now(),
      status: 'active',
      totalChunks: 0,
      processedChunks: 0,
      totalSize: 0,
      processedSize: 0,
      progress: 0,
      outputFormats,
      metadata,
      metrics: {
        throughput: 0,
        latency: 0,
        errorRate: 0,
        compressionRatio: 1,
        bufferUtilization: 0,
        networkUtilization: 0,
        cpuUsage: 0,
        memoryUsage: 0
      }
    };

    this.sessions.set(sessionId, session);

    // 为每种输出格式创建处理器
    for (const format of outputFormats) {
      const processorId = `${sessionId}_${format.type}`;
      const processor = new StreamProcessor(sessionId, format, this.config);
      this.processors.set(processorId, processor);

      // 监听处理器事件
      processor.on('chunk', (chunk: StreamChunk) => {
        this.handleChunk(chunk);
      });

      processor.on('progress', (progress: ProgressInfo) => {
        this.updateProgress(sessionId, progress);
      });

      processor.on('error', (error: StreamError) => {
        this.handleError(sessionId, error);
      });
    }

    this.emit('sessionCreated', sessionId);
    return sessionId;
  }

  /**
   * 开始流式输出
   */
  public async startStreaming(
    sessionId: string,
    dataSource: Readable | AsyncIterable<any>
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.status = 'active';
    this.emit('streamingStarted', sessionId);

    try {
      // 创建数据流管道
      const pipeline = this.createStreamingPipeline(sessionId);

      // 开始处理数据
      if (dataSource instanceof Readable) {
        await this.processReadableStream(sessionId, dataSource, pipeline);
      } else {
        await this.processAsyncIterable(sessionId, dataSource, pipeline);
      }

      session.status = 'completed';
      session.endTime = performance.now();
      this.emit('streamingCompleted', sessionId);

    } catch (error) {
      session.status = 'error';
      session.endTime = performance.now();
      this.emit('streamingError', sessionId, error);
      throw error;
    }
  }

  /**
   * 创建流式处理管道
   */
  private createStreamingPipeline(sessionId: string): Transform[] {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const pipeline: Transform[] = [];

    // 数据预处理
    pipeline.push(new DataPreprocessor());

    // 格式化处理
    for (const format of session.outputFormats) {
      const formatter = this.formatters.get(format.type);
      if (formatter) {
        pipeline.push(formatter.createTransform(format));
      }
    }

    // 压缩处理
    if (this.config.compression !== 'none') {
      const compressor = this.compressors.get(this.config.compression);
      if (compressor) {
        pipeline.push(compressor);
      }
    }

    // 分块处理
    pipeline.push(new ChunkProcessor(sessionId, this.config));

    // 缓冲管理
    pipeline.push(new BufferTransform(this.bufferManager));

    return pipeline;
  }

  /**
   * 处理可读流
   */
  private async processReadableStream(
    sessionId: string,
    source: Readable,
    pipeline: Transform[]
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let currentStream: NodeJS.ReadableStream = source;

      // 构建处理管道
      for (const transform of pipeline) {
        currentStream = currentStream.pipe(transform);
      }

      // 最终输出处理
      const outputStream = new Writable({
        write(chunk, encoding, callback) {
          // 处理输出块
          callback();
        }
      });

      currentStream.pipe(outputStream);

      outputStream.on('finish', resolve);
      outputStream.on('error', reject);
      source.on('error', reject);
    });
  }

  /**
   * 处理异步可迭代对象
   */
  private async processAsyncIterable(
    sessionId: string,
    source: AsyncIterable<any>,
    pipeline: Transform[]
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    let sequence = 0;

    for await (const data of source) {
      if (session.status !== 'active') break;

      // 处理数据块
      await this.processDataChunk(sessionId, data, sequence++);

      // 更新进度
      this.updateSessionProgress(sessionId);

      // 检查背压
      if (this.config.enableBackpressure && this.shouldApplyBackpressure(sessionId)) {
        await this.waitForBackpressureRelief(sessionId);
      }
    }
  }

  /**
   * 处理数据块
   */
  private async processDataChunk(
    sessionId: string,
    data: any,
    sequence: number
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const startTime = performance.now();

    // 为每种输出格式处理数据
    for (const format of session.outputFormats) {
      const processorId = `${sessionId}_${format.type}`;
      const processor = this.processors.get(processorId);

      if (processor) {
        await processor.processData(data, sequence);
      }
    }

    // 更新指标
    const processingTime = performance.now() - startTime;
    this.metricsCollector.recordProcessingTime(sessionId, processingTime);

    session.processedChunks++;
    session.processedSize += this.calculateDataSize(data);
  }

  /**
   * 处理输出块
   */
  private handleChunk(chunk: StreamChunk): void {
    const session = this.sessions.get(chunk.sessionId);
    if (!session) return;

    // 更新会话统计
    session.totalChunks++;
    session.totalSize += chunk.size;

    // 发送块到客户端
    this.emit('chunk', chunk);

    // 更新指标
    this.metricsCollector.recordChunk(chunk);
  }

  /**
   * 更新进度
   */
  private updateProgress(sessionId: string, progress: ProgressInfo): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.progress = progress.progress;
    this.emit('progress', progress);
  }

  /**
   * 处理错误
   */
  private handleError(sessionId: string, error: StreamError): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // 更新错误率
    session.metrics.errorRate = this.metricsCollector.calculateErrorRate(sessionId);

    // 尝试恢复
    if (error.recoverable && error.retryCount < this.config.retryAttempts) {
      this.retryOperation(sessionId, error);
    } else {
      session.status = 'error';
      this.emit('error', error);
    }
  }

  /**
   * 重试操作
   */
  private async retryOperation(sessionId: string, error: StreamError): Promise<void> {
    const delay = Math.pow(2, error.retryCount) * 1000; // 指数退避

    setTimeout(() => {
      this.emit('retry', sessionId, error.retryCount + 1);
      // 重试逻辑
    }, delay);
  }

  /**
   * 检查是否应用背压
   */
  private shouldApplyBackpressure(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    return session.metrics.bufferUtilization > 80 ||
      session.metrics.networkUtilization > 90;
  }

  /**
   * 等待背压缓解
   */
  private async waitForBackpressureRelief(sessionId: string): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.shouldApplyBackpressure(sessionId)) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * 更新会话进度
   */
  private updateSessionProgress(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // 计算总体进度
    if (session.totalChunks > 0) {
      session.progress = (session.processedChunks / session.totalChunks) * 100;
    }

    // 更新指标
    session.metrics = this.metricsCollector.getSessionMetrics(sessionId);
  }

  /**
   * 暂停流式输出
   */
  public pauseStreaming(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session && session.status === 'active') {
      session.status = 'paused';
      this.emit('streamingPaused', sessionId);
    }
  }

  /**
   * 恢复流式输出
   */
  public resumeStreaming(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session && session.status === 'paused') {
      session.status = 'active';
      this.emit('streamingResumed', sessionId);
    }
  }

  /**
   * 取消流式输出
   */
  public cancelStreaming(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'cancelled';
      session.endTime = performance.now();

      // 清理处理器
      for (const format of session.outputFormats) {
        const processorId = `${sessionId}_${format.type}`;
        const processor = this.processors.get(processorId);
        if (processor) {
          processor.destroy();
          this.processors.delete(processorId);
        }
      }

      this.emit('streamingCancelled', sessionId);
    }
  }

  /**
   * 获取会话状态
   */
  public getSessionStatus(sessionId: string): StreamSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 获取会话指标
   */
  public getSessionMetrics(sessionId: string): StreamMetrics | undefined {
    const session = this.sessions.get(sessionId);
    return session?.metrics;
  }

  /**
   * 获取所有活跃会话
   */
  public getActiveSessions(): StreamSession[] {
    return Array.from(this.sessions.values()).filter(
      session => session.status === 'active' || session.status === 'paused'
    );
  }

  /**
   * 清理完成的会话
   */
  public cleanupCompletedSessions(): void {
    const now = performance.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24小时

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.status === 'completed' || session.status === 'error' || session.status === 'cancelled') {
        if (session.endTime && (now - session.endTime) > maxAge) {
          this.sessions.delete(sessionId);

          // 清理相关处理器
          for (const format of session.outputFormats) {
            const processorId = `${sessionId}_${format.type}`;
            this.processors.delete(processorId);
          }
        }
      }
    }
  }

  /**
   * 计算数据大小
   */
  private calculateDataSize(data: any): number {
    if (typeof data === 'string') {
      return Buffer.byteLength(data, 'utf8');
    } else if (Buffer.isBuffer(data)) {
      return data.length;
    } else {
      return Buffer.byteLength(JSON.stringify(data), 'utf8');
    }
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取系统统计
   */
  public getSystemStats(): any {
    return {
      activeSessions: this.getActiveSessions().length,
      totalSessions: this.sessions.size,
      totalProcessors: this.processors.size,
      bufferUtilization: this.bufferManager.getUtilization(),
      systemMetrics: this.metricsCollector.getSystemMetrics()
    };
  }
}

/**
 * 流式处理器
 */
class StreamProcessor extends EventEmitter {
  private sessionId: string;
  private format: OutputFormat;
  private config: StreamingConfig;
  private sequence: number = 0;
  private formatter: OutputFormatter;

  constructor(sessionId: string, format: OutputFormat, config: StreamingConfig) {
    super();
    this.sessionId = sessionId;
    this.format = format;
    this.config = config;
    this.formatter = this.createFormatter(format);
  }

  private createFormatter(format: OutputFormat): OutputFormatter {
    switch (format.type) {
      case 'html': return new HTMLFormatter();
      case 'markdown': return new MarkdownFormatter();
      case 'ppt': return new PPTFormatter();
      case 'json': return new JSONFormatter();
      case 'text': return new TextFormatter();
      case 'xml': return new XMLFormatter();
      default: return new TextFormatter();
    }
  }

  public async processData(data: any, sequence: number): Promise<void> {
    try {
      const formattedData = await this.formatter.format(data, this.format.options);

      const chunk: StreamChunk = {
        id: this.generateChunkId(),
        sessionId: this.sessionId,
        sequence,
        type: 'data',
        format: this.format.type,
        content: formattedData,
        timestamp: performance.now(),
        size: this.calculateSize(formattedData)
      };

      this.emit('chunk', chunk);

    } catch (error) {
      const streamError: StreamError = {
        sessionId: this.sessionId,
        errorCode: 'PROCESSING_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: performance.now(),
        recoverable: true,
        retryCount: 0
      };

      this.emit('error', streamError);
    }
  }

  private generateChunkId(): string {
    return `chunk_${this.sessionId}_${this.sequence++}_${Date.now()}`;
  }

  private calculateSize(data: any): number {
    if (typeof data === 'string') {
      return Buffer.byteLength(data, 'utf8');
    } else {
      return Buffer.byteLength(JSON.stringify(data), 'utf8');
    }
  }

  public destroy(): void {
    this.removeAllListeners();
  }
}

// 格式化器基类
abstract class OutputFormatter {
  abstract format(data: any, options?: Record<string, any>): Promise<any>;

  createTransform(format: OutputFormat): Transform {
    return new Transform({
      objectMode: true,
      transform: async (chunk, encoding, callback) => {
        try {
          const formatted = await this.format(chunk, format.options);
          callback(null, formatted);
        } catch (error) {
          callback(error);
        }
      }
    });
  }
}

// HTML格式化器
class HTMLFormatter extends OutputFormatter {
  async format(data: any, options: Record<string, any> = {}): Promise<string> {
    const template = options.template || this.getDefaultTemplate();
    return this.applyTemplate(template, data);
  }

  private getDefaultTemplate(): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>{{title}}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .content { line-height: 1.6; }
        </style>
    </head>
    <body>
        <div class="content">
            {{content}}
        </div>
    </body>
    </html>
    `;
  }

  private applyTemplate(template: string, data: any): string {
    let result = template;
    if (typeof data === 'object') {
      for (const [key, value] of Object.entries(data)) {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
      }
    } else {
      result = result.replace(/{{content}}/g, String(data));
    }
    return result;
  }
}

// Markdown格式化器
class MarkdownFormatter extends OutputFormatter {
  async format(data: any, options: Record<string, any> = {}): Promise<string> {
    if (typeof data === 'string') {
      return data;
    } else if (typeof data === 'object') {
      return this.objectToMarkdown(data);
    } else {
      return String(data);
    }
  }

  private objectToMarkdown(obj: any): string {
    let markdown = '';

    if (obj.title) {
      markdown += `# ${obj.title}\n\n`;
    }

    if (obj.content) {
      markdown += `${obj.content}\n\n`;
    }

    if (obj.items && Array.isArray(obj.items)) {
      obj.items.forEach((item: any) => {
        markdown += `- ${item}\n`;
      });
    }

    return markdown;
  }
}

// PPT格式化器
class PPTFormatter extends OutputFormatter {
  async format(data: any, options: Record<string, any> = {}): Promise<any> {
    // 简化的PPT格式化，实际应该使用专门的PPT库
    return {
      slides: [
        {
          title: data.title || 'Slide Title',
          content: data.content || 'Slide Content',
          layout: options.layout || 'title-content'
        }
      ]
    };
  }
}

// JSON格式化器
class JSONFormatter extends OutputFormatter {
  async format(data: any, options: Record<string, any> = {}): Promise<string> {
    const indent = options.indent || 2;
    return JSON.stringify(data, null, indent);
  }
}

// 文本格式化器
class TextFormatter extends OutputFormatter {
  async format(data: any, options: Record<string, any> = {}): Promise<string> {
    if (typeof data === 'string') {
      return data;
    } else {
      return JSON.stringify(data, null, 2);
    }
  }
}

// XML格式化器
class XMLFormatter extends OutputFormatter {
  async format(data: any, options: Record<string, any> = {}): Promise<string> {
    const rootElement = options.rootElement || 'root';
    return this.objectToXML(data, rootElement);
  }

  private objectToXML(obj: any, rootElement: string): string {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<${rootElement}>\n`;

    if (typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        xml += `  <${key}>${value}</${key}>\n`;
      }
    } else {
      xml += `  ${obj}\n`;
    }

    xml += `</${rootElement}>`;
    return xml;
  }
}

// 辅助类
class DataPreprocessor extends Transform {
  constructor() {
    super({ objectMode: true });
  }

  _transform(chunk: any, encoding: string, callback: Function): void {
    // 数据预处理逻辑
    callback(null, chunk);
  }
}

class ChunkProcessor extends Transform {
  private sessionId: string;
  private config: StreamingConfig;

  constructor(sessionId: string, config: StreamingConfig) {
    super();
    this.sessionId = sessionId;
    this.config = config;
  }

  _transform(chunk: any, encoding: string, callback: Function): void {
    // 分块处理逻辑
    if (chunk.length > this.config.maxChunkSize) {
      // 分割大块
      const chunks = this.splitChunk(chunk);
      chunks.forEach(c => this.push(c));
    } else {
      this.push(chunk);
    }
    callback();
  }

  private splitChunk(chunk: any): any[] {
    // 分割逻辑
    return [chunk]; // 简化实现
  }
}

class BufferTransform extends Transform {
  private bufferManager: BufferManager;

  constructor(bufferManager: BufferManager) {
    super();
    this.bufferManager = bufferManager;
  }

  _transform(chunk: any, encoding: string, callback: Function): void {
    // 缓冲管理逻辑
    this.bufferManager.addChunk(chunk);
    callback(null, chunk);
  }
}

class BufferManager {
  private bufferSize: number;
  private currentSize: number = 0;
  private chunks: any[] = [];

  constructor(bufferSize: number) {
    this.bufferSize = bufferSize;
  }

  addChunk(chunk: any): void {
    this.chunks.push(chunk);
    this.currentSize += this.calculateChunkSize(chunk);

    if (this.currentSize > this.bufferSize) {
      this.flush();
    }
  }

  flush(): void {
    this.chunks = [];
    this.currentSize = 0;
  }

  getUtilization(): number {
    return (this.currentSize / this.bufferSize) * 100;
  }

  private calculateChunkSize(chunk: any): number {
    if (Buffer.isBuffer(chunk)) {
      return chunk.length;
    } else if (typeof chunk === 'string') {
      return Buffer.byteLength(chunk, 'utf8');
    } else {
      return Buffer.byteLength(JSON.stringify(chunk), 'utf8');
    }
  }
}

class MetricsCollector {
  private sessionMetrics: Map<string, StreamMetrics> = new Map();
  private chunkCounts: Map<string, number> = new Map();
  private errorCounts: Map<string, number> = new Map();

  recordProcessingTime(sessionId: string, time: number): void {
    const metrics = this.getOrCreateMetrics(sessionId);
    metrics.latency = (metrics.latency + time) / 2; // 移动平均
  }

  recordChunk(chunk: StreamChunk): void {
    const count = this.chunkCounts.get(chunk.sessionId) || 0;
    this.chunkCounts.set(chunk.sessionId, count + 1);

    const metrics = this.getOrCreateMetrics(chunk.sessionId);
    metrics.throughput = chunk.size / (chunk.timestamp / 1000); // bytes/sec
  }

  calculateErrorRate(sessionId: string): number {
    const errors = this.errorCounts.get(sessionId) || 0;
    const total = this.chunkCounts.get(sessionId) || 1;
    return (errors / total) * 100;
  }

  getSessionMetrics(sessionId: string): StreamMetrics {
    return this.getOrCreateMetrics(sessionId);
  }

  getSystemMetrics(): any {
    return {
      totalSessions: this.sessionMetrics.size,
      averageLatency: this.calculateAverageLatency(),
      totalThroughput: this.calculateTotalThroughput()
    };
  }

  private getOrCreateMetrics(sessionId: string): StreamMetrics {
    if (!this.sessionMetrics.has(sessionId)) {
      this.sessionMetrics.set(sessionId, {
        throughput: 0,
        latency: 0,
        errorRate: 0,
        compressionRatio: 1,
        bufferUtilization: 0,
        networkUtilization: 0,
        cpuUsage: 0,
        memoryUsage: 0
      });
    }
    return this.sessionMetrics.get(sessionId)!;
  }

  private calculateAverageLatency(): number {
    const metrics = Array.from(this.sessionMetrics.values());
    if (metrics.length === 0) return 0;
    return metrics.reduce((sum, m) => sum + m.latency, 0) / metrics.length;
  }

  private calculateTotalThroughput(): number {
    const metrics = Array.from(this.sessionMetrics.values());
    return metrics.reduce((sum, m) => sum + m.throughput, 0);
  }
}

export {
  StreamProcessor,
  OutputFormatter,
  HTMLFormatter,
  MarkdownFormatter,
  PPTFormatter,
  JSONFormatter,
  TextFormatter,
  XMLFormatter,
  BufferManager,
  MetricsCollector
};