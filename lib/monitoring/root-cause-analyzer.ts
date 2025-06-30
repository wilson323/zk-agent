import { ErrorSeverity, ResourceType, AgentErrorType } from '@/lib/types/enums';
import { enhancedDb } from '@/lib/database';
import { LogLevel } from '@prisma/client';
import { ErrorReport } from '../errors/agent-errors';
import { ErrorAnalysis } from './error-tracker';
import { groupBy } from '@/lib/utils';

/**
 * 根因分析结果
 */
export interface RootCauseAnalysis {
  id: string;
  errorId: string;
  rootCause: string;
  confidence: number; // 0-1之间的置信度
  contributingFactors: string[];
  timeline: TimelineEvent[];
  impactAssessment: ImpactAssessment;
  recommendations: Recommendation[];
  relatedErrors: string[];
  analysisTimestamp: Date;
}

/**
 * 时间线事件
 */
export interface TimelineEvent {
  timestamp: Date;
  event: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  source: string;
  details?: Record<string, any>;
}

/**
 * 影响评估
 */
export interface ImpactAssessment {
  affectedUsers: number;
  affectedSystems: string[];
  businessImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  technicalImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedDowntime?: number; // 分钟
  financialImpact?: number; // 估算损失
}

/**
 * 建议
 */
export interface Recommendation {
  type: 'IMMEDIATE' | 'SHORT_TERM' | 'LONG_TERM';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  action: string;
  description: string;
  estimatedEffort: string;
  expectedOutcome: string;
}

/**
 * 错误模式
 */
export interface ErrorPattern {
  pattern: string;
  frequency: number;
  timeRange: { start: Date; end: Date };
  commonContext: Record<string, any>;
  severity: ErrorSeverity;
}

/**
 * 根因分析引擎
 */
export class RootCauseAnalyzer {
  private analysisCache: Map<string, RootCauseAnalysis> = new Map();

  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly maxCacheSize = 1000;
  private readonly maxCacheAge = 24 * 60 * 60 * 1000; // 24小时

  constructor() {
    this.startAutoCleanup();
  }

  /**
   * 执行根因分析
   */
  async analyzeRootCause(errorReport: ErrorReport): Promise<RootCauseAnalysis> {
    // 输入验证
    if (!errorReport || !errorReport.id) {
      throw new Error('Invalid error report: missing required fields');
    }
    
    if (!errorReport.error) {
      throw new Error('Invalid error report: missing error details');
    }
    
    const startTime = Date.now();
    const analysisId = this.generateAnalysisId(errorReport.id);
    const cacheKey = this.generateCacheKey(errorReport);
    
    console.log(`Starting root cause analysis for error ${errorReport.id}`);
    
    // 检查缓存（使用更智能的缓存键）
    const cached = this.analysisCache.get(cacheKey);
    if (cached) {
      console.log(`Cache hit for error ${errorReport.id}, analysis time: ${Date.now() - startTime}ms`);
      return cached;
    }

    // 并行收集相关数据
    const [relatedErrors, patterns] = await Promise.all([
      this.findRelatedErrors(errorReport).catch(err => {
        console.warn('Failed to find related errors:', err);
        return [];
      }),
      this.identifyPatterns(errorReport, []).catch(err => {
        console.warn('Failed to identify patterns:', err);
        return [];
      })
    ]);
    
    const timeline = await this.buildTimeline(errorReport, relatedErrors).catch(err => {
      console.warn('Failed to build timeline:', err);
      return [{
        timestamp: errorReport.timestamp,
        event: `Primary Error: ${errorReport.error?.message}`,
        severity: this.mapSeverity(errorReport.error?.severity),
        source: errorReport.agentType,
        details: errorReport.context
      }];
    });
    
    // 重新识别模式（现在有了相关错误数据）
    const updatedPatterns = await this.identifyPatterns(errorReport, relatedErrors).catch(err => {
      console.warn('Failed to update patterns:', err);
      return patterns;
    });
    
    // 分析根因
    const rootCause = this.determineRootCause(errorReport, updatedPatterns, timeline);
    const contributingFactors = this.identifyContributingFactors(errorReport, relatedErrors);
    
    // 评估影响
    const impactAssessment = await this.assessImpact(errorReport, relatedErrors);
    
    // 生成建议
    const recommendations = this.generateRecommendations(rootCause, errorReport, impactAssessment);
    
    const analysis: RootCauseAnalysis = {
      id: analysisId,
      errorId: errorReport.id,
      rootCause: rootCause.cause,
      confidence: rootCause.confidence,
      contributingFactors,
      timeline,
      impactAssessment,
      recommendations,
      relatedErrors: relatedErrors.map(e => e.id),
      analysisTimestamp: new Date()
    };

    // 缓存结果（使用智能缓存键）
    this.analysisCache.set(cacheKey, analysis);
    // 同时使用分析ID作为备用键
    this.analysisCache.set(analysisId, analysis);
    
    const analysisTime = Date.now() - startTime;
    console.log(`Root cause analysis completed for error ${errorReport.id}:`, {
      analysisTime: `${analysisTime}ms`,
      rootCause: analysis.rootCause,
      confidence: analysis.confidence,
      relatedErrorsCount: relatedErrors.length,
      patternsFound: updatedPatterns.length,
      cacheSize: this.analysisCache.size
    });
    
    return analysis;
  }

