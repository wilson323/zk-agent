// @ts-nocheck
"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Palette, Download, Upload, Sparkles, RefreshCw, Eye, ImageIcon } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { PosterGenerationRequest, PosterGenerationResult } from "@/types/poster"

// 严格按照设计文档的海报风格定义
const POSTER_STYLES = [
  { id: "modern", name: "现代简约", description: "简洁线条，几何元素" },
  { id: "vintage", name: "复古风格", description: "怀旧色调，经典排版" },
  { id: "minimalist", name: "极简主义", description: "留白设计，纯净美学" },
  { id: "artistic", name: "艺术创意", description: "抽象表现，创意构图" },
  { id: "business", name: "商务专业", description: "专业可信，企业形象" },
]

const POSTER_SIZES = [
  { id: "a4", name: "A4 (210×297mm)", ratio: "3:4" },
  { id: "a3", name: "A3 (297×420mm)", ratio: "3:4" },
  { id: "square", name: "正方形 (1080×1080px)", ratio: "1:1" },
  { id: "story", name: "故事版 (1080×1920px)", ratio: "9:16" },
  { id: "banner", name: "横幅 (1920×1080px)", ratio: "16:9" },
]

const COLOR_PALETTES = [
  { id: "warm", name: "暖色调", colors: ["#FF6B6B", "#FFE66D", "#FF8E53"] },
  { id: "cool", name: "冷色调", colors: ["#4ECDC4", "#45B7D1", "#96CEB4"] },
  { id: "monochrome", name: "单色调", colors: ["#2C3E50", "#34495E", "#7F8C8D"] },
  { id: "vibrant", name: "鲜艳色彩", colors: ["#E74C3C", "#F39C12", "#9B59B6"] },
  { id: "pastel", name: "柔和色彩", colors: ["#F8BBD9", "#E8F5E8", "#FFF2CC"] },
  { id: "brand", name: "品牌色", colors: ["#6CB33F", "#8ED658", "#A8E6A3"] },
]

interface PosterGeneratorContainerProps {
  className?: string
}

export default function PosterGeneratorContainer({ className }: PosterGeneratorContainerProps) {
  // 状态管理 - 严格类型定义
  const [description, setDescription] = useState<string>("")
  const [selectedStyle, setSelectedStyle] = useState<string>("")
  const [selectedSize, setSelectedSize] = useState<string>("")
  const [selectedPalette, setSelectedPalette] = useState<string>("")
  const [referenceImage, setReferenceImage] = useState<string | null>(null)
  const [generatedResult, setGeneratedResult] = useState<PosterGenerationResult | null>(null)
  const [isGenerating, setIsGenerating] = useState<boolean>(false)

  const { toast } = useToast()

  // 生成海报 - 按照业务流程设计
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
      const request: PosterGenerationRequest = {
        description: description.trim(),
        style: selectedStyle,
        size: selectedSize,
        palette: selectedPalette,
        referenceImageUrl: referenceImage,
        timestamp: new Date(),
      }

      // 调用API生成海报
      const response = await fetch("/api/poster/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        throw new Error("生成失败")
      }

      const result: PosterGenerationResult = await response.json()
      setGeneratedResult(result)

      toast({
        title: "海报生成成功！",
        description: "您的创意海报已生成完成",
      })
    } catch (error) {
      console.error("Poster generation failed:", error)
      toast({
        title: "生成失败",
        description: "请稍后重试或联系技术支持",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }, [description, selectedStyle, selectedSize, selectedPalette, referenceImage, toast])

  // 参考图片上传
  const handleImageUpload = useCallback(
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
          setReferenceImage(e.target?.result as string)
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

  // 导出功能
  const handleExport = useCallback(
    (format: "jpg" | "png" | "pdf") => {
      if (!generatedResult) {return}

      toast({
        title: `正在导出${format.toUpperCase()}`,
        description: "文件将自动下载到您的设备",
      })

      // 模拟下载
      const link = document.createElement("a")
      link.href = generatedResult.imageUrl
      link.download = `poster_${Date.now()}.${format}`
      link.click()
    },
    [generatedResult, toast],
  )

  return (
    <div className={`flex flex-col lg:flex-row gap-6 ${className}`}>
      {/* 左侧参数面板 - 按照设计文档布局 */}
      <div className="w-full lg:w-1/3 space-y-6">
        {/* 创意描述输入 */}
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="flex items-center text-green-700 dark:text-green-300">
              <Sparkles className="mr-2 h-5 w-5" />
              创意描述
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="详细描述您想要的海报内容、主题、风格等..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[120px] resize-none"
            />
          </CardContent>
        </Card>

        {/* 风格选择 */}
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="text-green-700 dark:text-green-300">设计风格</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedStyle} onValueChange={setSelectedStyle}>
              <SelectTrigger>
                <SelectValue placeholder="选择设计风格" />
              </SelectTrigger>
              <SelectContent>
                {POSTER_STYLES.map((style) => (
                  <SelectItem key={style.id} value={style.id}>
                    <div>
                      <div className="font-medium">{style.name}</div>
                      <div className="text-xs text-gray-500">{style.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* 尺寸和配色 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-green-200 dark:border-green-800">
            <CardHeader>
              <CardTitle className="text-sm text-green-700 dark:text-green-300">尺寸</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedSize} onValueChange={setSelectedSize}>
                <SelectTrigger>
                  <SelectValue placeholder="选择尺寸" />
                </SelectTrigger>
                <SelectContent>
                  {POSTER_SIZES.map((size) => (
                    <SelectItem key={size.id} value={size.id}>
                      {size.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="border-green-200 dark:border-green-800">
            <CardHeader>
              <CardTitle className="text-sm text-green-700 dark:text-green-300">配色</CardTitle>
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

        {/* 参考图片上传 */}
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="text-sm text-green-700 dark:text-green-300">
              <ImageIcon className="mr-2 h-4 w-4 inline" />
              参考图片（可选）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="reference-upload" />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => document.getElementById("reference-upload")?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              上传参考图片
            </Button>
            {referenceImage && (
              <div className="mt-3">
                <img
                  src={referenceImage || "/placeholder.svg"}
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
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 h-12"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              生成海报
            </>
          )}
        </Button>
      </div>

      {/* 右侧实时预览区 - 按照设计文档布局 */}
      <div className="flex-1">
        <Card className="h-full border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-green-700 dark:text-green-300">
              <div className="flex items-center">
                <Eye className="mr-2 h-5 w-5" />
                实时预览
              </div>
              {generatedResult && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleExport("jpg")}>
                    <Download className="mr-1 h-4 w-4" />
                    JPG
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleExport("png")}>
                    <Download className="mr-1 h-4 w-4" />
                    PNG
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleExport("pdf")}>
                    <Download className="mr-1 h-4 w-4" />
                    PDF
                  </Button>
                </div>
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
                  <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-green-500 border-t-transparent mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-300">AI正在为您生成创意海报...</p>
                </motion.div>
              ) : generatedResult ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="max-w-md w-full"
                >
                  <img
                    src={generatedResult.imageUrl || "/placeholder.svg"}
                    alt="Generated Poster"
                    className="w-full rounded-lg shadow-lg"
                  />
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
