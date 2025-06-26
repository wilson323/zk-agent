// @ts-nocheck
import type { AgentDefinition, Tool, Message, AgUIEvent } from "./complete-types"
import { AG_UI_PROTOCOL_VERSION } from "./complete-types"

/**
 * AG-UI协议合规性检查器
 * 确保所有智能体都遵循AG-UI协议
 */
export class AgentComplianceChecker {
  private static requiredEventTypes = [
    "run-started",
    "run-finished",
    "run-error",
    "text-message-start",
    "text-message-content",
    "text-message-end",
    "state-snapshot",
  ]

  /**
   * 检查智能体定义合规性
   */
  static checkAgentDefinition(agent: AgentDefinition): ComplianceResult {
    const errors: string[] = []
    const warnings: string[] = []

    // 检查必需字段
    if (!agent.id) {errors.push("智能体ID不能为空")}
    if (!agent.name) {errors.push("智能体名称不能为空")}
    if (!agent.description) {errors.push("智能体描述不能为空")}
    if (!agent.instructions) {errors.push("智能体指令不能为空")}
    if (!agent.model) {errors.push("智能体模型不能为空")}

    // 检查协议版本
    if (!agent.metadata?.protocolVersion) {
      warnings.push("建议指定协议版本")
    } else if (agent.metadata.protocolVersion !== AG_UI_PROTOCOL_VERSION) {
      warnings.push(`协议版本不匹配，当前: ${agent.metadata.protocolVersion}, 期望: ${AG_UI_PROTOCOL_VERSION}`)
    }

    // 检查工具定义
    if (agent.tools) {
      for (let i = 0; i < agent.tools.length; i++) {
        const tool = agent.tools[i]
        const toolErrors = this.checkToolDefinition(tool, `工具[${i}]`)
        errors.push(...toolErrors)
      }
    }

    // 检查变量定义
    if (agent.variables) {
      for (const [key, variable] of Object.entries(agent.variables)) {
        if (typeof variable !== "object") {
          errors.push(`变量 ${key} 定义格式错误`)
        }
      }
    }

    // 检查配置
    if (agent.config) {
      if (agent.config.timeout && agent.config.timeout <= 0) {
        errors.push("超时时间必须大于0")
      }
      if (agent.config.retries && agent.config.retries < 0) {
        errors.push("重试次数不能为负数")
      }
    }

    return {
      isCompliant: errors.length === 0,
      errors,
      warnings,
      score: this.calculateComplianceScore(errors, warnings),
    }
  }

  /**
   * 检查工具定义合规性
   */
  private static checkToolDefinition(tool: Tool, context: string): string[] {
    const errors: string[] = []

    if (!tool.function?.name) {
      errors.push(`${context}: 工具名称不能为空`)
    }

    if (!tool.function?.description) {
      errors.push(`${context}: 工具描述不能为空`)
    }

    if (!tool.function?.parameters) {
      errors.push(`${context}: 工具参数定义不能为空`)
    } else {
      if (tool.function.parameters.type !== "object") {
        errors.push(`${context}: 工具参数类型必须为object`)
      }

      if (!tool.function.parameters.properties) {
        errors.push(`${context}: 工具参数属性不能为空`)
      }
    }

    return errors
  }

  /**
   * 检查消息格式合规性
   */
  static checkMessageFormat(message: Message): ComplianceResult {
    const errors: string[] = []
    const warnings: string[] = []

    // 检查必需字段
    if (!message.id) {errors.push("消息ID不能为空")}
    if (!message.role) {errors.push("消息角色不能为空")}
    if (message.content === undefined || message.content === null) {
      errors.push("消息内容不能为空")
    }
    if (!message.timestamp) {errors.push("消息时间戳不能为空")}

    // 检查角色有效性
    const validRoles = ["user", "assistant", "system", "tool"]
    if (message.role && !validRoles.includes(message.role)) {
      errors.push(`无效的消息角色: ${message.role}`)
    }

    // 检查内容格式
    if (typeof message.content === "string") {
      if (message.content.length > 100000) {
        warnings.push("消息内容过长，可能影响性能")
      }
    } else if (Array.isArray(message.content)) {
      // 检查工具调用格式
      for (let i = 0; i < message.content.length; i++) {
        const item = message.content[i]
        if (!item.id || !item.type || !item.function) {
          errors.push(`工具调用[${i}]格式错误`)
        }
      }
    }

    return {
      isCompliant: errors.length === 0,
      errors,
      warnings,
      score: this.calculateComplianceScore(errors, warnings),
    }
  }

