// @ts-nocheck
/**
 * 高性能点赞管理器
 * 支持对话、CAD分析、海报设计的点赞功能
 * 优化性能，减少资源占用，支持批量操作
 */

export interface LikeableItem {
  id: string
  type: "conversation" | "cad_analysis" | "poster_design" | "message"
  parentId?: string // 父级ID，如消息属于对话
  userId: string
  createdAt: Date
}

export interface LikeRecord {
  id: string
  itemId: string
  itemType: string
  userId: string
  createdAt: Date
  isActive: boolean
}

export interface LikeStats {
  itemId: string
  itemType: string
  totalLikes: number
  uniqueUsers: number
  recentLikes: number // 最近24小时
  trending: boolean // 是否为热门
}

export interface UserLikeActivity {
  userId: string
  totalLikes: number
  recentActivity: LikeRecord[]
  favoriteTypes: Record<string, number>
}

/**
 * 点赞管理器
 * 高性能、轻量级的点赞功能实现
 */
export class LikeManager {
  private likeCache = new Map<string, LikeStats>()
  private userLikeCache = new Map<string, Set<string>>() // userId -> Set<itemId>
  private batchQueue: LikeRecord[] = []
  private batchTimer: NodeJS.Timeout | null = null
  private readonly batchSize = 10
  private readonly batchDelay = 1000 // 1秒批量处理

  /**
   * 点赞/取消点赞
   */
  async toggleLike(
    itemId: string,
    itemType: string,
    userId: string,
  ): Promise<{
    isLiked: boolean
    totalLikes: number
  }> {
    try {
      // 检查当前点赞状态
      const isCurrentlyLiked = await this.isLiked(itemId, userId)

      if (isCurrentlyLiked) {
        // 取消点赞
        await this.removeLike(itemId, itemType, userId)
        const stats = await this.getLikeStats(itemId, itemType)

        return {
          isLiked: false,
          totalLikes: stats.totalLikes,
        }
      } else {
        // 添加点赞
        await this.addLike(itemId, itemType, userId)
        const stats = await this.getLikeStats(itemId, itemType)

        return {
          isLiked: true,
          totalLikes: stats.totalLikes,
        }
      }
    } catch (error) {
      console.error("切换点赞状态失败:", error)
      throw new Error("操作失败，请重试")
    }
  }

  /**
   * 检查是否已点赞
   */
  async isLiked(itemId: string, userId: string): Promise<boolean> {
    try {
      // 先检查缓存
      const userLikes = this.userLikeCache.get(userId)
      if (userLikes) {
        return userLikes.has(itemId)
      }

      // 从存储加载用户点赞记录
      const likedItems = await this.loadUserLikes(userId)
      this.userLikeCache.set(userId, new Set(likedItems))

      return likedItems.includes(itemId)
    } catch (error) {
      console.error("检查点赞状态失败:", error)
      return false
    }
  }

  /**
   * 获取点赞统计
   */
  async getLikeStats(itemId: string, itemType: string): Promise<LikeStats> {
    try {
      const cacheKey = `${itemType}_${itemId}`

      // 检查缓存
      let stats = this.likeCache.get(cacheKey)
      if (stats) {
        return stats
      }

      // 从存储加载统计数据
      stats = await this.loadLikeStats(itemId, itemType)

      // 更新缓存
      this.likeCache.set(cacheKey, stats)

      return stats
    } catch (error) {
      console.error("获取点赞统计失败:", error)
      return {
        itemId,
        itemType,
        totalLikes: 0,
        uniqueUsers: 0,
        recentLikes: 0,
        trending: false,
      }
    }
  }

  /**
   * 批量获取点赞统计
   */
  async getBatchLikeStats(items: Array<{ id: string; type: string }>): Promise<Map<string, LikeStats>> {
    const results = new Map<string, LikeStats>()

    try {
      // 并行获取所有统计数据
      const promises = items.map(async (item) => {
        const stats = await this.getLikeStats(item.id, item.type)
        return { key: `${item.type}_${item.id}`, stats }
      })

      const resolvedStats = await Promise.all(promises)

      resolvedStats.forEach(({ key, stats }) => {
        results.set(key, stats)
      })

      return results
    } catch (error) {
      console.error("批量获取点赞统计失败:", error)
      return results
    }
  }

  /**
   * 获取用户点赞活动
   */
  async getUserLikeActivity(userId: string): Promise<UserLikeActivity> {
    try {
      const likedItems = await this.loadUserLikes(userId)
      const recentActivity = await this.loadUserRecentActivity(userId, 10)

      // 统计喜好类型
      const favoriteTypes: Record<string, number> = {}
      for (const record of recentActivity) {
        favoriteTypes[record.itemType] = (favoriteTypes[record.itemType] || 0) + 1
      }

      return {
        userId,
        totalLikes: likedItems.length,
        recentActivity,
        favoriteTypes,
      }
    } catch (error) {
      console.error("获取用户点赞活动失败:", error)
      return {
        userId,
        totalLikes: 0,
        recentActivity: [],
        favoriteTypes: {},
      }
    }
  }

