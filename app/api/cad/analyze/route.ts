/**
 * @file cad\analyze\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs, CommonValidations } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { ErrorCode } from '@/types/core';
import { CADFileProcessor } from "../../../../lib/cad/cad-file-processor"
import { DeviceRecognitionEngine } from "../../../../lib/cad/device-recognition-engine"
import { CADAnalyzer } from "../../../../lib/cad/cad-analyzer"
import { ReportGenerator } from "../../../../lib/cad/report-generator"
import { ErrorRetryManager } from "../../../../lib/chat/error-retry-manager"
import { AdvancedCacheManager } from "../../../../lib/cache/advanced-cache-manager"

// 初始化实例
const fileProcessor = new CADFileProcessor()
const deviceEngine = new DeviceRecognitionEngine()
const retryManager = new ErrorRetryManager()
const cacheManager = new AdvancedCacheManager()
const reportGenerator = new ReportGenerator()

// 性能指标记录函数
async function recordPerformanceMetrics(metrics: {
  requestId: string
  processingTime: number
  fileSize: number
  success: boolean
  error?: string
}) {
  console.log(`[Performance] ${metrics.requestId}: ${metrics.processingTime}ms, ${metrics.fileSize} bytes, success: ${metrics.success}`)
  if (metrics.error) {
    console.error(`[Performance Error] ${metrics.requestId}: ${metrics.error}`)
  }
}

// 单文件处理函数
async function processSingleFile(file: File, config: any) {
  const analyzer = new CADAnalyzer(config)
  
  const fileInfo = {
    id: `file_${Date.now()}`,
    name: file.name,
    size: file.size,
    type: file.name.split(".").pop()?.toLowerCase() || "unknown",
    userId: "current_user",
  }
  
  const analysisResult = await analyzer.analyze(fileBuffer, file.name, (progress) => {
      // 进度回调处理
      console.log(`分析进度: ${progress.stage} - ${progress.progress}% - ${progress.message}`)
    })
  
  return {
    fileInfo,
    analysis: analysisResult,
    timestamp: new Date().toISOString(),
  }
}

export const GET = createApiRoute(
  RouteConfigs.publicGet(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const { searchParams } = new URL(req.url)
      const action = validatedQuery?.action
    
      switch (action) {
        case "stats":
          // 返回分析统计信息
          const retryStats = retryManager.getStats()
          const cacheStats = cacheManager.getMetrics()
          
          return ApiResponseWrapper.success({
            retryStats,
            cacheStats
          })
        default:
          return ApiResponseWrapper.error(ErrorCode.VALIDATION_ERROR, "Invalid action", null)
      }
    } catch (error) {
      console.error("CAD analyze GET error:", error)
      return ApiResponseWrapper.error(
        "获取分析信息失败",
        { status: 500 }
      )
    }
  }
);

export const POST = createApiRoute(
  RouteConfigs.protectedPost(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    const startTime = Date.now()
    const currentRequestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    let file: File | null = null
    
    try {
      console.log(`[${currentRequestId}] CAD分析请求开始`)
  
      const formData = await req.formData()
      file = formData.get("file") as File
      const configStr = formData.get("config") as string
  
      if (!file) {
        return ApiResponseWrapper.error(ErrorCode.VALIDATION_ERROR, "缺少文件", null)
      }
    
        // 解析配置
        const config = configStr
          ? JSON.parse(configStr)
          : {
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
            }
    
        // 生成缓存键
        const cacheKey = `cad_analysis_${file.name}_${file.size}_${JSON.stringify(config)}`
    
        // 检查缓存
        const cachedResult = await cacheManager.get(cacheKey)
        if (cachedResult) {
          console.log("返回缓存的分析结果")
          return ApiResponseWrapper.success(cachedResult)
        }
    
        // 在POST方法中添加批量处理支持
        if (formData.has("files")) {
          // 批量文件处理
          const files = formData.getAll("files") as File[]
          const batchConfig = JSON.parse((formData.get("batchConfig") as string) || "{}")
    
          // 创建批量分析任务
          const batchId = `batch_${Date.now()}`
          const results = new Map<string, any>()
    
          // 设置Server-Sent Events for real-time progress
          const headers = new Headers({
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          })
    
          const stream = new ReadableStream({
            start(controller) {
              const processFiles = async () => {
                for (let i = 0; i < files.length; i++) {
                  const file = files[i]
                  try {
                    // 发送进度更新
                    controller.enqueue(
                      `data: ${JSON.stringify({
                        type: "progress",
                        batchId,
                        fileIndex: i,
                        fileName: file.name,
                        progress: (i / files.length) * 100,
                        stage: "processing",
                      })}\n\n`,
                    )
    
                    // 处理单个文件
                    const fileResult = await processSingleFile(file, config)
                    results.set(file.name, fileResult)
    
                    // 发送文件完成通知
                    controller.enqueue(
                      `data: ${JSON.stringify({
                        type: "file_complete",
                        batchId,
                        fileIndex: i,
                        fileName: file.name,
                        result: fileResult,
                      })}\n\n`,
                    )
                  } catch (error) {
                    // 发送文件错误通知
                    controller.enqueue(
                      `data: ${JSON.stringify({
                        type: "file_error",
                        batchId,
                        fileIndex: i,
                        fileName: file.name,
                        error: error.message,
                      })}\n\n`,
                    )
                  }
                }
    
                // 发送批量完成通知
                controller.enqueue(
                  `data: ${JSON.stringify({
                    type: "batch_complete",
                    batchId,
                    results: Object.fromEntries(results),
                  })}\n\n`,
                )
    
                controller.close()
              }
    
              processFiles().catch((error) => {
                controller.enqueue(
                  `data: ${JSON.stringify({
                    type: "batch_error",
                    batchId,
                    error: error.message,
                  })}\n\n`,
                )
                controller.close()
              })
            },
          })
    
          return new Response(stream, { headers })
        }
    
        // 使用重试机制执行分析
        const result = await retryManager.executeWithRetry(async () => {
          // 1. 验证文件
          const validation = await fileProcessor.validateFile(file)
          if (!validation.valid) {
            throw new Error(validation.error)
          }
    
          // 2. 解析文件
          const metadata = await fileProcessor.parseFile(file, config)
    
          // 3. 设备识别
          const devices = await deviceEngine.recognizeDevices(metadata)
    
          // 4. 创建分析器并执行分析
          const analyzer = new CADAnalyzer(config)
    
          const fileInfo = {
            id: `file_${Date.now()}`,
            name: file.name,
            size: file.size,
            type: file.name.split(".").pop()?.toLowerCase() || "unknown",
            userId: "current_user", // 实际应用中从认证信息获取
          }
    
          const analysisResult = await analyzer.analyze(fileBuffer, file.name, (progress) => {
      // 进度回调处理
      console.log(`分析进度: ${progress.stage} - ${progress.progress}% - ${progress.message}`)
    })
    
          // 5. 生成报告
          if (config.generateReport) {
            const reportGenerator = new ReportGenerator({
              format: config.reportFormat,
              includeImages: config.includeImages,
              includeRecommendations: config.includeRecommendations,
            })
    
            analysisResult.reportUrl = await reportGenerator.generateReport(analysisResult, {
              format: config.reportFormat,
              includeImages: config.includeImages,
              includeRecommendations: config.includeRecommendations,
              includeAppendix: true,
              language: "zh-CN"
            })
          }
    
          return {
            success: true,
            data: analysisResult,
            metadata: {
              processingTime: Date.now() - Date.now(),
              cacheKey,
              version: "2.1.0",
            },
          }
        }, {
          strategy: {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
            jitter: true
          },
          onRetry: (error, attempt) => {
            console.log(`CAD分析重试 ${attempt}: ${error.message}`)
          },
          onFailure: (error, attempts) => {
            console.error(`CAD分析失败，已重试${attempts}次: ${error.message}`)
          }
        })
    
        // 缓存结果
        await cacheManager.set(cacheKey, result, {
          ttl: 3600000, // 1小时
          tags: ["cad_analysis", "user_data"],
        })
    
        const processingTime = Date.now() - startTime
        console.log(`[${currentRequestId}] CAD分析完成，耗时: ${processingTime}ms`)
    
        // 记录性能指标
        await recordPerformanceMetrics({
          requestId: currentRequestId,
          processingTime,
          fileSize: file.size,
          success: true,
        })
    
        return ApiResponseWrapper.success(result)
    } catch (error) {
      const processingTime = Date.now() - startTime
      console.error(`[${currentRequestId}] CAD分析失败，耗时: ${processingTime}ms`, error)
    
      // 记录错误指标
      await recordPerformanceMetrics({
        requestId: currentRequestId,
        processingTime,
        fileSize: file?.size || 0,
        success: false,
        error: error.message,
      })
    
      return ApiResponseWrapper.error(
        error instanceof Error ? error.message : "分析过程中发生未知错误",
        { status: 500 }
      )
    }
  }
);

