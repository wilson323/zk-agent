/**
 * @file Error Tracker
 * @description 错误追踪和分析系统
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

import { EventEmitter } from 'events'
import { DatabaseService } from '@/lib/database'
import { LogLevel } from '@prisma/client'

// 错误上下文接口
export interface ErrorContext {
  userId?: string
  sessionId?: string
  requestId?: string
  userAgent?: string
  ip?: string
  url?: string
  method?: string
  headers?: Record<string, string>
  body?: any
  query?: Record<string, string>
  timestamp: Date
}

// 错误分析结果接口
export interface ErrorAnalysis {
  errorType: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  frequency: number
  firstOccurrence: Date
  lastOccurrence: Date
  affectedUsers: number
  commonPatterns: string[]
  suggestedActions: string[]
}

// 错误统计接口
export interface ErrorStats {
  totalErrors: number
  errorsByLevel: Record<LogLevel, number>
  errorsByType: Record<string, number>
  errorRate: number
  mttr: number // Mean Time To Resolution
  unresolvedErrors: number
}

// 错误追踪器类
export class ErrorTracker extends EventEmitter {
  private errorCache: Map<string, any[]> = new Map()
  private analysisCache: Map<string, ErrorAnalysis> = new Map()
  private isTracking: boolean = false
  private cacheCleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    super()
    this.startCacheCleanup()
  }

  /**
   * 开始错误追踪
   */
  startTracking(): void {
    if (this.isTracking) {
      console.warn('Error tracking is already running')
      return
    }

    this.isTracking = true
    console.log('Starting error tracking...')
    this.emit('trackingStarted')
  }

  /**
   * 停止错误追踪
   */
  stopTracking(): void {
    if (!this.isTracking) {
      return
    }

    this.isTracking = false
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval)
      this.cacheCleanupInterval = null
    }

    console.log('Error tracking stopped')
    this.emit('trackingStopped')
  }

  /**
   * 记录错误
   */
  async trackError(
    error: Error,
    level: LogLevel = LogLevel.ERROR,
    context?: Partial<ErrorContext>
  ): Promise<void> {
    if (!this.isTracking) {
      return
    }

    try {
      const errorData = {
        message: error.message,
        stack: error.stack,
        name: error.name,
        level,
        context: {
          timestamp: new Date(),
          ...context
        },
        fingerprint: this.generateErrorFingerprint(error)
      }

      // 保存到数据库
      await this.saveErrorToDatabase(errorData)

      // 缓存错误用于分析
      this.cacheError(errorData)

      // 触发事件
      this.emit('errorTracked', errorData)

      // 实时分析
      await this.analyzeError(errorData)

      // 检查是否需要告警
      this.checkErrorAlerts(errorData)

    } catch (trackingError) {
      console.error('Failed to track error:', trackingError)
      this.emit('trackingError', trackingError)
    }
  }

  /**
   * 获取错误统计
   */
  async getErrorStats(timeRangeMs: number = 86400000): Promise<ErrorStats> {
    try {
      const prisma = DatabaseService.getInstance()
      const cutoffTime = new Date(Date.now() - timeRangeMs)

      const errors = await prisma.errorLog.findMany({
        where: {
          createdAt: {
            gte: cutoffTime
          }
        }
      })

      const totalErrors = errors.length
      const unresolvedErrors = errors.filter(e => !e.resolved).length
      const errorsByLevel = errors.reduce((acc, error) => {
        acc[error.level] = (acc[error.level] || 0) + 1
        return acc
      }, {} as Record<LogLevel, number>)

      const errorsByType = errors.reduce((acc, error) => {
        const type = this.extractErrorType(error.message)
        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const timeRangeHours = timeRangeMs / (1000 * 60 * 60)
      const errorRate = totalErrors / timeRangeHours

      // 计算MTTR（简化版本）
      const resolvedErrors = errors.filter(e => e.resolved)
      const mttr = resolvedErrors.length > 0 ? 
        resolvedErrors.reduce((acc, error) => {
          // 假设解决时间为创建后24小时（实际应该有解决时间字段）
          return acc + 24
        }, 0) / resolvedErrors.length : 0

      return {
        totalErrors,
        errorsByLevel,
        errorsByType,
        errorRate,
        mttr,
        unresolvedErrors
      }
    } catch (error) {
      console.error('Failed to get error stats:', error)
      throw error
    }
  }

  /**
   * 分析错误模式
   */
  async analyzeErrorPatterns(timeRangeMs: number = 86400000): Promise<ErrorAnalysis[]> {
    try {
      const prisma = DatabaseService.getInstance()
      const cutoffTime = new Date(Date.now() - timeRangeMs)

      const errors = await prisma.errorLog.findMany({
        where: {
          createdAt: {
            gte: cutoffTime
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      const errorGroups = this.groupErrorsByPattern(errors)
      const analyses: ErrorAnalysis[] = []

      for (const [pattern, groupErrors] of errorGroups.entries()) {
        const analysis = await this.analyzeErrorGroup(pattern, groupErrors)
        analyses.push(analysis)
      }

      return analyses.sort((a, b) => b.frequency - a.frequency)
    } catch (error) {
      console.error('Failed to analyze error patterns:', error)
      throw error
    }
  }

  /**
   * 标记错误为已解决
   */
  async resolveError(errorId: string, resolvedBy?: string): Promise<void> {
    try {
      const prisma = DatabaseService.getInstance()
      await prisma.errorLog.update({
        where: { id: errorId },
        data: {
          resolved: true,
          metadata: {
            resolvedAt: new Date().toISOString(),
            resolvedBy
          }
        }
      })

      this.emit('errorResolved', { errorId, resolvedBy })
    } catch (error) {
      console.error('Failed to resolve error:', error)
      throw error
    }
  }

  /**
   * 生成错误指纹
   */
  private generateErrorFingerprint(error: Error): string {
    const key = `${error.name}:${error.message}:${this.extractStackSignature(error.stack)}`
    return Buffer.from(key).toString('base64').substring(0, 16)
  }

  /**
   * 提取堆栈签名
   */
  private extractStackSignature(stack?: string): string {
    if (!stack) {return 'no-stack'}
    
    const lines = stack.split('\n').slice(1, 4) // 取前3行堆栈
    return lines.map(line => {
      const match = line.match(/at\s+([^\s]+)/)
      return match ? match[1] : 'unknown'
    }).join(':')
  }

  /**
   * 保存错误到数据库
   */
  private async saveErrorToDatabase(errorData: any): Promise<void> {
    const prisma = DatabaseService.getInstance()
    await prisma.errorLog.create({
      data: {
        level: errorData.level,
        message: errorData.message,
        stack: errorData.stack,
        userId: errorData.context.userId,
        metadata: {
          fingerprint: errorData.fingerprint,
          context: errorData.context,
          name: errorData.name
        }
      }
    })
  }

  /**
   * 缓存错误用于分析
   */
  private cacheError(errorData: any): void {
    const fingerprint = errorData.fingerprint
    if (!this.errorCache.has(fingerprint)) {
      this.errorCache.set(fingerprint, [])
    }
    this.errorCache.get(fingerprint)!.push(errorData)
  }

  /**
   * 分析单个错误
   */
  private async analyzeError(errorData: any): Promise<void> {
    const fingerprint = errorData.fingerprint
    const cachedErrors = this.errorCache.get(fingerprint) || []
    
    if (cachedErrors.length >= 5) { // 当同类错误达到5次时进行分析
      const analysis = await this.analyzeErrorGroup(fingerprint, cachedErrors)
      this.analysisCache.set(fingerprint, analysis)
      this.emit('errorAnalyzed', analysis)
    }
  }

  /**
   * 分析错误组
   */
  private async analyzeErrorGroup(pattern: string, errors: any[]): Promise<ErrorAnalysis> {
    const errorType = this.extractErrorType(errors[0].message)
    const severity = this.determineSeverity(errors)
    const affectedUsers = new Set(errors.map(e => e.context.userId).filter(Boolean)).size
    
    return {
      errorType,
      severity,
      frequency: errors.length,
      firstOccurrence: new Date(Math.min(...errors.map(e => e.context.timestamp.getTime()))),
      lastOccurrence: new Date(Math.max(...errors.map(e => e.context.timestamp.getTime()))),
      affectedUsers,
      commonPatterns: this.extractCommonPatterns(errors),
      suggestedActions: this.generateSuggestedActions(errorType, errors)
    }
  }

  /**
   * 按模式分组错误
   */
  private groupErrorsByPattern(errors: any[]): Map<string, any[]> {
    const groups = new Map<string, any[]>()
    
    for (const error of errors) {
      const pattern = this.extractErrorType(error.message)
      if (!groups.has(pattern)) {
        groups.set(pattern, [])
      }
      groups.get(pattern)!.push(error)
    }
    
    return groups
  }

  /**
   * 提取错误类型
   */
  private extractErrorType(message: string): string {
    if (message.includes('database') || message.includes('connection')) {return 'DATABASE_ERROR'}
    if (message.includes('timeout')) {return 'TIMEOUT_ERROR'}
    if (message.includes('permission') || message.includes('unauthorized')) {return 'AUTH_ERROR'}
    if (message.includes('validation')) {return 'VALIDATION_ERROR'}
    if (message.includes('network') || message.includes('fetch')) {return 'NETWORK_ERROR'}
    return 'UNKNOWN_ERROR'
  }

  /**
   * 确定错误严重程度
   */
  private determineSeverity(errors: any[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const frequency = errors.length
    const hasHighLevelErrors = errors.some(e => e.level === LogLevel.FATAL || e.level === LogLevel.ERROR)
    const affectedUsers = new Set(errors.map(e => e.context.userId).filter(Boolean)).size
    
    if (frequency > 100 || affectedUsers > 50 || hasHighLevelErrors) {return 'CRITICAL'}
    if (frequency > 50 || affectedUsers > 20) {return 'HIGH'}
    if (frequency > 10 || affectedUsers > 5) {return 'MEDIUM'}
    return 'LOW'
  }

  /**
   * 提取通用模式
   */
  private extractCommonPatterns(errors: any[]): string[] {
    const patterns: string[] = []
    
    // 分析URL模式
    const urls = errors.map(e => e.context.url).filter(Boolean)
    if (urls.length > 0) {
      const commonUrl = this.findMostCommon(urls)
      if (commonUrl) {patterns.push(`Common URL: ${commonUrl}`)}
    }
    
    // 分析用户代理模式
    const userAgents = errors.map(e => e.context.userAgent).filter(Boolean)
    if (userAgents.length > 0) {
      const commonUA = this.findMostCommon(userAgents)
      if (commonUA) {patterns.push(`Common User Agent: ${commonUA}`)}
    }
    
    return patterns
  }

  /**
   * 生成建议操作
   */
  private generateSuggestedActions(errorType: string, errors: any[]): string[] {
    const actions: string[] = []
    
    switch (errorType) {
      case 'DATABASE_ERROR':
        actions.push('检查数据库连接状态')
        actions.push('验证数据库查询语法')
        actions.push('检查数据库性能指标')
        break
      case 'TIMEOUT_ERROR':
        actions.push('增加超时时间配置')
        actions.push('优化查询性能')
        actions.push('检查网络连接')
        break
      case 'AUTH_ERROR':
        actions.push('验证认证配置')
        actions.push('检查权限设置')
        actions.push('更新访问令牌')
        break
      case 'VALIDATION_ERROR':
        actions.push('检查输入验证规则')
        actions.push('更新数据格式要求')
        actions.push('改进错误消息')
        break
      default:
        actions.push('查看详细错误日志')
        actions.push('联系技术支持')
    }
    
    return actions
  }

  /**
   * 找到最常见的值
   */
  private findMostCommon(values: string[]): string | null {
    const counts = values.reduce((acc, val) => {
      acc[val] = (acc[val] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const sorted = Object.entries(counts).sort(([,a], [,b]) => b - a)
    return sorted.length > 0 ? sorted[0][0] : null
  }

  /**
   * 检查错误告警
   */
  private checkErrorAlerts(errorData: any): void {
    const fingerprint = errorData.fingerprint
    const cachedErrors = this.errorCache.get(fingerprint) || []
    
    // 频率告警
    if (cachedErrors.length >= 10) {
      this.emit('alert', {
        type: 'HIGH_ERROR_FREQUENCY',
        message: `High frequency error detected: ${errorData.message}`,
        errorData,
        frequency: cachedErrors.length
      })
    }
    
    // 严重级别告警
    if (errorData.level === LogLevel.FATAL) {
      this.emit('alert', {
        type: 'FATAL_ERROR',
        message: `Fatal error detected: ${errorData.message}`,
        errorData
      })
    }
  }

  /**
   * 启动缓存清理
   */
  private startCacheCleanup(): void {
    this.cacheCleanupInterval = setInterval(() => {
      const cutoffTime = Date.now() - 3600000 // 1小时前
      
      for (const [fingerprint, errors] of this.errorCache.entries()) {
        const recentErrors = errors.filter(e => e.context.timestamp.getTime() > cutoffTime)
        if (recentErrors.length === 0) {
          this.errorCache.delete(fingerprint)
          this.analysisCache.delete(fingerprint)
        } else {
          this.errorCache.set(fingerprint, recentErrors)
        }
      }
    }, 300000) // 每5分钟清理一次
  }
}

// 全局错误追踪实例
export const errorTracker = new ErrorTracker()

// 中间件函数
export function errorTrackingMiddleware() {
  return (error: Error, req: any, res: any, next: any) => {
    errorTracker.trackError(error, LogLevel.ERROR, {
      userId: req.user?.id,
      sessionId: req.sessionID,
      requestId: req.id,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      url: req.url,
      method: req.method,
      headers: req.headers,
      body: req.body,
      query: req.query
    })
    
    next(error)
  }
}