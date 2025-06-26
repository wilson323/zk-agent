// @ts-nocheck
import { AgentComplianceChecker, type ComplianceReport } from "../protocol/agent-compliance-checker"
import { ConversationAgentAdapter } from "../agents/conversation-agent-adapter"
import { CADAgentAdapter } from "../agents/cad-agent-adapter"
import { PosterAgentAdapter } from "../agents/poster-agent-adapter"
import type { AgUIEvent, Message } from "../protocol/complete-types"

/**
 * 智能体合规性审计器
 * 检查所有智能体是否遵循AG-UI协议
 */
export class AgentComplianceAudit {
  private reports: Map<string, ComplianceReport> = new Map()

  /**
   * 审计所有智能体
   */
  async auditAllAgents(): Promise<ComplianceAuditResult> {
    const results: ComplianceReport[] = []

    // 审计对话智能体
    try {
      const conversationReport = await this.auditConversationAgent()
      results.push(conversationReport)
      this.reports.set("conversation", conversationReport)
    } catch (error) {
      console.error("Error auditing conversation agent:", error)
    }

    // 审计CAD智能体
    try {
      const cadReport = await this.auditCADAgent()
      results.push(cadReport)
      this.reports.set("cad", cadReport)
    } catch (error) {
      console.error("Error auditing CAD agent:", error)
    }

    // 审计海报智能体
    try {
      const posterReport = await this.auditPosterAgent()
      results.push(posterReport)
      this.reports.set("poster", posterReport)
    } catch (error) {
      console.error("Error auditing poster agent:", error)
    }

    // 计算总体合规性
    const overallCompliance = this.calculateOverallCompliance(results)

    return {
      timestamp: Date.now(),
      totalAgents: results.length,
      compliantAgents: results.filter((r) => r.isCompliant).length,
      overallScore: overallCompliance.score,
      isCompliant: overallCompliance.isCompliant,
      reports: results,
      recommendations: this.generateOverallRecommendations(results),
    }
  }

  /**
   * 审计对话智能体
   */
  private async auditConversationAgent(): Promise<ComplianceReport> {
    const threadId = `audit-conversation-${Date.now()}`
    const adapter = new ConversationAgentAdapter(threadId, { debug: true })

    try {
      // 初始化智能体（使用默认配置）
      const agent = await adapter.initialize("test-app-id", "test-api-key")

      // 模拟对话流程
      const events: AgUIEvent[] = []
      const messages: Message[] = []

      // 订阅事件
      const subscription = adapter.getEventStream().subscribe((event) => {
        events.push(event)
      })

      // 订阅消息
      const messageSubscription = adapter.getMessagesStream().subscribe((msgs) => {
        messages.splice(0, messages.length, ...msgs)
      })

      // 发送测试消息
      await adapter.sendMessage("你好，这是一个测试消息")

      // 等待处理完成
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // 清理订阅
      subscription.unsubscribe()
      messageSubscription.unsubscribe()

      // 生成合规性报告
      const report = AgentComplianceChecker.generateComplianceReport("conversation", agent, events, messages)

      // 清理资源
      adapter.dispose()

      return report
    } catch (error) {
      console.error("Error in conversation agent audit:", error)
      throw error
    }
  }

  /**
   * 审计CAD智能体
   */
  private async auditCADAgent(): Promise<ComplianceReport> {
    const threadId = `audit-cad-${Date.now()}`
    const adapter = new CADAgentAdapter(threadId, { debug: true })

    try {
      // 初始化智能体
      const agent = await adapter.initialize()

      // 模拟CAD分析流程
      const events: AgUIEvent[] = []
      const messages: Message[] = []

      // 订阅事件
      const subscription = adapter.getEventStream().subscribe((event) => {
        events.push(event)
      })

      // 订阅消息
      const messageSubscription = adapter.getMessagesStream().subscribe((msgs) => {
        messages.splice(0, messages.length, ...msgs)
      })

      // 创建模拟CAD文件
      const mockCADFile = new File(["mock cad content"], "test.dwg", { type: "application/dwg" })

      // 分析CAD文件
      await adapter.analyzeCADFile(mockCADFile, "full")

      // 等待处理完成
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // 清理订阅
      subscription.unsubscribe()
      messageSubscription.unsubscribe()

      // 生成合规性报告
      const report = AgentComplianceChecker.generateComplianceReport("cad", agent, events, messages)

      // 清理资源
      adapter.dispose()

      return report
    } catch (error) {
      console.error("Error in CAD agent audit:", error)
      throw error
    }
  }

