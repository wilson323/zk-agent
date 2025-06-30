// @ts-nocheck
"use client"

import type React from "react"

import type React from "react"
import { useState, useRef } from "react"
import { FileUp, Check, AlertCircle, Loader2, Settings, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useAgUiCad } from "@/hooks/use-ag-ui-cad"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { FileUploader } from "@/components/common/file-uploader" // Import the new FileUploader

interface CADFileUploaderProps {
  onAnalysisComplete: (result: any) => void
  className?: string
}

import type { CADAnalysisConfig, DEFAULT_CAD_ANALYSIS_CONFIG } from "@/lib/cad/constants"

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
  const [file, setFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null) // For CAD specific errors
  const { analyzeFile, isLoading, error: analysisError } = useAgUiCad()

  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false)
  const [analysisConfig, setAnalysisConfig] = useState<CADAnalysisConfig>(DEFAULT_CAD_ANALYSIS_CONFIG)

  const [uploadHistory, setUploadHistory] = useState<File[]>([])
  const [batchMode, setBatchMode] = useState(false) // Keep batch mode for now, might refactor later

  const validExtensions = [".dwg", ".dxf", ".step", ".stp", ".iges", ".igs", ".stl"]
  const maxFileSizeMB = 50

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

  const handleFileChange = async (selectedFile: File | null) => {
    setFile(selectedFile)
    setError(null) // Clear previous CAD specific errors

    if (selectedFile) {
      // Check if file already uploaded
      if (uploadHistory.some((f) => f.name === selectedFile.name && f.size === selectedFile.size)) {
        setError("该文件已经上传过，请选择其他文件。")
        setFile(null) // Clear the selected file if it's a duplicate
        return
      }

      // Perform CAD specific content validation
      const isValidContent = await validateFileContent(selectedFile)
      if (!isValidContent) {
        setError("文件内容验证失败，可能文件已损坏。")
        setFile(null) // Clear the selected file if content is invalid
        return
      }
      // Add to history only if valid
      setUploadHistory((prev) => [...prev.slice(-4), selectedFile]) // Keep last 5 files
    }
  }

  const handleUploadProgress = (progress: number) => {
    setUploadProgress(progress)
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
      setError(`CAD分析失败: ${err.message || err}`)
    }
  }

  const resetUploader = () => {
    setFile(null)
    setUploadProgress(0)
    setError(null)
  }

  return (
    <div className={cn("w-full max-w-3xl mx-auto", className)}>
      <FileUploader
        onFileChange={handleFileChange}
        onUploadProgress={handleUploadProgress}
        allowedFileTypes={validExtensions}
        maxFileSize={maxFileSizeMB}
        initialFile={file}
      >
        {file && ( // Only render these buttons if a file is selected in FileUploader
          <div className="flex gap-3 pt-2">
            <Button onClick={handleAnalyze} disabled={uploadProgress < 100 || isLoading || !!error} className="flex-1">
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
              disabled={isLoading || !!error}
              className="px-3"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={resetUploader} disabled={isLoading}>
              重新上传
            </Button>
          </div>
        )}
      </FileUploader>

      {error && ( // Display CAD specific errors
        <div className="flex items-center gap-2 text-destructive mt-2 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

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

