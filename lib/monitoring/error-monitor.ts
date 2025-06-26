/**
 * 错误监控和报告系统
 * 提供错误收集、分析、报告和恢复建议功能
 */

import {
  AgentError,
  ErrorSeverity,
  AgentErrorType,
  ErrorReport,
  ErrorRecoveryRecommendation,
  generateId
} from '../errors/agent-errors';

// 错误统计信息
interface ErrorStats {
  total: number;
  byType: Record<AgentErrorType, number>;
  bySeverity: Record<ErrorSeverity, number>;
  byAgent: Record<string, number>;
  recentErrors: number; // 最近1小时的错误数
  errorRate: number; // 错误率（每分钟）
}

// 错误趋势数据
interface ErrorTrend {
  timestamp: Date;
  errorCount: number;
  errorType: AgentErrorType;
  severity: ErrorSeverity;
  agentId?: string;
}

// 告警规则
interface AlertRule {
  id: string;
  name: string;
  condition: (stats: ErrorStats, trends: ErrorTrend[]) => boolean;
  severity: ErrorSeverity;
  cooldown: number; // 冷却时间（毫秒）
  isActive: boolean;
  lastTriggered?: Date;
}

// 告警事件
interface AlertEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: ErrorSeverity;
  message: string;
  timestamp: Date;
  data: any;
  isResolved: boolean;
}

// 错误收集器
class ErrorCollector {
  private errors: ErrorReport[] = [];
  private maxErrors = 10000;
  private trends: ErrorTrend[] = [];
  private maxTrends = 1000;

  /**
   * 收集错误
   */
  collect(error: AgentError, context?: Record<string, any>): string {
    const report: ErrorReport = {
      id: generateId(),
      timestamp: new Date(),
      agentType: error.agentType,
      errorType: error.type,
      severity: error.severity,
      message: error.message,
      context: { ...error.context, ...context },
      error,
      resolved: false
    };
    
    if (error.stack) {
      report.stack = error.stack;
    }
    if (error.userAgent) {
      report.userAgent = error.userAgent;
    }
    if (error.sessionId) {
      report.sessionId = error.sessionId;
    }

    this.errors.push(report);
    
    // 限制错误数量
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // 记录趋势数据
    this.recordTrend(error);

    console.log(`收集错误: ${error.type} - ${error.message}`);
    return report.id;
  }

  /**
   * 记录错误趋势
   */
  private recordTrend(error: AgentError): void {
    const trend: ErrorTrend = {
      timestamp: new Date(),
      errorCount: 1,
      errorType: error.type,
      severity: error.severity,
      agentId: error.context?.['agentId']
    };

    this.trends.push(trend);
    
    // 限制趋势数据数量
    if (this.trends.length > this.maxTrends) {
      this.trends = this.trends.slice(-this.maxTrends);
    }
  }

  /**
   * 获取错误统计
   */
  getStats(): ErrorStats {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneMinuteAgo = now - 60 * 1000;

    const recentErrors = this.errors.filter(
      e => e.timestamp.getTime() > oneHourAgo
    );

    const veryRecentErrors = this.errors.filter(
      e => e.timestamp.getTime() > oneMinuteAgo
    );

    // 按类型统计
    const byType = {} as Record<AgentErrorType, number>;
    Object.values(AgentErrorType).forEach(type => {
      byType[type] = this.errors.filter(e => e.error?.type === type).length;
    });

    // 按严重程度统计
    const bySeverity = {} as Record<ErrorSeverity, number>;
    Object.values(ErrorSeverity).forEach(severity => {
      bySeverity[severity] = this.errors.filter(e => e.error?.severity === severity).length;
    });

    // 按智能体统计
    const byAgent = {} as Record<string, number>;
    this.errors.forEach(e => {
      const agentId = e.error?.context?.['agentId'] || 'unknown';
      byAgent[agentId] = (byAgent[agentId] || 0) + 1;
    });

    return {
      total: this.errors.length,
      byType,
      bySeverity,
      byAgent,
      recentErrors: recentErrors.length,
      errorRate: veryRecentErrors.length // 每分钟错误数
    };
  }

