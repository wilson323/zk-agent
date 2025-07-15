// @ts-nocheck
/**
 * 本地Redis缓存管理器
 * 支持本地Redis实例的高级缓存功能
 */

import Redis from "ioredis"
import { logger } from '@/lib/utils/logger';

export interface RedisCacheConfig {
  host: string
  port: number
  password?: string
  db: number
  keyPrefix: string
  defaultTTL: number
  maxRetries: number
  retryDelayOnFailover: number
  enableReadyCheck: boolean
  lazyConnect: boolean
}

export interface RedisCacheOptions {
  ttl?: number
  tags?: string[]
  compress?: boolean
  serialize?: boolean
}

export class RedisCacheManager {
  private redis: Redis
  private config: RedisCacheConfig
  private isConnected = false
  private metrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
  }

  constructor(config: Partial<RedisCacheConfig> = {}) {
    this.config = {
      host: process.env.REDIS_HOST || "localhost",
      port: Number.parseInt(process.env.REDIS_PORT || "6379"),
      password: process.env.REDIS_PASSWORD,
      db: Number.parseInt(process.env.REDIS_DB || "0"),
      keyPrefix: process.env.REDIS_KEY_PREFIX || "ai_chat:",
      defaultTTL: 3600, // 1小时
      maxRetries: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      lazyConnect: true,
      ...config,
    }

    this.redis = new Redis({
      host: this.config.host,
      port: this.config.port,
      password: this.config.password,
      db: this.config.db,
      keyPrefix: this.config.keyPrefix,
      maxRetriesPerRequest: this.config.maxRetries,
      retryDelayOnFailover: this.config.retryDelayOnFailover,
      enableReadyCheck: this.config.enableReadyCheck,
      lazyConnect: this.config.lazyConnect,
      // 连接配置
      connectTimeout: 10000,
      commandTimeout: 5000,
      // 重连配置
      retryDelayOnClusterDown: 300,
      retryDelayOnClusterFailover: 100,
      maxRetriesPerRequest: 3,
    })

    this.setupEventHandlers()
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    this.redis.on("connect", () => {

    }
  }

  /**
   * 批量设置
   */
  async mset(data: Array<{ key: string; value: any; options?: RedisCacheOptions }>): Promise<boolean> {
    try {
      const pipeline = this.redis.pipeline()

      data.forEach(({ key, value, options = {} }) => {
        const ttl = options.ttl || this.config.defaultTTL
        const serializedValue = JSON.stringify({
          value,
          tags: options.tags || [],
          createdAt: Date.now(),
          compressed: options.compress || false,
        })

        pipeline.setex(key, ttl, serializedValue)

        // 设置标签索引
        if (options.tags && options.tags.length > 0) {
          options.tags.forEach((tag) => {
            pipeline.sadd(`tag:${tag}`, key)
            pipeline.expire(`tag:${tag}`, ttl)
          })
        }
      })

      await pipeline.exec()
      this.metrics.sets += data.length
      return true
    } catch (error) {
      logger.error("Redis批量设置失败:", error)
      this.metrics.errors++
      return false
    }
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<boolean> {
    try {
      await this.redis.flushdb()
      return true
    } catch (error) {
      logger.error("Redis清空缓存失败:", error)
      this.metrics.errors++
      return false
    }
  }

  /**
   * 获取所有键
   */
  async getKeys(pattern = "*"): Promise<string[]> {
    try {
      return await this.redis.keys(pattern)
    } catch (error) {
      logger.error("Redis获取键列表失败:", error)
      this.metrics.errors++
      return []
    }
  }

  /**
   * 获取缓存大小
   */
  async getSize(): Promise<number> {
    try {
      return await this.redis.dbsize()
    } catch (error) {
      logger.error("Redis获取缓存大小失败:", error)
      this.metrics.errors++
      return 0
    }
  }

  /**
   * 获取内存使用情况
   */
  async getMemoryUsage(): Promise<any> {
    try {
      const info = await this.redis.memory("usage")
      return info
    } catch (error) {
      logger.error("Redis获取内存使用情况失败:", error)
      this.metrics.errors++
      return null
    }
  }

  /**
   * 获取统计信息
   */
  getMetrics() {
    const total = this.metrics.hits + this.metrics.misses
    return {
      ...this.metrics,
      hitRate: total > 0 ? this.metrics.hits / total : 0,
      isConnected: this.isConnected,
    }
  }

  /**
   * 获取Redis信息
   */
  async getInfo(): Promise<any> {
    try {
      const info = await this.redis.info()
      return info
    } catch (error) {
      logger.error("Redis获取信息失败:", error)
      this.metrics.errors++
      return null
    }
  }

  /**
   * 执行原始Redis命令
   */
  async executeCommand(command: string, ...args: any[]): Promise<any> {
    try {
      return await (this.redis as any)[command](...args)
    } catch (error) {
      logger.error(`Redis执行命令${command}失败:`, error)
      this.metrics.errors++
      throw error
    }
  }

  /**
   * 关闭连接
   */
  async disconnect(): Promise<void> {
    try {
      await this.redis.quit()

// 导出便捷方法
export const redisCache = {
  set: <T>(key: string, value: T, options?: RedisCacheOptions) => 
    redisCacheManager.set(key, value, options),
  get: <T>(key: string) => 
    redisCacheManager.get<T>(key),
  delete: (key: string) => 
    redisCacheManager.delete(key),
  has: (key: string) => 
    redisCacheManager.has(key),
  clear: () => 
    redisCacheManager.clear(),
  getMetrics: () => 
    redisCacheManager.getMetrics(),
}
