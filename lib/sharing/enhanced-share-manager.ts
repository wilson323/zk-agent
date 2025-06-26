// @ts-nocheck
/**
 * 增强分享管理器
 * 专注于海报图片分享功能
 */

export interface ShareConfig {
  type: "poster" | "cad_report" | "chat_export"
  title: string
  description?: string
  imageUrl?: string
  watermark?: boolean
  quality?: "web" | "print" | "high"
}

export interface ShareResult {
  success: boolean
  shareId?: string
  imageUrl?: string
  downloadUrl?: string
  error?: string
}

export class EnhancedShareManager {
  /**
   * 生成分享海报
   */
  async generateSharePoster(config: ShareConfig): Promise<ShareResult> {
    try {
      const response = await fetch("/api/sharing/generate-poster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })

      const result = await response.json()

      if (result.success) {
        return {
          success: true,
          shareId: result.shareId,
          imageUrl: result.imageUrl,
          downloadUrl: result.downloadUrl,
        }
      }

      return { success: false, error: result.error }
    } catch (error) {
      return { success: false, error: "生成分享海报失败" }
    }
  }

  /**
   * 下载分享内容
   */
  async downloadShare(shareId: string, format: "jpg" | "png" | "pdf" = "jpg"): Promise<void> {
    try {
      const response = await fetch(`/api/sharing/${shareId}/download?format=${format}`)

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `share-${shareId}.${format}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error("下载失败:", error)
    }
  }
}

export const enhancedShareManager = new EnhancedShareManager()
