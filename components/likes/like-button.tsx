// @ts-nocheck
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Heart, Loader2 } from "lucide-react"
import { likeManager } from "@/lib/likes/like-manager"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface LikeButtonProps {
  itemId: string
  itemType: "conversation" | "cad_analysis" | "poster_design" | "message"
  userId: string
  size?: "sm" | "md" | "lg"
  variant?: "default" | "ghost" | "outline"
  showCount?: boolean
  className?: string
  onLikeChange?: (isLiked: boolean, totalLikes: number) => void
}

export function LikeButton({
  itemId,
  itemType,
  userId,
  size = "md",
  variant = "ghost",
  showCount = true,
  className,
  onLikeChange,
}: LikeButtonProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [totalLikes, setTotalLikes] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const { toast } = useToast()

  // 初始化点赞状态
  useEffect(() => {
    const initializeLikeState = async () => {
      try {
        setIsInitializing(true)

        const [liked, stats] = await Promise.all([
          likeManager.isLiked(itemId, userId),
          likeManager.getLikeStats(itemId, itemType),
        ])

        setIsLiked(liked)
        setTotalLikes(stats.totalLikes)
      } catch (error) {
        console.error("初始化点赞状态失败:", error)
      } finally {
        setIsInitializing(false)
      }
    }

    initializeLikeState()
  }, [itemId, itemType, userId])

  const handleToggleLike = async () => {
    if (isLoading || isInitializing) {return}

    try {
      setIsLoading(true)

      const result = await likeManager.toggleLike(itemId, itemType, userId)

      setIsLiked(result.isLiked)
      setTotalLikes(result.totalLikes)

      onLikeChange?.(result.isLiked, result.totalLikes)

      // 触觉反馈（如果支持）
      if ("vibrate" in navigator) {
        navigator.vibrate(50)
      }

      // 显示提示
      toast({
        title: result.isLiked ? "已点赞" : "已取消点赞",
        description: result.isLiked ? "感谢您的支持！" : "已移除点赞",
        duration: 1500,
      })
    } catch (error) {
      console.error("切换点赞状态失败:", error)
      toast({
        title: "操作失败",
        description: "请稍后重试",
        variant: "destructive",
        duration: 2000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "h-7 px-2 text-xs"
      case "lg":
        return "h-11 px-6 text-base"
      default:
        return "h-9 px-4 text-sm"
    }
  }

  const getIconSize = () => {
    switch (size) {
      case "sm":
        return "h-3 w-3"
      case "lg":
        return "h-5 w-5"
      default:
        return "h-4 w-4"
    }
  }

  if (isInitializing) {
    return (
      <Button variant={variant} disabled className={cn(getSizeClasses(), className)}>
        <Loader2 className={cn(getIconSize(), "animate-spin mr-1")} />
        {showCount && <span>-</span>}
      </Button>
    )
  }

  return (
    <Button
      variant={variant}
      onClick={handleToggleLike}
      disabled={isLoading}
      className={cn(
        getSizeClasses(),
        "transition-all duration-200",
        isLiked && "text-red-500 hover:text-red-600",
        className,
      )}
    >
      {isLoading ? (
        <Loader2 className={cn(getIconSize(), "animate-spin mr-1")} />
      ) : (
        <Heart
          className={cn(
            getIconSize(),
            "mr-1 transition-all duration-200",
            isLiked ? "fill-current text-red-500" : "text-gray-500",
          )}
        />
      )}
      {showCount && (
        <span className={cn("transition-all duration-200", isLiked ? "text-red-500" : "text-gray-600")}>
          {totalLikes}
        </span>
      )}
    </Button>
  )
}

// 批量点赞按钮组件
interface BatchLikeDisplayProps {
  items: Array<{ id: string; type: string }>
  userId: string
  className?: string
}

export function BatchLikeDisplay({ items, userId, className }: BatchLikeDisplayProps) {
  const [likeStats, setLikeStats] = useState<Map<string, any>>(new Map())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadBatchStats = async () => {
      try {
        setIsLoading(true)
        const stats = await likeManager.getBatchLikeStats(items)
        setLikeStats(stats)
      } catch (error) {
        console.error("批量加载点赞统计失败:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (items.length > 0) {
      loadBatchStats()
    }
  }, [items])

  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        {items.map((item, index) => (
          <div key={`${item.type}_${item.id}`} className="flex items-center space-x-2">
            <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-8 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      {items.map((item) => {
        const stats = likeStats.get(`${item.type}_${item.id}`)
        return (
          <LikeButton
            key={`${item.type}_${item.id}`}
            itemId={item.id}
            itemType={item.type as any}
            userId={userId}
            size="sm"
            variant="ghost"
            showCount={true}
          />
        )
      })}
    </div>
  )
}
