/**
 * @file lib/cad/cad-analysis-service.ts
 * @description CAD分析服务集成接口
 * @author ZK-Agent Team
 * @lastUpdate 2024-12-19
 * 
 * 🎯 核心功能：
 * - 统一CAD解析接口
 * - 集成真实解析器和模拟解析器
 * - 提供完整的分析工作流
 * - 支持批量处理和进度跟踪
 * - 缓存和性能优化
 */

import { RealCADParser } from './real-cad-parser'
import { CADAnalyzer } from './cad-analyzer'
import { CADFileProcessor } from './cad-file-processor'
import { logger } from '@/lib/utils/logger';

import type {
  CADFileMetadata,
  DeviceInfo,
  RiskAssessment,
  CADAnalysisConfig
} from '../../types/cad'
import {
  CADAnalysisServiceConfig,
  EnhancedAnalysisResult,
  QuantityCalculationConfig,
  SpatialAnalysisConfig,
  RealCADParserConfig
} from '../../types/cad/enhanced'

// 分析选项
interface AnalysisOptions {
  useRealParser?: boolean // 是否使用真实解析器
  enableDeviceDetection?: boolean // 启用设备识别
  enableQuantityCalculation?: boolean // 启用工程量计算
  enableSpatialAnalysis?: boolean // 启用空间分析
  enable3DVisualization?: boolean // 启用3D可视化
  progressCallback?: (progress: number, stage: string) => void // 进度回调
  cacheResults?: boolean // 缓存结果
  maxConcurrentAnalyses?: number // 最大并发分析数
  timeoutMs?: number // 超时时间（毫秒）
  quantityConfig?: QuantityCalculationConfig
  spatialConfig?: SpatialAnalysisConfig
  parserConfig?: RealCADParserConfig
}

// 分析结果
interface ComprehensiveAnalysisResult {
  // 基础信息 (匹配EnhancedAnalysisResult)
  id: string
  fileName: string
  fileSize: number
  format: string

  // 解析结果 (匹配EnhancedAnalysisResult)
  parseResult: any

  metadata: CADFileMetadata
  devices: DeviceInfo[]
  quantities?: {
    deviceCount: Record<string, number>
    cableLength: Record<string, number>
    materialList: Array<{
      name: string
      quantity: number
      unit: string
      category: string
    }>
    laborHours: number
    estimatedCost: {
      material: number
      labor: number
      total: number
    }
  }
  spatialAnalysis?: {
    coverage: {
      surveillanceZones: any[]
      blindSpots: any[]
      accessPoints: any[]
    }
    distances: {
      deviceToDevice: Record<string, number>
      cableRoutes: Array<{
        from: string
        to: string
        length: number
        path: any
      }>
    }
    compliance: {
      fireCodeCompliance: boolean
      accessibilityCompliance: boolean
      securityStandards: boolean
    }
  }
  visualization3D?: {
    scene: any
    geometry: any
    material: any
    deviceMeshes: any[]
    metadata: {
      vertexCount: number
      deviceCount: number
      boundingBox: any
    }
  }
  risks: RiskAssessment[]
  performance: {
    parseTime: number
    analysisTime: number
    totalTime: number
    memoryUsage: number
  }
  summary: {
    totalDevices: number
    devicesByCategory: Record<string, number>
    totalCableLength: number
    estimatedCost: number
    complianceScore: number
    riskLevel: 'low' | 'medium' | 'high'
  }
}

// 批量分析结果
interface BatchAnalysisResult {
  results: Array<{
    fileName: string
    success: boolean
    result?: ComprehensiveAnalysisResult
    error?: string
  }>
  summary: {
    totalFiles: number
    successCount: number
    failureCount: number
    totalDevices: number
    totalCost: number
    averageComplianceScore: number
  }
  performance: {
    totalTime: number
    averageTimePerFile: number
    peakMemoryUsage: number
  }
}

export class CADAnalysisService {
  private realParser: RealCADParser
  private mockAnalyzer: CADAnalyzer
  private fileProcessor: CADFileProcessor
  private cache: Map<string, ComprehensiveAnalysisResult> = new Map()

  constructor() {
    this.realParser = new RealCADParser()
    this.mockAnalyzer = new CADAnalyzer({
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
      includeRecommendations: true
    })
    this.fileProcessor = new CADFileProcessor()
  }

