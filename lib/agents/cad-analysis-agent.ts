/**
 * CAD分析智能体 - 容错机制实现
 * 提供文件解析容错、超时处理、备用解析器等功能
 */

import {
  CADParseError,
  CADAnalysisTimeout,
  CADAnalysisResult,
  delay,
  calculateBackoffDelay
} from '../errors/agent-errors';

// CAD文件解析器接口
interface CADParser {
  parse(file: File): Promise<CADAnalysisResult>;
  supportedFormats: string[];
}

// 主要CAD解析器
class PrimaryCADParser implements CADParser {
  supportedFormats = ['.dwg', '.dxf', '.step', '.iges', '.obj'];

  /**
   * 主要解析逻辑
   */
  async parse(file: File): Promise<CADAnalysisResult> {
    try {
      // 模拟CAD文件解析
      const analysisData = await this.performAnalysis(file);
      
      return {
        fileName: file.name,
        fileSize: file.size,
        format: this.detectFormat(file),
        status: 'success',
        analysisData
      };
    } catch (error) {
      throw new CADParseError(
        `主解析器解析失败: ${error instanceof Error ? error.message : '未知错误'}`,
        { fileName: file.name, fileSize: file.size }
      );
    }
  }

  private async performAnalysis(file: File): Promise<Record<string, any>> {
    // 模拟分析过程
    await delay(Math.random() * 2000 + 1000);
    
    // 模拟可能的解析失败
    if (Math.random() < 0.3) {
      throw new Error(`解析文件 ${file.name} 时遇到格式错误`);
    }

    return {
      fileName: file.name,
      fileSize: file.size,
      vertices: Math.floor(Math.random() * 10000),
      faces: Math.floor(Math.random() * 5000),
      materials: Math.floor(Math.random() * 10),
      boundingBox: {
        min: { x: -10, y: -10, z: -10 },
        max: { x: 10, y: 10, z: 10 }
      }
    };
  }

  private detectFormat(file: File): string {
    const extension = file.name.toLowerCase().split('.').pop();
    return extension || 'unknown';
  }
}

// 备用CAD解析器
class FallbackCADParser implements CADParser {
  supportedFormats = ['.dwg', '.dxf', '.obj'];

  /**
   * 备用解析逻辑 - 更宽松的解析策略
   */
  async parse(file: File): Promise<CADAnalysisResult> {
    try {
      // 使用更简单的解析策略
      const basicData = await this.performBasicAnalysis(file);
      
      return {
        fileName: file.name,
        fileSize: file.size,
        format: this.detectFormat(file),
        status: 'partial_analysis',
        message: '使用备用解析器，部分功能可能受限',
        analysisData: basicData
      };
    } catch (error) {
      throw new CADParseError(
        `备用解析器也无法解析文件: ${error instanceof Error ? error.message : '未知错误'}`,
        { fileName: file.name, fileSize: file.size }
      );
    }
  }

  private async performBasicAnalysis(file: File): Promise<Record<string, any>> {
    // 模拟基础分析
    await delay(500);
    
    return {
      fileInfo: {
        name: file.name,
        size: file.size,
        type: file.type
      },
      basicMetrics: {
        estimatedComplexity: 'medium',
        processingTime: Date.now()
      }
    };
  }

  private detectFormat(file: File): string {
    const extension = file.name.toLowerCase().split('.').pop();
    return extension || 'unknown';
  }
}

// CAD超时处理器
class CADTimeoutHandler {
  private defaultTimeout = 30000; // 30秒

  /**
   * 带超时的CAD分析
   */
  async analyzeWithTimeout(
    file: File,
    analyzer: CADAnalysisAgent,
    timeout: number = this.defaultTimeout
  ): Promise<CADAnalysisResult> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new CADAnalysisTimeout(
          `CAD分析超时 (${timeout}ms)`,
          { fileName: file.name, timeout }
        ));
      }, timeout);
    });

    try {
      return await Promise.race([
        analyzer.analyzeCADFile(file),
        timeoutPromise
      ]);
    } catch (error) {
      if (error instanceof CADAnalysisTimeout) {
        // 返回快速分析结果
        return await this.quickAnalysis(file);
      }
      throw error;
    }
  }

  /**
   * 快速分析 - 超时时的备选方案
   */
  private async quickAnalysis(file: File): Promise<CADAnalysisResult> {
    return {
      fileName: file.name,
      fileSize: file.size,
      format: this.detectFormat(file),
      status: 'partial_analysis',
      message: '分析超时，已提供基础信息',
      analysisData: {
        quickScan: true,
        fileInfo: {
          name: file.name,
          size: file.size,
          uploadTime: new Date().toISOString()
        }
      }
    };
  }

  private detectFormat(file: File): string {
    const extension = file.name.toLowerCase().split('.').pop();
    return extension || 'unknown';
  }
}