  /**
   * 检查事件格式合规性
   */
  static checkEventFormat(event: AgUIEvent): ComplianceResult {
    const errors: string[] = []
    const warnings: string[] = []

    // 检查必需字段
    if (!event.type) {errors.push("事件类型不能为空")}
    if (!event.timestamp) {errors.push("事件时间戳不能为空")}

    // 检查事件类型有效性
    const validEventTypes = [
      "run-started",
      "run-finished",
      "run-error",
      "run-cancelled",
      "run-paused",
      "run-resumed",
      "text-message-start",
      "text-message-content",
      "text-message-end",
      "image-message",
      "audio-message",
      "video-message",
      "file-message",
      "tool-call-start",
      "tool-call-args",
      "tool-call-progress",
      "tool-call-result",
      "tool-call-end",
      "state-snapshot",
      "state-delta",
      "state-reset",
      "state-validation",
      "user-input-start",
      "user-input-end",
      "user-feedback",
      "system-status",
      "system-metrics",
      "system-log",
      "collaboration-join",
      "collaboration-leave",
      "collaboration-cursor",
      "collaboration-edit",
      "custom",
    ]

    if (!validEventTypes.includes(event.type)) {
      warnings.push(`未知的事件类型: ${event.type}`)
    }

    // 检查特定事件的必需字段
    switch (event.type) {
      case "run-started":
      case "run-finished":
      case "run-error":
        if (!(event as any).threadId) {errors.push("运行事件必须包含threadId")}
        if (!(event as any).runId) {errors.push("运行事件必须包含runId")}
        break

      case "text-message-start":
      case "text-message-content":
      case "text-message-end":
        if (!(event as any).messageId) {errors.push("消息事件必须包含messageId")}
        break

      case "tool-call-start":
      case "tool-call-args":
      case "tool-call-result":
      case "tool-call-end":
        if (!(event as any).toolCallId) {errors.push("工具调用事件必须包含toolCallId")}
        break
    }

    return {
      isCompliant: errors.length === 0,
      errors,
      warnings,
      score: this.calculateComplianceScore(errors, warnings),
    }
  }

  /**
   * 检查智能体运行时合规性
   */
  static checkRuntimeCompliance(agentId: string, events: AgUIEvent[], messages: Message[]): ComplianceResult {
    const errors: string[] = []
    const warnings: string[] = []

    // 检查必需事件是否存在
    const eventTypes = new Set(events.map((e) => e.type))
    for (const requiredType of this.requiredEventTypes) {
      if (!eventTypes.has(requiredType)) {
        warnings.push(`缺少必需事件类型: ${requiredType}`)
      }
    }

    // 检查事件顺序
    const runEvents = events.filter((e) => e.type.startsWith("run-"))
    if (runEvents.length > 0) {
      const firstEvent = runEvents[0]
      const lastEvent = runEvents[runEvents.length - 1]

      if (firstEvent.type !== "run-started") {
        errors.push("运行事件序列必须以run-started开始")
      }

      if (!["run-finished", "run-error", "run-cancelled"].includes(lastEvent.type)) {
        warnings.push("运行事件序列应该以run-finished、run-error或run-cancelled结束")
      }
    }

    // 检查消息完整性
    for (const message of messages) {
      const messageCheck = this.checkMessageFormat(message)
      errors.push(...messageCheck.errors)
      warnings.push(...messageCheck.warnings)
    }

    // 检查事件完整性
    for (const event of events) {
      const eventCheck = this.checkEventFormat(event)
      errors.push(...eventCheck.errors)
      warnings.push(...eventCheck.warnings)
    }

    return {
      isCompliant: errors.length === 0,
      errors,
      warnings,
      score: this.calculateComplianceScore(errors, warnings),
    }
  }

  /**
   * 计算合规性评分
   */
  private static calculateComplianceScore(errors: string[], warnings: string[]): number {
    const errorPenalty = errors.length * 20
    const warningPenalty = warnings.length * 5
    return Math.max(0, 100 - errorPenalty - warningPenalty)
  }

  /**
   * 生成合规性报告
   */
  static generateComplianceReport(
    agentId: string,
    agentDefinition: AgentDefinition,
    events: AgUIEvent[],
    messages: Message[],
  ): ComplianceReport {
    const definitionCheck = this.checkAgentDefinition(agentDefinition)
    const runtimeCheck = this.checkRuntimeCompliance(agentId, events, messages)

    const overallScore = Math.round((definitionCheck.score + runtimeCheck.score) / 2)
    const isCompliant = definitionCheck.isCompliant && runtimeCheck.isCompliant

    return {
      agentId,
      timestamp: Date.now(),
      isCompliant,
      overallScore,
      definitionCompliance: definitionCheck,
      runtimeCompliance: runtimeCheck,
      recommendations: this.generateRecommendations(definitionCheck, runtimeCheck),
    }
  }

  /**
   * 生成改进建议
   */
  private static generateRecommendations(definitionCheck: ComplianceResult, runtimeCheck: ComplianceResult): string[] {
    const recommendations: string[] = []

    if (definitionCheck.errors.length > 0) {
      recommendations.push("修复智能体定义中的错误")
    }

    if (runtimeCheck.errors.length > 0) {
      recommendations.push("修复运行时错误")
    }

    if (definitionCheck.warnings.length > 0) {
      recommendations.push("改进智能体定义以提高合规性")
    }

    if (runtimeCheck.warnings.length > 0) {
      recommendations.push("优化运行时事件处理")
    }

    if (definitionCheck.score < 80) {
      recommendations.push("智能体定义需要重大改进")
    }

    if (runtimeCheck.score < 80) {
      recommendations.push("运行时实现需要重大改进")
    }

    return recommendations
  }
}

// 类型定义
export interface ComplianceResult {
  isCompliant: boolean
  errors: string[]
  warnings: string[]
  score: number
}

export interface ComplianceReport {
  agentId: string
  timestamp: number
  isCompliant: boolean
  overallScore: number
  definitionCompliance: ComplianceResult
  runtimeCompliance: ComplianceResult
  recommendations: string[]
}
