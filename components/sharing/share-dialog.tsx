// @ts-nocheck
"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Copy, Share2, Download, Eye, Lock, Globe, Calendar, Users } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { shareManager, type ShareConfig } from "@/lib/sharing/share-manager"

interface ShareDialogProps {
  contentId: string
  contentType: "conversation" | "cad_analysis" | "poster_design"
  contentTitle: string
  trigger?: React.ReactNode
  onShare?: (shareUrl: string) => void
}

export function ShareDialog({ contentId, contentType, contentTitle, trigger, onShare }: ShareDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [shareUrl, setShareUrl] = useState("")
  const [config, setConfig] = useState<ShareConfig>({
    expiresIn: 7 * 24 * 60 * 60 * 1000, // 7天
    allowDownload: true,
    allowCopy: true,
    viewLimit: 1000,
    isPublic: false,
    password: "",
  })
  const { toast } = useToast()

  const handleCreateShare = async () => {
    try {
      setIsLoading(true)

      const shareLink = await shareManager.createShareLink(contentId, contentType, config)
      const fullUrl = `${window.location.origin}${shareLink.url}`

      setShareUrl(fullUrl)
      onShare?.(fullUrl)

      toast({
        title: "分享链接已创建",
        description: "链接已复制到剪贴板",
      })

      // 自动复制到剪贴板
      await navigator.clipboard.writeText(fullUrl)
    } catch (error) {
      console.error("创建分享链接失败:", error)
      toast({
        title: "创建失败",
        description: "无法创建分享链接，请重试",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast({
        title: "已复制",
        description: "分享链接已复制到剪贴板",
      })
    } catch (error) {
      toast({
        title: "复制失败",
        description: "无法复制链接，请手动复制",
        variant: "destructive",
      })
    }
  }

  const getExpiryOptions = () => [
    { value: 60 * 60 * 1000, label: "1小时" },
    { value: 24 * 60 * 60 * 1000, label: "1天" },
    { value: 7 * 24 * 60 * 60 * 1000, label: "7天" },
    { value: 30 * 24 * 60 * 60 * 1000, label: "30天" },
    { value: 0, label: "永不过期" },
  ]

  const getViewLimitOptions = () => [
    { value: 10, label: "10次" },
    { value: 50, label: "50次" },
    { value: 100, label: "100次" },
    { value: 500, label: "500次" },
    { value: 1000, label: "1000次" },
    { value: 0, label: "无限制" },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            分享
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Share2 className="h-5 w-5 mr-2 text-[#6cb33f]" />
            分享 "{contentTitle}"
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!shareUrl ? (
            <>
              {/* 分享设置 */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiry">过期时间</Label>
                    <Select
                      value={config.expiresIn?.toString() || "0"}
                      onValueChange={(value) =>
                        setConfig((prev) => ({ ...prev, expiresIn: Number.parseInt(value) || undefined }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getExpiryOptions().map((option) => (
                          <SelectItem key={option.value} value={option.value.toString()}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="viewLimit">查看限制</Label>
                    <Select
                      value={config.viewLimit?.toString() || "0"}
                      onValueChange={(value) =>
                        setConfig((prev) => ({ ...prev, viewLimit: Number.parseInt(value) || undefined }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getViewLimitOptions().map((option) => (
                          <SelectItem key={option.value} value={option.value.toString()}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">访问密码（可选）</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="设置访问密码"
                    value={config.password || ""}
                    onChange={(e) => setConfig((prev) => ({ ...prev, password: e.target.value }))}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4 text-gray-500" />
                      <Label htmlFor="public">公开分享</Label>
                    </div>
                    <Switch
                      id="public"
                      checked={config.isPublic}
                      onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, isPublic: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Download className="h-4 w-4 text-gray-500" />
                      <Label htmlFor="download">允许下载</Label>
                    </div>
                    <Switch
                      id="download"
                      checked={config.allowDownload}
                      onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, allowDownload: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Copy className="h-4 w-4 text-gray-500" />
                      <Label htmlFor="copy">允许复制</Label>
                    </div>
                    <Switch
                      id="copy"
                      checked={config.allowCopy}
                      onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, allowCopy: checked }))}
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={handleCreateShare}
                disabled={isLoading}
                className="w-full bg-[#6cb33f] hover:bg-[#5a9635]"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    创建中...
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4 mr-2" />
                    创建分享链接
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              {/* 分享链接结果 */}
              <div className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center mb-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full mr-2" />
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">分享链接已创建</span>
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-300">链接已自动复制到剪贴板</div>
                </div>

                <div className="space-y-2">
                  <Label>分享链接</Label>
                  <div className="flex space-x-2">
                    <Input value={shareUrl} readOnly className="font-mono text-sm" />
                    <Button variant="outline" size="icon" onClick={handleCopyUrl}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    {config.expiresIn ? `${Math.ceil(config.expiresIn / (24 * 60 * 60 * 1000))}天后过期` : "永不过期"}
                  </div>
                  <div className="flex items-center">
                    <Eye className="h-4 w-4 mr-2" />
                    {config.viewLimit ? `限制${config.viewLimit}次查看` : "无查看限制"}
                  </div>
                  <div className="flex items-center">
                    <Lock className="h-4 w-4 mr-2" />
                    {config.password ? "需要密码" : "无密码保护"}
                  </div>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    {config.isPublic ? "公开分享" : "私密分享"}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShareUrl("")
                      setConfig({
                        expiresIn: 7 * 24 * 60 * 60 * 1000,
                        allowDownload: true,
                        allowCopy: true,
                        viewLimit: 1000,
                        isPublic: false,
                        password: "",
                      })
                    }}
                    className="flex-1"
                  >
                    重新创建
                  </Button>
                  <Button onClick={() => setIsOpen(false)} className="flex-1 bg-[#6cb33f] hover:bg-[#5a9635]">
                    完成
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
