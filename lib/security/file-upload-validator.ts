/**
 * @file 文件上传安全验证器
 * @description 企业级文件上传安全检查系统
 * @author ZK-Agent Team
 * @date 2024-12-27
 */

import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import path from 'path';
import { z } from 'zod';

import { Logger } from '@/lib/utils/logger';
import { ERROR_CODES } from '@/config/constants';
import { AppError } from '@/lib/utils/error-handler';
import { ErrorType, ErrorSeverity } from '@/lib/types/enums';

const logger = new Logger('FileUploadValidator');

// 文件验证规则接口
interface FileValidationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  validator: (file: FileUploadContext) => Promise<ValidationResult>;
}

// 文件上传上下文
interface FileUploadContext {
  buffer: Buffer;
  originalName: string;
  mimetype: string;
  size: number;
  userId?: string;
  uploadPath?: string;
  metadata?: Record<string, unknown>;
}

import { ValidationResult as BaseValidationResult } from '../types/interfaces';

interface ValidationResult extends BaseValidationResult {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendation?: string;
  passed: boolean;
  ruleId?: string;
  ruleName?: string;
}

// 安全威胁类型
enum ThreatType {
  MALWARE = 'MALWARE',
  SCRIPT_INJECTION = 'SCRIPT_INJECTION',
  PATH_TRAVERSAL = 'PATH_TRAVERSAL',
  MIME_MISMATCH = 'MIME_MISMATCH',
  SIZE_VIOLATION = 'SIZE_VIOLATION',
  FORBIDDEN_EXTENSION = 'FORBIDDEN_EXTENSION',
  SUSPICIOUS_CONTENT = 'SUSPICIOUS_CONTENT',
  ENCRYPTED_ARCHIVE = 'ENCRYPTED_ARCHIVE'
}

// 文件类型配置
const FILE_TYPE_CONFIGS = {
  IMAGE: {
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml'],
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedCategories: ['user-uploads', 'profile-pictures', 'content-images']
  },
  DOCUMENT: {
    extensions: ['.pdf', '.doc', '.docx', '.txt', '.rtf'],
    mimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/rtf'],
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedCategories: ['documents', 'reports', 'user-uploads']
  },
  CAD: {
    extensions: ['.dwg', '.dxf', '.step', '.stp', '.iges', '.igs', '.obj', '.stl'],
    mimeTypes: ['application/acad', 'application/dxf', 'application/step', 'model/obj', 'application/sla'],
    maxSize: 100 * 1024 * 1024, // 100MB
    allowedCategories: ['cad-files', 'engineering']
  },
  ARCHIVE: {
    extensions: ['.zip', '.tar', '.gz', '.7z'],
    mimeTypes: ['application/zip', 'application/x-tar', 'application/gzip', 'application/x-7z-compressed'],
    maxSize: 200 * 1024 * 1024, // 200MB
    allowedCategories: ['bulk-uploads', 'backups']
  }
};

// 危险文件签名数据库
const MALWARE_SIGNATURES = [
  // 可执行文件头部
  { signature: Buffer.from('4D5A', 'hex'), description: 'Windows PE Executable', threat: ThreatType.MALWARE },
  { signature: Buffer.from('7F454C46', 'hex'), description: 'Linux ELF Executable', threat: ThreatType.MALWARE },
  
  // 脚本特征
  { signature: Buffer.from('<script', 'utf8'), description: 'JavaScript Code', threat: ThreatType.SCRIPT_INJECTION },
  { signature: Buffer.from('<?php', 'utf8'), description: 'PHP Code', threat: ThreatType.SCRIPT_INJECTION },
  { signature: Buffer.from('<%', 'utf8'), description: 'Server-side Script', threat: ThreatType.SCRIPT_INJECTION },
  
  // 路径遍历特征
  { signature: Buffer.from('../', 'utf8'), description: 'Path Traversal', threat: ThreatType.PATH_TRAVERSAL },
  { signature: Buffer.from('..\\', 'utf8'), description: 'Windows Path Traversal', threat: ThreatType.PATH_TRAVERSAL },
  
  // 加密压缩包特征
  { signature: Buffer.from('504B0708', 'hex'), description: 'Encrypted ZIP', threat: ThreatType.ENCRYPTED_ARCHIVE }
];