  /**
   * 查找相关错误
   */
  private async findRelatedErrors(errorReport: ErrorReport): Promise<ErrorReport[]> {
    try {
      const prisma = enhancedDb.prisma;
      const timeWindow = 30 * 60 * 1000; // 30分钟窗口
      const startTime = new Date(errorReport.timestamp.getTime() - timeWindow);
      const endTime = new Date(errorReport.timestamp.getTime() + timeWindow);

      // 查找时间窗口内的相关错误
      const relatedLogs = await prisma.errorLog.findMany({
        where: {
          createdAt: {
            gte: startTime,
            lte: endTime
          },
          OR: [
            // 相同智能体类型
            { metadata: { path: ['agentType'], equals: errorReport.agentType } },
            // 相同用户
            { metadata: { path: ['context', 'userId'], equals: errorReport.context?.userId } },
            // 相同会话
            { metadata: { path: ['context', 'sessionId'], equals: errorReport.context?.sessionId } },
            // 相似错误消息
            { message: { contains: this.extractKeywords(errorReport.error?.message || '')[0] } }
          ]
        },
        orderBy: { createdAt: 'asc' }
      });

      // 转换为ErrorReport格式
      return relatedLogs.map((log: any) => ({
        id: log.id,
        timestamp: log.createdAt,
        agentType: log.metadata?.agentType || 'unknown',
        errorType: log.metadata?.errorType || AgentErrorType.SERVICE_UNAVAILABLE,
        severity: log.metadata?.severity || ErrorSeverity.MEDIUM,
        message: log.message || 'Unknown error',
        stack: log.metadata?.stack,
        context: log.metadata?.context || {},
        userAgent: log.metadata?.userAgent,
        sessionId: log.metadata?.sessionId,
        resolved: log.resolved || false
      }));
    } catch (error) {
      console.error('Failed to find related errors:', error);
      return [];
    }
  }

