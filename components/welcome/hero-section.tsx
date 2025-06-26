// @ts-nocheck
/**
 * @file Hero Section Component
 * @description 主页英雄区域组件，包含主标题、副标题、CTA按钮和信任指标
 * @author ZK-Agent Team A
 * @date 2024-12-19
 */

"use client"

import { memo, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Users, Star, TrendingUp, Sparkles } from 'lucide-react'

// 信任指标数据
const trustMetrics = [
  {
    icon: Users,
    label: '活跃用户',
    value: '10,000+',
    color: 'text-blue-600'
  },
  {
    icon: Star,
    label: '用户评分',
    value: '4.8/5',
    color: 'text-yellow-500'
  },
  {
    icon: TrendingUp,
    label: '可用性',
    value: '99.9%',
    color: 'text-green-600'
  }
] as const

// 信任指标组件
const TrustMetric = memo<{
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  color: string
}>(({ icon: Icon, label, value, color }) => (
  <div className="flex items-center gap-x-2 group">
    <Icon className={`h-4 w-4 ${color} group-hover:scale-110 transition-transform duration-200`} />
    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
      {value}
    </span>
    <span className="text-sm text-gray-500 dark:text-gray-400">
      {label}
    </span>
  </div>
))

TrustMetric.displayName = 'TrustMetric'

// CTA按钮组件
const CTAButtons = memo(() => {
  const handleStartChat = useCallback(() => {
    // 可以添加埋点统计
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'click', {
        event_category: 'CTA',
        event_label: 'Start Chat'
      })
    }
  }, [])

  const handleBrowseAgents = useCallback(() => {
    // 可以添加埋点统计
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'click', {
        event_category: 'CTA',
        event_label: 'Browse Agents'
      })
    }
  }, [])

  return (
    <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
      <Button 
        asChild 
        size="lg" 
        className="h-12 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
        onClick={handleStartChat}
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
        onClick={handleBrowseAgents}
      >
        <Link href="/agents">
          浏览智能体
        </Link>
      </Button>
    </div>
  )
})

CTAButtons.displayName = 'CTAButtons'

// 背景装饰组件
const BackgroundDecorations = memo(() => (
  <>
    {/* 网格背景 */}
    <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25" />
    
    {/* 渐变光晕 */}
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl" />
    <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-gradient-to-r from-green-400/20 to-blue-400/20 rounded-full blur-3xl" />
    
    {/* 浮动装饰元素 */}
    <div className="absolute top-20 left-10 w-4 h-4 bg-blue-500/30 rounded-full animate-pulse" />
    <div className="absolute top-40 right-20 w-6 h-6 bg-purple-500/30 rounded-full animate-pulse delay-1000" />
    <div className="absolute bottom-40 left-20 w-3 h-3 bg-green-500/30 rounded-full animate-pulse delay-2000" />
  </>
))

BackgroundDecorations.displayName = 'BackgroundDecorations'

// 主英雄区域组件
const HeroSection = memo(() => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 min-h-screen flex items-center">
      {/* 背景装饰 */}
      <BackgroundDecorations />
      
      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <div className="text-center">
          {/* 顶部标签 */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-8">
            <Sparkles className="h-4 w-4" />
            <span>AI多智能体宇宙平台</span>
          </div>
          
          {/* 主标题 */}
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl lg:text-7xl">
            <span className="block">AI多智能体</span>
            <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              宇宙平台
            </span>
          </h1>
          
          {/* 副标题 */}
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-gray-600 dark:text-gray-300 sm:text-xl">
            集成<span className="font-semibold text-blue-600">FastGPT对话助手</span>、
            <span className="font-semibold text-purple-600">CAD分析专家</span>、
            <span className="font-semibold text-green-600">海报生成器</span>等多种AI能力，
            为您提供一站式智能解决方案。体验前所未有的AI协作效率。
          </p>
          
          {/* CTA按钮组 */}
          <CTAButtons />
          
          {/* 信任指标 */}
          <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 text-sm">
            {trustMetrics.map((metric, index) => (
              <TrustMetric key={index} {...metric} />
            ))}
          </div>
          
          {/* 底部提示 */}
          <div className="mt-12 text-xs text-gray-500 dark:text-gray-400">
            <p>免费注册 • 无需信用卡 • 立即开始使用</p>
          </div>
        </div>
      </div>
    </section>
  )
})

HeroSection.displayName = 'HeroSection'

export default HeroSection 