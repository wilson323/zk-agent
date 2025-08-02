/**
 * @file 管理员智能体管理页面
 * @description 管理员端智能体数据展示和管理界面
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Bot, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw, 
  Settings, 
  BarChart3,
  Users,
  MessageSquare,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { useAgents } from '@/hooks/use-fastgpt';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

const AgentManagementPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('fastgpt');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { applications: fastgptAgents, isLoading, refetch } = useAgents();

  // 自研智能体数据（示例）
  const [customAgents, setCustomAgents] = useState([
    {
      id: 'custom-1',
      name: '代码审查助手',
      description: '专业的代码审查和质量检测工具',
      type: 'custom',
      status: 'active',
      version: '1.2.0',
      creator: 'ZK-Agent Team',
      createdAt: '2024-01-15',
      lastUpdated: '2024-12-10',
      users: 1250,
      conversations: 8900,
      category: '开发工具'
    },
    {
      id: 'custom-2', 
      name: '智能客服',
      description: '24/7在线客服智能体',
      type: 'custom',
      status: 'active',
      version: '2.1.0',
      creator: 'ZK-Agent Team',
      createdAt: '2024-02-20',
      lastUpdated: '2024-12-15',
      users: 3400,
      conversations: 15600,
      category: '客户服务'
    },
    {
      id: 'custom-3',
      name: '数据分析专家',
      description: '企业级数据分析和报告生成',
      type: 'custom', 
      status: 'development',
      version: '0.8.0',
      creator: 'ZK-Agent Team',
      createdAt: '2024-11-01',
      lastUpdated: '2024-12-18',
      users: 89,
      conversations: 234,
      category: '数据科学'
    }
  ]);

  // FastGPT智能体卡片组件
  const FastGPTAgentCard = ({ agent }: { agent: any }) => (
    <Card className="glass-effect hover:shadow-xl transition-all duration-300 hover:scale-105 animate-slide-up">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={agent.avatar} />
              <AvatarFallback>
                <Bot className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{agent.name || `智能体 ${agent.id}`}</CardTitle>
              <CardDescription className="text-sm">
                ID: {agent.id}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            FastGPT
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {agent.intro || '暂无描述'}
        </p>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {agent.conversations || 0}
            </div>
            <div className="text-xs text-gray-500">对话次数</div>
          </div>
          <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {new Date(agent.updateTime).toLocaleDateString()}
            </div>
            <div className="text-xs text-gray-500">最后更新</div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 hover:bg-primary/10 transition-colors">
            <Settings className="h-4 w-4 mr-1" />
            配置
          </Button>
          <Button size="sm" variant="outline" className="flex-1 hover:bg-primary/10 transition-colors">
            <BarChart3 className="h-4 w-4 mr-1" />
            统计
          </Button>
          <Button size="sm" variant="outline" className="hover:bg-primary/10 transition-colors">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // 自研智能体卡片组件
  const CustomAgentCard = ({ agent }: { agent: any }) => (
    <Card className="glass-effect hover:shadow-xl transition-all duration-300 hover:scale-105 animate-slide-up border-gradient">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                <Bot className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{agent.name}</CardTitle>
              <CardDescription className="text-sm">
                v{agent.version} • {agent.creator}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={agent.status === 'active' ? 'default' : 'secondary'}
              className={agent.status === 'active' ? 'bg-green-100 text-green-800' : ''}
            >
              {agent.status === 'active' ? '运行中' : '开发中'}
            </Badge>
            <Badge variant="outline" className="bg-purple-50 text-purple-700">
              自研
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {agent.description}
        </p>
        
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
              {agent.users}
            </div>
            <div className="text-xs text-gray-500">用户</div>
          </div>
          <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
              {agent.conversations}
            </div>
            <div className="text-xs text-gray-500">对话</div>
          </div>
          <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="text-xs font-semibold text-gray-900 dark:text-white">
              {agent.lastUpdated}
            </div>
            <div className="text-xs text-gray-500">更新</div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="sm" className="flex-1 bg-gradient-primary hover:opacity-90 transition-opacity">
            <Edit className="h-4 w-4 mr-1" />
            编辑
          </Button>
          <Button size="sm" variant="outline" className="hover:bg-primary/10 transition-colors">
            <BarChart3 className="h-4 w-4 mr-1" />
            统计
          </Button>
          <Button size="sm" variant="outline" className="hover:bg-primary/10 transition-colors">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6 relative">
      <div className="absolute inset-0 particles-bg opacity-10"></div>
      {/* 页面标题 */}
      <div className="mb-6 animate-fade-in relative z-10">
        <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2 flex items-center gap-2">
          <Bot className="h-7 w-7 text-primary animate-pulse" />
          智能体管理
        </h1>
        <p className="text-gray-600 dark:text-gray-400 animate-slide-up">
          管理和监控所有智能体的运行状态和性能数据
        </p>
      </div>

      {/* 搜索和操作栏 */}
      <div className="flex items-center justify-between mb-6 animate-slide-up relative z-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索智能体..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-80 glass-effect"
            />
          </div>
          <Button 
            variant="outline" 
            onClick={() => {
              setIsRefreshing(true);
              refetch();
              setTimeout(() => setIsRefreshing(false), 1000);
            }}
            className="glass-effect hover:bg-primary/10"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
        <Button className="bg-gradient-primary hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl">
          <Plus className="h-4 w-4 mr-2" />
          新建智能体
        </Button>
      </div>

      {/* 智能体分类标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="relative z-10">
        <TabsList className="grid w-full grid-cols-2 mb-6 glass-effect">
          <TabsTrigger value="fastgpt" className="flex items-center gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
            <Bot className="h-4 w-4" />
            FastGPT 智能体
            {fastgptAgents && (
              <Badge variant="secondary" className="ml-1 bg-white/20 text-current">
                {fastgptAgents.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
            <Settings className="h-4 w-4" />
            自研智能体
            <Badge variant="secondary" className="ml-1 bg-white/20 text-current">
              {customAgents.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* FastGPT智能体列表 */}
        <TabsContent value="fastgpt" className="animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-16 w-full mb-4" />
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-8 flex-1" />
                      <Skeleton className="h-8 flex-1" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : fastgptAgents && fastgptAgents.length > 0 ? (
              fastgptAgents
                .filter(agent => 
                  !searchQuery || 
                  agent.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  agent.id.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map(agent => (
                  <FastGPTAgentCard key={agent.id} agent={agent} />
                ))
            ) : (
              <div className="col-span-full text-center py-12">
                <Bot className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  暂无FastGPT智能体
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  请检查FastGPT配置或创建新的智能体
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* 自研智能体列表 */}
        <TabsContent value="custom" className="animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {customAgents
              .filter(agent => 
                !searchQuery || 
                agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                agent.description.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map(agent => (
                <CustomAgentCard key={agent.id} agent={agent} />
              ))
            }
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AgentManagementPage;