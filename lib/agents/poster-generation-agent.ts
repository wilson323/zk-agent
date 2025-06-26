/**
 * 海报生成智能体 - 重试策略和资源管理实现
 * 提供重试机制、资源监控、质量降级等功能
 */

import {
  PosterGenerationFailed,
  PosterResourceLimit,
  PosterTemplateError,
  PosterConfig,
  PosterResult,
  ResourceStatus,
  delay,
  calculateBackoffDelay
} from '../errors/agent-errors';
import { PosterTemplate } from '../poster/template-system';

// 海报模板接口已从 '../poster/template-system' 导入

// 资源监控器
class PosterResourceManager {
  private memoryThreshold = {
    normal: 0.7,
    high: 0.9
  };
  
  private cpuThreshold = {
    normal: 0.7,
    high: 0.9
  };

  /**
   * 检查资源可用性
   */
  async checkResourceAvailability(): Promise<ResourceStatus> {
    const [memoryUsage, cpuUsage] = await Promise.all([
      this.getMemoryUsage(),
      this.getCPUUsage()
    ]);

    if (memoryUsage > this.memoryThreshold.high || cpuUsage > this.cpuThreshold.high) {
      return ResourceStatus.CRITICAL;
    } else if (memoryUsage > this.memoryThreshold.normal || cpuUsage > this.cpuThreshold.normal) {
      return ResourceStatus.HIGH;
    }

    return ResourceStatus.NORMAL;
  }

  /**
   * 获取内存使用率
   */
  private async getMemoryUsage(): Promise<number> {
    try {
      // 在浏览器环境中模拟内存使用率
      if (typeof window !== 'undefined' && 'performance' in window) {
        const memory = (performance as any).memory;
        if (memory) {
          return memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        }
      }
      
      // Node.js环境
      if (typeof process !== 'undefined' && process.memoryUsage) {
        const usage = process.memoryUsage();
        return usage.heapUsed / usage.heapTotal;
      }
      
      // 模拟值
      return Math.random() * 0.8;
    } catch (error) {
      console.warn('无法获取内存使用率:', error);
      return 0.5; // 默认值
    }
  }

  /**
   * 获取CPU使用率
   */
  private async getCPUUsage(): Promise<number> {
    try {
      // 模拟CPU使用率检测
      const start = Date.now();
      await delay(10);
      const end = Date.now();
      
      // 简单的CPU负载估算
      const expectedDelay = 10;
      const actualDelay = end - start;
      const loadFactor = Math.max(0, (actualDelay - expectedDelay) / expectedDelay);
      
      return Math.min(0.9, loadFactor + Math.random() * 0.3);
    } catch (error) {
      console.warn('无法获取CPU使用率:', error);
      return 0.5; // 默认值
    }
  }

  /**
   * 等待资源释放
   */
  async waitForResources(maxWaitTime: number = 5000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.checkResourceAvailability();
      
      if (status !== ResourceStatus.CRITICAL) {
        return;
      }
      
      await delay(1000); // 等待1秒后重新检查
    }
    
    throw new PosterResourceLimit(
      `等待资源释放超时 (${maxWaitTime}ms)`,
      { waitTime: maxWaitTime }
    );
  }

  /**
   * 根据资源状态调整配置
   */
  adjustConfigForResources(config: PosterConfig, resourceStatus: ResourceStatus): PosterConfig {
    const adjustedConfig = { ...config };
    
    switch (resourceStatus) {
      case ResourceStatus.CRITICAL:
        adjustedConfig.quality = 'low';
        adjustedConfig.width = Math.min(config.width, 800);
        adjustedConfig.height = Math.min(config.height, 600);
        break;
        
      case ResourceStatus.HIGH:
        adjustedConfig.quality = config.quality === 'high' ? 'medium' : config.quality;
        adjustedConfig.width = Math.min(config.width, 1200);
        adjustedConfig.height = Math.min(config.height, 900);
        break;
        
      default:
        // 保持原配置
        break;
    }
    
    return adjustedConfig;
  }
}

// 海报模板管理器
class PosterTemplateManager {
  private templates: Map<string, PosterTemplate> = new Map();
  
  constructor() {
    this.initializeTemplates();
  }

