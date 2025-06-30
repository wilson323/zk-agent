// @ts-nocheck
"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import {
  Palette,
  Download,
  Upload,
  Sparkles,
  RefreshCw,
  Eye,
  Layers,
  ImageIcon,
  Zap,
  History,
  Share2,
  Settings2,
  Wand2,
  Crop,
  Filter,
  Brush,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import TemplateSelector from "./template-selector"
import type { PosterTemplate as Template } from "@/lib/poster/template-system"

import { POSTER_STYLES, POSTER_SIZES, COLOR_PALETTES, PosterStyle, PosterSize, ColorPalette } from "@/lib/poster/constants"

export default function PosterGeneratorInterface() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [description, setDescription] = useState("")
  const [selectedStyle, setSelectedStyle] = useState("")
  const [selectedSize, setSelectedSize] = useState("")
  const [selectedPalette, setSelectedPalette] = useState("")
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [uploadedReference, setUploadedReference] = useState<string | null>(null)
  const [generationHistory, setGenerationHistory] = useState<GenerationHistory[]>([])
  const [activeTab, setActiveTab] = useState("create")
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null)

  // 高级设置
  const [creativity, setCreativity] = useState([0.7])
  const [quality, setQuality] = useState([0.8])
  const [useAI, setUseAI] = useState(true)
  const [autoEnhance, setAutoEnhance] = useState(true)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // 生成海报
  const handleGenerate = useCallback(async () => {
    if (!description.trim()) {
      toast({
        title: "请输入创意描述",
        description: "请先描述您想要的海报内容",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)

    try {
      // 调用新的AI生成API
      const response = await fetch("/api/poster/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: description.trim(),
          style: selectedStyle,
          size: selectedSize,
          palette: selectedPalette,
          templateId: selectedTemplate, // 添加这行
          referenceImageUrl: uploadedReference,
          timestamp: new Date(),
        }),
      })

      if (!response.ok) {
        throw new Error("生成失败")
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "生成失败")
      }

      setGeneratedImage(result.data.imageUrl)

      // 添加到历史记录
      const newHistory: GenerationHistory = {
        id: result.data.id,
        prompt: description,
        style: selectedStyle,
        timestamp: new Date(),
        imageUrl: result.data.imageUrl,
        settings: {
          size: selectedSize,
          palette: selectedPalette,
          creativity: creativity[0],
          quality: quality[0],
          aiModel: result.data.metadata.aiModel,
          seed: result.data.metadata.seed,
        },
      }

      setGenerationHistory((prev) => [newHistory, ...prev.slice(0, 9)])

      toast({
        title: "海报生成成功！",
        description: `使用${result.data.metadata.aiModel}模型，耗时${Math.round(result.data.metadata.generationTime / 1000)}秒`,
      })
    } catch (error) {
      console.error("Poster generation failed:", error)
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "请稍后重试或联系技术支持",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }, [
    description,
    selectedStyle,
    selectedSize,
    selectedPalette,
    selectedTemplate,
    uploadedReference,
    creativity,
    quality,
    toast,
  ])

  // 上传参考图片
  const handleReferenceUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          // 10MB限制
          toast({
            title: "文件过大",
            description: "请选择小于10MB的图片文件",
            variant: "destructive",
          })
          return
        }

        const reader = new FileReader()
        reader.onload = (e) => {
          setUploadedReference(e.target?.result as string)
          toast({
            title: "参考图片上传成功",
            description: "AI将参考此图片进行设计",
          })
        }
        reader.readAsDataURL(file)
      }
    },
    [toast],
  )

  // 下载海报
  const handleDownload = useCallback(
    async (format: string) => {
      if (!generatedImage) {return}

      setIsGenerating(true)

      try {
        const response = await fetch("/api/poster/export", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageUrl: generatedImage,
            format,
            config: {
              quality: quality[0],
              width: selectedSize === "a4" ? 2480 : selectedSize === "a3" ? 3508 : 1080,
              height: selectedSize === "a4" ? 3508 : selectedSize === "a3" ? 4961 : 1080,
              dpi: 300,
              compression: true,
              watermark: {
                enabled: false,
              },
            },
          }),
        })

        if (!response.ok) {
          throw new Error("导出失败")
        }

        const result = await response.json()

        if (result.success && result.downloadUrl) {
          // 触发下载
          const link = document.createElement("a")
          link.href = result.downloadUrl
          link.download = `poster_${Date.now()}.${format}`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)

          toast({
            title: `${format.toUpperCase()}导出成功`,
            description: `文件大小: ${(result.fileSize / 1024 / 1024).toFixed(2)}MB`,
          })
        } else {
          throw new Error(result.error || "导出失败")
        }
      } catch (error) {
        console.error("Export failed:", error)
        toast({
          title: "导出失败",
          description: error instanceof Error ? error.message : "请稍后重试",
          variant: "destructive",
        })
      } finally {
        setIsGenerating(false)
      }
    },
    [generatedImage, quality, selectedSize, toast],
  )

  // 从历史记录恢复
  const handleRestoreFromHistory = useCallback(
    (historyItem: GenerationHistory) => {
      setDescription(historyItem.prompt)
      setSelectedStyle(historyItem.style)
      setSelectedSize(historyItem.settings.size)
      setSelectedPalette(historyItem.settings.palette)
      setCreativity([historyItem.settings.creativity])
      setQuality([historyItem.settings.quality])
      setGeneratedImage(historyItem.imageUrl)
      setActiveTab("create")

      toast({
        title: "已恢复历史设置",
        description: "您可以在此基础上继续编辑",
      })
    },
    [toast],
  )

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20">
      {/* 左侧控制面板 */}
      <div className="w-full lg:w-1/3 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create">创作</TabsTrigger>
            <TabsTrigger value="templates">模板</TabsTrigger>
            <TabsTrigger value="history">历史</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6">
            {/* 创意描述 */}
            <Card className="border-purple-200 dark:border-purple-800">
              <CardHeader>
                <CardTitle className="flex items-center text-purple-700 dark:text-purple-300">
                  <Sparkles className="mr-2 h-5 w-5" />
                  创意描述
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="详细描述您想要的海报内容、主题、风格、元素等..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
                {useAI && (
                  <div className="mt-3 flex items-center gap-2">
                    <Wand2 className="h-4 w-4 text-purple-500" />
                    <span className="text-sm text-purple-600 dark:text-purple-400">AI将智能优化您的描述</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 模板选择 */}
            <TemplateSelector
              onTemplateSelect={(template) => {
                setSelectedTemplate(template.id)
                setCurrentTemplate(template)

                // 自动应用模板内容
                if (template.metadata.tags.length > 0) {
                  setDescription((prev) => prev || `创建一个${template.name}风格的海报，${template.description}`)
                }

                toast({
                  title: "模板已选择",
                  description: `已选择"${template.name}"模板`,
                })
              }}
              selectedTemplate={selectedTemplate}
            />

            {/* 风格选择 */}
            <Card className="border-purple-200 dark:border-purple-800">
              <CardHeader>
                <CardTitle className="flex items-center text-purple-700 dark:text-purple-300">
                  <Palette className="mr-2 h-5 w-5" />
                  设计风格
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {POSTER_STYLES.map((style) => (
                    <motion.div
                      key={style.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedStyle === style.id
                          ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:border-purple-300"
                      }`}
                      onClick={() => setSelectedStyle(style.id)}
                    >
                      <img
                        src={style.preview || "/placeholder.svg"}
                        alt={style.name}
                        className="w-full h-16 object-cover rounded mb-2"
                      />
                      <h4 className="font-medium text-sm">{style.name}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{style.description}</p>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 尺寸和配色 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-purple-200 dark:border-purple-800">
                <CardHeader>
                  <CardTitle className="text-sm text-purple-700 dark:text-purple-300">
                    <Crop className="mr-2 h-4 w-4 inline" />
                    尺寸
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={selectedSize} onValueChange={setSelectedSize}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择尺寸" />
                    </SelectTrigger>
                    <SelectContent>
                      {POSTER_SIZES.map((size) => (
                        <SelectItem key={size.id} value={size.id}>
                          <div>
                            <div className="font-medium">{size.name}</div>
                            <div className="text-xs text-gray-500">{size.dimensions}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card className="border-purple-200 dark:border-purple-800">
                <CardHeader>
                  <CardTitle className="text-sm text-purple-700 dark:text-purple-300">
                    <Filter className="mr-2 h-4 w-4 inline" />
                    配色
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={selectedPalette} onValueChange={setSelectedPalette}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择配色" />
                    </SelectTrigger>
                    <SelectContent>
                      {COLOR_PALETTES.map((palette) => (
                        <SelectItem key={palette.id} value={palette.id}>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              {palette.colors.map((color, index) => (
                                <div key={index} className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                              ))}
                            </div>
                            <span>{palette.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </div>

            {/* 高级设置 */}
            <Card className="border-purple-200 dark:border-purple-800">
              <CardHeader>
                <CardTitle className="text-sm text-purple-700 dark:text-purple-300">
                  <Settings2 className="mr-2 h-4 w-4 inline" />
                  高级设置
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">创意度</label>
                    <span className="text-sm text-gray-500">{Math.round(creativity[0] * 100)}%</span>
                  </div>
                  <Slider
                    value={creativity}
                    onValueChange={setCreativity}
                    max={1}
                    min={0}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">质量</label>
                    <span className="text-sm text-gray-500">{Math.round(quality[0] * 100)}%</span>
                  </div>
                  <Slider value={quality} onValueChange={setQuality} max={1} min={0} step={0.1} className="w-full" />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">AI智能优化</label>
                  <Switch checked={useAI} onCheckedChange={setUseAI} />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">自动增强</label>
                  <Switch checked={autoEnhance} onCheckedChange={setAutoEnhance} />
                </div>
              </CardContent>
            </Card>

            {/* 参考图片上传 */}
            <Card className="border-purple-200 dark:border-purple-800">
              <CardHeader>
                <CardTitle className="text-sm text-purple-700 dark:text-purple-300">
                  <ImageIcon className="mr-2 h-4 w-4 inline" />
                  参考图片（可选）
                </CardTitle>
              </CardHeader>
              <CardContent>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleReferenceUpload}
                  className="hidden"
                />
                <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  上传参考图片
                </Button>
                {uploadedReference && (
                  <div className="mt-3">
                    <img
                      src={uploadedReference || "/placeholder.svg"}
                      alt="Reference"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 生成按钮 */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 h-12"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  AI正在创作中...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  生成海报
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <Card className="border-purple-200 dark:border-purple-800">
              <CardHeader>
                <CardTitle className="text-purple-700 dark:text-purple-300">
                  <Layers className="mr-2 h-5 w-5 inline" />
                  精选模板
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <motion.div key={i} whileHover={{ scale: 1.05 }} className="relative group cursor-pointer">
                      <img
                        src={`/template_text.png?height=120&width=90&text=Template+${i}`}
                        alt={`Template ${i}`}
                        className="w-full rounded-lg shadow-md"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <Button size="sm" variant="secondary">
                          使用模板
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card className="border-purple-200 dark:border-purple-800">
              <CardHeader>
                <CardTitle className="text-purple-700 dark:text-purple-300">
                  <History className="mr-2 h-5 w-5 inline" />
                  生成历史
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GenerationHistoryList history={generationHistory} onRestore={handleRestoreFromHistory} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* 右侧预览区域 */}
      <div className="flex-1">
        <Card className="h-full border-purple-200 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-purple-700 dark:text-purple-300">
              <div className="flex items-center">
                <Eye className="mr-2 h-5 w-5" />
                实时预览
              </div>
              {generatedImage && (
                <DownloadButtons onDownload={handleDownload} generatedImage={generatedImage} />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-full flex items-center justify-center">
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div
                  key="generating"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center"
                >
                  <div className="relative">
                    <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mb-4"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Brush className="h-6 w-6 text-purple-500" />
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-2">AI正在为您创作海报...</p>
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                    <Sparkles className="h-4 w-4" />
                    <span>
                      运用{selectedStyle ? POSTER_STYLES.find((s) => s.id === selectedStyle)?.name : "智能"}风格
                    </span>
                  </div>
                </motion.div>
              ) : generatedImage ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="max-w-md w-full"
                >
                  <div className="relative group">
                    <img
                      src={generatedImage || "/placeholder.svg"}
                      alt="Generated Poster"
                      className="w-full rounded-lg shadow-lg"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <Button variant="secondary" size="sm">
                        <Eye className="mr-2 h-4 w-4" />
                        全屏预览
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-center gap-2 flex-wrap">
                    {selectedStyle && (
                      <Badge variant="secondary">风格: {POSTER_STYLES.find((s) => s.id === selectedStyle)?.name}</Badge>
                    )}
                    {selectedSize && (
                      <Badge variant="secondary">尺寸: {POSTER_SIZES.find((s) => s.id === selectedSize)?.name}</Badge>
                    )}
                    {selectedPalette && (
                      <Badge variant="secondary">
                        配色: {COLOR_PALETTES.find((p) => p.id === selectedPalette)?.name}
                      </Badge>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center text-gray-500 dark:text-gray-400"
                >
                  <Palette className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">开始您的创意之旅</p>
                  <p className="text-sm">输入创意描述，选择风格，让AI为您创作独特海报</p>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
