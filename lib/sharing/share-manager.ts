/* eslint-disable */
// @ts-nocheck
/**
 * 高性能分享管理器
 * 支持对话、CAD分析、海报设计的分享功能
 * 优化性能，减少资源占用
 */

export interface ShareableContent {
  id: string
  type: "conversation" | "cad_analysis" | "poster_design"
  title: string
  content: any
  userId: string
  createdAt: Date
  metadata?: Record<string, any>
}

export interface ShareConfig {
  expiresIn?: number // 过期时间（毫秒）
  password?: string // 访问密码
  allowDownload?: boolean // 允许下载
  allowCopy?: boolean // 允许复制
  viewLimit?: number // 查看次数限制
  isPublic?: boolean // 是否公开
}

export interface ShareLink {
  id: string
  shareId: string
  contentId: string
  contentType: string
  url: string
  config: ShareConfig
  viewCount: number
  createdAt: Date
  expiresAt?: Date
  isActive: boolean
}

export interface ShareStats {
  totalShares: number
  totalViews: number
  activeShares: number
  expiredShares: number
  popularContent: Array<{
    contentId: string
    title: string
    views: number
    shares: number
  }>
}

/**
 * 分享管理器
 * 高性能、轻量级的分享功能实现
 */
export class ShareManager {
  private shareCache = new Map<string, ShareLink>()
  private contentCache = new Map<string, ShareableContent>()
  private statsCache: ShareStats | null = null
  private cacheExpiry = 5 * 60 * 1000 // 5分钟缓存

  /**
   * 创建分享链接
   */
  async createShareLink(
    contentId: string,
    contentType: "conversation" | "cad_analysis" | "poster_design",
    config: ShareConfig = {},
  ): Promise<ShareLink> {
    try {
      // 生成唯一分享ID
      const shareId: any = this.generateShareId()

      // 设置默认配置
      const defaultConfig: ShareConfig = {
        expiresIn: 7 * 24 * 60 * 60 * 1000, // 7天
        allowDownload: true,
        allowCopy: true,
        viewLimit: 1000,
        isPublic: false,
        ...config,
      }

      // 计算过期时间
      const expiresAt: any = defaultConfig.expiresIn ? new Date(Date.now() + defaultConfig.expiresIn) : undefined

      // 生成分享URL
      const url: any = `/shared/${shareId}`

      const shareLink: ShareLink = {
        id: `share_${Date.now()}`,
        shareId,
        contentId,
        contentType,
        url,
        config: defaultConfig,
        viewCount: 0,
        createdAt: new Date(),
        expiresAt,
        isActive: true,
      }

      // 保存到数据库
      await this.saveShareLink(shareLink)

      // 更新缓存
      this.shareCache.set(shareId, shareLink)

      // 清除统计缓存
      this.statsCache = null

      return shareLink
    } catch (error) {
      console.error("创建分享链接失败:", error)
      throw new Error("创建分享链接失败")
    }
  }

  /**
   * 获取分享内容
   */
  async getSharedContent(
    shareId: string,
    password?: string,
  ): Promise<{
    content: ShareableContent
    shareLink: ShareLink
  }> {
    try {
      // 从缓存获取分享链接
      let shareLink: any = this.shareCache.get(shareId)

      if (!shareLink) {
        shareLink = await this.loadShareLink(shareId)
        if (shareLink) {
          this.shareCache.set(shareId, shareLink)
        }
      }

      if (!shareLink) {
        throw new Error("分享链接不存在")
      }

      // 检查分享链接是否有效
      this.validateShareLink(shareLink, password)

      // 获取内容
      let content: any = this.contentCache.get(shareLink.contentId)

      if (!content) {
        content = await this.loadContent(shareLink.contentId, shareLink.contentType)
        if (content) {
          this.contentCache.set(shareLink.contentId, content)
        }
      }

      if (!content) {
        throw new Error("分享内容不存在")
      }

      // 增加查看次数
      await this.incrementViewCount(shareId)

      return { content, shareLink }
    } catch (error) {
      console.error("获取分享内容失败:", error)
      throw error
    }
  }

  /**
   * 获取用户的分享列表
   */
  async getUserShares(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    shares: ShareLink[]
    total: number
    hasMore: boolean
  }> {
    try {
      const offset: any = (page - 1) * limit

      // 从数据库获取分享列表
      const { shares, total } = await this.loadUserShares(userId, offset, limit)

      // 更新缓存
      shares.forEach((share) => {
        this.shareCache.set(share.shareId, share)
      })

      return {
        shares,
        total,
        hasMore: offset + shares.length < total,
      }
    } catch (error) {
      console.error("获取用户分享列表失败:", error)
      throw new Error("获取分享列表失败")
    }
  }

