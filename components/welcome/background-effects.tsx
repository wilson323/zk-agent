// @ts-nocheck
"use client"

import { motion } from "framer-motion"

interface BackgroundEffectsProps {
  isDarkMode: boolean
  isLowEndDevice: boolean
}

export function BackgroundEffects({ isDarkMode, isLowEndDevice }: BackgroundEffectsProps) {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-gray-900 dark:via-indigo-950/80 dark:to-purple-950/60 transition-all duration-1000">
      {/* 增强的粒子动效 */}
      <div className="absolute inset-0 opacity-60 dark:opacity-60">
        {Array.from({ length: isLowEndDevice ? 12 : 25 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-gradient-to-br from-[#6cb33f]/40 to-blue-400/40 dark:from-[#6cb33f]/30 dark:to-purple-500/30"
            style={{
              width: `${Math.random() * (isLowEndDevice ? 100 : 150) + 30}px`,
              height: `${Math.random() * (isLowEndDevice ? 100 : 150) + 30}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -40, 0],
              x: [0, Math.random() * 30 - 15, 0],
              scale: [1, 1.2, 1],
              opacity: [0.4, 0.8, 0.4],
            }}
            transition={{
              repeat: Number.POSITIVE_INFINITY,
              duration: Math.random() * 6 + (isLowEndDevice ? 8 : 6),
              ease: "easeInOut",
              delay: Math.random() * 3,
            }}
          />
        ))}
      </div>

      {/* 主题色光圈效果 */}
      <div className="absolute inset-0 opacity-50 dark:opacity-40">
        {Array.from({ length: isLowEndDevice ? 6 : 12 }).map((_, i) => (
          <motion.div
            key={`orb-${i}`}
            className="absolute rounded-full"
            style={{
              width: `${Math.random() * 200 + 100}px`,
              height: `${Math.random() * 200 + 100}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              background:
                "radial-gradient(circle, rgba(108, 179, 63, 0.2) 0%, rgba(59, 130, 246, 0.1) 50%, transparent 100%)",
            }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.2, 0.6, 0.2],
              rotate: [0, 180, 360],
            }}
            transition={{
              repeat: Number.POSITIVE_INFINITY,
              duration: Math.random() * 8 + 10,
              ease: "easeInOut",
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>

      {/* 气泡动效 */}
      <div className="absolute inset-0 opacity-40 dark:opacity-30">
        {Array.from({ length: isLowEndDevice ? 8 : 15 }).map((_, i) => (
          <motion.div
            key={`bubble-${i}`}
            className="absolute rounded-full border-2 border-[#6cb33f]/30"
            style={{
              width: `${Math.random() * 60 + 20}px`,
              height: `${Math.random() * 60 + 20}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100],
              opacity: [0, 0.6, 0],
              scale: [0.5, 1, 0.5],
            }}
            transition={{
              repeat: Number.POSITIVE_INFINITY,
              duration: Math.random() * 4 + 6,
              ease: "easeOut",
              delay: Math.random() * 8,
            }}
          />
        ))}
      </div>

      {/* 星空效果 */}
      <div className="absolute inset-0 opacity-50 dark:opacity-70">
        {Array.from({ length: isLowEndDevice ? 25 : 50 }).map((_, i) => (
          <motion.div
            key={`star-${i}`}
            className="absolute w-1 h-1 bg-white dark:bg-yellow-200 rounded-full"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [0.5, 1.5, 0.5],
            }}
            transition={{
              repeat: Number.POSITIVE_INFINITY,
              duration: Math.random() * 2 + (isLowEndDevice ? 3 : 2),
              ease: "easeInOut",
              delay: Math.random() * 3,
            }}
          />
        ))}
      </div>

      {/* 流星效果 */}
      <div className="absolute inset-0 opacity-30 dark:opacity-50">
        {Array.from({ length: isLowEndDevice ? 4 : 8 }).map((_, i) => (
          <motion.div
            key={`meteor-${i}`}
            className="absolute w-1 h-20 bg-gradient-to-b from-white via-blue-200 to-transparent dark:from-yellow-200 dark:via-purple-300 dark:to-transparent rounded-full"
            style={{
              top: `${Math.random() * 50}%`,
              left: `${Math.random() * 100}%`,
              rotate: "45deg",
            }}
            animate={{
              x: [0, 200],
              y: [0, 200],
              opacity: [0, 1, 0],
            }}
            transition={{
              repeat: Number.POSITIVE_INFINITY,
              duration: Math.random() * 2 + (isLowEndDevice ? 3 : 2),
              ease: "easeOut",
              delay: Math.random() * (isLowEndDevice ? 15 : 10),
              repeatDelay: Math.random() * (isLowEndDevice ? 20 : 15) + 5,
            }}
          />
        ))}
      </div>
    </div>
  )
}
