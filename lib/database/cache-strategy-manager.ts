/**
 * @file Cache Strategy Manager
 * @description 缓存策略管理器 - 第一阶段优化实现
 * @author ZK-Agent Team
 * @date 2024-12-19
 * @version 1.0.0
 */

import { EventEmitter } from 'events'
import { Logger } from '../utils/logger'
import { DatabaseMetrics, CacheConfig, CacheStrategy } from './unified-interfaces'

/**
 * 缓存策略类型
 */
type CacheStrategy = 'LRU' | 'LFU' | 'FIFO' | 'TTL' | 'ADAPTIVE'

/**
 * 缓存配置接口
 */
// CacheConfig 接口已迁移到 unified-interfaces.ts

/**
 * 缓存条目接口
 */
interface CacheEntry {
  /** 缓存键 */
  key: string
  /** 缓存值 */
  value: any
  /** 创建时间 */
  createdAt: Date
  /** 过期时间 */
  expiresAt: Date
  /** 访问次数 */
  accessCount: number
  /** 最后访问时间 */
  lastAccessed: Date
  /** 数据大小(字节) */
  size: number
  /** 是否压缩 */
  compressed: boolean
}

/**
 * 缓存统计接口
 */
interface CacheStats {
  /** 总请求数 */
  totalRequests: number
  /** 命中次数 */
  hits: number
  /** 未命中次数 */
  misses: number
  /** 命中率 */
  hitRate: number
  /** 总条目数 */
  totalEntries: number
  /** 内存使用(字节) */
  memoryUsage: number
  /** 平均访问时间(ms) */
  avgAccessTime: number
  /** 驱逐次数 */
  evictions: number
  /** 过期次数 */
  expirations: number
}

/**
 * 缓存性能指标接口
 */
interface CachePerformanceMetrics {
  /** 读取延迟 */
  readLatency: number
  /** 写入延迟 */
  writeLatency: number
  /** 内存压力 */
  memoryPressure: number
  /** 驱逐率 */
  evictionRate: number
  /** 命中率趋势 */
  hitRateTrend: number[]
}

/**
 * 缓存策略管理器
 * 实现第一阶段优化目标：
 * - 智能缓存策略选择
 * - 动态缓存大小调整
 * - 缓存预热机制
 * - 缓存性能监控
 * - 多级缓存支持
 */
export class CacheStrategyManager extends EventEmitter {
  private logger: Logger
  private config: CacheConfig
  private cache: Map<string, CacheEntry> = new Map()
  private stats: CacheStats
  private performanceMetrics: CachePerformanceMetrics
  private accessOrder: string[] = [] // 用于LRU策略
  private accessFrequency: Map<string, number> = new Map() // 用于LFU策略
  private isOptimizing: boolean = false
  private compressionEnabled: boolean = false

  constructor(config: Partial<CacheConfig> = {}) {
    super()
    this.logger = new Logger('CacheStrategyManager')
    
    this.config = {
      strategy: 'ADAPTIVE',
      maxSize: 10000,
      defaultTtl: 300, // 5分钟
      compression: false,
      enableStats: true,
      ...config
    }
    
    this.stats = {
      totalRequests: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalEntries: 0,
      memoryUsage: 0,
      avgAccessTime: 0,
      evictions: 0,
      expirations: 0
    }
    
    this.performanceMetrics = {
      readLatency: 0,
      writeLatency: 0,
      memoryPressure: 0,
      evictionRate: 0,
      hitRateTrend: []
    }
    
    // 启动定期任务
    this.startPeriodicTasks()
    
    // 如果启用预热，执行预热
    if (this.config.warmup?.enabled) {
      this.warmupCache()
    }
    
    this.logger.info('缓存策略管理器已初始化', {
      config: this.config
    })
  }

  /**
   * 获取缓存值
   * @param key 缓存键
   * @returns 缓存值或null
   */
  public async get(key: string): Promise<any> {
    const startTime = Date.now()
    
    try {
      this.stats.totalRequests++
      
      const entry = this.cache.get(key)
      
      if (!entry) {
        this.stats.misses++
        this.updateHitRate()
        return null
      }
      
      // 检查是否过期
      if (this.isExpired(entry)) {
        this.cache.delete(key)
        this.removeFromAccessOrder(key)
        this.stats.misses++
        this.stats.expirations++
        this.updateHitRate()
        return null
      }
      
      // 更新访问信息
      entry.accessCount++
      entry.lastAccessed = new Date()
      this.updateAccessOrder(key)
      this.updateAccessFrequency(key)
      
      this.stats.hits++
      this.updateHitRate()
      
      // 解压缩数据（如果需要）
      const value = entry.compressed ? this.decompress(entry.value) : entry.value
      
      return value
      
    } finally {
      const accessTime = Date.now() - startTime
      this.updateAccessTime(accessTime)
      this.performanceMetrics.readLatency = accessTime
    }
  }

