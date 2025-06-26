// @ts-nocheck
/**
 * @file 功能特性网格组件
 * @description 高性能的功能展示网格，使用React.memo和虚拟化优化
 * @author ZK-Agent Team A
 * @date 2024-12-19
 */

'use client'

import React, { memo, useMemo, useCallback, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  MessageSquare, 
  FileText, 
  Palette, 
  Zap, 
  Shield, 
  Users,
  BarChart3,
  Code,
  Globe,
  Cpu,
  Database,
  Cloud,
  Sparkles
} from 'lucide-react'

// 功能特性数据类型
interface FeatureData {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  category: string
  benefits: string[]
  isPopular?: boolean
  isNew?: boolean
}

// 功能特性数据 - 使用useMemo缓存
const useFeatureData = (): FeatureData[] => {
  return useMemo(() => [
    {
      id: 'intelligent-chat',
      title: '智能对话',
      description: '基于先进的大语言模型，提供自然流畅的多轮对话体验，支持上下文理解和专业领域问答',
      icon: MessageSquare,
      category: '核心功能',
      benefits: ['多轮对话记忆', '上下文理解', '专业领域问答', '多语言支持'],
      isPopular: true
    },
    {
      id: 'cad-analysis',
      title: 'CAD智能分析',
      description: '专业的CAD文件解析和分析，支持多种格式和深度分析，提供工程优化建议',
      icon: FileText,
      category: '专业工具',
      benefits: ['多格式支持', '结构识别', '风险评估', '优化建议'],
      isNew: true
    },
    {
      id: 'poster-design',
      title: '海报生成',
      description: 'AI驱动的海报设计工具，快速生成专业级设计作品，支持多种风格和模板',
      icon: Palette,
      category: '创意设计',
      benefits: ['模板丰富', '智能配色', '一键生成', '高清导出']
    },
    {
      id: 'real-time-processing',
      title: '实时处理',
      description: '毫秒级响应的实时数据处理和分析能力，支持高并发和流式处理',
      icon: Zap,
      category: '性能优势',
      benefits: ['低延迟响应', '流式处理', '并发支持', '弹性扩展']
    },
    {
      id: 'security-privacy',
      title: '安全隐私',
      description: '企业级安全保障，确保数据隐私和系统安全，符合国际安全标准',
      icon: Shield,
      category: '安全保障',
      benefits: ['数据加密', '访问控制', '审计日志', '合规认证']
    },
    {
      id: 'collaboration',
      title: '团队协作',
      description: '支持多用户协作，提升团队工作效率，实现无缝的协作体验',
      icon: Users,
      category: '协作功能',
      benefits: ['多用户支持', '权限管理', '共享工作区', '实时同步']
    },
    {
      id: 'analytics',
      title: '数据分析',
      description: '强大的数据分析和可视化能力，洞察业务趋势，支持自定义报表',
      icon: BarChart3,
      category: '数据洞察',
      benefits: ['可视化图表', '趋势分析', '自定义报表', '数据导出']
    },
    {
      id: 'api-integration',
      title: 'API集成',
      description: '丰富的API接口，轻松集成到现有系统，提供完善的开发者工具',
      icon: Code,
      category: '开发工具',
      benefits: ['RESTful API', 'SDK支持', '文档完善', '示例代码']
    },
    {
      id: 'multi-platform',
      title: '多平台支持',
      description: '跨平台兼容，支持Web、移动端和桌面应用，提供一致的用户体验',
      icon: Globe,
      category: '平台兼容',
      benefits: ['响应式设计', '移动优化', 'PWA支持', '离线功能']
    },
    {
      id: 'high-performance',
      title: '高性能计算',
      description: '优化的计算引擎，处理复杂任务游刃有余，支持大规模并行计算',
      icon: Cpu,
      category: '性能优势',
      benefits: ['并行计算', '内存优化', '缓存策略', '负载均衡']
    },
    {
      id: 'data-management',
      title: '数据管理',
      description: '完善的数据管理体系，确保数据质量和可靠性，支持版本控制',
      icon: Database,
      category: '数据服务',
      benefits: ['数据备份', '版本控制', '数据清洗', '质量监控']
    },
    {
      id: 'cloud-native',
      title: '云原生架构',
      description: '基于云原生技术栈，提供弹性可扩展的服务，支持容器化部署',
      icon: Cloud,
      category: '技术架构',
      benefits: ['容器化部署', '微服务架构', '自动扩缩容', '故障自愈']
    }
  ], [])
}

// 功能卡片组件 - 使用memo优化
const FeatureCard = memo<{ feature: FeatureData }>(({ feature }) => {
  const IconComponent = feature.icon

  const handleCardClick = useCallback(() => {
    // 埋点统计
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'click', {
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
      
      <CardContent className="relative space-y-4">
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

FeatureCard.displayName = 'FeatureCard'

// 分类过滤器组件
const CategoryFilter = memo<{
  categories: string[]
  activeCategory: string
  onCategoryChange: (category: string) => void
}>(({ categories, activeCategory, onCategoryChange }) => {
  return (
    <div className="flex flex-wrap justify-center gap-3 mb-12">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onCategoryChange(category)}
          className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 shadow-sm ${
            activeCategory === category
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105'
              : 'bg-white/90 text-gray-600 hover:bg-blue-50 hover:text-blue-600 dark:bg-gray-800/90 dark:text-gray-300 dark:hover:bg-gray-700 hover:shadow-md hover:scale-105'
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  )
})

CategoryFilter.displayName = 'CategoryFilter'

// 主组件 - 移除section包装
const FeatureGrid = memo(() => {
  const features = useFeatureData()
  const [activeCategory, setActiveCategory] = useState('全部')

  // 获取所有分类
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(features.map(f => f.category)))
    return ['全部', ...uniqueCategories]
  }, [features])

  // 过滤功能
  const filteredFeatures = useMemo(() => {
    if (activeCategory === '全部') {
      return features
    }
    return features.filter(feature => feature.category === activeCategory)
  }, [features, activeCategory])

  const handleCategoryChange = useCallback((category: string) => {
    setActiveCategory(category)
    
    // 埋点统计
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'filter', {
        event_category: 'Feature Filter',
        event_label: category
      })
    }
  }, [])

  return (
    <>
      {/* 分类过滤器 */}
      <CategoryFilter
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
      />
      
      {/* 功能网格 */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredFeatures.map((feature) => (
          <FeatureCard key={feature.id} feature={feature} />
        ))}
      </div>
      
      {/* 空状态 */}
      {filteredFeatures.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <Sparkles className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">该分类下暂无功能特性</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">请尝试选择其他分类</p>
        </div>
      )}
      
      {/* 统计信息 */}
      <div className="mt-12 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          共 <span className="font-semibold text-blue-600">{filteredFeatures.length}</span> 个功能特性
          {activeCategory !== '全部' && (
            <span> • 分类: <span className="font-semibold">{activeCategory}</span></span>
          )}
        </p>
      </div>
    </>
  )
})

FeatureGrid.displayName = 'FeatureGrid'

export default FeatureGrid 