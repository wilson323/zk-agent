/**
 * 智能化质量保障体系 - 主入口文件
 * 整合架构符合度评估、实时监控、可视化仪表盘等功能
 * 
 * @author ZK-Agent Team
 * @version 1.0.0
 */

import { ArchitectureComplianceEngine, ArchitectureComplianceResult } from './architecture-compliance-engine';
import { ComplianceDashboard, DashboardConfig } from './compliance-dashboard';
import { RealTimeArchitectureMonitor, MonitorConfig } from './real-time-monitor';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * 质量保障体系配置接口
 */
export interface QualityAssuranceConfig {
  /** 项目根路径 */
  projectPath: string;
  /** 架构符合度配置文件路径 */
  configPath?: string;
  /** 监控配置 */
  monitoring?: Partial<MonitorConfig>;
  /** 仪表盘配置 */
  dashboard?: Partial<DashboardConfig>;
  /** 是否启用实时监控 */
  enableRealTimeMonitoring?: boolean;
  /** 是否启用自动报告生成 */
  enableAutoReporting?: boolean;
  /** 报告生成间隔（分钟） */
  reportingInterval?: number;
}

/**
 * 质量保障体系状态接口
 */
export interface QualityAssuranceStatus {
  /** 是否已初始化 */
  initialized: boolean;
  /** 是否正在监控 */
  monitoring: boolean;
  /** 最后评估时间 */
  lastEvaluationTime?: Date;
  /** 最后评估结果 */
  lastResult?: ArchitectureComplianceResult;
  /** 总评估次数 */
  totalEvaluations: number;
  /** 平均评估时间（毫秒） */
  averageEvaluationTime: number;
}

/**
 * 智能化质量保障体系主类
 */
export class QualityAssuranceSystem {
  private config: QualityAssuranceConfig;
  private engine: ArchitectureComplianceEngine;
  private dashboard: ComplianceDashboard;
  private monitor?: RealTimeArchitectureMonitor;
  private reportingTimer?: NodeJS.Timeout;
  private status: QualityAssuranceStatus = {
    initialized: false,
    monitoring: false,
    totalEvaluations: 0,
    averageEvaluationTime: 0
  };

  /**
   * 构造函数
   * @param config 质量保障体系配置
   */
  constructor(config: QualityAssuranceConfig) {
    this.config = {
      enableRealTimeMonitoring: true,
      enableAutoReporting: true,
      reportingInterval: 60, // 默认60分钟
      ...config
    };

    this.engine = new ArchitectureComplianceEngine();
    this.dashboard = new ComplianceDashboard(this.config.dashboard);

    if (this.config.enableRealTimeMonitoring) {
      this.monitor = new RealTimeArchitectureMonitor(this.config.monitoring);
      this.setupMonitorEventHandlers();
    }
  }

  /**
   * 初始化质量保障体系
   */
  public async initialize(): Promise<void> {
    console.log('🚀 初始化智能化质量保障体系...');
    
    try {
      // 验证项目路径
      await this.validateProjectPath();
      
      // 初始化架构符合度引擎
      await this.engine.initialize(this.config.projectPath, this.config.configPath);
      
      // 启动实时监控（如果启用）
      if (this.monitor) {
        await this.monitor.startMonitoring(this.config.projectPath);
        this.status.monitoring = true;
      }
      
      // 启动自动报告生成（如果启用）
      if (this.config.enableAutoReporting) {
        this.startAutoReporting();
      }
      
      this.status.initialized = true;
      console.log('✅ 质量保障体系初始化完成');
      
    } catch (error) {
      console.error('❌ 质量保障体系初始化失败:', error);
      throw error;
    }
  }

  /**
   * 验证项目路径
   */
  private async validateProjectPath(): Promise<void> {
    try {
      const stats = await fs.stat(this.config.projectPath);
      if (!stats.isDirectory()) {
        throw new Error(`项目路径不是有效目录: ${this.config.projectPath}`);
      }
    } catch (error) {
      throw new Error(`项目路径无效: ${this.config.projectPath}`);
    }
  }

  /**
   * 设置监控事件处理器
   */
  private setupMonitorEventHandlers(): void {
    if (!this.monitor) return;

    this.monitor.on('evaluation_completed', (event) => {
      this.status.lastEvaluationTime = event.timestamp;
      this.status.lastResult = event.result;
      this.status.totalEvaluations++;
      
      if (event.details?.evaluationTime) {
        this.updateAverageEvaluationTime(event.details.evaluationTime);
      }
    });

    this.monitor.on('violation_detected', (event) => {
      console.warn(`🚨 架构违规检测: ${event.details?.violation?.description}`);
      // 可以在这里添加通知逻辑
    });

    this.monitor.on('threshold_adjusted', (event) => {
      console.log(`🎯 自适应阈值调整: ${event.details?.reason}`);
    });
  }