  /**
   * 获取错误趋势
   */
  getTrends(hours: number = 24): ErrorTrend[] {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return this.trends.filter(t => t.timestamp.getTime() > cutoff);
  }

  /**
   * 获取错误详情
   */
  getErrorById(id: string): ErrorReport | undefined {
    return this.errors.find(e => e.id === id);
  }

  /**
   * 标记错误为已解决
   */
  markResolved(id: string): boolean {
    const error = this.getErrorById(id);
    if (error) {
      error.resolved = true;
      return true;
    }
    return false;
  }

  /**
   * 获取最近的错误
   */
  getRecentErrors(limit: number = 50): ErrorReport[] {
    return this.errors
      .slice(-limit)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * 清理过期错误
   */
  cleanup(maxAge: number = 7 * 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge;
    
    this.errors = this.errors.filter(
      e => e.timestamp.getTime() > cutoff
    );
    
    this.trends = this.trends.filter(
      t => t.timestamp.getTime() > cutoff
    );
    
    console.log('清理过期错误数据完成');
  }
}

// 恢复建议生成器
class RecoveryRecommendationEngine {
  /**
   * 生成恢复建议
   */
  generateRecommendations(error: AgentError): ErrorRecoveryRecommendation[] {
    const recommendations: ErrorRecoveryRecommendation[] = [];

    switch (error.type) {
      case AgentErrorType.CAD_FILE_PARSE_ERROR:
        recommendations.push(...this.getCADAnalysisRecommendations(error));
        break;
      
      case AgentErrorType.POSTER_GENERATION_FAILED:
        recommendations.push(...this.getPosterGenerationRecommendations(error));
        break;
      
      case AgentErrorType.CHAT_API_ERROR:
        recommendations.push(...this.getChatAgentRecommendations(error));
        break;
      
      case AgentErrorType.AGENT_COMMUNICATION_ERROR:
        recommendations.push(...this.getCommunicationRecommendations(error));
        break;
      
      case AgentErrorType.SERVICE_UNAVAILABLE:
        recommendations.push(...this.getSystemRecommendations(error));
        break;
      
      default:
        recommendations.push(this.getGenericRecommendation(error));
    }

    return recommendations;
  }

  /**
   * CAD分析错误恢复建议
   */
  private getCADAnalysisRecommendations(error: AgentError): ErrorRecoveryRecommendation[] {
    const recommendations: ErrorRecoveryRecommendation[] = [];

    if (error.message.includes('文件格式')) {
      recommendations.push({
        errorType: error.type,
        severity: error.severity,
        description: '验证CAD文件格式是否支持',
        recommendations: [{
          userMessage: '请检查CAD文件格式是否受支持',
          technicalSteps: ['验证文件扩展名', '检查文件头信息', '尝试其他格式'],
          autoRecovery: true
        }],
        priority: 1
      });
    }

    if (error.message.includes('解析超时')) {
      recommendations.push({
        errorType: error.type,
        severity: error.severity,
        description: '切换到备用解析器',
        recommendations: [{
          userMessage: '系统将自动切换到备用解析器',
          technicalSteps: ['停止当前解析', '启动备用解析器', '重新处理文件'],
          autoRecovery: true
        }],
        priority: 1
      });
    }

    if (error.message.includes('内存不足')) {
      recommendations.push({
        errorType: error.type,
        severity: error.severity,
        description: '优化内存使用，清理缓存',
        recommendations: [{
          userMessage: '系统正在优化内存使用',
          technicalSteps: ['清理临时文件', '释放缓存', '重新分配内存'],
          autoRecovery: true
        }],
        priority: 2
      });
    }

    recommendations.push({
      errorType: error.type,
      severity: error.severity,
      description: '使用不同的解析设置重试',
      recommendations: [{
        userMessage: '尝试使用不同的解析设置',
        technicalSteps: ['调整解析参数', '使用兼容模式', '手动验证结果'],
        autoRecovery: false
      }],
      priority: 3
    });

    return recommendations;
  }