  /**
   * 获取热门内容
   */
  async getTrendingContent(itemType?: string, limit = 10): Promise<LikeStats[]> {
    try {
      const allStats = await this.loadAllLikeStats(itemType)

      // 计算热门度分数
      const now = Date.now()
      const oneDayAgo = now - 24 * 60 * 60 * 1000

      const scoredStats = allStats.map((stats) => {
        // 热门度 = 总点赞数 * 0.7 + 最近点赞数 * 0.3
        const score = stats.totalLikes * 0.7 + stats.recentLikes * 0.3
        return { ...stats, score }
      })

      // 按分数排序并返回前N个
      return scoredStats
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(({ score, ...stats }) => ({ ...stats, trending: score > 10 }))
    } catch (error) {
      console.error("获取热门内容失败:", error)
      return []
    }
  }

  /**
   * 清理无效点赞记录
   */
  async cleanupInvalidLikes(): Promise<number> {
    try {
      let cleanedCount = 0

      // 获取所有点赞记录
      const allLikes = await this.loadAllLikes()

      for (const like of allLikes) {
        // 检查对应的内容是否还存在
        const contentExists = await this.checkContentExists(like.itemId, like.itemType)

        if (!contentExists) {
          await this.removeLikeRecord(like.id)
          cleanedCount++
        }
      }

      // 清除缓存
      this.likeCache.clear()
      this.userLikeCache.clear()

      return cleanedCount
    } catch (error) {
      console.error("清理无效点赞记录失败:", error)
      return 0
    }
  }

  // 私有方法

