// @ts-nocheck
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Heart, Loader2 } from "lucide-react"
import { likeManager } from "@/lib/likes/like-manager"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion" // Import motion and AnimatePresence

interface LikeButtonProps {
  itemId: string
  itemType: "conversation" | "cad_analysis" | "poster_design" | "chat_message"
  userId?: string // Make userId optional as it's not always needed for display
  size?: "sm" | "md" | "lg"
  variant?: "default" | "ghost" | "outline"
  showCount?: boolean
  className?: string
  onLikeChange?: (isLiked: boolean, totalLikes: number) => void
  // New props from EnhancedLikeButton
  initialLiked?: boolean
  initialCount?: number
  disabled?: boolean
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
  initialLiked = false,
  initialCount = 0,
  disabled = false,
}: LikeButtonProps) {
  const [isLiked, setIsLiked] = useState(initialLiked)
  const [totalLikes, setTotalLikes] = useState(initialCount)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([]) // Particles state
  const { toast } = useToast()

  // 音效播放 (from EnhancedLikeButton)
  const playSound = (type: "like" | "unlike") => {
    try {
      const audio = new Audio(`/sounds/feedback-${type}.mp3`)
      audio.volume = 0.3
      audio.play().catch(() => {
        // 静默处理音频播放失败
      })
    } catch (error) {
      // 静默处理音频错误
    }
  }

  // 粒子动画 (from EnhancedLikeButton)
  const createParticles = () => {
    const newParticles = Array.from({ length: 6 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 40 - 20,
      y: Math.random() * 40 - 20,
    }))
    setParticles(newParticles)

    setTimeout(() => setParticles([]), 1000)
  }

  // 初始化点赞状态
  useEffect(() => {
    const initializeLikeState = async () => {
      try {
        setIsInitializing(true)

        // Only fetch if userId is provided, otherwise use initialLiked/Count
        if (userId) {
          const [liked, stats] = await Promise.all([
            likeManager.isLiked(itemId, userId),
            likeManager.getLikeStats(itemId, itemType),
          ])
          setIsLiked(liked)
          setTotalLikes(stats.totalLikes)
        } else {
          setIsLiked(initialLiked)
          setTotalLikes(initialCount)
        }
      } catch (error) {
        console.error("初始化点赞状态失败:", error)
      } finally {
        setIsInitializing(false)
      }
    }

    initializeLikeState()
  }, [itemId, itemType, userId, initialLiked, initialCount])

  const handleToggleLike = async () => {
    if (disabled || isLoading || isInitializing) {return}

    setIsLoading(true)
    const newLikedState = !isLiked

    try {
      const result = await likeManager.toggleLike(itemId, itemType, userId || "") // userId might be undefined

      setIsLiked(result.isLiked)
      setTotalLikes(result.totalLikes)

      onLikeChange?.(result.isLiked, result.totalLikes)

      // 触觉反馈（如果支持）
      if ("vibrate" in navigator) {
        navigator.vibrate(50)
      }

      // Play sound and create particles if liked
      if (newLikedState) {
        createParticles()
        playSound("like")
      } else {
        playSound("unlike")
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
    <div className="relative inline-block"> {/* Added wrapper for particles */}
      <Button
        variant={isLiked ? "default" : variant}
        onClick={handleToggleLike}
        disabled={isLoading || disabled}
        className={cn(
          getSizeClasses(),
          "transition-all duration-200 relative overflow-hidden", // Added overflow-hidden
          isLiked
            ? "bg-red-500 hover:bg-red-600 text-white border-red-500"
            : "hover:bg-red-50 hover:border-red-200 hover:text-red-600",
          className,
        )}
      >
        {isLoading ? (
          <Loader2 className={cn(getIconSize(), "animate-spin mr-1")} />
        ) : (
          <motion.div
            animate={isLiked ? { scale: [1, 1.2, 1] } : { scale: 1 }} // Animation from EnhancedLikeButton
            transition={{ duration: 0.3 }}
            className="flex items-center gap-1"
          >
            <Heart
              className={cn(
                getIconSize(),
                "mr-1 transition-all duration-200",
                isLiked ? "fill-current text-red-500" : "text-gray-500",
              )}
            />
            {showCount && (
              <motion.span
                key={totalLikes} // Key for re-render animation
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                {totalLikes}
              </motion.span>
            )}
          </motion.div>
        )}

        {/* 加载状态覆盖 (from EnhancedLikeButton) */}
        {isLoading && (
          <motion.div
            className="absolute inset-0 bg-white/20 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
          </motion.div>
        )}
      </Button>

      {/* 粒子动画 (from EnhancedLikeButton) */}
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute top-1/2 left-1/2 w-1 h-1 bg-red-500 rounded-full pointer-events-none"
            initial={{
              scale: 0,
              x: 0,
              y: 0,
              opacity: 1,
            }}
            animate={{
              scale: [0, 1, 0],
              x: particle.x,
              y: particle.y,
              opacity: [1, 1, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.8,
              ease: "easeOut",
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

// 批量点赞按钮组件
interface BatchLikeDisplayProps {
  items: Array<{ id: string; type: string }>
  userId: string
  className?: string
}

export function BatchLikeDisplay({
  items,
  userId,
  className,
}: BatchLikeDisplayProps) {
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
            initialLiked={stats?.isLiked || false}
            initialCount={stats?.totalLikes || 0}
          />
        )
      })}
    </div>
  )
}
