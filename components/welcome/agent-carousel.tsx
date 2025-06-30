// @ts-nocheck
"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Bot } from "lucide-react"
import { motion } from "framer-motion"

import type { Agent } from "@/types/agent"

interface AgentCarouselProps {
  agents: Agent[]
  onAgentSelect: (agentId: string) => void
  isDarkMode: boolean
}

export function AgentCarousel({ agents, onAgentSelect, isDarkMode }: AgentCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(1) // 对话智能体在中间
  const [isDragging, setIsDragging] = useState(false)
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null)

  // 自动轮播逻辑
  useEffect(() => {
    if (isAutoPlaying) {
      autoPlayRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % agents.length)
      }, 4000)
    } else {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current)
      }
    }

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current)
      }
    }
  }, [isAutoPlaying, agents.length])

  const playSound = (path: string) => {
    const audio = new Audio(path)
    audio.volume = 0.3
    audio.play().catch(() => {})
  }

  const handleSlideChange = (direction: "prev" | "next") => {
    setIsAutoPlaying(false)
    if (direction === "next") {
      setCurrentSlide((prev) => (prev + 1) % agents.length)
    } else {
      setCurrentSlide((prev) => (prev - 1 + agents.length) % agents.length)
    }
    setTimeout(() => setIsAutoPlaying(true), 3000)
  }

  const handleDragEnd = (event: any, info: any) => {
    setIsDragging(false)
    setIsAutoPlaying(false)

    const threshold = 50
    if (info.offset.x > threshold) {
      handleSlideChange("prev")
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
      playSound("/sounds/select-conversation.mp3")
    } else if (info.offset.x < -threshold) {
      handleSlideChange("next")
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
      playSound("/sounds/select-conversation.mp3")
    }

    setTimeout(() => setIsAutoPlaying(true), 3000)
  }

  const handleAgentClick = (agentId: string, index: number) => {
    if (!isDragging) {
      if (index === currentSlide) {
        // 点击中心卡片时启动
        if (navigator.vibrate) {
          navigator.vibrate([50, 50, 50])
        }
        playSound("/sounds/new-conversation.mp3")
        onAgentSelect(agentId)
      } else {
        // 点击侧边卡片时切换到中心
        setCurrentSlide(index)
        setIsAutoPlaying(false)
        if (navigator.vibrate) {
          navigator.vibrate(40)
        }
        playSound("/sounds/select-conversation.mp3")
        setTimeout(() => setIsAutoPlaying(true), 3000)
      }
    }
  }

  return (
    <div className="relative w-full max-w-6xl mx-auto">
      {/* 桌面端：3D弧形展示 */}
      <div className="hidden md:block">
        <div className="relative h-96 perspective-1000">
          <div className="flex items-center justify-center h-full">
            {agents.map((agent, index) => {
              const IconComponent = agent.icon
              const isCenter = index === currentSlide
              const offset = index - currentSlide
              const isHovered = hoveredAgent === agent.id

              return (
                <motion.div
                  key={agent.id}
                  className="absolute cursor-pointer group"
                  style={{
                    zIndex: isCenter ? 10 : 5 - Math.abs(offset),
                  }}
                  animate={{
                    x: offset * 280,
                    scale: isCenter ? 1 : 0.8,
                    rotateY: offset * 25,
                    opacity: Math.abs(offset) > 1 ? 0 : 1,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                  onClick={() => handleAgentClick(agent.id, index)}
                  onMouseEnter={() => setHoveredAgent(agent.id)}
                  onMouseLeave={() => setHoveredAgent(null)}
                >
                  <div
                    className={`${agent.bgColor} backdrop-blur-sm p-6 lg:p-8 rounded-3xl shadow-xl hover:shadow-2xl border ${agent.borderColor} text-left transform transition-all duration-300 relative overflow-hidden w-80 h-80`}
                  >
                    <motion.div
                      className={`absolute inset-0 bg-gradient-to-r ${agent.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                      animate={{
                        opacity: isHovered ? 0.1 : 0,
                      }}
                    />

                    <div className="flex flex-col h-full">
                      <div className="flex items-center mb-6">
                        <motion.div
                          className={`w-16 h-16 rounded-2xl ${agent.bgColor} flex items-center justify-center mr-4 shadow-lg`}
                          whileHover={{ rotate: 5, scale: 1.1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <IconComponent className={`h-8 w-8 ${agent.textColor}`} />
                        </motion.div>
                        <div className="flex-1">
                          <h3 className={`font-bold text-xl ${agent.textColor} mb-2`}>{agent.name}</h3>
                          <motion.div
                            className={`h-1 bg-gradient-to-r ${agent.color} rounded-full`}
                            initial={{ width: 0 }}
                            animate={{ width: isHovered ? "100%" : "70%" }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                      </div>

                      <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed flex-1">
                        {agent.description}
                      </p>

                      <ul className="space-y-3 mb-6">
                        {agent.features.map((feature, idx) => (
                          <motion.li
                            key={idx}
                            className="flex items-center text-sm text-gray-600 dark:text-gray-300"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 + idx * 0.1 }}
                          >
                            <motion.span
                              className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${agent.bgColor} ${agent.textColor} flex-shrink-0 mr-3 shadow-sm`}
                              whileHover={{ scale: 1.2, rotate: 180 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Bot className="h-2.5 w-2.5" />
                            </motion.span>
                            <span>{feature}</span>
                          </motion.li>
                        ))}
                      </ul>

                      <div className="flex justify-end mt-auto">
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`${agent.textColor} hover:${agent.bgColor} transition-all duration-200 font-medium`}
                          >
                            开始使用
                            <motion.div animate={{ x: isHovered ? 3 : 0 }} transition={{ duration: 0.2 }}>
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </motion.div>
                          </Button>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* 导航按钮 */}
          <button
            onClick={() => {
              handleSlideChange("prev")
              if (navigator.vibrate) {
                navigator.vibrate(40)
              }
              playSound("/sounds/select-conversation.mp3")
            }}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-[#6cb33f] z-20"
          >
            <ArrowRight className="h-6 w-6 rotate-180" />
          </button>
          <button
            onClick={() => {
              handleSlideChange("next")
              if (navigator.vibrate) {
                navigator.vibrate(40)
              }
              playSound("/sounds/select-conversation.mp3")
            }}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-[#6cb33f] z-20"
          >
            <ArrowRight className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* 移动端：三卡片展示 */}
      <div className="md:hidden">
        <div className="relative overflow-hidden h-96">
          <div className="flex items-center justify-center h-full relative">
            <motion.div
              className="relative w-full h-full"
              drag="x"
              dragConstraints={{ left: -100, right: 100 }}
              dragElastic={0.3}
              onDragStart={() => {
                setIsDragging(true)
                setIsAutoPlaying(false)
                if (navigator.vibrate) {
                  navigator.vibrate(30)
                }
              }}
              onDragEnd={handleDragEnd}
              onTouchStart={() => setIsAutoPlaying(false)}
              onTouchEnd={() => setTimeout(() => setIsAutoPlaying(true), 3000)}
            >
              {agents.map((agent, index) => {
                const IconComponent = agent.icon
                const isCenter = index === currentSlide
                const offset = index - currentSlide
                const isHovered = hoveredAgent === agent.id

                // 计算位置和缩放
                let xOffset = 0
                let scale = 0.7
                let zIndex = 1
                let opacity = 0.6

                if (offset === 0) {
                  // 中心卡片
                  xOffset = 0
                  scale = 1
                  zIndex = 10
                  opacity = 1
                } else if (offset === -1) {
                  // 左侧卡片
                  xOffset = -140
                  scale = 0.8
                  zIndex = 5
                  opacity = 0.8
                } else if (offset === 1) {
                  // 右侧卡片
                  xOffset = 140
                  scale = 0.8
                  zIndex = 5
                  opacity = 0.8
                } else {
                  // 隐藏其他卡片
                  opacity = 0
                  scale = 0.6
                }

                return (
                  <motion.div
                    key={agent.id}
                    className="absolute cursor-pointer group"
                    style={{
                      zIndex,
                      left: "50%",
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                    }}
                    animate={{
                      x: xOffset,
                      scale,
                      opacity,
                      rotateY: offset * 15,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                    }}
                    onClick={() => handleAgentClick(agent.id, index)}
                    onTouchStart={() => {
                      setHoveredAgent(agent.id)
                      if (navigator.vibrate) {
                        navigator.vibrate(20)
                      }
                    }}
                    onTouchEnd={() => setHoveredAgent(null)}
                  >
                    <div
                      className={`${agent.bgColor} backdrop-blur-sm p-4 rounded-2xl shadow-lg border ${agent.borderColor} text-left transform transition-all duration-300 relative overflow-hidden w-72 h-80`}
                      style={{
                        transformStyle: "preserve-3d",
                      }}
                    >
                      <motion.div
                        className={`absolute inset-0 bg-gradient-to-r ${agent.color} opacity-0 transition-opacity duration-300`}
                        animate={{
                          opacity: isHovered || isCenter ? 0.08 : 0,
                        }}
                      />

                      <div className="flex flex-col h-full">
                        <div className="flex items-center mb-4">
                          <motion.div
                            className={`w-12 h-12 rounded-xl ${agent.bgColor} flex items-center justify-center mr-3 shadow-md`}
                            whileHover={{ rotate: 5, scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                          >
                            <IconComponent className={`h-6 w-6 ${agent.textColor}`} />
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-bold text-base ${agent.textColor} mb-1 truncate`}>{agent.name}</h3>
                            <motion.div
                              className={`h-1 bg-gradient-to-r ${agent.color} rounded-full`}
                              initial={{ width: 0 }}
                              animate={{ width: isCenter ? "80%" : "60%" }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                        </div>

                        <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm leading-relaxed line-clamp-2">
                          {agent.description}
                        </p>

                        <ul className="space-y-2 mb-4 flex-1">
                          {agent.features.slice(0, isCenter ? 4 : 3).map((feature, idx) => (
                            <motion.li
                              key={idx}
                              className="flex items-center text-xs text-gray-600 dark:text-gray-300"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: isCenter ? 1 : 0.8, x: 0 }}
                              transition={{ delay: 0.1 + idx * 0.1 }}
                            >
                              <motion.span
                                className={`inline-flex items-center justify-center w-4 h-4 rounded-full ${agent.bgColor} ${agent.textColor} flex-shrink-0 mr-2 shadow-sm`}
                                whileHover={{ scale: 1.2, rotate: 180 }}
                                transition={{ duration: 0.2 }}
                              >
                                <Bot className="h-2 w-2" />
                              </motion.span>
                              <span className="truncate">{feature}</span>
                            </motion.li>
                          ))}
                        </ul>

                        {isCenter && (
                          <div className="flex justify-end mt-auto">
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2 }}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`${agent.textColor} hover:${agent.bgColor} transition-all duration-200 font-medium text-sm px-4 py-2 shadow-sm`}
                              >
                                开始使用
                                <motion.div animate={{ x: isHovered ? 3 : 0 }} transition={{ duration: 0.2 }}>
                                  <ArrowRight className="ml-2 h-4 w-4" />
                                </motion.div>
                              </Button>
                            </motion.div>
                          </div>
                        )}
                      </div>

                      {/* 中心卡片特殊效果 */}
                      {isCenter && (
                        <motion.div
                          className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#6cb33f]/20 via-blue-400/20 to-purple-500/20 -z-10"
                          animate={{
                            opacity: [0.5, 0.8, 0.5],
                            scale: [1, 1.02, 1],
                          }}
                          transition={{
                            repeat: Number.POSITIVE_INFINITY,
                            duration: 3,
                            ease: "easeInOut",
                          }}
                        />
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          </div>

          {/* 移动端指示器 */}
          <div className="flex justify-center mt-6 space-x-2">
            {agents.map((_, index) => (
              <motion.button
                key={index}
                onClick={() => {
                  setCurrentSlide(index)
                  setIsAutoPlaying(false)
                  if (navigator.vibrate) {
                    navigator.vibrate(30)
                  }
                  playSound("/sounds/select-conversation.mp3")
                  setTimeout(() => setIsAutoPlaying(true), 3000)
                }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? "bg-[#6cb33f] w-8 shadow-lg"
                    : "bg-gray-300 dark:bg-gray-600 w-2 hover:bg-gray-400 dark:hover:bg-gray-500"
                }`}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              />
            ))}
          </div>

          {/* 自动播放指示器 */}
          <div className="flex justify-center mt-3">
            <motion.div
              className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <motion.div
                className={`w-2 h-2 rounded-full ${isAutoPlaying ? "bg-[#6cb33f]" : "bg-gray-400"}`}
                animate={{
                  scale: isAutoPlaying ? [1, 1.2, 1] : 1,
                  opacity: isAutoPlaying ? [0.5, 1, 0.5] : 0.5,
                }}
                transition={{
                  repeat: isAutoPlaying ? Number.POSITIVE_INFINITY : 0,
                  duration: 1,
                }}
              />
              <span>{isAutoPlaying ? "自动播放中" : "已暂停"}</span>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
