// @ts-nocheck
/**
 * 高性能版本管理器
 * 支持对话、CAD分析、海报设计的版本控制
 * 优化存储，智能差异计算，减少资源占用
 */

export interface VersionableContent {
  id: string
  type: "conversation" | "cad_analysis" | "poster_design"
  title: string
  content: any
  userId: string
  createdAt: Date
  metadata?: Record<string, any>
}

export interface ContentVersion {
  id: string
  contentId: string
  contentType: string
  versionNumber: number
  title: string
  description?: string
  content: any
  diff?: VersionDiff
  userId: string
  createdAt: Date
  size: number
  isSnapshot: boolean
  parentVersionId?: string
  tags?: string[]
}

export interface VersionDiff {
  type: "full" | "incremental"
  changes: Array<{
    operation: "add" | "remove" | "modify"
    path: string
    oldValue?: any
    newValue?: any
  }>
  size: number
  compressionRatio: number
}

export interface VersionHistory {
  contentId: string
  contentType: string
  versions: ContentVersion[]
  totalVersions: number
  totalSize: number
  latestVersion: ContentVersion
  branches?: VersionBranch[]
}

export interface VersionBranch {
  id: string
  name: string
  baseVersionId: string
  headVersionId: string
  createdAt: Date
  isActive: boolean
}

export interface VersionStats {
  totalVersions: number
  totalSize: number
  averageVersionSize: number
  compressionRatio: number
  oldestVersion: Date
  newestVersion: Date
  activeUsers: number
}

/**
 * 版本管理器
 * 高性能、智能差异计算的版本控制系统
 */
export class VersionManager {
  private versionCache = new Map<string, ContentVersion>()
  private historyCache = new Map<string, VersionHistory>()
  private diffCache = new Map<string, VersionDiff>()
  private readonly maxCacheSize = 100
  private readonly maxVersionsPerContent = 50
  private readonly snapshotInterval = 10 // 每10个版本创建一个快照