  /**
   * 构建时间线
   */
  private async buildTimeline(errorReport: ErrorReport, relatedErrors: ErrorReport[]): Promise<TimelineEvent[]> {
    const events: TimelineEvent[] = [];

    // 添加主错误事件
    events.push({
      timestamp: errorReport.timestamp,
      event: `Primary Error: ${errorReport.error?.message}`,
      severity: this.mapSeverity(errorReport.error?.severity),
      source: errorReport.agentType,
      details: errorReport.context
    });

    // 添加相关错误事件
    relatedErrors.forEach(error => {
      events.push({
        timestamp: error.timestamp,
        event: `Related Error: ${error.error?.message}`,
        severity: this.mapSeverity(error.error?.severity),
        source: error.agentType,
        details: error.context
      });
    });

    // 按时间排序
    return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * 识别错误模式
   */
  private async identifyPatterns(errorReport: ErrorReport, relatedErrors: ErrorReport[]): Promise<ErrorPattern[]> {
    const allErrors = [errorReport, ...relatedErrors];
    const patterns: ErrorPattern[] = [];

    // 按错误类型分组
    const byType = groupBy(allErrors, (e: ErrorReport) => e.error?.type || 'unknown');
    Object.entries(byType).forEach(([type, errors]: [string, ErrorReport[]]) => {
      if (errors.length > 1) {
        patterns.push({
          pattern: `Error Type: ${type}`,
          frequency: errors.length,
          timeRange: {
            start: new Date(Math.min(...errors.map((e: ErrorReport) => e.timestamp.getTime()))),
            end: new Date(Math.max(...errors.map((e: ErrorReport) => e.timestamp.getTime())))
          },
          commonContext: this.extractCommonContext(errors),
          severity: errors[0].error?.severity || ErrorSeverity.LOW
        });
      }
    });

    // 按智能体类型分组
    const byAgent = groupBy(allErrors, e => e.agentType);
    Object.entries(byAgent).forEach(([agentType, errors]: [string, ErrorReport[]]) => {
      if (errors.length > 1) {
        patterns.push({
          pattern: `Agent Type: ${agentType}`,
          frequency: errors.length,
          timeRange: {
            start: new Date(Math.min(...errors.map((e: ErrorReport) => e.timestamp.getTime()))),
            end: new Date(Math.max(...errors.map((e: ErrorReport) => e.timestamp.getTime())))
          },
          commonContext: this.extractCommonContext(errors),
          severity: errors[0].error?.severity || ErrorSeverity.LOW
        });
      }
    });

    return patterns;
  }

  /**
   * 确定根因
   */
  private determineRootCause(
    errorReport: ErrorReport, 
    patterns: ErrorPattern[], 
    timeline: TimelineEvent[]
  ): { cause: string; confidence: number } {
    const causes: Array<{ cause: string; confidence: number; evidence: string[] }> = [];

    // 基于错误类型的根因分析
    const errorType = errorReport.error?.type;
    switch (errorType) {
      case AgentErrorType.SERVICE_UNAVAILABLE:
        causes.push({
          cause: '数据库连接问题',
          confidence: 0.9,
          evidence: ['数据库连接错误', '可能的网络问题或数据库服务不可用']
        });
        break;
      case AgentErrorType.AUTHENTICATION_ERROR:
        causes.push({
          cause: '认证配置问题',
          confidence: 0.85,
          evidence: ['认证失败', '可能的令牌过期或权限配置错误']
        });
        break;
      case AgentErrorType.AUTHENTICATION_ERROR:
        causes.push({
          cause: '数据验证失败',
          confidence: 0.8,
          evidence: ['输入数据不符合预期格式', '可能的前端验证缺失']
        });
        break;
      case AgentErrorType.CAD_ANALYSIS_TIMEOUT:
        causes.push({
          cause: '系统响应超时',
          confidence: 0.75,
          evidence: ['操作超时', '可能的性能问题或资源不足']
        });
        break;
    }

    // 基于模式的根因分析
    patterns.forEach(pattern => {
      if (pattern.frequency > 5) {
        causes.push({
          cause: `系统性问题: ${pattern.pattern}`,
          confidence: Math.min(0.9, pattern.frequency / 10),
          evidence: [`高频模式: ${pattern.pattern}`, `频率: ${pattern.frequency}`]
        });
      }
    });

    // 基于时间线的根因分析
    const criticalEvents = timeline.filter(e => e.severity === 'CRITICAL' || e.severity === 'ERROR');
    if (criticalEvents.length > 1) {
      causes.push({
        cause: '级联故障',
        confidence: 0.7,
        evidence: [`检测到${criticalEvents.length}个关键事件`, '可能存在系统依赖问题']
      });
    }

    // 选择最可能的根因
    if (causes.length === 0) {
      return {
        cause: '未知原因，需要进一步调查',
        confidence: 0.1
      };
    }

    const bestCause = causes.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );

    return {
      cause: bestCause.cause,
      confidence: bestCause.confidence
    };
  }

  /**
   * 识别贡献因素
   */
  private identifyContributingFactors(errorReport: ErrorReport, relatedErrors: ErrorReport[]): string[] {
    const factors: string[] = [];

    // 检查系统负载
    if (relatedErrors.length > 10) {
      factors.push('高系统负载');
    }

    // 检查错误频率
    const timeSpan = relatedErrors.length > 0 ? 
      Math.max(...relatedErrors.map(e => e.timestamp.getTime())) - 
      Math.min(...relatedErrors.map(e => e.timestamp.getTime())) : 0;
    
    if (timeSpan > 0 && relatedErrors.length / (timeSpan / 60000) > 1) {
      factors.push('错误频率异常');
    }

    // 检查用户会话
    const uniqueUsers = new Set(relatedErrors.map(e => e.context?.userId).filter(Boolean));
    if (uniqueUsers.size > 5) {
      factors.push('多用户受影响');
    }

    // 检查智能体类型
    const uniqueAgents = new Set(relatedErrors.map(e => e.agentType));
    if (uniqueAgents.size > 3) {
      factors.push('多个智能体类型受影响');
    }

    return factors;
  }

