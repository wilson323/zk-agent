'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Badge,
  Alert,
  AlertDescription,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Switch,
  Progress,
} from '@/components/ui';
import {
  Plus,
  Settings,
  Trash2,
  Play,
  Pause,
  BarChart3,
  Upload,
  Download,
  Mic,
  Image,
  MessageSquare,
  Video,
  Code,
  Languages,
  Sparkles,
  Eye,
  Volume2,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

// 类型定义
interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  type: string;
  model_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  metadata?: {
    description?: string;
    capabilities?: string[];
    pricing?: {
      input_token_price?: number;
      output_token_price?: number;
      image_price?: number;
      audio_price?: number;
      currency?: string;
    };
  };
}

interface ModelMetrics {
  model_id: string;
  total_calls: number;
  success_rate: number;
  average_latency: number;
  total_cost: number;
  error_count: number;
  last_used?: string;
}

interface ModelCallResult {
  success: boolean;
  data?: any;
  error?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    cost?: number;
  };
  latency?: number;
  model_id: string;
  provider: string;
  timestamp: string;
}

// 模型类型图标映射
const modelTypeIcons = {
  text: MessageSquare,
  multimodal: Sparkles,
  speech_to_text: Mic,
  text_to_speech: Volume2,
  image_generation: Image,
  image_understanding: Eye,
  video_generation: Video,
  video_understanding: Video,
  embedding: Code,
  code_generation: Code,
  translation: Languages,
};

// 模型厂商颜色映射
const providerColors = {
  openai: 'bg-green-100 text-green-800',
  alibaba_qwen: 'bg-orange-100 text-orange-800',
  baidu_wenxin: 'bg-blue-100 text-blue-800',
  zhipu_glm: 'bg-purple-100 text-purple-800',
  siliconflow: 'bg-gray-100 text-gray-800',
  anthropic_claude: 'bg-red-100 text-red-800',
  google_gemini: 'bg-yellow-100 text-yellow-800',
};