  /**
   * 海报生成错误恢复建议
   */
  private getPosterGenerationRecommendations(error: AgentError): ErrorRecoveryRecommendation[] {
    const recommendations: ErrorRecoveryRecommendation[] = [];

    if (error.message.includes('资源不足')) {
      recommendations.push({
        errorType: error.type,
        severity: error.severity,
        description: '等待系统资源释放',
        recommendations: [{
          userMessage: '系统资源不足，请稍等片刻',
          technicalSteps: ['监控资源使用', '等待资源释放', '重新尝试生成'],
          autoRecovery: true
        }],
        priority: 1
      });
      
      recommendations.push({
        errorType: error.type,
        severity: error.severity,
        description: '使用低质量模板降级生成',
        recommendations: [{
          userMessage: '将使用低质量模板快速生成',
          technicalSteps: ['选择低质量模板', '调整生成参数', '执行快速生成'],
          autoRecovery: true
        }],
        priority: 2
      });
    }

    if (error.message.includes('模板')) {
      recommendations.push({
        errorType: error.type,
        severity: error.severity,
        description: '切换到备用模板',
        recommendations: [{
          userMessage: '正在切换到备用模板',
          technicalSteps: ['加载备用模板', '验证模板完整性', '重新生成海报'],
          autoRecovery: true
        }],
        priority: 1
      });
    }

    recommendations.push({
      errorType: error.type,
      severity: error.severity,
      description: '重新尝试海报生成',
      recommendations: [{
        userMessage: '系统将重新尝试生成海报',
        technicalSteps: ['重置生成状态', '重新加载资源', '执行生成流程'],
        autoRecovery: true
      }],
      priority: 3
    });

    return recommendations;
  }

  /**
   * 对话智能体错误恢复建议
   */
  private getChatAgentRecommendations(error: AgentError): ErrorRecoveryRecommendation[] {
    const recommendations: ErrorRecoveryRecommendation[] = [];

    if (error.message.includes('上下文')) {
      recommendations.push({
        errorType: error.type,
        severity: error.severity,
        description: '从备份恢复对话上下文',
        recommendations: [{
          userMessage: '正在恢复对话上下文',
          technicalSteps: ['查找备份数据', '验证上下文完整性', '恢复对话状态'],
          autoRecovery: true
        }],
        priority: 1
      });
    }

    if (error.message.includes('API') || error.message.includes('模型')) {
      recommendations.push({
        errorType: error.type,
        severity: error.severity,
        description: '切换到备用AI模型',
        recommendations: [{
          userMessage: '正在切换到备用AI模型',
          technicalSteps: ['检测可用模型', '切换模型配置', '重新初始化连接'],
          autoRecovery: true
        }],
        priority: 1
      });
    }

    if (error.message.includes('速率限制')) {
      recommendations.push({
        errorType: error.type,
        severity: error.severity,
        description: '等待速率限制重置',
        recommendations: [{
          userMessage: '已达到API调用限制，请稍等',
          technicalSteps: ['监控限制状态', '等待重置时间', '重新尝试请求'],
          autoRecovery: true
        }],
        priority: 2
      });
    }

    return recommendations;
  }