export class FileUploadValidator {
  private rules: Map<string, FileValidationRule> = new Map();
  private quarantineDir: string;
  private scanStatistics = {
    totalScanned: 0,
    threatsDetected: 0,
    lastScanTime: Date.now(),
    ruleExecutions: new Map<string, number>()
  };

  constructor(quarantineDir = './quarantine') {
    this.quarantineDir = quarantineDir;
    this.initializeDefaultRules();
  }

  /**
   * 初始化默认验证规则
   */
  private initializeDefaultRules(): void {
    // 文件大小验证
    this.addRule({
      id: 'file-size-check',
      name: '文件大小检查',
      description: '检查文件大小是否超过限制',
      enabled: true,
      severity: 'HIGH',
      validator: this.validateFileSize.bind(this)
    });

    // 文件扩展名验证
    this.addRule({
      id: 'extension-check',
      name: '文件扩展名检查',
      description: '检查文件扩展名是否在允许列表中',
      enabled: true,
      severity: 'HIGH',
      validator: this.validateFileExtension.bind(this)
    });

    // MIME类型验证
    this.addRule({
      id: 'mime-type-check',
      name: 'MIME类型检查',
      description: '检查MIME类型与文件扩展名是否匹配',
      enabled: true,
      severity: 'MEDIUM',
      validator: this.validateMimeType.bind(this)
    });

    // 恶意软件签名检查
    this.addRule({
      id: 'malware-signature-check',
      name: '恶意软件签名检查',
      description: '检查文件是否包含已知恶意软件签名',
      enabled: true,
      severity: 'CRITICAL',
      validator: this.validateMalwareSignatures.bind(this)
    });

    // 文件内容扫描
    this.addRule({
      id: 'content-scan',
      name: '文件内容扫描',
      description: '扫描文件内容中的可疑代码和模式',
      enabled: true,
      severity: 'HIGH',
      validator: this.validateFileContent.bind(this)
    });

    // 文件名安全检查
    this.addRule({
      id: 'filename-security-check',
      name: '文件名安全检查',
      description: '检查文件名是否包含危险字符或路径遍历',
      enabled: true,
      severity: 'MEDIUM',
      validator: this.validateFileName.bind(this)
    });

    logger.info(`已初始化 ${this.rules.size} 个文件验证规则`);
  }

  /**
   * 添加自定义验证规则
   */
  addRule(rule: FileValidationRule): void {
    this.rules.set(rule.id, rule);
    logger.info(`添加文件验证规则: ${rule.name} (${rule.id})`);
  }

