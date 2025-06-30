import type React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

interface CTAButtonsProps {
  onStartChat?: () => void
  onBrowseAgents?: () => void
}

export function CTAButtons({ onStartChat, onBrowseAgents }: CTAButtonsProps) {
  return (
    <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
      <Button 
        asChild 
        size="lg" 
        className="h-12 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
        onClick={onStartChat}
      >
        <Link href="/chat" className="group">
          开始对话
          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
        </Link>
      </Button>
      
      <Button 
        asChild 
        variant="outline" 
        size="lg" 
        className="h-12 px-8 border-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
        onClick={onBrowseAgents}
      >
        <Link href="/agents">
          浏览智能体
        </Link>
      </Button>
    </div>
  )
}
