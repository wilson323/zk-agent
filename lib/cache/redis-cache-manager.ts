// @ts-nocheck
/**
 * 本地Redis缓存管理器
 * 支持本地Redis实例的高级缓存功能
 */

import Redis from "ioredis"

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
      console.log("Redis连接已建立")
      this.isConnected = true
    })

    this.redis.on("ready", () => {
      console.log("Redis连接就绪")
      this.isConnected = true
    })

    this.redis.on("error", (error) => {
      console.error("Redis连接错误:", error)
      this.metrics.errors++
      this.isConnected = false
    })

    this.redis.on("close", () => {
      console.log("Redis连接已关闭")
      this.isConnected = false
    })

    this.redis.on("reconnecting", () => {
      console.log("Redis正在重连...")
    })
  }

  /**
   * 检查连接状态
   */
  async checkConnection(): Promise<boolean> {
    try {
      await this.redis.ping()
      return true
    } catch (error) {
      console.error("Redis连接检查失败:", error)
      return false
    }
  }

  /**
   * 设置缓存
   */
  async set<T>(key: string, value: T, options: RedisCacheOptions = {}): Promise<boolean> {
    try {
      const ttl = options.ttl || this.config.defaultTTL
      const tags = options.tags || []

      // 序列化数据
      let serializedValue: string
      if (options.serialize !== false) {
        serializedValue = JSON.stringify({
          value,
          tags,
          createdAt: Date.now(),
          compressed: options.compress || false,
        })
      } else {
        serializedValue = value as string
      }

      // 压缩数据（如果需要）
      if (options.compress) {
        // 这里可以添加压缩逻辑
        // serializedValue = await compress(serializedValue)
      }

      // 设置缓存
      const result = await this.redis.setex(key, ttl, serializedValue)

      // 设置标签索引
      if (tags.length > 0) {
        const pipeline = this.redis.pipeline()
        tags.forEach((tag) => {
          pipeline.sadd(`tag:${tag}`, key)
          pipeline.expire(`tag:${tag}`, ttl)
        })
        await pipeline.exec()
      }

      this.metrics.sets++
      return result === "OK"
    } catch (error) {
      console.error("Redis设置缓存失败:", error)
      this.metrics.errors++
      return false
    }
  }

  /**
   * 获取缓存
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key)

      if (!value) {
        this.metrics.misses++
        return null
      }

      // 反序列化数据
      try {
        const parsed = JSON.parse(value)

        // 解压缩数据（如果需要）
        if (parsed.compressed) {
          // 这里可以添加解压缩逻辑
          // parsed.value = await decompress(parsed.value)
        }

        this.metrics.hits++
        return parsed.value as T
      } catch (parseError) {
        // 如果解析失败，返回原始值
        this.metrics.hits++
        return value as T
      }
    } catch (error) {
      console.error("Redis获取缓存失败:", error)
      this.metrics.errors++
      this.metrics.misses++
      return null
    }
  }

  /**
   * 删除缓存
   */
  async delete(key: string): Promise<boolean> {
    try {
      // 获取标签信息
      const value = await this.redis.get(key)
      if (value) {
        try {
          const parsed = JSON.parse(value)
          if (parsed.tags && Array.isArray(parsed.tags)) {
            // 从标签索引中移除
            const pipeline = this.redis.pipeline()
            parsed.tags.forEach((tag: string) => {
              pipeline.srem(`tag:${tag}`, key)
            })
            await pipeline.exec()
          }
        } catch {
          // 忽略解析错误
        }
      }

      const result = await this.redis.del(key)
      this.metrics.deletes++
      return result > 0
    } catch (error) {
      console.error("Redis删除缓存失败:", error)
      this.metrics.errors++
      return false
    }
  }

  /**
   * 根据标签删除缓存
   */
  async deleteByTag(tag: string): Promise<number> {
    try {
      const keys = await this.redis.smembers(`tag:${tag}`)

      if (keys.length === 0) {return 0}

      const pipeline = this.redis.pipeline()
      keys.forEach((key) => {
        pipeline.del(key)
      })
      pipeline.del(`tag:${tag}`)

      const results = await pipeline.exec()
      const deletedCount = results?.filter(([err, result]) => !err && result === 1).length || 0

      this.metrics.deletes += deletedCount
      return deletedCount
    } catch (error) {
      console.error("Redis按标签删除缓存失败:", error)
      this.metrics.errors++
      return 0
    }
  }

  /**
   * 检查缓存是否存在
   */
  async has(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key)
      return result === 1
    } catch (error) {
      console.error("Redis检查缓存存在性失败:", error)
      this.metrics.errors++
      return false
    }
  }

  /**
   * 获取缓存TTL
   */
  async getTTL(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key)
    } catch (error) {
      console.error("Redis获取TTL失败:", error)
      this.metrics.errors++
      return -1
    }
  }

  /**
   * 设置缓存过期时间
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.redis.expire(key, seconds)
      return result === 1
    } catch (error) {
      console.error("Redis设置过期时间失败:", error)
      this.metrics.errors++
      return false
    }
  }

  /**
   * 批量获取
   */
  async mget<T>(keys: string[]): Promise<Map<string, T | null>> {
    try {
      const values = await this.redis.mget(...keys)
      const result = new Map<string, T | null>()

      keys.forEach((key, index) => {
        const value = values[index]
        if (value) {
          try {
            const parsed = JSON.parse(value)
            result.set(key, parsed.value as T)
            this.metrics.hits++
          } catch {
            result.set(key, value as T)
            this.metrics.hits++
          }
        } else {
          result.set(key, null)
          this.metrics.misses++
        }
      })

      return result
    } catch (error) {
      console.error("Redis批量获取失败:", error)
      this.metrics.errors++
      return new Map()
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
      console.error("Redis批量设置失败:", error)
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
      console.error("Redis清空缓存失败:", error)
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
      console.error("Redis获取键列表失败:", error)
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
      console.error("Redis获取缓存大小失败:", error)
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
      console.error("Redis获取内存使用情况失败:", error)
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
      console.error("Redis获取信息失败:", error)
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
      console.error(`Redis执行命令${command}失败:`, error)
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
      console.log("Redis连接已关闭")
    } catch (error) {
      console.error("Redis关闭连接失败:", error)
    }
  }

  /**
   * 获取Redis实例（用于高级操作）
   */
  getRedisInstance(): Redis {
    return this.redis
  }
}

// 创建全局Redis缓存管理器实例
export const redisCacheManager = new RedisCacheManager()

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
