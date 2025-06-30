import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MODEL_PROVIDERS, getProviderSupportedTypes, getProviderModels } from "@/lib/ai-models/model-registry"
import { ModelProvider, ModelType, type AIModelConfig } from "@/types/ai-models"
import { MODEL_TYPE_ICONS, MODEL_TYPE_NAMES } from "@/lib/ai-models/constants"

interface ModelFormProps {
  initialData?: AIModelConfig
  onSubmit: (data: any) => void
  onCancel: () => void
}

export function ModelForm({ initialData, onSubmit, onCancel }: ModelFormProps) {
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
  }, [formData.provider, formData.type, formData.baseUrl])

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