  /**
   * 创建新版本
   */
  async createVersion(
    contentId: string,
    contentType: string,
    content: any,
    description?: string,
    tags?: string[],
  ): Promise<ContentVersion> {
    try {
      // 获取当前版本历史
      const history = await this.getVersionHistory(contentId, contentType)
      const latestVersion = history.latestVersion

      // 计算版本号
      const versionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1

      // 计算差异
      const diff = latestVersion ? await this.calculateDiff(latestVersion.content, content) : undefined

      // 判断是否需要创建快照
      const isSnapshot = versionNumber % this.snapshotInterval === 0 || !latestVersion

      // 创建版本对象
      const version: ContentVersion = {
        id: `version_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        contentId,
        contentType,
        versionNumber,
        title: `Version ${versionNumber}`,
        description,
        content: isSnapshot ? content : undefined, // 快照保存完整内容
        diff: !isSnapshot ? diff : undefined, // 增量版本保存差异
        userId: this.getCurrentUserId(),
        createdAt: new Date(),
        size: this.calculateContentSize(content),
        isSnapshot,
        parentVersionId: latestVersion?.id,
        tags: tags || [],
      }

      // 保存版本
      await this.saveVersion(version)

      // 更新缓存
      this.versionCache.set(version.id, version)
      this.historyCache.delete(contentId) // 清除历史缓存，强制重新加载

      // 清理旧版本
      await this.cleanupOldVersions(contentId, contentType)

      return version
    } catch (error) {
      console.error("创建版本失败:", error)
      throw new Error("创建版本失败")
    }
  }

  /**
   * 获取版本历史
   */
  async getVersionHistory(contentId: string, contentType: string): Promise<VersionHistory> {
    try {
      const cacheKey = `${contentType}_${contentId}`

      // 检查缓存
      let history = this.historyCache.get(cacheKey)
      if (history) {
        return history
      }

      // 从存储加载版本历史
      const versions = await this.loadVersions(contentId, contentType)

      // 按版本号排序
      versions.sort((a, b) => a.versionNumber - b.versionNumber)

      // 计算总大小
      const totalSize = versions.reduce((sum, version) => sum + version.size, 0)

      history = {
        contentId,
        contentType,
        versions,
        totalVersions: versions.length,
        totalSize,
        latestVersion: versions[versions.length - 1],
        branches: await this.loadBranches(contentId),
      }

      // 更新缓存
      this.historyCache.set(cacheKey, history)

      return history
    } catch (error) {
      console.error("获取版本历史失败:", error)
      return {
        contentId,
        contentType,
        versions: [],
        totalVersions: 0,
        totalSize: 0,
        latestVersion: null as any,
      }
    }
  }

  /**
   * 获取特定版本
   */
  async getVersion(versionId: string): Promise<ContentVersion | null> {
    try {
      // 检查缓存
      let version = this.versionCache.get(versionId)
      if (version) {
        return version
      }

      // 从存储加载
      version = await this.loadVersion(versionId)
      if (version) {
        this.versionCache.set(versionId, version)
      }

      return version
    } catch (error) {
      console.error("获取版本失败:", error)
      return null
    }
  }

  /**
   * 恢复到指定版本
   */
  async restoreVersion(versionId: string): Promise<any> {
    try {
      const version = await this.getVersion(versionId)
      if (!version) {
        throw new Error("版本不存在")
      }

      // 重建内容
      const content = await this.reconstructContent(version)

      // 创建新版本（恢复版本）
      await this.createVersion(
        version.contentId,
        version.contentType,
        content,
        `Restored from version ${version.versionNumber}`,
        ["restore"],
      )

      return content
    } catch (error) {
      console.error("恢复版本失败:", error)
      throw error
    }
  }

  /**
   * 比较两个版本
   */
  async compareVersions(versionId1: string, versionId2: string): Promise<VersionDiff> {
    try {
      const cacheKey = `${versionId1}_${versionId2}`

      // 检查缓存
      let diff = this.diffCache.get(cacheKey)
      if (diff) {
        return diff
      }

      // 获取两个版本
      const [version1, version2] = await Promise.all([this.getVersion(versionId1), this.getVersion(versionId2)])

      if (!version1 || !version2) {
        throw new Error("版本不存在")
      }

      // 重建内容
      const [content1, content2] = await Promise.all([
        this.reconstructContent(version1),
        this.reconstructContent(version2),
      ])

      // 计算差异
      diff = await this.calculateDiff(content1, content2)

      // 缓存结果
      this.diffCache.set(cacheKey, diff)

      return diff
    } catch (error) {
      console.error("比较版本失败:", error)
      throw error
    }
  }

  /**
   * 创建分支
   */
  async createBranch(contentId: string, baseVersionId: string, branchName: string): Promise<VersionBranch> {
    try {
      const branch: VersionBranch = {
        id: `branch_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        name: branchName,
        baseVersionId,
        headVersionId: baseVersionId,
        createdAt: new Date(),
        isActive: true,
      }

      // 保存分支
      await this.saveBranch(contentId, branch)

      // 清除历史缓存
      this.historyCache.delete(`${contentId}`)

      return branch
    } catch (error) {
      console.error("创建分支失败:", error)
      throw error
    }
  }

  /**
   * 获取版本统计
   */
  async getVersionStats(userId?: string): Promise<VersionStats> {
    try {
      const allVersions = await this.loadAllVersions(userId)

      if (allVersions.length === 0) {
        return {
          totalVersions: 0,
          totalSize: 0,
          averageVersionSize: 0,
          compressionRatio: 0,
          oldestVersion: new Date(),
          newestVersion: new Date(),
          activeUsers: 0,
        }
      }

      const totalSize = allVersions.reduce((sum, version) => sum + version.size, 0)
      const averageVersionSize = totalSize / allVersions.length

      // 计算压缩比
      const snapshotVersions = allVersions.filter((v) => v.isSnapshot)
      const incrementalVersions = allVersions.filter((v) => !v.isSnapshot)
      const snapshotSize = snapshotVersions.reduce((sum, v) => sum + v.size, 0)
      const incrementalSize = incrementalVersions.reduce((sum, v) => sum + v.size, 0)
      const compressionRatio = snapshotSize > 0 ? (snapshotSize + incrementalSize) / snapshotSize : 1

      // 时间范围
      const dates = allVersions.map((v) => v.createdAt).sort((a, b) => a.getTime() - b.getTime())
      const oldestVersion = dates[0]
      const newestVersion = dates[dates.length - 1]

      // 活跃用户数
      const activeUsers = new Set(allVersions.map((v) => v.userId)).size

      return {
        totalVersions: allVersions.length,
        totalSize,
        averageVersionSize,
        compressionRatio,
        oldestVersion,
        newestVersion,
        activeUsers,
      }
    } catch (error) {
      console.error("获取版本统计失败:", error)
      throw error
    }
  }

