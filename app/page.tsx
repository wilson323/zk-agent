// @ts-nocheck
/**
 * @file 主页面
 * @description ZK-Agent AI多智能体宇宙平台主页
 * @author ZK-Agent Team A
 * @date 2024-12-19
 */

import { Suspense, lazy } from 'react'
import { Metadata } from 'next'
import HeroSection from '@/components/welcome/hero-section'
import QuickStartSection from '@/components/welcome/quick-start-section'
import LoadingSkeleton from '@/components/welcome/loading-skeleton'
import ErrorBoundary from '@/components/ui/error-boundary'
import { PerformanceMonitor } from '@/hooks/use-performance'
import { Sparkles, Zap, Users, Star, TrendingUp } from 'lucide-react'

// 懒加载非关键组件
const AgentShowcase = lazy(() => import('@/components/welcome/agent-showcase'))
const FeatureGrid = lazy(() => import('@/components/welcome/feature-grid'))
const StatsSection = lazy(() => import('@/components/welcome/stats-section'))
const TestimonialsSection = lazy(() => import('@/components/welcome/testimonials-section'))

export const metadata: Metadata = {
  title: 'ZK-Agent - AI多智能体宇宙平台',
  description: '集成FastGPT对话助手、CAD分析专家、海报生成器的一站式AI智能体平台，为您提供专业的AI解决方案',
  keywords: ['AI智能体', 'FastGPT', 'CAD分析', '海报生成', '人工智能', '智能对话'],
  authors: [{ name: 'ZK-Agent Team A' }],
  openGraph: {
    title: 'ZK-Agent - AI多智能体宇宙平台',
    description: '专业的AI智能体平台，提供智能对话、CAD分析、海报生成等服务',
    type: 'website',
    locale: 'zh_CN'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ZK-Agent - AI多智能体宇宙平台',
    description: '专业的AI智能体平台，提供智能对话、CAD分析、海报生成等服务'
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  }
}

// 页面结构化数据
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "ZK-Agent",
  "description": "AI多智能体宇宙平台",
  "url": "https://zk-agent.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://zk-agent.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}

export default function HomePage() {
  return (
    <>
      {/* 结构化数据 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      
      {/* 性能监控 */}
      <PerformanceMonitor
        enableWebVitals={true}
        enableResourceTiming={true}
        enableMemoryMonitoring={true}
        onMetric={(metric, value, rating) => {
          // 性能指标回调
          if (rating === 'poor') {
            console.warn(`Performance issue detected: ${metric} = ${value}`)
          }
        }}
      />
      
      <ErrorBoundary
        onError={(error, errorInfo) => {
          // 错误上报
          console.error('HomePage Error:', error, errorInfo)
        }}
      >
        <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          {/* 英雄区域 */}
          <ErrorBoundary>
            <HeroSection />
          </ErrorBoundary>
          
          {/* 快速开始区域 */}
          <ErrorBoundary>
            <QuickStartSection />
          </ErrorBoundary>
          
          {/* 热门智能体展示 */}
          <section className="py-24 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {/* 标题区域 */}
              <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
                  <Zap className="h-4 w-4" />
                  <span>热门智能体</span>
                </div>
                
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl lg:text-5xl">
                  探索精选
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    AI智能体
                  </span>
                </h2>
                
                <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
                  每一个智能体都经过专业优化，为您提供卓越的服务体验
                </p>
              </div>
              
              <ErrorBoundary
                fallback={
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">智能体展示暂时不可用</p>
                  </div>
                }
              >
                <Suspense fallback={<LoadingSkeleton type="agents" count={6} />}>
                  <AgentShowcase />
                </Suspense>
              </ErrorBoundary>
            </div>
          </section>
          
          {/* 功能特性展示 */}
          <section className="py-24 bg-white dark:bg-gray-900">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {/* 标题区域 */}
              <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium mb-6">
                  <Sparkles className="h-4 w-4" />
                  <span>功能特性</span>
                </div>
                
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl lg:text-5xl">
                  强大的
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    AI能力
                  </span>
                </h2>
                
                <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
                  全面的AI能力集成，为您的业务提供强大的技术支撑和创新动力
                </p>
              </div>
              
              <ErrorBoundary
                fallback={
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">功能特性展示暂时不可用</p>
                  </div>
                }
              >
                <Suspense fallback={<LoadingSkeleton type="features" count={12} />}>
                  <FeatureGrid />
                </Suspense>
              </ErrorBoundary>
            </div>
          </section>
          
          {/* 统计数据展示 */}
          <section className="py-24 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {/* 标题区域 */}
              <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 text-white text-sm font-medium mb-6">
                  <TrendingUp className="h-4 w-4" />
                  <span>平台数据</span>
                </div>
                
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                  实时数据
                  <span className="text-yellow-300">
                    概览
                  </span>
                </h2>
                
                <p className="mx-auto mt-6 max-w-2xl text-lg text-blue-100">
                  实时数据展示平台的强劲表现，见证AI技术为用户创造的价值
                </p>
              </div>
              
              <ErrorBoundary
                fallback={
                  <div className="text-center py-12">
                    <p className="text-white/80">统计数据暂时不可用</p>
                  </div>
                }
              >
                <Suspense fallback={<LoadingSkeleton type="stats" />}>
                  <StatsSection />
                </Suspense>
              </ErrorBoundary>
            </div>
          </section>
          
          {/* 用户评价展示 */}
          <section className="py-24 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {/* 标题区域 */}
              <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-sm font-medium mb-6">
                  <Star className="h-4 w-4" />
                  <span>用户评价</span>
                </div>
                
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl lg:text-5xl">
                  用户的
                  <span className="bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                    真实反馈
                  </span>
                </h2>
                
                <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
                  听听用户怎么说，了解ZK-Agent如何改变他们的工作方式
                </p>
              </div>
              
              <ErrorBoundary
                fallback={
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">用户评价暂时不可用</p>
                  </div>
                }
              >
                <Suspense fallback={<LoadingSkeleton type="testimonials" count={3} />}>
                  <TestimonialsSection />
                </Suspense>
              </ErrorBoundary>
            </div>
          </section>
          
          {/* CTA区域 */}
          <ErrorBoundary>
            <section className="py-24 bg-gradient-to-r from-blue-600 to-purple-600">
              <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h2 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
                      准备好体验AI的力量了吗？
                    </h2>
                    <p className="text-xl text-blue-100">
                      立即开始您的AI之旅，解锁无限可能
                    </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <a
                      href="/chat"
                      className="inline-flex items-center px-8 py-4 text-lg font-semibold text-blue-600 bg-white rounded-full hover:bg-gray-50 transition-colors duration-200 shadow-lg hover:shadow-xl"
                    >
                      <Sparkles className="h-5 w-5 mr-2" />
                      免费开始体验
                    </a>
                    <a
                      href="/agents"
                      className="inline-flex items-center px-8 py-4 text-lg font-semibold text-white border-2 border-white rounded-full hover:bg-white hover:text-blue-600 transition-colors duration-200"
                    >
                      <Users className="h-5 w-5 mr-2" />
                      查看所有智能体
                    </a>
                  </div>
                  
                  <p className="text-sm text-blue-200">
                    无需信用卡 • 即开即用 • 7天免费试用
                  </p>
                </div>
              </div>
            </section>
          </ErrorBoundary>
        </main>
      </ErrorBoundary>
    </>
  )
}
