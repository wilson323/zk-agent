// @ts-nocheck
"use client"

import { motion } from "framer-motion"
import { AnimatedOrb } from "@/components/common/animated-orb"
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
        <AnimatedOrb color1="#6cb33f" color2="yellow-400" />
      )}
    </motion.div>
  )
}
