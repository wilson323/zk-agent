/**
 * @file 管理员对话管理页面
 * @description 管理员端对话记录管理和监控界面
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MessageSquare, 
  Search, 
  Filter, 
  Eye, 
  Download, 
  Trash2,
  Calendar,
  Clock,
  User,
  Bot,
  BarChart3,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface Conversation {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  agentId: string;
  agentName: string;
  agentType: 'fastgpt' | 'custom';
  startTime: string;
  endTime?: string;
  messageCount: number;
  status: 'active' | 'completed' | 'error';
  duration: number; // 分钟
  lastMessage: string;
  category: string;
}

const ConversationManagementPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [agentTypeFilter, setAgentTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [isLoading, setIsLoading] = useState(true);

  // 示例对话数据
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: 'conv-1',
      userId: 'user-1',
      userName: '张三',
      userAvatar: '/avatars/user1.png',
      agentId: 'agent-1',
      agentName: '编程助手',
      agentType: 'fastgpt',
      startTime: '2024-12-19T10:30:00Z',
      endTime: '2024-12-19T11:15:00Z',
      messageCount: 24,
      status: 'completed',
      duration: 45,
      lastMessage: '谢谢你的帮助，代码问题已经解决了！',
      category: '技术支持'
    },
    {
      id: 'conv-2',
      userId: 'user-2',
      userName: '李四',
      userAvatar: '/avatars/user2.png',
      agentId: 'agent-2',
      agentName: '写作大师',
      agentType: 'custom',
      startTime: '2024-12-19T14:20:00Z',
      messageCount: 12,
      status: 'active',
      duration: 25,
      lastMessage: '请帮我优化这段文案的表达方式',
      category: '内容创作'
    },
    {
      id: 'conv-3',
      userId: 'user-3',
      userName: '王五',
      agentId: 'agent-3',
      agentName: '数据分析师',
      agentType: 'fastgpt',
      startTime: '2024-12-19T09:15:00Z',
      endTime: '2024-12-19T09:45:00Z',
      messageCount: 8,
      status: 'error',
      duration: 30,
      lastMessage: '系统出现错误，无法继续分析',
      category: '数据分析'
    },
    {
      id: 'conv-4',
      userId: 'user-4',
      userName: '赵六',
      agentId: 'agent-4',
      agentName: '语言导师',
      agentType: 'fastgpt',
      startTime: '2024-12-19T16:00:00Z',
      messageCount: 18,
      status: 'active',
      duration: 35,
      lastMessage: 'Could you help me practice English conversation?',
      category: '语言学习'
    },
    {
      id: 'conv-5',
      userId: 'user-5',
      userName: '孙七',
      agentId: 'agent-5',
      agentName: '智能客服',
      agentType: 'custom',
      startTime: '2024-12-19T13:30:00Z',
      endTime: '2024-12-19T13:50:00Z',
      messageCount: 15,
      status: 'completed',
      duration: 20,
      lastMessage: '问题已解决，感谢您的耐心服务',
      category: '客户服务'
    }
  ]);

  // 模拟加载
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // 状态图标和颜色
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          icon: Clock,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          label: '进行中'
        };
      case 'completed':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          label: '已完成'
        };
      case 'error':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          label: '异常'
        };
      default:
        return {
          icon: AlertCircle,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          label: '未知'
        };
    }
  };

  // 过滤对话
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = !searchQuery || 
      conv.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || conv.status === statusFilter;
    const matchesAgentType = agentTypeFilter === 'all' || conv.agentType === agentTypeFilter;
    
    const matchesDateRange = !dateRange.from || !dateRange.to || 
      (new Date(conv.startTime) >= dateRange.from && new Date(conv.startTime) <= dateRange.to);
    
    return matchesSearch && matchesStatus && matchesAgentType && matchesDateRange;
  });

  // 对话卡片组件
  const ConversationCard = ({ conversation }: { conversation: Conversation }) => {
    const statusConfig = getStatusConfig(conversation.status);
    const StatusIcon = statusConfig.icon;

    return (
      <Card className="glass-card hover:shadow-glow transition-all duration-300 hover:scale-105 animate-fade-in">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={conversation.userAvatar} />
                <AvatarFallback>
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">{conversation.userName}</CardTitle>
                <CardDescription className="text-sm flex items-center gap-2">
                  <Bot className="h-3 w-3" />
                  {conversation.agentName}
                  <Badge 
                    variant="outline" 
                    className={conversation.agentType === 'fastgpt' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}
                  >
                    {conversation.agentType === 'fastgpt' ? 'FastGPT' : '自研'}
                  </Badge>
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* 最后消息 */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {conversation.lastMessage}
              </p>
            </div>
            
            {/* 统计信息 */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {conversation.messageCount}
                </div>
                <div className="text-xs text-gray-500">消息数</div>
              </div>
              <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {conversation.duration}分钟
                </div>
                <div className="text-xs text-gray-500">时长</div>
              </div>
              <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <div className="text-xs font-semibold text-gray-900 dark:text-white">
                  {format(new Date(conversation.startTime), 'HH:mm', { locale: zhCN })}
                </div>
                <div className="text-xs text-gray-500">开始时间</div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="outline" className="flex-1 btn-primary">
                <Eye className="h-4 w-4 mr-1" />
                查看详情
              </Button>
              <Button size="sm" variant="outline" className="btn-secondary">
                <Download className="h-4 w-4" />
              </Button>
              {conversation.status === 'error' && (
                <Button size="sm" variant="outline" className="text-error hover:bg-error/10">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 relative">
      <div className="absolute inset-0 particles-bg opacity-10"></div>
      {/* 页面标题 */}
      <div className="mb-6 animate-fade-in relative z-10">
        <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2 flex items-center gap-2">
          <MessageSquare className="h-7 w-7 text-primary animate-pulse" />
          对话管理
        </h1>
        <p className="text-gray-600 dark:text-gray-400 animate-slide-up">
          监控和管理用户与智能体的对话记录
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6 animate-slide-up relative z-10">
        <Card className="glass-card hover:shadow-glow transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">总对话数</p>
                <p className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  {conversations.length}
                </p>
              </div>
              <MessageSquare className="h-8 w-8 text-primary animate-pulse" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card hover:shadow-glow transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">进行中</p>
                <p className="text-2xl font-bold text-primary">
                  {conversations.filter(c => c.status === 'active').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-primary animate-pulse" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card hover:shadow-glow transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">已完成</p>
                <p className="text-2xl font-bold text-success">
                  {conversations.filter(c => c.status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-success animate-pulse" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card hover:shadow-glow transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">异常对话</p>
                <p className="text-2xl font-bold text-error">
                  {conversations.filter(c => c.status === 'error').length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-error animate-pulse" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和过滤栏 */}
      <div className="flex flex-wrap items-center gap-4 mb-6 animate-slide-up relative z-10">
        <div className="relative flex-1 min-w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索用户、智能体或消息内容..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="active">进行中</SelectItem>
            <SelectItem value="completed">已完成</SelectItem>
            <SelectItem value="error">异常</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={agentTypeFilter} onValueChange={setAgentTypeFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            <SelectItem value="fastgpt">FastGPT</SelectItem>
            <SelectItem value="custom">自研</SelectItem>
          </SelectContent>
        </Select>
        
        <Button variant="outline" className="btn-primary">
          <BarChart3 className="h-4 w-4 mr-2" />
          导出报告
        </Button>
      </div>

      {/* 对话列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in relative z-10">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full mb-4" />
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 flex-1" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredConversations.length > 0 ? (
          filteredConversations.map(conversation => (
            <ConversationCard key={conversation.id} conversation={conversation} />
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              暂无对话记录
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              当前筛选条件下没有找到对话记录
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationManagementPage;