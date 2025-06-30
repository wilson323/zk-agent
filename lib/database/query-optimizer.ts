/**
 * @file Query Performance Optimizer
 * @description 查询性能优化器 - 第一阶段优化实现
 * @author ZK-Agent Team
 * @date 2024-12-19
 * @version 1.0.0
 */

import { EventEmitter } from 'events'
import { Logger } from '../utils/logger'
import { DatabaseMetrics, QueryCacheConfig } from './unified-interfaces'

/**
 * 查询统计信息接口
 */
interface QueryStats {
  /** 查询SQL */
  sql: string
  /** 执行次数 */
  executionCount: number
  /** 总执行时间(ms) */
  totalExecutionTime: number
  /** 平均执行时间(ms) */
  avgExecutionTime: number
  /** 最大执行时间(ms) */
  maxExecutionTime: number
  /** 最小执行时间(ms) */
  minExecutionTime: number
  /** 最后执行时间 */
  lastExecuted: Date
  /** 错误次数 */
  errorCount: number
  /** 查询类型 */
  queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'OTHER'
  /** 影响行数 */
  affectedRows?: number
}

/**
 * 慢查询信息接口
 */
interface SlowQuery {
  /** 查询SQL */
  sql: string
  /** 执行时间(ms) */
  executionTime: number
  /** 执行时间戳 */
  timestamp: Date
  /** 查询参数 */
  parameters?: any[]
  /** 执行计划 */
  executionPlan?: string
  /** 建议优化方案 */
  suggestions?: string[]
}

/**
 * 查询优化建议接口
 */
interface OptimizationSuggestion {
  /** 建议类型 */
  type: 'INDEX' | 'QUERY_REWRITE' | 'SCHEMA_CHANGE' | 'CACHE' | 'PARTITION'
  /** 建议描述 */
  description: string
  /** 优先级 */
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  /** 预期改进 */
  expectedImprovement: string
  /** 实施复杂度 */
  complexity: 'LOW' | 'MEDIUM' | 'HIGH'
  /** 相关查询 */
  relatedQueries: string[]
}

/**
 * 查询缓存配置接口
 */
// QueryCacheConfig 接口已迁移到 unified-interfaces.ts

/**
 * 查询性能优化器
 * 实现第一阶段优化目标：
 * - 识别和优化慢查询
 * - 实现查询结果缓存
 * - 提供查询性能分析
 * - 自动生成索引建议
 * - 查询执行计划分析
 */
export class QueryOptimizer extends EventEmitter {
  private logger: Logger
  private queryStats: Map<string, QueryStats> = new Map()
  private slowQueries: SlowQuery[] = []
  private optimizationSuggestions: OptimizationSuggestion[] = []
  private cacheConfig: QueryCacheConfig
  private queryCache: Map<string, { data: any; timestamp: Date; ttl: number }> = new Map()
  private slowQueryThreshold: number = 1000 // 1秒
  private isAnalyzing: boolean = false

  constructor(cacheConfig?: Partial<QueryCacheConfig>) {
    super()
    this.logger = new Logger('QueryOptimizer')
    this.cacheConfig = {
      enabled: true,
      maxSize: 1000,
      ttl: 300, // 5分钟
      keyPrefix: 'query_cache:',
      cacheEmptyResults: false,
      ...cacheConfig
    }
    
    // 启动定期清理任务
    this.startCleanupTasks()
    
    this.logger.info('查询性能优化器已初始化', {
      cacheConfig: this.cacheConfig,
      slowQueryThreshold: this.slowQueryThreshold
    })
  }

  /**
   * 记录查询执行信息
   * @param sql 查询SQL
   * @param executionTime 执行时间(ms)
   * @param error 是否有错误
   * @param affectedRows 影响行数
   * @param parameters 查询参数
   */
  public recordQuery(
    sql: string,
    executionTime: number,
    error: boolean = false,
    affectedRows?: number,
    parameters?: any[]
  ): void {
    const normalizedSql = this.normalizeSql(sql)
    const queryType = this.getQueryType(sql)
    
    // 更新查询统计
    const stats = this.queryStats.get(normalizedSql) || {
      sql: normalizedSql,
      executionCount: 0,
      totalExecutionTime: 0,
      avgExecutionTime: 0,
      maxExecutionTime: 0,
      minExecutionTime: Infinity,
      lastExecuted: new Date(),
      errorCount: 0,
      queryType,
      affectedRows: 0
    }
    
    stats.executionCount++
    stats.totalExecutionTime += executionTime
    stats.avgExecutionTime = stats.totalExecutionTime / stats.executionCount
    stats.maxExecutionTime = Math.max(stats.maxExecutionTime, executionTime)
    stats.minExecutionTime = Math.min(stats.minExecutionTime, executionTime)
    stats.lastExecuted = new Date()
    
    if (error) {
      stats.errorCount++
    }
    
    if (affectedRows !== undefined) {
      stats.affectedRows = (stats.affectedRows || 0) + affectedRows
    }
    
    this.queryStats.set(normalizedSql, stats)
    
    // 检查是否为慢查询
    if (executionTime > this.slowQueryThreshold) {
      this.recordSlowQuery(sql, executionTime, parameters)
    }
    
    // 触发查询记录事件
    this.emit('query_recorded', {
      sql: normalizedSql,
      executionTime,
      error,
      queryType
    })
  }