  /**
   * 设置缓存值
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间(秒)
   */
  public async set(key: string, value: any, ttl?: number): Promise<void> {
    const startTime = Date.now()
    
    try {
      const effectiveTtl = ttl || this.config.defaultTtl
      const now = new Date()
      const expiresAt = new Date(now.getTime() + effectiveTtl * 1000)
      
      // 压缩数据（如果启用）
      const compressedValue = this.config.compression ? this.compress(value) : value
      const compressed = this.config.compression
      
      const entry: CacheEntry = {
        key,
        value: compressedValue,
        createdAt: now,
        expiresAt,
        accessCount: 0,
        lastAccessed: now,
        size: this.calculateSize(compressedValue),
        compressed
      }
      
      // 检查是否需要驱逐
      if (this.cache.size >= this.config.maxSize) {
        await this.evictEntries()
      }
      
      this.cache.set(key, entry)
      this.updateAccessOrder(key)
      this.updateAccessFrequency(key)
      
      this.updateStats()
      
    } finally {
      const writeTime = Date.now() - startTime
      this.performanceMetrics.writeLatency = writeTime
    }
  }

  /**
   * 删除缓存条目
   * @param key 缓存键
   */
  public async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key)
    
    if (deleted) {
      this.removeFromAccessOrder(key)
      this.accessFrequency.delete(key)
      this.updateStats()
    }
    
    return deleted
  }

  /**
   * 清空缓存
   */
  public async clear(): Promise<void> {
    this.cache.clear()
    this.accessOrder = []
    this.accessFrequency.clear()
    this.updateStats()
    
    this.logger.info('缓存已清空')
    this.emit('cache_cleared')
  }

  /**
   * 检查缓存条目是否过期
   * @param entry 缓存条目
   * @returns 是否过期
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expiresAt.getTime()
  }

  /**
   * 驱逐缓存条目
   */
  private async evictEntries(): Promise<void> {
    const evictCount = Math.max(1, Math.floor(this.config.maxSize * 0.1)) // 驱逐10%
    
    switch (this.config.strategy) {
      case 'LRU':
        await this.evictLRU(evictCount)
        break
      case 'LFU':
        await this.evictLFU(evictCount)
        break
      case 'FIFO':
        await this.evictFIFO(evictCount)
        break
      case 'TTL':
        await this.evictExpired()
        break
      case 'ADAPTIVE':
        await this.evictAdaptive(evictCount)
        break
    }
    
    this.stats.evictions += evictCount
    this.updateStats()
  }

  /**
   * LRU驱逐策略
   * @param count 驱逐数量
   */
  private async evictLRU(count: number): Promise<void> {
    const toEvict = this.accessOrder.slice(0, count)
    
    toEvict.forEach(key => {
      this.cache.delete(key)
      this.accessFrequency.delete(key)
    })
    
    this.accessOrder = this.accessOrder.slice(count)
  }

  /**
   * LFU驱逐策略
   * @param count 驱逐数量
   */
  private async evictLFU(count: number): Promise<void> {
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].accessCount - b[1].accessCount)
      .slice(0, count)
    
    entries.forEach(([key]) => {
      this.cache.delete(key)
      this.removeFromAccessOrder(key)
      this.accessFrequency.delete(key)
    })
  }

  /**
   * FIFO驱逐策略
   * @param count 驱逐数量
   */
  private async evictFIFO(count: number): Promise<void> {
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime())
      .slice(0, count)
    
    entries.forEach(([key]) => {
      this.cache.delete(key)
      this.removeFromAccessOrder(key)
      this.accessFrequency.delete(key)
    })
  }

  /**
   * 驱逐过期条目
   */
  private async evictExpired(): Promise<void> {
    const now = Date.now()
    const expiredKeys: string[] = []
    
    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt.getTime()) {
        expiredKeys.push(key)
      }
    })
    
    expiredKeys.forEach(key => {
      this.cache.delete(key)
      this.removeFromAccessOrder(key)
      this.accessFrequency.delete(key)
    })
    
    this.stats.expirations += expiredKeys.length
  }

  /**
   * 自适应驱逐策略
   * @param count 驱逐数量
   */
  private async evictAdaptive(count: number): Promise<void> {
    // 首先驱逐过期条目
    await this.evictExpired()
    
    // 如果还需要驱逐，根据性能指标选择策略
    if (this.cache.size >= this.config.maxSize) {
      if (this.performanceMetrics.memoryPressure > 0.8) {
        // 内存压力大，优先驱逐大对象
        await this.evictLargestEntries(count)
      } else if (this.stats.hitRate < 0.5) {
        // 命中率低，使用LFU
        await this.evictLFU(count)
      } else {
        // 默认使用LRU
        await this.evictLRU(count)
      }
    }
  }

  /**
   * 驱逐最大的条目
   * @param count 驱逐数量
   */
  private async evictLargestEntries(count: number): Promise<void> {
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => b[1].size - a[1].size)
      .slice(0, count)
    
    entries.forEach(([key]) => {
      this.cache.delete(key)
      this.removeFromAccessOrder(key)
      this.accessFrequency.delete(key)
    })
  }

  /**
   * 更新访问顺序（用于LRU）
   * @param key 缓存键
   */
  private updateAccessOrder(key: string): void {
    // 移除旧位置
    this.removeFromAccessOrder(key)
    // 添加到末尾
    this.accessOrder.push(key)
  }

  /**
   * 从访问顺序中移除
   * @param key 缓存键
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }
  }

  /**
   * 更新访问频率（用于LFU）
   * @param key 缓存键
   */
  private updateAccessFrequency(key: string): void {
    this.accessFrequency.set(key, (this.accessFrequency.get(key) || 0) + 1)
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    this.stats.hitRate = this.stats.totalRequests > 0 
      ? this.stats.hits / this.stats.totalRequests 
      : 0
    
    // 更新命中率趋势
    this.performanceMetrics.hitRateTrend.push(this.stats.hitRate)
    if (this.performanceMetrics.hitRateTrend.length > 100) {
      this.performanceMetrics.hitRateTrend = this.performanceMetrics.hitRateTrend.slice(-50)
    }
  }

  /**
   * 更新访问时间
   * @param accessTime 访问时间
   */
  private updateAccessTime(accessTime: number): void {
    const totalTime = this.stats.avgAccessTime * this.stats.totalRequests
    this.stats.avgAccessTime = (totalTime + accessTime) / (this.stats.totalRequests + 1)
  }

  /**
   * 更新统计信息
   */
  private updateStats(): void {
    this.stats.totalEntries = this.cache.size
    this.stats.memoryUsage = this.calculateTotalMemoryUsage()
    this.performanceMetrics.memoryPressure = this.stats.memoryUsage / (this.config.maxSize * 1024) // 假设每条目1KB
    this.performanceMetrics.evictionRate = this.stats.evictions / Math.max(1, this.stats.totalRequests)
  }

  /**
   * 计算总内存使用
   * @returns 内存使用字节数
   */
  private calculateTotalMemoryUsage(): number {
    let totalSize = 0
    
    this.cache.forEach(entry => {
      totalSize += entry.size
    })
    
    return totalSize
  }

  /**
   * 计算数据大小
   * @param data 数据
   * @returns 大小字节数
   */
  private calculateSize(data: any): number {
    if (typeof data === 'string') {
      return data.length * 2 // UTF-16编码
    }
    
    try {
      return JSON.stringify(data).length * 2
    } catch {
      return 1024 // 默认1KB
    }
  }

  /**
   * 压缩数据
   * @param data 原始数据
   * @returns 压缩后的数据
   */
  private compress(data: any): any {
    // 这里应该实现实际的压缩逻辑
    // 为了演示，直接返回原数据
    return data
  }

  /**
   * 解压缩数据
   * @param data 压缩的数据
   * @returns 解压缩后的数据
   */
  private decompress(data: any): any {
    // 这里应该实现实际的解压缩逻辑
    // 为了演示，直接返回原数据
    return data
  }

  /**
   * 缓存预热
   */
  private async warmupCache(): Promise<void> {
    if (!this.config.warmup?.queries) {
      return
    }
    
    this.logger.info('开始缓存预热')
    
    for (const query of this.config.warmup.queries) {
      try {
        // 这里应该执行实际的查询并缓存结果
        // 为了演示，创建模拟数据
        await this.set(`warmup:${query}`, { query, result: 'warmup_data' }, this.config.defaultTtl)
      } catch (error) {
        this.logger.warn('预热查询失败', { query, error })
      }
    }
    
    this.logger.info('缓存预热完成')
    this.emit('warmup_completed')
  }

  /**
   * 启动定期任务
   */
  private startPeriodicTasks(): void {
    // 每分钟清理过期条目
    setInterval(() => {
      this.evictExpired()
    }, 60 * 1000)
    
    // 每5分钟优化缓存策略
    setInterval(() => {
      this.optimizeCacheStrategy()
    }, 5 * 60 * 1000)
    
    // 每10分钟生成性能报告
    setInterval(() => {
      this.generatePerformanceReport()
    }, 10 * 60 * 1000)
  }

  /**
   * 优化缓存策略
   */
  private async optimizeCacheStrategy(): Promise<void> {
    if (this.isOptimizing) {
      return
    }
    
    this.isOptimizing = true
    
    try {
      const currentStrategy = this.config.strategy
      let recommendedStrategy = currentStrategy
      
      // 根据性能指标推荐策略
      if (this.stats.hitRate < 0.3) {
        recommendedStrategy = 'LFU' // 命中率低，使用频率优先
      } else if (this.performanceMetrics.memoryPressure > 0.8) {
        recommendedStrategy = 'TTL' // 内存压力大，优先过期清理
      } else if (this.stats.totalRequests > 10000 && this.stats.hitRate > 0.7) {
        recommendedStrategy = 'ADAPTIVE' // 高负载高命中率，使用自适应
      }
      
      if (recommendedStrategy !== currentStrategy) {
        this.logger.info('建议更改缓存策略', {
          current: currentStrategy,
          recommended: recommendedStrategy,
          reason: this.getStrategyChangeReason(recommendedStrategy)
        })
        
        this.emit('strategy_recommendation', {
          current: currentStrategy,
          recommended: recommendedStrategy,
          metrics: this.getPerformanceMetrics()
        })
      }
      
    } finally {
      this.isOptimizing = false
    }
  }

  /**
   * 获取策略变更原因
   * @param strategy 推荐策略
   * @returns 变更原因
   */
  private getStrategyChangeReason(strategy: CacheStrategy): string {
    switch (strategy) {
      case 'LFU':
        return `命中率较低(${(this.stats.hitRate * 100).toFixed(1)}%)，建议使用频率优先策略`
      case 'TTL':
        return `内存压力较大(${(this.performanceMetrics.memoryPressure * 100).toFixed(1)}%)，建议优先清理过期数据`
      case 'ADAPTIVE':
        return `高负载高命中率场景，建议使用自适应策略`
      default:
        return '基于当前性能指标的优化建议'
    }
  }

  /**
   * 生成性能报告
   */
  private generatePerformanceReport(): void {
    const report = {
      timestamp: new Date(),
      stats: { ...this.stats },
      performanceMetrics: { ...this.performanceMetrics },
      config: { ...this.config },
      recommendations: this.generateRecommendations()
    }
    
    this.logger.info('缓存性能报告', report)
    this.emit('performance_report', report)
  }

  /**
   * 生成优化建议
   * @returns 建议列表
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = []
    
    if (this.stats.hitRate < 0.5) {
      recommendations.push('命中率较低，考虑增加缓存大小或调整TTL')
    }
    
    if (this.performanceMetrics.memoryPressure > 0.8) {
      recommendations.push('内存压力较大，考虑启用压缩或减少缓存大小')
    }
    
    if (this.performanceMetrics.evictionRate > 0.1) {
      recommendations.push('驱逐率较高，考虑增加缓存大小')
    }
    
    if (this.performanceMetrics.readLatency > 10) {
      recommendations.push('读取延迟较高，检查缓存实现或网络状况')
    }
    
    return recommendations
  }

  /**
   * 获取缓存统计信息
   * @returns 统计信息
   */
  public getStats(): CacheStats {
    return { ...this.stats }
  }

  /**
   * 获取性能指标
   * @returns 性能指标
   */
  public getPerformanceMetrics(): CachePerformanceMetrics {
    return { ...this.performanceMetrics }
  }

  /**
   * 获取缓存配置
   * @returns 缓存配置
   */
  public getConfig(): CacheConfig {
    return { ...this.config }
  }

  /**
   * 更新缓存配置
   * @param newConfig 新配置
   */
  public updateConfig(newConfig: Partial<CacheConfig>): void {
    const oldConfig = { ...this.config }
    this.config = { ...this.config, ...newConfig }
    
    this.logger.info('缓存配置已更新', {
      oldConfig,
      newConfig: this.config
    })
    
    this.emit('config_updated', {
      oldConfig,
      newConfig: this.config
    })
  }

  /**
   * 获取缓存键列表
   * @param pattern 匹配模式
   * @returns 键列表
   */
  public getKeys(pattern?: string): string[] {
    const keys = Array.from(this.cache.keys())
    
    if (!pattern) {
      return keys
    }
    
    const regex = new RegExp(pattern.replace(/\*/g, '.*'))
    return keys.filter(key => regex.test(key))
  }

  /**
   * 获取缓存条目信息
   * @param key 缓存键
   * @returns 条目信息
   */
  public getEntryInfo(key: string): CacheEntry | null {
    const entry = this.cache.get(key)
    return entry ? { ...entry } : null
  }

  /**
   * 销毁缓存管理器
   */
  public destroy(): void {
    this.clear()
    this.removeAllListeners()
    this.logger.info('缓存策略管理器已销毁')
  }
}

// 导出单例实例
export const cacheStrategyManager = new CacheStrategyManager()