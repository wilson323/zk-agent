/**
 * 多种文件交付样式系统
 * 支持HTML、PPT、Markdown等多种格式的文件生成和交付
 * 提供模板引擎、样式定制和批量处理能力
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import { performance } from 'perf_hooks';

// 文件格式枚举
export enum FileFormat {
  HTML = 'html',
  MARKDOWN = 'markdown',
  PPT = 'ppt',
  PPTX = 'pptx',
  PDF = 'pdf',
  DOCX = 'docx',
  JSON = 'json',
  XML = 'xml',
  CSV = 'csv',
  XLSX = 'xlsx',
  TXT = 'txt'
}

// 交付配置
export interface DeliveryConfig {
  format: FileFormat;
  template?: string;
  style?: StyleConfig;
  metadata?: FileMetadata;
  options?: FormatOptions;
  output?: OutputConfig;
  validation?: ValidationConfig;
  compression?: CompressionConfig;
}

// 样式配置
export interface StyleConfig {
  theme: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    primary: string;
    secondary: string;
    monospace: string;
  };
  layout: {
    width: number;
    height: number;
    margin: number;
    padding: number;
  };
  customCSS?: string;
  customJS?: string;
}

// 文件元数据
export interface FileMetadata {
  title: string;
  author: string;
  description: string;
  keywords: string[];
  language: string;
  version: string;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  category: string;
  license?: string;
  copyright?: string;
}

// 格式选项
export interface FormatOptions {
  // HTML选项
  html?: {
    includeCSS: boolean;
    includeJS: boolean;
    responsive: boolean;
    minify: boolean;
    embedAssets: boolean;
  };

  // Markdown选项
  markdown?: {
    flavor: 'github' | 'commonmark' | 'gfm';
    includeTableOfContents: boolean;
    codeHighlighting: boolean;
    mathSupport: boolean;
    mermaidSupport: boolean;
  };

  // PPT选项
  ppt?: {
    slideSize: 'standard' | 'widescreen' | 'custom';
    transition: string;
    animations: boolean;
    speakerNotes: boolean;
    handoutMode: boolean;
  };

  // PDF选项
  pdf?: {
    pageSize: 'A4' | 'A3' | 'Letter' | 'Legal';
    orientation: 'portrait' | 'landscape';
    margins: { top: number; right: number; bottom: number; left: number; };
    watermark?: string;
    encryption?: boolean;
  };
}

// 输出配置
export interface OutputConfig {
  directory: string;
  filename: string;
  overwrite: boolean;
  backup: boolean;
  versioning: boolean;
  compression: boolean;
  encryption?: {
    enabled: boolean;
    algorithm: string;
    password?: string;
  };
}

// 验证配置
export interface ValidationConfig {
  enabled: boolean;
  rules: ValidationRule[];
  strictMode: boolean;
  autoFix: boolean;
}

// 验证规则
export interface ValidationRule {
  name: string;
  type: 'structure' | 'content' | 'format' | 'accessibility';
  severity: 'error' | 'warning' | 'info';
  description: string;
  validator: (content: any) => ValidationResult;
}

// 验证结果
export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  suggestions: string[];
}

// 验证问题
export interface ValidationIssue {
  type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  location?: {
    line: number;
    column: number;
    element?: string;
  };
  fix?: string;
}

// 压缩配置
export interface CompressionConfig {
  enabled: boolean;
  algorithm: 'gzip' | 'brotli' | 'deflate';
  level: number;
  threshold: number;
}

// 内容数据
export interface ContentData {
  title?: string;
  subtitle?: string;
  content: any;
  sections?: ContentSection[];
  assets?: AssetData[];
  variables?: Record<string, any>;
  metadata?: Record<string, any>;
}

// 内容章节
export interface ContentSection {
  id: string;
  title: string;
  content: any;
  type: 'text' | 'image' | 'table' | 'chart' | 'code' | 'slide' | 'custom';
  order: number;
  metadata?: Record<string, any>;
}

// 资源数据
export interface AssetData {
  id: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'font' | 'style';
  url: string;
  localPath?: string;
  size: number;
  mimeType: string;
  metadata?: Record<string, any>;
}

// 交付结果
export interface DeliveryResult {
  success: boolean;
  format: FileFormat;
  outputPath: string;
  size: number;
  checksum: string;
  metadata: FileMetadata;
  metrics: DeliveryMetrics;
  validation?: ValidationResult;
  errors?: Error[];
  warnings?: string[];
}

// 交付指标
export interface DeliveryMetrics {
  processingTime: number;
  renderingTime: number;
  compressionTime: number;
  validationTime: number;
  totalTime: number;
  memoryUsage: number;
  cpuUsage: number;
  compressionRatio?: number;
}

// 模板数据
export interface TemplateData {
  id: string;
  name: string;
  format: FileFormat;
  content: string;
  variables: TemplateVariable[];
  metadata: {
    author: string;
    description: string;
    version: string;
    tags: string[];
    createdAt: number;
    updatedAt: number;
  };
}

// 模板变量
export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  default?: any;
  description: string;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    enum?: any[];
  };
}

// 批处理任务
export interface BatchTask {
  id: string;
  name: string;
  items: BatchItem[];
  config: DeliveryConfig;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: {
    total: number;
    completed: number;
    failed: number;
    percentage: number;
  };
  results: DeliveryResult[];
  errors: Error[];
  startTime?: number;
  endTime?: number;
}

// 批处理项目
export interface BatchItem {
  id: string;
  data: ContentData;
  config?: Partial<DeliveryConfig>;
  priority: number;
  dependencies?: string[];
}

/**
 * 文件交付系统
 */
