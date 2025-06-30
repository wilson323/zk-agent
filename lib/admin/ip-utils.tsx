import React from "react"
import { TrendingUp } from "lucide-react"

export const getTrendIcon = (trend: string): React.ReactElement => {
  switch (trend) {
    case 'up':
      return <TrendingUp className="w-3 h-3 text-green-600" />
    case 'down':
      return <TrendingUp className="w-3 h-3 text-red-600 rotate-180" />
    default:
      return <div className="w-3 h-3 bg-gray-400 rounded-full" />
  }
}

export const getHeatColor = (percentage: number): string => {
  if (percentage > 20) {return 'bg-red-500'}
  if (percentage > 10) {return 'bg-orange-500'}
  if (percentage > 5) {return 'bg-yellow-500'}
  if (percentage > 1) {return 'bg-green-500'}
  return 'bg-blue-500'
}