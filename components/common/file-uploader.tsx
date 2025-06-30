import type React from "react"
import { useState, useRef } from "react"
import { Upload, FileUp, Check, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

import type React from "react"
import { useState, useRef } from "react"
import { Upload, FileUp, Check, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface FileUploaderProps {
  onFilesChange: (files: File[]) => void // Changed to array
  onUploadProgress?: (progress: number) => void
  allowedFileTypes?: string[] // e.g., [".png", ".jpg"]
  maxFileSize?: number // in MB
  children?: React.ReactNode
  className?: string
  initialFiles?: File[] // Changed to array
  multiple?: boolean // Added multiple prop
}

export function FileUploader({
  onFilesChange,
  onUploadProgress,
  allowedFileTypes,
  maxFileSize,
  children,
  className,
  initialFiles = [],
  multiple = false,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<File[]>(initialFiles) // Changed to array
  const [uploadProgress, setInternalUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (selectedFile: File): boolean => {
    setError(null)

    // Validate file type
    if (allowedFileTypes && allowedFileTypes.length > 0) {
      const fileExtension = "." + selectedFile.name.split(".").pop()?.toLowerCase()
      if (!allowedFileTypes.includes(fileExtension)) {
        setError(`不支持的文件类型。请上传 ${allowedFileTypes.join(", ")} 格式的文件。`)
        return false
      }
    }

    // Validate file size
    if (maxFileSize && selectedFile.size > maxFileSize * 1024 * 1024) {
      setError(`文件大小不能超过 ${maxFileSize}MB。`)
      return false
    }

    return true
  }

  const handleFileSelect = (selectedFiles: File[]) => {
    const validFiles = selectedFiles.filter(validateFile)
    if (validFiles.length > 0) {
      setFiles(multiple ? [...files, ...validFiles] : validFiles) // Handle multiple
      onFilesChange(multiple ? [...files, ...validFiles] : validFiles)
      simulateUploadProgress()
    } else if (selectedFiles.length > 0) {
      // If some files were selected but none were valid, ensure error is shown
      setError(error || "选择的文件无效。")
    }
  }

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

    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      handleFileSelect(droppedFiles)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(Array.from(e.target.files))
    }
  }

  const simulateUploadProgress = () => {
    setInternalUploadProgress(0)
    const interval = setInterval(() => {
      setInternalUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          if (onUploadProgress) onUploadProgress(100)
          return 100
        }
        const newProgress = prev + 5
        if (onUploadProgress) onUploadProgress(newProgress)
        return newProgress
      })
    }, 100)
  }

  const resetUploader = () => {
    setFiles([])
    setInternalUploadProgress(0)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    onFilesChange([])
  }

  return (
    <div className={cn("w-full", className)}>
      <AnimatePresence>
        {files.length === 0 ? (
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
              <h3 className="text-xl font-semibold">拖放文件到此处，或点击选择文件</h3>
              {allowedFileTypes && (
                <p className="text-muted-foreground text-sm">
                  支持格式: {allowedFileTypes.join(", ")}
                </p>
              )}
              {maxFileSize && (
                <p className="text-muted-foreground text-sm">
                  最大文件大小: {maxFileSize}MB
                </p>
              )}
            </div>

            <Button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2">
              <FileUp className="w-4 h-4" />
              选择文件
            </Button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleInputChange}
              className="hidden"
              accept={allowedFileTypes?.join(",")}
              multiple={multiple}
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
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between">
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
              ))}

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>上传进度</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>

              <div className="flex gap-3 pt-2">
                {children} {/* Render children (e.g., analyze button) here */}
                <Button variant="outline" onClick={resetUploader} disabled={uploadProgress < 100}>
                  重新上传
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
