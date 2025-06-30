// @ts-nocheck
"use client"

import { useDevicePerformance } from "@/hooks/use-device-performance"

export function WelcomeScreen({
  onGetStarted,
  onAgentSelect,
  isDarkMode,
  toggleTheme,
  isAgentSquare = false,
}: WelcomeScreenProps) {
  const [animationStep, setAnimationStep] = useState(0)
  const [hoverButton, setHoverButton] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const isLowEndDevice = useDevicePerformance()

  useEffect(() => {
    audioRef.current = new Audio("/sounds/welcome.mp3")

    const timer1 = setTimeout(() => {
      setAnimationStep(1)
      audioRef.current?.play().catch(() => {})
    }, 300)

    const timer2 = setTimeout(() => {
      setAnimationStep(2)
    }, 800)

    const timer3 = setTimeout(() => {
      setAnimationStep(3)
    }, 1300)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [])

  const playSound = (path: string) => {
    const audio = new Audio(path)
    audio.volume = 0.3
    audio.play().catch(() => {})
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center overflow-hidden relative">
      {/* 动态背景 */}
      <BackgroundEffects isDarkMode={isDarkMode} isLowEndDevice={isLowEndDevice} />

      {/* 主要内容 */}
      <div className="max-w-7xl w-full mx-auto px-4 py-6 md:px-6 md:py-8 lg:py-12 text-center relative z-10 min-h-screen flex flex-col justify-center">
        {/* 吉祥物动画 */}
        <AnimatePresence>{animationStep >= 0 && <MascotAnimation animationStep={animationStep} />}</AnimatePresence>

        {/* 标题和描述 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: animationStep >= 1 ? 1 : 0, y: animationStep >= 1 ? 0 : 20 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-3 md:mb-4 lg:mb-6 leading-tight px-2">
            欢迎使用{" "}
            <span className="relative block sm:inline">
              <span className="bg-gradient-to-r from-[#6cb33f] via-blue-500 to-purple-500 bg-clip-text text-transparent">
                AI多智能体宇宙平台
              </span>
              <motion.span
                className="absolute -bottom-1 left-0 w-full h-0.5 md:h-1 bg-gradient-to-r from-[#6cb33f] via-blue-500 to-purple-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 1.2, duration: 1 }}
              />
            </span>
          </h1>

          <motion.p
            className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-300 mb-6 md:mb-8 lg:mb-12 max-w-xl mx-auto leading-relaxed px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: animationStep >= 2 ? 1 : 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            探索三大智能体宇宙，体验对话、CAD解读、海报设计的无限可能
          </motion.p>
        </motion.div>

        {/* 智能体卡片 */}
        <motion.div
          className="space-y-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: animationStep >= 3 ? 1 : 0, y: animationStep >= 3 ? 0 : 30 }}
          transition={{ duration: 0.8, delay: 0.9 }}
        >
          {isAgentSquare ? (
            <AgentCarousel agents={agents} onAgentSelect={onAgentSelect!} isDarkMode={isDarkMode} />
          ) : (
            // 原始功能介绍模式
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md p-4 md:p-6 rounded-3xl shadow-lg border border-gray-100/80 dark:border-gray-700/80 text-left transform transition-all max-w-2xl mx-auto">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center text-lg">
                <Zap className="h-6 w-6 mr-3 text-[#6cb33f]" />
                主要功能
              </h3>
              <ul className="space-y-4 text-gray-600 dark:text-gray-300">
                {[
                  "多种专业AI助手，满足不同场景需求",
                  "支持文字、语音、图片多模态交互",
                  "对话历史保存与管理，随时查阅",
                ].map((feature, idx) => (
                  <motion.li
                    key={idx}
                    className="flex items-start"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.1 + idx * 0.2, duration: 0.4 }}
                  >
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#6cb33f]/10 text-[#6cb33f] flex-shrink-0 mr-3 mt-0.5">
                      <MessageSquare className="h-3.5 w-3.5" />
                    </span>
                    <span>{feature}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          )}

          {!isAgentSquare && onGetStarted && (
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onHoverStart={() => setHoverButton(true)}
              onHoverEnd={() => setHoverButton(false)}
              className="max-w-md mx-auto"
            >
              <Button
                onClick={() => {
                  playSound("/sounds/new-conversation.mp3")
                  onGetStarted()
                }}
                className="w-full bg-gradient-to-r from-[#6cb33f] via-green-500 to-emerald-500 hover:from-green-600 hover:via-green-600 hover:to-emerald-600 text-white py-4 px-8 rounded-2xl text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center justify-center">
                  开始对话
                  <motion.div animate={{ x: hoverButton ? 5 : 0 }} transition={{ duration: 0.2 }}>
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </motion.div>
                </span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-green-600 via-green-700 to-emerald-700 z-0"
                  initial={{ x: "-100%" }}
                  animate={{ x: hoverButton ? "0%" : "-100%" }}
                  transition={{ duration: 0.3 }}
                />
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* 页脚 */}
      <motion.div
        className="text-center text-xs md:text-sm text-gray-500 dark:text-gray-400 px-4 mt-auto pt-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.5, duration: 0.5 }}
      >
        © 2025 ZKTeco AI多智能体宇宙平台. 保留所有权利.
      </motion.div>
    </div>
  )
}
