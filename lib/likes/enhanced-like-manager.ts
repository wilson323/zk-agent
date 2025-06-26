// @ts-nocheck
/**
 * 增强点赞管理器
 * 支持本地缓存、批量操作、性能优化
 */

export interface LikeData {
  itemId: string
  itemType: "poster" | "cad_analysis" | "chat_message"
  userId?: string
  timestamp: Date
}

export interface LikeResult {
  success: boolean
  isLiked: boolean
  likeCount: number
  error?: string
}

export interface LikeStats {
  totalLikes: number
  todayLikes: number
  popularItems: Array<{
    itemId: string
    itemType: string
    likeCount: number
  }>
}

export class EnhancedLikeManager {
  private cache = new Map<string, { isLiked: boolean; count: number; timestamp: number }>()
  private pendingRequests = new Map<string, Promise<LikeResult>>()
  private batchQueue: LikeData[] = []
  private batchTimer: NodeJS.Timeout | null = null

  /**
   * 切换点赞状态
   */
  async toggleLike(itemId: string, itemType: string): Promise<LikeResult> {
    const cacheKey = `${itemType}:${itemId}`

    // 检查是否有正在进行的请求
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!
    }

    // 乐观更新缓存
    const cached = this.cache.get(cacheKey)
    const optimisticLiked = cached ? !cached.isLiked : true
    const optimisticCount = cached ? cached.count + (optimisticLiked ? 1 : -1) : 1

    this.cache.set(cacheKey, {
      isLiked: optimisticLiked,
      count: Math.max(0, optimisticCount),
      timestamp: Date.now(),
    })

    // 创建请求Promise
    const requestPromise = this.performToggleLike(itemId, itemType)
    this.pendingRequests.set(cacheKey, requestPromise)

    try {
      const result = await requestPromise

      // 更新缓存为实际结果
      this.cache.set(cacheKey, {
        isLiked: result.isLiked,
        count: result.likeCount,
        timestamp: Date.now(),
      })

      return result
    } catch (error) {
      // 回滚乐观更新
      if (cached) {
        this.cache.set(cacheKey, cached)
      } else {
        this.cache.delete(cacheKey)
      }

      throw error
    } finally {
      this.pendingRequests.delete(cacheKey)
    }
  }

  /**
   * 执行实际的点赞切换
   */
  private async performToggleLike(itemId: string, itemType: string): Promise<LikeResult> {
    try {
      const response = await fetch("/api/likes/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, itemType }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        return {
          success: true,
          isLiked: result.isLiked,
          likeCount: result.likeCount,
        }
      } else {
        return {
          success: false,
          isLiked: false,
          likeCount: 0,
          error: result.error || "操作失败",
        }
      }
    } catch (error) {
      console.error("Toggle like failed:", error)
      return {
        success: false,
        isLiked: false,
        likeCount: 0,
        error: "网络错误，请稍后重试",
      }
    }
  }

  /**
   * 获取点赞状态
   */
  async getLikeStatus(itemId: string, itemType: string): Promise<{ isLiked: boolean; count: number }> {
    const cacheKey = `${itemType}:${itemId}`
    const cached = this.cache.get(cacheKey)

    // 如果缓存存在且未过期（5分钟）
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return { isLiked: cached.isLiked, count: cached.count }
    }

    try {
      const response = await fetch(`/api/likes/status?itemId=${itemId}&itemType=${itemType}`)
      const result = await response.json()

      if (result.success) {
        // 更新缓存
        this.cache.set(cacheKey, {
          isLiked: result.isLiked,
          count: result.count,
          timestamp: Date.now(),
        })

        return { isLiked: result.isLiked, count: result.count }
      }
    } catch (error) {
      console.error("Get like status failed:", error)
    }

    // 返回默认值
    return { isLiked: false, count: 0 }
  }

  /**
   * 批量获取点赞状态
   */
  async getBatchLikeStatus(
    items: Array<{ itemId: string; itemType: string }>,
  ): Promise<Map<string, { isLiked: boolean; count: number }>> {
    const result = new Map<string, { isLiked: boolean; count: number }>()
    const uncachedItems: Array<{ itemId: string; itemType: string }> = []

    // 检查缓存
    for (const item of items) {
      const cacheKey = `${item.itemType}:${item.itemId}`
      const cached = this.cache.get(cacheKey)

      if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
        result.set(cacheKey, { isLiked: cached.isLiked, count: cached.count })
      } else {
        uncachedItems.push(item)
      }
    }

    // 批量请求未缓存的项目
    if (uncachedItems.length > 0) {
      try {
        const response = await fetch("/api/likes/batch-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: uncachedItems }),
        })

        const batchResult = await response.json()

        if (batchResult.success) {
          for (const [key, data] of Object.entries(batchResult.data as Record<string, any>)) {
            result.set(key, data)
            this.cache.set(key, { ...data, timestamp: Date.now() })
          }
        }
      } catch (error) {
        console.error("Batch get like status failed:", error)
      }
    }

    return result
  }

  /**
   * 获取点赞统计
   */
  async getLikeStats(): Promise<LikeStats> {
    try {
      const response = await fetch("/api/likes/stats")
      const result = await response.json()

      if (result.success) {
        return result.data
      }
    } catch (error) {
      console.error("Get like stats failed:", error)
    }

    return {
      totalLikes: 0,
      todayLikes: 0,
      popularItems: [],
    }
  }

  /**
   * 清理过期缓存
   */
  cleanupCache(): void {
    const now = Date.now()
    const maxAge = 10 * 60 * 1000 // 10分钟

    for (const [key, data] of this.cache.entries()) {
      if (now - data.timestamp > maxAge) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * 预加载点赞状态
   */
  async preloadLikeStatus(items: Array<{ itemId: string; itemType: string }>): Promise<void> {
    // 在后台预加载，不阻塞UI
    this.getBatchLikeStatus(items).catch((error) => {
      console.error("Preload like status failed:", error)
    })
  }
}

export const enhancedLikeManager = new EnhancedLikeManager()

// 定期清理缓存
if (typeof window !== "undefined") {
  setInterval(
    () => {
      enhancedLikeManager.cleanupCache()
    },
    5 * 60 * 1000,
  ) // 每5分钟清理一次
}
