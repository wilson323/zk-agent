// @ts-nocheck
"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Mic, Settings, Zap, Shield, Activity, TestTube, Brain, Filter, Clock, Save, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { aiModelManager } from "@/lib/ai-models/model-manager"
import { ModelType } from "@/types/ai-models"
import type { SystemConfig, SpeechRecognitionConfig } from "@/types/system-config"

// 支持的语言列表
const SUPPORTED_LANGUAGES = [
  { code: "zh-CN", name: "中文(简体)" },
  { code: "zh-TW", name: "中文(繁体)" },
  { code: "en-US", name: "英语(美国)" },
  { code: "en-GB", name: "英语(英国)" },
  { code: "ja-JP", name: "日语" },
  { code: "ko-KR", name: "韩语" },
  { code: "fr-FR", name: "法语" },
  { code: "de-DE", name: "德语" },
  { code: "es-ES", name: "西班牙语" },
  { code: "ru-RU", name: "俄语" },
]

// 音频格式选项
const AUDIO_FORMATS = [
  { value: "wav", label: "WAV (推荐)" },
  { value: "mp3", label: "MP3" },
  { value: "flac", label: "FLAC (高质量)" },
  { value: "webm", label: "WebM" },
]

// 编码格式选项
const ENCODING_FORMATS = [
  { value: "LINEAR16", label: "LINEAR16 (推荐)" },
  { value: "FLAC", label: "FLAC" },
  { value: "MULAW", label: "MULAW" },
  { value: "AMR", label: "AMR" },
]

