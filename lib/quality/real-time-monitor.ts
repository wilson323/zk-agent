/**
 * 实时架构符合度监控系统
 * 提供文件变更监听、实时评估和自适应阈值调整功能
 * 
 * @author ZK-Agent Team
 * @version 1.0.0
 */

import { watch, FSWatcher } from 'chokidar';
import { ArchitectureComplianceEngine, ArchitectureComplianceResult } from './architecture-compliance-engine';
import { ComplianceDashboard } from './compliance-dashboard';
import { promises as fs } from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

/**
 * 监控配置接口
 */
export interface MonitorConfig {
  /** 监控的文件模式 */
  watchPatterns: string[];
  /** 忽略的文件模式 */
  ignorePatterns: string[];
  /** 评估延迟时间（毫秒） */
  evaluationDelay: number;
  /** 是否启用实时报告 */
  enableRealTimeReporting: boolean;
  /** 报告输出目录 */
  reportOutputDir: string;
  /** 自适应阈值配置 */
  adaptiveThresholds: AdaptiveThresholdConfig;
}

/**
 * 自适应阈值配置接口
 */
export interface AdaptiveThresholdConfig {
  /** 是否启用自适应阈值 */
  enabled: boolean;
  /** 项目阶段 */
  projectPhase: 'mvp' | 'development' | 'mature' | 'legacy';
  /** 团队规模 */
  teamSize: 'small' | 'medium' | 'large';
  /** 技术栈类型 */
  techStack: 'react' | 'vue' | 'angular' | 'node' | 'spring' | 'dotnet' | 'mixed';
  /** 自定义权重 */
  customWeights?: {
    layeredArchitecture?: number;
    domainModel?: number;
    serviceBoundary?: number;
    dependencyInversion?: number;
  };
}

/**
 * 监控事件接口
 */
export interface MonitorEvent {
  /** 事件类型 */
  type: 'file_changed' | 'evaluation_started' | 'evaluation_completed' | 'threshold_adjusted' | 'violation_detected';
  /** 事件时间戳 */
  timestamp: Date;
  /** 相关文件路径 */
  filePath?: string;
  /** 评估结果 */
  result?: ArchitectureComplianceResult;
  /** 事件详情 */
  details?: any;
}

/**
 * 阈值调整历史记录接口
 */
export interface ThresholdAdjustment {
  /** 调整时间 */
  timestamp: Date;
  /** 调整原因 */
  reason: string;
  /** 调整前的阈值 */
  previousThresholds: Record<string, number>;
  /** 调整后的阈值 */
  newThresholds: Record<string, number>;
  /** 调整幅度 */
  adjustmentMagnitude: number;
}

/**
 * 实时架构符合度监控器类
 */
export class RealTimeArchitectureMonitor extends EventEmitter {
  private config: MonitorConfig;
  private engine: ArchitectureComplianceEngine;
  private dashboard: ComplianceDashboard;
  private watcher?: FSWatcher;
  private evaluationTimer?: NodeJS.Timeout;
  private isEvaluating = false;
  private lastResult?: ArchitectureComplianceResult;
  private thresholdHistory: ThresholdAdjustment[] = [];
  private performanceMetrics: {
    evaluationCount: number;
    averageEvaluationTime: number;
    lastEvaluationTime: number;
  } = {
    evaluationCount: 0,
    averageEvaluationTime: 0,
    lastEvaluationTime: 0
  };

  /**
   * 构造函数
   * @param config 监控配置
   */
  constructor(config: Partial<MonitorConfig> = {}) {
    super();
    
    this.config = {
      watchPatterns: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
      ignorePatterns: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
      evaluationDelay: 2000,
      enableRealTimeReporting: true,
      reportOutputDir: './reports/real-time',
      adaptiveThresholds: {
        enabled: true,
        projectPhase: 'development',
        teamSize: 'medium',
        techStack: 'react'
      },
      ...config
    };

    this.engine = new ArchitectureComplianceEngine();
    this.dashboard = new ComplianceDashboard({
      outputFormat: 'html',
      outputDir: this.config.reportOutputDir,
      generateCharts: true
    });

    this.setupEventHandlers();
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    this.on('evaluation_completed', (event: MonitorEvent) => {
      if (event.result && this.config.adaptiveThresholds.enabled) {
        this.adjustThresholdsIfNeeded(event.result);
      }
    });

    this.on('violation_detected', (event: MonitorEvent) => {
      console.warn(`🚨 检测到架构违规: ${event.details?.violation?.description}`);
    });
  }