  /**
   * 通信错误恢复建议
   */
  private getCommunicationRecommendations(_error: AgentError): ErrorRecoveryRecommendation[] {
    return [
      {
        errorType: _error.type,
        severity: _error.severity,
        description: '重试智能体间通信',
        recommendations: [{
          userMessage: '正在重试智能体间通信',
          technicalSteps: ['检查连接状态', '重新建立连接', '重发消息'],
          autoRecovery: true
        }],
        priority: 1
      },
      {
        errorType: _error.type,
        severity: _error.severity,
        description: '使用直接通知机制',
        recommendations: [{
          userMessage: '切换到直接通知模式',
          technicalSteps: ['启用直接通知', '绕过事件总线', '发送直接消息'],
          autoRecovery: true
        }],
        priority: 2
      },
      {
        errorType: _error.type,
        severity: _error.severity,
        description: '检查网络连接状态',
        recommendations: [{
          userMessage: '请检查网络连接',
          technicalSteps: ['测试网络连通性', '检查防火墙设置', '验证服务可用性'],
          autoRecovery: false
        }],
        priority: 3
      }
    ];
  }

  /**
   * 系统错误恢复建议
   */
  private getSystemRecommendations(_error: AgentError): ErrorRecoveryRecommendation[] {
    return [
      {
        errorType: _error.type,
        severity: _error.severity,
        description: '重启受影响的服务',
        recommendations: [{
          userMessage: '需要重启相关服务以恢复功能',
          technicalSteps: ['识别受影响服务', '安全停止服务', '重新启动服务'],
          autoRecovery: false
        }],
        priority: 1
      },
      {
        errorType: _error.type,
        severity: _error.severity,
        description: '检查系统资源使用情况',
        recommendations: [{
          userMessage: '正在检查系统资源状态',
          technicalSteps: ['监控CPU使用率', '检查内存占用', '分析磁盘空间'],
          autoRecovery: true
        }],
        priority: 2
      },
      {
        errorType: _error.type,
        severity: _error.severity,
        description: '查看系统日志',
        recommendations: [{
          userMessage: '请查看详细的系统日志',
          technicalSteps: ['收集错误日志', '分析异常模式', '生成诊断报告'],
          autoRecovery: false
        }],
        priority: 3
      }
    ];
  }

  /**
   * 通用恢复建议
   */
  private getGenericRecommendation(_error: AgentError): ErrorRecoveryRecommendation {
    return {
      errorType: _error.type,
      severity: _error.severity,
      description: '需要手动调查此错误',
      recommendations: [{
        userMessage: '此错误需要技术人员手动调查',
        technicalSteps: ['收集错误详情', '分析错误原因', '制定解决方案'],
        autoRecovery: false
      }],
      priority: 5
    };
  }
}

// 告警管理器
class AlertManager {
  private rules: AlertRule[] = [];
  private alerts: AlertEvent[] = [];
  private maxAlerts = 1000;

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * 初始化默认告警规则
   */
  private initializeDefaultRules(): void {
    // 高错误率告警
    this.addRule({
      id: 'high_error_rate',
      name: '高错误率告警',
      condition: (stats) => stats.errorRate > 10, // 每分钟超过10个错误
      severity: ErrorSeverity.HIGH,
      cooldown: 300000, // 5分钟冷却
      isActive: true
    });

    // 严重错误告警
    this.addRule({
      id: 'critical_errors',
      name: '严重错误告警',
      condition: (stats) => stats.bySeverity[ErrorSeverity.CRITICAL] > 0,
      severity: ErrorSeverity.CRITICAL,
      cooldown: 60000, // 1分钟冷却
      isActive: true
    });

    // 系统错误激增告警
    this.addRule({
      id: 'system_error_spike',
      name: '系统错误激增',
      condition: (stats) => stats.byType[AgentErrorType.SERVICE_UNAVAILABLE] > 5,
      severity: ErrorSeverity.HIGH,
      cooldown: 600000, // 10分钟冷却
      isActive: true
    });

    // 通信错误告警
    this.addRule({
      id: 'communication_errors',
      name: '通信错误告警',
      condition: (stats) => stats.byType[AgentErrorType.AGENT_COMMUNICATION_ERROR] > 3,
      severity: ErrorSeverity.MEDIUM,
      cooldown: 300000, // 5分钟冷却
      isActive: true
    });
  }