export class FileDeliverySystem extends EventEmitter {
  private generators: Map<FileFormat, IFileGenerator> = new Map();
  private templates: Map<string, TemplateData> = new Map();
  private validators: Map<FileFormat, IValidator> = new Map();
  private compressors: Map<string, ICompressor> = new Map();
  private batchTasks: Map<string, BatchTask> = new Map();
  private templateEngine: TemplateEngine;
  private assetManager: AssetManager;
  private metricsCollector: MetricsCollector;
  private cacheManager: CacheManager;

  constructor() {
    super();
    this.templateEngine = new TemplateEngine();
    this.assetManager = new AssetManager();
    this.metricsCollector = new MetricsCollector();
    this.cacheManager = new CacheManager();

    this.initializeGenerators();
    this.initializeValidators();
    this.initializeCompressors();
    this.loadDefaultTemplates();
  }

  /**
   * 初始化文件生成器
   */
  private initializeGenerators(): void {
    this.generators.set(FileFormat.HTML, new HTMLGenerator());
    this.generators.set(FileFormat.MARKDOWN, new MarkdownGenerator());
    this.generators.set(FileFormat.PPT, new PPTGenerator());
    this.generators.set(FileFormat.PPTX, new PPTXGenerator());
    this.generators.set(FileFormat.PDF, new PDFGenerator());
    this.generators.set(FileFormat.DOCX, new DOCXGenerator());
    this.generators.set(FileFormat.JSON, new JSONGenerator());
    this.generators.set(FileFormat.XML, new XMLGenerator());
    this.generators.set(FileFormat.CSV, new CSVGenerator());
    this.generators.set(FileFormat.XLSX, new XLSXGenerator());
    this.generators.set(FileFormat.TXT, new TXTGenerator());
  }

  /**
   * 初始化验证器
   */
  private initializeValidators(): void {
    this.validators.set(FileFormat.HTML, new HTMLValidator());
    this.validators.set(FileFormat.MARKDOWN, new MarkdownValidator());
    this.validators.set(FileFormat.JSON, new JSONValidator());
    this.validators.set(FileFormat.XML, new XMLValidator());
  }

  /**
   * 初始化压缩器
   */
  private initializeCompressors(): void {
    this.compressors.set('gzip', new GzipCompressor());
    this.compressors.set('brotli', new BrotliCompressor());
    this.compressors.set('deflate', new DeflateCompressor());
  }

