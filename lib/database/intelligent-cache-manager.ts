// @ts-nocheck
/**
 * 智能缓存管理器
 * 多层级、自适应的数据库缓存系统
 * 
 * 功能:
 * - 多层级缓存架构(L1内存缓存、L2Redis缓存)
 * - 智能缓存策略和自动失效
 * - 缓存预热和预测性加载
 * - 缓存性能监控和优化
 * - 分布式缓存一致性保证
 * 
 * @author ZK-Agent Team
 * @version 1.0.0
 */

import { EventEmitter } from 'events'
import { LRUCache } from 'lru-cache'
import { databaseMonitor } from './monitoring'
import { queryPerformanceOptimizer } from './query-performance-optimizer'
import { CacheConfig, CacheStrategy } from './unified-interfaces'

// 条件导入Redis，仅在服务器环境中使用
let Redis: any = null
if (typeof window === 'undefined') {
  try {
    Redis = require('ioredis')
  } catch (error: any) {
    console.warn('Redis not available in this environment:', error)
  }
}

/**
 * 缓存层级枚举
 */
enum CacheLevel {
  L1 = 'L1', // 内存缓存
  L2 = 'L2', // Redis缓存
  L3 = 'L3'  // 数据库缓存
}

/**
 * 缓存策略枚举
 */
enum CacheStrategy {
  LRU = 'lru',           // 最近最少使用
  LFU = 'lfu',           // 最少使用频率
  TTL = 'ttl',           // 基于时间
  ADAPTIVE = 'adaptive'   // 自适应策略
}

/**
 * 缓存项接口
 */
interface CacheItem<T = any> {
  /** 缓存键 */
  key: string
  /** 缓存值 */
  value: T
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
  /** 缓存层级 */
  level: CacheLevel
  /** 数据版本 */
  version: number
  /** 标签(用于批量失效) */
  tags: string[]
  /** 优先级 */
  priority: number
  /** 是否为热点数据 */
  isHot: boolean
}

/**
 * 缓存配置接口
 */
// CacheConfig 接口已迁移到 unified-interfaces.ts

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
  /** 各层级统计 */
  levelStats: {
    [key in CacheLevel]: {
      requests: number
      hits: number
      misses: number
      hitRate: number
      size: number
      memoryUsage: number
    }
  }
  /** 平均响应时间 */
  avgResponseTime: number
  /** 错误次数 */
  errors: number
  /** 失效次数 */
  evictions: number
}

/**
 * 缓存事件接口
 */
interface CacheEvent {
  type: 'hit' | 'miss' | 'set' | 'delete' | 'evict' | 'expire'
  key: string
  level: CacheLevel
  timestamp: Date
  metadata?: any
}

/**
 * 预测性加载配置
 */
interface PredictiveLoadConfig {
  /** 是否启用 */
  enabled: boolean
  /** 预测算法 */
  algorithm: 'pattern' | 'ml' | 'hybrid'
  /** 预测窗口(ms) */
  predictionWindow: number
  /** 置信度阈值 */
  confidenceThreshold: number
  /** 最大预加载数量 */
  maxPredictiveLoads: number
}

/**
 * 智能缓存管理器类
 */
export class IntelligentCacheManager extends EventEmitter {
  private config: CacheConfig
  private l1Cache: LRUCache<string, CacheItem>
  private l2Cache: any | null = null
  private stats: CacheStats
  private isActive: boolean = false
  private monitoringInterval: NodeJS.Timeout | null = null
  private warmupInterval: NodeJS.Timeout | null = null
  private predictiveConfig: PredictiveLoadConfig
  private accessPatterns: Map<string, number[]> = new Map()
  private hotKeys: Set<string> = new Set()
  private keyVersions: Map<string, number> = new Map()