  /**
   * 记录慢查询
   * @param sql 查询SQL
   * @param executionTime 执行时间
   * @param parameters 查询参数
   */
  private recordSlowQuery(
    sql: string,
    executionTime: number,
    parameters?: any[]
  ): void {
    const slowQuery: SlowQuery = {
      sql,
      executionTime,
      timestamp: new Date(),
      parameters,
      suggestions: this.generateQuerySuggestions(sql)
    }
    
    this.slowQueries.push(slowQuery)
    
    // 限制慢查询记录数量
    if (this.slowQueries.length > 500) {
      this.slowQueries = this.slowQueries.slice(-250)
    }
    
    this.logger.warn('检测到慢查询', {
      sql: this.truncateSql(sql),
      executionTime,
      suggestions: slowQuery.suggestions
    })
    
    // 触发慢查询事件
    this.emit('slow_query_detected', slowQuery)
  }

  /**
   * 生成查询优化建议
   * @param sql 查询SQL
   * @returns 优化建议数组
   */
  private generateQuerySuggestions(sql: string): string[] {
    const suggestions: string[] = []
    const lowerSql = sql.toLowerCase()
    
    // 检查是否缺少索引
    if (lowerSql.includes('where') && !lowerSql.includes('index')) {
      suggestions.push('考虑在WHERE子句中的列上添加索引')
    }
    
    // 检查是否使用了SELECT *
    if (lowerSql.includes('select *')) {
      suggestions.push('避免使用SELECT *，只选择需要的列')
    }
    
    // 检查是否有子查询可以优化
    if (lowerSql.includes('select') && lowerSql.split('select').length > 2) {
      suggestions.push('考虑将子查询重写为JOIN操作')
    }
    
    // 检查是否使用了LIKE '%...%'
    if (lowerSql.includes("like '%") && lowerSql.includes("%'")) {
      suggestions.push('避免在LIKE操作中使用前导通配符')
    }
    
    // 检查是否有ORDER BY但没有LIMIT
    if (lowerSql.includes('order by') && !lowerSql.includes('limit')) {
      suggestions.push('考虑添加LIMIT子句限制结果集大小')
    }
    
    // 检查是否使用了函数在WHERE子句中
    if (lowerSql.match(/where.*\w+\s*\(/)) {
      suggestions.push('避免在WHERE子句中对列使用函数')
    }
    
    return suggestions
  }

  /**
   * 规范化SQL语句（移除参数值，保留结构）
   * @param sql 原始SQL
   * @returns 规范化后的SQL
   */
  private normalizeSql(sql: string): string {
    return sql
      .replace(/\s+/g, ' ') // 合并多个空格
      .replace(/'[^']*'/g, '?') // 替换字符串字面量
      .replace(/\b\d+\b/g, '?') // 替换数字字面量
      .replace(/\$\d+/g, '?') // 替换参数占位符
      .trim()
      .toLowerCase()
  }

  /**
   * 获取查询类型
   * @param sql 查询SQL
   * @returns 查询类型
   */
  private getQueryType(sql: string): QueryStats['queryType'] {
    const lowerSql = sql.toLowerCase().trim()
    
    if (lowerSql.startsWith('select')) return 'SELECT'
    if (lowerSql.startsWith('insert')) return 'INSERT'
    if (lowerSql.startsWith('update')) return 'UPDATE'
    if (lowerSql.startsWith('delete')) return 'DELETE'
    
    return 'OTHER'
  }

  /**
   * 截断SQL用于日志显示
   * @param sql 原始SQL
   * @param maxLength 最大长度
   * @returns 截断后的SQL
   */
  private truncateSql(sql: string, maxLength: number = 200): string {
    if (sql.length <= maxLength) return sql
    return sql.substring(0, maxLength) + '...'
  }

  /**
   * 获取查询统计信息
   * @param limit 返回数量限制
   * @returns 查询统计数组
   */
  public getQueryStats(limit: number = 50): QueryStats[] {
    return Array.from(this.queryStats.values())
      .sort((a, b) => b.avgExecutionTime - a.avgExecutionTime)
      .slice(0, limit)
  }

  /**
   * 获取慢查询列表
   * @param limit 返回数量限制
   * @returns 慢查询数组
   */
  public getSlowQueries(limit: number = 50): SlowQuery[] {
    return this.slowQueries
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, limit)
  }

