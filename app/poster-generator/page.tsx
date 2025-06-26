// @ts-nocheck
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { ArrowLeft, Sun, Moon, Settings, Palette } from "lucide-react"
import PosterGeneratorInterface from "@/components/poster/poster-generator-interface"

export default function PosterGeneratorPage() {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // 检测系统主题偏好
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setIsDarkMode(true)
      document.documentElement.classList.add("dark")
    }
  }, [])

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle("dark")
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? "dark" : ""}`}>
      {/* 顶部导航 */}
      <header className="border-b border-purple-200/50 dark:border-purple-800/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md py-4 px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="mr-3 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/20"
            onClick={() => router.push("/")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mr-3">
              <Palette className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-200">海报设计智能体</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">AI驱动的创意海报设计平台</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={toggleTheme}
          >
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* 主要内容区域 */}
      <PosterGeneratorInterface />
    </div>
  )
}
