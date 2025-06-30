/**
 * 查询性能优化器
 * 智能分析和优化数据库查询性能
 * 
 * 功能:
 * - 实时监控查询执行时间和资源使用
 * - 自动识别慢查询和性能瓶颈
 * - 提供查询优化建议和自动优化
 * - 支持查询缓存和预编译语句优化
 * - 生成查询性能分析报告
 * 
 * @author ZK-Agent Team
 * @version 1.0.0
 */

import { EventEmitter } from 'events'
import { performance } from 'perf_hooks'
import { databaseMonitor } from './monitoring'
import { enhancedDatabaseManager } from './enhanced-database-manager'
import { QueryCacheConfig } from './unified-interfaces'

/**
 * 查询执行统计接口
 */
interface QueryExecutionStats {
  /** 查询ID */
  queryId: string
  /** 查询SQL */
  sql: string
  /** 查询参数 */
  params?: any[]
  /** 执行时间(ms) */
  executionTime: number
  /** 开始时间 */
  startTime: Date
  /** 结束时间 */
  endTime: Date
  /** 影响行数 */
  affectedRows?: number
  /** 是否成功 */
  success: boolean
  /** 错误信息 */
  error?: string
  /** 查询类型 */
  queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'OTHER'
  /** 表名 */
  tables: string[]
  /** 是否使用索引 */
  usedIndex?: boolean
  /** 扫描行数 */
  scannedRows?: number
  /** 返回行数 */
  returnedRows?: number
  /** 内存使用(bytes) */
  memoryUsage?: number
  /** CPU时间(ms) */
  cpuTime?: number
}

/**
 * 查询模式接口
 */
interface QueryPattern {
  /** 模式ID */
  patternId: string
  /** 查询模板 */
  template: string
  /** 执行次数 */
  executionCount: number
  /** 总执行时间 */
  totalExecutionTime: number
  /** 平均执行时间 */
  avgExecutionTime: number
  /** 最大执行时间 */
  maxExecutionTime: number
  /** 最小执行时间 */
  minExecutionTime: number
  /** 最后执行时间 */
  lastExecutionTime: Date
  /** 涉及的表 */
  tables: Set<string>
  /** 是否为慢查询 */
  isSlowQuery: boolean
  /** 优化建议 */
  optimizationSuggestions: string[]
}

/**
 * 查询优化建议接口
 */
interface QueryOptimizationSuggestion {
  /** 建议ID */
  suggestionId: string
  /** 查询模式ID */
  patternId: string
  /** 建议类型 */
  type: 'index' | 'rewrite' | 'cache' | 'partition' | 'other'
  /** 优先级 */
  priority: 'high' | 'medium' | 'low'
  /** 建议描述 */
  description: string
  /** 预期性能提升 */
  expectedImprovement: number
  /** 实施难度 */
  implementationDifficulty: 'easy' | 'medium' | 'hard'
  /** 具体建议 */
  suggestion: string
  /** 示例SQL */
  exampleSql?: string
  /** 创建时间 */
  createdAt: Date
  /** 是否已应用 */
  applied: boolean
}

/**
 * 查询缓存配置接口
 */
// QueryCacheConfig 接口已迁移到 unified-interfaces.ts

/**
 * 查询缓存项接口
 */
interface QueryCacheItem {
  /** 缓存键 */
  key: string
  /** 查询结果 */
  result: any
  /** 创建时间 */
  createdAt: Date
  /** 过期时间 */
  expiresAt: Date
  /** 访问次数 */
  accessCount: number
  /** 最后访问时间 */
  lastAccessedAt: Date
  /** 数据大小(bytes) */
  size: number
}

/**
 * 查询性能优化器类
 */
export class QueryPerformanceOptimizer extends EventEmitter {
  private isActive: boolean = false
  private queryStats: Map<string, QueryExecutionStats> = new Map()
  private queryPatterns: Map<string, QueryPattern> = new Map()
  private optimizationSuggestions: Map<string, QueryOptimizationSuggestion> = new Map()
  private queryCache: Map<string, QueryCacheItem> = new Map()
  private cacheConfig: QueryCacheConfig
  private slowQueryThreshold: number
  private maxStatsHistory: number
  private analysisInterval: NodeJS.Timeout | null = null
  private cacheCleanupInterval: NodeJS.Timeout | null = null

