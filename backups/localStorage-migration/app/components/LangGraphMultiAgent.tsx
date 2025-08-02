'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  AlertCircle,
  Bot,
  Brain,
  CheckCircle,
  Clock,
  Cpu,
  GitBranch,
  Loader2,
  Play,
  Settings,
  Users,
  Workflow,
  Zap,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

// 类型定义
interface Agent {
  name: string;
  status: string;
  type: string;
}

interface WorkflowType {
  type: string;
  name: string;
  description: string;
  suitable_for: string;
}

interface MultiAgentTask {
  task_id: string;
  status: string;
  results: Record<string, any>;
  messages: string[];
  iteration_count: number;
}

interface TaskRequest {
  task_description: string;
  workflow_type: string;
  agents: string[];
  max_iterations: number;
}

const LangGraphMultiAgent: React.FC = () => {
  // 状态管理
  const [agents, setAgents] = useState<Agent[]>([]);
  const [workflowTypes, setWorkflowTypes] = useState<WorkflowType[]>([]);
  const [currentTask, setCurrentTask] = useState<MultiAgentTask | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  
  // 表单状态
  const [taskDescription, setTaskDescription] = useState('');
  const [selectedWorkflowType, setSelectedWorkflowType] = useState('supervisor');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [maxIterations, setMaxIterations] = useState(10);
  
  // 加载数据
  useEffect(() => {
    loadAgents();
    loadWorkflowTypes();
  }, []);
  
  const loadAgents = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/v1/langgraph/agents', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents);
        // 默认选择所有智能体
        setSelectedAgents(data.agents.map((agent: Agent) => agent.name));
      } else {
        toast.error('加载智能体列表失败');
      }
    } catch (error) {
      toast.error('加载智能体列表失败');
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadWorkflowTypes = async () => {
    try {
      const response = await fetch('/api/v1/langgraph/workflows/types', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setWorkflowTypes(data.workflow_types);
      } else {
        toast.error('加载工作流类型失败');
      }
    } catch (error) {
      toast.error('加载工作流类型失败');
    }
  };
  
  const executeTask = async () => {
    if (!taskDescription.trim()) {
      toast.error('请输入任务描述');
      return;
    }
    
    if (selectedAgents.length === 0) {
      toast.error('请至少选择一个智能体');
      return;
    }
    
    try {
      setIsExecuting(true);
      setCurrentTask(null);
      
      const taskRequest: TaskRequest = {
        task_description: taskDescription,
        workflow_type: selectedWorkflowType,
        agents: selectedAgents,
        max_iterations: maxIterations,
      };
      
      const response = await fetch('/api/v1/langgraph/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(taskRequest),
      });
      
      if (response.ok) {
        const result = await response.json();
        setCurrentTask(result);
        toast.success('多智能体任务执行完成');
      } else {
        const error = await response.json();
        toast.error(`任务执行失败: ${error.detail}`);
      }
    } catch (error) {
      toast.error('任务执行失败');
    } finally {
      setIsExecuting(false);
    }
  };
  
  const toggleAgentSelection = (agentName: string) => {
    setSelectedAgents(prev => 
      prev.includes(agentName)
        ? prev.filter(name => name !== agentName)
        : [...prev, agentName]
    );
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
          <Brain className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">LangGraph 多智能体系统</h1>
          <p className="text-gray-600">基于状态图的现代化多智能体协同平台</p>
        </div>
      </div>
      
      <Tabs defaultValue="execute" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="execute" className="flex items-center space-x-2">
            <Play className="h-4 w-4" />
            <span>任务执行</span>
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>智能体管理</span>
          </TabsTrigger>
          <TabsTrigger value="workflows" className="flex items-center space-x-2">
            <Workflow className="h-4 w-4" />
            <span>工作流配置</span>
          </TabsTrigger>
        </TabsList>
        
        {/* 任务执行面板 */}
        <TabsContent value="execute" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 任务配置 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>任务配置</span>
                </CardTitle>
                <CardDescription>
                  配置多智能体协同任务的参数和执行策略
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 任务描述 */}
                <div className="space-y-2">
                  <Label htmlFor="task-description">任务描述</Label>
                  <Textarea
                    id="task-description"
                    placeholder="请详细描述需要多智能体协同完成的任务..."
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    rows={4}
                  />
                </div>
                
                {/* 工作流类型 */}
                <div className="space-y-2">
                  <Label htmlFor="workflow-type">工作流类型</Label>
                  <Select value={selectedWorkflowType} onValueChange={setSelectedWorkflowType}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择工作流类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {workflowTypes.map((type) => (
                        <SelectItem key={type.type} value={type.type}>
                          <div className="flex flex-col">
                            <span className="font-medium">{type.name}</span>
                            <span className="text-sm text-gray-500">{type.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* 智能体选择 */}
                <div className="space-y-2">
                  <Label>参与智能体</Label>
                  <div className="flex flex-wrap gap-2">
                    {agents.map((agent) => (
                      <Badge
                        key={agent.name}
                        variant={selectedAgents.includes(agent.name) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleAgentSelection(agent.name)}
                      >
                        <Bot className="h-3 w-3 mr-1" />
                        {agent.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {/* 最大迭代次数 */}
                <div className="space-y-2">
                  <Label htmlFor="max-iterations">最大迭代次数</Label>
                  <Input
                    id="max-iterations"
                    type="number"
                    min="1"
                    max="50"
                    value={maxIterations}
                    onChange={(e) => setMaxIterations(parseInt(e.target.value) || 10)}
                  />
                </div>
                
                {/* 执行按钮 */}
                <Button
                  onClick={executeTask}
                  disabled={isExecuting || !taskDescription.trim()}
                  className="w-full"
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      执行中...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      开始执行
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
            
            {/* 执行结果 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Cpu className="h-5 w-5" />
                  <span>执行结果</span>
                </CardTitle>
                <CardDescription>
                  实时显示多智能体任务的执行状态和结果
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentTask ? (
                  <div className="space-y-4">
                    {/* 任务状态 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(currentTask.status)}
                        <span className="font-medium">任务状态</span>
                      </div>
                      <Badge className={getStatusColor(currentTask.status)}>
                        {currentTask.status}
                      </Badge>
                    </div>
                    
                    {/* 迭代进度 */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>执行进度</span>
                        <span>{currentTask.iteration_count} / {maxIterations}</span>
                      </div>
                      <Progress 
                        value={(currentTask.iteration_count / maxIterations) * 100} 
                        className="h-2"
                      />
                    </div>
                    
                    <Separator />
                    
                    {/* 智能体结果 */}
                    <div className="space-y-3">
                      <h4 className="font-medium">智能体执行结果</h4>
                      <ScrollArea className="h-32">
                        <div className="space-y-2">
                          {Object.entries(currentTask.results).map(([agentName, result]) => (
                            <div key={agentName} className="p-2 bg-gray-50 rounded">
                              <div className="flex items-center space-x-2 mb-1">
                                <Bot className="h-3 w-3" />
                                <span className="font-medium text-sm">{agentName}</span>
                              </div>
                              <p className="text-xs text-gray-600">{String(result)}</p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                    
                    {/* 执行日志 */}
                    <div className="space-y-3">
                      <h4 className="font-medium">执行日志</h4>
                      <ScrollArea className="h-32">
                        <div className="space-y-1">
                          {currentTask.messages.map((message, index) => (
                            <div key={index} className="text-sm text-gray-600 p-1">
                              {message}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Cpu className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>暂无执行结果</p>
                    <p className="text-sm">配置任务参数并点击执行按钮开始</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* 智能体管理面板 */}
        <TabsContent value="agents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>智能体列表</span>
              </CardTitle>
              <CardDescription>
                查看和管理系统中的所有智能体
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">加载中...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {agents.map((agent) => (
                    <Card key={agent.name} className="border-2">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Bot className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium">{agent.name}</h3>
                            <p className="text-sm text-gray-500">{agent.type}</p>
                          </div>
                          <Badge 
                            variant={agent.status === 'active' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {agent.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* 工作流配置面板 */}
        <TabsContent value="workflows" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <GitBranch className="h-5 w-5" />
                <span>工作流类型</span>
              </CardTitle>
              <CardDescription>
                了解不同工作流类型的特点和适用场景
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {workflowTypes.map((type) => (
                  <Card key={type.type} className="border-2">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Workflow className="h-5 w-5 text-purple-600" />
                          <h3 className="font-medium">{type.name}</h3>
                        </div>
                        <p className="text-sm text-gray-600">{type.description}</p>
                        <div className="space-y-1">
                          <span className="text-xs font-medium text-gray-500">适用场景:</span>
                          <p className="text-xs text-gray-600">{type.suitable_for}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LangGraphMultiAgent;