  /**
   * 添加点赞
   */
  private async addLike(itemId: string, itemType: string, userId: string): Promise<void> {
    const likeRecord: LikeRecord = {
      id: `like_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      itemId,
      itemType,
      userId,
      createdAt: new Date(),
      isActive: true,
    }

    // 添加到批量队列
    this.batchQueue.push(likeRecord)

    // 立即更新缓存
    this.updateCacheForNewLike(itemId, itemType, userId)

    // 启动批量处理
    this.scheduleBatchProcess()
  }

  /**
   * 移除点赞
   */
  private async removeLike(itemId: string, itemType: string, userId: string): Promise<void> {
    // 从存储中移除
    await this.removeLikeFromStorage(itemId, userId)

    // 更新缓存
    this.updateCacheForRemovedLike(itemId, itemType, userId)
  }

  /**
   * 更新缓存（新增点赞）
   */
  private updateCacheForNewLike(itemId: string, itemType: string, userId: string): void {
    // 更新用户点赞缓存
    let userLikes = this.userLikeCache.get(userId)
    if (!userLikes) {
      userLikes = new Set()
      this.userLikeCache.set(userId, userLikes)
    }
    userLikes.add(itemId)

    // 更新统计缓存
    const cacheKey = `${itemType}_${itemId}`
    const stats = this.likeCache.get(cacheKey)
    if (stats) {
      stats.totalLikes++
      stats.recentLikes++
      this.likeCache.set(cacheKey, stats)
    }
  }

  /**
   * 更新缓存（移除点赞）
   */
  private updateCacheForRemovedLike(itemId: string, itemType: string, userId: string): void {
    // 更新用户点赞缓存
    const userLikes = this.userLikeCache.get(userId)
    if (userLikes) {
      userLikes.delete(itemId)
    }

    // 更新统计缓存
    const cacheKey = `${itemType}_${itemId}`
    const stats = this.likeCache.get(cacheKey)
    if (stats) {
      stats.totalLikes = Math.max(0, stats.totalLikes - 1)
      this.likeCache.set(cacheKey, stats)
    }
  }

  /**
   * 调度批量处理
   */
  private scheduleBatchProcess(): void {
    if (this.batchTimer) {
      return // 已经有定时器在运行
    }

    this.batchTimer = setTimeout(async () => {
      await this.processBatch()
      this.batchTimer = null

      // 如果还有待处理的记录，继续调度
      if (this.batchQueue.length > 0) {
        this.scheduleBatchProcess()
      }
    }, this.batchDelay)
  }

  /**
   * 处理批量操作
   */
  private async processBatch(): Promise<void> {
    if (this.batchQueue.length === 0) {
      return
    }

    const batch = this.batchQueue.splice(0, this.batchSize)

    try {
      // 批量保存到存储
      await this.saveLikeBatch(batch)
    } catch (error) {
      console.error("批量处理点赞失败:", error)
      // 将失败的记录重新加入队列
      this.batchQueue.unshift(...batch)
    }
  }

  /**
   * 从存储加载用户点赞
   */
  private async loadUserLikes(userId: string): Promise<string[]> {
    try {
      const likesData = localStorage.getItem(`user_likes_${userId}`)
      return likesData ? JSON.parse(likesData) : []
    } catch (error) {
      console.error("加载用户点赞失败:", error)
      return []
    }
  }

  /**
   * 加载点赞统计
   */
  private async loadLikeStats(itemId: string, itemType: string): Promise<LikeStats> {
    try {
      const statsData = localStorage.getItem(`like_stats_${itemType}_${itemId}`)

      if (statsData) {
        return JSON.parse(statsData)
      }

      // 如果没有缓存的统计数据，计算统计
      return await this.calculateLikeStats(itemId, itemType)
    } catch (error) {
      console.error("加载点赞统计失败:", error)
      return {
        itemId,
        itemType,
        totalLikes: 0,
        uniqueUsers: 0,
        recentLikes: 0,
        trending: false,
      }
    }
  }

  /**
   * 计算点赞统计
   */
  private async calculateLikeStats(itemId: string, itemType: string): Promise<LikeStats> {
    const allLikes = await this.loadAllLikes()
    const itemLikes = allLikes.filter((like) => like.itemId === itemId && like.itemType === itemType)

    const uniqueUsers = new Set(itemLikes.map((like) => like.userId)).size
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentLikes = itemLikes.filter((like) => like.createdAt > oneDayAgo).length

    const stats: LikeStats = {
      itemId,
      itemType,
      totalLikes: itemLikes.length,
      uniqueUsers,
      recentLikes,
      trending: recentLikes > 5, // 简单的热门判断
    }

    // 缓存统计数据
    localStorage.setItem(`like_stats_${itemType}_${itemId}`, JSON.stringify(stats))

    return stats
  }

  /**
   * 加载所有点赞记录
   */
  private async loadAllLikes(): Promise<LikeRecord[]> {
    const likes: LikeRecord[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith("like_record_")) {
        try {
          const likeData = localStorage.getItem(key)
          if (likeData) {
            const like = JSON.parse(likeData) as LikeRecord
            like.createdAt = new Date(like.createdAt)
            likes.push(like)
          }
        } catch (error) {
          console.error("解析点赞记录失败:", error)
        }
      }
    }

    return likes
  }

  /**
   * 加载所有点赞统计
   */
  private async loadAllLikeStats(itemType?: string): Promise<LikeStats[]> {
    const stats: LikeStats[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith("like_stats_")) {
        if (!itemType || key.includes(`like_stats_${itemType}_`)) {
          try {
            const statsData = localStorage.getItem(key)
            if (statsData) {
              stats.push(JSON.parse(statsData))
            }
          } catch (error) {
            console.error("解析点赞统计失败:", error)
          }
        }
      }
    }

    return stats
  }

  /**
   * 加载用户最近活动
   */
  private async loadUserRecentActivity(userId: string, limit: number): Promise<LikeRecord[]> {
    const allLikes = await this.loadAllLikes()

    return allLikes
      .filter((like) => like.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
  }

  /**
   * 检查内容是否存在
   */
  private async checkContentExists(itemId: string, itemType: string): Promise<boolean> {
    try {
      let key: string

      switch (itemType) {
        case "conversation":
          key = `conversation_${itemId}`
          break
        case "cad_analysis":
          key = `cad_analysis_${itemId}`
          break
        case "poster_design":
          key = `poster_design_${itemId}`
          break
        case "message":
          key = `message_${itemId}`
          break
        default:
          return false
      }

      return localStorage.getItem(key) !== null
    } catch (error) {
      console.error("检查内容存在性失败:", error)
      return false
    }
  }

  /**
   * 批量保存点赞记录
   */
  private async saveLikeBatch(likes: LikeRecord[]): Promise<void> {
    for (const like of likes) {
      // 保存点赞记录
      localStorage.setItem(`like_record_${like.id}`, JSON.stringify(like))

      // 更新用户点赞列表
      const userLikes = await this.loadUserLikes(like.userId)
      if (!userLikes.includes(like.itemId)) {
        userLikes.push(like.itemId)
        localStorage.setItem(`user_likes_${like.userId}`, JSON.stringify(userLikes))
      }
    }
  }

  /**
   * 从存储中移除点赞
   */
  private async removeLikeFromStorage(itemId: string, userId: string): Promise<void> {
    // 更新用户点赞列表
    const userLikes = await this.loadUserLikes(userId)
    const updatedLikes = userLikes.filter((id) => id !== itemId)
    localStorage.setItem(`user_likes_${userId}`, JSON.stringify(updatedLikes))

    // 查找并删除对应的点赞记录
    const allLikes = await this.loadAllLikes()
    const likeToRemove = allLikes.find((like) => like.itemId === itemId && like.userId === userId)

    if (likeToRemove) {
      localStorage.removeItem(`like_record_${likeToRemove.id}`)
    }
  }

  /**
   * 移除点赞记录
   */
  private async removeLikeRecord(likeId: string): Promise<void> {
    localStorage.removeItem(`like_record_${likeId}`)
  }
}

// 全局点赞管理器实例
export const likeManager = new LikeManager()

// 定期清理无效点赞记录（每6小时执行一次）
if (typeof window !== "undefined") {
  setInterval(
    () => {
      likeManager.cleanupInvalidLikes().catch(console.error)
    },
    6 * 60 * 60 * 1000,
  )
}
