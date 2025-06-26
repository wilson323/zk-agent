// @ts-nocheck
/**
 * @file Advanced Cache Manager
 * @description 高级缓存管理器，支持多层缓存、智能失效策略和性能优化
 * @author ZK-Agent Team A
 * @date 2024-12-19
 */

// 缓存配置接口
export interface CacheConfig {
  maxSize: number
  ttl: number // 生存时间（毫秒）
  checkPeriod: number // 检查周期（毫秒）
  enableCompression: boolean
  enableSerialization: boolean
  evictionPolicy: 'lru' | 'lfu' | 'ttl' | 'fifo'
}

// 缓存项接口
export interface CacheItem<T = any> {
  key: string
  value: T
  createdAt: number
  lastAccessed: number
  accessCount: number
  ttl?: number
  size: number
  tags?: string[]
}

// 缓存统计接口
export interface CacheStats {
  hits: number
  misses: number
  sets: number
  deletes: number
  evictions: number
  hitRate: number
  size: number
  maxSize: number
  memoryUsage: number
}

// 缓存事件类型
export type CacheEventType = 'hit' | 'miss' | 'set' | 'delete' | 'evict' | 'expire'

// 缓存事件监听器
export type CacheEventListener<T = any> = (event: {
  type: CacheEventType
  key: string
  value?: T
  timestamp: number
}) => void

/**
 * 高级缓存管理器
 */
