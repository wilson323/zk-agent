/**
 * LangChain工作流演示页面
 * 展示LangChain工作流的创建、执行和监控功能
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Play,
  Square,
  Eye,
  Trash2,
  Plus,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { LangChainWorkflowClient } from '@/lib/services/langchain-workflow-client';

interface WorkflowItem {
  id: string;
  name: string;
  description: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  createdAt: string;
  lastExecuted?: string;
}

interface ExecutionStatus {
  execution_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  message?: string;
  result?: any;
  error?: string;
}

export default function LangChainDemoPage() {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [executions, setExecutions] = useState<Record<string, ExecutionStatus>>({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('create');
  
  // 创建工作流表单
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    max_iterations: 5,
    temperature: 0.7,
  });
  
  // 自然语言描述表单
  const [nlForm, setNlForm] = useState({
    description: '',
    name: '',
  });
  
  // 执行表单
  const [executeForm, setExecuteForm] = useState({
    workflowId: '',
    inputs: '{}',
  });

  const langchainClient = new LangChainWorkflowClient();

  // 加载工作流列表
  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const result = await langchainClient.listWorkflows();
      setWorkflows(result.workflows || []);
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法加载工作流列表',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // 创建工作流
  const handleCreateWorkflow = async () => {
    try {
      setLoading(true);
      const workflowId = await langchainClient.createWorkflow({
        name: createForm.name,
        description: createForm.description,
        max_iterations: createForm.max_iterations,
        temperature: createForm.temperature,
        agents: [
          {
            name: 'main-agent',
            role: '主要处理智能体',
            model: 'gpt-4o-mini',
            system_message: '你是一个专业的AI助手，能够处理各种任务。',
          },
        ],
        workflow_type: 'sequential',
      });
      
      toast({
        title: '创建成功',
        description: `工作流 ${createForm.name} 创建成功`,
      });
      
      setCreateForm({ name: '', description: '', max_iterations: 5, temperature: 0.7 });
      await loadWorkflows();
    } catch (error) {
      toast({
        title: '创建失败',
        description: error instanceof Error ? error.message : '创建工作流失败',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // 从自然语言创建工作流
  const handleCreateFromNL = async () => {
    try {
      setLoading(true);
      const workflowId = await langchainClient.createWorkflowFromDescription(
        nlForm.description,
        nlForm.name
      );
      
      toast({
        title: '创建成功',
        description: `工作流 ${nlForm.name} 从自然语言描述创建成功`,
      });
      
      setNlForm({ description: '', name: '' });
      await loadWorkflows();
    } catch (error) {
      toast({
        title: '创建失败',
        description: error instanceof Error ? error.message : '从自然语言创建工作流失败',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // 执行工作流
  const handleExecuteWorkflow = async (workflowId: string) => {
    try {
      setLoading(true);
      let inputs = {};
      try {
        inputs = JSON.parse(executeForm.inputs || '{}');
      } catch {
        inputs = { query: executeForm.inputs };
      }
      
      const result = await langchainClient.executeWorkflow(workflowId, inputs);
      
      setExecutions(prev => ({
        ...prev,
        [result.execution_id]: {
          execution_id: result.execution_id,
          status: result.status,
          message: result.message,
        },
      }));
      
      toast({
        title: '执行开始',
        description: `工作流执行已启动，执行ID: ${result.execution_id}`,
      });
      
      // 开始轮询状态
      pollExecutionStatus(result.execution_id);
    } catch (error) {
      toast({
        title: '执行失败',
        description: error instanceof Error ? error.message : '执行工作流失败',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // 轮询执行状态
  const pollExecutionStatus = async (executionId: string) => {
    const poll = async () => {
      try {
        const status = await langchainClient.getWorkflowStatus(executionId);
        setExecutions(prev => ({
          ...prev,
          [executionId]: status,
        }));
        
        if (status.status === 'running' || status.status === 'pending') {
          setTimeout(poll, 2000); // 每2秒轮询一次
        }
      } catch (error) {
        }
    };
    
    poll();
  };

  // 删除工作流
  const handleDeleteWorkflow = async (workflowId: string) => {
    try {
      setLoading(true);
      await langchainClient.deleteWorkflow(workflowId);
      
      toast({
        title: '删除成功',
        description: '工作流已删除',
      });
      
      await loadWorkflows();
    } catch (error) {
      toast({
        title: '删除失败',
        description: error instanceof Error ? error.message : '删除工作流失败',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'running':
      case 'pending':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'running':
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  useEffect(() => {
    loadWorkflows();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            LangChain工作流演示
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            创建、执行和监控LangChain工作流
          </p>
        </div>
        <Button onClick={loadWorkflows} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="create">创建工作流</TabsTrigger>
          <TabsTrigger value="natural-language">自然语言创建</TabsTrigger>
          <TabsTrigger value="workflows">工作流列表</TabsTrigger>
          <TabsTrigger value="executions">执行监控</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                创建新工作流
              </CardTitle>
              <CardDescription>
                通过配置参数创建LangChain工作流
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">工作流名称</label>
                  <Input
                    placeholder="输入工作流名称"
                    value={createForm.name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">最大迭代次数</label>
                  <Input
                    type="number"
                    placeholder="5"
                    value={createForm.max_iterations}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, max_iterations: parseInt(e.target.value) || 5 }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">工作流描述</label>
                <Textarea
                  placeholder="描述工作流的功能和用途"
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">温度参数 (0-1)</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  placeholder="0.7"
                  value={createForm.temperature}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, temperature: parseFloat(e.target.value) || 0.7 }))}
                />
              </div>
              <Button 
                onClick={handleCreateWorkflow} 
                disabled={loading || !createForm.name || !createForm.description}
                className="w-full"
              >
                <Zap className="h-4 w-4 mr-2" />
                创建工作流
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="natural-language" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                自然语言创建工作流
              </CardTitle>
              <CardDescription>
                使用自然语言描述来创建工作流
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">工作流名称</label>
                <Input
                  placeholder="输入工作流名称"
                  value={nlForm.name}
                  onChange={(e) => setNlForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">自然语言描述</label>
                <Textarea
                  placeholder="例如：创建一个研究团队，包含一个研究员和一个分析师，用于分析市场趋势"
                  value={nlForm.description}
                  onChange={(e) => setNlForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                />
              </div>
              <Button 
                onClick={handleCreateFromNL} 
                disabled={loading || !nlForm.name || !nlForm.description}
                className="w-full"
              >
                <Zap className="h-4 w-4 mr-2" />
                从描述创建工作流
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          <div className="grid gap-4">
            {workflows.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <p className="text-gray-500">暂无工作流，请先创建一个</p>
                </CardContent>
              </Card>
            ) : (
              workflows.map((workflow) => (
                <Card key={workflow.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {workflow.name}
                          <Badge className={getStatusColor(workflow.status)}>
                            {getStatusIcon(workflow.status)}
                            {workflow.status}
                          </Badge>
                        </CardTitle>
                        <CardDescription>{workflow.description}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setExecuteForm(prev => ({ ...prev, workflowId: workflow.id }));
                            handleExecuteWorkflow(workflow.id);
                          }}
                          disabled={loading}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          执行
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteWorkflow(workflow.id)}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          删除
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-500">
                      创建时间: {new Date(workflow.createdAt).toLocaleString()}
                      {workflow.lastExecuted && (
                        <span className="ml-4">
                          最后执行: {new Date(workflow.lastExecuted).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="executions" className="space-y-4">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>执行输入</CardTitle>
                <CardDescription>为工作流执行提供输入参数</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">输入参数 (JSON格式)</label>
                  <Textarea
                    placeholder='{"query": "分析人工智能发展趋势"}'
                    value={executeForm.inputs}
                    onChange={(e) => setExecuteForm(prev => ({ ...prev, inputs: e.target.value }))}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {Object.entries(executions).length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <p className="text-gray-500">暂无执行记录</p>
                </CardContent>
              </Card>
            ) : (
              Object.entries(executions).map(([executionId, execution]) => (
                <Card key={executionId}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        执行 {executionId.slice(0, 8)}...
                        <Badge className={getStatusColor(execution.status)}>
                          {getStatusIcon(execution.status)}
                          {execution.status}
                        </Badge>
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {execution.progress !== undefined && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>进度</span>
                          <span>{execution.progress}%</span>
                        </div>
                        <Progress value={execution.progress} />
                      </div>
                    )}
                    
                    {execution.message && (
                      <Alert>
                        <AlertDescription>{execution.message}</AlertDescription>
                      </Alert>
                    )}
                    
                    {execution.error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{execution.error}</AlertDescription>
                      </Alert>
                    )}
                    
                    {execution.result && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">执行结果</label>
                        <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm overflow-auto">
                          {JSON.stringify(execution.result, null, 2)}
                        </pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
