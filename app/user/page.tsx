// @ts-nocheck
/**
 * @file 用户端主页
 * @description 用户端界面主页，专注于智能体使用和广场展示
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

import { Suspense } from 'react';
import { Metadata } from 'next';
import { UserLayout } from '@/components/layout/user-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  MessageSquare,
  Bot,
  Sparkles,
  TrendingUp,
  Users,
  Star,
  ArrowRight,
  Zap,
  Image as ImageIcon,
  FileText,
  Search,
} from 'lucide-react';
import Link from 'next/link';
import MascotAnimation from '@/components/common/mascot-animation';

export const metadata: Metadata = {
  title: 'ZK-Agent - 智能体宇宙平台',
  description: '与AI智能体对话，探索智能体广场，发现无限可能',
  keywords: ['AI智能体', '对话', '广场', '人工智能'],
};

// 热门智能体数据
const featuredAgents = [
  {
    id: '1',
    name: 'FastGPT助手',
    description: '强大的对话AI，能够回答各种问题，协助完成多种任务',
    avatar: '/avatars/fastgpt.png',
    category: '对话助手',
    users: 1234,
    rating: 4.8,
    tags: ['对话', '问答', '助手'],
    color: 'bg-blue-500',
  },
  {
    id: '2',
    name: 'CAD分析专家',
    description: '专业的CAD文件分析工具，提供详细的设计分析和建议',
    avatar: '/avatars/cad.png',
    category: '专业工具',
    users: 567,
    rating: 4.9,
    tags: ['CAD', '分析', '设计'],
    color: 'bg-green-500',
  },
  {
    id: '3',
    name: '海报生成器',
    description: '创意海报设计AI，快速生成专业级别的宣传海报',
    avatar: '/avatars/poster.png',
    category: '创意设计',
    users: 890,
    rating: 4.7,
    tags: ['设计', '海报', '创意'],
    color: 'bg-purple-500',
  },
  {
    id: '4',
    name: '文档助手',
    description: '智能文档处理，支持多种格式的文档分析和总结',
    avatar: '/avatars/document.png',
    category: '办公助手',
    users: 432,
    rating: 4.6,
    tags: ['文档', '总结', '分析'],
    color: 'bg-orange-500',
  },
];

// 统计数据
const stats = [
  {
    label: '活跃智能体',
    value: '50+',
    icon: Bot,
    color: 'text-blue-600',
  },
  {
    label: '用户对话',
    value: '10K+',
    icon: MessageSquare,
    color: 'text-green-600',
  },
  {
    label: '注册用户',
    value: '5K+',
    icon: Users,
    color: 'text-purple-600',
  },
  {
    label: '满意度',
    value: '98%',
    icon: Star,
    color: 'text-yellow-600',
  },
];

/**
 * 英雄区域组件
 */
