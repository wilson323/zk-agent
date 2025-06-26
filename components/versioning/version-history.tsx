// @ts-nocheck
"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { History, GitBranch, Eye, RotateCcw, Calendar, User, FileText, Tag, Loader2, Archive } from "lucide-react"
import { versionManager, type VersionHistory, type ContentVersion } from "@/lib/versioning/version-manager"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"

interface VersionHistoryDialogProps {
  contentId: string
  contentType: "conversation" | "cad_analysis" | "poster_design"
  contentTitle: string
  trigger?: React.ReactNode
  onRestore?: (content: any) => void
}

export function VersionHistoryDialog({
  contentId,
  contentType,
  contentTitle,
  trigger,
  onRestore,
}: VersionHistoryDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [history, setHistory] = useState<VersionHistory | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<ContentVersion | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) {
      loadVersionHistory()
    }
  }, [isOpen, contentId, contentType])

  const loadVersionHistory = async () => {
    try {
      setIsLoading(true)
      const versionHistory = await versionManager.getVersionHistory(contentId, contentType)
      setHistory(versionHistory)

      if (versionHistory.versions.length > 0) {
        setSelectedVersion(versionHistory.latestVersion)
      }
    } catch (error) {
      console.error("加载版本历史失败:", error)
      toast({
        title: "加载失败",
        description: "无法加载版本历史",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRestoreVersion = async (version: ContentVersion) => {
    try {
      setIsRestoring(true)

      const restoredContent = await versionManager.restoreVersion(version.id)

      onRestore?.(restoredContent)

      toast({
        title: "版本已恢复",
        description: `已恢复到版本 ${version.versionNumber}`,
      })

      // 重新加载历史
      await loadVersionHistory()

      setIsOpen(false)
    } catch (error) {
      console.error("恢复版本失败:", error)
      toast({
        title: "恢复失败",
        description: "无法恢复到指定版本",
        variant: "destructive",
      })
    } finally {
      setIsRestoring(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) {return "0 B"}
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  const getVersionTypeIcon = (version: ContentVersion) => {
    if (version.isSnapshot) {
      return <Archive className="h-4 w-4 text-blue-500" />
    }
    return <FileText className="h-4 w-4 text-gray-500" />
  }

  const getVersionTypeBadge = (version: ContentVersion) => {
    if (version.isSnapshot) {
      return (
        <Badge variant="secondary" className="text-xs">
          快照
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="text-xs">
        增量
      </Badge>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <History className="h-4 w-4 mr-2" />
            版本历史
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <History className="h-5 w-5 mr-2 text-[#6cb33f]" />"{contentTitle}" 的版本历史
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#6cb33f]" />
            <span className="ml-2">加载版本历史...</span>
          </div>
        ) : history ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[60vh]">
            {/* 版本列表 */}
            <div className="lg:col-span-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">版本列表</h3>
                <Badge variant="outline">{history.totalVersions} 个版本</Badge>
              </div>

              <ScrollArea className="h-full">
                <div className="space-y-2">
                  {history.versions
                    .sort((a, b) => b.versionNumber - a.versionNumber)
                    .map((version) => (
                      <div
                        key={version.id}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-all duration-200",
                          selectedVersion?.id === version.id
                            ? "border-[#6cb33f] bg-green-50 dark:bg-green-900/20"
                            : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600",
                        )}
                        onClick={() => setSelectedVersion(version)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {getVersionTypeIcon(version)}
                            <span className="font-medium text-sm">版本 {version.versionNumber}</span>
                            {version.id === history.latestVersion?.id && (
                              <Badge variant="default" className="text-xs bg-[#6cb33f]">
                                最新
                              </Badge>
                            )}
                          </div>
                          {getVersionTypeBadge(version)}
                        </div>

                        <div className="text-xs text-gray-500 space-y-1">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDistanceToNow(version.createdAt, {
                              addSuffix: true,
                              locale: zhCN,
                            })}
                          </div>
                          <div className="flex items-center">
                            <FileText className="h-3 w-3 mr-1" />
                            {formatFileSize(version.size)}
                          </div>
                        </div>

                        {version.description && (
                          <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 truncate">
                            {version.description}
                          </div>
                        )}

                        {version.tags && version.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {version.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {version.tags.length > 2 && (
                              <span className="text-xs text-gray-500">+{version.tags.length - 2}</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </div>

            {/* 版本详情 */}
            <div className="lg:col-span-2">
              {selectedVersion ? (
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">版本详情</h3>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // 预览版本内容的逻辑
                          toast({
                            title: "预览功能",
                            description: "预览功能正在开发中",
                          })
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        预览
                      </Button>

                      {selectedVersion.id !== history.latestVersion?.id && (
                        <Button
                          size="sm"
                          onClick={() => handleRestoreVersion(selectedVersion)}
                          disabled={isRestoring}
                          className="bg-[#6cb33f] hover:bg-[#5a9635]"
                        >
                          {isRestoring ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <RotateCcw className="h-4 w-4 mr-1" />
                          )}
                          恢复
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
                    {/* 基本信息 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">版本号</label>
                        <div className="flex items-center space-x-2">
                          <span className="text-lg font-bold">{selectedVersion.versionNumber}</span>
                          {getVersionTypeBadge(selectedVersion)}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">创建时间</label>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {selectedVersion.createdAt.toLocaleString()}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">文件大小</label>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {formatFileSize(selectedVersion.size)}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">创建者</label>
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <User className="h-4 w-4 mr-1" />
                          {selectedVersion.userId}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* 描述 */}
                    {selectedVersion.description && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">版本描述</label>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                          {selectedVersion.description}
                        </div>
                      </div>
                    )}

                    {/* 标签 */}
                    {selectedVersion.tags && selectedVersion.tags.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">标签</label>
                        <div className="flex flex-wrap gap-2">
                          {selectedVersion.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="flex items-center">
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 差异信息 */}
                    {selectedVersion.diff && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">变更信息</label>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="text-sm space-y-1">
                            <div>变更类型: {selectedVersion.diff.type}</div>
                            <div>变更数量: {selectedVersion.diff.changes.length}</div>
                            <div>压缩比: {(selectedVersion.diff.compressionRatio * 100).toFixed(1)}%</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 分支信息 */}
                    {history.branches && history.branches.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">相关分支</label>
                        <div className="space-y-2">
                          {history.branches.map((branch) => (
                            <div key={branch.id} className="flex items-center space-x-2 text-sm">
                              <GitBranch className="h-4 w-4 text-gray-500" />
                              <span>{branch.name}</span>
                              {branch.isActive && (
                                <Badge variant="outline" className="text-xs">
                                  活跃
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>选择一个版本查看详情</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <div className="text-center">
              <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>暂无版本历史</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// 版本统计组件
interface VersionStatsProps {
  userId?: string
  className?: string
}

export function VersionStats({ userId, className }: VersionStatsProps) {
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        setIsLoading(true)
        const versionStats = await versionManager.getVersionStats(userId)
        setStats(versionStats)
      } catch (error) {
        console.error("加载版本统计失败:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadStats()
  }, [userId])

  if (isLoading) {
    return (
      <div className={cn("p-4 border rounded-lg", className)}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <div className={cn("p-4 border rounded-lg space-y-3", className)}>
      <h3 className="font-semibold flex items-center">
        <History className="h-4 w-4 mr-2" />
        版本统计
      </h3>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-gray-500">总版本数</div>
          <div className="font-semibold">{stats.totalVersions}</div>
        </div>
        <div>
          <div className="text-gray-500">总大小</div>
          <div className="font-semibold">{formatFileSize(stats.totalSize)}</div>
        </div>
        <div>
          <div className="text-gray-500">平均大小</div>
          <div className="font-semibold">{formatFileSize(stats.averageVersionSize)}</div>
        </div>
        <div>
          <div className="text-gray-500">压缩比</div>
          <div className="font-semibold">{(stats.compressionRatio * 100).toFixed(1)}%</div>
        </div>
      </div>
    </div>
  )
}

// 格式化文件大小的辅助函数
function formatFileSize(bytes: number): string {
  if (bytes === 0) {return "0 B"}
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}
