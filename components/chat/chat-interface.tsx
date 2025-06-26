// @ts-nocheck
"use client"

import { useState } from "react"
import { useCADAnalyzer } from "@/hooks/use-cad-analyzer"
import { CADAnalysisResult } from "@/components/cad/cad-analysis-result"
import { Progress } from "@/components/ui/progress"

const ChatInterface = () => {
  const [showCADAnalysisOptions, setShowCADAnalysisOptions] = useState(false)
  const [uploadedCADFiles, setUploadedCADFiles] = useState<File[]>([])

  const { analyzeFile, isAnalyzing, progress, result: cadResult, error: cadError } = useCADAnalyzer()

  const [analysisHistory, setAnalysisHistory] = useState<any[]>([])
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false)
  const [selectedAnalysisResult, setSelectedAnalysisResult] = useState<any>(null)

  const handleFileUpload = async (files: File[]) => {
    const cadFiles = files.filter((file) => /\.(dwg|dxf|step|stp|iges|igs|stl|obj|3ds|ply)$/i.test(file.name))

    const imageFiles = files.filter((file) => /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file.name))

    const documentFiles = files.filter((file) => /\.(pdf|doc|docx|txt|md)$/i.test(file.name))

    if (cadFiles.length > 0) {
      setShowCADAnalysisOptions(true)
      setUploadedCADFiles(cadFiles)
    }

    if (imageFiles.length > 0) {
      await handleImageUpload(imageFiles)
    }

    if (documentFiles.length > 0) {
      await handleDocumentUpload(documentFiles)
    }
  }

  const handleAnalysisComplete = (result: any) => {
    setAnalysisHistory((prev) => [...prev, result])
    setSelectedAnalysisResult(result)
    setShowAnalysisPanel(true)

    // 将分析结果添加到聊天消息中
    const analysisMessage = {
      id: `analysis_${Date.now()}`,
      type: "analysis_result",
      content: `CAD分析完成：识别出${result.summary?.totalDevices || 0}个设备，${result.summary?.totalRisks || 0}个风险点`,
      result: result,
      timestamp: new Date(),
    }

    // 添加到消息列表的逻辑
  }

  const handleExportResult = () => {
    // Implement export functionality
    console.log("Exporting CAD result")
  }

  const handleShareResult = () => {
    // Implement share functionality
    console.log("Sharing CAD result")
  }

  const handleRegularFileUpload = async (files: File[]) => {
    // Implement regular file upload functionality
    console.log("Uploading regular files", files)
  }

  const handleImageUpload = async (files: File[]) => {
    // Implement image file upload functionality
    console.log("Uploading image files", files)
  }

  const handleDocumentUpload = async (files: File[]) => {
    // Implement document file upload functionality
    console.log("Uploading document files", files)
  }

  return (
    <div>
      <h1>Chat Interface</h1>
      <input
        type="file"
        multiple
        onChange={(e) => {
          if (e.target.files) {
            handleFileUpload(Array.from(e.target.files))
          }
        }}
      />

      {cadResult && (
        <div className="mt-4">
          <CADAnalysisResult result={cadResult} onExport={handleExportResult} onShare={handleShareResult} />
        </div>
      )}

      {isAnalyzing && progress && (
        <div className="mt-4 p-4 border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">CAD分析进度</span>
            <span className="text-sm text-muted-foreground">{progress.progress}%</span>
          </div>
          <Progress value={progress.progress} className="mb-2" />
          <p className="text-xs text-muted-foreground">{progress.message}</p>
        </div>
      )}
    </div>
  )
}

export default ChatInterface