export class AdvancedCacheManager<T = any> {
  private cache = new Map<string, CacheItem<T>>()
  private accessOrder: string[] = [] // LRU顺序
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    hitRate: 0,
    size: 0,
    maxSize: 0,
    memoryUsage: 0
  }
  private listeners: CacheEventListener<T>[] = []
  private cleanupTimer?: NodeJS.Timeout
  private config: CacheConfig

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 1000,
      ttl: 5 * 60 * 1000, // 5分钟
      checkPeriod: 60 * 1000, // 1分钟
      enableCompression: false,
      enableSerialization: true,
      evictionPolicy: 'lru',
      ...config
    }

    this.stats.maxSize = this.config.maxSize
    this.startCleanupTimer()
  }

  /**
   * 设置缓存项
   */
  set(key: string, value: T, options: {
    ttl?: number
    tags?: string[]
  } = {}): boolean {
    try {
      const now = Date.now()
      const ttl = options.ttl || this.config.ttl
      const size = this.calculateSize(value)

      // 检查是否需要驱逐
      this.ensureCapacity(size)

      const item: CacheItem<T> = {
        key,
        value: this.config.enableSerialization ? this.serialize(value) : value,
        createdAt: now,
        lastAccessed: now,
        accessCount: 0,
        ttl,
        size,
        tags: options.tags
      }

      // 如果键已存在，先删除旧的
      if (this.cache.has(key)) {
        this.delete(key, false)
      }

      this.cache.set(key, item)
      this.updateAccessOrder(key)
      
      this.stats.sets++
      this.stats.size++
      this.stats.memoryUsage += size
      this.updateHitRate()

      this.emitEvent('set', key, value)
      return true
    } catch (error) {
      console.error('Cache set error:', error)
      return false
    }
  }

  /**
   * 获取缓存项
   */
  get(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      this.stats.misses++
      this.updateHitRate()
      this.emitEvent('miss', key)
      return null
    }

    // 检查是否过期
    if (this.isExpired(item)) {
      this.delete(key, false)
      this.stats.misses++
      this.updateHitRate()
      this.emitEvent('miss', key)
      return null
    }

    // 更新访问信息
    item.lastAccessed = Date.now()
    item.accessCount++
    this.updateAccessOrder(key)

    this.stats.hits++
    this.updateHitRate()

    const value = this.config.enableSerialization ? this.deserialize(item.value) : item.value
    this.emitEvent('hit', key, value)
    return value
  }

  /**
   * 删除缓存项
   */
  delete(key: string, updateStats = true): boolean {
    const item = this.cache.get(key)
    
    if (!item) {
      return false
    }

    this.cache.delete(key)
    this.removeFromAccessOrder(key)

    if (updateStats) {
      this.stats.deletes++
      this.stats.size--
      this.stats.memoryUsage -= item.size
      this.emitEvent('delete', key, item.value)
    }

    return true
  }

  /**
   * 检查键是否存在
   */
  has(key: string): boolean {
    const item = this.cache.get(key)
    return item !== undefined && !this.isExpired(item)
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear()
    this.accessOrder = []
    this.stats.size = 0
    this.stats.memoryUsage = 0
  }

  /**
   * 根据标签删除缓存项
   */
  deleteByTag(tag: string): number {
    let deleted = 0
    
    for (const [key, item] of this.cache.entries()) {
      if (item.tags && item.tags.includes(tag)) {
        this.delete(key)
        deleted++
      }
    }

    return deleted
  }

  /**
   * 获取所有键
   */
  keys(): string[] {
    return Array.from(this.cache.keys()).filter(key => {
      const item = this.cache.get(key)
      return item && !this.isExpired(item)
    })
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.stats.size
  }

  /**
   * 获取统计信息
   */
  getStats(): CacheStats {
    return { ...this.stats }
  }

  /**
   * 添加事件监听器
   */
  addEventListener(listener: CacheEventListener<T>): void {
    this.listeners.push(listener)
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(listener: CacheEventListener<T>): void {
    const index = this.listeners.indexOf(listener)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }

  /**
   * 设置TTL
   */
  setTTL(key: string, ttl: number): boolean {
    const item = this.cache.get(key)
    if (item) {
      item.ttl = ttl
      return true
    }
    return false
  }

  /**
   * 获取TTL
   */
  getTTL(key: string): number | null {
    const item = this.cache.get(key)
    if (!item) {return null}

    const remaining = (item.createdAt + (item.ttl || this.config.ttl)) - Date.now()
    return Math.max(0, remaining)
  }

  /**
   * 预热缓存
   */
  async warmup(data: Array<{ key: string; value: T; options?: any }>): Promise<void> {
    for (const { key, value, options } of data) {
      this.set(key, value, options)
    }
  }

  /**
   * 导出缓存数据
   */
  export(): Array<{ key: string; value: T; metadata: any }> {
    const result: Array<{ key: string; value: T; metadata: any }> = []
    
    for (const [key, item] of this.cache.entries()) {
      if (!this.isExpired(item)) {
        result.push({
          key,
          value: this.config.enableSerialization ? this.deserialize(item.value) : item.value,
          metadata: {
            createdAt: item.createdAt,
            lastAccessed: item.lastAccessed,
            accessCount: item.accessCount,
            ttl: item.ttl,
            tags: item.tags
          }
        })
      }
    }

    return result
  }

  /**
   * 销毁缓存管理器
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
    this.clear()
    this.listeners = []
  }

  // 私有方法

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.config.checkPeriod)
  }

  private cleanup(): void {
    const now = Date.now()
    let expired = 0

    for (const [key, item] of this.cache.entries()) {
      if (this.isExpired(item)) {
        this.delete(key, false)
        expired++
        this.emitEvent('expire', key, item.value)
      }
    }

    if (expired > 0) {
      console.log(`Cache cleanup: ${expired} expired items removed`)
    }
  }

  private isExpired(item: CacheItem<T>): boolean {
    const ttl = item.ttl || this.config.ttl
    return Date.now() > item.createdAt + ttl
  }

  private ensureCapacity(newItemSize: number): void {
    while (this.stats.size >= this.config.maxSize || 
           this.stats.memoryUsage + newItemSize > this.config.maxSize * 1024) {
      this.evictOne()
    }
  }

  private evictOne(): void {
    let keyToEvict: string | null = null

    switch (this.config.evictionPolicy) {
      case 'lru':
        keyToEvict = this.accessOrder[0] || null
        break
      case 'lfu':
        keyToEvict = this.findLFUKey()
        break
      case 'ttl':
        keyToEvict = this.findEarliestExpiringKey()
        break
      case 'fifo':
        keyToEvict = this.findOldestKey()
        break
    }

    if (keyToEvict) {
      const item = this.cache.get(keyToEvict)
      this.delete(keyToEvict, false)
      this.stats.evictions++
      this.emitEvent('evict', keyToEvict, item?.value)
    }
  }

  private findLFUKey(): string | null {
    let minAccess = Infinity
    let keyToEvict: string | null = null

    for (const [key, item] of this.cache.entries()) {
      if (item.accessCount < minAccess) {
        minAccess = item.accessCount
        keyToEvict = key
      }
    }

    return keyToEvict
  }

  private findEarliestExpiringKey(): string | null {
    let earliestExpiry = Infinity
    let keyToEvict: string | null = null

    for (const [key, item] of this.cache.entries()) {
      const expiry = item.createdAt + (item.ttl || this.config.ttl)
      if (expiry < earliestExpiry) {
        earliestExpiry = expiry
        keyToEvict = key
      }
    }

    return keyToEvict
  }

  private findOldestKey(): string | null {
    let oldestTime = Infinity
    let keyToEvict: string | null = null

    for (const [key, item] of this.cache.entries()) {
      if (item.createdAt < oldestTime) {
        oldestTime = item.createdAt
        keyToEvict = key
      }
    }

    return keyToEvict
  }

  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key)
    this.accessOrder.push(key)
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }
  }

  private calculateSize(value: T): number {
    try {
      return JSON.stringify(value).length
    } catch {
      return 1
    }
  }

  private serialize(value: T): any {
    return this.config.enableSerialization ? JSON.stringify(value) : value
  }

  private deserialize(value: any): T {
    try {
      return this.config.enableSerialization ? JSON.parse(value) : value
    } catch {
      return value
    }
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0
  }

  private emitEvent(type: CacheEventType, key: string, value?: T): void {
    const event = {
      type,
      key,
      value,
      timestamp: Date.now()
    }

    this.listeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('Cache event listener error:', error)
      }
    })
  }
}

// 创建默认实例
export const defaultCacheManager = new AdvancedCacheManager({
  maxSize: 1000,
  ttl: 5 * 60 * 1000, // 5分钟
  checkPeriod: 60 * 1000, // 1分钟
  enableCompression: false,
  enableSerialization: true,
  evictionPolicy: 'lru'
})

// 导出类型
export type { CacheConfig, CacheItem, CacheStats, CacheEventType, CacheEventListener } 