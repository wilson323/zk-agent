#!/usr/bin/env node

import { executePhase123Optimization, Phase123Config } from '../lib/database/phase-123-optimizer'
import { databaseMonitor } from '../lib/database/monitoring'
import { enhancedDatabaseManager } from '../lib/database/enhanced-database-manager'

/**
 * 123阶段数据库优化执行脚本
 * 立即执行数据库性能优化的前三个阶段
 */

const OPTIMIZATION_CONFIG: Phase123Config = {
  enablePhase1: true, // 连接池优化
  enablePhase2: true, // 查询和缓存优化
  enablePhase3: true, // 安全和监控增强
  
  // 阶段1配置 - 连接池优化
  connectionPoolConfig: {
    enableDynamicAdjustment: true,
    enableBenchmarking: true,
    optimizationInterval: 30000 // 30秒
  },
  
  // 阶段2配置 - 查询和缓存优化
  queryOptimizationConfig: {
    enableSlowQueryDetection: true,
    slowQueryThreshold: 1000, // 1秒
    enableQueryCaching: true
  },
  
  cacheStrategyConfig: {
    enableMultiLevel: true,
    enableAdaptiveStrategy: true,
    preloadCriticalData: true
  },
  
  // 阶段3配置 - 安全和监控增强
  securityConfig: {
    enableThreatDetection: true,
    enableAuditLogging: true,
    enableDataMasking: true
  },
  
  monitoringConfig: {
    enablePredictiveAnalysis: true,
    enableAnomalyDetection: true,
    enableAdvancedReporting: true
  }
}

/**
 * 格式化执行时间
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`
  } else {
    const minutes = Math.floor(ms / 60000)
    const seconds = ((ms % 60000) / 1000).toFixed(2)
    return `${minutes}m ${seconds}s`
  }
}

/**
 * 打印优化结果
 */
function printOptimizationResults(results: any[]): void {
  console.log('\n' + '='.repeat(60))
  console.log('🚀 123阶段数据库优化执行结果')
  console.log('='.repeat(60))
  
  results.forEach((result, index) => {
    const phaseNames = ['', '连接池优化', '查询和缓存优化', '安全和监控增强']
    const phaseName = phaseNames[result.phase] || `阶段${result.phase}`
    
    console.log(`\n📊 阶段${result.phase}: ${phaseName}`)
    console.log(`   状态: ${result.success ? '✅ 成功' : '❌ 失败'}`)
    console.log(`   耗时: ${formatDuration(result.duration)}`)
    
    // 显示改进详情
    if (result.improvements) {
      if (result.improvements.connectionPool) {
        console.log(`   🔧 连接池优化: ${result.improvements.connectionPool.improvement}`)
      }
      
      if (result.improvements.queryPerformance) {
        const qp = result.improvements.queryPerformance
        console.log(`   ⚡ 查询性能: 慢查询减少${qp.slowQueriesReduced}个，平均查询时间${qp.averageQueryTimeImprovement}ms`)
      }
      
      if (result.improvements.cacheStrategy) {
        const cs = result.improvements.cacheStrategy
        console.log(`   💾 缓存策略: 命中率提升${(cs.hitRateImprovement * 100).toFixed(2)}%，内存优化${cs.memoryUsageOptimization}MB`)
      }
      
      if (result.improvements.security) {
        const sec = result.improvements.security
        console.log(`   🔒 安全增强: 检测到${sec.threatsDetected}个威胁，安全评分${sec.securityScore}`)
      }
      
      if (result.improvements.monitoring) {
        const mon = result.improvements.monitoring
        console.log(`   📈 监控增强: 配置${mon.alertsConfigured}个告警，预测准确率${(mon.predictionAccuracy * 100).toFixed(1)}%`)
      }
    }
    
    // 显示错误
    if (result.errors && result.errors.length > 0) {
      console.log(`   ❌ 错误:`)
      result.errors.forEach((error: string) => {
        console.log(`      - ${error}`)
      })
    }
    
    // 显示警告
    if (result.warnings && result.warnings.length > 0) {
      console.log(`   ⚠️  警告:`)
      result.warnings.forEach((warning: string) => {
        console.log(`      - ${warning}`)
      })
    }
    
    // 显示建议
    if (result.recommendations && result.recommendations.length > 0) {
      console.log(`   💡 建议:`)
      result.recommendations.forEach((rec: string) => {
        console.log(`      - ${rec}`)
      })
    }
  })
  
  // 总结
  const totalDuration = results.reduce((sum, result) => sum + result.duration, 0)
  const successCount = results.filter(result => result.success).length
  const totalCount = results.length
  
  console.log('\n' + '='.repeat(60))
  console.log('📋 执行总结')
  console.log('='.repeat(60))
  console.log(`总耗时: ${formatDuration(totalDuration)}`)
  console.log(`成功率: ${successCount}/${totalCount} (${((successCount / totalCount) * 100).toFixed(1)}%)`)
  
  if (successCount === totalCount) {
    console.log('🎉 所有阶段优化成功完成！')
  } else {
    console.log('⚠️  部分阶段优化失败，请检查错误信息')
  }
}

