import type React from "react"
import { motion } from "framer-motion"
import { Sparkles, Zap } from "lucide-react"

interface AnimatedOrbProps {
  color1: string
  color2: string
  delay?: number
}

export function AnimatedOrb({ color1, color2, delay = 0 }: AnimatedOrbProps) {
  return (
    <>
      <motion.div
        className={`absolute inset-0 rounded-full border-2 border-${color1}/30`}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          repeat: Number.POSITIVE_INFINITY,
          duration: 3,
          ease: "easeInOut",
          delay: delay,
        }}
      />
      <motion.div
        className={`absolute -top-2 -right-2 text-${color2}`}
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 180, 360],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{
          repeat: Number.POSITIVE_INFINITY,
          duration: 2,
          ease: "easeInOut",
          delay: delay + 0.2,
        }}
      >
        <Sparkles className="h-6 w-6" />
      </motion.div>
      <motion.div
        className={`absolute -bottom-2 -left-2 text-${color1}`}
        animate={{
          scale: [1, 1.3, 1],
          rotate: [360, 180, 0],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{
          repeat: Number.POSITIVE_INFINITY,
          duration: 2.5,
          ease: "easeInOut",
          delay: delay + 0.5,
        }}
      >
        <Zap className="h-5 w-5" />
      </motion.div>
    </>
  )
}