  /**
   * 添加告警规则
   */
  addRule(rule: Omit<AlertRule, 'id'> & { id?: string }): string {
    const alertRule: AlertRule = {
      id: rule.id || generateId(),
      ...rule
    };
    
    this.rules.push(alertRule);
    console.log(`添加告警规则: ${alertRule.name}`);
    
    return alertRule.id;
  }

  /**
   * 检查告警条件
   */
  checkAlerts(stats: ErrorStats, trends: ErrorTrend[]): AlertEvent[] {
    const triggeredAlerts: AlertEvent[] = [];
    const now = new Date();

    for (const rule of this.rules) {
      if (!rule.isActive) {continue;}

      // 检查冷却时间
      if (rule.lastTriggered && 
          now.getTime() - rule.lastTriggered.getTime() < rule.cooldown) {
        continue;
      }

      // 检查条件
      if (rule.condition(stats, trends)) {
        const alert: AlertEvent = {
          id: generateId(),
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          message: this.generateAlertMessage(rule, stats),
          timestamp: now,
          data: { stats, trends },
          isResolved: false
        };

        triggeredAlerts.push(alert);
        this.alerts.push(alert);
        
        // 更新规则触发时间
        rule.lastTriggered = now;
        
        console.warn(`触发告警: ${rule.name}`);
      }
    }

    // 限制告警数量
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(-this.maxAlerts);
    }

    return triggeredAlerts;
  }

  /**
   * 生成告警消息
   */
  private generateAlertMessage(rule: AlertRule, stats: ErrorStats): string {
    switch (rule.id) {
      case 'high_error_rate':
        return `系统错误率过高: ${stats.errorRate} 错误/分钟`;
      case 'critical_errors':
        return `检测到 ${stats.bySeverity[ErrorSeverity.CRITICAL]} 个严重错误`;
      case 'system_error_spike':
        return `系统错误激增: ${stats.byType[AgentErrorType.SERVICE_UNAVAILABLE]} 个系统错误`;
      case 'communication_errors':
        return `通信错误频发: ${stats.byType[AgentErrorType.AGENT_COMMUNICATION_ERROR]} 个通信错误`;
      default:
        return `告警规则 ${rule.name} 被触发`;
    }
  }

  /**
   * 解决告警
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.isResolved = true;
      console.log(`告警已解决: ${alert.ruleName}`);
      return true;
    }
    return false;
  }

  /**
   * 获取活跃告警
   */
  getActiveAlerts(): AlertEvent[] {
    return this.alerts.filter(a => !a.isResolved);
  }

  /**
   * 获取所有告警
   */
  getAllAlerts(): AlertEvent[] {
    return [...this.alerts];
  }

  /**
   * 启用/禁用告警规则
   */
  toggleRule(ruleId: string, isActive: boolean): boolean {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.isActive = isActive;
      console.log(`告警规则 ${rule.name} ${isActive ? '启用' : '禁用'}`);
      return true;
    }
    return false;
  }
}