  /**
   * 启用/禁用验证规则
   */
  toggleRule(ruleId: string, enabled: boolean): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
      logger.info(`${enabled ? '启用' : '禁用'}验证规则: ${rule.name}`);
    }
  }

  /**
   * 验证上传文件
   */
  async validateFile(context: FileUploadContext): Promise<{
    isValid: boolean;
    threats: ValidationResult[];
    score: number;
    recommendations: string[];
  }> {
    const startTime = Date.now();
    const threats: ValidationResult[] = [];
    let score = 100;
    const recommendations: string[] = [];

    try {
      logger.info(`开始验证文件: ${context.originalName} (${context.size} bytes)`);

      // 执行所有启用的验证规则
      for (const rule of this.rules.values()) {
        if (!rule.enabled) {
          continue;
        }

        try {
          const result = await rule.validator(context);
          
          // 更新统计信息
          const execCount = this.scanStatistics.ruleExecutions.get(rule.id) || 0;
          this.scanStatistics.ruleExecutions.set(rule.id, execCount + 1);

          if (!result.isValid) {
            threats.push(result);
            
            // 根据严重性扣分
            const severityPenalty = this.getSeverityPenalty(result.severity as any);
            score -= severityPenalty;

            if (result.recommendation) {
              recommendations.push(result.recommendation);
            }

            logger.warn(`验证规则失败: ${rule.name} - ${result.message}`, {
              ruleId: rule.id,
              severity: result.severity,
              details: result.details
            });
          }
        } catch (error) {
          logger.error(`验证规则执行失败: ${rule.name}`, {
            ruleId: rule.id,
            error: error instanceof Error ? error.message : String(error)
          });
          
          // 规则执行失败视为潜在威胁
          threats.push({
            passed: false,
            ruleId: rule.id,
            ruleName: rule.name,
            severity: 'MEDIUM',
            message: '验证规则执行失败',
            details: { error: error instanceof Error ? error.message : String(error) }
          });
          score -= 10;
        }
      }

      // 计算最终分数
      score = Math.max(0, Math.min(100, score));
      const isValid = threats.length === 0 || score >= 60;

      // 更新统计信息
      this.scanStatistics.totalScanned++;
      this.scanStatistics.lastScanTime = Date.now();
      if (threats.length > 0) {
        this.scanStatistics.threatsDetected++;
      }

      const duration = Date.now() - startTime;
      logger.info(`文件验证完成: ${context.originalName}`, {
        isValid,
        threatCount: threats.length,
        score,
        duration: duration
      });

      // 如果检测到威胁，隔离文件
      if (!isValid && threats.some(t => ['HIGH', 'CRITICAL'].includes(t.severity))) {
        await this.quarantineFile(context, threats);
      }

      return {
        isValid,
        threats,
        score,
        recommendations: [...new Set(recommendations)] // 去重
      };

    } catch (error) {
      logger.error(`文件验证过程发生错误: ${context.originalName}`, {
        error: error instanceof Error ? error.message : String(error)
      });

      throw new AppError(
        ErrorType.SYSTEM,
        ERROR_CODES.OPERATION_FAILED,
        '文件安全验证失败',
        500,
        ErrorSeverity.HIGH,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * 文件大小验证
   */
  private async validateFileSize(context: FileUploadContext): Promise<ValidationResult> {
    const extension = path.extname(context.originalName).toLowerCase();
    let maxSize = 50 * 1024 * 1024; // 默认50MB

    // 根据文件类型确定大小限制
    for (const [_type, config] of Object.entries(FILE_TYPE_CONFIGS)) {
      if (config.extensions.includes(extension)) {
        maxSize = config.maxSize;
        break;
      }
    }

    const passed = context.size <= maxSize;
    
    return {
      isValid: passed,
      ruleId: 'file-size-check',
      ruleName: '文件大小检查',
      severity: 'HIGH',
      message: passed 
        ? '文件大小验证通过' 
        : `文件大小超过限制: ${(context.size / 1024 / 1024).toFixed(2)}MB > ${(maxSize / 1024 / 1024).toFixed(2)}MB`,
      details: {
        fileSize: context.size,
        maxAllowed: maxSize,
        fileSizeMB: (context.size / 1024 / 1024).toFixed(2),
        maxAllowedMB: (maxSize / 1024 / 1024).toFixed(2)
      },
      recommendation: passed ? undefined : '请压缩文件或使用支持的文件格式'
    };
  }

  /**
   * 文件扩展名验证
   */
  private async validateFileExtension(context: FileUploadContext): Promise<ValidationResult> {
    const extension = path.extname(context.originalName).toLowerCase();
    const allowedExtensions: string[] = [];
    
    // 收集所有允许的扩展名
    for (const config of Object.values(FILE_TYPE_CONFIGS)) {
      allowedExtensions.push(...config.extensions);
    }

    const passed = allowedExtensions.includes(extension);
    
    return {
      isValid: passed,
      ruleId: 'extension-check',
      ruleName: '文件扩展名检查',
      severity: 'HIGH',
      message: passed 
        ? '文件扩展名验证通过' 
        : `不支持的文件扩展名: ${extension}`,
      details: {
        fileExtension: extension,
        allowedExtensions
      },
      recommendation: passed ? undefined : `请使用支持的文件格式: ${allowedExtensions.join(', ')}`
    };
  }

  /**
   * MIME类型验证
   */
  private async validateMimeType(context: FileUploadContext): Promise<ValidationResult> {
    const extension = path.extname(context.originalName).toLowerCase();
    let expectedMimeTypes: string[] = [];
    
    // 根据扩展名确定期望的MIME类型
    for (const config of Object.values(FILE_TYPE_CONFIGS)) {
      if (config.extensions.includes(extension)) {
        expectedMimeTypes = config.mimeTypes;
        break;
      }
    }

    const passed = expectedMimeTypes.length === 0 || expectedMimeTypes.includes(context.mimetype);
    
    return {
      isValid: passed,
      ruleId: 'mime-type-check',
      ruleName: 'MIME类型检查',
      severity: 'MEDIUM',
      message: passed 
        ? 'MIME类型验证通过' 
        : `MIME类型与文件扩展名不匹配: ${context.mimetype} != ${expectedMimeTypes.join('|')}`,
      details: {
        actualMimeType: context.mimetype,
        expectedMimeTypes,
        fileExtension: extension
      },
      recommendation: passed ? undefined : '文件可能被伪装，请检查文件真实格式'
    };
  }

  /**
   * 恶意软件签名检查
   */
  private async validateMalwareSignatures(context: FileUploadContext): Promise<ValidationResult> {
    const detectedThreats: Array<{ signature: string; description: string; threat: ThreatType }> = [];
    
    for (const malware of MALWARE_SIGNATURES) {
      const index = context.buffer.indexOf(malware.signature);
      if (index !== -1) {
        detectedThreats.push({
          signature: malware.signature.toString('hex'),
          description: malware.description,
          threat: malware.threat
        });
      }
    }

    const passed = detectedThreats.length === 0;
    
    return {
      isValid: passed,
      ruleId: 'malware-signature-check',
      ruleName: '恶意软件签名检查',
      severity: 'CRITICAL',
      message: passed 
        ? '恶意软件签名检查通过' 
        : `检测到 ${detectedThreats.length} 个可疑签名`,
      details: {
        detectedThreats,
        threatTypes: [...new Set(detectedThreats.map(t => t.threat))]
      },
      recommendation: passed ? undefined : '文件包含恶意代码特征，强烈建议删除'
    };
  }

  /**
   * 文件内容扫描
   */
  private async validateFileContent(context: FileUploadContext): Promise<ValidationResult> {
    const content = context.buffer.toString('utf8', 0, Math.min(context.buffer.length, 64 * 1024));
    const suspiciousPatterns = [
      { pattern: /eval\s*\(/gi, description: 'JavaScript eval函数', risk: 'HIGH' },
      { pattern: /document\.write\s*\(/gi, description: 'document.write调用', risk: 'MEDIUM' },
      { pattern: /innerHTML\s*=/gi, description: 'innerHTML赋值', risk: 'MEDIUM' },
      { pattern: /base64_decode\s*\(/gi, description: 'Base64解码函数', risk: 'MEDIUM' },
      { pattern: /shell_exec\s*\(/gi, description: 'Shell执行函数', risk: 'HIGH' },
      { pattern: /system\s*\(/gi, description: '系统命令执行', risk: 'HIGH' },
      { pattern: /\$_GET\[/gi, description: 'PHP GET参数', risk: 'MEDIUM' },
      { pattern: /\$_POST\[/gi, description: 'PHP POST参数', risk: 'MEDIUM' },
      { pattern: /cmd\.exe/gi, description: 'Windows命令行', risk: 'HIGH' },
      { pattern: /powershell/gi, description: 'PowerShell脚本', risk: 'HIGH' }
    ];

    const detectedPatterns: Array<{ pattern: string; description: string; risk: string; matches: number }> = [];
    
    for (const { pattern, description, risk } of suspiciousPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        detectedPatterns.push({
          pattern: pattern.source,
          description,
          risk,
          matches: matches.length
        });
      }
    }

    const passed = detectedPatterns.length === 0;
    
    return {
      isValid: passed,
      ruleId: 'content-scan',
      ruleName: '文件内容扫描',
      severity: detectedPatterns.some(p => p.risk === 'HIGH') ? 'HIGH' : 'MEDIUM',
      message: passed 
        ? '文件内容扫描通过' 
        : `检测到 ${detectedPatterns.length} 个可疑模式`,
      details: {
        detectedPatterns,
        contentPreview: content.substring(0, 200),
        scannedBytes: Math.min(context.buffer.length, 64 * 1024)
      },
      recommendation: passed ? undefined : '文件包含可疑代码模式，请仔细检查'
    };
  }

  /**
   * 文件名安全检查
   */
  private async validateFileName(context: FileUploadContext): Promise<ValidationResult> {
    const fileName = context.originalName;
    const suspiciousPatterns = [
      { pattern: /\.\./g, description: '路径遍历', risk: 'HIGH' },
      { pattern: /[<>:"|?*]/g, description: '非法字符', risk: 'MEDIUM' },
      { pattern: /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, description: 'Windows保留名', risk: 'MEDIUM' },
      { pattern: /\x00/g, description: '空字节', risk: 'HIGH' },
      { pattern: /^\./g, description: '隐藏文件', risk: 'LOW' }
    ];

    const issues: Array<{ pattern: string; description: string; risk: string }> = [];
    
    for (const { pattern, description, risk } of suspiciousPatterns) {
      if (pattern.test(fileName)) {
        issues.push({ pattern: pattern.source, description, risk });
      }
    }

    const passed = issues.length === 0;
    
    return {
      isValid: passed,
      ruleId: 'filename-security-check',
      ruleName: '文件名安全检查',
      severity: issues.some(i => i.risk === 'HIGH') ? 'HIGH' : 'MEDIUM',
      message: passed 
        ? '文件名安全检查通过' 
        : `文件名包含 ${issues.length} 个安全问题`,
      details: {
        fileName,
        issues
      },
      recommendation: passed ? undefined : '请使用安全的文件名，避免特殊字符和路径遍历'
    };
  }

  /**
   * 隔离可疑文件
   */
  private async quarantineFile(context: FileUploadContext, threats: ValidationResult[]): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileHash = createHash('sha256').update(context.buffer).digest('hex').substring(0, 16);
      const quarantinePath = path.join(this.quarantineDir, `${timestamp}_${fileHash}_${context.originalName}`);
      
      // 创建隔离目录
      await import('fs/promises').then(fs => fs.mkdir(this.quarantineDir, { recursive: true }));
      
      // 写入隔离文件
      await import('fs/promises').then(fs => fs.writeFile(quarantinePath, context.buffer));
      
      // 创建威胁报告
      const reportPath = `${quarantinePath}.report.json`;
      const report = {
        originalName: context.originalName,
        quarantineTime: new Date().toISOString(),
        fileSize: context.size,
        mimetype: context.mimetype,
        userId: context.userId,
        threats,
        fileHash
      };
      
      await import('fs/promises').then(fs => fs.writeFile(reportPath, JSON.stringify(report, null, 2)));
      
      logger.warn(`文件已隔离: ${context.originalName}`, {
        quarantinePath,
        threatCount: threats.length,
        fileHash
      });
      
    } catch (error) {
      logger.error(`文件隔离失败: ${context.originalName}`, {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 获取严重性扣分
   */
  private getSeverityPenalty(severity: string): number {
    switch (severity) {
      case 'CRITICAL': return 50;
      case 'HIGH': return 30;
      case 'MEDIUM': return 15;
      case 'LOW': return 5;
      default: return 10;
    }
  }

  /**
   * 获取扫描统计信息
   */
  getStatistics(): Record<string, unknown> {
    return {
      ...this.scanStatistics,
      ruleExecutions: Object.fromEntries(this.scanStatistics.ruleExecutions),
      activeRules: Array.from(this.rules.values()).filter(r => r.enabled).length,
      totalRules: this.rules.size
    };
  }

  /**
   * 重置统计信息
   */
  resetStatistics(): void {
    this.scanStatistics = {
      totalScanned: 0,
      threatsDetected: 0,
      lastScanTime: Date.now(),
      ruleExecutions: new Map()
    };
    logger.info('文件扫描统计信息已重置');
  }
}

// 导出默认实例
export const fileUploadValidator = new FileUploadValidator();

// 导出相关类型
export type { FileUploadContext, ValidationResult, FileValidationRule };
export { ThreatType };