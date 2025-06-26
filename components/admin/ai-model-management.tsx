// @ts-nocheck
"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Plus,
  Edit,
  Trash,
  TestTube,
  Activity,
  DollarSign,
  Clock,
  CheckCircle,
  Zap,
  Brain,
  Mic,
  ImageIcon,
  Code,
  Globe,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { aiModelManager } from "@/lib/ai-models/model-manager"
import { MODEL_PROVIDERS, getProviderSupportedTypes, getProviderModels } from "@/lib/ai-models/model-registry"
import { ModelProvider, ModelType, type AIModelConfig, type ModelMetrics } from "@/types/ai-models"

// 模型类型图标映射
const MODEL_TYPE_ICONS = {
  [ModelType.TEXT]: Brain,
  [ModelType.MULTIMODAL]: Zap,
  [ModelType.SPEECH_TO_TEXT]: Mic,
  [ModelType.TEXT_TO_SPEECH]: Mic,
  [ModelType.IMAGE_GENERATION]: ImageIcon,
  [ModelType.IMAGE_UNDERSTANDING]: ImageIcon,
  [ModelType.EMBEDDING]: Globe,
  [ModelType.CODE_GENERATION]: Code,
}

// 模型类型中文名称
const MODEL_TYPE_NAMES = {
  [ModelType.TEXT]: "文本生成",
  [ModelType.MULTIMODAL]: "多模态",
  [ModelType.SPEECH_TO_TEXT]: "语音识别",
  [ModelType.TEXT_TO_SPEECH]: "语音合成",
  [ModelType.IMAGE_GENERATION]: "图片生成",
  [ModelType.IMAGE_UNDERSTANDING]: "图片理解",
  [ModelType.EMBEDDING]: "向量嵌入",
  [ModelType.CODE_GENERATION]: "代码生成",
}

interface ModelFormProps {
  initialData?: AIModelConfig
  onSubmit: (data: any) => void
  onCancel: () => void
}

