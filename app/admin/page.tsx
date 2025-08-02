/**
 * @file 管理员仪表板页面
 * @description 管理员主页，提供系统概览和快速导航
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  LayoutDashboard, 
  Database, 
  Users, 
  MessageSquare, 
  Bot,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Activity,
  Shield,
  Settings,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

const AdminDashboard = () => {
  // 系统统计数据（示例）
  const stats = {
    totalUsers: 1250,
    activeUsers: 890,
    totalAgents: 45,
    activeConversations: 156,
    totalConversations: 12500,
    systemHealth: 98.5,
    responseTime: 245, // ms
    errorRate: 0.2 // %
  };

  // 快速导航卡片
  const quickActions = [
    {
      title: '智能体管理',
      description: 'FastGPT智能体和自研智能体管理',
      href: '/admin/agents',
      icon: Bot,
      color: 'bg-blue-500',
      stats: `${stats.totalAgents} 个智能体`
    },
    {
      title: '对话管理',
      description: '用户对话记录和监控',
      href: '/admin/conversations',
      icon: MessageSquare,
      color: 'bg-green-500',
      stats: `${stats.activeConversations} 进行中`
    },
    {
      title: '用户管理',
      description: '管理用户账户和权限',
      href: '/admin/users',
      icon: Users,
      color: 'bg-purple-500',
      stats: `${stats.totalUsers} 用户`
    },
    {
      title: '数据库性能',
      description: '监控数据库性能指标',
      href: '/admin/database-performance',
      icon: Database,
      color: 'bg-orange-500',
      stats: '响应时间: 245ms'
    },
    {
      title: '系统监控',
      description: '实时系统状态监控',
      href: '/admin/monitoring',
      icon: Activity,
      color: 'bg-cyan-500',
      stats: '运行时间: 99.8%'
    },
    {
      title: '安全中心',
      description: '安全策略和访问控制',
      href: '/admin/security',
      icon: Shield,
      color: 'bg-red-500',
      stats: '安全等级: 高'
    }
  ];

  return (
    <div className="p-6 space-y-6 relative">
        {/* 页面标题 */}
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent flex items-center gap-2">
              <LayoutDashboard className="h-8 w-8" />
              管理员仪表板
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 animate-slide-up">
              系统概览和关键指标监控
            </p>
          </div>
          <Badge variant="outline" className="text-green-600 border-green-600">
            <CheckCircle className="h-4 w-4 mr-1" />
            系统正常
          </Badge>
        </div>

        {/* 系统概览统计 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:shadow-lg hover:scale-105 transition-all duration-300 animate-fade-in card-hover" style={{ animationDelay: '0s' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总用户数</CardTitle>
              <div className="p-2 rounded-full bg-gradient-primary glow-primary animate-pulse">
                <Users className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">{stats.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 inline mr-1" />
                活跃用户: {stats.activeUsers}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg hover:scale-105 transition-all duration-300 animate-fade-in card-hover" style={{ animationDelay: '0.1s' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">智能体数量</CardTitle>
              <div className="p-2 rounded-full bg-gradient-primary glow-primary animate-pulse">
                <Bot className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">{stats.totalAgents}</div>
              <p className="text-xs text-muted-foreground">
                <Activity className="h-3 w-3 inline mr-1" />
                全部可用
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg hover:scale-105 transition-all duration-300 animate-fade-in card-hover" style={{ animationDelay: '0.2s' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">对话总数</CardTitle>
              <div className="p-2 rounded-full bg-gradient-primary glow-primary animate-pulse">
                <MessageSquare className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">{stats.totalConversations.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 inline mr-1" />
                进行中: {stats.activeConversations}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg hover:scale-105 transition-all duration-300 animate-fade-in card-hover" style={{ animationDelay: '0.3s' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">系统健康度</CardTitle>
              <div className="p-2 rounded-full bg-gradient-primary glow-primary animate-pulse">
                <BarChart3 className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">{stats.systemHealth}%</div>
              <Progress value={stats.systemHealth} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* 快速导航卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          {quickActions.map((action, index) => {
            const IconComponent = action.icon;
            return (
              <Card key={index} className="hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer card-hover animate-fade-in" style={{ animationDelay: `${0.5 + index * 0.1}s` }}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-lg bg-gradient-primary glow-primary animate-pulse">
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {action.stats}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg bg-gradient-primary bg-clip-text text-transparent">{action.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {action.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Link href={action.href}>
                    <Button variant="outline" className="w-full group hover:bg-gradient-primary hover:text-white transition-all duration-300">
                      查看详情
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 系统状态概览 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 系统指标 */}
          <Card className="card-hover animate-fade-in" style={{ animationDelay: '0.7s' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 bg-gradient-primary bg-clip-text text-transparent">
                <BarChart3 className="h-5 w-5 text-primary" />
                系统指标
              </CardTitle>
              <CardDescription>实时系统性能监控</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.8s' }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">CPU 使用率</span>
                  <span className="text-sm bg-gradient-primary bg-clip-text text-transparent font-medium">45%</span>
                </div>
                <Progress value={45} className="h-2" />
              </div>
              <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.9s' }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">内存使用率</span>
                  <span className="text-sm bg-gradient-primary bg-clip-text text-transparent font-medium">62%</span>
                </div>
                <Progress value={62} className="h-2" />
              </div>
              <div className="space-y-3 animate-fade-in" style={{ animationDelay: '1.0s' }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">磁盘使用率</span>
                  <span className="text-sm bg-gradient-primary bg-clip-text text-transparent font-medium">78%</span>
                </div>
                <Progress value={78} className="h-2" />
              </div>
              <div className="space-y-3 animate-fade-in" style={{ animationDelay: '1.1s' }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">响应时间</span>
                  <span className="text-sm bg-gradient-primary bg-clip-text text-transparent font-medium">{stats.responseTime}ms</span>
                </div>
                <Progress value={25} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* 最近活动 */}
          <Card className="card-hover animate-fade-in" style={{ animationDelay: '0.8s' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 bg-gradient-primary bg-clip-text text-transparent">
                <Activity className="h-5 w-5 text-primary" />
                最近活动
              </CardTitle>
              <CardDescription>系统活动日志</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-all duration-300 animate-fade-in" style={{ animationDelay: '0.9s' }}>
                  <div className="w-2 h-2 bg-gradient-primary rounded-full mt-2 glow-primary animate-pulse"></div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">数据库性能优化完成</p>
                    <p className="text-xs text-muted-foreground">2分钟前</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-all duration-300 animate-fade-in" style={{ animationDelay: '1.0s' }}>
                  <div className="w-2 h-2 bg-gradient-primary rounded-full mt-2 glow-primary animate-pulse"></div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">新用户注册</p>
                    <p className="text-xs text-muted-foreground">5分钟前</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-all duration-300 animate-fade-in" style={{ animationDelay: '1.1s' }}>
                  <div className="w-2 h-2 bg-gradient-primary rounded-full mt-2 glow-primary animate-pulse"></div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">智能体更新完成</p>
                    <p className="text-xs text-muted-foreground">8分钟前</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-all duration-300 animate-fade-in" style={{ animationDelay: '1.2s' }}>
                  <div className="w-2 h-2 bg-gradient-primary rounded-full mt-2 glow-primary animate-pulse"></div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">安全扫描完成</p>
                    <p className="text-xs text-muted-foreground">15分钟前</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-all duration-300 animate-fade-in" style={{ animationDelay: '1.3s' }}>
                  <div className="w-2 h-2 bg-gradient-primary rounded-full mt-2 glow-primary animate-pulse"></div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">系统备份完成</p>
                    <p className="text-xs text-muted-foreground">1小时前</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
};

export default AdminDashboard;