  /**
   * 更新平均评估时间
   * @param newTime 新的评估时间
   */
  private updateAverageEvaluationTime(newTime: number): void {
    const totalTime = this.status.averageEvaluationTime * (this.status.totalEvaluations - 1) + newTime;
    this.status.averageEvaluationTime = totalTime / this.status.totalEvaluations;
  }

  /**
   * 启动自动报告生成
   */
  private startAutoReporting(): void {
    const intervalMs = this.config.reportingInterval! * 60 * 1000; // 转换为毫秒
    
    this.reportingTimer = setInterval(async () => {
      try {
        console.log('📊 开始自动生成质量报告...');
        await this.generateComprehensiveReport();
        console.log('✅ 自动报告生成完成');
      } catch (error) {
        console.error('❌ 自动报告生成失败:', error);
      }
    }, intervalMs);
    
    console.log(`⏰ 自动报告生成已启动，间隔: ${this.config.reportingInterval}分钟`);
  }

  /**
   * 执行架构符合度评估
   * @returns 评估结果
   */
  public async evaluateArchitectureCompliance(): Promise<ArchitectureComplianceResult> {
    console.log('🔍 开始架构符合度评估...');
    
    if (!this.status.initialized) {
      throw new Error('质量保障体系尚未初始化，请先调用 initialize() 方法');
    }
    
    const startTime = Date.now();
    
    try {
      const result = await this.engine.evaluate();
      const evaluationTime = Date.now() - startTime;
      
      // 更新状态
      this.status.lastEvaluationTime = new Date();
      this.status.lastResult = result;
      this.status.totalEvaluations++;
      this.updateAverageEvaluationTime(evaluationTime);
      
      console.log(`✅ 架构符合度评估完成，总体评分: ${result.overallScore}/100 (耗时: ${evaluationTime}ms)`);
      
      return result;
    } catch (error) {
      console.error('❌ 架构符合度评估失败:', error);
      throw error;
    }
  }

  /**
   * 生成综合质量报告
   * @param format 报告格式
   * @returns 报告文件路径
   */
  public async generateComprehensiveReport(
    format: 'html' | 'json' | 'markdown' | 'console' = 'html'
  ): Promise<string> {
    console.log(`📊 生成${format.toUpperCase()}格式的综合质量报告...`);
    
    let result: ArchitectureComplianceResult;
    
    // 如果有最新结果则使用，否则执行新的评估
    if (this.status.lastResult && this.isResultRecent()) {
      result = this.status.lastResult;
    } else {
      result = await this.evaluateArchitectureCompliance();
    }
    
    // 配置仪表盘输出格式
    const dashboardConfig = {
      ...this.config.dashboard,
      outputFormat: format
    };
    
    const dashboard = new ComplianceDashboard(dashboardConfig);
    const reportPath = await dashboard.generateDashboard(result);
    
    console.log(`✅ 综合质量报告已生成: ${reportPath}`);
    return reportPath;
  }

  /**
   * 检查结果是否为最近的
   * @returns 是否为最近的结果
   */
  private isResultRecent(): boolean {
    if (!this.status.lastEvaluationTime) return false;
    
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.status.lastEvaluationTime > fiveMinutesAgo;
  }

  /**
   * 获取质量指标仪表盘数据
   * @returns 仪表盘数据
   */
  public async getQualityMetrics(): Promise<{
    codeQuality: number;
    testCoverage: number;
    architectureHealth: number;
    performanceRegression: number;
    securityVulnerabilities: number;
    overallScore: number;
  }> {
    const result = this.status.lastResult || await this.evaluateArchitectureCompliance();
    
    return {
      codeQuality: result.overallScore,
      testCoverage: 85, // 这里应该从实际的测试覆盖率工具获取
      architectureHealth: (result.layeredArchitectureCompliance + result.domainModelPurity + result.serviceBoundaryClarity) / 3,
      performanceRegression: 95, // 这里应该从性能监控工具获取
      securityVulnerabilities: result.highRiskViolations.filter(v => v.violationType.includes('security')).length === 0 ? 100 : 0,
      overallScore: result.overallScore
    };
  }

