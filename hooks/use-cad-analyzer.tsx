// @ts-nocheck
"use client"

import { useState, useCallback, useRef } from "react"
import { StreamOptimizer } from "@/lib/chat/stream-optimizer"
import { ContextMemoryManager } from "@/lib/chat/context-memory-manager"
import { ErrorRetryManager } from "@/lib/chat/error-retry-manager"

export interface CADAnalysisProgress {
  fileId: string
  stage: "parsing" | "structure" | "devices" | "risks" | "compliance" | "report" | "complete"
  progress: number
  message: string
  estimatedTimeRemaining?: number
}

export interface CADAnalysisConfig {
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

export function useCADAnalyzer() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState<CADAnalysisProgress | null>(null)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<any[]>([])

  // 添加新的状态
  const [batchProgress, setBatchProgress] = useState<Map<string, any>>(new Map())
  const [batchResults, setBatchResults] = useState<Map<string, any>>(new Map())
  const [_realTimeUpdates, _setRealTimeUpdates] = useState(true)

  const [analysisQuality, setAnalysisQuality] = useState<"fast" | "balanced" | "thorough">("balanced")
  const [realTimeInsights, setRealTimeInsights] = useState<any[]>([])
  const [performanceProfile, _setPerformanceProfile] = useState<any>(null)

  // 创建管理器实例
  const streamOptimizer = useRef(new StreamOptimizer())
  const memoryManager = useRef(new ContextMemoryManager())
  const retryManager = useRef(new ErrorRetryManager())

  /**
   * 分析CAD文件
   */
  const analyzeFile = useCallback(
    async (file: File, config: Partial<CADAnalysisConfig> = {}) => {
      setIsAnalyzing(true)
      setError(null)
      setResult(null)
      setProgress(null)

      const qualityConfig = {
        fast: {
          enableStructureAnalysis: true,
          enableDeviceDetection: true,
          enableRiskAssessment: false,
          enableComplianceCheck: false,
          detectionSensitivity: "low",
        },
        balanced: {
          enableStructureAnalysis: true,
          enableDeviceDetection: true,
          enableRiskAssessment: true,
          enableComplianceCheck: true,
          detectionSensitivity: "medium",
        },
        thorough: {
          enableStructureAnalysis: true,
          enableDeviceDetection: true,
          enableRiskAssessment: true,
          enableComplianceCheck: true,
          detectionSensitivity: "high",
          enablePredictiveAnalysis: true,
          enableMaterialOptimization: true,
        },
      }

      const finalConfig = { ...qualityConfig[analysisQuality], ...config }

      try {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("config", JSON.stringify(finalConfig))

        // 添加到记忆管理器
        await memoryManager.current.addContext({
          type: "user",
          content: `开始分析CAD文件: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)}MB)`,
          metadata: { fileName: file.name, fileSize: file.size, config },
        })

        // 使用重试机制发送请求
        const response = await retryManager.current.executeWithRetry(async () => {
          const res = await fetch("/api/cad/analyze", {
            method: "POST",
            body: formData,
          })

          if (!res.ok) {
            const errorData = await res.json()
            throw new Error(errorData.error || `HTTP ${res.status}`)
          }

          return res
        })

        // 处理流式响应
        if (response.body) {
          const reader = response.body.getReader()
          const _decoder = new TextDecoder()

          await streamOptimizer.current.optimizeStream(
            new ReadableStream({
              start(controller) {
                function pump(): Promise<void> {
                  return reader.read().then(({ done, value }) => {
                    if (done) {
                      controller.close()
                      return
                    }
                    controller.enqueue(value)
                    return pump()
                  })
                }
                return pump()
              },
            }),
            (chunk: string) => {
              try {
                const data = JSON.parse(chunk)

                if (data.type === "progress") {
                  setProgress(data.progress)
                } else if (data.type === "result") {
                  setResult(data.result)
                  setHistory((prev) => [...prev, data.result])
                  generateRealTimeInsights(data.result)
                }
              } catch (e) {
                // 忽略非JSON数据块
              }
            },
            () => {
              setIsAnalyzing(false)
              setProgress({
                fileId: file.name,
                stage: "complete",
                progress: 100,
                message: "分析完成",
              })
            },
            (error: Error) => {
              setError(error.message)
              setIsAnalyzing(false)
            },
          )
        } else {
          // 处理非流式响应
          const data = await response.json()

          if (data.success) {
            setResult(data.data)
            setHistory((prev) => [...prev, data.data])
            generateRealTimeInsights(data.data)

            // 添加成功结果到记忆
            await memoryManager.current.addContext({
              type: "assistant",
              content: `CAD文件分析完成，识别出${data.data.summary?.totalDevices || 0}个设备，${data.data.summary?.totalRisks || 0}个风险点`,
              metadata: { analysisResult: data.data },
            })
          } else {
            throw new Error(data.error || "分析失败")
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "分析过程中发生未知错误"
        setError(errorMessage)

        // 添加错误到记忆
        await memoryManager.current.addContext({
          type: "system",
          content: `CAD文件分析失败: ${errorMessage}`,
          metadata: { error: errorMessage, fileName: file.name },
        })
      } finally {
        setIsAnalyzing(false)
      }
    },
    [analysisQuality, generateRealTimeInsights],
  )

  /**
   * 批量分析多个CAD文件
   */
  const analyzeBatch = useCallback(
    async (
      files: File[],
      config: Partial<CADAnalysisConfig> = {},
      batchConfig: { maxConcurrent?: number; realTimeProgress?: boolean } = {},
    ) => {
      setIsAnalyzing(true)
      setError(null)
      setBatchResults(new Map())
      setBatchProgress(new Map())

      try {
        const formData = new FormData()
        files.forEach((file) => formData.append("files", file))
        formData.append("config", JSON.stringify(config))
        formData.append("batchConfig", JSON.stringify(batchConfig))

        const response = await fetch("/api/cad/analyze", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        // 处理Server-Sent Events
        if (response.headers.get("content-type")?.includes("text/event-stream")) {
          const reader = response.body?.getReader()
          const decoder = new TextDecoder()

          while (reader) {
            const { done, value } = await reader.read()
            if (done) {break}

            const chunk = decoder.decode(value)
            const lines = chunk.split("\n")

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6))
                  handleBatchUpdate(data)
                } catch (e) {
                  // Silently handle parse errors
                }
              }
            }
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "批量分析失败"
        setError(errorMessage)
      } finally {
        setIsAnalyzing(false)
      }
    },
    [handleBatchUpdate],
  )

