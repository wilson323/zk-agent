import type React from "react"
import { cn } from "@/lib/utils"
import { ThumbsUp, ThumbsDown, Copy, Share2, Bookmark, BookmarkCheck } from "lucide-react"

interface MessageActionsProps {
  onLike: () => void
  onDislike: () => void
  onCopy: () => void
  onFavorite: () => void
  onShare: () => void
  isFavorite: boolean
  isHovered: boolean
}

export function MessageActions({
  onLike,
  onDislike,
  onCopy,
  onFavorite,
  onShare,
  isFavorite,
  isHovered,
}: MessageActionsProps) {
  return (
    <div
      className={cn(
        "flex space-x-1 transition-opacity duration-200",
        isHovered || isFavorite ? "opacity-100" : "opacity-0",
      )}
    >
      <div
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
        onClick={onCopy}
        role="button"
        tabIndex={0}
        title="复制"
      >
        <Copy className="h-3.5 w-3.5" />
        <span>复制</span>
      </div>
      <div
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-green-600 dark:hover:text-green-400 cursor-pointer"
        onClick={onLike}
        role="button"
        tabIndex={0}
        title="有帮助"
      >
        <ThumbsUp className="h-3.5 w-3.5" />
        <span>有帮助</span>
      </div>
      <div
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
        onClick={onDislike}
        role="button"
        tabIndex={0}
        title="没帮助"
      >
        <ThumbsDown className="h-3.5 w-3.5" />
        <span>没帮助</span>
      </div>
      <div
        className={cn(
          "flex items-center gap-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer",
          isFavorite ? "text-yellow-500 hover:text-yellow-600" : "text-gray-400 hover:text-yellow-500",
        )}
        onClick={onFavorite}
        role="button"
        tabIndex={0}
        title={isFavorite ? "取消收藏" : "收藏"}
      >
        {isFavorite ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
        <span>{isFavorite ? "取消收藏" : "收藏"}</span>
      </div>
      <div
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
        onClick={onShare}
        role="button"
        tabIndex={0}
        title="分享"
      >
        <Share2 className="h-3.5 w-3.5" />
        <span>分享</span>
      </div>
    </div>
  )
}
