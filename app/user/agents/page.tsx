// @ts-nocheck
/**
 * @file 智能体广场页面
 * @description 用户端智能体广场，展示所有可用的智能体
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bot,
  Search,
  Filter,
  Star,
  Users,
  MessageSquare,
  TrendingUp,
  Clock,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

// 智能体数据
const agents = [
  {
    id: '1',
    name: 'FastGPT助手',
    description: '强大的对话AI，能够回答各种问题，协助完成多种任务。支持多轮对话，理解上下文，提供准确的回答。',
    category: '对话助手',
    tags: ['对话', '问答', '助手', '通用'],
    users: 1234,
    rating: 4.8,
    reviews: 156,
    color: 'bg-blue-500',
    featured: true,
    lastUpdated: '2024-12-19',
    creator: 'ZK-Agent Team',
  },
  {
    id: '2',
    name: 'CAD分析专家',
    description: '专业的CAD文件分析工具，提供详细的设计分析和建议。支持多种CAD格式，提供专业的工程分析。',
    category: '专业工具',
    tags: ['CAD', '分析', '设计', '工程'],
    users: 567,
    rating: 4.9,
    reviews: 89,
    color: 'bg-green-500',
    featured: true,
    lastUpdated: '2024-12-18',
    creator: 'CAD Team',
  },
  {
    id: '3',
    name: '海报生成器',
    description: '创意海报设计AI，快速生成专业级别的宣传海报。支持多种风格和模板，满足不同场景需求。',
    category: '创意设计',
    tags: ['设计', '海报', '创意', '营销'],
    users: 890,
    rating: 4.7,
    reviews: 123,
    color: 'bg-purple-500',
    featured: true,
    lastUpdated: '2024-12-17',
    creator: 'Design Team',
  },
  {
    id: '4',
    name: '文档助手',
    description: '智能文档处理，支持多种格式的文档分析和总结。能够快速提取关键信息，生成摘要。',
    category: '办公助手',
    tags: ['文档', '总结', '分析', '办公'],
    users: 432,
    rating: 4.6,
    reviews: 67,
    color: 'bg-orange-500',
    featured: false,
    lastUpdated: '2024-12-16',
    creator: 'Office Team',
  },
  {
    id: '5',
    name: '代码助手',
    description: '编程助手AI，帮助开发者编写、调试和优化代码。支持多种编程语言，提供最佳实践建议。',
    category: '开发工具',
    tags: ['编程', '代码', '调试', '开发'],
    users: 678,
    rating: 4.8,
    reviews: 98,
    color: 'bg-indigo-500',
    featured: false,
    lastUpdated: '2024-12-15',
    creator: 'Dev Team',
  },
  {
    id: '6',
    name: '翻译专家',
    description: '多语言翻译AI，支持100+种语言的精准翻译。理解语境，提供自然流畅的翻译结果。',
    category: '语言工具',
    tags: ['翻译', '语言', '国际化', '沟通'],
    users: 543,
    rating: 4.7,
    reviews: 76,
    color: 'bg-teal-500',
    featured: false,
    lastUpdated: '2024-12-14',
    creator: 'Language Team',
  },
];

// 分类列表
const categories = [
  '全部',
  '对话助手',
  '专业工具',
  '创意设计',
  '办公助手',
  '开发工具',
  '语言工具',
];

// 排序选项
const sortOptions = [
  { value: 'popular', label: '最受欢迎' },
  { value: 'rating', label: '评分最高' },
  { value: 'newest', label: '最新发布' },
  { value: 'users', label: '用户最多' },
];

/**
 * 智能体卡片组件
 */
