import type React from "react"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"

export function LiveIndicator() {
  return (
    <div className="flex items-center space-x-2 mb-8">
      <div className="relative">
        <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
        <div className="absolute inset-0 h-3 w-3 bg-green-500 rounded-full animate-ping opacity-75"></div>
      </div>
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
        实时数据 • 每5分钟更新
      </span>
      <Badge variant="outline" className="text-xs">
        <Clock className="h-3 w-3 mr-1" />
        {new Date().toLocaleTimeString('zh-CN', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </Badge>
    </div>
  )
}