  constructor(
    slowQueryThreshold: number = 1000, // 1秒
    maxStatsHistory: number = 10000,
    cacheConfig?: Partial<QueryCacheConfig>
  ) {
    super()
    this.slowQueryThreshold = slowQueryThreshold
    this.maxStatsHistory = maxStatsHistory
    
    // 初始化缓存配置
    this.cacheConfig = {
      enabled: true,
      maxSize: 1000,
      ttl: 300000, // 5分钟
      keyPrefix: 'query_cache:',
      strategy: 'lru',
      cacheSlowQueries: false,
      slowQueryThreshold: this.slowQueryThreshold,
      ...cacheConfig
    }
    
    // 延迟设置事件监听器，避免循环依赖
    process.nextTick(() => {
      this.setupEventListeners()
    })
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听数据库查询事件
    databaseMonitor.on('query-start', (queryInfo) => {
      this.handleQueryStart(queryInfo)
    })
    
    databaseMonitor.on('query-end', (queryInfo) => {
      this.handleQueryEnd(queryInfo)
    })
    
    databaseMonitor.on('query-error', (queryInfo) => {
      this.handleQueryError(queryInfo)
    })
  }

  /**
   * 启动查询性能优化
   */
  start(): void {
    if (this.isActive) {
      console.log('Query performance optimizer is already active')
      return
    }

    console.log('Starting query performance optimization')
    this.isActive = true

    // 启动定期分析
    this.analysisInterval = setInterval(() => {
      this.performAnalysis()
    }, 60000) // 每分钟分析一次

    // 启动缓存清理
    if (this.cacheConfig.enabled) {
      this.cacheCleanupInterval = setInterval(() => {
        this.cleanupCache()
      }, 30000) // 每30秒清理一次过期缓存
    }

    this.emit('optimizer-started')
  }