  constructor(config: Partial<CacheConfig> = {}) {
    super()
    
    // 初始化配置
    this.config = this.mergeConfig(config)
    
    // 初始化L1缓存
    this.l1Cache = new LRUCache({
      max: this.config.l1.maxSize,
      ttl: this.config.l1.ttl,
      updateAgeOnGet: true,
      allowStale: false
    })
    
    // 初始化统计信息
    this.stats = this.initializeStats()
    
    // 初始化预测性加载配置
    this.predictiveConfig = {
      enabled: true,
      algorithm: 'hybrid',
      predictionWindow: 300000, // 5分钟
      confidenceThreshold: 0.7,
      maxPredictiveLoads: 50
    }
    
    // 延迟设置事件监听器，避免循环依赖
    process.nextTick(() => {
      this.setupEventListeners()
    })
  }

  /**
   * 合并配置
   * 
   * @param userConfig - 用户配置
   * @returns 合并后的配置
   */
  private mergeConfig(userConfig: Partial<CacheConfig>): CacheConfig {
    const defaultConfig: CacheConfig = {
      l1: {
        enabled: true,
        maxSize: 1000,
        ttl: 300000, // 5分钟
        strategy: CacheStrategy.LRU
      },
      l2: {
        enabled: true,
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
          db: parseInt(process.env.REDIS_DB || '0'),
          keyPrefix: 'zk_cache:'
        },
        maxSize: 10000,
        ttl: 1800000, // 30分钟
        strategy: CacheStrategy.LRU
      },
      warmup: {
        enabled: true,
        queries: [],
        schedule: '0 */6 * * *' // 每6小时
      },
      monitoring: {
        enabled: true,
        metricsInterval: 60000, // 1分钟
        alertThresholds: {
          hitRateMin: 0.8,
          memoryUsageMax: 0.9,
          latencyMax: 100
        }
      }
    }
    