export default function MultimodalModelManager() {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [metrics, setMetrics] = useState<Record<string, ModelMetrics>>({});
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelConfig | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testResult, setTestResult] = useState<ModelCallResult | null>(null);
  const [activeTab, setActiveTab] = useState('models');

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    provider: '',
    type: '',
    model_id: '',
    api_key: '',
    base_url: '',
    max_tokens: 4000,
    temperature: 0.7,
    timeout: 60,
  });

  // 测试表单状态
  const [testData, setTestData] = useState({
    prompt: '',
    messages: [{ role: 'user', content: '' }],
    file: null as File | null,
  });

  // 加载模型列表
  const loadModels = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/multimodal/models');
      if (response.ok) {
        const data = await response.json();
        setModels(data.models);
      } else {
        toast.error('加载模型列表失败');
      }
    } catch (error) {
      toast.error('网络错误');
    } finally {
      setLoading(false);
    }
  };

  // 加载模型指标
  const loadMetrics = async (modelId: string) => {
    try {
      const response = await fetch(`/api/v1/multimodal/models/${modelId}/metrics`);
      if (response.ok) {
        const data = await response.json();
        setMetrics(prev => ({ ...prev, [modelId]: data }));
      }
    } catch (error) {
      console.error('加载模型指标失败:', error);
    }
  };

  // 添加模型
  const addModel = async () => {
    try {
      const response = await fetch('/api/v1/multimodal/models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('模型添加成功');
        setShowAddDialog(false);
        setFormData({
          name: '',
          provider: '',
          type: '',
          model_id: '',
          api_key: '',
          base_url: '',
          max_tokens: 4000,
          temperature: 0.7,
          timeout: 60,
        });
        loadModels();
      } else {
        const error = await response.json();
        toast.error(error.detail || '添加模型失败');
      }
    } catch (error) {
      toast.error('网络错误');
    }
  };

  // 删除模型
  const deleteModel = async (modelId: string) => {
    try {
      const response = await fetch(`/api/v1/multimodal/models/${modelId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('模型删除成功');
        loadModels();
      } else {
        toast.error('删除模型失败');
      }
    } catch (error) {
      toast.error('网络错误');
    }
  };

  // 切换模型状态
  const toggleModelStatus = async (modelId: string) => {
    try {
      const response = await fetch(`/api/v1/multimodal/models/${modelId}/toggle`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('模型状态切换成功');
        loadModels();
      } else {
        toast.error('切换模型状态失败');
      }
    } catch (error) {
      toast.error('网络错误');
    }
  };

  // 测试模型
  const testModel = async () => {
    if (!selectedModel) return;

    setLoading(true);
    try {
      let endpoint = '';
      let body: any = {};
      let headers: any = { 'Content-Type': 'application/json' };

      switch (selectedModel.type) {
        case 'text':
        case 'multimodal':
          endpoint = '/api/v1/multimodal/text/generate';
          body = {
            model_id: selectedModel.id,
            messages: testData.messages.filter(m => m.content.trim()),
          };
          break;
        case 'image_generation':
          endpoint = '/api/v1/multimodal/image/generate';
          body = {
            model_id: selectedModel.id,
            prompt: testData.prompt,
          };
          break;
        case 'speech_to_text':
          if (!testData.file) {
            toast.error('请选择音频文件');
            return;
          }
          endpoint = '/api/v1/multimodal/audio/transcribe';
          const formData = new FormData();
          formData.append('model_id', selectedModel.id);
          formData.append('audio', testData.file);
          body = formData;
          headers = {}; // Let browser set Content-Type for FormData
          break;
        case 'text_to_speech':
          endpoint = '/api/v1/multimodal/audio/synthesize';
          body = {
            model_id: selectedModel.id,
            text: testData.prompt,
          };
          break;
        default:
          toast.error('暂不支持该模型类型的测试');
          return;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: headers['Content-Type'] ? JSON.stringify(body) : body,
      });

      if (response.ok) {
        if (selectedModel.type === 'text_to_speech') {
          // 处理音频响应
          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          setTestResult({
            success: true,
            data: { audio_url: audioUrl },
            model_id: selectedModel.id,
            provider: selectedModel.provider,
            timestamp: new Date().toISOString(),
          });
        } else {
          const result = await response.json();
          setTestResult(result);
        }
        toast.success('模型测试完成');
      } else {
        const error = await response.json();
        setTestResult({
          success: false,
          error: error.detail || '测试失败',
          model_id: selectedModel.id,
          provider: selectedModel.provider,
          timestamp: new Date().toISOString(),
        });
        toast.error('模型测试失败');
      }
    } catch (error) {
      setTestResult({
        success: false,
        error: '网络错误',
        model_id: selectedModel?.id || '',
        provider: selectedModel?.provider || '',
        timestamp: new Date().toISOString(),
      });
      toast.error('网络错误');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModels();
  }, []);

  useEffect(() => {
    // 为每个模型加载指标
    models.forEach(model => {
      loadMetrics(model.id);
    });
  }, [models]);

  const renderModelCard = (model: ModelConfig) => {
    const IconComponent = modelTypeIcons[model.type as keyof typeof modelTypeIcons] || MessageSquare;
    const providerColor = providerColors[model.provider as keyof typeof providerColors] || 'bg-gray-100 text-gray-800';
    const modelMetrics = metrics[model.id];

    return (
      <Card key={model.id} className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <IconComponent className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">{model.name}</CardTitle>
                <CardDescription>{model.model_id}</CardDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={providerColor}>
                {model.provider}
              </Badge>
              <Switch
                checked={model.is_active}
                onCheckedChange={() => toggleModelStatus(model.id)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {model.metadata?.description && (
              <p className="text-sm text-gray-600">{model.metadata.description}</p>
            )}
            
            {model.metadata?.capabilities && (
              <div className="flex flex-wrap gap-1">
                {model.metadata.capabilities.map((capability, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {capability}
                  </Badge>
                ))}
              </div>
            )}

            {modelMetrics && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">调用次数:</span>
                  <span className="ml-1 font-medium">{modelMetrics.total_calls}</span>
                </div>
                <div>
                  <span className="text-gray-500">成功率:</span>
                  <span className="ml-1 font-medium">{(modelMetrics.success_rate * 100).toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-gray-500">平均延迟:</span>
                  <span className="ml-1 font-medium">{modelMetrics.average_latency.toFixed(0)}ms</span>
                </div>
                <div>
                  <span className="text-gray-500">总成本:</span>
                  <span className="ml-1 font-medium">${modelMetrics.total_cost.toFixed(4)}</span>
                </div>
              </div>
            )}

            <div className="flex space-x-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedModel(model);
                  setShowTestDialog(true);
                }}
              >
                <Play className="h-4 w-4 mr-1" />
                测试
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => loadMetrics(model.id)}
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                指标
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => deleteModel(model.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                删除
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderTestDialog = () => {
    if (!selectedModel) return null;

    return (
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>测试模型: {selectedModel.name}</DialogTitle>
            <DialogDescription>
              模型类型: {selectedModel.type} | 厂商: {selectedModel.provider}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {(selectedModel.type === 'text' || selectedModel.type === 'multimodal') && (
              <div>
                <Label>对话消息</Label>
                <div className="space-y-2">
                  {testData.messages.map((message, index) => (
                    <div key={index} className="flex space-x-2">
                      <Select
                        value={message.role}
                        onValueChange={(value) => {
                          const newMessages = [...testData.messages];
                          newMessages[index].role = value;
                          setTestData({ ...testData, messages: newMessages });
                        }}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">用户</SelectItem>
                          <SelectItem value="assistant">助手</SelectItem>
                          <SelectItem value="system">系统</SelectItem>
                        </SelectContent>
                      </Select>
                      <Textarea
                        placeholder="输入消息内容..."
                        value={message.content}
                        onChange={(e) => {
                          const newMessages = [...testData.messages];
                          newMessages[index].content = e.target.value;
                          setTestData({ ...testData, messages: newMessages });
                        }}
                        className="flex-1"
                      />
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setTestData({
                        ...testData,
                        messages: [...testData.messages, { role: 'user', content: '' }]
                      });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    添加消息
                  </Button>
                </div>
              </div>
            )}

            {(selectedModel.type === 'image_generation' || selectedModel.type === 'text_to_speech') && (
              <div>
                <Label>提示词</Label>
                <Textarea
                  placeholder="输入提示词..."
                  value={testData.prompt}
                  onChange={(e) => setTestData({ ...testData, prompt: e.target.value })}
                />
              </div>
            )}

            {selectedModel.type === 'speech_to_text' && (
              <div>
                <Label>音频文件</Label>
                <Input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setTestData({ ...testData, file });
                  }}
                />
              </div>
            )}

            {testResult && (
              <div className="mt-4">
                <Label>测试结果</Label>
                <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                  {testResult.success ? (
                    <div className="space-y-2">
                      <div className="flex items-center text-green-600">
                        <span className="font-medium">✓ 测试成功</span>
                        {testResult.latency && (
                          <span className="ml-2 text-sm">({testResult.latency.toFixed(0)}ms)</span>
                        )}
                      </div>
                      
                      {testResult.data?.audio_url ? (
                        <audio controls className="w-full">
                          <source src={testResult.data.audio_url} type="audio/mpeg" />
                        </audio>
                      ) : (
                        <pre className="text-sm bg-white p-2 rounded border overflow-auto max-h-40">
                          {JSON.stringify(testResult.data, null, 2)}
                        </pre>
                      )}
                      
                      {testResult.usage && (
                        <div className="text-sm text-gray-600">
                          <div>Token使用: {testResult.usage.total_tokens || 'N/A'}</div>
                          {testResult.usage.cost && (
                            <div>成本: ${testResult.usage.cost.toFixed(6)}</div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-red-600">
                      <div className="font-medium">✗ 测试失败</div>
                      <div className="text-sm mt-1">{testResult.error}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestDialog(false)}>
              关闭
            </Button>
            <Button onClick={testModel} disabled={loading}>
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              开始测试
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">多模态模型管理</h1>
          <p className="text-gray-600 mt-1">统一管理和调用各种AI模型</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={loadModels} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                添加模型
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>添加新模型</DialogTitle>
                <DialogDescription>
                  配置新的AI模型接入
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">模型名称</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="输入模型名称"
                  />
                </div>
                <div>
                  <Label htmlFor="provider">模型厂商</Label>
                  <Select
                    value={formData.provider}
                    onValueChange={(value) => setFormData({ ...formData, provider: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择厂商" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="alibaba_qwen">阿里云千问</SelectItem>
                      <SelectItem value="baidu_wenxin">百度文心</SelectItem>
                      <SelectItem value="zhipu_glm">智谱GLM</SelectItem>
                      <SelectItem value="siliconflow">硅基流动</SelectItem>
                      <SelectItem value="anthropic_claude">Anthropic Claude</SelectItem>
                      <SelectItem value="google_gemini">Google Gemini</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="type">模型类型</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">文本生成</SelectItem>
                      <SelectItem value="multimodal">多模态</SelectItem>
                      <SelectItem value="image_generation">图像生成</SelectItem>
                      <SelectItem value="image_understanding">图像理解</SelectItem>
                      <SelectItem value="speech_to_text">语音识别</SelectItem>
                      <SelectItem value="text_to_speech">语音合成</SelectItem>
                      <SelectItem value="embedding">向量嵌入</SelectItem>
                      <SelectItem value="code_generation">代码生成</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="model_id">模型ID</Label>
                  <Input
                    id="model_id"
                    value={formData.model_id}
                    onChange={(e) => setFormData({ ...formData, model_id: e.target.value })}
                    placeholder="输入厂商模型ID"
                  />
                </div>
                <div>
                  <Label htmlFor="api_key">API密钥</Label>
                  <Input
                    id="api_key"
                    type="password"
                    value={formData.api_key}
                    onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                    placeholder="输入API密钥"
                  />
                </div>
                <div>
                  <Label htmlFor="base_url">API基础URL (可选)</Label>
                  <Input
                    id="base_url"
                    value={formData.base_url}
                    onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                    placeholder="输入API基础URL"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  取消
                </Button>
                <Button onClick={addModel}>
                  添加
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="models">模型列表</TabsTrigger>
          <TabsTrigger value="metrics">性能指标</TabsTrigger>
          <TabsTrigger value="settings">配置管理</TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
          ) : models.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <Sparkles className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无模型</h3>
                <p className="text-gray-500 mb-4">开始添加您的第一个AI模型</p>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  添加模型
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {models.map(renderModelCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="metrics" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>模型性能概览</CardTitle>
              <CardDescription>
                查看所有模型的调用统计和性能指标
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>模型名称</TableHead>
                    <TableHead>调用次数</TableHead>
                    <TableHead>成功率</TableHead>
                    <TableHead>平均延迟</TableHead>
                    <TableHead>总成本</TableHead>
                    <TableHead>最后使用</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {models.map(model => {
                    const modelMetrics = metrics[model.id];
                    return (
                      <TableRow key={model.id}>
                        <TableCell className="font-medium">{model.name}</TableCell>
                        <TableCell>{modelMetrics?.total_calls || 0}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Progress 
                              value={(modelMetrics?.success_rate || 0) * 100} 
                              className="w-16 h-2"
                            />
                            <span className="text-sm">
                              {((modelMetrics?.success_rate || 0) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{modelMetrics?.average_latency?.toFixed(0) || 0}ms</TableCell>
                        <TableCell>${(modelMetrics?.total_cost || 0).toFixed(4)}</TableCell>
                        <TableCell>
                          {modelMetrics?.last_used 
                            ? new Date(modelMetrics.last_used).toLocaleDateString()
                            : '从未使用'
                          }
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>全局配置</CardTitle>
                <CardDescription>
                  管理多模态模型的全局设置
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>自动重试</Label>
                    <p className="text-sm text-gray-500">API调用失败时自动重试</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>性能监控</Label>
                    <p className="text-sm text-gray-500">收集模型调用性能数据</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>成本追踪</Label>
                    <p className="text-sm text-gray-500">跟踪API调用成本</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>数据管理</CardTitle>
                <CardDescription>
                  导入导出模型配置和数据
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  导入配置
                </Button>
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  导出配置
                </Button>
                <Button variant="outline" className="w-full text-red-600 hover:text-red-700">
                  <Trash2 className="h-4 w-4 mr-2" />
                  清除所有数据
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {renderTestDialog()}
    </div>
  );
}