  /**
   * 加载默认模板
   */
  private async loadDefaultTemplates(): Promise<void> {
    const defaultTemplates = [
      {
        id: 'html-report',
        name: 'HTML Report Template',
        format: FileFormat.HTML,
        content: await this.loadTemplateContent('html-report.html'),
        variables: [
          { name: 'title', type: 'string' as const, required: true, description: 'Report title' },
          { name: 'content', type: 'string' as const, required: true, description: 'Report content' },
          { name: 'author', type: 'string' as const, required: false, description: 'Report author' }
        ],
        metadata: {
          author: 'ZK-Agent',
          description: 'Professional HTML report template',
          version: '1.0.0',
          tags: ['report', 'html', 'professional'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      },
      {
        id: 'markdown-doc',
        name: 'Markdown Documentation Template',
        format: FileFormat.MARKDOWN,
        content: await this.loadTemplateContent('markdown-doc.md'),
        variables: [
          { name: 'title', type: 'string' as const, required: true, description: 'Document title' },
          { name: 'sections', type: 'array' as const, required: true, description: 'Document sections' }
        ],
        metadata: {
          author: 'ZK-Agent',
          description: 'Technical documentation template',
          version: '1.0.0',
          tags: ['documentation', 'markdown', 'technical'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      },
      {
        id: 'ppt-presentation',
        name: 'PowerPoint Presentation Template',
        format: FileFormat.PPTX,
        content: await this.loadTemplateContent('ppt-presentation.pptx'),
        variables: [
          { name: 'title', type: 'string' as const, required: true, description: 'Presentation title' },
          { name: 'slides', type: 'array' as const, required: true, description: 'Presentation slides' }
        ],
        metadata: {
          author: 'ZK-Agent',
          description: 'Business presentation template',
          version: '1.0.0',
          tags: ['presentation', 'powerpoint', 'business'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      }
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * 加载模板内容
   */
  private async loadTemplateContent(filename: string): Promise<string> {
    try {
      const templatePath = path.join(__dirname, '../templates', filename);
      return await fs.readFile(templatePath, 'utf-8');
    } catch (error) {
      // 返回默认模板内容
      return this.getDefaultTemplateContent(filename);
    }
  }

  /**
   * 获取默认模板内容
   */
  private getDefaultTemplateContent(filename: string): string {
    const templates: Record<string, string> = {
      'html-report.html': `
<!DOCTYPE html>
<html lang="{{language || 'en'}}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .content { margin-bottom: 30px; }
        .footer { border-top: 1px solid #ccc; padding-top: 20px; font-size: 0.9em; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{title}}</h1>
        {{#if subtitle}}<h2>{{subtitle}}</h2>{{/if}}
        {{#if author}}<p>By: {{author}}</p>{{/if}}
    </div>
    <div class="content">
        {{{content}}}
    </div>
    <div class="footer">
        <p>Generated on {{date}} by ZK-Agent</p>
    </div>
</body>
</html>`,
      'markdown-doc.md': `
# {{title}}

{{#if subtitle}}## {{subtitle}}{{/if}}

{{#if author}}**Author:** {{author}}{{/if}}
{{#if date}}**Date:** {{date}}{{/if}}

---

{{#each sections}}
## {{title}}

{{content}}

{{/each}}

---

*Generated by ZK-Agent*`,
      'ppt-presentation.pptx': '<!-- PowerPoint template placeholder -->'
    };

    return templates[filename] || '';
  }

  /**
   * 生成文件
   */
  public async generateFile(
    data: ContentData,
    config: DeliveryConfig
  ): Promise<DeliveryResult> {
    const startTime = performance.now();

    try {
      // 检查缓存
      const cacheKey = this.generateCacheKey(data, config);
      const cachedResult = await this.cacheManager.get(cacheKey);
      if (cachedResult) {
        this.emit('fileGenerated', cachedResult);
        return cachedResult;
      }

      // 获取生成器
      const generator = this.generators.get(config.format);
      if (!generator) {
        throw new Error(`Unsupported format: ${config.format}`);
      }

      // 处理模板
      let processedData = data;
      if (config.template) {
        processedData = await this.templateEngine.render(
          config.template,
          data,
          config.format
        );
      }

      // 处理资源
      if (processedData.assets) {
        await this.assetManager.processAssets(processedData.assets, config.output?.directory);
      }

      // 生成文件内容
      const renderStartTime = performance.now();
      const content = await generator.generate(processedData, config);
      const renderingTime = performance.now() - renderStartTime;

      // 验证内容
      let validationResult: ValidationResult | undefined;
      if (config.validation?.enabled) {
        const validationStartTime = performance.now();
        validationResult = await this.validateContent(content, config);
        const validationTime = performance.now() - validationStartTime;

        if (!validationResult.valid && config.validation.strictMode) {
          throw new Error(`Validation failed: ${validationResult.issues.map(i => i.message).join(', ')}`);
        }
      }

      // 确保输出目录存在
      if (config.output?.directory) {
        await fs.mkdir(config.output.directory, { recursive: true });
      }

      // 生成输出路径
      const outputPath = this.generateOutputPath(config);

      // 写入文件
      await fs.writeFile(outputPath, content);

      // 压缩文件
      let compressionTime = 0;
      let compressionRatio: number | undefined;
      if (config.compression?.enabled) {
        const compressionStartTime = performance.now();
        const compressedPath = await this.compressFile(outputPath, config.compression);
        compressionTime = performance.now() - compressionStartTime;

        const originalSize = (await fs.stat(outputPath)).size;
        const compressedSize = (await fs.stat(compressedPath)).size;
        compressionRatio = compressedSize / originalSize;
      }

      // 计算文件大小和校验和
      const stats = await fs.stat(outputPath);
      const checksum = await this.calculateChecksum(outputPath);

      // 创建结果
      const result: DeliveryResult = {
        success: true,
        format: config.format,
        outputPath,
        size: stats.size,
        checksum,
        metadata: config.metadata || this.generateDefaultMetadata(),
        metrics: {
          processingTime: performance.now() - startTime,
          renderingTime,
          compressionTime,
          validationTime: validationResult ? (performance.now() - startTime - renderingTime - compressionTime) : 0,
          totalTime: performance.now() - startTime,
          memoryUsage: process.memoryUsage().heapUsed,
          cpuUsage: process.cpuUsage().user,
          compressionRatio
        },
        validation: validationResult
      };

      // 缓存结果
      await this.cacheManager.set(cacheKey, result);

      // 收集指标
      this.metricsCollector.recordGeneration(result);

      this.emit('fileGenerated', result);
      return result;

    } catch (error) {
      const result: DeliveryResult = {
        success: false,
        format: config.format,
        outputPath: '',
        size: 0,
        checksum: '',
        metadata: config.metadata || this.generateDefaultMetadata(),
        metrics: {
          processingTime: performance.now() - startTime,
          renderingTime: 0,
          compressionTime: 0,
          validationTime: 0,
          totalTime: performance.now() - startTime,
          memoryUsage: process.memoryUsage().heapUsed,
          cpuUsage: process.cpuUsage().user
        },
        errors: [error as Error]
      };

      this.emit('fileGenerationError', result);
      return result;
    }
  }

  /**
   * 批量生成文件
   */
  public async generateBatch(task: BatchTask): Promise<BatchTask> {
    task.status = 'running';
    task.startTime = Date.now();
    task.progress.completed = 0;
    task.progress.failed = 0;

    this.batchTasks.set(task.id, task);
    this.emit('batchStarted', task);

    try {
      // 按优先级和依赖关系排序
      const sortedItems = this.sortBatchItems(task.items);

      for (const item of sortedItems) {
        try {
          // 合并配置
          const itemConfig = { ...task.config, ...item.config };

          // 生成文件
          const result = await this.generateFile(item.data, itemConfig);
          task.results.push(result);

          if (result.success) {
            task.progress.completed++;
          } else {
            task.progress.failed++;
            if (result.errors) {
              task.errors.push(...result.errors);
            }
          }

        } catch (error) {
          task.progress.failed++;
          task.errors.push(error as Error);
        }

        // 更新进度
        task.progress.percentage =
          (task.progress.completed + task.progress.failed) / task.progress.total * 100;

        this.emit('batchProgress', task);
      }

      task.status = task.progress.failed > 0 ? 'completed' : 'completed';

    } catch (error) {
      task.status = 'failed';
      task.errors.push(error as Error);
    }

    task.endTime = Date.now();
    this.emit('batchCompleted', task);

    return task;
  }

  /**
   * 排序批处理项目
   */
  private sortBatchItems(items: BatchItem[]): BatchItem[] {
    // 简化的排序实现，按优先级排序
    return items.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 验证内容
   */
  private async validateContent(
    content: any,
    config: DeliveryConfig
  ): Promise<ValidationResult> {
    const validator = this.validators.get(config.format);
    if (!validator) {
      return { valid: true, issues: [], suggestions: [] };
    }

    return await validator.validate(content, config.validation!);
  }

  /**
   * 压缩文件
   */
  private async compressFile(
    filePath: string,
    config: CompressionConfig
  ): Promise<string> {
    const compressor = this.compressors.get(config.algorithm);
    if (!compressor) {
      throw new Error(`Unsupported compression algorithm: ${config.algorithm}`);
    }

    const compressedPath = `${filePath}.${config.algorithm}`;
    await compressor.compress(filePath, compressedPath, config);
    return compressedPath;
  }

  /**
   * 生成输出路径
   */
  private generateOutputPath(config: DeliveryConfig): string {
    const directory = config.output?.directory || './output';
    const filename = config.output?.filename || `file_${Date.now()}.${config.format}`;
    return path.join(directory, filename);
  }

  /**
   * 计算校验和
   */
  private async calculateChecksum(filePath: string): Promise<string> {
    const crypto = await import('crypto');
    const content = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(data: ContentData, config: DeliveryConfig): string {
    const crypto = require('crypto');
    const key = JSON.stringify({ data, config });
    return crypto.createHash('md5').update(key).digest('hex');
  }

  /**
   * 生成默认元数据
   */
  private generateDefaultMetadata(): FileMetadata {
    return {
      title: 'Generated File',
      author: 'ZK-Agent',
      description: 'File generated by ZK-Agent',
      keywords: [],
      language: 'en',
      version: '1.0.0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: [],
      category: 'generated'
    };
  }

  /**
   * 注册模板
   */
  public registerTemplate(template: TemplateData): void {
    this.templates.set(template.id, template);
    this.emit('templateRegistered', template);
  }

  /**
   * 获取模板
   */
  public getTemplate(id: string): TemplateData | undefined {
    return this.templates.get(id);
  }

  /**
   * 列出模板
   */
  public listTemplates(format?: FileFormat): TemplateData[] {
    const templates = Array.from(this.templates.values());
    return format ? templates.filter(t => t.format === format) : templates;
  }

  /**
   * 获取支持的格式
   */
  public getSupportedFormats(): FileFormat[] {
    return Array.from(this.generators.keys());
  }

  /**
   * 获取批处理任务
   */
  public getBatchTask(id: string): BatchTask | undefined {
    return this.batchTasks.get(id);
  }

  /**
   * 取消批处理任务
   */
  public cancelBatchTask(id: string): boolean {
    const task = this.batchTasks.get(id);
    if (task && task.status === 'running') {
      task.status = 'cancelled';
      this.emit('batchCancelled', task);
      return true;
    }
    return false;
  }

  /**
   * 获取系统指标
   */
  public getMetrics(): any {
    return this.metricsCollector.getMetrics();
  }

  /**
   * 清理缓存
   */
  public async clearCache(): Promise<void> {
    await this.cacheManager.clear();
    this.emit('cacheCleared');
  }
}

// 文件生成器接口
export interface IFileGenerator {
  generate(data: ContentData, config: DeliveryConfig): Promise<any>;
  supports(format: FileFormat): boolean;
}

// 验证器接口
export interface IValidator {
  validate(content: any, config: ValidationConfig): Promise<ValidationResult>;
}

// 压缩器接口
export interface ICompressor {
  compress(inputPath: string, outputPath: string, config: CompressionConfig): Promise<void>;
}

// HTML生成器
class HTMLGenerator implements IFileGenerator {
  async generate(data: ContentData, config: DeliveryConfig): Promise<string> {
    // HTML生成逻辑
    return `<html><head><title>${data.title || 'Document'}</title></head><body>${data.content}</body></html>`;
  }

  supports(format: FileFormat): boolean {
    return format === FileFormat.HTML;
  }
}

// Markdown生成器
class MarkdownGenerator implements IFileGenerator {
  async generate(data: ContentData, config: DeliveryConfig): Promise<string> {
    // Markdown生成逻辑
    let markdown = `# ${data.title || 'Document'}\n\n`;
    if (data.subtitle) {
      markdown += `## ${data.subtitle}\n\n`;
    }
    markdown += data.content;
    return markdown;
  }

  supports(format: FileFormat): boolean {
    return format === FileFormat.MARKDOWN;
  }
}

// PPT生成器
class PPTGenerator implements IFileGenerator {
  async generate(data: ContentData, config: DeliveryConfig): Promise<Buffer> {
    // PPT生成逻辑（需要第三方库如pptxgenjs）
    throw new Error('PPT generation not implemented');
  }

  supports(format: FileFormat): boolean {
    return format === FileFormat.PPT;
  }
}

// PPTX生成器
class PPTXGenerator implements IFileGenerator {
  async generate(data: ContentData, config: DeliveryConfig): Promise<Buffer> {
    // PPTX生成逻辑
    throw new Error('PPTX generation not implemented');
  }

  supports(format: FileFormat): boolean {
    return format === FileFormat.PPTX;
  }
}

// PDF生成器
class PDFGenerator implements IFileGenerator {
  async generate(data: ContentData, config: DeliveryConfig): Promise<Buffer> {
    // PDF生成逻辑（需要第三方库如puppeteer或jsPDF）
    throw new Error('PDF generation not implemented');
  }

  supports(format: FileFormat): boolean {
    return format === FileFormat.PDF;
  }
}

// DOCX生成器
class DOCXGenerator implements IFileGenerator {
  async generate(data: ContentData, config: DeliveryConfig): Promise<Buffer> {
    // DOCX生成逻辑（需要第三方库如docx）
    throw new Error('DOCX generation not implemented');
  }

  supports(format: FileFormat): boolean {
    return format === FileFormat.DOCX;
  }
}

// JSON生成器
class JSONGenerator implements IFileGenerator {
  async generate(data: ContentData, config: DeliveryConfig): Promise<string> {
    return JSON.stringify(data, null, 2);
  }

  supports(format: FileFormat): boolean {
    return format === FileFormat.JSON;
  }
}

// XML生成器
class XMLGenerator implements IFileGenerator {
  async generate(data: ContentData, config: DeliveryConfig): Promise<string> {
    // XML生成逻辑
    return `<?xml version="1.0" encoding="UTF-8"?>\n<document>\n  <title>${data.title || 'Document'}</title>\n  <content>${data.content}</content>\n</document>`;
  }

  supports(format: FileFormat): boolean {
    return format === FileFormat.XML;
  }
}

// CSV生成器
class CSVGenerator implements IFileGenerator {
  async generate(data: ContentData, config: DeliveryConfig): Promise<string> {
    // CSV生成逻辑
    if (Array.isArray(data.content)) {
      return data.content.map(row =>
        Array.isArray(row) ? row.join(',') : Object.values(row).join(',')
      ).join('\n');
    }
    return '';
  }

  supports(format: FileFormat): boolean {
    return format === FileFormat.CSV;
  }
}

// XLSX生成器
class XLSXGenerator implements IFileGenerator {
  async generate(data: ContentData, config: DeliveryConfig): Promise<Buffer> {
    // XLSX生成逻辑（需要第三方库如xlsx）
    throw new Error('XLSX generation not implemented');
  }

  supports(format: FileFormat): boolean {
    return format === FileFormat.XLSX;
  }
}

// TXT生成器
class TXTGenerator implements IFileGenerator {
  async generate(data: ContentData, config: DeliveryConfig): Promise<string> {
    return typeof data.content === 'string' ? data.content : JSON.stringify(data.content);
  }

  supports(format: FileFormat): boolean {
    return format === FileFormat.TXT;
  }
}

// HTML验证器
class HTMLValidator implements IValidator {
  async validate(content: string, config: ValidationConfig): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];

    // 基本HTML验证
    if (!content.includes('<html>')) {
      issues.push({
        type: 'structure',
        severity: 'warning',
        message: 'Missing <html> tag'
      });
    }

    return {
      valid: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      suggestions: ['Consider adding proper HTML structure']
    };
  }
}

// Markdown验证器
class MarkdownValidator implements IValidator {
  async validate(content: string, config: ValidationConfig): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];

    // 基本Markdown验证
    if (!content.includes('#')) {
      issues.push({
        type: 'structure',
        severity: 'info',
        message: 'No headings found'
      });
    }

    return {
      valid: true,
      issues,
      suggestions: ['Consider adding headings for better structure']
    };
  }
}

// JSON验证器
class JSONValidator implements IValidator {
  async validate(content: string, config: ValidationConfig): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];

    try {
      JSON.parse(content);
    } catch (error) {
      issues.push({
        type: 'format',
        severity: 'error',
        message: `Invalid JSON: ${error}`
      });
    }

    return {
      valid: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      suggestions: []
    };
  }
}

// XML验证器
class XMLValidator implements IValidator {
  async validate(content: string, config: ValidationConfig): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];

    // 基本XML验证
    if (!content.includes('<?xml')) {
      issues.push({
        type: 'structure',
        severity: 'warning',
        message: 'Missing XML declaration'
      });
    }

    return {
      valid: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      suggestions: ['Consider adding XML declaration']
    };
  }
}

// Gzip压缩器
class GzipCompressor implements ICompressor {
  async compress(inputPath: string, outputPath: string, config: CompressionConfig): Promise<void> {
    const zlib = await import('zlib');
    const input = await fs.readFile(inputPath);
    const compressed = zlib.gzipSync(input, { level: config.level });
    await fs.writeFile(outputPath, compressed);
  }
}

// Brotli压缩器
class BrotliCompressor implements ICompressor {
  async compress(inputPath: string, outputPath: string, config: CompressionConfig): Promise<void> {
    const zlib = await import('zlib');
    const input = await fs.readFile(inputPath);
    const compressed = zlib.brotliCompressSync(input);
    await fs.writeFile(outputPath, compressed);
  }
}

// Deflate压缩器
class DeflateCompressor implements ICompressor {
  async compress(inputPath: string, outputPath: string, config: CompressionConfig): Promise<void> {
    const zlib = await import('zlib');
    const input = await fs.readFile(inputPath);
    const compressed = zlib.deflateSync(input, { level: config.level });
    await fs.writeFile(outputPath, compressed);
  }
}

// 模板引擎
class TemplateEngine {
  async render(templateId: string, data: ContentData, format: FileFormat): Promise<ContentData> {
    // 模板渲染逻辑（可以集成Handlebars、Mustache等）
    return data;
  }
}

// 资源管理器
class AssetManager {
  async processAssets(assets: AssetData[], outputDir?: string): Promise<void> {
    // 资源处理逻辑
  }
}

// 指标收集器
class MetricsCollector {
  private metrics: any = {
    totalGenerations: 0,
    successfulGenerations: 0,
    failedGenerations: 0,
    averageProcessingTime: 0,
    formatUsage: new Map<FileFormat, number>()
  };

  recordGeneration(result: DeliveryResult): void {
    this.metrics.totalGenerations++;
    if (result.success) {
      this.metrics.successfulGenerations++;
    } else {
      this.metrics.failedGenerations++;
    }

    // 更新格式使用统计
    const currentUsage = this.metrics.formatUsage.get(result.format) || 0;
    this.metrics.formatUsage.set(result.format, currentUsage + 1);

    // 更新平均处理时间
    this.metrics.averageProcessingTime =
      (this.metrics.averageProcessingTime * (this.metrics.totalGenerations - 1) +
        result.metrics.totalTime) / this.metrics.totalGenerations;
  }

  getMetrics(): any {
    return {
      ...this.metrics,
      formatUsage: Object.fromEntries(this.metrics.formatUsage)
    };
  }
}

// 缓存管理器
class CacheManager {
  private cache: Map<string, any> = new Map();
  private maxSize = 1000;
  private ttl = 3600000; // 1小时

  async get(key: string): Promise<any> {
    const item = this.cache.get(key);
    if (item && Date.now() - item.timestamp < this.ttl) {
      return item.value;
    }
    this.cache.delete(key);
    return null;
  }

  async set(key: string, value: any): Promise<void> {
    if (this.cache.size >= this.maxSize) {
      // 删除最旧的项目
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}

export {
  HTMLGenerator,
  MarkdownGenerator,
  PPTGenerator,
  PPTXGenerator,
  PDFGenerator,
  DOCXGenerator,
  JSONGenerator,
  XMLGenerator,
  CSVGenerator,
  XLSXGenerator,
  TXTGenerator,
  TemplateEngine,
  AssetManager,
  MetricsCollector,
  CacheManager
};