// 错误监控主类
export class ErrorMonitor {
  private collector: ErrorCollector;
  private recommendationEngine: RecoveryRecommendationEngine;
  private alertManager: AlertManager;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.collector = new ErrorCollector();
    this.recommendationEngine = new RecoveryRecommendationEngine();
    this.alertManager = new AlertManager();
  }

  /**
   * 报告错误
   */
  reportError(error: AgentError, context?: Record<string, any>): string {
    const reportId = this.collector.collect(error, context);
    
    // 生成恢复建议
    const recommendations = this.recommendationEngine.generateRecommendations(error);
    
    // 检查告警
    const stats = this.collector.getStats();
    const trends = this.collector.getTrends(1); // 最近1小时
    const alerts = this.alertManager.checkAlerts(stats, trends);
    
    // 输出恢复建议
    if (recommendations.length > 0) {
      console.log('恢复建议:');
      recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec.description} (优先级: ${rec.priority})`);
      });
    }
    
    // 输出告警
    if (alerts.length > 0) {
      console.warn('触发告警:');
      alerts.forEach(alert => {
        console.warn(`  - ${alert.message} (严重程度: ${alert.severity})`);
      });
    }
    
    return reportId;
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): ErrorStats {
    return this.collector.getStats();
  }

  /**
   * 获取错误趋势
   */
  getErrorTrends(hours: number = 24): ErrorTrend[] {
    return this.collector.getTrends(hours);
  }

  /**
   * 获取恢复建议
   */
  getRecoveryRecommendations(errorId: string): ErrorRecoveryRecommendation[] {
    const errorReport = this.collector.getErrorById(errorId);
    if (!errorReport) {
      return [];
    }
    
    // 从ErrorReport创建AgentError实例
    const agentError = new AgentError(
      errorReport.errorType as any,
      errorReport.message,
      errorReport.severity as any,
      errorReport.agentType,
      errorReport.context || {},
      errorReport.sessionId,
      errorReport.userAgent
    );
    if (errorReport.stack) {
      agentError.stack = errorReport.stack;
    }
    
    return this.recommendationEngine.generateRecommendations(agentError);
  }

  /**
   * 获取活跃告警
   */
  getActiveAlerts(): AlertEvent[] {
    return this.alertManager.getActiveAlerts();
  }

  /**
   * 解决告警
   */
  resolveAlert(alertId: string): boolean {
    return this.alertManager.resolveAlert(alertId);
  }

  /**
   * 标记错误为已解决
   */
  markErrorResolved(errorId: string): boolean {
    return this.collector.markResolved(errorId);
  }

  /**
   * 获取最近错误
   */
  getRecentErrors(limit: number = 50): ErrorReport[] {
    return this.collector.getRecentErrors(limit);
  }

  /**
   * 启动监控
   */
  startMonitoring(intervalMs: number = 60000): void {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    this.monitoringInterval = setInterval(() => {
      // 定期检查告警
      const stats = this.collector.getStats();
      const trends = this.collector.getTrends(1);
      this.alertManager.checkAlerts(stats, trends);
      
      // 清理过期数据
      this.collector.cleanup();
    }, intervalMs);

    console.log('错误监控已启动');
  }

  /**
   * 停止监控
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('错误监控已停止');
    }
  }

  /**
   * 生成监控报告
   */
  generateReport(): Record<string, any> {
    const stats = this.collector.getStats();
    const trends = this.collector.getTrends(24);
    const activeAlerts = this.alertManager.getActiveAlerts();
    const recentErrors = this.collector.getRecentErrors(10);

    return {
      timestamp: new Date(),
      summary: {
        totalErrors: stats.total,
        recentErrors: stats.recentErrors,
        errorRate: stats.errorRate,
        activeAlerts: activeAlerts.length
      },
      statistics: stats,
      trends: trends.slice(-24), // 最近24个数据点
      alerts: activeAlerts,
      recentErrorSamples: recentErrors.map(e => ({
        id: e.id,
        type: e.errorType,
        severity: e.severity,
        message: e.message,
        timestamp: e.timestamp
      }))
    };
  }

  /**
   * 健康检查
   */
  healthCheck(): Record<string, any> {
    const stats = this.collector.getStats();
    const activeAlerts = this.alertManager.getActiveAlerts();
    
    const criticalAlerts = activeAlerts.filter(
      a => a.severity === ErrorSeverity.CRITICAL
    );
    
    const isHealthy = criticalAlerts.length === 0 && stats.errorRate < 5;
    
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date(),
      errorRate: stats.errorRate,
      criticalAlerts: criticalAlerts.length,
      monitoringActive: this.monitoringInterval !== null
    };
  }

  /**
   * 关闭监控器
   */
  shutdown(): void {
    this.stopMonitoring();
    console.log('错误监控器已关闭');
  }
}

// 导出默认实例
export const errorMonitor = new ErrorMonitor();

// 导出类型
export type {
  ErrorStats,
  ErrorTrend,
  AlertRule,
  AlertEvent
};