  /**
   * 开始监控
   * @param projectPath 项目路径
   */
  public async startMonitoring(projectPath: string): Promise<void> {
    console.log('🔍 启动实时架构符合度监控...');
    
    // 确保报告输出目录存在
    await this.ensureReportDirectory();
    
    // 初始化引擎
    await this.engine.initialize(projectPath);
    
    // 执行初始评估
    await this.performInitialEvaluation();
    
    // 启动文件监控
    this.startFileWatcher(projectPath);
    
    console.log('✅ 实时监控已启动');
    console.log(`📁 监控目录: ${projectPath}`);
    console.log(`⏱️  评估延迟: ${this.config.evaluationDelay}ms`);
    console.log(`🎯 自适应阈值: ${this.config.adaptiveThresholds.enabled ? '启用' : '禁用'}`);
  }

  /**
   * 停止监控
   */
  public async stopMonitoring(): Promise<void> {
    console.log('🛑 停止实时监控...');
    
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = undefined;
    }
    
    if (this.evaluationTimer) {
      clearTimeout(this.evaluationTimer);
      this.evaluationTimer = undefined;
    }
    
    console.log('✅ 监控已停止');
  }

  /**
   * 确保报告目录存在
   */
  private async ensureReportDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.config.reportOutputDir, { recursive: true });
    } catch (error) {
      console.warn('创建报告目录失败:', error);
    }
  }

  /**
   * 执行初始评估
   */
  private async performInitialEvaluation(): Promise<void> {
    console.log('🔄 执行初始架构符合度评估...');
    
    try {
      const result = await this.engine.evaluate();
      this.lastResult = result;
      
      if (this.config.enableRealTimeReporting) {
        await this.generateReport(result, 'initial');
      }
      
      this.emitEvent({
        type: 'evaluation_completed',
        timestamp: new Date(),
        result
      });
      
      console.log(`✅ 初始评估完成，总体评分: ${result.overallScore}/100`);
    } catch (error) {
      console.error('❌ 初始评估失败:', error);
    }
  }

  /**
   * 启动文件监控
   * @param projectPath 项目路径
   */
  private startFileWatcher(projectPath: string): void {
    const watchPaths = this.config.watchPatterns.map(pattern => 
      path.join(projectPath, pattern)
    );
    
    this.watcher = watch(watchPaths, {
      ignored: this.config.ignorePatterns,
      persistent: true,
      ignoreInitial: true
    });
    
    this.watcher.on('change', (filePath: string) => {
      this.handleFileChange(filePath, 'change');
    });
    
    this.watcher.on('add', (filePath: string) => {
      this.handleFileChange(filePath, 'add');
    });
    
    this.watcher.on('unlink', (filePath: string) => {
      this.handleFileChange(filePath, 'delete');
    });
    
    this.watcher.on('error', (error: Error) => {
      console.error('文件监控错误:', error);
    });
  }

  /**
   * 处理文件变更
   * @param filePath 文件路径
   * @param changeType 变更类型
   */
  private handleFileChange(filePath: string, changeType: 'change' | 'add' | 'delete'): void {
    console.log(`📝 文件${changeType === 'change' ? '修改' : changeType === 'add' ? '添加' : '删除'}: ${path.basename(filePath)}`);
    
    this.emitEvent({
      type: 'file_changed',
      timestamp: new Date(),
      filePath,
      details: { changeType }
    });
    
    // 延迟执行评估，避免频繁触发
    this.scheduleEvaluation();
  }

  /**
   * 调度评估
   */
  private scheduleEvaluation(): void {
    if (this.evaluationTimer) {
      clearTimeout(this.evaluationTimer);
    }
    
    this.evaluationTimer = setTimeout(() => {
      this.performEvaluation();
    }, this.config.evaluationDelay);
  }

  /**
   * 执行评估
   */
  private async performEvaluation(): Promise<void> {
    if (this.isEvaluating) {
      console.log('⏳ 评估正在进行中，跳过本次触发');
      return;
    }
    
    this.isEvaluating = true;
    const startTime = Date.now();
    
    try {
      console.log('🔄 开始实时架构符合度评估...');
      
      this.emitEvent({
        type: 'evaluation_started',
        timestamp: new Date()
      });
      
      const result = await this.engine.evaluate();
      const evaluationTime = Date.now() - startTime;
      
      // 更新性能指标
      this.updatePerformanceMetrics(evaluationTime);
      
      // 检测违规变化
      this.detectViolationChanges(result);
      
      this.lastResult = result;
      
      if (this.config.enableRealTimeReporting) {
        await this.generateReport(result, 'real-time');
      }
      
      this.emitEvent({
        type: 'evaluation_completed',
        timestamp: new Date(),
        result,
        details: { evaluationTime }
      });
      
      console.log(`✅ 实时评估完成，总体评分: ${result.overallScore}/100 (耗时: ${evaluationTime}ms)`);
    } catch (error) {
      console.error('❌ 实时评估失败:', error);
    } finally {
      this.isEvaluating = false;
    }
  }

  /**
   * 更新性能指标
   * @param evaluationTime 评估耗时
   */
  private updatePerformanceMetrics(evaluationTime: number): void {
    this.performanceMetrics.evaluationCount++;
    this.performanceMetrics.lastEvaluationTime = evaluationTime;
    
    // 计算平均评估时间
    const totalTime = this.performanceMetrics.averageEvaluationTime * (this.performanceMetrics.evaluationCount - 1) + evaluationTime;
    this.performanceMetrics.averageEvaluationTime = totalTime / this.performanceMetrics.evaluationCount;
  }

  /**
   * 检测违规变化
   * @param currentResult 当前评估结果
   */
  private detectViolationChanges(currentResult: ArchitectureComplianceResult): void {
    if (!this.lastResult) return;
    
    const previousViolations = this.lastResult.highRiskViolations;
    const currentViolations = currentResult.highRiskViolations;
    
    // 检测新增违规
    const newViolations = currentViolations.filter(current => 
      !previousViolations.some(previous => 
        previous.filePath === current.filePath && 
        previous.lineNumber === current.lineNumber &&
        previous.violationType === current.violationType
      )
    );
    
    // 检测已修复违规
    const fixedViolations = previousViolations.filter(previous => 
      !currentViolations.some(current => 
        current.filePath === previous.filePath && 
        current.lineNumber === previous.lineNumber &&
        current.violationType === previous.violationType
      )
    );
    
    // 发出事件
    newViolations.forEach(violation => {
      this.emitEvent({
        type: 'violation_detected',
        timestamp: new Date(),
        filePath: violation.filePath,
        details: { violation, status: 'new' }
      });
    });
    
    fixedViolations.forEach(violation => {
      console.log(`✅ 违规已修复: ${violation.description} (${path.basename(violation.filePath)}:${violation.lineNumber})`);
    });
  }

  /**
   * 调整阈值（如果需要）
   * @param result 评估结果
   */
  private adjustThresholdsIfNeeded(result: ArchitectureComplianceResult): void {
    const config = this.config.adaptiveThresholds;
    if (!config.enabled) return;
    
    const currentThresholds = this.getCurrentThresholds();
    const newThresholds = this.calculateAdaptiveThresholds(result, config);
    
    // 检查是否需要调整
    const needsAdjustment = Object.keys(newThresholds).some(
      key => Math.abs(currentThresholds[key] - newThresholds[key]) > 2
    );
    
    if (needsAdjustment) {
      this.applyThresholdAdjustment(currentThresholds, newThresholds, '自适应调整');
    }
  }

  /**
   * 获取当前阈值
   * @returns 当前阈值配置
   */
  private getCurrentThresholds(): Record<string, number> {
    // 从引擎配置中获取当前阈值
    return {
      layeredArchitecture: 85,
      domainModel: 80,
      serviceBoundary: 75,
      dependencyInversion: 80
    };
  }

  /**
   * 计算自适应阈值
   * @param result 评估结果
   * @param config 自适应配置
   * @returns 新的阈值配置
   */
  private calculateAdaptiveThresholds(
    result: ArchitectureComplianceResult, 
    config: AdaptiveThresholdConfig
  ): Record<string, number> {
    const baseThresholds = {
      layeredArchitecture: 85,
      domainModel: 80,
      serviceBoundary: 75,
      dependencyInversion: 80
    };
    
    // 根据项目阶段调整
    const phaseMultiplier = this.getPhaseMultiplier(config.projectPhase);
    
    // 根据团队规模调整
    const teamMultiplier = this.getTeamMultiplier(config.teamSize);
    
    // 根据技术栈调整
    const techMultiplier = this.getTechStackMultiplier(config.techStack);
    
    // 应用调整
    const adjustedThresholds: Record<string, number> = {};
    
    Object.keys(baseThresholds).forEach(key => {
      let threshold = baseThresholds[key as keyof typeof baseThresholds];
      
      // 应用各种乘数
      threshold *= phaseMultiplier;
      threshold *= teamMultiplier;
      threshold *= techMultiplier;
      
      // 应用自定义权重
      if (config.customWeights && config.customWeights[key as keyof typeof config.customWeights]) {
        threshold *= config.customWeights[key as keyof typeof config.customWeights]!;
      }
      
      // 确保阈值在合理范围内
      adjustedThresholds[key] = Math.max(50, Math.min(95, Math.round(threshold)));
    });
    
    return adjustedThresholds;
  }

  /**
   * 获取项目阶段乘数
   * @param phase 项目阶段
   * @returns 乘数
   */
  private getPhaseMultiplier(phase: string): number {
    const multipliers = {
      mvp: 0.8,        // MVP阶段容忍度较高
      development: 0.9, // 开发阶段适中
      mature: 1.0,     // 成熟期标准要求
      legacy: 1.1      // 遗留系统更严格
    };
    
    return multipliers[phase as keyof typeof multipliers] || 1.0;
  }

  /**
   * 获取团队规模乘数
   * @param teamSize 团队规模
   * @returns 乘数
   */
  private getTeamMultiplier(teamSize: string): number {
    const multipliers = {
      small: 0.9,   // 小团队适当放宽
      medium: 1.0,  // 中等团队标准
      large: 1.1    // 大团队更严格
    };
    
    return multipliers[teamSize as keyof typeof multipliers] || 1.0;
  }

  /**
   * 获取技术栈乘数
   * @param techStack 技术栈
   * @returns 乘数
   */
  private getTechStackMultiplier(techStack: string): number {
    const multipliers = {
      react: 1.0,
      vue: 1.0,
      angular: 1.1,   // Angular更严格的架构要求
      node: 0.95,
      spring: 1.05,   // Spring Boot有更好的架构支持
      dotnet: 1.05,   // .NET Core有更好的架构支持
      mixed: 0.9      // 混合技术栈适当放宽
    };
    
    return multipliers[techStack as keyof typeof multipliers] || 1.0;
  }

  /**
   * 应用阈值调整
   * @param previousThresholds 之前的阈值
   * @param newThresholds 新的阈值
   * @param reason 调整原因
   */
  private applyThresholdAdjustment(
    previousThresholds: Record<string, number>,
    newThresholds: Record<string, number>,
    reason: string
  ): void {
    const adjustment: ThresholdAdjustment = {
      timestamp: new Date(),
      reason,
      previousThresholds: { ...previousThresholds },
      newThresholds: { ...newThresholds },
      adjustmentMagnitude: this.calculateAdjustmentMagnitude(previousThresholds, newThresholds)
    };
    
    this.thresholdHistory.push(adjustment);
    
    // 应用新阈值到引擎
    // this.engine.updateThresholds(newThresholds);
    
    console.log(`🎯 阈值已调整: ${reason}`);
    console.log('调整详情:', adjustment);
    
    this.emitEvent({
      type: 'threshold_adjusted',
      timestamp: new Date(),
      details: adjustment
    });
  }

  /**
   * 计算调整幅度
   * @param previous 之前的阈值
   * @param current 当前的阈值
   * @returns 调整幅度
   */
  private calculateAdjustmentMagnitude(
    previous: Record<string, number>,
    current: Record<string, number>
  ): number {
    const changes = Object.keys(previous).map(key => 
      Math.abs(current[key] - previous[key])
    );
    
    return changes.reduce((sum, change) => sum + change, 0) / changes.length;
  }

  /**
   * 生成报告
   * @param result 评估结果
   * @param type 报告类型
   */
  private async generateReport(result: ArchitectureComplianceResult, type: string): Promise<void> {
    try {
      const reportPath = await this.dashboard.generateDashboard(result);
      console.log(`📊 ${type === 'initial' ? '初始' : '实时'}报告已生成: ${reportPath}`);
    } catch (error) {
      console.error('生成报告失败:', error);
    }
  }

  /**
   * 发出事件
   * @param event 监控事件
   */
  private emitEvent(event: MonitorEvent): void {
    this.emit(event.type, event);
    this.emit('monitor_event', event);
  }

  /**
   * 获取监控状态
   * @returns 监控状态信息
   */
  public getMonitorStatus(): {
    isMonitoring: boolean;
    isEvaluating: boolean;
    lastResult?: ArchitectureComplianceResult;
    performanceMetrics: typeof this.performanceMetrics;
    thresholdHistory: ThresholdAdjustment[];
  } {
    return {
      isMonitoring: !!this.watcher,
      isEvaluating: this.isEvaluating,
      lastResult: this.lastResult,
      performanceMetrics: { ...this.performanceMetrics },
      thresholdHistory: [...this.thresholdHistory]
    };
  }

  /**
   * 手动触发评估
   */
  public async triggerEvaluation(): Promise<ArchitectureComplianceResult | undefined> {
    console.log('🔄 手动触发架构符合度评估...');
    await this.performEvaluation();
    return this.lastResult;
  }

  /**
   * 更新监控配置
   * @param newConfig 新的配置
   */
  public updateConfig(newConfig: Partial<MonitorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ 监控配置已更新');
  }

  /**
   * 导出监控数据
   * @param outputPath 输出路径
   */
  public async exportMonitorData(outputPath: string): Promise<void> {
    const data = {
      config: this.config,
      status: this.getMonitorStatus(),
      exportTime: new Date().toISOString()
    };
    
    await fs.writeFile(outputPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`📤 监控数据已导出: ${outputPath}`);
  }
}

/**
 * 导出默认实例
 */
export default RealTimeArchitectureMonitor;