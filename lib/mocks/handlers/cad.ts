// @ts-nocheck
/**
 * @file CAD Mock Handlers
 * @description CAD分析相关的Mock API处理器
 * @author ZK-Agent Team A
 * @date 2024-12-19
 */

import { http, HttpResponse } from 'msw'

// CAD分析结果类型
interface CADAnalysisResult {
  id: string
  fileName: string
  fileSize: number
  fileType: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  analysis: {
    summary: {
      totalComponents: number
      totalLayers: number
      dimensions: {
        width: number
        height: number
        depth: number
      }
      complexity: 'low' | 'medium' | 'high'
    }
    components: Array<{
      id: string
      name: string
      type: string
      material?: string
      quantity: number
      dimensions: {
        length: number
        width: number
        height: number
      }
      riskLevel: 'low' | 'medium' | 'high'
      issues: string[]
    }>
    risks: Array<{
      id: string
      type: 'structural' | 'material' | 'manufacturing' | 'design'
      severity: 'low' | 'medium' | 'high' | 'critical'
      description: string
      recommendation: string
      affectedComponents: string[]
    }>
    recommendations: Array<{
      id: string
      category: 'optimization' | 'safety' | 'cost' | 'manufacturing'
      priority: 'low' | 'medium' | 'high'
      description: string
      expectedBenefit: string
    }>
  }
  createdAt: Date
  completedAt?: Date
  processingTime?: number
}

// Mock数据
const mockAnalysisResults: CADAnalysisResult[] = [
  {
    id: 'analysis-001',
    fileName: 'mechanical_assembly.dwg',
    fileSize: 2048576,
    fileType: 'dwg',
    status: 'completed',
    progress: 100,
    analysis: {
      summary: {
        totalComponents: 24,
        totalLayers: 8,
        dimensions: {
          width: 150.5,
          height: 200.0,
          depth: 75.2
        },
        complexity: 'medium'
      },
      components: [
        {
          id: 'comp-001',
          name: '主轴',
          type: '轴类零件',
          material: '45号钢',
          quantity: 1,
          dimensions: {
            length: 120.0,
            width: 25.0,
            height: 25.0
          },
          riskLevel: 'low',
          issues: []
        },
        {
          id: 'comp-002',
          name: '支撑板',
          type: '板类零件',
          material: 'Q235',
          quantity: 2,
          dimensions: {
            length: 80.0,
            width: 60.0,
            height: 10.0
          },
          riskLevel: 'medium',
          issues: ['厚度可能不足', '需要加强筋']
        }
      ],
      risks: [
        {
          id: 'risk-001',
          type: 'structural',
          severity: 'medium',
          description: '支撑板厚度不足，可能导致变形',
          recommendation: '建议增加厚度至15mm或添加加强筋',
          affectedComponents: ['comp-002']
        }
      ],
      recommendations: [
        {
          id: 'rec-001',
          category: 'optimization',
          priority: 'medium',
          description: '优化材料使用，减少重量',
          expectedBenefit: '预计减重15%，降低成本8%'
        }
      ]
    },
    createdAt: new Date('2024-12-19T09:00:00Z'),
    completedAt: new Date('2024-12-19T09:05:30Z'),
    processingTime: 330000
  }
]

// 模拟分析进度更新
const simulateAnalysisProgress = (analysisId: string) => {
  const analysis = mockAnalysisResults.find(a => a.id === analysisId)
  if (!analysis || analysis.status === 'completed') {return}

  const updateProgress = () => {
    if (analysis.progress < 100) {
      analysis.progress += Math.floor(Math.random() * 20) + 5
      if (analysis.progress >= 100) {
        analysis.progress = 100
        analysis.status = 'completed'
        analysis.completedAt = new Date()
        analysis.processingTime = Date.now() - analysis.createdAt.getTime()
      }
      setTimeout(updateProgress, 1000)
    }
  }

  setTimeout(updateProgress, 1000)
}

