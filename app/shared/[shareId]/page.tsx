// @ts-nocheck
"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Share2, Download, Copy, Lock, Eye, Calendar, User, AlertCircle, ExternalLink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { motion } from "framer-motion"
import type { ShareContent, ShareLink } from "@/lib/sharing/enhanced-share-manager"

export default function SharedContentPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const shareId = params.shareId as string

  const [content, setContent] = useState<ShareContent | null>(null)
  const [shareLink, setShareLink] = useState<ShareLink | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [needsPassword, setNeedsPassword] = useState(false)

  useEffect(() => {
    if (shareId) {
      loadSharedContent()
    }
  }, [shareId])

  const loadSharedContent = async (passwordAttempt?: string) => {
    try {
      setIsLoading(true)
      setError(null)

      const url = new URL(`/api/shared/${shareId}`, window.location.origin)
      if (passwordAttempt) {
        url.searchParams.set("password", passwordAttempt)
      }

      const response = await fetch(url.toString())
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          setNeedsPassword(true)
          setError("请输入访问密码")
        } else {
          setError(data.error || "加载失败")
        }
        return
      }

      setContent(data.content)
      setShareLink(data.shareLink)
      setNeedsPassword(false)
    } catch (error) {
      setError("网络错误，请稍后重试")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordSubmit = () => {
    if (!password.trim()) {
      toast({
        title: "请输入密码",
        variant: "destructive",
      })
      return
    }
    loadSharedContent(password)
  }

  const handleDownload = async () => {
    if (!shareLink?.config.allowDownload) {
      toast({
        title: "下载被禁用",
        description: "分享者不允许下载此内容",
        variant: "destructive",
      })
      return
    }

    // Implement download logic based on content type
    toast({
      title: "开始下载",
      description: "正在准备下载文件...",
    })
  }

  const handleCopy = async () => {
    if (!shareLink?.config.allowCopy) {
      toast({
        title: "复制被禁用",
        description: "分享者不允许复制此内容",
        variant: "destructive",
      })
      return
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(content, null, 2))
      toast({
        title: "已复制",
        description: "内容已复制到剪贴板",
      })
    } catch (error) {
      toast({
        title: "复制失败",
        description: "请手动复制内容",
        variant: "destructive",
      })
    }
  }

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case "conversation":
        return "对话记录"
      case "cad_analysis":
        return "CAD分析报告"
      case "poster_design":
        return "海报设计"
      default:
        return "分享内容"
    }
  }

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case "conversation":
        return "💬"
      case "cad_analysis":
        return "🔧"
      case "poster_design":
        return "🎨"
      default:
        return "📄"
    }
  }

  const renderContent = () => {
    if (!content) {return null}

    switch (content.type) {
      case "conversation":
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">对话内容</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {content.content.messages?.map((message: any, index: number) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg ${
                    message.role === "user" ? "bg-blue-50 dark:bg-blue-900/20 ml-8" : "bg-gray-50 dark:bg-gray-800 mr-8"
                  }`}
                >
                  <div className="text-sm font-medium mb-1">{message.role === "user" ? "用户" : "AI助手"}</div>
                  <div className="text-sm">{message.content}</div>
                </div>
              ))}
            </div>
          </div>
        )

      case "cad_analysis":
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">CAD分析结果</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">文件信息</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>文件名: {content.metadata.fileName}</div>
                    <div>文件大小: {content.metadata.fileSize}</div>
                    <div>分析时间: {new Date(content.createdAt).toLocaleString()}</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">分析统计</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>设备数量: {content.content.deviceCount || 0}</div>
                    <div>风险等级: {content.content.riskLevel || "未知"}</div>
                    <div>完整性: {content.content.completeness || "未知"}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )

      case "poster_design":
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">海报设计</h3>
            {content.metadata.imageUrl && (
              <div className="flex justify-center">
                <img
                  src={content.metadata.imageUrl || "/placeholder.svg"}
                  alt="海报设计"
                  className="max-w-full max-h-96 rounded-lg shadow-lg"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>风格: {content.metadata.style}</div>
              <div>尺寸: {content.metadata.size}</div>
              <div>配色: {content.metadata.palette}</div>
              <div>创建时间: {new Date(content.createdAt).toLocaleString()}</div>
            </div>
          </div>
        )

      default:
        return (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">暂不支持此类型内容的预览</p>
          </div>
        )
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        >
          <Share2 className="h-8 w-8 text-[#6cb33f]" />
        </motion.div>
      </div>
    )
  }

  if (needsPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Lock className="h-12 w-12 text-[#6cb33f] mx-auto mb-4" />
            <CardTitle>需要访问密码</CardTitle>
            <CardDescription>此分享内容受密码保护</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="请输入访问密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handlePasswordSubmit()}
              />
            </div>
            <Button onClick={handlePasswordSubmit} className="w-full">
              访问内容
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !needsPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle>访问失败</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/")} className="w-full">
              返回首页
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!content || !shareLink) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <CardTitle>内容不存在</CardTitle>
            <CardDescription>分享的内容可能已被删除或不存在</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/")} className="w-full">
              返回首页
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {/* Header */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{getContentTypeIcon(content.type)}</div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-xl">{content.title}</CardTitle>
                      <Badge variant="secondary">{getContentTypeLabel(content.type)}</Badge>
                    </div>
                    {shareLink.description && (
                      <CardDescription className="text-base">{shareLink.description}</CardDescription>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        分享者
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(shareLink.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {shareLink.stats.views} 次查看
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {shareLink.config.allowCopy && (
                    <Button variant="outline" size="sm" onClick={handleCopy}>
                      <Copy className="h-4 w-4 mr-1" />
                      复制
                    </Button>
                  )}
                  {shareLink.config.allowDownload && (
                    <Button variant="outline" size="sm" onClick={handleDownload}>
                      <Download className="h-4 w-4 mr-1" />
                      下载
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Content */}
          <Card>
            <CardContent className="p-6">{renderContent()}</CardContent>
          </Card>

          {/* Footer */}
          <div className="mt-6 text-center">
            <Button variant="outline" onClick={() => router.push("/")}>
              <ExternalLink className="h-4 w-4 mr-2" />
              访问 AI多智能体宇宙平台
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
