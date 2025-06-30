// @ts-nocheck
/**
 * @file Stats Section Component
 * @description 统计数据展示组件，包含动画效果和实时数据
 * @author ZK-Agent Team A
 * @date 2024-12-19
 */

"use client"

import { memo, useEffect, useState } from 'react'
import { formatNumber } from '@/lib/utils'
import { LiveIndicator } from '@/components/common/live-indicator'
import { StatCard } from '@/components/admin/stat-card' // Use the common StatCard
import { useCountAnimation } from '@/hooks/use-count-animation'
import { STATS_DATA } from '@/lib/welcome/constants'
import { TrendingUp } from 'lucide-react'

// 主组件
import { memo, useEffect, useState } from 'react'
import { formatNumber } from '@/lib/utils'
import { LiveIndicator } from '@/components/common/live-indicator'
import { StatCard } from '@/components/admin/stat-card' // Use the common StatCard
import { useCountAnimation } from '@/hooks/use-count-animation'
import { STATS_DATA } from '@/lib/welcome/constants'
import { TrendingUp } from 'lucide-react'

// 主组件
const StatsSection = memo(() => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    const element = document.getElementById('stats-section')
    if (element) {
      observer.observe(element)
    }

    return () => {
      if (element) {
        observer.unobserve(element)
      }
    }
  }, [])

  return (
    <div id="stats-section" className="space-y-8">
      {/* 实时状态指示器 */}
      <div className="text-center">
        <LiveIndicator />
      </div>
      
      {/* 统计卡片网格 */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {STATS_DATA.map((stat, index) => (
          <StatCard 
            key={stat.id} 
            title={stat.label}
            icon={stat.icon}
            value={`${formatNumber(useCountAnimation(isVisible ? stat.value : 0, 2000 + index * 200), stat.unit)}`}
            description={stat.description}
            badgeText={stat.trend !== undefined ? `${Math.abs(stat.trend)}%` : undefined}
            badgeColorClass={stat.trend !== undefined ? (stat.trend > 0 ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400") : undefined}
          >
            {stat.trend !== undefined && (
              <TrendingUp className={`h-3 w-3 mr-1 ${stat.trend < 0 ? 'rotate-180' : ''}`} />
            )}
          </StatCard>
        ))}
      </div>
      
      {/* 底部说明 */}
      <div className="text-center mt-8">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          数据来源于平台实时监控系统 • 更新频率: 5分钟
        </p>
      </div>
    </div>
  )
})

StatsSection.displayName = 'StatsSection'

export default StatsSection

StatsSection.displayName = 'StatsSection'

export default StatsSection