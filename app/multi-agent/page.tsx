'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Play,
  Pause,
  Square,
  Settings,
  Eye,
  TrendingUp,
  Users,
  Brain,
  Search,
  FileText,
  BarChart3,
  Zap,
  Shield,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity,
  GitBranch,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LangGraphMultiAgent from '@/components/LangGraphMultiAgent';

interface Agent {
  id: string;
  name: string;
  type: 'research' | 'analysis' | 'planning' | 'execution' | 'monitoring';
  status: 'idle' | 'busy' | 'learning' | 'offline' | 'error';
  workload: number;
  performance: {
    accuracy: number;
    averageResponseTime: number;
    throughput: number;
  };
  currentTask?: string;
}

interface ResearchTask {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  progress: number;
  assignedAgents: string[];
  startTime?: Date;
  estimatedDuration?: number;
  results?: any;
}

interface SystemStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  activeAgents: number;
  activeTasks: number;
  systemLoad: number;
  uptime: number;
}

/**
 * 多智能体控制中心 - 主界面组件
 */
export default function MultiAgentControlCenter() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<ResearchTask[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    overall: 'healthy',
    activeAgents: 0,
    activeTasks: 0,
    systemLoad: 0,
    uptime: 0,
  });
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);

  // 模拟数据初始化
  useEffect(() => {
    const mockAgents: Agent[] = [
      {
        id: 'research-1',
        name: '研究智能体 Alpha',
        type: 'research',
        status: 'idle',
        workload: 2,
        performance: { accuracy: 0.89, averageResponseTime: 2300, throughput: 12 },
        currentTask: undefined,
      },
      {
        id: 'analysis-1',
        name: '分析智能体 Beta',
        type: 'analysis',
        status: 'busy',
        workload: 3,
        performance: { accuracy: 0.94, averageResponseTime: 3100, throughput: 8 },
        currentTask: '数据分析任务',
      },
      {
        id: 'planning-1',
        name: '规划智能体 Gamma',
        type: 'planning',
        status: 'idle',
        workload: 1,
        performance: { accuracy: 0.91, averageResponseTime: 1800, throughput: 15 },
        currentTask: undefined,
      },
      {
        id: 'execution-1',
        name: '执行智能体 Delta',
        type: 'execution',
        status: 'learning',
        workload: 2,
        performance: { accuracy: 0.87, averageResponseTime: 2800, throughput: 10 },
        currentTask: '自主学习中',
      },
      {
        id: 'monitoring-1',
        name: '监控智能体 Epsilon',
        type: 'monitoring',
        status: 'busy',
        workload: 4,
        performance: { accuracy: 0.96, averageResponseTime: 1200, throughput: 20 },
        currentTask: '系统监控',
      },
    ];

    const mockTasks: ResearchTask[] = [
      {
        id: 'task-1',
        title: '人工智能发展趋势分析',
        description: '分析2024-2025年人工智能技术发展趋势，包括大模型、多模态AI、边缘计算等方向',
        status: 'executing',
        progress: 65,
        assignedAgents: ['research-1', 'analysis-1'],
        startTime: new Date(Date.now() - 30 * 60 * 1000),
        estimatedDuration: 60 * 60 * 1000,
      },
      {
        id: 'task-2',
        title: '竞品分析报告',
        description: '对主要竞争对手的产品功能、市场定位、技术架构进行全面分析',
        status: 'completed',
        progress: 100,
        assignedAgents: ['research-1', 'analysis-1', 'planning-1'],
        startTime: new Date(Date.now() - 120 * 60 * 1000),
        estimatedDuration: 90 * 60 * 1000,
        results: {
          insights: 15,
          recommendations: 8,
          confidence: 0.92,
        },
      },
      {
        id: 'task-3',
        title: '技术风险评估',
        description: '评估新技术栈的潜在风险和缓解策略',
        status: 'pending',
        progress: 0,
        assignedAgents: [],
        estimatedDuration: 45 * 60 * 1000,
      },
    ];

    setAgents(mockAgents);
    setTasks(mockTasks);
    setSystemStatus({
      overall: 'healthy',
      activeAgents: mockAgents.filter(a => a.status !== 'offline').length,
      activeTasks: mockTasks.filter(t => t.status === 'executing').length,
      systemLoad: 35,
      uptime: 24 * 60 * 60 * 1000,
    });
  }, []);

  // 定期更新系统状态
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemStatus(prev => ({
        ...prev,
        uptime: prev.uptime + 1000,
        systemLoad: Math.max(0, Math.min(100, prev.systemLoad + (Math.random() - 0.5) * 10)),
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // 创建新任务
  const handleCreateTask = useCallback(async () => {
    if (!newTaskTitle.trim() || !newTaskDescription.trim()) return;

    setIsLoading(true);

    try {
      const newTask: ResearchTask = {
        id: `task-${Date.now()}`,
        title: newTaskTitle,
        description: newTaskDescription,
        status: 'pending',
        progress: 0,
        assignedAgents: [],
        estimatedDuration: 60 * 60 * 1000,
      };

      setTasks(prev => [...prev, newTask]);
      setNewTaskTitle('');
      setNewTaskDescription('');

      // 模拟任务分配和执行
      setTimeout(() => {
        const availableAgents = agents.filter(a => a.status === 'idle').slice(0, 2);
        const assignedAgentIds = availableAgents.map(a => a.id);

        setTasks(prev =>
          prev.map(task =>
            task.id === newTask.id
              ? {
                  ...task,
                  status: 'executing',
                  assignedAgents: assignedAgentIds,
                  startTime: new Date(),
                }
              : task
          )
        );

        setAgents(prev =>
          prev.map(agent =>
            assignedAgentIds.includes(agent.id)
              ? {
                  ...agent,
                  status: 'busy',
                  workload: agent.workload + 1,
                  currentTask: newTask.title,
                }
              : agent
          )
        );
      }, 1000);
    } catch (error) {
      } finally {
      setIsLoading(false);
    }
  }, [newTaskTitle, newTaskDescription, agents]);

  // 停止任务
  const handleStopTask = useCallback((taskId: string) => {
    setTasks(prev =>
      prev.map(task =>
        task.id === taskId
          ? { ...task, status: 'failed', progress: Math.min(task.progress, 100) }
          : task
      )
    );
  }, []);

  // 智能体状态颜色
  const getAgentStatusColor = (status: Agent['status']) => {
    const colors = {
      idle: 'bg-green-100 text-green-800',
      busy: 'bg-blue-100 text-blue-800',
      learning: 'bg-purple-100 text-purple-800',
      offline: 'bg-gray-100 text-gray-800',
      error: 'bg-red-100 text-red-800',
    };
    return colors[status];
  };

  // 任务状态颜色
  const getTaskStatusColor = (status: ResearchTask['status']) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      executing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };
    return colors[status];
  };

  // 智能体类型图标
  const getAgentTypeIcon = (type: Agent['type']) => {
    const icons = {
      research: <Search className='w-4 h-4' />,
      analysis: <BarChart3 className='w-4 h-4' />,
      planning: <FileText className='w-4 h-4' />,
      execution: <Zap className='w-4 h-4' />,
      monitoring: <Shield className='w-4 h-4' />,
    };
    return icons[type];
  };

  // 系统整体健康状态
  const getSystemHealthIcon = () => {
    switch (systemStatus.overall) {
      case 'healthy':
        return <CheckCircle className='w-5 h-5 text-green-500' />;
      case 'degraded':
        return <AlertCircle className='w-5 h-5 text-yellow-500' />;
      case 'unhealthy':
        return <AlertCircle className='w-5 h-5 text-red-500' />;
      default:
        return <Activity className='w-5 h-5 text-gray-500' />;
    }
  };

  // 格式化时间
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}天${hours % 24}小时`;
    if (hours > 0) return `${hours}小时${minutes % 60}分钟`;
    return `${minutes}分钟`;
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6'>
      <div className='max-w-7xl mx-auto space-y-6'>
        {/* 页面标题 */}
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold text-slate-900'>多智能体控制中心</h1>
            <p className='text-slate-600 mt-2'>智能体协作 • 自主学习 • 深度研究</p>
          </div>
          <div className='flex items-center space-x-2'>
            {getSystemHealthIcon()}
            <span className='text-sm font-medium text-slate-700'>
              系统状态:{' '}
              {systemStatus.overall === 'healthy'
                ? '正常'
                : systemStatus.overall === 'degraded'
                  ? '降级'
                  : '异常'}
            </span>
          </div>
        </div>

        {/* 系统概览卡片 */}
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
          <Card className='bg-white/70 backdrop-blur-sm border-slate-200'>
            <CardContent className='p-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm text-slate-600'>活跃智能体</p>
                  <p className='text-2xl font-bold text-slate-900'>{systemStatus.activeAgents}</p>
                </div>
                <Users className='w-8 h-8 text-blue-500' />
              </div>
            </CardContent>
          </Card>

          <Card className='bg-white/70 backdrop-blur-sm border-slate-200'>
            <CardContent className='p-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm text-slate-600'>运行任务</p>
                  <p className='text-2xl font-bold text-slate-900'>{systemStatus.activeTasks}</p>
                </div>
                <Activity className='w-8 h-8 text-green-500' />
              </div>
            </CardContent>
          </Card>

          <Card className='bg-white/70 backdrop-blur-sm border-slate-200'>
            <CardContent className='p-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm text-slate-600'>系统负载</p>
                  <p className='text-2xl font-bold text-slate-900'>{systemStatus.systemLoad}%</p>
                </div>
                <TrendingUp className='w-8 h-8 text-orange-500' />
              </div>
            </CardContent>
          </Card>

          <Card className='bg-white/70 backdrop-blur-sm border-slate-200'>
            <CardContent className='p-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm text-slate-600'>运行时间</p>
                  <p className='text-2xl font-bold text-slate-900'>
                    {formatDuration(systemStatus.uptime)}
                  </p>
                </div>
                <Clock className='w-8 h-8 text-purple-500' />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 主要内容标签页 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
          <TabsList className='grid w-full grid-cols-6 bg-white/50 backdrop-blur-sm'>
            <TabsTrigger value='overview'>概览</TabsTrigger>
            <TabsTrigger value='agents'>智能体</TabsTrigger>
            <TabsTrigger value='tasks'>任务管理</TabsTrigger>
            <TabsTrigger value='research'>深度研究</TabsTrigger>
            <TabsTrigger value='learning'>学习中心</TabsTrigger>
            <TabsTrigger value='langgraph' className='flex items-center space-x-1'>
              <GitBranch className='w-4 h-4' />
              <span>LangGraph</span>
            </TabsTrigger>
          </TabsList>

          {/* 概览标签页 */}
          <TabsContent value='overview' className='space-y-4'>
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
              {/* 智能体状态概览 */}
              <Card className='bg-white/70 backdrop-blur-sm border-slate-200'>
                <CardHeader>
                  <CardTitle className='flex items-center space-x-2'>
                    <Users className='w-5 h-5' />
                    <span>智能体状态</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='space-y-3'>
                    {agents.map(agent => (
                      <motion.div
                        key={agent.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className='flex items-center justify-between p-3 bg-white/50 rounded-lg'
                      >
                        <div className='flex items-center space-x-3'>
                          <div className='p-2 bg-blue-100 rounded-lg'>
                            {getAgentTypeIcon(agent.type)}
                          </div>
                          <div>
                            <p className='font-medium text-slate-900'>{agent.name}</p>
                            <p className='text-sm text-slate-600'>
                              {agent.currentTask || '待命中'}
                            </p>
                          </div>
                        </div>
                        <div className='flex items-center space-x-2'>
                          <Badge className={getAgentStatusColor(agent.status)}>
                            {agent.status === 'idle'
                              ? '空闲'
                              : agent.status === 'busy'
                                ? '忙碌'
                                : agent.status === 'learning'
                                  ? '学习'
                                  : agent.status === 'offline'
                                    ? '离线'
                                    : '错误'}
                          </Badge>
                          <span className='text-sm text-slate-500'>负载: {agent.workload}/5</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 任务状态概览 */}
              <Card className='bg-white/70 backdrop-blur-sm border-slate-200'>
                <CardHeader>
                  <CardTitle className='flex items-center space-x-2'>
                    <Activity className='w-5 h-5' />
                    <span>任务状态</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='space-y-3'>
                    {tasks.map(task => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className='p-3 bg-white/50 rounded-lg'
                      >
                        <div className='flex items-center justify-between mb-2'>
                          <p className='font-medium text-slate-900 truncate'>{task.title}</p>
                          <Badge className={getTaskStatusColor(task.status)}>
                            {task.status === 'pending'
                              ? '等待'
                              : task.status === 'executing'
                                ? '执行中'
                                : task.status === 'completed'
                                  ? '完成'
                                  : '失败'}
                          </Badge>
                        </div>
                        <div className='flex items-center space-x-2'>
                          <Progress value={task.progress} className='flex-1' />
                          <span className='text-sm text-slate-500'>{task.progress}%</span>
                        </div>
                        <p className='text-sm text-slate-600 mt-1'>
                          智能体:{' '}
                          {task.assignedAgents.length > 0 ? task.assignedAgents.length : '未分配'}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 系统监控 */}
            <Card className='bg-white/70 backdrop-blur-sm border-slate-200'>
              <CardHeader>
                <CardTitle className='flex items-center space-x-2'>
                  <BarChart3 className='w-5 h-5' />
                  <span>系统监控</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                  <div className='space-y-2'>
                    <div className='flex items-center justify-between'>
                      <span className='text-sm text-slate-600'>CPU使用率</span>
                      <span className='text-sm font-medium'>{systemStatus.systemLoad}%</span>
                    </div>
                    <Progress value={systemStatus.systemLoad} className='h-2' />
                  </div>
                  <div className='space-y-2'>
                    <div className='flex items-center justify-between'>
                      <span className='text-sm text-slate-600'>内存使用率</span>
                      <span className='text-sm font-medium'>42%</span>
                    </div>
                    <Progress value={42} className='h-2' />
                  </div>
                  <div className='space-y-2'>
                    <div className='flex items-center justify-between'>
                      <span className='text-sm text-slate-600'>网络吞吐</span>
                      <span className='text-sm font-medium'>28%</span>
                    </div>
                    <Progress value={28} className='h-2' />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 智能体标签页 */}
          <TabsContent value='agents' className='space-y-4'>
            <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4'>
              {agents.map(agent => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card
                    className={`bg-white/70 backdrop-blur-sm border-slate-200 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                      selectedAgent?.id === agent.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setSelectedAgent(agent)}
                  >
                    <CardHeader className='pb-3'>
                      <div className='flex items-center justify-between'>
                        <CardTitle className='text-lg'>{agent.name}</CardTitle>
                        <Badge className={getAgentStatusColor(agent.status)}>
                          {agent.status === 'idle'
                            ? '空闲'
                            : agent.status === 'busy'
                              ? '忙碌'
                              : agent.status === 'learning'
                                ? '学习'
                                : agent.status === 'offline'
                                  ? '离线'
                                  : '错误'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className='space-y-3'>
                        <div className='flex items-center space-x-2'>
                          {getAgentTypeIcon(agent.type)}
                          <span className='text-sm text-slate-600 capitalize'>{agent.type}</span>
                        </div>

                        <div className='space-y-2'>
                          <div className='flex items-center justify-between'>
                            <span className='text-sm text-slate-600'>准确率</span>
                            <span className='text-sm font-medium'>
                              {(agent.performance.accuracy * 100).toFixed(1)}%
                            </span>
                          </div>
                          <Progress value={agent.performance.accuracy * 100} className='h-2' />
                        </div>

                        <div className='space-y-2'>
                          <div className='flex items-center justify-between'>
                            <span className='text-sm text-slate-600'>工作负载</span>
                            <span className='text-sm font-medium'>{agent.workload}/5</span>
                          </div>
                          <Progress value={(agent.workload / 5) * 100} className='h-2' />
                        </div>

                        <div className='text-sm text-slate-600'>
                          <p>响应时间: {agent.performance.averageResponseTime}ms</p>
                          <p>吞吐量: {agent.performance.throughput}/min</p>
                        </div>

                        {agent.currentTask && (
                          <div className='p-2 bg-blue-50 rounded-lg'>
                            <p className='text-sm text-blue-700'>当前任务: {agent.currentTask}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* 智能体详情面板 */}
            <AnimatePresence>
              {selectedAgent && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className='bg-white/70 backdrop-blur-sm border-slate-200'>
                    <CardHeader>
                      <CardTitle className='flex items-center justify-between'>
                        <span>{selectedAgent.name} - 详细信息</span>
                        <Button variant='outline' size='sm' onClick={() => setSelectedAgent(null)}>
                          关闭
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                        <div>
                          <h4 className='font-medium mb-3'>性能指标</h4>
                          <div className='space-y-3'>
                            <div className='flex items-center justify-between'>
                              <span className='text-sm text-slate-600'>准确率</span>
                              <span className='text-sm font-medium'>
                                {(selectedAgent.performance.accuracy * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className='flex items-center justify-between'>
                              <span className='text-sm text-slate-600'>平均响应时间</span>
                              <span className='text-sm font-medium'>
                                {selectedAgent.performance.averageResponseTime}ms
                              </span>
                            </div>
                            <div className='flex items-center justify-between'>
                              <span className='text-sm text-slate-600'>处理吞吐量</span>
                              <span className='text-sm font-medium'>
                                {selectedAgent.performance.throughput}/min
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className='font-medium mb-3'>配置选项</h4>
                          <div className='space-y-2'>
                            <Button variant='outline' size='sm' className='w-full'>
                              <Settings className='w-4 h-4 mr-2' />
                              配置参数
                            </Button>
                            <Button variant='outline' size='sm' className='w-full'>
                              <Brain className='w-4 h-4 mr-2' />
                              学习设置
                            </Button>
                            <Button variant='outline' size='sm' className='w-full'>
                              <Eye className='w-4 h-4 mr-2' />
                              监控日志
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          {/* 任务管理标签页 */}
          <TabsContent value='tasks' className='space-y-4'>
            {/* 创建新任务 */}
            <Card className='bg-white/70 backdrop-blur-sm border-slate-200'>
              <CardHeader>
                <CardTitle>创建新任务</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  <div>
                    <label className='block text-sm font-medium text-slate-700 mb-2'>
                      任务标题
                    </label>
                    <Input
                      placeholder='输入任务标题...'
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-slate-700 mb-2'>
                      任务描述
                    </label>
                    <Textarea
                      placeholder='详细描述任务要求、目标和期望结果...'
                      value={newTaskDescription}
                      onChange={e => setNewTaskDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <Button
                    onClick={handleCreateTask}
                    disabled={!newTaskTitle.trim() || !newTaskDescription.trim() || isLoading}
                    className='w-full'
                  >
                    {isLoading ? (
                      <div className='flex items-center space-x-2'>
                        <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                        <span>创建中...</span>
                      </div>
                    ) : (
                      <div className='flex items-center space-x-2'>
                        <Play className='w-4 h-4' />
                        <span>创建任务</span>
                      </div>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 任务列表 */}
            <div className='space-y-4'>
              {tasks.map(task => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className='bg-white/70 backdrop-blur-sm border-slate-200'>
                    <CardHeader>
                      <div className='flex items-center justify-between'>
                        <CardTitle className='text-lg'>{task.title}</CardTitle>
                        <div className='flex items-center space-x-2'>
                          <Badge className={getTaskStatusColor(task.status)}>
                            {task.status === 'pending'
                              ? '等待'
                              : task.status === 'executing'
                                ? '执行中'
                                : task.status === 'completed'
                                  ? '完成'
                                  : '失败'}
                          </Badge>
                          {task.status === 'executing' && (
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => handleStopTask(task.id)}
                            >
                              <Square className='w-4 h-4' />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className='space-y-4'>
                        <p className='text-slate-600'>{task.description}</p>

                        <div className='space-y-2'>
                          <div className='flex items-center justify-between'>
                            <span className='text-sm text-slate-600'>进度</span>
                            <span className='text-sm font-medium'>{task.progress}%</span>
                          </div>
                          <Progress value={task.progress} className='h-2' />
                        </div>

                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                          <div>
                            <p className='text-sm text-slate-600'>分配智能体</p>
                            <div className='flex flex-wrap gap-1 mt-1'>
                              {task.assignedAgents.map(agentId => {
                                const agent = agents.find(a => a.id === agentId);
                                return agent ? (
                                  <Badge key={agentId} variant='secondary' className='text-xs'>
                                    {agent.name}
                                  </Badge>
                                ) : null;
                              })}
                              {task.assignedAgents.length === 0 && (
                                <span className='text-sm text-slate-500'>未分配</span>
                              )}
                            </div>
                          </div>

                          <div>
                            <p className='text-sm text-slate-600'>时间信息</p>
                            <div className='text-sm text-slate-500 mt-1'>
                              {task.startTime && (
                                <p>开始时间: {task.startTime.toLocaleTimeString()}</p>
                              )}
                              {task.estimatedDuration && (
                                <p>预计用时: {formatDuration(task.estimatedDuration)}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {task.results && (
                          <div className='p-3 bg-green-50 rounded-lg'>
                            <p className='text-sm font-medium text-green-800 mb-1'>任务结果</p>
                            <div className='text-sm text-green-700'>
                              <p>发现洞察: {task.results.insights}个</p>
                              <p>生成建议: {task.results.recommendations}个</p>
                              <p>可信度: {(task.results.confidence * 100).toFixed(1)}%</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* 深度研究标签页 */}
          <TabsContent value='research' className='space-y-4'>
            <Card className='bg-white/70 backdrop-blur-sm border-slate-200'>
              <CardHeader>
                <CardTitle className='flex items-center space-x-2'>
                  <Search className='w-5 h-5' />
                  <span>深度研究工作台</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-center py-8'>
                  <Search className='w-12 h-12 text-slate-400 mx-auto mb-4' />
                  <p className='text-slate-600 mb-4'>深度研究功能正在开发中...</p>
                  <p className='text-sm text-slate-500'>
                    集成Google DeepResearch技术，提供全面的信息检索、分析和综合能力
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 学习中心标签页 */}
          <TabsContent value='learning' className='space-y-4'>
            <Card className='bg-white/70 backdrop-blur-sm border-slate-200'>
              <CardHeader>
                <CardTitle className='flex items-center space-x-2'>
                  <Brain className='w-5 h-5' />
                  <span>自主学习中心</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-center py-8'>
                  <Brain className='w-12 h-12 text-slate-400 mx-auto mb-4' />
                  <p className='text-slate-600 mb-4'>学习中心功能正在开发中...</p>
                  <p className='text-sm text-slate-500'>
                    提供智能体学习进度监控、学习策略配置和知识库管理功能
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* LangGraph多智能体标签页 */}
          <TabsContent value='langgraph'>
            <LangGraphMultiAgent />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