  /**
   * 评估影响
   */
  private async assessImpact(errorReport: ErrorReport, relatedErrors: ErrorReport[]): Promise<ImpactAssessment> {
    const allErrors = [errorReport, ...relatedErrors];
    
    // 统计受影响用户
    const affectedUsers = new Set(allErrors.map(e => e.context?.userId).filter(Boolean)).size;
    
    // 统计受影响系统
    const affectedSystems = Array.from(new Set(allErrors.map(e => e.agentType)));
    
    // 评估业务影响
    let businessImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (affectedUsers > 100) {businessImpact = 'CRITICAL';}
    else if (affectedUsers > 50) {businessImpact = 'HIGH';}
    else if (affectedUsers > 10) {businessImpact = 'MEDIUM';}
    
    // 评估技术影响
    let technicalImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (affectedSystems.length > 5) {technicalImpact = 'CRITICAL';}
    else if (affectedSystems.length > 3) {technicalImpact = 'HIGH';}
    else if (affectedSystems.length > 1) {technicalImpact = 'MEDIUM';}
    
    return {
      affectedUsers,
      affectedSystems,
      businessImpact,
      technicalImpact,
      estimatedDowntime: this.estimateDowntime(allErrors),
      financialImpact: this.estimateFinancialImpact(affectedUsers, businessImpact)
    };
  }

  /**
   * 生成建议
   */
  private generateRecommendations(
    rootCause: { cause: string; confidence: number },
    errorReport: ErrorReport,
    impact: ImpactAssessment
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // 基于根因的建议
    if (rootCause.cause.includes('数据库')) {
      recommendations.push({
        type: 'IMMEDIATE',
        priority: 'HIGH',
        action: '检查数据库连接',
        description: '立即检查数据库服务状态和连接配置',
        estimatedEffort: '15分钟',
        expectedOutcome: '恢复数据库连接'
      });
      
      recommendations.push({
        type: 'SHORT_TERM',
        priority: 'MEDIUM',
        action: '优化数据库性能',
        description: '分析慢查询并优化数据库索引',
        estimatedEffort: '2-4小时',
        expectedOutcome: '提升数据库响应速度'
      });
    }

    if (rootCause.cause.includes('认证')) {
      recommendations.push({
        type: 'IMMEDIATE',
        priority: 'HIGH',
        action: '验证认证配置',
        description: '检查JWT密钥、令牌过期时间等认证配置',
        estimatedEffort: '30分钟',
        expectedOutcome: '修复认证问题'
      });
    }

    if (rootCause.cause.includes('超时')) {
      recommendations.push({
        type: 'IMMEDIATE',
        priority: 'MEDIUM',
        action: '调整超时配置',
        description: '增加请求超时时间或优化处理逻辑',
        estimatedEffort: '1小时',
        expectedOutcome: '减少超时错误'
      });
    }

    // 基于影响的建议
    if (impact.businessImpact === 'CRITICAL') {
      recommendations.push({
        type: 'IMMEDIATE',
        priority: 'CRITICAL',
        action: '启动应急响应',
        description: '立即启动应急响应流程，通知相关团队',
        estimatedEffort: '立即',
        expectedOutcome: '快速响应和恢复'
      });
    }

    // 长期建议
    recommendations.push({
      type: 'LONG_TERM',
      priority: 'MEDIUM',
      action: '改进监控和告警',
      description: '增强错误监控和预警机制',
      estimatedEffort: '1-2周',
      expectedOutcome: '提前发现和预防类似问题'
    });

    return recommendations;
  }

  /**
   * 辅助方法
   */
  private generateAnalysisId(errorId: string): string {
    return `analysis_${errorId}_${Date.now()}`;
  }

