// @ts-nocheck
"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ViewerControls } from "@/components/cad/viewer-controls"

interface CADViewerProps {
  fileUrl: string
  fileName: string
  fileType: string
  metadata?: any
  className?: string
}

export function CADViewer({ fileUrl, fileName, fileType, metadata, className }: CADViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [activeTab, setActiveTab] = useState("preview")
  const [layers, setLayers] = useState<string[]>([])
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set())
  const [showGrid, setShowGrid] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [viewPosition, setViewPosition] = useState({ x: 0, y: 0 })
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Mock loading state for demo purposes
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  // 处理缩放
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.1, 3))
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.1, 0.5))

  // 处理旋转
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360)

  // 处理下载
  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = fileUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // 处理全屏
  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        containerRef.current.requestFullscreen()
      }
    }
  }

  // 处理图层可见性切换
  const toggleLayerVisibility = (layer: string) => {
    setVisibleLayers((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(layer)) {
        newSet.delete(layer)
      } else {
        newSet.add(layer)
      }
      return newSet
    })
  }

  // 重置视图
  const resetView = () => {
    setZoom(1)
    setRotation(0)
    setViewPosition({ x: 0, y: 0 })
  }

  // 处理拖动开始
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  // 处理拖动
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) {return}

    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y

    setViewPosition((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  // 处理拖动结束
  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // 处理鼠标离开
  const handleMouseLeave = () => {
    setIsDragging(false)
  }

  // 获取图层颜色
  const getLayerColor = (index: number) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-red-500",
      "bg-purple-500",
      "bg-yellow-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-orange-500",
    ]
    return colors[index % colors.length]
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative border rounded-xl overflow-hidden bg-background",
        isFullscreen ? "fixed inset-0 z-50" : "h-[500px]",
        className,
      )}
    >
      <ViewerControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onRotate={handleRotate}
        onDownload={handleDownload}
        onToggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
      />

      <div className="absolute top-4 left-4 z-10 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-1.5 text-sm font-medium border">
        {fileName} ({fileType.toUpperCase()})
      </div>

      <div className="h-full w-full flex items-center justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-muted-foreground">加载CAD文件中...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 text-destructive p-4">
            <AlertCircle className="w-10 h-10" />
            <p>加载失败: {error}</p>
            <Button variant="outline" size="sm" onClick={() => setIsLoading(true)}>
              重试
            </Button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transition: "transform 0.3s ease",
            }}
            className="w-full h-full"
          >
            {/* 这里是CAD渲染区域，实际项目中应该集成真实的CAD渲染库 */}
            <canvas
              ref={canvasRef}
              className="w-full h-full"
              style={{ background: "url('/cad-model-preview.png')" }}
            />
          </motion.div>
        )}
      </div>
    </div>
  )
}
