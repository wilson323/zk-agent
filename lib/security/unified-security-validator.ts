/**
 * @file 统一安全验证中间件
 * @description 合并文件上传、数据验证、内容安全策略的通用验证系统
 * @author ZK-Agent Security Team
 * @date 2025-01-01
 * @version 2.0.0
 * @warning 仅用于安全分析，不暴露系统敏感操作
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import path from 'path';
import { getLogger } from '@/lib/utils/logger';
import { AppError } from '@/lib/utils/error-handler';
import { SecurityConfig } from '@/lib/security/security-config';

const logger = getLogger();

/**
 * 统一验证类型定义
 */
export interface SecurityValidationContext {
  buffer?: Buffer;
  originalName?: string;
  mimetype?: string;
  size?: number;
  userId?: string;
  uploadPath?: string;
  metadata?: Record<string, unknown>;
  request?: NextRequest;
}

export interface SecurityRule {
  id: string;
  name: string;
  description: string;
  category: 'FILE' | 'DATA' | 'CONTENT' | 'ACCESS';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  validator: (context: SecurityValidationContext) => Promise<SecurityResult>;
  enabled: boolean;
  metadata?: Record<string, unknown>;
}

export interface SecurityResult {
  isValid: boolean;
  ruleId: string;
  ruleName: string;
  category: SecurityRule['category'];
  severity: SecurityRule['severity'];
  message: string;
  recommendation?: string;
  details?: Record<string, unknown>;
  impact?: 'BLOCK' | 'WARN' | 'LOG';
}

export interface SecurityValidationReport {
  isValid: boolean;
  totalScore: number;
  vulnerabilities: SecurityResult[];
  recommendations: string[];
  metadata: {
    scanTime: number;
    rulesCount: number;
    fileCount: number;
  };
}

/**
 * 威胁类型枚举
 */
export enum ThreatType {
  MALWARE = 'MALWARE',
  SCRIPT_INJECTION = 'SCRIPT_INJECTION',
  PATH_TRAVERSAL = 'PATH_TRAVERSAL',
  MIME_MISMATCH = 'MIME_MISMATCH',
  SIZE_VIOLATION = 'SIZE_VIOLATION',
  FORBIDDEN_EXTENSION = 'FORBIDDEN_EXTENSION',
  SQL_INJECTION = 'SQL_INJECTION',
  XSS = 'XSS',
  RCE = 'RCE',
  ACCESS_VIOLATION = 'ACCESS_VIOLATION',
}

/**
 * 统一安全配置
 */
export interface UnifiedSecurityConfig {
  file: {
    maxSize: number;
    allowedExtensions: string[];
    allowedMimeTypes: string[];
    quarantineDir: string;
    scanEnabled: boolean;
  };
  data: {
    maxLength: number;
    validationEnabled: boolean;
    sanitizationEnabled: boolean;
  };
  access: {
    rateLimitEnabled: boolean;
    rateLimitWindow: number;
    rateLimitRequests: number;
    ipWhitelist: string[];
    ipBlacklist: string[];
  };
}

/**
 * 统一安全验证器
 */
export class UnifiedSecurityValidator {
  private rules = new Map<string, SecurityRule>();
  private config: UnifiedSecurityConfig;
  private statistics = {
    totalScans: 0,
    totalValid: 0,
    totalInvalid: 0,
    threatCounts: new Map<ThreatType, number>(),
    ruleExecutions: new Map<string, number>(),
    lastScanTime: Date.now(),
  };

  constructor(config?: Partial<UnifiedSecurityConfig>) {
    this.config = {
      file: {
        maxSize: 50 * 1024 * 1024, // 50MB
        allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.txt'],
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'],
        quarantineDir: './quarantine',
        scanEnabled: true,
        ...config?.file,
      },
      data: {
        maxLength: 1024 * 1024, // 1MB
        validationEnabled: true,
        sanitizationEnabled: true,
        ...config?.data,
      },
      access: {
        rateLimitEnabled: true,
        rateLimitWindow: 60 * 1000, // 1分钟
        rateLimitRequests: 100,
        ipWhitelist: [],
        ipBlacklist: [],
        ...config?.access,
      },
    };
    this.initializeRules();
  }