  /**
   * 删除分享链接
   */
  async deleteShareLink(shareId: string, userId: string): Promise<void> {
    try {
      // 验证权限
      const shareLink: any = await this.loadShareLink(shareId)
      if (!shareLink) {
        throw new Error("分享链接不存在")
      }

      const content: any = await this.loadContent(shareLink.contentId, shareLink.contentType)
      if (!content || content.userId !== userId) {
        throw new Error("无权限删除此分享")
      }

      // 从数据库删除
      await this.removeShareLink(shareId)

      // 清除缓存
      this.shareCache.delete(shareId)
      this.statsCache = null
    } catch (error) {
      console.error("删除分享链接失败:", error)
      throw error
    }
  }

  /**
   * 更新分享配置
   */
  async updateShareConfig(shareId: string, userId: string, config: Partial<ShareConfig>): Promise<ShareLink> {
    try {
      const shareLink: any = await this.loadShareLink(shareId)
      if (!shareLink) {
        throw new Error("分享链接不存在")
      }

      const content: any = await this.loadContent(shareLink.contentId, shareLink.contentType)
      if (!content || content.userId !== userId) {
        throw new Error("无权限修改此分享")
      }

      // 更新配置
      const updatedShareLink: ShareLink = {
        ...shareLink,
        config: { ...shareLink.config, ...config },
      }

      // 重新计算过期时间
      if (config.expiresIn !== undefined) {
        updatedShareLink.expiresAt = config.expiresIn ? new Date(Date.now() + config.expiresIn) : undefined
      }

      // 保存到数据库
      await this.saveShareLink(updatedShareLink)

      // 更新缓存
      this.shareCache.set(shareId, updatedShareLink)

      return updatedShareLink
    } catch (error) {
      console.error("更新分享配置失败:", error)
      throw error
    }
  }

  /**
   * 获取分享统计
   */
  async getShareStats(userId?: string): Promise<ShareStats> {
    try {
      // 检查缓存
      if (this.statsCache && Date.now() - this.statsCache.timestamp < this.cacheExpiry) {
        return this.statsCache
      }

      // 从数据库获取统计数据
      const stats: any = await this.loadShareStats(userId)

      // 更新缓存
      this.statsCache = { ...stats, timestamp: Date.now() }

      return stats
    } catch (error) {
      console.error("获取分享统计失败:", error)
      throw new Error("获取统计数据失败")
    }
  }

  /**
   * 清理过期分享
   */
  async cleanupExpiredShares(): Promise<number> {
    try {
      const now: any = new Date()
      const expiredCount: any = await this.removeExpiredShares(now)

      // 清除缓存中的过期项
      for (const [shareId, shareLink] of this.shareCache.entries()) {
        if (shareLink.expiresAt && shareLink.expiresAt < now) {
          this.shareCache.delete(shareId)
        }
      }

      // 清除统计缓存
      this.statsCache = null

      return expiredCount
    } catch (error) {
      console.error("清理过期分享失败:", error)
      return 0
    }
  }

  // 私有方法

  /**
   * 生成分享ID
   */
  private generateShareId(): string {
    const timestamp: any = Date.now().toString(36)
    const random: any = Math.random().toString(36).substring(2, 8)
    return `${timestamp}${random}`
  }

  /**
   * 验证分享链接
   */
  private validateShareLink(shareLink: ShareLink, password?: string): void {
    // 检查是否激活
    if (!shareLink.isActive) {
      throw new Error("分享链接已被禁用")
    }

    // 检查是否过期
    if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
      throw new Error("分享链接已过期")
    }

    // 检查查看次数限制
    if (shareLink.config.viewLimit && shareLink.viewCount >= shareLink.config.viewLimit) {
      throw new Error("分享链接查看次数已达上限")
    }