  /**
   * 获取查询性能报告
   * @returns 性能报告
   */
  public getPerformanceReport() {
    const totalQueries = Array.from(this.queryStats.values())
      .reduce((sum, stats) => sum + stats.executionCount, 0)
    
    const totalErrors = Array.from(this.queryStats.values())
      .reduce((sum, stats) => sum + stats.errorCount, 0)
    
    const avgExecutionTime = Array.from(this.queryStats.values())
      .reduce((sum, stats) => sum + stats.avgExecutionTime, 0) / this.queryStats.size
    
    const slowQueryCount = this.slowQueries.length
    const slowQueryRate = totalQueries > 0 ? (slowQueryCount / totalQueries * 100) : 0
    
    const topSlowQueries = this.getSlowQueries(10)
    const topFrequentQueries = Array.from(this.queryStats.values())
      .sort((a, b) => b.executionCount - a.executionCount)
      .slice(0, 10)
    
    const queryTypeDistribution = Array.from(this.queryStats.values())
      .reduce((dist, stats) => {
        dist[stats.queryType] = (dist[stats.queryType] || 0) + stats.executionCount
        return dist
      }, {} as Record<string, number>)
    
    return {
      summary: {
        totalQueries,
        totalErrors,
        errorRate: totalQueries > 0 ? (totalErrors / totalQueries * 100) : 0,
        avgExecutionTime: avgExecutionTime || 0,
        slowQueryCount,
        slowQueryRate,
        uniqueQueries: this.queryStats.size
      },
      topSlowQueries,
      topFrequentQueries,
      queryTypeDistribution,
      cacheStats: this.getCacheStats(),
      optimizationSuggestions: this.getOptimizationSuggestions()
    }
  }