  /**
   * 初始化统一验证规则
   */
  private initializeRules(): void {
    // 文件上传规则组
    this.addRule({
      id: 'file-size-validation',
      name: '文件大小验证',
      description: '验证文件不超过最大大小限制',
      category: 'FILE',
      severity: 'HIGH',
      enabled: true,
      validator: async (context: SecurityValidationContext) => {
        if (!context.size || !context.buffer) {
          return {
            isValid: true,
            ruleId: 'file-size-validation',
            ruleName: '文件大小验证',
            category: 'FILE',
            severity: 'HIGH',
            message: '跳过文件大小验证（无文件数据）',
            recommendation: undefined,
          };
        }

        const isValid = context.size <= this.config.file.maxSize;
        return {
          isValid,
          ruleId: 'file-size-validation',
          ruleName: '文件大小验证',
          category: 'FILE',
          severity: isValid ? 'LOW' : 'HIGH',
          message: isValid
            ? `文件大小验证通过 (${this.formatBytes(context.size)})`
            : `文件大小超出限制 (${this.formatBytes(context.size)} > ${this.formatBytes(this.config.file.maxSize)})`,
          recommendation: isValid ? undefined : '请压缩文件或减少文件大小',
          impact: isValid ? 'LOG' : 'BLOCK',
        };
      },
    });

    this.addRule({
      id: 'file-extension-validation',
      name: '文件扩展名验证',
      description: '验证文件扩展名在允许列表中',
      category: 'FILE',
      severity: 'HIGH',
      enabled: true,
      validator: async (context: SecurityValidationContext) => {
        if (!context.originalName) {
          return {
            isValid: true,
            ruleId: 'file-extension-validation',
            ruleName: '文件扩展名验证',
            category: 'FILE',
            severity: 'HIGH',
            message: '跳过扩展名验证（无文件名）',
            recommendation: undefined,
          };
        }

        const extension = path.extname(context.originalName).toLowerCase();
        const isValid = this.config.file.allowedExtensions.includes(extension);
        
        return {
          isValid,
          ruleId: 'file-extension-validation',
          ruleName: '文件扩展名验证',
          category: 'FILE',
          severity: isValid ? 'LOW' : 'HIGH',
          message: isValid
            ? `扩展名验证通过: ${extension}`
            : `不支持的文件扩展名: ${extension}`,
          recommendation: isValid ? undefined : `支持的扩展名: ${this.config.file.allowedExtensions.join(', ')}`,
          impact: isValid ? 'LOG' : 'BLOCK',
        };
      },
    });

    this.addRule({
      id: 'malware-signature-scan',
      name: '恶意软件签名扫描',
      description: '扫描文件中的已知恶意软件签名',
      category: 'FILE',
      severity: 'CRITICAL',
      enabled: true,
      validator: async (context: SecurityValidationContext) => {
        if (!context.buffer) {
          return {
            isValid: true,
            ruleId: 'malware-signature-scan',
            ruleName: '恶意软件签名扫描',
            category: 'FILE',
            severity: 'CRITICAL',
            message: '跳过恶意软件扫描（无文件数据）',
            recommendation: undefined,
          };
        }

        const signatures = [
          Buffer.from('4D5A', 'hex'), // PE可执行文件
          Buffer.from('7F454C46', 'hex'), // ELF可执行文件
          Buffer.from('<script', 'utf8'), // JavaScript脚本
          Buffer.from('<?php', 'utf8'), // PHP脚本
          Buffer.from('eval(', 'utf8'), // JavaScript eval
          Buffer.from('shell_exec', 'utf8'), // Shell执行
        ];

        const foundSignatures = signatures.filter(sig => 
          context.buffer!.indexOf(sig) !== -1
        );

        const isValid = foundSignatures.length === 0;
        
        return {
          isValid,
          ruleId: 'malware-signature-scan',
          ruleName: '恶意软件签名扫描',
          category: 'FILE',
          severity: isValid ? 'LOW' : 'CRITICAL',
          message: isValid
            ? '恶意软件签名扫描通过'
            : `检测到 ${foundSignatures.length} 个恶意软件签名`,
          recommendation: isValid ? undefined : '文件包含可疑代码，建议不处理此文件',
          impact: isValid ? 'LOG' : 'BLOCK',
        };
      },
    });

    logger.info(`已初始化 ${this.rules.size} 个安全验证规则`);
  }

  /**
   * 添加自定义规则
   */
  addRule(rule: SecurityRule): void {
    this.rules.set(rule.id, rule);
    logger.info(`添加安全验证规则: ${rule.name} (${rule.id})`);
  }

