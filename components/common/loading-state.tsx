import type React from "react"
import { RefreshCw } from "lucide-react"

interface LoadingStateProps {
  message?: string
}

export function LoadingState({ message = "加载中..." }: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-2">
        <RefreshCw className="w-6 h-6 animate-spin text-green-500" />
        <span>{message}</span>
      </div>
    </div>
  )
}
