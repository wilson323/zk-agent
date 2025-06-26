// @ts-nocheck
"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Upload, FileUp, Check, AlertCircle, Loader2, Settings, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useAgUiCad } from "@/hooks/use-ag-ui-cad"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface CADFileUploaderProps {
  onAnalysisComplete: (result: any) => void
  className?: string
}

interface CADAnalysisConfig {
  enableStructureAnalysis: boolean
  enableDeviceDetection: boolean
  enableRiskAssessment: boolean
  enableComplianceCheck: boolean
  detectionSensitivity: "low" | "medium" | "high"
  riskThreshold: "conservative" | "balanced" | "aggressive"
  complianceStandards: string[]
  generateReport: boolean
  reportFormat: "pdf" | "docx"
  includeImages: boolean
  includeRecommendations: boolean
}

interface AdvancedAnalysisConfigProps {
  config: CADAnalysisConfig
  onConfigChange: (config: CADAnalysisConfig) => void
  onClose: () => void
}

function AdvancedAnalysisConfig({ config, onConfigChange, onClose }: AdvancedAnalysisConfigProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">高级分析配置</h2>
        {/* Implement your config options here */}
        <div>
          {/* Example: */}
          <label className="block mb-2">
            Enable Structure Analysis:
            <input
              type="checkbox"
              checked={config.enableStructureAnalysis}
              onChange={(e) => onConfigChange({ ...config, enableStructureAnalysis: e.target.checked })}
            />
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={onClose}>保存</Button>
        </div>
      </div>
    </div>
  )
}

export function CADFileUploader({ onAnalysisComplete, className }: CADFileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { analyzeFile, isLoading, error: analysisError } = useAgUiCad()

  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false)
  const [analysisConfig, setAnalysisConfig] = useState<CADAnalysisConfig>({
    enableStructureAnalysis: true,
    enableDeviceDetection: true,
    enableRiskAssessment: true,
    enableComplianceCheck: true,
    detectionSensitivity: "medium",
    riskThreshold: "balanced",
    complianceStandards: ["GB50348-2018", "GA/T75-1994"],
    generateReport: true,
    reportFormat: "pdf",
    includeImages: true,
    includeRecommendations: true,
  })

  const [uploadHistory, setUploadHistory] = useState<File[]>([])
  const [analysisQueue, setAnalysisQueue] = useState<File[]>([])
  const [batchMode, setBatchMode] = useState(false)
  const batchInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      validateAndSetFile(files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0])
    }
  }

  const handleBatchFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach((file) => {
        validateAndSetFile(file)
      })
    }
  }

  const validateAndSetFile = async (file: File) => {
    setError(null)

    // 检查文件是否已经上传过
    if (uploadHistory.some((f) => f.name === file.name && f.size === file.size)) {
      setError("该文件已经上传过，请选择其他文件。")
      return
    }

    // 检查文件内容完整性
    const isValid = await validateFileContent(file)
    if (!isValid) {
      setError("文件内容验证失败，可能文件已损坏。")
      return
    }

    // 添加到历史记录
    setUploadHistory((prev) => [...prev.slice(-4), file]) // 保留最近5个文件

    // Check file type
    const validExtensions = [".dwg", ".dxf", ".step", ".stp", ".iges", ".igs", ".stl"]
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase()

    if (!validExtensions.includes(fileExtension)) {
      setError(`不支持的文件类型。请上传 ${validExtensions.join(", ")} 格式的文件。`)
      return
    }

    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setError("文件大小不能超过50MB。")
      return
    }

    setFile(file)
    simulateUploadProgress()
  }

  const validateFileContent = async (file: File): Promise<boolean> => {
    try {
      const buffer = await file.arrayBuffer()
      const view = new Uint8Array(buffer)

      // 检查文件是否为空
      if (view.length === 0) {return false}

      // 检查文件头部
      const extension = file.name.split(".").pop()?.toLowerCase()
      switch (extension) {
        case "dwg":
          return view[0] === 0x41 && view[1] === 0x43 // "AC"
        case "dxf":
          const text = new TextDecoder().decode(view.slice(0, 100))
          return text.includes("SECTION")
        default:
          return true
      }
    } catch {
      return false
    }
  }

  const simulateUploadProgress = () => {
    setUploadProgress(0)
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 5
      })
    }, 100)
  }

  const handleAnalyze = async () => {
    if (!file) {return}

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("config", JSON.stringify(analysisConfig))

      const result = await analyzeFile(formData)
      if (result) {
        onAnalysisComplete(result)
      }
    } catch (err) {
      console.error("CAD分析失败:", err)
    }
  }

  const resetUpload = () => {
    setFile(null)
    setUploadProgress(0)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className={cn("w-full max-w-3xl mx-auto", className)}>
      <AnimatePresence>
        {!file ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "border-2 border-dashed rounded-xl p-8 transition-all duration-200 bg-background",
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
              "flex flex-col items-center justify-center gap-4 text-center",
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-8 h-8 text-primary" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold">上传CAD文件</h3>
              <p className="text-muted-foreground max-w-md">
                拖放文件到此处，或点击下方按钮选择文件。支持 .dwg, .dxf, .step, .stp, .iges, .igs, .stl 格式。
              </p>
            </div>

            <div className="flex gap-4 mt-4">
              <Button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2">
                <FileUp className="w-4 h-4" />
                选择文件
              </Button>

              <Button variant="outline" onClick={() => setBatchMode(!batchMode)} className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                {batchMode ? "单文件模式" : "批量模式"}
              </Button>
            </div>

            {batchMode && (
              <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">批量上传模式</h4>
                <p className="text-sm text-muted-foreground mb-3">可以同时上传多个CAD文件进行批量分析</p>
                <input
                  type="file"
                  multiple
                  onChange={handleBatchFileChange}
                  className="hidden"
                  accept=".dwg,.dxf,.step,.stp,.iges,.igs,.stl"
                  ref={batchInputRef}
                />
                <Button variant="outline" onClick={() => batchInputRef.current?.click()} className="w-full">
                  选择多个文件
                </Button>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".dwg,.dxf,.step,.stp,.iges,.igs,.stl"
            />

            {error && (
              <div className="flex items-center gap-2 text-destructive mt-2">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border rounded-xl p-6 bg-card shadow-sm"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileUp className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium truncate max-w-[200px] sm:max-w-[300px]">{file.name}</h4>
                    <p className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                </div>

                {uploadProgress === 100 && (
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>上传进度</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleAnalyze} disabled={uploadProgress < 100 || isLoading} className="flex-1">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      分析中...
                    </>
                  ) : (
                    "开始分析"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAdvancedConfig(true)}
                  disabled={isLoading}
                  className="px-3"
                >
                  <Settings className="w-4 h-4" />
                </Button>
                <Button variant="outline" onClick={resetUpload} disabled={isLoading}>
                  重新上传
                </Button>
              </div>

              {analysisError && (
                <div className="flex items-center gap-2 text-destructive mt-2 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>分析失败: {analysisError}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {showAdvancedConfig && (
        <AdvancedAnalysisConfig
          config={analysisConfig}
          onConfigChange={setAnalysisConfig}
          onClose={() => setShowAdvancedConfig(false)}
        />
      )}
      {uploadHistory.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">最近上传的文件</h4>
          <div className="space-y-2">
            {uploadHistory.slice(-3).map((historyFile, index) => (
              <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileUp className="w-3 h-3" />
                <span className="truncate">{historyFile.name}</span>
                <span>({(historyFile.size / (1024 * 1024)).toFixed(1)}MB)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