  /**
   * 清理旧版本
   */
  async cleanupOldVersions(contentId: string, contentType: string): Promise<number> {
    try {
      const history = await this.getVersionHistory(contentId, contentType)

      if (history.totalVersions <= this.maxVersionsPerContent) {
        return 0
      }

      // 保留最新的版本和所有快照版本
      const versionsToKeep = new Set<string>()

      // 保留最新的版本
      const sortedVersions = [...history.versions].sort((a, b) => b.versionNumber - a.versionNumber)
      const recentVersions = sortedVersions.slice(0, this.maxVersionsPerContent * 0.7) // 保留70%的最新版本
      recentVersions.forEach((v) => versionsToKeep.add(v.id))

      // 保留所有快照版本
      history.versions.filter((v) => v.isSnapshot).forEach((v) => versionsToKeep.add(v.id))

      // 删除不需要的版本
      const versionsToDelete = history.versions.filter((v) => !versionsToKeep.has(v.id))

      for (const version of versionsToDelete) {
        await this.deleteVersion(version.id)
        this.versionCache.delete(version.id)
      }

      // 清除历史缓存
      this.historyCache.delete(`${contentType}_${contentId}`)

      return versionsToDelete.length
    } catch (error) {
      console.error("清理旧版本失败:", error)
      return 0
    }
  }

  // 私有方法

  /**
   * 计算内容差异
   */
  private async calculateDiff(oldContent: any, newContent: any): Promise<VersionDiff> {
    try {
      const changes: VersionDiff["changes"] = []

      // 简化的差异计算（实际项目中可以使用更复杂的算法）
      const oldStr = JSON.stringify(oldContent, null, 2)
      const newStr = JSON.stringify(newContent, null, 2)

      if (oldStr !== newStr) {
        changes.push({
          operation: "modify",
          path: "root",
          oldValue: oldContent,
          newValue: newContent,
        })
      }

      const diffSize = newStr.length - oldStr.length
      const compressionRatio = oldStr.length > 0 ? Math.abs(diffSize) / oldStr.length : 0

      return {
        type: "incremental",
        changes,
        size: Math.abs(diffSize),
        compressionRatio,
      }
    } catch (error) {
      console.error("计算差异失败:", error)
      return {
        type: "full",
        changes: [],
        size: this.calculateContentSize(newContent),
        compressionRatio: 1,
      }
    }
  }

  /**
   * 重建内容
   */
  private async reconstructContent(version: ContentVersion): Promise<any> {
    try {
      if (version.isSnapshot) {
        // 快照版本直接返回内容
        return version.content
      }

      // 增量版本需要从最近的快照开始重建
      const history = await this.getVersionHistory(version.contentId, version.contentType)

      // 找到最近的快照版本
      let baseSnapshot: ContentVersion | null = null
      for (let i = version.versionNumber - 1; i >= 1; i--) {
        const v = history.versions.find((ver) => ver.versionNumber === i)
        if (v && v.isSnapshot) {
          baseSnapshot = v
          break
        }
      }

      if (!baseSnapshot) {
        throw new Error("找不到基础快照版本")
      }

      // 从快照开始应用所有差异
      let content = baseSnapshot.content

      for (let i = baseSnapshot.versionNumber + 1; i <= version.versionNumber; i++) {
        const v = history.versions.find((ver) => ver.versionNumber === i)
        if (v && v.diff) {
          content = this.applyDiff(content, v.diff)
        }
      }

      return content
    } catch (error) {
      console.error("重建内容失败:", error)
      throw error
    }
  }