  /**
   * 处理批量更新
   */
  const handleBatchUpdate = useCallback((data: any) => {
    switch (data.type) {
      case "progress":
        setBatchProgress(
          (prev) =>
            new Map(
              prev.set(data.fileName, {
                progress: data.progress,
                stage: data.stage,
              }),
            ),
        )
        break

      case "file_complete":
        setBatchResults((prev) => new Map(prev.set(data.fileName, data.result)))
        break

      case "batch_complete":
        setBatchResults(new Map(Object.entries(data.results)))
        setIsAnalyzing(false)
        break

      case "error":
      case "batch_error":
        setError(data.error)
        break
    }
  }, [setBatchProgress, setBatchResults, setIsAnalyzing, setError])

  /**
   * 生成实时分析洞察
   */
  const generateRealTimeInsights = useCallback((partialResult: any) => {
    const insights = []

    if (partialResult.devices?.length > 0) {
      insights.push({
        type: "device_detection",
        message: `已识别 ${partialResult.devices.length} 个设备`,
        confidence: 0.9,
        timestamp: Date.now(),
      })
    }

    if (partialResult.risks?.length > 0) {
      const highRisks = partialResult.risks.filter((r) => r.severity === "high").length
      if (highRisks > 0) {
        insights.push({
          type: "risk_alert",
          message: `发现 ${highRisks} 个高风险问题`,
          confidence: 0.95,
          timestamp: Date.now(),
        })
      }
    }

    setRealTimeInsights((prev) => [...prev, ...insights])
  }, [])

  /**
   * 获取批量分析进度
   */
  const getBatchProgress = useCallback(() => {
    return Array.from(batchProgress.entries()).map(([fileName, progress]) => ({
      fileName,
      ...progress,
    }))
  }, [batchProgress])

  /**
   * 获取批量分析结果
   */
  const getBatchResults = useCallback(() => {
    return Array.from(batchResults.entries()).map(([fileName, result]) => ({
      fileName,
      result,
    }))
  }, [batchResults])

  /**
   * 获取分析历史
   */
  const getAnalysisHistory = useCallback(() => {
    return history
  }, [history])

  /**
   * 清除历史记录
   */
  const clearHistory = useCallback(() => {
    setHistory([])
    memoryManager.current.clearMemory()
  }, [])

