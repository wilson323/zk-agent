// @ts-nocheck
"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Share2, Copy, Check } from "lucide-react"
import { enhancedShareManager, type ShareConfig } from "@/lib/sharing/enhanced-share-manager"
import { useToast } from "@/hooks/use-toast"

interface EnhancedShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: ShareConfig
}

export function EnhancedShareDialog({ open, onOpenChange, config }: EnhancedShareDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [shareResult, setShareResult] = useState<any>(null)
  const [shareConfig, setShareConfig] = useState<ShareConfig>(config)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const handleGenerateShare = async () => {
    setIsGenerating(true)
    try {
      const result = await enhancedShareManager.generateSharePoster(shareConfig)

      if (result.success) {
        setShareResult(result)
        toast({
          title: "分享海报生成成功",
          description: "您可以下载或复制链接分享",
        })
      } else {
        toast({
          title: "生成失败",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "生成失败",
        description: "请稍后重试",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyLink = async () => {
    if (shareResult?.imageUrl) {
      try {
        await navigator.clipboard.writeText(shareResult.imageUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        toast({
          title: "链接已复制",
          description: "分享链接已复制到剪贴板",
        })
      } catch (error) {
        toast({
          title: "复制失败",
          description: "请手动复制链接",
          variant: "destructive",
        })
      }
    }
  }

  const handleDownload = async (format: "jpg" | "png" | "pdf") => {
    if (shareResult?.shareId) {
      await enhancedShareManager.downloadShare(shareResult.shareId, format)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-[#6cb33f]" />
            分享内容
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!shareResult ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="title">分享标题</Label>
                <Input
                  id="title"
                  value={shareConfig.title}
                  onChange={(e) => setShareConfig({ ...shareConfig, title: e.target.value })}
                  placeholder="输入分享标题"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">描述（可选）</Label>
                <Input
                  id="description"
                  value={shareConfig.description || ""}
                  onChange={(e) => setShareConfig({ ...shareConfig, description: e.target.value })}
                  placeholder="输入描述信息"
                />
              </div>

              <div className="space-y-2">
                <Label>图片质量</Label>
                <Select
                  value={shareConfig.quality || "web"}
                  onValueChange={(value: "web" | "print" | "high") =>
                    setShareConfig({ ...shareConfig, quality: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="web">网络质量</SelectItem>
                    <SelectItem value="print">打印质量</SelectItem>
                    <SelectItem value="high">高清质量</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="watermark"
                  checked={shareConfig.watermark || false}
                  onCheckedChange={(checked) => setShareConfig({ ...shareConfig, watermark: checked })}
                />
                <Label htmlFor="watermark">添加水印</Label>
              </div>

              <Button
                onClick={handleGenerateShare}
                disabled={isGenerating}
                className="w-full bg-[#6cb33f] hover:bg-green-600"
              >
                {isGenerating ? "生成中..." : "生成分享海报"}
              </Button>
            </>
          ) : (
            <>
              <div className="text-center space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <img
                    src={shareResult.imageUrl || "/placeholder.svg"}
                    alt="分享预览"
                    className="w-full h-32 object-cover rounded"
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleCopyLink} variant="outline" className="flex-1">
                    {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                    {copied ? "已复制" : "复制链接"}
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button onClick={() => handleDownload("jpg")} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    JPG
                  </Button>
                  <Button onClick={() => handleDownload("png")} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    PNG
                  </Button>
                  <Button onClick={() => handleDownload("pdf")} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    PDF
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