  /**
   * 执行统一安全验证
   */
  async validate(context: SecurityValidationContext): Promise<SecurityValidationReport> {
    const startTime = Date.now();
    let vulnerabilities: SecurityResult[] = [];
    let totalScore = 100;

    try {
      logger.info(`开始安全验证: ${context.originalName || 'DATA'}`);

      // 执行所有启用的规则
      const enabledRules = Array.from(this.rules.values()).filter(rule => rule.enabled);
      
      for (const rule of enabledRules) {
        try {
          const result = await rule.validator(context);
          
          // 更新统计信息
          const execCount = this.statistics.ruleExecutions.get(rule.id) || 0;
          this.statistics.ruleExecutions.set(rule.id, execCount + 1);

          if (!result.isValid) {
            vulnerabilities.push(result);
            totalScore -= this.getSeverityPenalty(result.severity);
          }
        } catch (error) {
          logger.error(`规则执行失败: ${rule.name}`, { error });
          vulnerabilities.push({
            isValid: false,
            ruleId: rule.id,
            ruleName: rule.name,
            category: rule.category,
            severity: 'MEDIUM',
            message: `验证规则执行失败: ${rule.name}`,
            impact: 'LOG',
          });
        }
      }

      // 生成汇总报告
      const report: SecurityValidationReport = {
        isValid: totalScore >= 80, // 80分以上视为通过
        totalScore: Math.max(0, totalScore),
        vulnerabilities,
        recommendations: this.generateRecommendations(vulnerabilities),
        metadata: {
          scanTime: Date.now() - startTime,
          rulesCount: enabledRules.length,
          fileCount: context.originalName ? 1 : 0,
        },
      };

      this.updateStatistics(vulnerabilities);

      logger.info(`安全验证完成`, {
        isValid: report.isValid,
        score: report.totalScore,
        vulnerabilities: vulnerabilities.length,
      });

      return report;
    } catch (error) {
      logger.error('安全验证系统错误', { error });
      throw new AppError('安全验证失败', {
        originalError: error,
      });
    }
  }

  /**
   * 生成集成化的Next.js中间件
   */
  middleware() {
    return async (request: NextRequest) => {
      const startTime = Date.now();
      
      try {
        // URL和查询参数安全验证
        const url = new URL(request.url);
        const queryContext: SecurityValidationContext = {
          request,
          metadata: {
            url: url.toString(),
            pathname: url.pathname,
            search: url.search,
            userAgent: request.headers.get('user-agent') || '',
            ip: request.headers.get('x-forwarded-for') || request.headers.get('host') || '',
          },
        };

        // 对上传文件进行验证（如果是文件上传请求）
        if (request.method === 'POST' && request.headers.get('content-type')?.includes('multipart/form-data')) {
          const formData = await request.formData();
          const files = formData.getAll('files') as File[];
          
          for (const file of files) {
            if (file instanceof File) {
              const buffer = Buffer.from(await file.arrayBuffer());
              const fileContext: SecurityValidationContext = {
                buffer,
                originalName: file.name,
                mimetype: file.type,
                size: file.size,
                request,
              };

              const report = await this.validate(fileContext);
              if (!report.isValid) {
                return NextResponse.json({
                  success: false,
                  error: '安全验证失败',
                  score: report.totalScore,
                  violations: report.vulnerabilities,
                }, { status: 400 });
              }
            }
          }
        }

        // 性能和安全日志
        logger.debug('安全中间件处理完成', {
          duration: Date.now() - startTime,
          url: request.url,
        });

        return NextResponse.next();
      } catch (error) {
        logger.error('安全中间件处理失败', { error, url: request.url });
        return NextResponse.json({
          success: false,
          error: '安全验证错误',
        }, { status: 500 });
      }
    };
  }

  /**
   * 获取严重性扣分
   */
  private getSeverityPenalty(severity: string): number {
    const penalties = { CRITICAL: 50, HIGH: 30, MEDIUM: 15, LOW: 5 };
    return penalties[severity as keyof typeof penalties] || 10;
  }

  /**
   * 生成改进建议
   */
  private generateRecommendations(vulnerabilities: SecurityResult[]): string[] {
    const recommendations = new Set<string>();
    
    vulnerabilities.forEach(vuln => {
      if (vuln.recommendation) {
        recommendations.add(vuln.recommendation);
      }
    });

    if (vulnerabilities.some(v => v.category === 'FILE')) {
      recommendations.add('请上传受支持的文件格式');
    }

    return Array.from(recommendations);
  }

  /**
   * 更新统计信息
   */
  private updateStatistics(vulnerabilities: SecurityResult[]): void {
    this.statistics.totalScans++;
    
    if (vulnerabilities.length === 0) {
      this.statistics.totalValid++;
    } else {
      this.statistics.totalInvalid++;
    }

    vulnerabilities.forEach(vulnerability => {
      if (vulnerability.severity === 'CRITICAL') {
        const current = this.statistics.threatCounts.get(ThreatType.MALWARE) || 0;
        this.statistics.threatCounts.set(ThreatType.MALWARE, current + 1);
      }
    });

    this.statistics.lastScanTime = Date.now();
  }

  /**
   * 获取统计数据
   */
  getStatistics() {
    return {
      ...this.statistics,
      threatCounts: Object.fromEntries(this.statistics.threatCounts),
      ruleExecutions: Object.fromEntries(this.statistics.ruleExecutions),
      threatRate: this.statistics.totalInvalid / Math.max(1, this.statistics.totalScans),
    };
  }

  /**
   * 格式化字节大小
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// 导出单例实例
export const unifiedSecurityValidator = new UnifiedSecurityValidator();

// 导出类型定义
export type { SecurityValidationContext, SecurityResult, SecurityValidationReport };