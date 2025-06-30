import type React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
}

export function ErrorState({
  title = "加载失败",
  description = "发生错误，请稍后重试。",
  onRetry,
}: ErrorStateProps) {
  return (
    <Card className="backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border-red-200 dark:border-red-900 shadow-md">
      <CardContent className="flex flex-col items-center justify-center h-40 p-6">
        <p className="text-red-500 dark:text-red-400 mb-4">{title}</p>
        <p className="text-gray-500 dark:text-gray-400 mb-4 text-center">{description}</p>
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            重新加载
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
