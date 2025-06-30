import type React from "react"
import { Users, Star, TrendingUp } from "lucide-react"

interface TrustMetricProps {
  icon: React.ElementType
  label: string
  value: string
  color: string
}

export function TrustMetric({ icon: Icon, label, value, color }: TrustMetricProps) {
  return (
    <div className="flex items-center gap-x-2 group">
      <Icon className={`h-4 w-4 ${color} group-hover:scale-110 transition-transform duration-200`} />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {value}
      </span>
      <span className="text-sm text-gray-500 dark:text-gray-400">
        {label}
      </span>
    </div>
  )
}
