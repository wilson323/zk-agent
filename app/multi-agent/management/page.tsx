/**
 * Multi-Agent Management Page
 * 多智能体系统管理页面
 *
 * 功能:
 * - 智能体团队列表展示
 * - 创建新团队
 * - 团队状态管理
 * - 工作流执行历史
 * - 模板快速创建
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import {
  Plus,
  Users,
  Play,
  Clock,
  CheckCircle,
  XCircle,
  Settings,
  Trash2,
  Eye,
  Zap,
  Brain,
  BarChart3,
  PenTool,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// ==================== 类型定义 ====================

interface AgentTeam {
  id: string;
  name: string;
  description?: string;
  projectType: string;
  workflowId: string;
  ownerId: string;
  status: 'active' | 'inactive' | 'archived';
  createdAt: string;
  updatedAt: string;
  metrics?: {
    totalExecutions: number;
    successRate: number;
    averageExecutionTime: number;
    totalTokenUsage: number;
  };
}

interface WorkflowExecution {
  id: string;
  teamId: string;
  task: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout';
  priority: 'low' | 'normal' | 'high';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

interface Template {
  name: string;
  description: string;
  agents: Array<{ role: string; template: string }>;
  workflowType: string;
  estimatedTime: string;
  useCase: string;
}

// ==================== 主组件 ====================

export default function MultiAgentManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // 状态管理
  const [teams, setTeams] = useState<AgentTeam[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [templates, setTemplates] = useState<Record<string, Template>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('teams');

  // 对话框状态
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [executeWorkflowOpen, setExecuteWorkflowOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<AgentTeam | null>(null);

  // 表单状态
  const [newTeamForm, setNewTeamForm] = useState({
    name: '',
    description: '',
    projectType: 'software_development',
    workflowType: 'sequential',
  });

  const [executeForm, setExecuteForm] = useState({
    teamId: '',
    task: '',
    priority: 'normal',
  });

  const [templateForm, setTemplateForm] = useState({
    templateType: '',
    projectName: '',
    researchTopic: '',
  });

  // ==================== 副作用 ====================

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    loadData();
  }, [status, router]);

  // ==================== 数据加载 ====================

  const loadData = async () => {
    try {
      setLoading(true);

      const [teamsRes, executionsRes, templatesRes] = await Promise.all([
        fetch('/api/multi-agent/teams'),
        fetch('/api/multi-agent/execute'),
        fetch('/api/multi-agent/templates'),
      ]);

      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        setTeams(teamsData.data.teams || []);
      }

      if (executionsRes.ok) {
        const executionsData = await executionsRes.json();
        setExecutions(executionsData.data.executions || []);
      }

      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        setTemplates(templatesData.data.templates || {});
      }
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法加载多智能体数据，请刷新页面重试',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // ==================== 事件处理 ====================

  const handleCreateTeam = async () => {
    try {
      const response = await fetch('/api/multi-agent/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTeamForm,
          agents: [
            {
              name: `${newTeamForm.name}-智能体1`,
              role: '主要智能体',
              modelName: 'gpt-4o-mini',
            },
          ],
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setTeams(prev => [result.data, ...prev]);
        setCreateTeamOpen(false);
        setNewTeamForm({
          name: '',
          description: '',
          projectType: 'software_development',
          workflowType: 'sequential',
        });

        toast({
          title: '创建成功',
          description: '智能体团队已成功创建',
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || '创建失败');
      }
    } catch (error) {
      toast({
        title: '创建失败',
        description: error.message || '创建智能体团队时发生错误',
        variant: 'destructive',
      });
    }
  };

  const handleExecuteWorkflow = async () => {
    try {
      const response = await fetch('/api/multi-agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(executeForm),
      });

      if (response.ok) {
        const result = await response.json();
        setExecuteWorkflowOpen(false);
        setExecuteForm({
          teamId: '',
          task: '',
          priority: 'normal',
        });

        toast({
          title: '执行开始',
          description: `工作流已开始执行，执行ID: ${result.data.executionId}`,
        });

        // 刷新执行历史
        loadData();
      } else {
        const error = await response.json();
        throw new Error(error.error || '执行失败');
      }
    } catch (error) {
      toast({
        title: '执行失败',
        description: error.message || '执行工作流时发生错误',
        variant: 'destructive',
      });
    }
  };

  const handleCreateFromTemplate = async () => {
    try {
      const response = await fetch('/api/multi-agent/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateForm),
      });

      if (response.ok) {
        const result = await response.json();
        setTeams(prev => [result.data.team, ...prev]);
        setTemplateDialogOpen(false);
        setTemplateForm({
          templateType: '',
          projectName: '',
          researchTopic: '',
        });

        toast({
          title: '创建成功',
          description: `${result.data.template.name}已成功创建`,
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || '创建失败');
      }
    } catch (error) {
      toast({
        title: '创建失败',
        description: error.message || '从模板创建团队时发生错误',
        variant: 'destructive',
      });
    }
  };

  // ==================== 渲染辅助函数 ====================

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-500', text: '活跃' },
      inactive: { color: 'bg-gray-500', text: '未激活' },
      archived: { color: 'bg-red-500', text: '已归档' },
      pending: { color: 'bg-yellow-500', text: '等待中' },
      running: { color: 'bg-blue-500', text: '运行中' },
      completed: { color: 'bg-green-500', text: '已完成' },
      failed: { color: 'bg-red-500', text: '失败' },
      timeout: { color: 'bg-orange-500', text: '超时' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      color: 'bg-gray-500',
      text: status,
    };

    return <Badge className={`${config.color} text-white`}>{config.text}</Badge>;
  };

  const getTemplateIcon = (templateType: string) => {
    const icons = {
      'software-dev': <Zap className='h-5 w-5' />,
      'zk-research': <Brain className='h-5 w-5' />,
      'data-analysis': <BarChart3 className='h-5 w-5' />,
      'content-creation': <PenTool className='h-5 w-5' />,
    };

    return icons[templateType as keyof typeof icons] || <Users className='h-5 w-5' />;
  };

  // ==================== 渲染 ====================

  if (status === 'loading' || loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <LoadingSpinner size='lg' />
      </div>
    );
  }

  return (
    <div className='container mx-auto px-4 py-8'>
      {/* 页面标题 */}
      <div className='flex items-center justify-between mb-8'>
        <div>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>多智能体团队管理</h1>
          <p className='text-gray-600 dark:text-gray-400 mt-2'>
            管理和编排您的智能体团队，执行复杂的协作任务
          </p>
        </div>

        <div className='flex gap-3'>
          <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant='outline' className='flex items-center gap-2'>
                <Zap className='h-4 w-4' />
                快速创建
              </Button>
            </DialogTrigger>
            <DialogContent className='max-w-2xl'>
              <DialogHeader>
                <DialogTitle>从模板创建团队</DialogTitle>
                <DialogDescription>选择预定义的模板快速创建专业的智能体团队</DialogDescription>
              </DialogHeader>

              <div className='space-y-6'>
                <div>
                  <Label htmlFor='templateType'>模板类型</Label>
                  <Select
                    value={templateForm.templateType}
                    onValueChange={value =>
                      setTemplateForm(prev => ({ ...prev, templateType: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='选择模板类型' />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(templates).map(([key, template]) => (
                        <SelectItem key={key} value={key}>
                          <div className='flex items-center gap-2'>
                            {getTemplateIcon(key)}
                            <span>{template.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {templateForm.templateType && (
                  <div className='p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'>
                    <h4 className='font-medium mb-2'>
                      {templates[templateForm.templateType]?.name}
                    </h4>
                    <p className='text-sm text-gray-600 dark:text-gray-400 mb-3'>
                      {templates[templateForm.templateType]?.description}
                    </p>
                    <div className='text-xs text-gray-500'>
                      <p>预计执行时间: {templates[templateForm.templateType]?.estimatedTime}</p>
                      <p>适用场景: {templates[templateForm.templateType]?.useCase}</p>
                    </div>
                  </div>
                )}

                {templateForm.templateType === 'software-dev' && (
                  <div>
                    <Label htmlFor='projectName'>项目名称</Label>
                    <Input
                      id='projectName'
                      value={templateForm.projectName}
                      onChange={e =>
                        setTemplateForm(prev => ({ ...prev, projectName: e.target.value }))
                      }
                      placeholder='输入项目名称'
                    />
                  </div>
                )}

                {templateForm.templateType === 'zk-research' && (
                  <div>
                    <Label htmlFor='researchTopic'>研究主题</Label>
                    <Input
                      id='researchTopic'
                      value={templateForm.researchTopic}
                      onChange={e =>
                        setTemplateForm(prev => ({ ...prev, researchTopic: e.target.value }))
                      }
                      placeholder='输入研究主题'
                    />
                  </div>
                )}

                <div className='flex justify-end gap-3'>
                  <Button variant='outline' onClick={() => setTemplateDialogOpen(false)}>
                    取消
                  </Button>
                  <Button
                    onClick={handleCreateFromTemplate}
                    disabled={
                      !templateForm.templateType ||
                      (templateForm.templateType === 'software-dev' && !templateForm.projectName) ||
                      (templateForm.templateType === 'zk-research' && !templateForm.researchTopic)
                    }
                  >
                    创建团队
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={createTeamOpen} onOpenChange={setCreateTeamOpen}>
            <DialogTrigger asChild>
              <Button className='flex items-center gap-2'>
                <Plus className='h-4 w-4' />
                创建团队
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>创建智能体团队</DialogTitle>
                <DialogDescription>创建一个新的智能体团队来执行协作任务</DialogDescription>
              </DialogHeader>

              <div className='space-y-4'>
                <div>
                  <Label htmlFor='name'>团队名称</Label>
                  <Input
                    id='name'
                    value={newTeamForm.name}
                    onChange={e => setNewTeamForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder='输入团队名称'
                  />
                </div>

                <div>
                  <Label htmlFor='description'>团队描述</Label>
                  <Textarea
                    id='description'
                    value={newTeamForm.description}
                    onChange={e =>
                      setNewTeamForm(prev => ({ ...prev, description: e.target.value }))
                    }
                    placeholder='描述团队的用途和目标'
                  />
                </div>

                <div>
                  <Label htmlFor='projectType'>项目类型</Label>
                  <Select
                    value={newTeamForm.projectType}
                    onValueChange={value =>
                      setNewTeamForm(prev => ({ ...prev, projectType: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='software_development'>软件开发</SelectItem>
                      <SelectItem value='research'>研究分析</SelectItem>
                      <SelectItem value='analysis'>数据分析</SelectItem>
                      <SelectItem value='custom'>自定义</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor='workflowType'>工作流类型</Label>
                  <Select
                    value={newTeamForm.workflowType}
                    onValueChange={value =>
                      setNewTeamForm(prev => ({ ...prev, workflowType: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='sequential'>顺序执行</SelectItem>
                      <SelectItem value='parallel'>并行执行</SelectItem>
                      <SelectItem value='hierarchical'>分层执行</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className='flex justify-end gap-3'>
                  <Button variant='outline' onClick={() => setCreateTeamOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={handleCreateTeam} disabled={!newTeamForm.name}>
                    创建
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 主要内容 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className='space-y-6'>
        <TabsList className='grid w-full grid-cols-3'>
          <TabsTrigger value='teams' className='flex items-center gap-2'>
            <Users className='h-4 w-4' />
            智能体团队
          </TabsTrigger>
          <TabsTrigger value='executions' className='flex items-center gap-2'>
            <Play className='h-4 w-4' />
            执行历史
          </TabsTrigger>
          <TabsTrigger value='templates' className='flex items-center gap-2'>
            <Zap className='h-4 w-4' />
            模板库
          </TabsTrigger>
        </TabsList>

        {/* 智能体团队标签页 */}
        <TabsContent value='teams' className='space-y-6'>
          {teams.length === 0 ? (
            <Card>
              <CardContent className='flex flex-col items-center justify-center py-12'>
                <Users className='h-12 w-12 text-gray-400 mb-4' />
                <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-2'>
                  还没有智能体团队
                </h3>
                <p className='text-gray-600 dark:text-gray-400 text-center mb-6'>
                  创建您的第一个智能体团队来开始协作任务
                </p>
                <Button onClick={() => setCreateTeamOpen(true)}>
                  <Plus className='h-4 w-4 mr-2' />
                  创建团队
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {teams.map(team => (
                <Card key={team.id} className='hover:shadow-lg transition-shadow'>
                  <CardHeader>
                    <div className='flex items-start justify-between'>
                      <div>
                        <CardTitle className='text-lg'>{team.name}</CardTitle>
                        <CardDescription className='mt-1'>
                          {team.description || '暂无描述'}
                        </CardDescription>
                      </div>
                      {getStatusBadge(team.status)}
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className='space-y-3'>
                      <div className='flex items-center justify-between text-sm'>
                        <span className='text-gray-600 dark:text-gray-400'>项目类型</span>
                        <span className='font-medium'>{team.projectType}</span>
                      </div>

                      {team.metrics && (
                        <div className='grid grid-cols-2 gap-3 text-sm'>
                          <div>
                            <span className='text-gray-600 dark:text-gray-400'>执行次数</span>
                            <p className='font-medium'>{team.metrics.totalExecutions}</p>
                          </div>
                          <div>
                            <span className='text-gray-600 dark:text-gray-400'>成功率</span>
                            <p className='font-medium'>
                              {(team.metrics.successRate * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      )}

                      <div className='flex gap-2 pt-3'>
                        <Button
                          size='sm'
                          variant='outline'
                          className='flex-1'
                          onClick={() => {
                            setSelectedTeam(team);
                            setExecuteForm(prev => ({ ...prev, teamId: team.id }));
                            setExecuteWorkflowOpen(true);
                          }}
                          disabled={team.status !== 'active'}
                        >
                          <Play className='h-3 w-3 mr-1' />
                          执行
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => router.push(`/multi-agent/teams/${team.id}`)}
                        >
                          <Eye className='h-3 w-3' />
                        </Button>
                        <Button size='sm' variant='outline'>
                          <Settings className='h-3 w-3' />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 执行历史标签页 */}
        <TabsContent value='executions' className='space-y-6'>
          {executions.length === 0 ? (
            <Card>
              <CardContent className='flex flex-col items-center justify-center py-12'>
                <Clock className='h-12 w-12 text-gray-400 mb-4' />
                <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-2'>
                  还没有执行记录
                </h3>
                <p className='text-gray-600 dark:text-gray-400 text-center'>
                  执行智能体团队任务后，记录将显示在这里
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className='space-y-4'>
              {executions.map(execution => (
                <Card key={execution.id}>
                  <CardContent className='p-6'>
                    <div className='flex items-start justify-between'>
                      <div className='flex-1'>
                        <div className='flex items-center gap-3 mb-2'>
                          <h4 className='font-medium'>{execution.task}</h4>
                          {getStatusBadge(execution.status)}
                          <Badge variant='outline'>{execution.priority}</Badge>
                        </div>
                        <p className='text-sm text-gray-600 dark:text-gray-400 mb-3'>
                          团队ID: {execution.teamId}
                        </p>
                        <div className='flex items-center gap-4 text-xs text-gray-500'>
                          <span>创建: {new Date(execution.createdAt).toLocaleString()}</span>
                          {execution.startedAt && (
                            <span>开始: {new Date(execution.startedAt).toLocaleString()}</span>
                          )}
                          {execution.completedAt && (
                            <span>完成: {new Date(execution.completedAt).toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => router.push(`/multi-agent/executions/${execution.id}`)}
                      >
                        查看详情
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 模板库标签页 */}
        <TabsContent value='templates' className='space-y-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {Object.entries(templates).map(([key, template]) => (
              <Card key={key} className='hover:shadow-lg transition-shadow'>
                <CardHeader>
                  <div className='flex items-start gap-3'>
                    <div className='p-2 bg-blue-100 dark:bg-blue-900 rounded-lg'>
                      {getTemplateIcon(key)}
                    </div>
                    <div>
                      <CardTitle className='text-lg'>{template.name}</CardTitle>
                      <CardDescription className='mt-1'>{template.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className='space-y-3'>
                    <div>
                      <h5 className='text-sm font-medium mb-2'>包含智能体:</h5>
                      <div className='flex flex-wrap gap-1'>
                        {template.agents.map((agent, index) => (
                          <Badge key={index} variant='secondary' className='text-xs'>
                            {agent.role}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className='text-sm text-gray-600 dark:text-gray-400'>
                      <p>工作流类型: {template.workflowType}</p>
                      <p>预计时间: {template.estimatedTime}</p>
                    </div>

                    <div className='pt-3'>
                      <Button
                        className='w-full'
                        onClick={() => {
                          setTemplateForm(prev => ({ ...prev, templateType: key }));
                          setTemplateDialogOpen(true);
                        }}
                      >
                        使用此模板
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* 执行工作流对话框 */}
      <Dialog open={executeWorkflowOpen} onOpenChange={setExecuteWorkflowOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>执行工作流</DialogTitle>
            <DialogDescription>为选定的智能体团队分配任务并开始执行</DialogDescription>
          </DialogHeader>

          <div className='space-y-4'>
            {selectedTeam && (
              <div className='p-3 bg-gray-50 dark:bg-gray-800 rounded-lg'>
                <h4 className='font-medium'>{selectedTeam.name}</h4>
                <p className='text-sm text-gray-600 dark:text-gray-400'>
                  {selectedTeam.description || '暂无描述'}
                </p>
              </div>
            )}

            <div>
              <Label htmlFor='task'>任务描述</Label>
              <Textarea
                id='task'
                value={executeForm.task}
                onChange={e => setExecuteForm(prev => ({ ...prev, task: e.target.value }))}
                placeholder='详细描述您希望智能体团队完成的任务...'
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor='priority'>优先级</Label>
              <Select
                value={executeForm.priority}
                onValueChange={value => setExecuteForm(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='low'>低</SelectItem>
                  <SelectItem value='normal'>普通</SelectItem>
                  <SelectItem value='high'>高</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='flex justify-end gap-3'>
              <Button variant='outline' onClick={() => setExecuteWorkflowOpen(false)}>
                取消
              </Button>
              <Button onClick={handleExecuteWorkflow} disabled={!executeForm.task.trim()}>
                开始执行
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