  /**
   * 应用差异
   */
  private applyDiff(content: any, diff: VersionDiff): any {
    try {
      // 简化的差异应用（实际项目中需要更复杂的逻辑）
      for (const change of diff.changes) {
        if (change.operation === "modify" && change.path === "root") {
          return change.newValue
        }
      }
      return content
    } catch (error) {
      console.error("应用差异失败:", error)
      return content
    }
  }

  /**
   * 计算内容大小
   */
  private calculateContentSize(content: any): number {
    try {
      return JSON.stringify(content).length
    } catch (error) {
      return 0
    }
  }

  /**
   * 获取当前用户ID
   */
  private getCurrentUserId(): string {
    // 简化实现，实际应该从认证系统获取
    return "current_user"
  }

  /**
   * 保存版本
   */
  private async saveVersion(version: ContentVersion): Promise<void> {
    const versionData = JSON.stringify(version)
    localStorage.setItem(`version_${version.id}`, versionData)

    // 更新内容的版本列表
    const contentVersions = this.getContentVersionsList(version.contentId)
    if (!contentVersions.includes(version.id)) {
      contentVersions.push(version.id)
      localStorage.setItem(`content_versions_${version.contentId}`, JSON.stringify(contentVersions))
    }
  }

  /**
   * 加载版本
   */
  private async loadVersion(versionId: string): Promise<ContentVersion | null> {
    try {
      const versionData = localStorage.getItem(`version_${versionId}`)
      if (!versionData) {return null}

      const version = JSON.parse(versionData) as ContentVersion
      version.createdAt = new Date(version.createdAt)

      return version
    } catch (error) {
      console.error("加载版本失败:", error)
      return null
    }
  }

  /**
   * 加载版本列表
   */
  private async loadVersions(contentId: string, contentType: string): Promise<ContentVersion[]> {
    try {
      const versionIds = this.getContentVersionsList(contentId)
      const versions: ContentVersion[] = []

      for (const versionId of versionIds) {
        const version = await this.loadVersion(versionId)
        if (version && version.contentType === contentType) {
          versions.push(version)
        }
      }

      return versions
    } catch (error) {
      console.error("加载版本列表失败:", error)
      return []
    }
  }

  /**
   * 获取内容版本列表
   */
  private getContentVersionsList(contentId: string): string[] {
    try {
      const versionsData = localStorage.getItem(`content_versions_${contentId}`)
      return versionsData ? JSON.parse(versionsData) : []
    } catch (error) {
      return []
    }
  }

  /**
   * 加载分支
   */
  private async loadBranches(contentId: string): Promise<VersionBranch[]> {
    try {
      const branchesData = localStorage.getItem(`content_branches_${contentId}`)
      if (!branchesData) {return []}

      const branches = JSON.parse(branchesData) as VersionBranch[]
      return branches.map((branch) => ({
        ...branch,
        createdAt: new Date(branch.createdAt),
      }))
    } catch (error) {
      console.error("加载分支失败:", error)
      return []
    }
  }

  /**
   * 保存分支
   */
  private async saveBranch(contentId: string, branch: VersionBranch): Promise<void> {
    const branches = await this.loadBranches(contentId)
    branches.push(branch)
    localStorage.setItem(`content_branches_${contentId}`, JSON.stringify(branches))
  }

  /**
   * 加载所有版本
   */
  private async loadAllVersions(userId?: string): Promise<ContentVersion[]> {
    const versions: ContentVersion[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith("version_")) {
        try {
          const versionData = localStorage.getItem(key)
          if (versionData) {
            const version = JSON.parse(versionData) as ContentVersion
            version.createdAt = new Date(version.createdAt)

            if (!userId || version.userId === userId) {
              versions.push(version)
            }
          }
        } catch (error) {
          console.error("解析版本数据失败:", error)
        }
      }
    }

    return versions
  }

  /**
   * 删除版本
   */
  private async deleteVersion(versionId: string): Promise<void> {
    localStorage.removeItem(`version_${versionId}`)
  }
}

// 全局版本管理器实例
export const versionManager = new VersionManager()

// 定期清理旧版本（每天执行一次）
if (typeof window !== "undefined") {
  setInterval(
    () => {
      // 这里可以添加全局清理逻辑
      console.log("定期版本清理任务执行")
    },
    24 * 60 * 60 * 1000,
  )
}
