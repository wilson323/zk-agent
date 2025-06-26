// @ts-nocheck
/**
 * @file 智能体展示组件
 * @description 展示热门智能体，使用React.memo优化性能
 * @author ZK-Agent Team A
 * @date 2024-12-19
 */

'use client'

import React, { memo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Star, Users, ArrowRight, Sparkles } from 'lucide-react'
import Link from 'next/link'

// 智能体数据类型
interface AgentData {
  id: string
  name: string
  description: string
  avatar: string
  rating: number
  users: number
  category: string
  href: string
  isPopular?: boolean
  isNew?: boolean
}

// 模拟智能体数据
const featuredAgents: AgentData[] = [
  {
    id: 'fastgpt-assistant',
    name: 'FastGPT助手',
    description: '基于FastGPT的智能对话助手，支持多轮对话和上下文理解，为您提供专业的问题解答和智能建议。',
    avatar: '/images/agents/fastgpt.png',
    rating: 4.8,
    users: 12500,
    category: '对话助手',
    href: '/chat',
    isPopular: true
  },
  {
    id: 'cad-analyzer',
    name: 'CAD分析专家',
    description: '专业的CAD文件分析工具，支持多种格式，提供详细的工程分析和优化建议，助力工程设计。',
    avatar: '/images/agents/cad.png',
    rating: 4.6,
    users: 8900,
    category: '工程分析',
    href: '/cad-analyzer'
  },
  {
    id: 'poster-generator',
    name: '海报生成器',
    description: '智能海报设计工具，提供丰富的模板和自定义选项，快速生成专业设计作品，满足各种场景需求。',
    avatar: '/images/agents/poster.png',
    rating: 4.9,
    users: 15600,
    category: '设计创意',
    href: '/poster-generator',
    isNew: true
  },
  {
    id: 'data-analyst',
    name: '数据分析师',
    description: '智能数据分析助手，支持多种数据格式，提供深度洞察和可视化报告，让数据说话。',
    avatar: '/images/agents/data.png',
    rating: 4.7,
    users: 6800,
    category: '数据分析',
    href: '/analytics'
  },
  {
    id: 'code-reviewer',
    name: '代码审查员',
    description: '专业的代码审查工具，支持多种编程语言，提供代码质量分析和改进建议，提升代码质量。',
    avatar: '/images/agents/code.png',
    rating: 4.5,
    users: 9200,
    category: '开发工具',
    href: '/code-review'
  },
  {
    id: 'content-writer',
    name: '内容创作者',
    description: '智能内容创作助手，支持多种文体和风格，帮助您快速生成高质量内容，激发创作灵感。',
    avatar: '/images/agents/writer.png',
    rating: 4.8,
    users: 11400,
    category: '内容创作',
    href: '/content'
  }
]

// 智能体卡片组件
const AgentCard = memo<{ agent: AgentData }>(({ agent }) => {
  const formatUsers = useCallback((count: number) => {
    if (count >= 10000) {
      return `${(count / 1000).toFixed(1)}k`
    }
    return count.toString()
  }, [])

  const handleCardClick = useCallback(() => {
    // 埋点统计
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'click', {
        event_category: 'Agent Card',
        event_label: agent.name
      })
    }
  }, [agent.name])

  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-2 border-0 bg-white/90 backdrop-blur-sm dark:bg-gray-800/90 shadow-lg">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white/50 to-purple-50/50 dark:from-gray-800/50 dark:via-gray-700/50 dark:to-gray-600/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* 热门/新品标签 */}
      {(agent.isPopular || agent.isNew) && (
        <div className="absolute top-4 right-4 z-10">
          <Badge 
            variant={agent.isPopular ? "default" : "secondary"} 
            className={`text-xs font-medium ${
              agent.isPopular 
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' 
                : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
            }`}
          >
            {agent.isPopular ? '热门' : '新品'}
          </Badge>
        </div>
      )}
      
      <CardHeader className="relative pb-4">
        <div className="flex items-start space-x-4">
          <Avatar className="h-14 w-14 ring-2 ring-blue-100 dark:ring-blue-900 group-hover:ring-blue-200 dark:group-hover:ring-blue-800 transition-all duration-300">
            <AvatarImage src={agent.avatar} alt={agent.name} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-lg">
              {agent.name.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <CardTitle className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 truncate">
                {agent.name}
              </CardTitle>
              <div className="flex items-center space-x-1 text-amber-500 flex-shrink-0 ml-2">
                <Star className="h-4 w-4 fill-current" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {agent.rating}
                </span>
              </div>
            </div>
            
            <Badge variant="outline" className="text-xs">
              {agent.category}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="relative space-y-4">
        <CardDescription className="text-sm leading-relaxed text-gray-600 dark:text-gray-400 line-clamp-3">
          {agent.description}
        </CardDescription>
        
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
            <Users className="h-4 w-4" />
            <span className="text-sm font-medium">{formatUsers(agent.users)} 用户</span>
          </div>
          
          <Button 
            asChild 
            variant="ghost" 
            size="sm" 
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-200"
            onClick={handleCardClick}
          >
            <Link href={agent.href} className="flex items-center space-x-1 group/button">
              <span className="font-medium">体验</span>
              <ArrowRight className="h-3 w-3 transition-transform group-hover/button:translate-x-1" />
            </Link>
          </Button>
        </div>
      </CardContent>
      
      {/* 悬浮光效 */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-sm" />
    </Card>
  )
})

AgentCard.displayName = 'AgentCard'

// 主组件 - 移除section包装，因为主页面已经有了
const AgentShowcase = memo(() => {
  return (
    <>
      {/* 智能体网格 */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {featuredAgents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
      
      {/* 查看更多按钮 */}
      <div className="text-center mt-12">
        <Button 
          asChild 
          size="lg" 
          variant="outline" 
          className="h-12 px-8 border-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-200"
        >
          <Link href="/agents" className="flex items-center space-x-2 group">
            <Sparkles className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
            <span>查看所有智能体</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
          </Link>
        </Button>
      </div>
    </>
  )
})

AgentShowcase.displayName = 'AgentShowcase'

export default AgentShowcase 