// CAD分析智能体主类
export class CADAnalysisAgent {
  private primaryParser: PrimaryCADParser;
  private fallbackParser: FallbackCADParser;
  private timeoutHandler: CADTimeoutHandler;
  private maxRetries = 3;

  constructor() {
    this.primaryParser = new PrimaryCADParser();
    this.fallbackParser = new FallbackCADParser();
    this.timeoutHandler = new CADTimeoutHandler();
  }

  /**
   * 分析CAD文件 - 主入口方法
   */
  async analyzeCADFile(file: File): Promise<CADAnalysisResult> {
    // 文件验证
    const validationResult = this.validateFile(file);
    if (!validationResult.isValid) {
      throw new CADParseError(
        validationResult.error || '文件验证失败',
        { fileName: file.name, fileSize: file.size }
      );
    }

    try {
      // 尝试主要解析器
      return await this.primaryParser.parse(file);
    } catch (error) {
      if (error instanceof CADParseError) {
        console.warn('主解析器失败，尝试备用解析器:', error.message);
        
        try {
          // 尝试备用解析器
          return await this.fallbackParser.parse(file);
        } catch (fallbackError) {
          console.warn('备用解析器也失败，生成基础信息:', fallbackError);
          
          // 提供基础信息
          return this.generateBasicInfo(file);
        }
      }
      throw error;
    }
  }

  /**
   * 带重试机制的分析
   */
  async analyzeWithRetry(file: File): Promise<CADAnalysisResult> {
    let lastError: Error = new Error('未知错误');
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.timeoutHandler.analyzeWithTimeout(file, this);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.maxRetries) {
          const delay = calculateBackoffDelay(attempt);
          console.warn(`CAD分析失败，${delay}ms后重试 (${attempt}/${this.maxRetries}):`, error);
          await this.delay(delay);
        }
      }
    }
    
    throw new CADParseError(
      `CAD分析失败，已重试${this.maxRetries}次: ${lastError.message}`,
      { fileName: file.name, attempts: this.maxRetries }
    );
  }

  /**
   * 文件验证
   */
  private validateFile(file: File): { isValid: boolean; error?: string } {
    // 检查文件大小 (最大100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `文件过大，最大支持${maxSize / 1024 / 1024}MB`
      };
    }

    // 检查文件格式
    const supportedFormats = [...this.primaryParser.supportedFormats, ...this.fallbackParser.supportedFormats];
    const fileExtension = '.' + file.name.toLowerCase().split('.').pop();
    
    if (!supportedFormats.includes(fileExtension)) {
      return {
        isValid: false,
        error: `不支持的文件格式: ${fileExtension}`
      };
    }

    return { isValid: true };
  }

  /**
   * 生成基础信息 - 最后的备选方案
   */
  private generateBasicInfo(file: File): CADAnalysisResult {
    return {
      fileName: file.name,
      fileSize: file.size,
      format: this.detectFormat(file),
      status: 'partial_analysis',
      message: '文件解析遇到问题，已提供基础信息',
      analysisData: {
        fileInfo: {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        },
        fallbackMode: true,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * 检测文件格式
   */
  private detectFormat(file: File): string {
    const extension = file.name.toLowerCase().split('.').pop();
    return extension || 'unknown';
  }

  /**
   * 延迟工具方法
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取支持的文件格式
   */
  getSupportedFormats(): string[] {
    const allFormats = new Set([
      ...this.primaryParser.supportedFormats,
      ...this.fallbackParser.supportedFormats
    ]);
    return Array.from(allFormats);
  }

  /**
   * 获取分析统计信息
   */
  getAnalysisStats(): Record<string, any> {
    return {
      supportedFormats: this.getSupportedFormats(),
      maxRetries: this.maxRetries,
      defaultTimeout: 30000,
      maxFileSize: '100MB'
    };
  }
}

// 导出默认实例
export const cadAnalysisAgent = new CADAnalysisAgent();