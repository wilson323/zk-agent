import React from "react"
import { Archive, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"

// 直接导入ContentVersion接口，避免使用找不到的模块路径
interface ContentVersion {
  id: string
  contentId: string
  contentType: string
  versionNumber: number
  title: string
  description?: string
  content: any
  diff?: any
  userId: string
  createdAt: Date
  size: number
  isSnapshot: boolean
  parentVersionId?: string
  tags?: string[]
}

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) {return "0 B"}
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

export const getVersionTypeIcon = (version: ContentVersion): React.ReactElement => {
  if (version.isSnapshot) {
    return <Archive className="h-4 w-4 text-blue-500" />
  }
  return <FileText className="h-4 w-4 text-gray-500" />
}

export const getVersionTypeBadge = (version: ContentVersion): React.ReactElement => {
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