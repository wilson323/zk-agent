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
import { TRUST_METRICS } from '@/lib/welcome/constants'
import { TrustMetric } from '@/components/common/trust-metric'
import { CTAButtons } from '@/components/common/cta-buttons'
import { BackgroundDecorations } from '@/components/common/background-decorations'

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
            {TRUST_METRICS.map((metric, index) => (
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