function AgentCard({ agent }: { agent: typeof agents[0] }) {
  return (
    <Card className="group hover:shadow-xl hover:shadow-primary/20 hover:scale-105 transition-all duration-300 cursor-pointer border-0 bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-lg ${agent.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300 glow-primary`}>
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                  {agent.name}
                </CardTitle>
                {agent.featured && (
                  <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    推荐
                  </Badge>
                )}
              </div>
              <Badge variant="secondary" className="text-xs mt-1 bg-primary/10 text-primary border-primary/20">
                {agent.category}
              </Badge>
            </div>
          </div>
        </div>
        <CardDescription className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
          {agent.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {/* 标签 */}
        <div className="flex flex-wrap gap-1 mb-4">
          {agent.tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {agent.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{agent.tags.length - 3}
            </Badge>
          )}
        </div>

        {/* 统计信息 */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{agent.users.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span>{agent.rating}</span>
            <span className="text-xs">({agent.reviews})</span>
          </div>
        </div>

        {/* 创建者和更新时间 */}
        <div className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          <div>创建者: {agent.creator}</div>
          <div>更新: {agent.lastUpdated}</div>
        </div>

        {/* 行动按钮 */}
        <div className="flex gap-2">
          <Button asChild className="flex-1 bg-gradient-primary hover:shadow-lg hover:scale-105 transition-all duration-300 text-white glow-primary" size="sm">
            <Link href={`/chat?agent=${agent.id}`}>
              <MessageSquare className="h-3 w-3 mr-1" />
              开始对话
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="border-primary/20 hover:border-primary hover:bg-primary/10 hover:scale-105 transition-all duration-300">
            <Link href={`/agents/${agent.id}`}>
              详情
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 智能体广场页面
 */
export default function AgentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [sortBy, setSortBy] = useState('popular');
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);

  // 过滤和排序智能体
  const filteredAndSortedAgents = useMemo(() => {
    let filtered = agents.filter(agent => {
      // 搜索过滤
      const matchesSearch = searchQuery === '' || 
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // 分类过滤
      const matchesCategory = selectedCategory === '全部' || agent.category === selectedCategory;
      
      // 推荐过滤
      const matchesFeatured = !showFeaturedOnly || agent.featured;
      
      return matchesSearch && matchesCategory && matchesFeatured;
    });

    // 排序
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'newest':
          return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
        case 'users':
          return b.users - a.users;
        case 'popular':
        default:
          return (b.rating * b.users) - (a.rating * a.users);
      }
    });

    return filtered;
  }, [searchQuery, selectedCategory, sortBy, showFeaturedOnly]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-primary/10 dark:from-gray-900 dark:via-gray-800 dark:to-primary/20 py-8">
      <div className="absolute inset-0 particles-bg opacity-30"></div>
      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
          {/* 页面标题 */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 animate-fade-in">
              智能体广场
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto animate-slide-up">
              发现和探索各种AI智能体，找到最适合您需求的AI助手
            </p>
          </div>

          {/* 搜索和过滤区域 */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 mb-8 hover:shadow-xl transition-all duration-300">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              {/* 搜索框 */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                <Input
                  type="text"
                  placeholder="搜索智能体..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-primary/20 focus:border-primary focus:ring-primary/20 transition-all duration-300"
                />
              </div>

              {/* 过滤器 */}
              <div className="flex items-center gap-4">
                {/* 排序 */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-32 border-primary/20 focus:border-primary focus:ring-primary/20 transition-all duration-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-primary/20">
                    {sortOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* 只显示推荐 */}
                <Button
                  variant={showFeaturedOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowFeaturedOnly(!showFeaturedOnly)}
                  className="flex items-center gap-2 border-primary/20 hover:border-primary hover:bg-primary/10 transition-all duration-300"
                >
                  <Sparkles className="h-4 w-4" />
                  推荐
                </Button>
              </div>
            </div>
          </div>

          {/* 分类标签 */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-8">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-primary/20">
              {categories.map(category => (
                <TabsTrigger 
                  key={category} 
                  value={category} 
                  className="text-xs lg:text-sm data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300 hover:bg-primary/10"
                >
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* 结果统计 */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              找到 {filteredAndSortedAgents.length} 个智能体
            </div>
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="text-sm"
              >
                清除搜索
              </Button>
            )}
          </div>

          {/* 智能体网格 */}
          {filteredAndSortedAgents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAndSortedAgents.map(agent => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Bot className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                未找到匹配的智能体
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                尝试调整搜索条件或浏览其他分类
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('全部');
                  setShowFeaturedOnly(false);
                }}
              >
                重置筛选
              </Button>
            </div>
          )}
      </div>
    </div>
  );
}