function ModelForm({ initialData, onSubmit, onCancel }: ModelFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    provider: initialData?.provider || ModelProvider.OPENAI,
    type: initialData?.type || ModelType.TEXT,
    modelId: initialData?.modelId || "",
    apiKey: initialData?.apiKey || "",
    baseUrl: initialData?.baseUrl || "",
    apiVersion: initialData?.apiVersion || "",
    maxTokens: initialData?.maxTokens || 4096,
    temperature: initialData?.temperature || 0.7,
    timeout: initialData?.timeout || 30000,
    isActive: initialData?.isActive ?? true,
    description: initialData?.metadata?.description || "",
    customHeaders: initialData?.customHeaders ? JSON.stringify(initialData.customHeaders, null, 2) : "",
    customParams: initialData?.customParams ? JSON.stringify(initialData.customParams, null, 2) : "",
  })

  const [availableModels, setAvailableModels] = useState<Array<[string, any]>>([])

  // 当厂商或类型改变时，更新可用模型列表
  useEffect(() => {
    const models = getProviderModels(formData.provider, formData.type)
    setAvailableModels(models)

    // 设置默认baseUrl
    const providerConfig = MODEL_PROVIDERS[formData.provider]
    if (providerConfig && !formData.baseUrl) {
      setFormData((prev) => ({
        ...prev,
        baseUrl: providerConfig.baseUrl,
      }))
    }
  }, [formData.provider, formData.type])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const submitData = {
        ...formData,
        customHeaders: formData.customHeaders ? JSON.parse(formData.customHeaders) : undefined,
        customParams: formData.customParams ? JSON.parse(formData.customParams) : undefined,
        metadata: {
          description: formData.description,
        },
      }

      onSubmit(submitData)
    } catch (error) {
      console.error("Invalid JSON in custom fields:", error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">基本配置</TabsTrigger>
          <TabsTrigger value="advanced">高级设置</TabsTrigger>
          <TabsTrigger value="custom">自定义参数</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">模型名称</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：GPT-4 主要对话模型"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider">模型厂商</Label>
              <Select
                value={formData.provider}
                onValueChange={(value) => setFormData({ ...formData, provider: value as ModelProvider })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MODEL_PROVIDERS).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">模型类型</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value as ModelType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getProviderSupportedTypes(formData.provider).map((type) => {
                    const Icon = MODEL_TYPE_ICONS[type]
                    return (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {MODEL_TYPE_NAMES[type]}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="modelId">模型ID</Label>
              <Select value={formData.modelId} onValueChange={(value) => setFormData({ ...formData, modelId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="选择或输入模型ID" />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map(([modelId, config]) => (
                    <SelectItem key={modelId} value={modelId}>
                      {modelId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">API密钥</Label>
              <Input
                id="apiKey"
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                placeholder="输入API密钥"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseUrl">API端点</Label>
              <Input
                id="baseUrl"
                value={formData.baseUrl}
                onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                placeholder="API基础URL"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="模型用途和特点描述"
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            />
            <Label htmlFor="isActive">启用模型</Label>
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxTokens">最大令牌数</Label>
              <Input
                id="maxTokens"
                type="number"
                value={formData.maxTokens}
                onChange={(e) => setFormData({ ...formData, maxTokens: Number.parseInt(e.target.value) })}
                min="1"
                max="200000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="temperature">温度</Label>
              <Input
                id="temperature"
                type="number"
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: Number.parseFloat(e.target.value) })}
                min="0"
                max="2"
                step="0.1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeout">超时时间(ms)</Label>
              <Input
                id="timeout"
                type="number"
                value={formData.timeout}
                onChange={(e) => setFormData({ ...formData, timeout: Number.parseInt(e.target.value) })}
                min="1000"
                max="300000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiVersion">API版本</Label>
              <Input
                id="apiVersion"
                value={formData.apiVersion}
                onChange={(e) => setFormData({ ...formData, apiVersion: e.target.value })}
                placeholder="例如：2024-02-15-preview"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customHeaders">自定义请求头 (JSON)</Label>
              <Textarea
                id="customHeaders"
                value={formData.customHeaders}
                onChange={(e) => setFormData({ ...formData, customHeaders: e.target.value })}
                placeholder='{"X-Custom-Header": "value"}'
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customParams">自定义参数 (JSON)</Label>
              <Textarea
                id="customParams"
                value={formData.customParams}
                onChange={(e) => setFormData({ ...formData, customParams: e.target.value })}
                placeholder='{"custom_param": "value"}'
                rows={4}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" className="bg-[#6cb33f] hover:bg-green-600">
          {initialData ? "更新模型" : "添加模型"}
        </Button>
      </div>
    </form>
  )
}

export function AIModelManagement() {
  const [models, setModels] = useState<AIModelConfig[]>([])
  const [metrics, setMetrics] = useState<ModelMetrics[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [currentModel, setCurrentModel] = useState<AIModelConfig | null>(null)
  const [testingModel, setTestingModel] = useState<string | null>(null)
  const { toast } = useToast()

  // 加载模型列表
  useEffect(() => {
    loadModels()
    loadMetrics()
  }, [])

  const loadModels = () => {
    const allModels = aiModelManager.getAllModels()
    setModels(allModels)
  }

  const loadMetrics = () => {
    const allMetrics = aiModelManager.getAllMetrics()
    setMetrics(allMetrics)
  }

  const handleAddModel = async (data: any) => {
    try {
      await aiModelManager.addModel(data)
      loadModels()
      setIsAddDialogOpen(false)
      toast({
        title: "模型添加成功",
        description: `${data.name} 已成功添加到模型库`,
      })
    } catch (error) {
      toast({
        title: "添加模型失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      })
    }
  }

  const handleEditModel = async (data: any) => {
    if (!currentModel) {return}

    try {
      await aiModelManager.updateModel(currentModel.id, data)
      loadModels()
      setIsEditDialogOpen(false)
      setCurrentModel(null)
      toast({
        title: "模型更新成功",
        description: `${data.name} 已成功更新`,
      })
    } catch (error) {
      toast({
        title: "更新模型失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      })
    }
  }

  const handleDeleteModel = async (id: string) => {
    try {
      await aiModelManager.deleteModel(id)
      loadModels()
      toast({
        title: "模型删除成功",
        description: "模型已从模型库中移除",
      })
    } catch (error) {
      toast({
        title: "删除模型失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      })
    }
  }

  const handleTestModel = async (id: string) => {
    setTestingModel(id)
    try {
      const result = await aiModelManager.testModel(id)
      if (result.success) {
        toast({
          title: "模型测试成功",
          description: `响应时间: ${result.latency}ms`,
        })
      } else {
        toast({
          title: "模型测试失败",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "测试失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      })
    } finally {
      setTestingModel(null)
    }
  }

  const getModelMetrics = (modelId: string): ModelMetrics | undefined => {
    return metrics.find((m) => m.modelId === modelId)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-green-700 dark:text-green-400">AI模型管理</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#6cb33f] hover:bg-green-600">
              <Plus className="mr-2 h-4 w-4" />
              添加模型
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>添加AI模型</DialogTitle>
            </DialogHeader>
            <ModelForm onSubmit={handleAddModel} onCancel={() => setIsAddDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {models.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-60 p-6">
            <Brain className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">暂无AI模型</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center mb-6">添加您的第一个AI模型开始使用</p>
            <Button className="bg-[#6cb33f] hover:bg-green-600" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              添加模型
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {models.map((model) => {
            const modelMetrics = getModelMetrics(model.id)
            const Icon = MODEL_TYPE_ICONS[model.type as ModelType]

            return (
              <Card key={model.id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-green-600" />
                      <CardTitle className="text-lg">{model.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge
                        variant={model.isActive ? "default" : "secondary"}
                        className={model.isActive ? "bg-green-500" : ""}
                      >
                        {model.isActive ? "活跃" : "禁用"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">厂商:</span>
                      <span>{MODEL_PROVIDERS[model.provider]?.name}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">类型:</span>
                      <span>{MODEL_TYPE_NAMES[model.type as ModelType]}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">模型ID:</span>
                      <span className="font-mono text-xs">{model.modelId}</span>
                    </div>

                    {modelMetrics && (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                        <div className="flex items-center gap-1 text-xs">
                          <Activity className="h-3 w-3 text-blue-500" />
                          <span>{modelMetrics.totalCalls} 调用</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span>{(modelMetrics.successRate * 100).toFixed(1)}% 成功</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <Clock className="h-3 w-3 text-orange-500" />
                          <span>{modelMetrics.averageLatency.toFixed(0)}ms</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <DollarSign className="h-3 w-3 text-purple-500" />
                          <span>¥{modelMetrics.totalCost.toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestModel(model.id)}
                        disabled={testingModel === model.id || !model.isActive}
                      >
                        <TestTube className="h-4 w-4 mr-1" />
                        {testingModel === model.id ? "测试中..." : "测试"}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCurrentModel(model)
                          setIsEditDialogOpen(true)
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        编辑
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50">
                            <Trash className="h-4 w-4 mr-1" />
                            删除
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>确定删除模型?</AlertDialogTitle>
                            <AlertDialogDescription>
                              这将永久删除模型 "{model.name}"，此操作无法撤销。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-500 hover:bg-red-600"
                              onClick={() => handleDeleteModel(model.id)}
                            >
                              删除
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* 编辑模型对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑AI模型</DialogTitle>
          </DialogHeader>
          {currentModel && (
            <ModelForm
              initialData={currentModel}
              onSubmit={handleEditModel}
              onCancel={() => {
                setIsEditDialogOpen(false)
                setCurrentModel(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