  /**
   * 重新分析
   */
  const reanalyze = useCallback(
    async (file: File, config: Partial<CADAnalysisConfig> = {}) => {
      // 清除之前的结果
      setResult(null)
      setError(null)

      // 重新开始分析
      await analyzeFile(file, config)
    },
    [analyzeFile],
  )

  /**
   * 取消分析
   */
  const cancelAnalysis = useCallback(() => {
    setIsAnalyzing(false)
    setProgress(null)
    retryManager.current.cancelAllRetries()
  }, [])

  /**
   * 获取相关上下文
   */
  const getRelevantContext = useCallback(async (query: string) => {
    return await memoryManager.current.getRelevantContext(query)
  }, [])

  /**
   * 获取性能统计
   */
  const getPerformanceStats = useCallback(() => {
    return {
      stream: streamOptimizer.current.getMetrics(),
      memory: memoryManager.current.getStats(),
      retry: retryManager.current.getStats(),
    }
  }, [])

  /**
   * 导出分析结果
   */
  const exportResult = useCallback(
    async (format: "json" | "csv" | "pdf" = "json") => {
      if (!result) {
        throw new Error("没有可导出的分析结果")
      }

      switch (format) {
        case "json": {
          const jsonBlob = new Blob([JSON.stringify(result, null, 2)], {
            type: "application/json",
          })
          return URL.createObjectURL(jsonBlob)
        }

        case "csv": {
          const csvContent = convertToCSV(result)
          const csvBlob = new Blob([csvContent], { type: "text/csv" })
          return URL.createObjectURL(csvBlob)
        }

        case "pdf": {
          // 这里应该调用PDF生成API
          const response = await fetch("/api/cad/export", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ result, format: "pdf" }),
          })

          if (!response.ok) {
            throw new Error("PDF导出失败")
          }

          const pdfBlob = await response.blob()
          return URL.createObjectURL(pdfBlob)
        }

        default:
          throw new Error(`不支持的导出格式: ${format}`)
      }
    },
    [result],
  )

  return {
    // 状态
    isAnalyzing,
    progress,
    result,
    error,
    history,

    // 方法
    analyzeFile,
    reanalyze,
    cancelAnalysis,
    getAnalysisHistory,
    clearHistory,
    getRelevantContext,
    getPerformanceStats,
    exportResult,

    // 工具方法
    resetError: () => setError(null),
    resetResult: () => setResult(null),

    // 新增批量功能
    analyzeBatch,
    batchProgress,
    batchResults,
    getBatchProgress,
    getBatchResults,
    clearBatchResults: () => {
      setBatchResults(new Map())
      setBatchProgress(new Map())
    },

    // 新增高级功能
    analysisQuality,
    setAnalysisQuality,
    realTimeInsights,
    clearRealTimeInsights: () => setRealTimeInsights([]),
    performanceProfile,

    // 高级分析方法
    analyzeWithQuality: (file: File, quality: "fast" | "balanced" | "thorough") => {
      setAnalysisQuality(quality)
      return analyzeFile(file)
    },

    // 批量比较分析
    compareAnalyses: async (results: any[]) => {
      const comparison = {
        deviceCountComparison: results.map((r) => r.summary?.totalDevices || 0),
        riskLevelComparison: results.map((r) => r.summary?.totalRisks || 0),
        complianceScoreComparison: results.map((r) => r.summary?.complianceScore || 0),
      }
      return comparison
    },
  }
}

/**
 * 将分析结果转换为CSV格式
 */
function convertToCSV(result: any): string {
  const lines: string[] = []

  // 添加标题行
  lines.push("类型,ID,名称,类别,状态,位置X,位置Y,位置Z,描述")

  // 添加设备数据
  if (result.devices) {
    result.devices.forEach((device: any) => {
      lines.push(
        [
          "设备",
          device.id,
          device.name,
          device.category,
          device.status,
          device.location?.x || "",
          device.location?.y || "",
          device.location?.z || "",
          device.specifications ? JSON.stringify(device.specifications) : "",
        ].join(","),
      )
    })
  }

  // 添加风险数据
  if (result.risks) {
    result.risks.forEach((risk: any) => {
      lines.push(
        [
          "风险",
          risk.id,
          risk.title,
          risk.category,
          risk.severity,
          risk.location?.coordinates?.x || "",
          risk.location?.coordinates?.y || "",
          risk.location?.coordinates?.z || "",
          risk.description,
        ].join(","),
      )
    })
  }

  return lines.join("\n")
}