  /**
   * 生成优化建议
   * @returns 优化建议数组
   */
  public getOptimizationSuggestions(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []
    
    // 分析慢查询生成索引建议
    const slowQueryPatterns = this.analyzeSlowQueryPatterns()
    suggestions.push(...slowQueryPatterns)
    
    // 分析频繁查询生成缓存建议
    const cacheableSuggestions = this.analyzeCacheableQueries()
    suggestions.push(...cacheableSuggestions)
    
    // 分析查询模式生成重写建议
    const rewriteSuggestions = this.analyzeQueryRewriteOpportunities()
    suggestions.push(...rewriteSuggestions)
    
    return suggestions.sort((a, b) => {
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  /**
   * 分析慢查询模式
   * @returns 索引建议
   */
  private analyzeSlowQueryPatterns(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []
    
    // 分析WHERE子句中的列
    const whereColumns = new Map<string, number>()
    
    this.slowQueries.forEach(query => {
      const whereMatch = query.sql.match(/where\s+([\w.]+)/gi)
      if (whereMatch) {
        whereMatch.forEach(match => {
          const column = match.replace(/where\s+/i, '')
          whereColumns.set(column, (whereColumns.get(column) || 0) + 1)
        })
      }
    })
    
    // 为频繁出现在WHERE子句中的列建议索引
    whereColumns.forEach((count, column) => {
      if (count >= 3) {
        suggestions.push({
          type: 'INDEX',
          description: `为列 ${column} 创建索引以提升查询性能`,
          priority: count >= 10 ? 'HIGH' : count >= 5 ? 'MEDIUM' : 'LOW',
          expectedImprovement: '查询时间可能减少50-90%',
          complexity: 'LOW',
          relatedQueries: this.slowQueries
            .filter(q => q.sql.toLowerCase().includes(column.toLowerCase()))
            .map(q => this.truncateSql(q.sql))
            .slice(0, 5)
        })
      }
    })
    
    return suggestions
  }

  /**
   * 分析可缓存的查询
   * @returns 缓存建议
   */
  private analyzeCacheableQueries(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []
    
    // 查找频繁执行的SELECT查询
    const frequentSelects = Array.from(this.queryStats.values())
      .filter(stats => 
        stats.queryType === 'SELECT' && 
        stats.executionCount >= 10 &&
        stats.avgExecutionTime > 100
      )
      .sort((a, b) => b.executionCount - a.executionCount)
      .slice(0, 5)
    
    frequentSelects.forEach(stats => {
      suggestions.push({
        type: 'CACHE',
        description: `为频繁执行的查询启用结果缓存`,
        priority: stats.executionCount >= 50 ? 'HIGH' : 'MEDIUM',
        expectedImprovement: `响应时间可能减少${stats.avgExecutionTime}ms`,
        complexity: 'LOW',
        relatedQueries: [this.truncateSql(stats.sql)]
      })
    })
    
    return suggestions
  }

  /**
   * 分析查询重写机会
   * @returns 重写建议
   */
  private analyzeQueryRewriteOpportunities(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []
    
    // 查找使用SELECT *的查询
    const selectAllQueries = Array.from(this.queryStats.values())
      .filter(stats => stats.sql.includes('select *'))
    
    if (selectAllQueries.length > 0) {
      suggestions.push({
        type: 'QUERY_REWRITE',
        description: '将SELECT *查询重写为只选择需要的列',
        priority: 'MEDIUM',
        expectedImprovement: '减少网络传输和内存使用',
        complexity: 'MEDIUM',
        relatedQueries: selectAllQueries.map(q => this.truncateSql(q.sql)).slice(0, 5)
      })
    }
    
    return suggestions
  }

  /**
   * 获取缓存统计信息
   * @returns 缓存统计
   */
  public getCacheStats() {
    const totalEntries = this.queryCache.size
    const expiredEntries = Array.from(this.queryCache.values())
      .filter(entry => Date.now() - entry.timestamp.getTime() > entry.ttl * 1000)
      .length
    
    return {
      enabled: this.cacheConfig.enabled,
      totalEntries,
      expiredEntries,
      hitRate: 0, // 需要实际实现命中率统计
      memoryUsage: this.estimateCacheMemoryUsage()
    }
  }

  /**
   * 估算缓存内存使用
   * @returns 内存使用估算(字节)
   */
  private estimateCacheMemoryUsage(): number {
    let totalSize = 0
    
    this.queryCache.forEach((entry, key) => {
      totalSize += key.length * 2 // 字符串键的大小
      totalSize += JSON.stringify(entry.data).length * 2 // 数据的大小
      totalSize += 64 // 其他元数据的估算大小
    })
    
    return totalSize
  }

  /**
   * 启动清理任务
   */
  private startCleanupTasks(): void {
    // 每5分钟清理过期缓存
    setInterval(() => {
      this.cleanupExpiredCache()
    }, 5 * 60 * 1000)
    
    // 每小时清理旧的查询统计
    setInterval(() => {
      this.cleanupOldStats()
    }, 60 * 60 * 1000)
  }

  /**
   * 清理过期缓存
   */
  private cleanupExpiredCache(): void {
    const now = Date.now()
    let cleanedCount = 0
    
    this.queryCache.forEach((entry, key) => {
      if (now - entry.timestamp.getTime() > entry.ttl * 1000) {
        this.queryCache.delete(key)
        cleanedCount++
      }
    })
    
    if (cleanedCount > 0) {
      this.logger.debug(`清理了${cleanedCount}个过期缓存条目`)
    }
  }

  /**
   * 清理旧的统计数据
   */
  private cleanupOldStats(): void {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    // 清理旧的慢查询记录
    const oldSlowQueryCount = this.slowQueries.length
    this.slowQueries = this.slowQueries.filter(
      query => query.timestamp > oneDayAgo
    )
    
    const cleanedSlowQueries = oldSlowQueryCount - this.slowQueries.length
    
    if (cleanedSlowQueries > 0) {
      this.logger.debug(`清理了${cleanedSlowQueries}个旧的慢查询记录`)
    }
  }

  /**
   * 设置慢查询阈值
   * @param threshold 阈值(毫秒)
   */
  public setSlowQueryThreshold(threshold: number): void {
    this.slowQueryThreshold = threshold
    this.logger.info(`慢查询阈值已设置为${threshold}ms`)
  }

  /**
   * 清除所有统计数据
   */
  public clearStats(): void {
    this.queryStats.clear()
    this.slowQueries = []
    this.queryCache.clear()
    this.optimizationSuggestions = []
    
    this.logger.info('所有查询统计数据已清除')
    this.emit('stats_cleared')
  }

  /**
   * 销毁优化器
   */
  public destroy(): void {
    this.clearStats()
    this.removeAllListeners()
    this.logger.info('查询性能优化器已销毁')
  }
}

// 导出单例实例
export const queryOptimizer = new QueryOptimizer()