  /**
   * 审计海报智能体
   */
  private async auditPosterAgent(): Promise<ComplianceReport> {
    const threadId = `audit-poster-${Date.now()}`
    const adapter = new PosterAgentAdapter(threadId, { debug: true })

    try {
      // 初始化智能体
      const agent = await adapter.initialize()

      // 模拟海报生成流程
      const events: AgUIEvent[] = []
      const messages: Message[] = []

      // 订阅事件
      const subscription = adapter.getEventStream().subscribe((event) => {
        events.push(event)
      })

      // 订阅消息
      const messageSubscription = adapter.getMessagesStream().subscribe((msgs) => {
        messages.splice(0, messages.length, ...msgs)
      })

      // 生成海报
      await adapter.generatePoster("创建一个现代风格的企业宣传海报", {
        style: "modern",
        size: "A4",
        colors: ["#6cb33f", "#ffffff", "#333333"],
      })

      // 等待处理完成
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // 清理订阅
      subscription.unsubscribe()
      messageSubscription.unsubscribe()

      // 生成合规性报告
      const report = AgentComplianceChecker.generateComplianceReport("poster", agent, events, messages)

      // 清理资源
      adapter.dispose()

      return report
    } catch (error) {
      console.error("Error in poster agent audit:", error)
      throw error
    }
  }

  /**
   * 计算总体合规性
   */
  private calculateOverallCompliance(reports: ComplianceReport[]): { score: number; isCompliant: boolean } {
    if (reports.length === 0) {
      return { score: 0, isCompliant: false }
    }

    const totalScore = reports.reduce((sum, report) => sum + report.overallScore, 0)
    const averageScore = Math.round(totalScore / reports.length)
    const isCompliant = reports.every((report) => report.isCompliant)

    return { score: averageScore, isCompliant }
  }

  /**
   * 生成总体建议
   */
  private generateOverallRecommendations(reports: ComplianceReport[]): string[] {
    const recommendations: string[] = []

    const nonCompliantAgents = reports.filter((r) => !r.isCompliant)
    if (nonCompliantAgents.length > 0) {
      recommendations.push(`${nonCompliantAgents.length}个智能体不符合AG-UI协议，需要立即修复`)
    }

    const lowScoreAgents = reports.filter((r) => r.overallScore < 80)
    if (lowScoreAgents.length > 0) {
      recommendations.push(`${lowScoreAgents.length}个智能体合规性评分较低，建议优化`)
    }

    const commonIssues = this.findCommonIssues(reports)
    if (commonIssues.length > 0) {
      recommendations.push(`常见问题：${commonIssues.join("、")}`)
    }

    if (recommendations.length === 0) {
      recommendations.push("所有智能体都符合AG-UI协议，表现良好")
    }

    return recommendations
  }

  /**
   * 查找常见问题
   */
  private findCommonIssues(reports: ComplianceReport[]): string[] {
    const issueCount: Map<string, number> = new Map()

    for (const report of reports) {
      const allErrors = [...report.definitionCompliance.errors, ...report.runtimeCompliance.errors]
      const allWarnings = [...report.definitionCompliance.warnings, ...report.runtimeCompliance.warnings]

      for (const error of allErrors) {
        issueCount.set(error, (issueCount.get(error) || 0) + 1)
      }

      for (const warning of allWarnings) {
        issueCount.set(warning, (issueCount.get(warning) || 0) + 1)
      }
    }

    // 返回出现次数超过1次的问题
    return Array.from(issueCount.entries())
      .filter(([, count]) => count > 1)
      .map(([issue]) => issue)
  }

  /**
   * 获取审计报告
   */
  getReport(agentType: string): ComplianceReport | undefined {
    return this.reports.get(agentType)
  }

  /**
   * 获取所有报告
   */
  getAllReports(): ComplianceReport[] {
    return Array.from(this.reports.values())
  }

  /**
   * 导出审计结果
   */
  exportAuditResults(): string {
    const auditData = {
      timestamp: Date.now(),
      reports: Array.from(this.reports.entries()).map(([type, report]) => ({
        agentType: type,
        ...report,
      })),
    }

    return JSON.stringify(auditData, null, 2)
  }
}

// 类型定义
export interface ComplianceAuditResult {
  timestamp: number
  totalAgents: number
  compliantAgents: number
  overallScore: number
  isCompliant: boolean
  reports: ComplianceReport[]
  recommendations: string[]
}