export function SystemConfig() {
  const [config, setConfig] = useState<SystemConfig>({
    speechRecognition: {
      globalModel: "",
      language: "zh-CN",
      sampleRate: 16000,
      audioFormat: "wav",
      encoding: "LINEAR16",
      enableAutomaticPunctuation: true,
      enableWordTimeOffsets: false,
      enableSpeakerDiarization: false,
      maxSpeakers: 2,
      enableStreamingRecognition: true,
      interimResults: true,
      singleUtterance: false,
      maxAlternatives: 3,
      enableNoiseReduction: true,
      enableEchoCancellation: true,
      enableAutoGainControl: true,
      fastgptIntegration: {
        enabled: true,
        autoSendToChat: true,
        confidenceThreshold: 0.8,
        enableContextAwareness: true,
        enableEmotionDetection: false,
      },
      postProcessing: {
        enableTextNormalization: true,
        enableProfanityFilter: true,
        enableCustomDictionary: false,
        customWords: [],
      },
      performance: {
        maxRecordingDuration: 60,
        silenceTimeout: 3000,
        vadSensitivity: 0.7,
        bufferSize: 4096,
      },
    },
    general: {
      systemName: "ZKTeco AI Hub",
      systemDescription: "智能安防AI助手系统",
      defaultLanguage: "zh-CN",
      timezone: "Asia/Shanghai",
      dateFormat: "YYYY-MM-DD",
      enableAnalytics: true,
      enableErrorReporting: true,
    },
    security: {
      enableRateLimit: true,
      maxRequestsPerMinute: 100,
      enableIPWhitelist: false,
      allowedIPs: [],
      enableAuditLog: true,
    },
    performance: {
      enableCaching: true,
      cacheExpiration: 3600,
      maxConcurrentRequests: 10,
      requestTimeout: 30000,
    },
  })

  const [speechModels, setSpeechModels] = useState<Array<{ id: string; name: string }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const { toast } = useToast()

  // 加载语音识别模型列表
  useEffect(() => {
    const models = aiModelManager.getModelsByType(ModelType.SPEECH_TO_TEXT)
    setSpeechModels(models.map((model) => ({ id: model.id, name: model.name })))

    // 加载保存的配置
    loadConfig()
  }, [])

  const loadConfig = () => {
    try {
      const savedConfig = localStorage.getItem("system_config")
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig)
        setConfig({ ...config, ...parsed })
      }
    } catch (error) {
      console.error("Failed to load system config:", error)
    }
  }

  const saveConfig = async () => {
    setIsLoading(true)
    try {
      // 保存到本地存储
      localStorage.setItem("system_config", JSON.stringify(config))

      // 保存到服务器
      const response = await fetch("/api/system/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      })

      if (response.ok) {
        toast({
          title: "配置保存成功",
          description: "系统配置已更新",
        })
      } else {
        throw new Error("Failed to save config to server")
      }
    } catch (error) {
      console.error("Failed to save config:", error)
      toast({
        title: "保存失败",
        description: "配置已保存到本地，但服务器同步失败",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const testSpeechRecognition = async () => {
    setIsTesting(true)
    try {
      const response = await fetch("/api/speech/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          modelId: config.speechRecognition.globalModel,
          config: config.speechRecognition,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "语音识别测试成功",
          description: `模型响应正常，延迟: ${result.latency}ms`,
        })
      } else {
        toast({
          title: "语音识别测试失败",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "测试失败",
        description: "无法连接到语音识别服务",
        variant: "destructive",
      })
    } finally {
      setIsTesting(false)
    }
  }

  const updateSpeechConfig = (updates: Partial<SpeechRecognitionConfig>) => {
    setConfig({
      ...config,
      speechRecognition: {
        ...config.speechRecognition,
        ...updates,
      },
    })
  }

  const updateFastGPTIntegration = (updates: Partial<SpeechRecognitionConfig["fastgptIntegration"]>) => {
    setConfig({
      ...config,
      speechRecognition: {
        ...config.speechRecognition,
        fastgptIntegration: {
          ...config.speechRecognition.fastgptIntegration,
          ...updates,
        },
      },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-green-700 dark:text-green-400">系统参数配置</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadConfig}>
            <RefreshCw className="mr-2 h-4 w-4" />
            重新加载
          </Button>
          <Button onClick={saveConfig} disabled={isLoading} className="bg-[#6cb33f] hover:bg-green-600">
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? "保存中..." : "保存配置"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="speech" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="speech">语音识别</TabsTrigger>
          <TabsTrigger value="general">常规设置</TabsTrigger>
          <TabsTrigger value="security">安全配置</TabsTrigger>
          <TabsTrigger value="performance">性能优化</TabsTrigger>
        </TabsList>

        <TabsContent value="speech" className="space-y-6">
          {/* 全局语音识别模型配置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5 text-green-600" />
                全局语音识别模型
              </CardTitle>
              <CardDescription>配置系统默认的语音识别模型，所有智能体将使用此配置</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="globalModel">语音识别模型</Label>
                  <Select
                    value={config.speechRecognition.globalModel}
                    onValueChange={(value) => updateSpeechConfig({ globalModel: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择语音识别模型" />
                    </SelectTrigger>
                    <SelectContent>
                      {speechModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">识别语言</Label>
                  <Select
                    value={config.speechRecognition.language}
                    onValueChange={(value) => updateSpeechConfig({ language: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="audioFormat">音频格式</Label>
                  <Select
                    value={config.speechRecognition.audioFormat}
                    onValueChange={(value) => updateSpeechConfig({ audioFormat: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AUDIO_FORMATS.map((format) => (
                        <SelectItem key={format.value} value={format.value}>
                          {format.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sampleRate">采样率 (Hz)</Label>
                  <Select
                    value={config.speechRecognition.sampleRate.toString()}
                    onValueChange={(value) => updateSpeechConfig({ sampleRate: Number.parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="8000">8000 Hz</SelectItem>
                      <SelectItem value="16000">16000 Hz (推荐)</SelectItem>
                      <SelectItem value="44100">44100 Hz</SelectItem>
                      <SelectItem value="48000">48000 Hz</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={testSpeechRecognition}
                  disabled={isTesting || !config.speechRecognition.globalModel}
                >
                  <TestTube className="mr-2 h-4 w-4" />
                  {isTesting ? "测试中..." : "测试模型"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* FastGPT集成配置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-600" />
                FastGPT集成配置
              </CardTitle>
              <CardDescription>配置语音识别与FastGPT对话系统的集成参数</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>启用FastGPT集成</Label>
                  <p className="text-sm text-gray-500">将语音识别结果自动发送到FastGPT进行处理</p>
                </div>
                <Switch
                  checked={config.speechRecognition.fastgptIntegration.enabled}
                  onCheckedChange={(checked) => updateFastGPTIntegration({ enabled: checked })}
                />
              </div>

              {config.speechRecognition.fastgptIntegration.enabled && (
                <>
                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>自动发送到对话</Label>
                      <p className="text-sm text-gray-500">识别完成后自动发送到当前对话</p>
                    </div>
                    <Switch
                      checked={config.speechRecognition.fastgptIntegration.autoSendToChat}
                      onCheckedChange={(checked) => updateFastGPTIntegration({ autoSendToChat: checked })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>置信度阈值: {config.speechRecognition.fastgptIntegration.confidenceThreshold}</Label>
                    <p className="text-sm text-gray-500">只有置信度高于此值的识别结果才会发送到FastGPT</p>
                    <Slider
                      value={[config.speechRecognition.fastgptIntegration.confidenceThreshold]}
                      onValueChange={([value]) => updateFastGPTIntegration({ confidenceThreshold: value })}
                      max={1}
                      min={0}
                      step={0.1}
                      className="w-full"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>上下文感知</Label>
                      <p className="text-sm text-gray-500">根据对话上下文优化语音识别结果</p>
                    </div>
                    <Switch
                      checked={config.speechRecognition.fastgptIntegration.enableContextAwareness}
                      onCheckedChange={(checked) => updateFastGPTIntegration({ enableContextAwareness: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>情感检测</Label>
                      <p className="text-sm text-gray-500">检测语音中的情感信息并传递给FastGPT</p>
                    </div>
                    <Switch
                      checked={config.speechRecognition.fastgptIntegration.enableEmotionDetection}
                      onCheckedChange={(checked) => updateFastGPTIntegration({ enableEmotionDetection: checked })}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 识别质量设置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-600" />
                识别质量设置
              </CardTitle>
              <CardDescription>配置语音识别的质量和精度参数</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <Label>自动标点符号</Label>
                  <Switch
                    checked={config.speechRecognition.enableAutomaticPunctuation}
                    onCheckedChange={(checked) => updateSpeechConfig({ enableAutomaticPunctuation: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>流式识别</Label>
                  <Switch
                    checked={config.speechRecognition.enableStreamingRecognition}
                    onCheckedChange={(checked) => updateSpeechConfig({ enableStreamingRecognition: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>中间结果</Label>
                  <Switch
                    checked={config.speechRecognition.interimResults}
                    onCheckedChange={(checked) => updateSpeechConfig({ interimResults: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>说话人分离</Label>
                  <Switch
                    checked={config.speechRecognition.enableSpeakerDiarization}
                    onCheckedChange={(checked) => updateSpeechConfig({ enableSpeakerDiarization: checked })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>最大候选数: {config.speechRecognition.maxAlternatives}</Label>
                <Slider
                  value={[config.speechRecognition.maxAlternatives]}
                  onValueChange={([value]) => updateSpeechConfig({ maxAlternatives: value })}
                  max={10}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>

          {/* 噪音处理 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-purple-600" />
                噪音处理
              </CardTitle>
              <CardDescription>配置音频预处理和噪音消除功能</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <Label>降噪处理</Label>
                  <Switch
                    checked={config.speechRecognition.enableNoiseReduction}
                    onCheckedChange={(checked) => updateSpeechConfig({ enableNoiseReduction: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>回声消除</Label>
                  <Switch
                    checked={config.speechRecognition.enableEchoCancellation}
                    onCheckedChange={(checked) => updateSpeechConfig({ enableEchoCancellation: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>自动增益控制</Label>
                  <Switch
                    checked={config.speechRecognition.enableAutoGainControl}
                    onCheckedChange={(checked) => updateSpeechConfig({ enableAutoGainControl: checked })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>语音活动检测灵敏度: {config.speechRecognition.performance.vadSensitivity}</Label>
                <Slider
                  value={[config.speechRecognition.performance.vadSensitivity]}
                  onValueChange={([value]) =>
                    updateSpeechConfig({
                      performance: { ...config.speechRecognition.performance, vadSensitivity: value },
                    })
                  }
                  max={1}
                  min={0}
                  step={0.1}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>

          {/* 性能配置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-red-600" />
                性能配置
              </CardTitle>
              <CardDescription>配置语音识别的性能和超时参数</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>最大录音时长 (秒)</Label>
                  <Input
                    type="number"
                    value={config.speechRecognition.performance.maxRecordingDuration}
                    onChange={(e) =>
                      updateSpeechConfig({
                        performance: {
                          ...config.speechRecognition.performance,
                          maxRecordingDuration: Number.parseInt(e.target.value),
                        },
                      })
                    }
                    min="10"
                    max="300"
                  />
                </div>

                <div className="space-y-2">
                  <Label>静音超时 (毫秒)</Label>
                  <Input
                    type="number"
                    value={config.speechRecognition.performance.silenceTimeout}
                    onChange={(e) =>
                      updateSpeechConfig({
                        performance: {
                          ...config.speechRecognition.performance,
                          silenceTimeout: Number.parseInt(e.target.value),
                        },
                      })
                    }
                    min="1000"
                    max="10000"
                  />
                </div>

                <div className="space-y-2">
                  <Label>缓冲区大小</Label>
                  <Select
                    value={config.speechRecognition.performance.bufferSize.toString()}
                    onValueChange={(value) =>
                      updateSpeechConfig({
                        performance: {
                          ...config.speechRecognition.performance,
                          bufferSize: Number.parseInt(value),
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1024">1024</SelectItem>
                      <SelectItem value="2048">2048</SelectItem>
                      <SelectItem value="4096">4096 (推荐)</SelectItem>
                      <SelectItem value="8192">8192</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-gray-600" />
                常规设置
              </CardTitle>
              <CardDescription>配置系统的基本信息和默认设置</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>系统名称</Label>
                  <Input
                    value={config.general.systemName}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        general: { ...config.general, systemName: e.target.value },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>默认语言</Label>
                  <Select
                    value={config.general.defaultLanguage}
                    onValueChange={(value) =>
                      setConfig({
                        ...config,
                        general: { ...config.general, defaultLanguage: value },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>系统描述</Label>
                <Textarea
                  value={config.general.systemDescription}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      general: { ...config.general, systemDescription: e.target.value },
                    })
                  }
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>启用分析统计</Label>
                <Switch
                  checked={config.general.enableAnalytics}
                  onCheckedChange={(checked) =>
                    setConfig({
                      ...config,
                      general: { ...config.general, enableAnalytics: checked },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-red-600" />
                安全配置
              </CardTitle>
              <CardDescription>配置系统的安全策略和访问控制</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>启用请求频率限制</Label>
                <Switch
                  checked={config.security.enableRateLimit}
                  onCheckedChange={(checked) =>
                    setConfig({
                      ...config,
                      security: { ...config.security, enableRateLimit: checked },
                    })
                  }
                />
              </div>

              {config.security.enableRateLimit && (
                <div className="space-y-2">
                  <Label>每分钟最大请求数</Label>
                  <Input
                    type="number"
                    value={config.security.maxRequestsPerMinute}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        security: { ...config.security, maxRequestsPerMinute: Number.parseInt(e.target.value) },
                      })
                    }
                    min="1"
                    max="1000"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label>启用审计日志</Label>
                <Switch
                  checked={config.security.enableAuditLog}
                  onCheckedChange={(checked) =>
                    setConfig({
                      ...config,
                      security: { ...config.security, enableAuditLog: checked },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                性能优化
              </CardTitle>
              <CardDescription>配置系统的性能和缓存策略</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>启用缓存</Label>
                <Switch
                  checked={config.performance.enableCaching}
                  onCheckedChange={(checked) =>
                    setConfig({
                      ...config,
                      performance: { ...config.performance, enableCaching: checked },
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>缓存过期时间 (秒)</Label>
                  <Input
                    type="number"
                    value={config.performance.cacheExpiration}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        performance: { ...config.performance, cacheExpiration: Number.parseInt(e.target.value) },
                      })
                    }
                    min="60"
                    max="86400"
                  />
                </div>

                <div className="space-y-2">
                  <Label>最大并发请求数</Label>
                  <Input
                    type="number"
                    value={config.performance.maxConcurrentRequests}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        performance: { ...config.performance, maxConcurrentRequests: Number.parseInt(e.target.value) },
                      })
                    }
                    min="1"
                    max="100"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