  /**
   * 生成基于错误特征的缓存键
   */
  private generateCacheKey(errorReport: ErrorReport): string {
    const errorType = errorReport.error?.type || 'unknown';
    const agentType = errorReport.agentType;
    const messageHash = this.hashString(errorReport.error?.message || '');
    const contextHash = this.hashString(JSON.stringify(errorReport.context || {}));
    
    return `cache_${errorType}_${agentType}_${messageHash}_${contextHash}`;
  }

  /**
   * 简单字符串哈希函数
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
  }

  private extractKeywords(message: string): string[] {
    return message.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 5);
  }

  private mapSeverity(severity?: ErrorSeverity): 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL' {
    switch (severity) {
      case ErrorSeverity.LOW: return 'INFO';
      case ErrorSeverity.MEDIUM: return 'WARNING';
      case ErrorSeverity.HIGH: return 'ERROR';
      case ErrorSeverity.CRITICAL: return 'CRITICAL';
      default: return 'INFO';
    }
  }

  // 使用统一的 groupBy 函数，已从 @/lib/utils 导入

  private extractCommonContext(errors: ErrorReport[]): Record<string, any> {
    const commonContext: Record<string, any> = {};
    
    if (errors.length === 0) {return commonContext;}
    
    const firstContext = errors[0].context || {};
    Object.keys(firstContext).forEach(key => {
      const values = errors.map(e => e.context?.[key]).filter(v => v !== undefined);
      if (values.length === errors.length && values.every(v => v === values[0])) {
        commonContext[key] = values[0];
      }
    });
    
    return commonContext;
  }

  private estimateDowntime(errors: ErrorReport[]): number {
    if (errors.length === 0) {return 0;}
    
    const timeSpan = Math.max(...errors.map((e: ErrorReport) => e.timestamp.getTime())) - 
                    Math.min(...errors.map((e: ErrorReport) => e.timestamp.getTime()));
    
    return Math.ceil(timeSpan / 60000); // 转换为分钟
  }

  private estimateFinancialImpact(affectedUsers: number, businessImpact: string): number {
    const baseImpactPerUser = 10; // 假设每用户每小时损失10元
    const multiplier = {
      'LOW': 0.5,
      'MEDIUM': 1,
      'HIGH': 2,
      'CRITICAL': 5
    }[businessImpact] || 1;
    
    return affectedUsers * baseImpactPerUser * multiplier;
  }

  /**
   * 获取分析结果
   */
  getAnalysis(analysisId: string): RootCauseAnalysis | undefined {
    return this.analysisCache.get(analysisId);
  }

  /**
   * 启动自动清理
   */
  private startAutoCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 5 * 60 * 1000); // 每5分钟清理一次
  }

  /**
   * 停止自动清理
   */
  stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * 执行清理操作
   */
  private performCleanup(): void {
    this.cleanupExpiredAnalyses();
    this.limitCacheSize();
  }

  /**
   * 限制缓存大小
   */
  private limitCacheSize(): void {
    if (this.analysisCache.size > this.maxCacheSize) {
      const entries = Array.from(this.analysisCache.entries())
        .sort((a, b) => a[1].analysisTimestamp.getTime() - b[1].analysisTimestamp.getTime());
      
      const removeCount = this.analysisCache.size - this.maxCacheSize;
      for (let i = 0; i < removeCount && i < entries.length; i++) {
        const entry = entries[i];
        if (entry) {
          this.analysisCache.delete(entry[0]);
        }
      }
    }
  }

  /**
   * 清理过期的分析结果
   */
  cleanupExpiredAnalyses(maxAgeMs: number = this.maxCacheAge): void {
    const cutoff = Date.now() - maxAgeMs;
    
    const entries = Array.from(this.analysisCache.entries());
    for (let i = 0; i < entries.length; i++) {
      const [id, analysis] = entries[i];
      if (analysis && analysis.analysisTimestamp.getTime() < cutoff) {
        this.analysisCache.delete(id);
      }
    }
  }

  /**
   * 获取所有分析结果
   */
  getAllAnalyses(): RootCauseAnalysis[] {
    return Array.from(this.analysisCache.values());
  }

  /**
   * 删除分析结果
   */
  deleteAnalysis(analysisId: string): boolean {
    return this.analysisCache.delete(analysisId);
  }
}

// 创建并导出根因分析器实例
export const rootCauseAnalyzer = new RootCauseAnalyzer();