    // 检查密码
    if (shareLink.config.password && shareLink.config.password !== password) {
      throw new Error("密码错误")
    }
  }

  /**
   * 保存分享链接到数据库
   */
  private async saveShareLink(shareLink: ShareLink): Promise<void> {
    // 模拟数据库操作
    const shareData: any = JSON.stringify(shareLink)
    localStorage.setItem(`share_${shareLink.shareId}`, shareData)

    // 更新分享列表
    const userShares: any = this.getUserSharesList(shareLink.contentId)
    userShares.push(shareLink.shareId)
    localStorage.setItem(`user_shares_${shareLink.contentId}`, JSON.stringify(userShares))
  }

  /**
   * 从数据库加载分享链接
   */
  private async loadShareLink(shareId: string): Promise<ShareLink | null> {
    try {
      const shareData: any = localStorage.getItem(`share_${shareId}`)
      if (!shareData) return null

      const shareLink: any = JSON.parse(shareData) as ShareLink

      // 转换日期字符串为Date对象
      shareLink.createdAt = new Date(shareLink.createdAt)
      if (shareLink.expiresAt) {
        shareLink.expiresAt = new Date(shareLink.expiresAt)
      }

      return shareLink
    } catch (error) {
      console.error("加载分享链接失败:", error)
      return null
    }
  }

  /**
   * 加载内容
   */
  private async loadContent(contentId: string, contentType: string): Promise<ShareableContent | null> {
    try {
      // 根据内容类型从不同的存储位置加载
      let contentData: string | null = null

      switch (contentType) {
        case "conversation":
          contentData = localStorage.getItem(`conversation_${contentId}`)
          break
        case "cad_analysis":
          contentData = localStorage.getItem(`cad_analysis_${contentId}`)
          break
        case "poster_design":
          contentData = localStorage.getItem(`poster_design_${contentId}`)
          break
      }

      if (!contentData) return null

      const content: any = JSON.parse(contentData) as ShareableContent
      content.createdAt = new Date(content.createdAt)

      return content
    } catch (error) {
      console.error("加载内容失败:", error)
      return null
    }
  }

  /**
   * 增加查看次数
   */
  private async incrementViewCount(shareId: string): Promise<void> {
    try {
      const shareLink: any = this.shareCache.get(shareId)
      if (shareLink) {
        shareLink.viewCount++
        await this.saveShareLink(shareLink)
      }
    } catch (error) {
      console.error("更新查看次数失败:", error)
    }
  }

  /**
   * 获取用户分享列表
   */
  private getUserSharesList(userId: string): string[] {
    try {
      const sharesData: any = localStorage.getItem(`user_shares_${userId}`)
      return sharesData ? JSON.parse(sharesData) : []
    } catch (error) {
      return []
    }
  }

  /**
   * 加载用户分享
   */
  private async loadUserShares(
    userId: string,
    offset: number,
    limit: number,
  ): Promise<{
    shares: ShareLink[]
    total: number
  }> {
    try {
      const shareIds: any = this.getUserSharesList(userId)
      const total: any = shareIds.length

      const paginatedIds: any = shareIds.slice(offset, offset + limit)
      const shares: ShareLink[] = []

      for (const shareId of paginatedIds) {
        const shareLink: any = await this.loadShareLink(shareId)
        if (shareLink) {
          shares.push(shareLink)
        }
      }

      return { shares, total }
    } catch (error) {
      console.error("加载用户分享失败:", error)
      return { shares: [], total: 0 }
    }
  }

  /**
   * 删除分享链接
   */
  private async removeShareLink(shareId: string): Promise<void> {
    localStorage.removeItem(`share_${shareId}`)
  }

  /**
   * 加载分享统计
   */
  private async loadShareStats(userId?: string): Promise<ShareStats> {
    try {
      // 模拟统计数据
      const stats: ShareStats = {
        totalShares: 0,
        totalViews: 0,
        activeShares: 0,
        expiredShares: 0,
        popularContent: [],
      }

      // 遍历所有分享链接计算统计
      const allShares: any = this.getAllShares()
      const now: any = new Date()

      for (const shareLink of allShares) {
        if (!userId || this.isUserContent(shareLink.contentId, userId)) {
          stats.totalShares++
          stats.totalViews += shareLink.viewCount

          if (shareLink.isActive && (!shareLink.expiresAt || shareLink.expiresAt > now)) {
            stats.activeShares++
          } else {
            stats.expiredShares++
          }
        }
      }

      return stats
    } catch (error) {
      console.error("加载分享统计失败:", error)
      return {
        totalShares: 0,
        totalViews: 0,
        activeShares: 0,
        expiredShares: 0,
        popularContent: [],
      }
    }
  }

  /**
   * 获取所有分享
   */
  private getAllShares(): ShareLink[] {
    const shares: ShareLink[] = []

    for (let i: any = 0; i < localStorage.length; i++) {
      const key: any = localStorage.key(i)
      if (key && key.startsWith("share_")) {
        try {
          const shareData: any = localStorage.getItem(key)
          if (shareData) {
            const shareLink: any = JSON.parse(shareData) as ShareLink
            shareLink.createdAt = new Date(shareLink.createdAt)
            if (shareLink.expiresAt) {
              shareLink.expiresAt = new Date(shareLink.expiresAt)
            }
            shares.push(shareLink)
          }
        } catch (error) {
          console.error("解析分享数据失败:", error)
        }
      }
    }

    return shares
  }

  /**
   * 检查是否为用户内容
   */
  private isUserContent(contentId: string, userId: string): boolean {
    // 简化实现，实际应该查询数据库
    return true
  }

  /**
   * 删除过期分享
   */
  private async removeExpiredShares(now: Date): Promise<number> {
    let expiredCount: any = 0
    const allShares: any = this.getAllShares()

    for (const shareLink of allShares) {
      if (shareLink.expiresAt && shareLink.expiresAt < now) {
        await this.removeShareLink(shareLink.shareId)
        expiredCount++
      }
    }

    return expiredCount
  }
}

// 全局分享管理器实例
export const shareManager: any = new ShareManager()

// 定期清理过期分享（每小时执行一次）
if (typeof window !== "undefined") {
  setInterval(
    () => {
      shareManager.cleanupExpiredShares().catch(console.error)
    },
    60 * 60 * 1000,
  )
}