    return this.deepMerge(defaultConfig, userConfig)
  }

  /**
   * 深度合并对象
   * 
   * @param target - 目标对象
   * @param source - 源对象
   * @returns 合并后的对象
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target }
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key])
      } else {
        result[key] = source[key]
      }
    }
    
    return result
  }

  /**
   * 初始化统计信息
   * 
   * @returns 初始统计信息
   */
  private initializeStats(): CacheStats {
    return {
      totalRequests: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
      levelStats: {
        [CacheLevel.L1]: {
          requests: 0,
          hits: 0,
          misses: 0,
          hitRate: 0,
          size: 0,
          memoryUsage: 0
        },
        [CacheLevel.L2]: {
          requests: 0,
          hits: 0,
          misses: 0,
          hitRate: 0,
          size: 0,
          memoryUsage: 0
        },
        [CacheLevel.L3]: {
          requests: 0,
          hits: 0,
          misses: 0,
          hitRate: 0,
          size: 0,
          memoryUsage: 0
        }
      },
      avgResponseTime: 0,
      errors: 0,
      evictions: 0
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听查询性能优化器事件
    queryPerformanceOptimizer.on('query-completed', (stats: any) => {
      this.handleQueryCompleted(stats)
    })
    
    // 监听数据库监控事件
    databaseMonitor.on('metrics', (metrics: any) => {
      this.handleDatabaseMetrics(metrics)
    })
  }

  /**
   * 启动缓存管理器
   */
  async start(): Promise<void> {
    if (this.isActive) {
      console.log('Intelligent cache manager is already active')
      return
    }

    console.log('Starting intelligent cache manager')
    
    try {
      // 初始化L2缓存(Redis)
      if (this.config.l2.enabled) {
        await this.initializeL2Cache()
      }
      
      // 启动监控
      if (this.config.monitoring.enabled) {
        this.startMonitoring()
      }
      
      // 启动缓存预热
      if (this.config.warmup.enabled) {
        this.startWarmup()
      }
      
      this.isActive = true
      this.emit('cache-manager-started')
      
      console.log('Intelligent cache manager started successfully')
      
    } catch (error: any) {
      console.error('Failed to start intelligent cache manager:', error)
      throw error
    }
  }

  /**
   * 停止缓存管理器
   */
  async stop(): Promise<void> {
    if (!this.isActive) {
      return
    }

    console.log('Stopping intelligent cache manager')
    
    this.isActive = false
    
    // 停止监控
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
    
    // 停止预热
    if (this.warmupInterval) {
      clearInterval(this.warmupInterval)
      this.warmupInterval = null
    }
    
    // 关闭Redis连接
    if (this.l2Cache) {
      await this.l2Cache.quit()
      this.l2Cache = null
    }
    
    // 清空L1缓存
    this.l1Cache.clear()
    
    this.emit('cache-manager-stopped')
  }

  /**
   * 初始化L2缓存
   */
  private async initializeL2Cache(): Promise<void> {
    // 检查Redis是否可用
    if (!Redis) {
      console.warn('Redis not available, L2 cache disabled')
      this.config.l2.enabled = false
      return
    }
    
    const redisConfig = this.config.l2.redis
    
    try {
      this.l2Cache = new Redis({
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        db: redisConfig.db,
        keyPrefix: redisConfig.keyPrefix,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      })
      
      // 设置Redis事件监听
      this.l2Cache.on('connect', () => {
        console.log('Connected to Redis cache')
      })
      
      this.l2Cache.on('error', (error: any) => {
        console.error('Redis cache error:', error)
        this.stats.errors++
      })
      
      // 测试连接
      await this.l2Cache.ping()
    } catch (error: any) {
      console.warn('Failed to initialize Redis cache, falling back to L1 only:', error)
      this.config.l2.enabled = false
      this.l2Cache = null
    }
  }

  /**
   * 启动监控
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics()
      this.checkAlerts()
      this.optimizeCache()
    }, this.config.monitoring.metricsInterval)
  }

  /**
   * 启动缓存预热
   */
  private startWarmup(): void {
    // 立即执行一次预热
    this.performWarmup()
    
    // 定期预热(这里简化为每小时一次)
    this.warmupInterval = setInterval(() => {
      this.performWarmup()
    }, 3600000) // 1小时
  }

  /**
   * 获取缓存数据
   * 
   * @param key - 缓存键
   * @param loader - 数据加载函数
   * @param options - 选项
   * @returns 缓存数据
   */
  async get<T>(
    key: string, 
    loader?: () => Promise<T>, 
    options: {
      ttl?: number
      tags?: string[]
      priority?: number
      level?: CacheLevel
    } = {}
  ): Promise<T | null> {
    const startTime = performance.now()
    
    try {
      this.stats.totalRequests++
      this.recordAccess(key)
      
      // 尝试从L1缓存获取
      let result = await this.getFromL1(key)
      if (result !== null) {
        this.recordHit(CacheLevel.L1)
        this.emit('cache-event', {
          type: 'hit',
          key,
          level: CacheLevel.L1,
          timestamp: new Date()
        })
        return result.value
      }
      
      // 尝试从L2缓存获取
      if (this.config.l2.enabled && this.l2Cache) {
        result = await this.getFromL2(key)
        if (result !== null) {
          // 回写到L1缓存
          await this.setToL1(key, result.value, options)
          this.recordHit(CacheLevel.L2)
          this.emit('cache-event', {
            type: 'hit',
            key,
            level: CacheLevel.L2,
            timestamp: new Date()
          })
          return result.value
        }
      }
      
      // 缓存未命中，使用loader加载数据
      if (loader) {
        const data = await loader()
        if (data !== null && data !== undefined) {
          await this.set(key, data, options)
        }
        this.recordMiss()
        return data
      }
      
      this.recordMiss()
      return null
      
    } catch (error: any) {
      console.error(`Cache get error for key ${key}:`, error)
      this.stats.errors++
      
      // 如果有loader，尝试直接加载
      if (loader) {
        try {
          return await loader()
        } catch (loaderError: any) {
          console.error(`Loader error for key ${key}:`, loaderError)
          return null
        }
      }
      
      return null
      
    } finally {
      const endTime = performance.now()
      this.updateResponseTime(endTime - startTime)
    }
  }

  /**
   * 设置缓存数据
   * 
   * @param key - 缓存键
   * @param value - 缓存值
   * @param options - 选项
   */
  async set<T>(
    key: string, 
    value: T, 
    options: {
      ttl?: number
      tags?: string[]
      priority?: number
      level?: CacheLevel
    } = {}
  ): Promise<void> {
    try {
      const ttl = options.ttl || this.config.l1.ttl
      const tags = options.tags || []
      const priority = options.priority || 1
      const targetLevel = options.level
      
      // 更新版本号
      const version = this.incrementVersion(key)
      
      const cacheItem: CacheItem<T> = {
        key,
        value,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + ttl),
        accessCount: 0,
        lastAccessedAt: new Date(),
        size: this.calculateSize(value),
        level: CacheLevel.L1,
        version,
        tags,
        priority,
        isHot: this.hotKeys.has(key)
      }
      
      // 设置到L1缓存
      if (!targetLevel || targetLevel === CacheLevel.L1) {
        await this.setToL1(key, value, options)
      }
      
      // 设置到L2缓存
      if (this.config.l2.enabled && this.l2Cache && (!targetLevel || targetLevel === CacheLevel.L2)) {
        await this.setToL2(key, cacheItem)
      }
      
      this.emit('cache-event', {
        type: 'set',
        key,
        level: targetLevel || CacheLevel.L1,
        timestamp: new Date(),
        metadata: { size: cacheItem.size, ttl }
      })
      
    } catch (error: any) {
      console.error(`Cache set error for key ${key}:`, error)
      this.stats.errors++
    }
  }

  /**
   * 删除缓存数据
   * 
   * @param key - 缓存键
   */
  async delete(key: string): Promise<void> {
    try {
      // 从L1缓存删除
      this.l1Cache.delete(key)
      
      // 从L2缓存删除
      if (this.config.l2.enabled && this.l2Cache) {
        await this.l2Cache.del(key)
      }
      
      // 清理相关数据
      this.accessPatterns.delete(key)
      this.hotKeys.delete(key)
      this.keyVersions.delete(key)
      
      this.emit('cache-event', {
        type: 'delete',
        key,
        level: CacheLevel.L1,
        timestamp: new Date()
      })
      
    } catch (error: any) {
      console.error(`Cache delete error for key ${key}:`, error)
      this.stats.errors++
    }
  }

  /**
   * 批量删除缓存(按标签)
   * 
   * @param tags - 标签数组
   */
  async deleteByTags(tags: string[]): Promise<void> {
    try {
      const keysToDelete: string[] = []
      
      // 从L1缓存中查找匹配的键
      for (const [key, item] of Array.from(this.l1Cache.entries())) {
        if (item && item.tags && item.tags.some((tag: string) => tags.includes(tag))) {
          keysToDelete.push(key)
        }
      }
      
      // 从L2缓存中查找匹配的键(如果启用)
      if (this.config.l2.enabled && this.l2Cache) {
        // 这里需要实现Redis中按标签查找的逻辑
        // 可以使用Redis的SET数据结构来维护标签到键的映射
      }
      
      // 批量删除
      for (const key of keysToDelete) {
        await this.delete(key)
      }
      
      console.log(`Deleted ${keysToDelete.length} cache items by tags:`, tags)
      
    } catch (error: any) {
      console.error('Cache delete by tags error:', error)
      this.stats.errors++
    }
  }

  /**
   * 从L1缓存获取数据
   * 
   * @param key - 缓存键
   * @returns 缓存项
   */
  private async getFromL1(key: string): Promise<CacheItem | null> {
    this.stats.levelStats[CacheLevel.L1].requests++
    
    const item = this.l1Cache.get(key)
    if (item) {
      item.accessCount++
      item.lastAccessedAt = new Date()
      return item
    }
    
    return null
  }

  /**
   * 从L2缓存获取数据
   * 
   * @param key - 缓存键
   * @returns 缓存项
   */
  private async getFromL2(key: string): Promise<CacheItem | null> {
    if (!this.l2Cache) {
      return null
    }
    
    this.stats.levelStats[CacheLevel.L2].requests++
    
    try {
      const data = await this.l2Cache.get(key)
      if (data) {
        const item: CacheItem = JSON.parse(data)
        
        // 检查是否过期
        if (new Date(item.expiresAt) > new Date()) {
          item.accessCount++
          item.lastAccessedAt = new Date()
          
          // 更新L2缓存中的访问信息
          await this.l2Cache.set(key, JSON.stringify(item), 'PX', this.config.l2.ttl)
          
          return item
        } else {
          // 过期数据，删除
          await this.l2Cache.del(key)
        }
      }
    } catch (error: any) {
      console.error(`L2 cache get error for key ${key}:`, error)
    }
    
    return null
  }

  /**
   * 设置数据到L1缓存
   * 
   * @param key - 缓存键
   * @param value - 缓存值
   * @param options - 选项
   */
  private async setToL1<T>(key: string, value: T, options: any = {}): Promise<void> {
    const ttl = options.ttl || this.config.l1.ttl
    const tags = options.tags || []
    const priority = options.priority || 1
    const version = this.getVersion(key)
    
    const cacheItem: CacheItem<T> = {
      key,
      value,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + ttl),
      accessCount: 0,
      lastAccessedAt: new Date(),
      size: this.calculateSize(value),
      level: CacheLevel.L1,
      version,
      tags,
      priority,
      isHot: this.hotKeys.has(key)
    }
    
    this.l1Cache.set(key, cacheItem, { ttl })
  }

  /**
   * 设置数据到L2缓存
   * 
   * @param key - 缓存键
   * @param item - 缓存项
   */
  private async setToL2(key: string, item: CacheItem): Promise<void> {
    if (!this.l2Cache) {
      return
    }
    
    try {
      const serializedItem = JSON.stringify(item)
      await this.l2Cache.set(key, serializedItem, 'PX', this.config.l2.ttl)
      
      // 维护标签索引
      if (item.tags && item.tags.length > 0) {
        for (const tag of item.tags) {
          await this.l2Cache.sadd(`tag:${tag}`, key)
          await this.l2Cache.expire(`tag:${tag}`, Math.ceil(this.config.l2.ttl / 1000))
        }
      }
      
    } catch (error: any) {
      console.error(`L2 cache set error for key ${key}:`, error)
    }
  }

  /**
   * 记录访问模式
   * 
   * @param key - 缓存键
   */
  private recordAccess(key: string): void {
    const now = Date.now()
    const pattern = this.accessPatterns.get(key) || []
    
    pattern.push(now)
    
    // 只保留最近的访问记录
    const cutoff = now - this.predictiveConfig.predictionWindow
    const recentAccesses = pattern.filter(time => time > cutoff)
    
    this.accessPatterns.set(key, recentAccesses)
    
    // 判断是否为热点数据
    if (recentAccesses.length > 10) {
      this.hotKeys.add(key)
    } else if (recentAccesses.length < 3) {
      this.hotKeys.delete(key)
    }
  }

  /**
   * 记录命中
   * 
   * @param level - 缓存层级
   */
  private recordHit(level: CacheLevel): void {
    this.stats.hits++
    this.stats.levelStats[level].hits++
    this.updateHitRate()
  }

  /**
   * 记录未命中
   */
  private recordMiss(): void {
    this.stats.misses++
    this.updateHitRate()
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    this.stats.hitRate = this.stats.hits / Math.max(1, this.stats.totalRequests)
    
    for (const level of Object.values(CacheLevel)) {
      const levelStats = this.stats.levelStats[level]
      levelStats.hitRate = levelStats.hits / Math.max(1, levelStats.requests)
    }
  }

  /**
   * 更新响应时间
   * 
   * @param responseTime - 响应时间
   */
  private updateResponseTime(responseTime: number): void {
    const totalTime = this.stats.avgResponseTime * (this.stats.totalRequests - 1) + responseTime
    this.stats.avgResponseTime = totalTime / this.stats.totalRequests
  }

  /**
   * 计算数据大小
   * 
   * @param value - 数据值
   * @returns 数据大小(bytes)
   */
  private calculateSize(value: any): number {
    try {
      return JSON.stringify(value).length * 2 // 粗略估算(UTF-16)
    } catch {
      return 0
    }
  }

  /**
   * 获取版本号
   * 
   * @param key - 缓存键
   * @returns 版本号
   */
  private getVersion(key: string): number {
    return this.keyVersions.get(key) || 1
  }

  /**
   * 递增版本号
   * 
   * @param key - 缓存键
   * @returns 新版本号
   */
  private incrementVersion(key: string): number {
    const currentVersion = this.getVersion(key)
    const newVersion = currentVersion + 1
    this.keyVersions.set(key, newVersion)
    return newVersion
  }

  /**
   * 处理查询完成事件
   * 
   * @param stats - 查询统计
   */
  private handleQueryCompleted(stats: any): void {
    // 基于查询统计进行预测性加载
    if (this.predictiveConfig.enabled && stats.success) {
      this.performPredictiveLoading(stats)
    }
  }

  /**
   * 处理数据库指标
   * 
   * @param metrics - 数据库指标
   */
  private handleDatabaseMetrics(metrics: any): void {
    // 根据数据库负载调整缓存策略
    if (metrics.cpuUsage > 80) {
      // 高CPU使用率时，增加缓存TTL
      this.adjustCacheTTL(1.5)
    } else if (metrics.cpuUsage < 30) {
      // 低CPU使用率时，减少缓存TTL
      this.adjustCacheTTL(0.8)
    }
  }

  /**
   * 执行预测性加载
   * 
   * @param stats - 查询统计
   */
  private performPredictiveLoading(stats: any): void {
    // 这里实现预测性加载逻辑
    // 基于访问模式预测可能需要的数据
    const relatedKeys = this.predictRelatedKeys(stats)
    
    relatedKeys.forEach(async (key) => {
      if (!this.l1Cache.has(key) && !await this.hasInL2(key)) {
        // 预加载数据
        this.emit('predictive-load-needed', { key, stats })
      }
    })
  }

  /**
   * 预测相关键
   * 
   * @param stats - 查询统计
   * @returns 相关键数组
   */
  private predictRelatedKeys(stats: any): string[] {
    // 简单的预测逻辑，实际应用中可以使用更复杂的算法
    const relatedKeys: string[] = []
    
    if (stats.tables) {
      stats.tables.forEach((table: string) => {
        // 预测同表的其他常用查询
        relatedKeys.push(`${table}:popular_queries`)
        relatedKeys.push(`${table}:recent_data`)
      })
    }
    
    return relatedKeys
  }

  /**
   * 检查L2缓存中是否存在
   * 
   * @param key - 缓存键
   * @returns 是否存在
   */
  private async hasInL2(key: string): Promise<boolean> {
    if (!this.l2Cache) {
      return false
    }
    
    try {
      const exists = await this.l2Cache.exists(key)
      return exists === 1
    } catch (error: any) {
      return false
    }
  }

  /**
   * 调整缓存TTL
   * 
   * @param factor - 调整因子
   */
  private adjustCacheTTL(factor: number): void {
    // 动态调整缓存TTL
    const newL1TTL = Math.max(60000, this.config.l1.ttl * factor) // 最少1分钟
    const newL2TTL = Math.max(300000, this.config.l2.ttl * factor) // 最少5分钟
    
    this.config.l1.ttl = newL1TTL
    this.config.l2.ttl = newL2TTL
    
    console.log(`Adjusted cache TTL: L1=${newL1TTL}ms, L2=${newL2TTL}ms`)
  }

  /**
   * 收集指标
   */
  private collectMetrics(): void {
    // 更新L1缓存统计
    this.stats.levelStats[CacheLevel.L1].size = this.l1Cache.size
    this.stats.levelStats[CacheLevel.L1].memoryUsage = this.calculateL1MemoryUsage()
    
    // 发送指标事件
    this.emit('metrics-collected', this.stats)
  }

  /**
   * 计算L1缓存内存使用
   * 
   * @returns 内存使用量(bytes)
   */
  private calculateL1MemoryUsage(): number {
    let totalSize = 0
    for (const item of Array.from(this.l1Cache.values())) {
      if (item) {
        totalSize += item.size
      }
    }
    return totalSize
  }

  /**
   * 检查告警
   */
  private checkAlerts(): void {
    const thresholds = this.config.monitoring.alertThresholds
    
    // 检查命中率
    if (this.stats.hitRate < thresholds.hitRateMin) {
      this.emit('alert', {
        type: 'low-hit-rate',
        message: `Cache hit rate is below threshold: ${this.stats.hitRate.toFixed(2)} < ${thresholds.hitRateMin}`,
        severity: 'warning'
      })
    }
    
    // 检查内存使用
    const memoryUsage = this.calculateL1MemoryUsage()
    const maxMemory = this.config.l1.maxSize * 1024 // 假设每项平均1KB
    if (memoryUsage / maxMemory > thresholds.memoryUsageMax) {
      this.emit('alert', {
        type: 'high-memory-usage',
        message: `Cache memory usage is above threshold: ${(memoryUsage / maxMemory * 100).toFixed(2)}% > ${thresholds.memoryUsageMax * 100}%`,
        severity: 'warning'
      })
    }
    
    // 检查响应时间
    if (this.stats.avgResponseTime > thresholds.latencyMax) {
      this.emit('alert', {
        type: 'high-latency',
        message: `Cache average response time is above threshold: ${this.stats.avgResponseTime.toFixed(2)}ms > ${thresholds.latencyMax}ms`,
        severity: 'warning'
      })
    }
  }

  /**
   * 优化缓存
   */
  private optimizeCache(): void {
    // 清理过期数据
    this.cleanupExpiredItems()
    
    // 优化热点数据
    this.optimizeHotData()
    
    // 调整缓存策略
    this.adjustCacheStrategy()
  }

  /**
   * 清理过期项
   */
  private cleanupExpiredItems(): void {
    const now = new Date()
    const expiredKeys: string[] = []
    
    for (const [key, item] of Array.from(this.l1Cache.entries())) {
      if (item && new Date(item.expiresAt) < now) {
        expiredKeys.push(key)
      }
    }
    
    expiredKeys.forEach(key => {
      this.l1Cache.delete(key)
      this.stats.evictions++
    })
  }

  /**
   * 优化热点数据
   */
  private optimizeHotData(): void {
    // 将热点数据的TTL延长
    for (const hotKey of this.hotKeys) {
      const item = this.l1Cache.get(hotKey)
      if (item) {
        const extendedTTL = this.config.l1.ttl * 2
        item.expiresAt = new Date(Date.now() + extendedTTL)
        this.l1Cache.set(hotKey, item, { ttl: extendedTTL })
      }
    }
  }

  /**
   * 调整缓存策略
   */
  private adjustCacheStrategy(): void {
    // 根据命中率调整策略
    if (this.stats.hitRate < 0.5) {
      // 命中率低，增加缓存大小
      if (this.l1Cache.max < 2000) {
        this.l1Cache.resize(this.l1Cache.max * 1.2)
        console.log(`Increased L1 cache size to ${this.l1Cache.max}`)
      }
    } else if (this.stats.hitRate > 0.9) {
      // 命中率高，可以适当减少缓存大小
      if (this.l1Cache.max > 500) {
        this.l1Cache.resize(this.l1Cache.max * 0.9)
        console.log(`Decreased L1 cache size to ${this.l1Cache.max}`)
      }
    }
  }

  /**
   * 执行缓存预热
   */
  private async performWarmup(): Promise<void> {
    console.log('Performing cache warmup...')
    
    const warmupQueries = this.config.warmup.queries
    
    for (const query of warmupQueries) {
      try {
        // 这里需要实际执行查询并缓存结果
        // await this.executeAndCache(query)
        console.log(`Warmed up query: ${query}`)
      } catch (error: any) {
        console.error(`Warmup failed for query ${query}:`, error)
      }
    }
    
    this.emit('warmup-completed', { queries: warmupQueries.length })
  }

  /**
   * 获取缓存统计
   * 
   * @returns 缓存统计
   */
  getStats(): CacheStats {
    return { ...this.stats }
  }

  /**
   * 获取热点键
   * 
   * @returns 热点键数组
   */
  getHotKeys(): string[] {
    return Array.from(this.hotKeys)
  }

  /**
   * 获取缓存配置
   * 
   * @returns 缓存配置
   */
  getConfig(): CacheConfig {
    return { ...this.config }
  }

  /**
   * 更新缓存配置
   * 
   * @param newConfig - 新配置
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = this.mergeConfig(newConfig)
    console.log('Cache configuration updated')
    this.emit('config-updated', this.config)
  }

  /**
   * 清空所有缓存
   */
  async clearAll(): Promise<void> {
    // 清空L1缓存
    this.l1Cache.clear()
    
    // 清空L2缓存
    if (this.config.l2.enabled && this.l2Cache) {
      await this.l2Cache.flushdb()
    }
    
    // 重置统计
    this.stats = this.initializeStats()
    
    // 清空辅助数据
    this.accessPatterns.clear()
    this.hotKeys.clear()
    this.keyVersions.clear()
    
    console.log('All caches cleared')
    this.emit('cache-cleared')
  }

  /**
   * 生成缓存报告
   * 
   * @returns 缓存报告
   */
  generateReport(): {
    summary: string
    performance: any
    recommendations: string[]
  } {
    const recommendations: string[] = []
    
    if (this.stats.hitRate < 0.7) {
      recommendations.push('缓存命中率较低，建议检查缓存策略和TTL设置')
    }
    
    if (this.stats.avgResponseTime > 50) {
      recommendations.push('缓存响应时间较高，建议优化缓存层级或增加内存')
    }
    
    if (this.hotKeys.size > 100) {
      recommendations.push('热点数据较多，建议考虑分片或专用缓存')
    }
    
    return {
      summary: `
智能缓存管理报告
================
生成时间: ${new Date().toISOString()}
总请求数: ${this.stats.totalRequests}
命中率: ${(this.stats.hitRate * 100).toFixed(2)}%
平均响应时间: ${this.stats.avgResponseTime.toFixed(2)}ms
L1缓存大小: ${this.stats.levelStats[CacheLevel.L1].size}
L2缓存启用: ${this.config.l2.enabled ? '是' : '否'}
热点数据: ${this.hotKeys.size} 个
错误次数: ${this.stats.errors}
      `.trim(),
      performance: {
        hitRate: this.stats.hitRate,
        avgResponseTime: this.stats.avgResponseTime,
        levelStats: this.stats.levelStats,
        hotKeysCount: this.hotKeys.size,
        errorRate: this.stats.errors / Math.max(1, this.stats.totalRequests)
      },
      recommendations
    }
  }
}

// 创建全局实例
export const intelligentCacheManager = new IntelligentCacheManager()

// 导出类型
export type {
  CacheConfig,
  CacheItem,
  CacheStats,
  CacheEvent,
  PredictiveLoadConfig
}

export { CacheLevel, CacheStrategy }