/**
 * 主执行函数
 */
async function main(): Promise<void> {
  console.log('🚀 开始执行123阶段数据库优化...')
  console.log('📅 执行时间:', new Date().toLocaleString())
  
  try {
    // 检查数据库连接状态
    console.log('\n🔍 检查数据库连接状态...')
    // const dbStatus = await enhancedDatabaseManager.getConnectionStatus()
    // console.log(`数据库连接状态: ${dbStatus.isConnected ? '✅ 已连接' : '❌ 未连接'}`)
    
    // if (!dbStatus.isConnected) {
      console.log('⚠️  数据库未连接，尝试建立连接...')
      await enhancedDatabaseManager.connect()
      console.log('✅ 数据库连接成功')
    // }
    
    // 启动数据库监控
    console.log('\n📊 启动数据库监控...')
    await databaseMonitor.startMonitoring()
    console.log('✅ 数据库监控已启动')
    
    // 执行123阶段优化
    console.log('\n🔧 开始执行123阶段优化...')
    const startTime = Date.now()
    
    const results = await executePhase123Optimization(OPTIMIZATION_CONFIG)
    
    const endTime = Date.now()
    console.log(`\n✅ 123阶段优化执行完成，总耗时: ${formatDuration(endTime - startTime)}`)
    
    // 打印结果
    printOptimizationResults(results)
    
    // 获取优化后的数据库状态
    console.log('\n📈 获取优化后的数据库状态...')
    const finalMetrics = await databaseMonitor.getMetrics()
    console.log('当前数据库指标:')
    console.log(`  - 活跃连接: ${finalMetrics.activeConnections}`)
    console.log(`  - 平均查询时间: ${finalMetrics.averageQueryTime}ms`)
    console.log(`  - 连接池利用率: ${(finalMetrics.poolUtilization * 100).toFixed(1)}%`)
    console.log(`  - 缓存命中率: ${(finalMetrics.cacheHitRate * 100).toFixed(1)}%`)
    
  } catch (error) {
    console.error('\n❌ 123阶段优化执行失败:')
    console.error(error)
    process.exit(1)
  }
}

/**
 * 处理进程退出
 */
process.on('SIGINT', async () => {
  console.log('\n🛑 收到中断信号，正在清理资源...')
  try {
    await databaseMonitor.stopMonitoring()
    await enhancedDatabaseManager.disconnect()
    console.log('✅ 资源清理完成')
  } catch (error) {
    console.error('❌ 资源清理失败:', error)
  }
  process.exit(0)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason)
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error)
  process.exit(1)
})

// 执行主函数
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ 主函数执行失败:', error)
    process.exit(1)
  })
}

export { main as executePhase123 }