export const cadHandlers = [
  // 上传CAD文件
  http.post('/api/cad/upload', async ({ request }) => {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return HttpResponse.json(
        { success: false, message: '请选择文件' },
        { status: 400 }
      )
    }

    // 检查文件类型
    const allowedTypes = ['dwg', 'dxf', 'step', 'iges', 'stp']
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    
    if (!fileExtension || !allowedTypes.includes(fileExtension)) {
      return HttpResponse.json(
        { success: false, message: '不支持的文件格式' },
        { status: 400 }
      )
    }

    // 检查文件大小 (50MB限制)
    if (file.size > 50 * 1024 * 1024) {
      return HttpResponse.json(
        { success: false, message: '文件大小超过限制(50MB)' },
        { status: 400 }
      )
    }

    // 创建分析任务
    const analysisResult: CADAnalysisResult = {
      id: `analysis-${Date.now()}`,
      fileName: file.name,
      fileSize: file.size,
      fileType: fileExtension,
      status: 'processing',
      progress: 0,
      analysis: {
        summary: {
          totalComponents: 0,
          totalLayers: 0,
          dimensions: { width: 0, height: 0, depth: 0 },
          complexity: 'low'
        },
        components: [],
        risks: [],
        recommendations: []
      },
      createdAt: new Date()
    }

    mockAnalysisResults.push(analysisResult)
    
    // 开始模拟分析进度
    simulateAnalysisProgress(analysisResult.id)

    return HttpResponse.json({
      success: true,
      data: {
        analysisId: analysisResult.id,
        message: '文件上传成功，开始分析'
      }
    }, { status: 201 })
  }),

  // 获取分析结果列表
  http.get('/api/cad/analyses', ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const status = url.searchParams.get('status')

    let filteredResults = mockAnalysisResults

    if (status) {
      filteredResults = filteredResults.filter(result => result.status === status)
    }

    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedResults = filteredResults.slice(startIndex, endIndex)

    return HttpResponse.json({
      success: true,
      data: paginatedResults,
      pagination: {
        page,
        limit,
        total: filteredResults.length,
        totalPages: Math.ceil(filteredResults.length / limit)
      }
    })
  }),

  // 获取单个分析结果
  http.get('/api/cad/analyses/:id', ({ params }) => {
    const { id } = params
    const result = mockAnalysisResults.find(r => r.id === id)

    if (!result) {
      return HttpResponse.json(
        { success: false, message: '分析结果不存在' },
        { status: 404 }
      )
    }

    return HttpResponse.json({
      success: true,
      data: result
    })
  }),

  // 获取分析进度
  http.get('/api/cad/analyses/:id/progress', ({ params }) => {
    const { id } = params
    const result = mockAnalysisResults.find(r => r.id === id)

    if (!result) {
      return HttpResponse.json(
        { success: false, message: '分析任务不存在' },
        { status: 404 }
      )
    }

    return HttpResponse.json({
      success: true,
      data: {
        id: result.id,
        status: result.status,
        progress: result.progress,
        message: result.status === 'processing' ? '正在分析中...' : 
                result.status === 'completed' ? '分析完成' : 
                result.status === 'failed' ? '分析失败' : '等待处理'
      }
    })
  }),

  // 删除分析结果
  http.delete('/api/cad/analyses/:id', ({ params }) => {
    const { id } = params
    const resultIndex = mockAnalysisResults.findIndex(r => r.id === id)
    
    if (resultIndex === -1) {
      return HttpResponse.json(
        { success: false, message: '分析结果不存在' },
        { status: 404 }
      )
    }

    mockAnalysisResults.splice(resultIndex, 1)

    return HttpResponse.json({
      success: true,
      message: '分析结果已删除'
    })
  }),

  // 导出分析报告
  http.get('/api/cad/analyses/:id/export', ({ params, request }) => {
    const { id } = params
    const url = new URL(request.url)
    const format = url.searchParams.get('format') || 'pdf'
    
    const result = mockAnalysisResults.find(r => r.id === id)

    if (!result) {
      return HttpResponse.json(
        { success: false, message: '分析结果不存在' },
        { status: 404 }
      )
    }

    if (result.status !== 'completed') {
      return HttpResponse.json(
        { success: false, message: '分析尚未完成' },
        { status: 400 }
      )
    }

    // 模拟文件下载
    const fileName = `${result.fileName}_analysis_report.${format}`
    
    return HttpResponse.json({
      success: true,
      data: {
        downloadUrl: `/api/cad/download/${id}/${fileName}`,
        fileName,
        fileSize: Math.floor(Math.random() * 1000000) + 500000,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24小时后过期
      }
    })
  }),

  // 获取CAD分析统计
  http.get('/api/cad/stats', () => {
    const totalAnalyses = mockAnalysisResults.length
    const completedAnalyses = mockAnalysisResults.filter(r => r.status === 'completed').length
    const processingAnalyses = mockAnalysisResults.filter(r => r.status === 'processing').length
    const avgProcessingTime = mockAnalysisResults
      .filter(r => r.processingTime)
      .reduce((sum, r) => sum + (r.processingTime || 0), 0) / completedAnalyses || 0

    return HttpResponse.json({
      success: true,
      data: {
        totalAnalyses,
        completedAnalyses,
        processingAnalyses,
        successRate: totalAnalyses > 0 ? (completedAnalyses / totalAnalyses * 100).toFixed(1) : '0',
        avgProcessingTime: Math.round(avgProcessingTime / 1000), // 转换为秒
        supportedFormats: ['DWG', 'DXF', 'STEP', 'IGES', 'STP'],
        maxFileSize: '50MB'
      }
    })
  })
] 