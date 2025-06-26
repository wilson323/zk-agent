// @ts-nocheck
/**
 * @file Loading Skeleton Component
 * @description 通用加载骨架屏组件，支持不同类型的加载状态
 * @author ZK-Agent Team A
 * @date 2024-12-19
 */

"use client"

import { memo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

// 骨架屏类型
type SkeletonType = 'agents' | 'features' | 'stats' | 'testimonials' | 'cards' | 'list'

interface LoadingSkeletonProps {
  type: SkeletonType
  count?: number
  className?: string
}

// 智能体展示骨架屏
const AgentsSkeleton = memo<{ count: number }>(({ count }) => (
  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rounded-lg border bg-white dark:bg-gray-800 p-6 shadow-sm">
        {/* 头部 */}
        <div className="flex items-center space-x-4 mb-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        
        {/* 描述 */}
        <div className="space-y-2 mb-4">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-3/5" />
        </div>
        
        {/* 标签 */}
        <div className="flex space-x-2 mb-4">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
        
        {/* 统计信息 */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-1">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-3 w-8" />
          </div>
          <div className="flex items-center space-x-1">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      </div>
    ))}
  </div>
))

AgentsSkeleton.displayName = 'AgentsSkeleton'

// 功能特性骨架屏
const FeaturesSkeleton = memo<{ count: number }>(({ count }) => (
  <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="text-center">
        {/* 图标 */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
          <Skeleton className="h-8 w-8" />
        </div>
        
        {/* 标题 */}
        <Skeleton className="h-5 w-3/4 mx-auto mb-2" />
        
        {/* 描述 */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5 mx-auto" />
        </div>
      </div>
    ))}
  </div>
))

FeaturesSkeleton.displayName = 'FeaturesSkeleton'

// 统计数据骨架屏
const StatsSkeleton = memo(() => (
  <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8">
    <div className="text-center mb-8">
      <Skeleton className="h-8 w-64 mx-auto mb-4 bg-white/20" />
      <Skeleton className="h-4 w-96 mx-auto bg-white/20" />
    </div>
    
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="text-center">
          <Skeleton className="h-12 w-20 mx-auto mb-2 bg-white/20" />
          <Skeleton className="h-4 w-16 mx-auto bg-white/20" />
        </div>
      ))}
    </div>
  </div>
))

StatsSkeleton.displayName = 'StatsSkeleton'

// 用户评价骨架屏
const TestimonialsSkeleton = memo<{ count: number }>(({ count }) => (
  <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow-sm">
        {/* 评分 */}
        <div className="flex space-x-1 mb-4">
          {Array.from({ length: 5 }).map((_, j) => (
            <Skeleton key={j} className="h-4 w-4" />
          ))}
        </div>
        
        {/* 评价内容 */}
        <div className="space-y-2 mb-6">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-3/4" />
        </div>
        
        {/* 用户信息 */}
        <div className="flex items-center space-x-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </div>
    ))}
  </div>
))

TestimonialsSkeleton.displayName = 'TestimonialsSkeleton'

// 通用卡片骨架屏
const CardsSkeleton = memo<{ count: number }>(({ count }) => (
  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rounded-lg border bg-white dark:bg-gray-800 p-6 shadow-sm">
        <div className="space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-4/5" />
          </div>
          <div className="flex justify-between items-center pt-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-4 w-4" />
          </div>
        </div>
      </div>
    ))}
  </div>
))

CardsSkeleton.displayName = 'CardsSkeleton'

// 列表骨架屏
const ListSkeleton = memo<{ count: number }>(({ count }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center space-x-4 p-4 rounded-lg border bg-white dark:bg-gray-800">
        <Skeleton className="h-12 w-12 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
    ))}
  </div>
))

ListSkeleton.displayName = 'ListSkeleton'

// 主骨架屏组件
const LoadingSkeleton = memo<LoadingSkeletonProps>(({ 
  type, 
  count = 6, 
  className = "" 
}) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'agents':
        return <AgentsSkeleton count={count} />
      case 'features':
        return <FeaturesSkeleton count={count} />
      case 'stats':
        return <StatsSkeleton />
      case 'testimonials':
        return <TestimonialsSkeleton count={count} />
      case 'cards':
        return <CardsSkeleton count={count} />
      case 'list':
        return <ListSkeleton count={count} />
      default:
        return <CardsSkeleton count={count} />
    }
  }

  return (
    <div className={`animate-pulse ${className}`}>
      {renderSkeleton()}
    </div>
  )
})

LoadingSkeleton.displayName = 'LoadingSkeleton'

export default LoadingSkeleton 