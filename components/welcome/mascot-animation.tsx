// @ts-nocheck
"use client"

import { motion } from "framer-motion"
import { Sparkles, Zap } from "lucide-react"
import Image from "next/image"

interface MascotAnimationProps {
  animationStep: number
}

export function MascotAnimation({ animationStep }: MascotAnimationProps) {
  return (
    <motion.div
      initial={{ scale: 0.8, y: 30, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 20,
        delay: 0.1,
      }}
      className="relative h-24 w-24 sm:h-32 sm:w-32 md:h-40 md:w-40 mx-auto mb-4 md:mb-6 lg:mb-8"
    >
      <motion.div
        animate={{
          y: [0, -8, 0],
          rotate: [0, 2, -2, 0],
        }}
        transition={{
          repeat: Number.POSITIVE_INFINITY,
          duration: 4,
          ease: "easeInOut",
        }}
        className="relative h-full w-full"
      >
        <Image
          src="/images/mascot-character.png"
          alt="AI Assistant Character"
          fill
          className="object-contain drop-shadow-2xl"
          priority
        />
      </motion.div>

      {/* 能量环效果 */}
      {animationStep >= 2 && (
        <>
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-[#6cb33f]/30"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              repeat: Number.POSITIVE_INFINITY,
              duration: 3,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute -top-2 -right-2 text-yellow-400"
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              repeat: Number.POSITIVE_INFINITY,
              duration: 2,
              ease: "easeInOut",
            }}
          >
            <Sparkles className="h-6 w-6" />
          </motion.div>
          <motion.div
            className="absolute -bottom-2 -left-2 text-blue-400"
            animate={{
              scale: [1, 1.3, 1],
              rotate: [360, 180, 0],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              repeat: Number.POSITIVE_INFINITY,
              duration: 2.5,
              ease: "easeInOut",
              delay: 0.5,
            }}
          >
            <Zap className="h-5 w-5" />
          </motion.div>
        </>
      )}
    </motion.div>
  )
}
