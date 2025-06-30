import type React from "react"
import { memo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sparkles } from 'lucide-react'
import type { FeatureData } from '@/lib/welcome/constants'

interface FeatureCardProps {
  feature: FeatureData
}

export const FeatureCard = memo<FeatureCardProps>(({ feature }) => {
  const IconComponent = feature.icon

  const handleCardClick = useCallback(() => {
    // 埋点统计
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'click', {
        event_category: 'Feature Card',
        event_label: feature.title
      })
    }
  }, [feature.title])

  return (
    <Card 
      className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-2 cursor-pointer border-0 bg-white/90 backdrop-blur-sm dark:bg-gray-800/90 shadow-lg"
      onClick={handleCardClick}
    >
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white/50 to-purple-50/50 dark:from-gray-800/50 dark:via-gray-700/50 dark:to-gray-600/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <CardHeader className="relative pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 group-hover:scale-110 transition-transform duration-300 shadow-sm">
            <IconComponent className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex gap-1">
            {feature.isPopular && (
              <Badge className="text-xs bg-gradient-to-r from-orange-500 to-red-500 text-white border-0">
                <Sparkles className="h-3 w-3 mr-1" />
                热门
              </Badge>
            )}
            {feature.isNew && (
              <Badge className="text-xs bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
                <Sparkles className="h-3 w-3 mr-1" />
                新功能
              </Badge>
            )}
          </div>
        </div>
        
        <CardTitle className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 mb-2">
          {feature.title}
        </CardTitle>
        
        <Badge variant="outline" className="w-fit text-xs">
          {feature.category}
        </Badge>
      </CardHeader>
      
      <CardContent className="relative pt-0">
        <CardDescription className="text-sm leading-relaxed text-gray-600 dark:text-gray-400 line-clamp-3">
          {feature.description}
        </CardDescription>
        
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
            <Sparkles className="h-3 w-3 mr-1 text-blue-500" />
            核心优势
          </h4>
          <ul className="space-y-2">
            {feature.benefits.slice(0, 3).map((benefit, index) => (
              <li key={index} className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                <div className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 mr-2 flex-shrink-0" />
                <span className="font-medium">{benefit}</span>
              </li>
            ))}
            {feature.benefits.length > 3 && (
              <li className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                +{feature.benefits.length - 3} 更多优势
              </li>
            )}
          </ul>
        </div>
      </CardContent>
      
      {/* 悬浮光效 */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-sm" />
    </Card>
  )
})