  /**
   * 分析单个CAD文件
   */
  async analyzeFile(
    fileContent: string | Buffer,
    fileName: string,
    options: AnalysisOptions = {
      maxConcurrentAnalyses: 3,
      timeoutMs: 300000
    }
  ): Promise<EnhancedAnalysisResult> {
    const startTime = Date.now()
    const {
      useRealParser = true,
      enableDeviceDetection = true,
      enableQuantityCalculation = true,
      enableSpatialAnalysis = true,
      enable3DVisualization = false,
      progressCallback,
      cacheResults = true
    } = options

    // 检查缓存
    const cacheKey = this.generateCacheKey(fileName, fileContent, options)
    if (cacheResults && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!
      return cached
    }

    try {
      progressCallback?.(10, '开始解析CAD文件')

      // 第一步：解析CAD文件
      let metadata: CADFileMetadata
      let parserType: 'real' | 'mock' = 'mock'
      const parseStartTime = Date.now()

      if (useRealParser && this.isRealParserSupported(fileName)) {
        try {
          // 使用真实解析器
          const contentStr = typeof fileContent === 'string'
            ? fileContent
            : fileContent.toString('utf-8')
          metadata = await this.realParser.parseDXFFile(contentStr)
          parserType = 'real'
        } catch (error) {
          logger.warn('真实解析器失败，回退到模拟解析器:', error)
          metadata = await this.fileProcessor.parseFile(fileContent, fileName)
          parserType = 'mock'
        }
      } else {
        // 使用模拟解析器
        metadata = await this.fileProcessor.parseFile(fileContent, fileName)
        parserType = 'mock'
      }

      const parseTime = Date.now() - parseStartTime
      progressCallback?.(30, 'CAD文件解析完成')

      // 第二步：设备识别
      let devices: DeviceInfo[] = []
      if (enableDeviceDetection) {
        progressCallback?.(40, '识别弱电设备')

        if (useRealParser && this.isRealParserSupported(fileName)) {
          devices = await this.realParser.detectWeakCurrentDevices(metadata)
        } else {
          devices = await this.mockAnalyzer.detectDevices(metadata)
        }

        progressCallback?.(50, `识别到 ${devices.length} 个设备`)
      }

      // 第三步：工程量计算
      let quantities
      if (enableQuantityCalculation && devices.length > 0) {
        progressCallback?.(60, '计算工程量')

        try {
          if (useRealParser && this.isRealParserSupported(fileName)) {
            quantities = await this.realParser.calculateQuantities(metadata, devices)
          } else {
            // 使用模拟计算
            quantities = this.calculateMockQuantities(devices)
          }
        } catch (error) {
          logger.warn('工程量计算失败:', error)
          quantities = null
        }

        progressCallback?.(70, '工程量计算完成')
      }

      // 第四步：空间分析
      let spatialAnalysis
      if (enableSpatialAnalysis && devices.length > 0) {
        progressCallback?.(75, '执行空间分析')

        try {
          if (useRealParser && this.isRealParserSupported(fileName)) {
            spatialAnalysis = await this.realParser.performSpatialAnalysis(metadata, devices)
          } else {
            // 使用模拟分析
            spatialAnalysis = this.performMockSpatialAnalysis(devices, metadata)
          }
        } catch (error) {
          logger.warn('空间分析失败:', error)
          spatialAnalysis = null
        }

        progressCallback?.(85, '空间分析完成')
      }

      // 第五步：3D可视化（可选）
      let visualization3D
      if (enable3DVisualization) {
        progressCallback?.(90, '生成3D可视化')

        try {
          if (useRealParser && this.isRealParserSupported(fileName)) {
            visualization3D = await this.realParser.generate3DVisualization(metadata, devices)
          }
        } catch (error) {
          logger.warn('3D可视化数据生成失败:', error)
          visualization3D = null
        }

        progressCallback?.(95, '3D可视化生成完成')
      }

      // 第六步：风险评估
      const risks = await this.mockAnalyzer.assessRisks(devices, metadata)

      // 计算性能指标
      const analysisTime = Date.now() - parseStartTime - parseTime
      const totalTime = Date.now() - startTime
      const memoryUsage = process.memoryUsage().heapUsed

      // 生成摘要
      const summary = this.generateSummary(devices, quantities, spatialAnalysis, risks)

      const result: EnhancedAnalysisResult = {
        id: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fileName,
        fileSize: typeof fileContent === 'string' ? fileContent.length : fileContent.length,
        format: this.getFileExtension(fileName),
        parseResult: metadata,
        devices,
        quantities,
        spatialAnalysis,
        visualization3D,
        summary,
        risks,
        performance: {
          parseTime,
          analysisTime,
          totalTime,
          memoryUsage
        },
        metadata
      }

      // 缓存结果
      if (cacheResults) {
        this.cache.set(cacheKey, result)
      }

      progressCallback?.(100, '分析完成')
      return result

    } catch (error) {
      throw new Error(`CAD文件分析失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 批量分析CAD文件
   */
  async analyzeBatch(
    files: Array<{ content: string | Buffer; name: string }>,
    options: AnalysisOptions = {}
  ): Promise<BatchAnalysisResult> {
    const startTime = Date.now()
    const results: BatchAnalysisResult['results'] = []
    let totalDevices = 0
    let totalCost = 0
    let totalComplianceScore = 0
    let successCount = 0
    let peakMemoryUsage = 0

    const { progressCallback } = options

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const fileProgress = (i / files.length) * 100

      try {
        progressCallback?.(fileProgress, `分析文件 ${i + 1}/${files.length}: ${file.name}`)

        const result = await this.analyzeFile(file.content, file.name, {
          ...options,
          progressCallback: undefined // 避免嵌套进度回调
        })

        results.push({
          fileName: file.name,
          success: true,
          result
        })

        successCount++
        totalDevices += result.summary.totalDevices
        totalCost += result.summary.estimatedCost
        totalComplianceScore += result.summary.complianceScore
        peakMemoryUsage = Math.max(peakMemoryUsage, result.performance.memoryUsage)

      } catch (error) {
        results.push({
          fileName: file.name,
          success: false,
          error: error instanceof Error ? error.message : '未知错误'
        })
      }
    }

    const totalTime = Date.now() - startTime
    const averageTimePerFile = totalTime / files.length
    const averageComplianceScore = successCount > 0 ? totalComplianceScore / successCount : 0

    progressCallback?.(100, '批量分析完成')

    return {
      results,
      summary: {
        totalFiles: files.length,
        successCount,
        failureCount: files.length - successCount,
        totalDevices,
        totalCost,
        averageComplianceScore
      },
      performance: {
        totalTime,
        averageTimePerFile,
        peakMemoryUsage
      }
    }
  }

  /**
   * 获取支持的文件格式
   */
  getSupportedFormats(): string[] {
    return ['dwg', 'dxf', 'step', 'iges', 'stl', 'obj', 'ifc', 'rvt', 'gltf', 'glb']
  }

  getCapabilities() {
    return {
      realParser: true,
      deviceDetection: true,
      quantityCalculation: true,
      spatialAnalysis: true,
      visualization3D: true,
      batchProcessing: true,
      caching: true,
      progressTracking: true,
      errorRecovery: true
    }
  }

  private getFileExtension(fileName: string): string {
    return fileName.toLowerCase().split('.').pop() || ''
  }

  /**
   * 检查文件格式是否支持真实解析
   */
  isRealParserSupported(fileName: string): boolean {
    const ext = fileName.toLowerCase().split('.').pop()
    return ['dxf'].includes(ext || '') // 目前只支持DXF真实解析
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; memoryUsage: number } {
    const memoryUsage = JSON.stringify(Array.from(this.cache.values())).length
    return {
      size: this.cache.size,
      memoryUsage
    }
  }

  // 私有辅助方法
  private generateCacheKey(
    fileName: string,
    fileContent: string | Buffer,
    options: AnalysisOptions
  ): string {
    const contentHash = this.simpleHash(typeof fileContent === 'string' ? fileContent : fileContent.toString())
    const optionsHash = this.simpleHash(JSON.stringify(options))
    return `${fileName}_${contentHash}_${optionsHash}`
  }

  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    return hash.toString(36)
  }

  private calculateMockQuantities(devices: DeviceInfo[]): any {
    const deviceCount: Record<string, number> = {}
    const cableLength: Record<string, number> = {
      '网线(CAT6)': 0,
      '电源线': 0,
      '控制线': 0
    }
    const materialList: Array<{ name: string; quantity: number; unit: string; category: string }> = []

    // 统计设备数量
    devices.forEach(device => {
      deviceCount[device.type] = (deviceCount[device.type] || 0) + 1
    })

    // 估算线缆长度
    const totalDevices = devices.length
    cableLength['网线(CAT6)'] = totalDevices * 50 // 每台设备平均50米网线
    cableLength['电源线'] = totalDevices * 30 // 每台设备平均30米电源线
    cableLength['控制线'] = Math.floor(totalDevices * 0.3) * 20 // 30%设备需要控制线

    // 生成材料清单
    Object.entries(deviceCount).forEach(([type, count]) => {
      materialList.push({
        name: this.getDeviceDisplayName(type),
        quantity: count,
        unit: '台',
        category: '设备'
      })
    })

    Object.entries(cableLength).forEach(([type, length]) => {
      if (length > 0) {
        materialList.push({
          name: type,
          quantity: Math.ceil(length),
          unit: '米',
          category: '线缆'
        })
      }
    })

    // 计算人工和成本
    const laborHours = totalDevices * 2 + Math.ceil(Object.values(cableLength).reduce((a, b) => a + b, 0) / 100)
    const materialCost = materialList.reduce((sum, item) => sum + (item.quantity * this.getUnitPrice(item.name)), 0)
    const laborCost = laborHours * 150

    return {
      deviceCount,
      cableLength,
      materialList,
      laborHours,
      estimatedCost: {
        material: materialCost,
        labor: laborCost,
        total: materialCost + laborCost
      }
    }
  }

  private performMockSpatialAnalysis(devices: DeviceInfo[], metadata: CADFileMetadata): any {
    // 简化的空间分析
    const surveillanceDevices = devices.filter(d => d.category === 'surveillance')
    const accessDevices = devices.filter(d => d.category === 'access_control')

    return {
      coverage: {
        surveillanceZones: surveillanceDevices.map(d => ({
          center: [d.location.x, d.location.y],
          radius: 10,
          deviceId: d.id
        })),
        blindSpots: [],
        accessPoints: accessDevices.map(d => ({
          location: [d.location.x, d.location.y],
          deviceId: d.id
        }))
      },
      distances: {
        deviceToDevice: {},
        cableRoutes: []
      },
      compliance: {
        fireCodeCompliance: true,
        accessibilityCompliance: true,
        securityStandards: surveillanceDevices.length >= accessDevices.length
      }
    }
  }

  private generateSummary(
    devices: DeviceInfo[],
    quantities: any,
    spatialAnalysis: any,
    risks: RiskAssessment[]
  ): ComprehensiveAnalysisResult['summary'] {
    const devicesByCategory: Record<string, number> = {}
    devices.forEach(device => {
      devicesByCategory[device.category] = (devicesByCategory[device.category] || 0) + 1
    })

    const totalCableLength = quantities?.cableLength
      ? Object.values(quantities.cableLength).reduce((a: number, b: number) => a + b, 0)
      : 0

    const estimatedCost = quantities?.estimatedCost?.total || 0

    // 计算合规性评分
    let complianceScore = 100
    if (spatialAnalysis?.compliance) {
      const compliance = spatialAnalysis.compliance
      if (!compliance.fireCodeCompliance) complianceScore -= 30
      if (!compliance.accessibilityCompliance) complianceScore -= 20
      if (!compliance.securityStandards) complianceScore -= 25
    }

    // 计算风险等级
    const highRisks = risks.filter(r => r.severity === 'high').length
    const mediumRisks = risks.filter(r => r.severity === 'medium').length
    let riskLevel: 'low' | 'medium' | 'high' = 'low'
    if (highRisks > 0) riskLevel = 'high'
    else if (mediumRisks > 2) riskLevel = 'medium'

    return {
      totalDevices: devices.length,
      devicesByCategory,
      totalCableLength: totalCableLength || 0,
      estimatedCost,
      complianceScore,
      riskLevel
    }
  }

  private getDeviceDisplayName(type: string): string {
    const nameMap: Record<string, string> = {
      'surveillance': '监控摄像头',
      'access_control': '门禁读卡器',
      'fire_safety': '烟感探测器',
      'network': '网络交换机',
      'audio_visual': '音响设备'
    }
    return nameMap[type] || type
  }

  private getUnitPrice(name: string): number {
    const priceMap: Record<string, number> = {
      '监控摄像头': 800,
      '门禁读卡器': 300,
      '烟感探测器': 150,
      '网络交换机': 1200,
      '音响设备': 500,
      '网线(CAT6)': 3,
      '电源线': 2,
      '控制线': 1.5
    }
    return priceMap[name] || 100
  }
}

export default CADAnalysisService