function HeroSection() {
  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 dark:from-gray-900 dark:to-gray-800">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="absolute top-10 left-10 w-20 h-20 bg-primary/10 rounded-full blur-xl animate-float"></div>
      <div className="absolute bottom-10 right-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl animate-float" style={{animationDelay: '2s'}}></div>
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-20 left-10 w-20 h-20 bg-primary/20 rounded-full opacity-20 animate-pulse" />
        <div className="absolute top-40 right-20 w-16 h-16 bg-primary/15 rounded-full opacity-20 animate-pulse delay-1000" />
        <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-primary/10 rounded-full opacity-20 animate-pulse delay-2000" />
      </div>

      <div className="relative max-w-7xl mx-auto text-center z-10">
        {/* 吉祥物动画 */}
        <div className="mb-8 flex justify-center">
          <MascotAnimation 
            animation="welcome" 
            size="lg" 
            showBubble={true} 
            bubbleText="欢迎来到ZK智能体平台！" 
          />
        </div>
        
        {/* 主标题 */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 dark:bg-primary/20 rounded-full text-primary dark:text-primary text-sm font-medium mb-6 animate-fade-in">
            <Sparkles className="h-4 w-4" />
            <span>AI智能体宇宙平台</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 animate-fade-in">
            与AI智能体
            <span className="bg-gradient-primary bg-clip-text text-transparent animate-glow">
              对话无界
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed animate-slide-up" style={{animationDelay: '0.2s'}}>
            探索智能体广场，发现专业AI助手。从对话交流到专业分析，从创意设计到办公协助，开启您的AI之旅。
          </p>
        </div>

        {/* 行动按钮 */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-slide-up" style={{animationDelay: '0.4s'}}>
          <Button asChild size="lg" className="bg-gradient-primary hover:shadow-lg hover:scale-105 transition-all duration-300 glow-primary text-white px-8 py-3">
            <Link href="/chat" className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              开始对话
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="px-8 py-3 border-primary text-primary hover:bg-primary/10 hover:scale-105 transition-all duration-300">
            <Link href="/agents" className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              探索广场
            </Link>
          </Button>
        </div>

        {/* 统计数据 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="text-center">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg bg-white dark:bg-gray-800 shadow-sm mb-3`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/**
 * 热门智能体展示组件
 */
function FeaturedAgents() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            热门智能体
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            发现最受欢迎的AI智能体，开始您的智能对话之旅
          </p>
        </div>

        {/* 智能体卡片网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {featuredAgents.map(agent => (
            <Card key={agent.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-0 bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-12 h-12 rounded-lg ${agent.color} flex items-center justify-center`}>
                    <Bot className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                      {agent.name}
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {agent.category}
                    </Badge>
                  </div>
                </div>
                <CardDescription className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                  {agent.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {/* 标签 */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {agent.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* 统计信息 */}
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{agent.users}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span>{agent.rating}</span>
                  </div>
                </div>

                {/* 行动按钮 */}
                <Button asChild className="w-full" size="sm">
                  <Link href={`/chat?agent=${agent.id}`}>
                    开始对话
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 查看更多按钮 */}
        <div className="text-center">
          <Button asChild variant="outline" size="lg">
            <Link href="/agents" className="flex items-center gap-2">
              查看所有智能体
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/**
 * 功能特色组件
 */
function FeatureHighlights() {
  const features = [
    {
      icon: MessageSquare,
      title: '智能对话',
      description: '与AI智能体进行自然流畅的对话，获得专业的回答和建议',
      color: 'bg-blue-500',
    },
    {
      icon: ImageIcon,
      title: '创意设计',
      description: '利用AI生成创意海报、图像和设计作品，释放您的创造力',
      color: 'bg-purple-500',
    },
    {
      icon: FileText,
      title: '专业分析',
      description: '上传CAD文件、文档等，获得专业的分析和处理建议',
      color: 'bg-green-500',
    },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800/50">
      <div className="max-w-7xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            强大功能
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            多样化的AI智能体，满足您的各种需求
          </p>
        </div>

        {/* 功能卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className="text-center group">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${feature.color} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/**
 * 用户端主页
 */
export default function UserHomePage() {
  return (
    <div className="min-h-screen">
      {/* 英雄区域 */}
      <HeroSection />

      {/* 热门智能体 */}
      <section className="py-16 px-4 bg-gradient-to-b from-white to-primary/5 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 animate-fade-in">
              热门智能体
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto animate-slide-up" style={{animationDelay: '0.1s'}}>
              发现最受欢迎的AI智能体，体验不同领域的专业服务
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {featuredAgents.map((agent, index) => (
              <Card key={agent.id} className="group hover:shadow-xl hover:scale-105 transition-all duration-300 border-primary/20 hover:border-primary/40 card-hover animate-slide-up" style={{animationDelay: `${index * 0.1}s`}}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-lg ${agent.color} flex items-center justify-center ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300`}>
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg group-hover:text-primary transition-colors duration-300">{agent.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                          {agent.category}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm text-gray-600">{agent.rating}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4">
                    {agent.description}
                  </CardDescription>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{agent.users}</span>
                      </div>
                    </div>
                    <Link href={`/chat?agent=${agent.id}`}>
                      <Button size="sm" className="bg-gradient-primary hover:shadow-lg hover:scale-105 transition-all duration-300">
                        开始对话
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center animate-fade-in" style={{animationDelay: '0.6s'}}>
            <Link href="/agents">
              <Button variant="outline" size="lg" className="border-primary text-primary hover:bg-primary/10 hover:scale-105 transition-all duration-300">
                查看更多智能体
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 功能特色 */}
      <FeatureHighlights />
    </div>
  );
}