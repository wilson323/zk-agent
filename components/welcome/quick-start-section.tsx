// @ts-nocheck
/**
 * @file Quick Start Section Component
 * @description 快速开始区域组件，展示三大核心功能的快速入口
 * @author ZK-Agent Team A
 * @date 2024-12-19
 */

"use client"

import { memo, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Bot, Zap, Palette, MessageSquare, FileText, Sparkles } from 'lucide-react'

// 快速开始项目数据
const quickStartItems = [
  {
    icon: Bot,
    title: '智能对话',
    description: '与AI助手进行自然语言对话，获得专业的问题解答和建议。支持多轮对话、上下文理解和个性化回复。',
    href: '/chat',
    badge: '热门',
    badgeVariant: 'default' as const,
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    features: ['多轮对话', '上下文理解', '个性化回复']
  },
  {
    icon: Zap,
    title: 'CAD分析',
    description: '上传CAD文件，获得专业的工程分析和优化建议。支持多种文件格式，提供详细的分析报告。',
    href: '/cad-analyzer',
    badge: '专业',
    badgeVariant: 'secondary' as const,
    iconColor: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    features: ['多格式支持', '专业分析', '优化建议']
  },
  {
    icon: Palette,
    title: '海报生成',
    description: '使用AI技术快速生成专业的海报和设计作品。提供多种模板和自定义选项，满足各种设计需求。',
    href: '/poster-generator',
    badge: '创意',
    badgeVariant: 'outline' as const,
    iconColor: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    features: ['多种模板', 'AI生成', '自定义设计']
  }
] as const

// 快速开始卡片组件
const QuickStartCard = memo<{
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  href: string
  badge: string
  badgeVariant: 'default' | 'secondary' | 'outline'
  iconColor: string
  bgColor: string
  features: readonly string[]
}>(({ icon: Icon, title, description, href, badge, badgeVariant, iconColor, bgColor, features }) => {
  const handleCardClick = useCallback(() => {
    // 埋点统计
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'click', {
        event_category: 'Quick Start',
        event_label: title
      })
    }
  }, [title])

  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-2 border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
      {/* 背景渐变 */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50/50 to-gray-100/50 dark:from-gray-800 dark:via-gray-700/50 dark:to-gray-600/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <CardHeader className="relative pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${bgColor} group-hover:scale-110 transition-transform duration-300`}>
            <Icon className={`h-7 w-7 ${iconColor}`} />
          </div>
          <Badge variant={badgeVariant} className="text-xs font-medium">
            {badge}
          </Badge>
        </div>
        
        <CardTitle className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
          {title}
        </CardTitle>
        
        <CardDescription className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          {description}
        </CardDescription>
        
        {/* 功能特性标签 */}
        <div className="flex flex-wrap gap-2 mt-3">
          {features.map((feature, index) => (
            <span 
              key={index}
              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              {feature}
            </span>
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="relative pt-0">
        <Button 
          asChild 
          variant="ghost" 
          className="w-full justify-between p-0 h-auto text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          onClick={handleCardClick}
        >
          <Link href={href} className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-200">
            <span className="font-medium">立即体验</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
})

QuickStartCard.displayName = 'QuickStartCard'

// 统计数据组件
const QuickStats = memo(() => {
  const stats = [
    { icon: MessageSquare, label: '对话次数', value: '100K+', color: 'text-blue-600' },
    { icon: FileText, label: 'CAD分析', value: '5K+', color: 'text-purple-600' },
    { icon: Palette, label: '海报生成', value: '8K+', color: 'text-green-600' }
  ]

  return (
    <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8">
      {stats.map((stat, index) => (
        <div key={index} className="text-center group">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 mb-4 group-hover:scale-110 transition-transform duration-200">
            <stat.icon className={`h-6 w-6 ${stat.color}`} />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stat.value}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  )
})

QuickStats.displayName = 'QuickStats'

// 快速开始区域主组件
const QuickStartSection = memo(() => {
  return (
    <section className="py-24 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 标题区域 */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            <span>快速开始</span>
          </div>
          
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl lg:text-5xl">
            选择您需要的
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AI服务
            </span>
          </h2>
          
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
            立即开始体验智能化工作流程，提升您的工作效率
          </p>
        </div>
        
        {/* 卡片网格 */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {quickStartItems.map((item, index) => (
            <QuickStartCard key={index} {...item} />
          ))}
        </div>
        
        {/* 统计数据 */}
        <QuickStats />
        
        {/* 底部提示 */}
        <div className="mt-16 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            所有功能均支持免费试用 • 无需安装 • 即开即用
          </p>
        </div>
      </div>
    </section>
  )
})

QuickStartSection.displayName = 'QuickStartSection'

export default QuickStartSection 