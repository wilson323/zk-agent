import type { CADAnalysisResult } from "@/types/cad"

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export const exportCADAnalysis = async (resultId: string, format: "pdf" | "excel" | "json"): Promise<ApiResponse<string>> => {
  try {
    const response = await fetch("/api/cad/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resultId,
        format,
        sections: ["summary", "devices", "risks", "recommendations"],
      }),
    })

    if (!response.ok) {throw new Error("导出失败")}

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `cad-analysis-${Date.now()}.${format}`
    a.click()
    URL.revokeObjectURL(url)
    return { success: true, data: "导出成功" }
  } catch (error: any) {
    console.error("导出失败:", error)
    return { success: false, error: error.message || "导出失败" }
  }
}

export const shareCADAnalysis = async (result: CADAnalysisResult): Promise<ApiResponse<string>> => {
  try {
    const response = await fetch("/api/sharing/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "cad_analysis",
        data: result,
        permissions: { view: true, download: false },
        expiresIn: 7 * 24 * 60 * 60 * 1000, // 7天
      }),
    })

    const { shareUrl } = await response.json()
    await navigator.clipboard.writeText(shareUrl)
    return { success: true, data: shareUrl }
  } catch (error: any) {
    console.error("分享失败:", error)
    return { success: false, error: error.message || "分享失败" }
  }
}

export const advancedExportCADAnalysis = async (resultId: string, options: any): Promise<ApiResponse<string>> => {
  try {
    const response = await fetch("/api/cad/export/advanced", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resultId,
        options,
        customizations: {
          branding: true,
          watermark: false,
          compression: "high",
        },
      }),
    })

    if (!response.ok) {throw new Error("高级导出失败")}

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `advanced-cad-analysis-${Date.now()}.${options.format}`
    a.click()
    URL.revokeObjectURL(url)
    return { success: true, data: "高级导出成功" }
  } catch (error: any) {
    console.error("高级导出失败:", error)
    return { success: false, error: error.message || "高级导出失败" }
  }
}
