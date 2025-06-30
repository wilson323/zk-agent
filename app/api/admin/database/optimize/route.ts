/**
 * @file 数据库优化触发API路由
 * @description 提供手动触发数据库优化的API接口
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

import { NextRequest, NextResponse } from 'next/server'
import { triggerDatabaseOptimization } from '@/lib/database/connection'
import { databaseMonitor } from '@/lib/database/index'
import { isDatabaseInitialized } from '@/lib/database/initialization'

/**
 * POST /api/admin/database/optimize
 * 手动触发数据库性能优化
 */
export async function POST(request: NextRequest) {
  try {
    // 检查数据库是否已初始化
    if (!isDatabaseInitialized()) {
      return NextResponse.json(
        { 
          success: false,
          error: '数据库系统尚未初始化',
          code: 'DATABASE_NOT_INITIALIZED'
        },
        { status: 503 }
      )
    }

    // 检查监控系统是否运行
    if (!databaseMonitor.getMonitoringStatus().isMonitoring) {
      return NextResponse.json(
        {
          success: false,
          error: '数据库监控系统未运行，无法执行优化',
          code: 'MONITORING_NOT_ACTIVE'
        },
        { status: 400 }
      )
    }

    // 解析请求体（可选的优化参数）
    let optimizationOptions = {}
    try {
      const body = await request.json()
      optimizationOptions = body.options || {}
    } catch {
      // 如果没有请求体或解析失败，使用默认选项
    }

    console.log('开始手动触发数据库优化...', optimizationOptions)

    // 记录优化开始时间
    const startTime = Date.now()

    // 执行优化
    const optimizationResult = await triggerDatabaseOptimization(optimizationOptions)

    // 计算优化耗时
    const duration = Date.now() - startTime

    // 获取优化后的状态
    const optimizationStatus = databaseMonitor.getOptimizationStatus()

    console.log(`数据库优化完成，耗时: ${duration}ms`)

    return NextResponse.json({
      success: true,
      message: '数据库优化已成功触发',
      data: {
        optimizationId: `opt_${Date.now()}`,
        startTime: new Date(startTime).toISOString(),
        duration,
        status: optimizationStatus,
        results: optimizationResult,
        recommendations: optimizationResult.recommendations || []
      }
    })
  } catch (error) {
    console.error('数据库优化失败:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: '数据库优化执行失败',
        details: error instanceof Error ? error.message : '未知错误',
        code: 'OPTIMIZATION_FAILED'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/database/optimize
 * 获取优化历史和状态
 */
export async function GET(request: NextRequest) {
  try {
    // 检查数据库是否已初始化
    if (!isDatabaseInitialized()) {
      return NextResponse.json(
        { error: '数据库系统尚未初始化' },
        { status: 503 }
      )
    }

    // 获取当前优化状态
    const optimizationStatus = databaseMonitor.getOptimizationStatus()
    
    // 获取优化历史（模拟数据，实际应用中应从数据库获取）
    const optimizationHistory = await getOptimizationHistory()
    
    // 获取可用的优化选项
    const availableOptimizations = getAvailableOptimizations()

    return NextResponse.json({
      currentStatus: optimizationStatus,
      history: optimizationHistory,
      availableOptimizations,
      canOptimize: databaseMonitor.getMonitoringStatus().isMonitoring
    })
  } catch (error) {
    console.error('获取优化信息失败:', error)
    return NextResponse.json(
      { error: '获取优化信息失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    )
  }
}

/**
 * 获取优化历史记录
 */
async function getOptimizationHistory() {
  // 在实际应用中，这里应该从数据库查询优化历史
  // 目前返回模拟数据
  return [
    {
      id: 'opt_1703001234567',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      type: 'automatic',
      duration: 2340,
      status: 'completed',
      improvements: {
        queryPerformance: '+12%',
        connectionEfficiency: '+8%',
        cacheHitRate: '+5%'
      },
      componentsOptimized: ['query-cache', 'connection-pool', 'index-analyzer']
    },
    {
      id: 'opt_1702987654321',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      type: 'manual',
      duration: 1890,
      status: 'completed',
      improvements: {
        queryPerformance: '+7%',
        connectionEfficiency: '+15%'
      },
      componentsOptimized: ['connection-pool', 'query-optimizer']
    },
    {
      id: 'opt_1702901234567',
      timestamp: new Date(Date.now() - 172800000).toISOString(),
      type: 'scheduled',
      duration: 3120,
      status: 'completed',
      improvements: {
        queryPerformance: '+18%',
        cacheHitRate: '+22%'
      },
      componentsOptimized: ['query-cache', 'index-analyzer', 'statistics-collector']
    }
  ]
}

/**
 * 获取可用的优化选项
 */
function getAvailableOptimizations() {
  return {
    queryOptimization: {
      name: '查询优化',
      description: '分析和优化慢查询，建议索引改进',
      estimatedDuration: '30-60秒',
      impact: 'medium'
    },
    connectionPoolOptimization: {
      name: '连接池优化',
      description: '调整连接池配置，优化连接管理',
      estimatedDuration: '10-30秒',
      impact: 'high'
    },
    cacheOptimization: {
      name: '缓存优化',
      description: '优化查询缓存策略和配置',
      estimatedDuration: '20-45秒',
      impact: 'medium'
    },
    indexAnalysis: {
      name: '索引分析',
      description: '分析索引使用情况，建议索引优化',
      estimatedDuration: '45-90秒',
      impact: 'high'
    },
    statisticsUpdate: {
      name: '统计信息更新',
      description: '更新数据库统计信息，改善查询计划',
      estimatedDuration: '15-30秒',
      impact: 'low'
    }
  }
}
