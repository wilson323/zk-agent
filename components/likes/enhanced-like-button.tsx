// @ts-nocheck
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Heart } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { enhancedLikeManager } from "@/lib/likes/enhanced-like-manager"
import { useToast } from "@/hooks/use-toast"

interface EnhancedLikeButtonProps {
  itemId: string
  itemType: "poster" | "cad_analysis" | "chat_message"
  initialLiked?: boolean
  initialCount?: number
  size?: "sm" | "md" | "lg"
  showCount?: boolean
  disabled?: boolean
}

export function EnhancedLikeButton({
  itemId,
  itemType,
  initialLiked = false,
  initialCount = 0,
  size = "md",
  showCount = true,
  disabled = false,
}: EnhancedLikeButtonProps) {
  const [isLiked, setIsLiked] = useState(initialLiked)
  const [likeCount, setLikeCount] = useState(initialCount)
  const [isLoading, setIsLoading] = useState(false)
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([])
  const { toast } = useToast()

  // 音效播放
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

  // 粒子动画
  const createParticles = () => {
    const newParticles = Array.from({ length: 6 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 40 - 20,
      y: Math.random() * 40 - 20,
    }))
    setParticles(newParticles)

    setTimeout(() => setParticles([]), 1000)
  }

  const handleToggleLike = async () => {
    if (disabled || isLoading) {return}

    setIsLoading(true)
    const newLikedState = !isLiked

    try {
      const result = await enhancedLikeManager.toggleLike(itemId, itemType)

      if (result.success) {
        setIsLiked(newLikedState)
        setLikeCount(result.likeCount || likeCount + (newLikedState ? 1 : -1))

        if (newLikedState) {
          createParticles()
          playSound("like")
        } else {
          playSound("unlike")
        }
      } else {
        toast({
          title: "操作失败",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "操作失败",
        description: "请稍后重试",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const sizeClasses = {
    sm: "h-8 px-2 text-xs",
    md: "h-9 px-3 text-sm",
    lg: "h-10 px-4 text-base",
  }

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }

  return (
    <div className="relative inline-block">
      <Button
        variant={isLiked ? "default" : "outline"}
        size="sm"
        className={`
          ${sizeClasses[size]}
          ${
            isLiked
              ? "bg-red-500 hover:bg-red-600 text-white border-red-500"
              : "hover:bg-red-50 hover:border-red-200 hover:text-red-600"
          }
          transition-all duration-200 relative overflow-hidden
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
        onClick={handleToggleLike}
        disabled={disabled || isLoading}
      >
        <motion.div
          animate={isLiked ? { scale: [1, 1.2, 1] } : { scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-1"
        >
          <Heart
            className={`
              ${iconSizes[size]} 
              ${isLiked ? "fill-current" : ""} 
              transition-all duration-200
            `}
          />
          {showCount && (
            <motion.span
              key={likeCount}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {likeCount}
            </motion.span>
          )}
        </motion.div>

        {/* 加载状态 */}
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

      {/* 粒子动画 */}
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