  /**
   * 获取架构健康度趋势
   * @param days 天数
   * @returns 趋势数据
   */
  public async getArchitectureHealthTrend(days: number = 7): Promise<{
    date: string;
    score: number;
    violations: number;
  }[]> {
    // 这里应该从历史数据中获取趋势
    // 目前返回模拟数据作为示例
    const trend = [];
    const currentScore = this.status.lastResult?.overallScore || 85;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      trend.push({
        date: date.toISOString().split('T')[0],
        score: currentScore + Math.random() * 10 - 5, // 模拟波动
        violations: Math.floor(Math.random() * 5)
      });
    }
    
    return trend;
  }

  /**
   * 获取技术债务分析
   * @returns 技术债务分析结果
   */
  public async getTechnicalDebtAnalysis(): Promise<{
    totalDebtScore: number;
    debtItems: Array<{
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
      estimatedEffort: string;
    }>;
    refactoringPriority: Array<{
      module: string;
      priority: number;
      reason: string;
    }>;
  }> {
    const result = this.status.lastResult || await this.evaluateArchitectureCompliance();
    
    return result.detailedAnalysis.technicalDebt;
  }

  /**
   * 执行代码质量扫描
   * @returns 扫描结果
   */
  public async performCodeQualityScan(): Promise<{
    issues: Array<{
      file: string;
      line: number;
      type: string;
      severity: string;
      message: string;
      rule: string;
    }>;
    summary: {
      totalIssues: number;
      errorCount: number;
      warningCount: number;
      infoCount: number;
    };
  }> {
    console.log('🔍 执行代码质量扫描...');
    
    // 这里应该集成ESLint、Prettier等工具
    // 目前返回基于架构评估的结果
    const result = this.status.lastResult || await this.evaluateArchitectureCompliance();
    
    const issues = result.highRiskViolations.map(violation => ({
      file: violation.filePath,
      line: violation.lineNumber,
      type: violation.violationType,
      severity: violation.severity,
      message: violation.description,
      rule: violation.violationType
    }));
    
    const summary = {
      totalIssues: issues.length,
      errorCount: issues.filter(i => i.severity === 'error').length,
      warningCount: issues.filter(i => i.severity === 'warning').length,
      infoCount: issues.filter(i => i.severity === 'info').length
    };
    
    console.log(`✅ 代码质量扫描完成，发现 ${summary.totalIssues} 个问题`);
    
    return { issues, summary };
  }

  /**
   * 获取系统状态
   * @returns 系统状态
   */
  public getSystemStatus(): QualityAssuranceStatus {
    return { ...this.status };
  }

  /**
   * 更新配置
   * @param newConfig 新配置
   */
  public updateConfig(newConfig: Partial<QualityAssuranceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // 更新监控配置
    if (this.monitor && newConfig.monitoring) {
      this.monitor.updateConfig(newConfig.monitoring);
    }
    
    console.log('⚙️ 质量保障体系配置已更新');
  }

  /**
   * 停止质量保障体系
   */
  public async shutdown(): Promise<void> {
    console.log('🛑 停止质量保障体系...');
    
    // 停止自动报告生成
    if (this.reportingTimer) {
      clearInterval(this.reportingTimer);
      this.reportingTimer = undefined;
    }
    
    // 停止实时监控
    if (this.monitor) {
      await this.monitor.stopMonitoring();
      this.status.monitoring = false;
    }
    
    this.status.initialized = false;
    console.log('✅ 质量保障体系已停止');
  }

  /**
   * 导出系统数据
   * @param outputPath 输出路径
   */
  public async exportSystemData(outputPath: string): Promise<void> {
    const data = {
      config: this.config,
      status: this.status,
      lastResult: this.status.lastResult,
      exportTime: new Date().toISOString()
    };
    
    await fs.writeFile(outputPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`📤 系统数据已导出: ${outputPath}`);
  }
}

/**
 * 创建质量保障体系实例的工厂函数
 * @param config 配置
 * @returns 质量保障体系实例
 */
export function createQualityAssuranceSystem(config: QualityAssuranceConfig): QualityAssuranceSystem {
  return new QualityAssuranceSystem(config);
}

/**
 * 快速启动质量保障体系
 * @param projectPath 项目路径
 * @param options 可选配置
 * @returns 质量保障体系实例
 */
export async function quickStart(
  projectPath: string,
  options: Partial<QualityAssuranceConfig> = {}
): Promise<QualityAssuranceSystem> {
  const system = createQualityAssuranceSystem({
    projectPath,
    ...options
  });
  
  await system.initialize();
  return system;
}

// 导出所有相关类型和类
export {
  ArchitectureComplianceEngine,
  ArchitectureComplianceResult,
  ComplianceDashboard,
  DashboardConfig,
  RealTimeArchitectureMonitor,
  MonitorConfig
};

/**
 * 默认导出
 */
export default QualityAssuranceSystem;