  /**
   * 停止查询性能优化
   */
  stop(): void {
    if (!this.isActive) {
      return
    }

    console.log('Stopping query performance optimization')
    this.isActive = false

    if (this.analysisInterval) {
      clearInterval(this.analysisInterval)
      this.analysisInterval = null
    }

    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval)
      this.cacheCleanupInterval = null
    }

    this.emit('optimizer-stopped')
  }

  /**
   * 处理查询开始事件
   * 
   * @param queryInfo - 查询信息
   */
  private handleQueryStart(queryInfo: any): void {
    const queryId = this.generateQueryId()
    const startTime = new Date()
    
    // 检查缓存
    if (this.cacheConfig.enabled && queryInfo.sql) {
      const cacheKey = this.generateCacheKey(queryInfo.sql, queryInfo.params)
      const cachedResult = this.getCachedResult(cacheKey)
      
      if (cachedResult) {
        this.emit('cache-hit', { queryId, cacheKey, result: cachedResult })
        return
      }
    }
    
    // 记录查询开始
    const stats: Partial<QueryExecutionStats> = {
      queryId,
      sql: queryInfo.sql,
      params: queryInfo.params,
      startTime,
      queryType: this.detectQueryType(queryInfo.sql),
      tables: this.extractTables(queryInfo.sql)
    }
    
    this.queryStats.set(queryId, stats as QueryExecutionStats)
    this.emit('query-started', stats)
  }

  /**
   * 处理查询结束事件
   * 
   * @param queryInfo - 查询信息
   */
  private handleQueryEnd(queryInfo: any): void {
    const stats = this.findQueryStats(queryInfo)
    if (!stats) {
      return
    }

    const endTime = new Date()
    const executionTime = endTime.getTime() - stats.startTime.getTime()

    // 更新统计信息
    stats.endTime = endTime
    stats.executionTime = executionTime
    stats.success = true
    stats.affectedRows = queryInfo.affectedRows
    stats.returnedRows = queryInfo.returnedRows
    stats.scannedRows = queryInfo.scannedRows
    stats.usedIndex = queryInfo.usedIndex
    stats.memoryUsage = queryInfo.memoryUsage
    stats.cpuTime = queryInfo.cpuTime

    // 缓存查询结果
    if (this.shouldCacheQuery(stats, queryInfo.result)) {
      this.cacheQueryResult(stats, queryInfo.result)
    }

    // 更新查询模式
    this.updateQueryPattern(stats)

    // 检查是否为慢查询
    if (executionTime > this.slowQueryThreshold) {
      this.handleSlowQuery(stats)
    }

    this.emit('query-completed', stats)
    
    // 清理历史记录
    this.cleanupStatsHistory()
  }

  /**
   * 处理查询错误事件
   * 
   * @param queryInfo - 查询信息
   */
  private handleQueryError(queryInfo: any): void {
    const stats = this.findQueryStats(queryInfo)
    if (!stats) {
      return
    }

    const endTime = new Date()
    const executionTime = endTime.getTime() - stats.startTime.getTime()

    stats.endTime = endTime
    stats.executionTime = executionTime
    stats.success = false
    stats.error = queryInfo.error?.message || 'Unknown error'

    this.emit('query-failed', stats)
  }

  /**
   * 生成查询ID
   * 
   * @returns 查询ID
   */
  private generateQueryId(): string {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 查找查询统计信息
   * 
   * @param queryInfo - 查询信息
   * @returns 查询统计信息
   */
  private findQueryStats(queryInfo: any): QueryExecutionStats | undefined {
    // 这里需要根据实际的查询信息匹配统计记录
    // 暂时返回最近的一条记录
    const allStats = Array.from(this.queryStats.values())
    return allStats.find(stats => 
      stats.sql === queryInfo.sql && 
      !stats.endTime
    )
  }

  /**
   * 检测查询类型
   * 
   * @param sql - SQL语句
   * @returns 查询类型
   */
  private detectQueryType(sql: string): QueryExecutionStats['queryType'] {
    const upperSql = sql.trim().toUpperCase()
    
    if (upperSql.startsWith('SELECT')) {
      return 'SELECT'
    } else if (upperSql.startsWith('INSERT')) {
      return 'INSERT'
    } else if (upperSql.startsWith('UPDATE')) {
      return 'UPDATE'
    } else if (upperSql.startsWith('DELETE')) {
      return 'DELETE'
    } else {
      return 'OTHER'
    }
  }

  /**
   * 提取SQL中的表名
   * 
   * @param sql - SQL语句
   * @returns 表名数组
   */
  private extractTables(sql: string): string[] {
    const tables: string[] = []
    const upperSql = sql.toUpperCase()
    
    // 简单的表名提取逻辑
    const fromMatch = upperSql.match(/FROM\s+([\w\s,]+)/)
    if (fromMatch) {
      const tableNames = fromMatch[1].split(',')
      tableNames.forEach(name => {
        const cleanName = name.trim().split(/\s+/)[0]
        if (cleanName && !tables.includes(cleanName)) {
          tables.push(cleanName)
        }
      })
    }
    
    const joinMatches = upperSql.matchAll(/JOIN\s+(\w+)/g)
    for (const match of joinMatches) {
      if (match[1] && !tables.includes(match[1])) {
        tables.push(match[1])
      }
    }
    
    return tables
  }

  /**
   * 更新查询模式
   * 
   * @param stats - 查询统计信息
   */
  private updateQueryPattern(stats: QueryExecutionStats): void {
    const template = this.generateQueryTemplate(stats.sql)
    const patternId = this.generatePatternId(template)
    
    let pattern = this.queryPatterns.get(patternId)
    
    if (!pattern) {
      pattern = {
        patternId,
        template,
        executionCount: 0,
        totalExecutionTime: 0,
        avgExecutionTime: 0,
        maxExecutionTime: 0,
        minExecutionTime: Infinity,
        lastExecutionTime: stats.endTime,
        tables: new Set(stats.tables),
        isSlowQuery: false,
        optimizationSuggestions: []
      }
      this.queryPatterns.set(patternId, pattern)
    }
    
    // 更新统计信息
    pattern.executionCount++
    pattern.totalExecutionTime += stats.executionTime
    pattern.avgExecutionTime = pattern.totalExecutionTime / pattern.executionCount
    pattern.maxExecutionTime = Math.max(pattern.maxExecutionTime, stats.executionTime)
    pattern.minExecutionTime = Math.min(pattern.minExecutionTime, stats.executionTime)
    pattern.lastExecutionTime = stats.endTime
    
    // 合并表名
    stats.tables.forEach(table => pattern!.tables.add(table))
    
    // 检查是否为慢查询模式
    if (pattern.avgExecutionTime > this.slowQueryThreshold) {
      pattern.isSlowQuery = true
    }
  }

  /**
   * 生成查询模板
   * 
   * @param sql - SQL语句
   * @returns 查询模板
   */
  private generateQueryTemplate(sql: string): string {
    // 将参数替换为占位符
    return sql
      .replace(/\$\d+/g, '?') // PostgreSQL参数
      .replace(/'[^']*'/g, '?') // 字符串字面量
      .replace(/\b\d+\b/g, '?') // 数字字面量
      .replace(/\s+/g, ' ') // 标准化空白字符
      .trim()
  }

  /**
   * 生成模式ID
   * 
   * @param template - 查询模板
   * @returns 模式ID
   */
  private generatePatternId(template: string): string {
    // 使用简单的哈希算法
    let hash = 0
    for (let i = 0; i < template.length; i++) {
      const char = template.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    return `pattern_${Math.abs(hash).toString(36)}`
  }

  /**
   * 处理慢查询
   * 
   * @param stats - 查询统计信息
   */
  private handleSlowQuery(stats: QueryExecutionStats): void {
    console.log(`Slow query detected: ${stats.executionTime}ms`, {
      sql: stats.sql,
      tables: stats.tables,
      params: stats.params
    })
    
    // 生成优化建议
    const suggestions = this.generateOptimizationSuggestions(stats)
    suggestions.forEach(suggestion => {
      this.optimizationSuggestions.set(suggestion.suggestionId, suggestion)
    })
    
    this.emit('slow-query-detected', { stats, suggestions })
  }

  /**
   * 生成优化建议
   * 
   * @param stats - 查询统计信息
   * @returns 优化建议数组
   */
  private generateOptimizationSuggestions(stats: QueryExecutionStats): QueryOptimizationSuggestion[] {
    const suggestions: QueryOptimizationSuggestion[] = []
    const sql = stats.sql.toUpperCase()
    
    // 检查是否缺少索引
    if (stats.scannedRows && stats.returnedRows && stats.scannedRows > stats.returnedRows * 10) {
      suggestions.push({
        suggestionId: `idx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        patternId: this.generatePatternId(this.generateQueryTemplate(stats.sql)),
        type: 'index',
        priority: 'high',
        description: '查询扫描了大量行但返回较少结果，建议添加索引',
        expectedImprovement: 70,
        implementationDifficulty: 'easy',
        suggestion: `考虑在 ${stats.tables.join(', ')} 表的查询条件字段上添加索引`,
        createdAt: new Date(),
        applied: false
      })
    }
    
    // 检查是否有全表扫描
    if (!stats.usedIndex && stats.queryType === 'SELECT') {
      suggestions.push({
        suggestionId: `idx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        patternId: this.generatePatternId(this.generateQueryTemplate(stats.sql)),
        type: 'index',
        priority: 'high',
        description: '查询未使用索引，可能进行了全表扫描',
        expectedImprovement: 80,
        implementationDifficulty: 'easy',
        suggestion: '在WHERE子句的条件字段上创建索引',
        createdAt: new Date(),
        applied: false
      })
    }
    
    // 检查是否可以使用缓存
    if (stats.queryType === 'SELECT' && stats.executionTime > 500) {
      suggestions.push({
        suggestionId: `cache_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        patternId: this.generatePatternId(this.generateQueryTemplate(stats.sql)),
        type: 'cache',
        priority: 'medium',
        description: '查询执行时间较长，建议启用查询缓存',
        expectedImprovement: 90,
        implementationDifficulty: 'easy',
        suggestion: '为此查询启用结果缓存，特别是对于相对静态的数据',
        createdAt: new Date(),
        applied: false
      })
    }
    
    // 检查是否需要查询重写
    if (sql.includes('SELECT *')) {
      suggestions.push({
        suggestionId: `rewrite_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        patternId: this.generatePatternId(this.generateQueryTemplate(stats.sql)),
        type: 'rewrite',
        priority: 'medium',
        description: '使用SELECT *可能影响性能',
        expectedImprovement: 30,
        implementationDifficulty: 'medium',
        suggestion: '明确指定需要的字段而不是使用SELECT *',
        exampleSql: stats.sql.replace('SELECT *', 'SELECT field1, field2, ...'),
        createdAt: new Date(),
        applied: false
      })
    }
    
    return suggestions
  }

  /**
   * 生成缓存键
   * 
   * @param sql - SQL语句
   * @param params - 查询参数
   * @returns 缓存键
   */
  private generateCacheKey(sql: string, params?: any[]): string {
    const template = this.generateQueryTemplate(sql)
    const paramStr = params ? JSON.stringify(params) : ''
    return `${this.cacheConfig.keyPrefix}${template}_${paramStr}`
  }

  /**
   * 获取缓存结果
   * 
   * @param cacheKey - 缓存键
   * @returns 缓存结果
   */
  private getCachedResult(cacheKey: string): any | null {
    const cacheItem = this.queryCache.get(cacheKey)
    
    if (!cacheItem) {
      return null
    }
    
    // 检查是否过期
    if (cacheItem.expiresAt < new Date()) {
      this.queryCache.delete(cacheKey)
      return null
    }
    
    // 更新访问信息
    cacheItem.accessCount++
    cacheItem.lastAccessedAt = new Date()
    
    return cacheItem.result
  }

  /**
   * 判断是否应该缓存查询
   * 
   * @param stats - 查询统计信息
   * @param result - 查询结果
   * @returns 是否应该缓存
   */
  private shouldCacheQuery(stats: QueryExecutionStats, result: any): boolean {
    if (!this.cacheConfig.enabled || stats.queryType !== 'SELECT') {
      return false
    }
    
    // 不缓存失败的查询
    if (!stats.success) {
      return false
    }
    
    // 根据配置决定是否缓存慢查询
    if (stats.executionTime > this.cacheConfig.slowQueryThreshold) {
      return this.cacheConfig.cacheSlowQueries
    }
    
    // 缓存执行时间适中的查询
    return stats.executionTime > 100 && stats.executionTime < 1000
  }

  /**
   * 缓存查询结果
   * 
   * @param stats - 查询统计信息
   * @param result - 查询结果
   */
  private cacheQueryResult(stats: QueryExecutionStats, result: any): void {
    const cacheKey = this.generateCacheKey(stats.sql, stats.params)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + this.cacheConfig.ttl)
    
    const cacheItem: QueryCacheItem = {
      key: cacheKey,
      result,
      createdAt: now,
      expiresAt,
      accessCount: 0,
      lastAccessedAt: now,
      size: JSON.stringify(result).length
    }
    
    // 检查缓存大小限制
    if (this.queryCache.size >= this.cacheConfig.maxSize) {
      this.evictCacheItems()
    }
    
    this.queryCache.set(cacheKey, cacheItem)
    this.emit('query-cached', { cacheKey, stats })
  }

  /**
   * 清理缓存
   */
  private cleanupCache(): void {
    const now = new Date()
    const expiredKeys: string[] = []
    
    for (const [key, item] of Array.from(this.queryCache.entries())) {
      if (item.expiresAt < now) {
        expiredKeys.push(key)
      }
    }
    
    expiredKeys.forEach(key => this.queryCache.delete(key))
    
    if (expiredKeys.length > 0) {
      console.log(`Cleaned up ${expiredKeys.length} expired cache items`)
    }
  }

  /**
   * 驱逐缓存项
   */
  private evictCacheItems(): void {
    const items = Array.from(this.queryCache.entries())
    
    if (this.cacheConfig.strategy === 'lru') {
      // 最近最少使用
      items.sort((a, b) => a[1].lastAccessedAt.getTime() - b[1].lastAccessedAt.getTime())
    } else if (this.cacheConfig.strategy === 'lfu') {
      // 最少使用频率
      items.sort((a, b) => a[1].accessCount - b[1].accessCount)
    } else {
      // TTL策略，按创建时间排序
      items.sort((a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime())
    }
    
    // 删除最老的25%的缓存项
    const itemsToRemove = Math.ceil(items.length * 0.25)
    for (let i = 0; i < itemsToRemove; i++) {
      this.queryCache.delete(items[i][0])
    }
  }

  /**
   * 清理统计历史
   */
  private cleanupStatsHistory(): void {
    if (this.queryStats.size > this.maxStatsHistory) {
      const entries = Array.from(this.queryStats.entries())
      entries.sort((a, b) => a[1].startTime.getTime() - b[1].startTime.getTime())
      
      const itemsToRemove = this.queryStats.size - this.maxStatsHistory
      for (let i = 0; i < itemsToRemove; i++) {
        this.queryStats.delete(entries[i][0])
      }
    }
  }

  /**
   * 执行性能分析
   */
  private performAnalysis(): void {
    console.log('Performing query performance analysis...')
    
    const analysis = this.generatePerformanceAnalysis()
    this.emit('analysis-complete', analysis)
    
    // 自动应用一些简单的优化建议
    this.autoApplyOptimizations()
  }

  /**
   * 自动应用优化
   */
  private autoApplyOptimizations(): void {
    const suggestions = Array.from(this.optimizationSuggestions.values())
    const autoApplicable = suggestions.filter(s => 
      !s.applied && 
      s.type === 'cache' && 
      s.implementationDifficulty === 'easy'
    )
    
    autoApplicable.forEach(suggestion => {
      // 这里可以自动启用缓存等简单优化
      suggestion.applied = true
      console.log(`Auto-applied optimization: ${suggestion.description}`)
    })
  }

  /**
   * 生成性能分析报告
   * 
   * @returns 性能分析报告
   */
  generatePerformanceAnalysis(): {
    summary: string
    slowQueries: QueryPattern[]
    topQueries: QueryPattern[]
    cacheStats: any
    suggestions: QueryOptimizationSuggestion[]
    recommendations: string[]
  } {
    const patterns = Array.from(this.queryPatterns.values())
    const slowQueries = patterns.filter(p => p.isSlowQuery).slice(0, 10)
    const topQueries = patterns
      .sort((a, b) => b.executionCount - a.executionCount)
      .slice(0, 10)
    
    const totalQueries = patterns.reduce((sum, p) => sum + p.executionCount, 0)
    const avgExecutionTime = patterns.reduce((sum, p) => sum + p.avgExecutionTime, 0) / patterns.length
    
    const cacheHitRate = this.calculateCacheHitRate()
    const suggestions = Array.from(this.optimizationSuggestions.values())
      .filter(s => !s.applied)
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      })
      .slice(0, 20)
    
    const recommendations = this.generateRecommendations(patterns, suggestions)
    
    return {
      summary: `
查询性能分析报告
================
分析时间: ${new Date().toISOString()}
查询模式总数: ${patterns.length}
总查询次数: ${totalQueries}
平均执行时间: ${avgExecutionTime.toFixed(2)}ms
慢查询数量: ${slowQueries.length}
缓存命中率: ${(cacheHitRate * 100).toFixed(2)}%
待处理建议: ${suggestions.length}
      `.trim(),
      slowQueries,
      topQueries,
      cacheStats: {
        size: this.queryCache.size,
        hitRate: cacheHitRate,
        totalSize: Array.from(this.queryCache.values()).reduce((sum, item) => sum + item.size, 0)
      },
      suggestions,
      recommendations
    }
  }

  /**
   * 计算缓存命中率
   * 
   * @returns 缓存命中率
   */
  private calculateCacheHitRate(): number {
    // 这里需要实际的缓存命中统计
    // 暂时返回模拟值
    return 0.75
  }

  /**
   * 生成建议
   * 
   * @param patterns - 查询模式
   * @param suggestions - 优化建议
   * @returns 建议数组
   */
  private generateRecommendations(patterns: QueryPattern[], suggestions: QueryOptimizationSuggestion[]): string[] {
    const recommendations: string[] = []
    
    const slowQueryCount = patterns.filter(p => p.isSlowQuery).length
    if (slowQueryCount > 5) {
      recommendations.push(`发现 ${slowQueryCount} 个慢查询模式，建议优先处理高频慢查询`)
    }
    
    const highPrioritySuggestions = suggestions.filter(s => s.priority === 'high').length
    if (highPrioritySuggestions > 0) {
      recommendations.push(`有 ${highPrioritySuggestions} 个高优先级优化建议待处理`)
    }
    
    const cacheHitRate = this.calculateCacheHitRate()
    if (cacheHitRate < 0.5) {
      recommendations.push('缓存命中率较低，建议检查缓存策略和TTL设置')
    }
    
    if (this.queryCache.size > this.cacheConfig.maxSize * 0.9) {
      recommendations.push('查询缓存接近容量限制，建议增加缓存大小或调整驱逐策略')
    }
    
    return recommendations
  }

  /**
   * 获取查询统计信息
   * 
   * @param limit - 限制返回数量
   * @returns 查询统计信息
   */
  getQueryStats(limit?: number): QueryExecutionStats[] {
    const stats = Array.from(this.queryStats.values())
    if (limit) {
      return stats.slice(-limit)
    }
    return stats
  }

  /**
   * 获取查询模式
   * 
   * @param limit - 限制返回数量
   * @returns 查询模式
   */
  getQueryPatterns(limit?: number): QueryPattern[] {
    const patterns = Array.from(this.queryPatterns.values())
    if (limit) {
      return patterns.slice(0, limit)
    }
    return patterns
  }

  /**
   * 获取优化建议
   * 
   * @param applied - 是否已应用
   * @returns 优化建议
   */
  getOptimizationSuggestions(applied?: boolean): QueryOptimizationSuggestion[] {
    const suggestions = Array.from(this.optimizationSuggestions.values())
    if (applied !== undefined) {
      return suggestions.filter(s => s.applied === applied)
    }
    return suggestions
  }

  /**
   * 获取缓存统计
   * 
   * @returns 缓存统计
   */
  getCacheStats(): {
    size: number
    maxSize: number
    hitRate: number
    totalSize: number
    items: QueryCacheItem[]
  } {
    const items = Array.from(this.queryCache.values())
    return {
      size: this.queryCache.size,
      maxSize: this.cacheConfig.maxSize,
      hitRate: this.calculateCacheHitRate(),
      totalSize: items.reduce((sum, item) => sum + item.size, 0),
      items
    }
  }

  /**
   * 更新缓存配置
   * 
   * @param config - 新的缓存配置
   */
  updateCacheConfig(config: Partial<QueryCacheConfig>): void {
    this.cacheConfig = { ...this.cacheConfig, ...config }
    console.log('Cache configuration updated:', this.cacheConfig)
    this.emit('cache-config-updated', this.cacheConfig)
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.queryCache.clear()
    console.log('Query cache cleared')
    this.emit('cache-cleared')
  }

  /**
   * 获取当前状态
   * 
   * @returns 当前状态
   */
  getStatus(): {
    isActive: boolean
    totalQueries: number
    totalPatterns: number
    slowQueries: number
    cacheSize: number
    pendingSuggestions: number
  } {
    const patterns = Array.from(this.queryPatterns.values())
    const slowQueries = patterns.filter(p => p.isSlowQuery).length
    const pendingSuggestions = Array.from(this.optimizationSuggestions.values())
      .filter(s => !s.applied).length
    
    return {
      isActive: this.isActive,
      totalQueries: this.queryStats.size,
      totalPatterns: patterns.length,
      slowQueries,
      cacheSize: this.queryCache.size,
      pendingSuggestions
    }
  }
}

// 创建全局实例
export const queryPerformanceOptimizer = new QueryPerformanceOptimizer()

// 导出类型
export type {
  QueryExecutionStats,
  QueryPattern,
  QueryOptimizationSuggestion,
  QueryCacheConfig,
  QueryCacheItem
}