  /**
   * 初始化模板
   */
  private initializeTemplates(): void {
    const templates: PosterTemplate[] = [
      {
        id: 'security-basic',
        name: '基础安全海报',
        description: '适用于基础安全宣传的海报模板',
        category: 'low',
        thumbnailUrl: '/templates/security-basic-thumb.jpg',
        previewUrl: '/templates/security-basic-preview.jpg',
        elements: [],
        layout: { type: 'grid', columns: 1, rows: 3 },
        style: { colorScheme: ['#1e40af', '#ffffff'], typography: { primaryFont: 'Arial', secondaryFont: 'Helvetica', headingScale: 1.5, lineHeight: 1.4 }, spacing: { unit: 8, scale: [0.5, 1, 1.5, 2, 3, 4, 6, 8] }, effects: [] },
        metadata: { industry: ['security'], useCase: ['awareness'], difficulty: 'beginner', popularity: 85, tags: ['security', 'awareness'], createdAt: new Date(), updatedAt: new Date() }
      },
      {
        id: 'security-advanced',
        name: '高级安全海报',
        description: '适用于高级安全培训的海报模板',
        category: 'high',
        thumbnailUrl: '/templates/security-advanced-thumb.jpg',
        previewUrl: '/templates/security-advanced-preview.jpg',
        elements: [],
        layout: { type: 'grid', columns: 2, rows: 4 },
        style: { colorScheme: ['#dc2626', '#ffffff', '#1e40af'], typography: { primaryFont: 'Arial', secondaryFont: 'Helvetica', headingScale: 1.6, lineHeight: 1.5 }, spacing: { unit: 8, scale: [0.5, 1, 1.5, 2, 3, 4, 6, 8] }, effects: [] },
        metadata: { industry: ['security'], useCase: ['training'], difficulty: 'advanced', popularity: 75, tags: ['security', 'training', 'advanced'], createdAt: new Date(), updatedAt: new Date() }
      },
      {
        id: 'minimal',
        name: '极简模板',
        description: '简洁明了的基础模板',
        category: 'medium',
        thumbnailUrl: '/templates/minimal-thumb.jpg',
        previewUrl: '/templates/minimal-preview.jpg',
        elements: [],
        layout: { type: 'flex', alignment: 'center' },
        style: { colorScheme: ['#000000', '#ffffff'], typography: { primaryFont: 'Arial', secondaryFont: 'Helvetica', headingScale: 1.2, lineHeight: 1.3 }, spacing: { unit: 4, scale: [0.25, 0.5, 1, 1.5, 2, 3, 4, 6] }, effects: [] },
        metadata: { industry: ['general'], useCase: ['basic'], difficulty: 'beginner', popularity: 95, tags: ['minimal', 'basic'], createdAt: new Date(), updatedAt: new Date() }
      }
    ];
    
    templates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * 获取模板
   */
  getTemplate(templateId: string): PosterTemplate | null {
    return this.templates.get(templateId) || null;
  }

  /**
   * 获取备用模板
   */
  getFallbackTemplate(templateId: string): PosterTemplate | null {
    const template = this.getTemplate(templateId);
    if (template) {
      // 使用默认模板作为备用
      return this.getDefaultTemplate();
    }
    
    // 返回最简单的模板
    return this.getTemplate('minimal');
  }

  /**
   * 根据复杂度获取模板
   */
  getTemplateByComplexity(complexity: 'low' | 'medium' | 'high'): PosterTemplate | null {
    for (const template of Array.from(this.templates.values())) {
      if (template.category === complexity) {
        return template;
      }
    }
    return null;
  }

  /**
   * 获取默认模板
   */
  getDefaultTemplate(): PosterTemplate | null {
    return Array.from(this.templates.values())[0] || null;
  }
}

// 海报生成核心引擎
class PosterGenerationEngine {
  /**
   * 核心生成逻辑
   */
  async generatePoster(config: PosterConfig): Promise<PosterResult> {
    try {
      // 模拟海报生成过程
      await this.simulateGeneration(config);
      
      // 模拟可能的失败
      if (Math.random() < 0.2) {
        throw new Error('生成过程中遇到错误');
      }
      
      return {
        success: true,
        imageUrl: this.generateImageUrl(config),
        metadata: {
          template: config.template,
          quality: config.quality,
          dimensions: `${config.width}x${config.height}`,
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      throw new PosterGenerationFailed(
        `海报生成失败: ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error : undefined,
        { config }
      );
    }
  }

  /**
   * 模拟生成过程
   */
  private async simulateGeneration(config: PosterConfig): Promise<void> {
    const baseTime = 1000;
    const complexityMultiplier = {
      low: 1,
      medium: 2,
      high: 3
    };
    
    const qualityMultiplier = {
      low: 0.5,
      medium: 1,
      high: 1.5
    };
    
    const generationTime = baseTime * 
      complexityMultiplier[config.quality] * 
      qualityMultiplier[config.quality];
    
    await delay(generationTime + Math.random() * 1000);
  }

  /**
   * 生成图片URL
   */
  private generateImageUrl(config: PosterConfig): string {
    const timestamp = Date.now();
    const hash = Math.random().toString(36).substr(2, 9);
    return `/api/posters/${config.template}-${timestamp}-${hash}.png`;
  }
}

// 海报生成智能体主类
export class PosterGenerationAgent {
  private resourceManager: PosterResourceManager;
  private templateManager: PosterTemplateManager;
  private generationEngine: PosterGenerationEngine;
  private maxRetries = 3;

  constructor() {
    this.resourceManager = new PosterResourceManager();
    this.templateManager = new PosterTemplateManager();
    this.generationEngine = new PosterGenerationEngine();
  }

  /**
   * 生成海报 - 主入口方法
   */
  async generatePoster(config: PosterConfig): Promise<PosterResult> {
    // 验证配置
    this.validateConfig(config);
    
    // 检查资源状态
    const resourceStatus = await this.resourceManager.checkResourceAvailability();
    
    if (resourceStatus === ResourceStatus.CRITICAL) {
      throw new PosterResourceLimit(
        '系统资源不足，请稍后重试',
        { resourceStatus }
      );
    }
    
    // 根据资源状态调整配置
    const adjustedConfig = this.resourceManager.adjustConfigForResources(config, resourceStatus);
    
    return await this.generateWithRetry(adjustedConfig);
  }

  /**
   * 带重试机制的生成
   */
  async generateWithRetry(config: PosterConfig): Promise<PosterResult> {
    let lastError: Error = new Error('未知错误');
    let currentConfig = { ...config };
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.attemptGeneration(currentConfig, attempt);
      } catch (error) {
        lastError = error as Error;
        
        if (error instanceof PosterResourceLimit) {
          // 等待资源释放
          await this.resourceManager.waitForResources(attempt * 1000);
        } else if (error instanceof PosterTemplateError) {
          // 尝试备用模板
          currentConfig = this.useFallbackTemplate(currentConfig);
        } else if (error instanceof PosterGenerationFailed) {
          // 降低质量设置
          currentConfig = this.adjustQualityForRetry(currentConfig, attempt);
        }
        
        if (attempt < this.maxRetries) {
          const delay = calculateBackoffDelay(attempt);
          console.warn(`海报生成失败，${delay}ms后重试 (${attempt}/${this.maxRetries}):`, error);
          await this.delay(delay);
        }
      }
    }
    
    throw new PosterGenerationFailed(
      `海报生成失败，已重试${this.maxRetries}次`,
      lastError,
      { attempts: this.maxRetries, finalConfig: currentConfig }
    );
  }

  /**
   * 尝试生成海报
   */
  private async attemptGeneration(config: PosterConfig, attempt: number): Promise<PosterResult> {
    console.log(`海报生成尝试 ${attempt}:`, {
      template: config.template,
      quality: config.quality,
      dimensions: `${config.width}x${config.height}`
    });
    
    return await this.generationEngine.generatePoster(config);
  }

  /**
   * 使用备用模板
   */
  private useFallbackTemplate(config: PosterConfig): PosterConfig {
    const fallbackTemplate = this.templateManager.getFallbackTemplate(config.template);
    
    if (fallbackTemplate) {
      console.log(`切换到备用模板: ${fallbackTemplate.id}`);
      return {
        ...config,
        template: fallbackTemplate.id
      };
    }
    
    throw new PosterTemplateError(
      '没有可用的备用模板',
      { originalTemplate: config.template }
    );
  }

  /**
   * 根据重试次数调整质量
   */
  private adjustQualityForRetry(config: PosterConfig, attempt: number): PosterConfig {
    const qualityLevels: Array<'low' | 'medium' | 'high'> = ['high', 'medium', 'low'];
    const currentIndex = qualityLevels.indexOf(config.quality);
    const newIndex = Math.min(currentIndex + attempt - 1, qualityLevels.length - 1);
    
    const adjustedConfig: PosterConfig = {
      ...config,
      quality: qualityLevels[newIndex] || 'medium'
    };
    
    // 同时调整尺寸
    if (attempt > 1) {
      adjustedConfig.width = Math.max(config.width * (0.8 ** (attempt - 1)), 400);
      adjustedConfig.height = Math.max(config.height * (0.8 ** (attempt - 1)), 300);
    }
    
    console.log(`调整质量设置 (尝试 ${attempt}):`, {
      quality: adjustedConfig.quality,
      dimensions: `${adjustedConfig.width}x${adjustedConfig.height}`
    });
    
    return adjustedConfig;
  }

  /**
   * 验证配置
   */
  private validateConfig(config: PosterConfig): void {
    if (!config.template) {
      throw new PosterTemplateError('模板ID不能为空');
    }
    
    if (config.width <= 0 || config.height <= 0) {
      throw new PosterGenerationFailed('海报尺寸必须大于0');
    }
    
    if (config.width > 4000 || config.height > 4000) {
      throw new PosterGenerationFailed('海报尺寸过大，最大支持4000x4000');
    }
    
    const template = this.templateManager.getTemplate(config.template);
    if (!template) {
      throw new PosterTemplateError(
        `模板不存在: ${config.template}`,
        { templateId: config.template }
      );
    }
  }

  /**
   * 延迟工具方法
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取可用模板列表
   */
  getAvailableTemplates(): PosterTemplate[] {
    return Array.from(this.templateManager['templates'].values());
  }

  /**
   * 获取资源状态
   */
  async getResourceStatus(): Promise<ResourceStatus> {
    return await this.resourceManager.checkResourceAvailability();
  }

  /**
   * 获取生成统计信息
   */
  getGenerationStats(): Record<string, any> {
    return {
      maxRetries: this.maxRetries,
      supportedQualities: ['low', 'medium', 'high'],
      maxDimensions: '4000x4000',
      availableTemplates: this.getAvailableTemplates().length
    };
  }
}

// 导出默认实例
export const posterGenerationAgent = new PosterGenerationAgent();