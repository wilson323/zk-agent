import type React from "react"
import { History as HistoryIcon } from "lucide-react"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { POSTER_STYLES } from "@/lib/poster/constants"

interface GenerationHistory {
  id: string
  prompt: string
  style: string
  timestamp: Date
  imageUrl: string
  settings: any
}

interface GenerationHistoryListProps {
  history: GenerationHistory[]
  onRestore: (item: GenerationHistory) => void
}

export function GenerationHistoryList({ history, onRestore }: GenerationHistoryListProps) {
  if (history.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <HistoryIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>暂无生成历史</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {history.map((item) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
          onClick={() => onRestore(item)}
        >
          <img
            src={item.imageUrl || "/placeholder.svg"}
            alt="History"
            className="w-16 h-16 object-cover rounded"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{item.prompt}</p>
            <p className="text-xs text-gray-500">{item.timestamp.toLocaleDateString()}</p>
            <Badge variant="secondary" className="text-xs mt-1">
              {POSTER_STYLES.find((s) => s.id === item.style)?.name}
            </Badge>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
