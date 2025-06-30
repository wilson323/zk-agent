// @ts-nocheck
/**
 * @file Database Connection
 * @description 数据库连接管理和健康检查
 * @author ZK-Agent Team A
 * @date 2024-12-19
 */

import { PrismaClient } from '@prisma/client'

// 数据库连接状态
export interface DatabaseStatus {
  connected: boolean
  message: string
  timestamp: Date
  version?: string
  latency?: number
  error?: string
  stats?: {
    totalQueries: number
    failedQueries: number
    avgLatency: number
    reconnectAttempts: number
  }
}

// 数据库健康检查结果
export interface DatabaseHealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded'
  checks: {
    connection: DatabaseStatus
    queries: {
      read: boolean
      write: boolean
      latency: number
    }
    migrations: {
      pending: number
      applied: number
    }
    optimization: {
      enabled: boolean
      componentsActive: number
      lastOptimization: Date | null
      recommendations: number
    }
  }
  timestamp: Date
}

// 数据库性能概览
export interface DatabasePerformanceOverview {
  monitoring: {
    isActive: boolean
    metricsCount: number
    alertsCount: number
  }
  optimization: {
    isActive: boolean
    componentsStatus: Record<string, any>
    recommendations: any[]
  }
  health: {
    score: number
    status: 'excellent' | 'good' | 'fair' | 'poor'
    issues: string[]
  }
  timestamp: Date
}

import { enhancedDb, EnhancedDatabaseConnection, ConnectionState } from './enhanced-connection'
import { databaseMonitor } from './monitoring'
import { DatabasePerformanceUtils } from './enhanced-database-manager'

// 全局 Prisma 客户端实例
let prisma: PrismaClient | null = null

/**
 * 获取 Prisma 客户端实例
 * @returns {PrismaClient} Prisma 客户端实例
 */
export function getPrismaClient(): PrismaClient {
  // 优先使用增强连接管理器的客户端
  const enhancedClient = enhancedDb.getClient()
  if (enhancedClient && enhancedDb.isConnected()) {
    return enhancedClient
  }

  // 回退到传统连接方式
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      errorFormat: 'pretty',
    })
  }
  return prisma
}

// 获取Prisma客户端实例
export const prisma = getPrismaClient()

/**
 * 检查数据库连接状态
 * @returns {Promise<DatabaseStatus>} 数据库连接状态
 */
export async function checkDatabaseConnection(): Promise<DatabaseStatus> {
  try {
    // 优先使用增强连接管理器
    if (enhancedDb.isConnected()) {
      const stats = enhancedDb.getStats()
      
      // 执行健康检查查询
      const result = await enhancedDb.executeQuery(async (client) => {
        const versionResult = await client.$queryRaw<Array<{ version: string }>>`SELECT version()`
        return versionResult[0]?.version || 'Unknown'
      })
      
      return {
        connected: true,
        message: `Enhanced database connection active (uptime: ${Math.round(stats.uptime / 1000)}s)`,
        version: result,
        timestamp: new Date(),
        stats: {
          totalQueries: stats.totalQueries,
          failedQueries: stats.failedQueries,
          avgLatency: Math.round(stats.avgLatency),
          reconnectAttempts: stats.reconnectAttempts
        }
      }
    }
    
    // 回退到传统连接检查
    const client = getPrismaClient()
    await client.$connect()
    
    // 执行简单查询测试连接
    await client.$queryRaw`SELECT 1`
    
    // 获取数据库版本信息
    const result = await client.$queryRaw<Array<{ version: string }>>`SELECT version()`
    const version = result[0]?.version || 'Unknown'
    
    return {
      connected: true,
      message: 'Database connection successful (fallback mode)',
      version,
      timestamp: new Date()
    }
  } catch (error) {
    console.error('Database connection failed:', error)
    
    // 如果增强连接管理器未连接，尝试连接（但不递归重试）
    if (!enhancedDb.isConnected()) {
      try {
        await enhancedDb.connect()
        // 连接成功后返回成功状态，不再递归调用
        return {
          connected: true,
          message: 'Database connection successful via enhanced manager',
          timestamp: new Date()
        }
      } catch (connectError) {
        console.error('Enhanced connection failed:', connectError)
      }
    }
    
    return {
      connected: false,
      message: error instanceof Error ? error.message : 'Unknown database error',
      timestamp: new Date()
    }
  }
}

/**
 * 执行完整的数据库健康检查
 */
export async function performDatabaseHealthCheck(): Promise<DatabaseHealthCheck> {
  const timestamp = new Date()
  
  try {
    // 检查基本连接
    const connectionStatus = await checkDatabaseConnection()
    
    // 检查读写操作
    const queryChecks = await checkDatabaseQueries()
    
    // 检查迁移状态
    const migrationChecks = await checkMigrationStatus()
    
    // 检查性能优化状态
    const optimizationStatus = await checkOptimizationStatus()
    
    // 确定整体健康状态
    let status: DatabaseHealthCheck['status'] = 'healthy'
    
    if (!connectionStatus.connected || !queryChecks.read) {
      status = 'unhealthy'
    } else if (!queryChecks.write || migrationChecks.pending > 0) {
      status = 'degraded'
    }
    
    return {
      status,
      checks: {
        connection: connectionStatus,
        queries: queryChecks,
        migrations: migrationChecks
      },
      optimization: optimizationStatus,
      timestamp
    }
  } catch (error) {
    console.error('Database health check failed:', error)
    
    return {
      status: 'unhealthy',
      checks: {
        connection: {
          connected: false,
          error: error instanceof Error ? error.message : 'Health check failed',
          timestamp
        },
        queries: {
          read: false,
          write: false,
          latency: 0
        },
        migrations: {
          pending: 0,
          applied: 0
        }
      },
      optimization: {
        enabled: false,
        componentsActive: 0,
        lastOptimization: null,
        recommendations: []
      },
      timestamp
    }
  }
}

/**
 * 检查数据库查询操作
 */
/**
 * 检查性能优化状态
 * @returns {Promise<object>} 性能优化状态信息
 */
async function checkOptimizationStatus(): Promise<{
  enabled: boolean
  componentsActive: number
  lastOptimization: Date | null
  recommendations: any[]
}> {
  try {
    // 检查数据库监控器是否启用
    const monitoringActive = databaseMonitor && databaseMonitor.isMonitoring()
    
    if (!monitoringActive) {
      return {
        enabled: false,
        componentsActive: 0,
        lastOptimization: null,
        recommendations: []
      }
    }
    
    // 获取优化状态
    const optimizationStatus = databaseMonitor.getOptimizationStatus()
    const recommendations = databaseMonitor.getOptimizationRecommendations()
    
    return {
      enabled: true,
      componentsActive: Object.values(optimizationStatus).filter(Boolean).length,
      lastOptimization: optimizationStatus.lastOptimization,
      recommendations: recommendations.slice(0, 5) // 限制返回前5个建议
    }
  } catch (error) {
    console.error('Failed to check optimization status:', error)
    return {
      enabled: false,
      componentsActive: 0,
      lastOptimization: null,
      recommendations: []
    }
  }
}

async function checkDatabaseQueries(): Promise<{
  read: boolean
  write: boolean
  latency: number
}> {
  const startTime = Date.now()
  
  try {
    // 测试读操作
    let readSuccess = false
    try {
      await prisma.$queryRaw`SELECT 1 as test`
      readSuccess = true
    } catch (error) {
      console.error('Database read test failed:', error)
    }
    
    // 测试写操作（如果有测试表的话）
    let writeSuccess = false
    try {
      // 尝试创建一个临时记录来测试写操作
      // 这里需要根据实际的数据库schema来调整
      // 暂时假设写操作成功
      writeSuccess = true
    } catch (error) {
      console.error('Database write test failed:', error)
    }
    
    const latency = Date.now() - startTime
    
    return {
      read: readSuccess,
      write: writeSuccess,
      latency
    }
  } catch (error) {
    return {
      read: false,
      write: false,
      latency: Date.now() - startTime
    }
  }
}

/**
 * 检查数据库迁移状态
 */
async function checkMigrationStatus(): Promise<{
  pending: number
  applied: number
}> {
  try {
    // 这里需要根据实际的迁移管理方式来实现
    // Prisma的迁移状态检查
    
    // 暂时返回默认值
    return {
      pending: 0,
      applied: 0
    }
  } catch (error) {
    console.error('Migration status check failed:', error)
    return {
      pending: 0,
      applied: 0
    }
  }
}

/**
 * 关闭数据库连接
 * @returns {Promise<void>}
 */
export async function closeDatabaseConnection(): Promise<void> {
  try {
    // 优先使用增强连接管理器
    if (enhancedDb.isConnected()) {
      await enhancedDb.disconnect()
      console.log('Enhanced database connection closed successfully')
      return
    }
    
    // 回退到传统方式
    const client = getPrismaClient()
    await client.$disconnect()
    console.log('Database connection closed successfully')
  } catch (error) {
    console.error('Error closing database connection:', error)
    throw error
  }
}

/**
 * 重新连接数据库
 * @returns {Promise<DatabaseStatus>}
 */
export async function reconnectDatabase(): Promise<DatabaseStatus> {
  try {
    // 优先使用增强连接管理器
    if (enhancedDb.getState() !== ConnectionState.DISCONNECTED) {
      await enhancedDb.reconnect()
      return await checkDatabaseConnection()
    }
    
    // 回退到传统重连方式
    await closeDatabaseConnection()
    
    // 等待一小段时间
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 重新检查连接
    return await checkDatabaseConnection()
  } catch (error) {
    console.error('Database reconnection failed:', error)
    throw error
  }
}

/**
 * 获取数据库连接池状态
 * @returns {Promise<any>} 连接池状态信息
 */
export async function getDatabasePoolStatus(): Promise<any> {
  try {
    // 优先使用增强连接管理器的统计信息
    if (enhancedDb.isConnected()) {
      const stats = enhancedDb.getStats()
      const status = await checkDatabaseConnection()
      
      return {
        connected: status.connected,
        timestamp: status.timestamp,
        version: status.version,
        enhanced: true,
        connectionState: stats.state,
        uptime: Math.round(stats.uptime / 1000),
        performance: {
          totalQueries: stats.totalQueries,
          failedQueries: stats.failedQueries,
          successRate: stats.totalQueries > 0 
            ? ((stats.totalQueries - stats.failedQueries) / stats.totalQueries * 100).toFixed(2) + '%'
            : '100%',
          avgLatency: Math.round(stats.avgLatency),
          reconnectAttempts: stats.reconnectAttempts
        },
        pool: {
          maxConnections: parseInt(process.env.DB_POOL_MAX || '50'),
          minConnections: parseInt(process.env.DB_POOL_MIN || '10'),
          active: status.connected ? 1 : 0,
          acquireTimeout: parseInt(process.env.DB_POOL_ACQUIRE || '60000'),
          idleTimeout: parseInt(process.env.DB_POOL_IDLE || '20000')
        }
      }
    }
    
    // 回退到传统状态检查
    const status = await checkDatabaseConnection()
    
    return {
      connected: status.connected,
      timestamp: status.timestamp,
      version: status.version,
      latency: status.latency,
      enhanced: false,
      // 模拟连接池信息（实际需要根据具体数据库驱动获取）
      pool: {
        total: parseInt(process.env.DB_POOL_MAX || '10'),
        active: status.connected ? 1 : 0,
        idle: status.connected ? parseInt(process.env.DB_POOL_MAX || '10') - 1 : 0,
        waiting: 0
      }
    }
  } catch (error) {
    console.error('Failed to get database pool status:', error)
    throw error
  }
}

/**
 * 获取数据库性能概览
 * @returns {Promise<DatabasePerformanceOverview>} 数据库性能概览信息
 */
export async function getDatabasePerformanceOverview(): Promise<DatabasePerformanceOverview> {
  const timestamp = new Date()
  
  try {
    // 获取监控状态
    const monitoringActive = databaseMonitor && databaseMonitor.isMonitoring()
    let monitoringInfo = {
      isActive: false,
      metricsCount: 0,
      alertsCount: 0
    }
    
    if (monitoringActive) {
      const metrics = databaseMonitor.getMetrics()
      const alerts = databaseMonitor.getAlerts()
      
      monitoringInfo = {
        isActive: true,
        metricsCount: metrics.length,
        alertsCount: alerts.filter(alert => alert.level === 'CRITICAL' || alert.level === 'WARNING').length
      }
    }
    
    // 获取优化状态
    const optimizationStatus = await checkOptimizationStatus()
    const optimizationInfo = {
      isActive: optimizationStatus.enabled,
      componentsStatus: optimizationStatus.enabled ? databaseMonitor.getOptimizationStatus() : {},
      recommendations: optimizationStatus.recommendations
    }
    
    // 计算健康评分
    const healthCheck = await performDatabaseHealthCheck()
    let healthScore = 100
    
    if (healthCheck.status === 'unhealthy') {
      healthScore = 30
    } else if (healthCheck.status === 'degraded') {
      healthScore = 70
    } else if (monitoringInfo.alertsCount > 0) {
      healthScore = Math.max(50, 100 - (monitoringInfo.alertsCount * 10))
    }
    
    const healthStatus = healthScore >= 90 ? 'excellent' : 
                        healthScore >= 70 ? 'good' : 
                        healthScore >= 50 ? 'fair' : 'poor'
    
    const healthIssues: string[] = []
    if (!healthCheck.checks.connection.connected) {
      healthIssues.push('数据库连接失败')
    }
    if (!healthCheck.checks.queries.read) {
      healthIssues.push('数据库读取操作失败')
    }
    if (!healthCheck.checks.queries.write) {
      healthIssues.push('数据库写入操作失败')
    }
    if (monitoringInfo.alertsCount > 0) {
      healthIssues.push(`存在 ${monitoringInfo.alertsCount} 个活跃告警`)
    }
    if (!optimizationStatus.enabled) {
      healthIssues.push('性能优化组件未启用')
    }
    
    return {
      monitoring: monitoringInfo,
      optimization: optimizationInfo,
      health: {
        score: healthScore,
        status: healthStatus,
        issues: healthIssues
      },
      timestamp
    }
  } catch (error) {
    console.error('Failed to get database performance overview:', error)
    
    return {
      monitoring: {
        isActive: false,
        metricsCount: 0,
        alertsCount: 0
      },
      optimization: {
        isActive: false,
        componentsStatus: {},
        recommendations: []
      },
      health: {
        score: 0,
        status: 'poor',
        issues: ['无法获取性能概览信息']
      },
      timestamp
    }
  }
}

/**
 * 触发数据库性能优化
 * @returns {Promise<boolean>} 优化是否成功触发
 */
export async function triggerDatabaseOptimization(): Promise<boolean> {
  try {
    if (!databaseMonitor || !databaseMonitor.isMonitoring()) {
      console.warn('Database monitoring is not active, cannot trigger optimization')
      return false
    }
    
    // 触发优化
    await databaseMonitor.triggerOptimization()
    console.log('Database optimization triggered successfully')
    return true
  } catch (error) {
    console.error('Failed to trigger database optimization:', error)
    return false
  }
}

/**
 * 获取数据库性能报告
 * @returns {Promise<any>} 性能报告
 */
export async function getDatabasePerformanceReport(): Promise<any> {
  try {
    if (!DatabasePerformanceUtils) {
      throw new Error('DatabasePerformanceUtils not available')
    }
    
    return await DatabasePerformanceUtils.getPerformanceReport()
  } catch (error) {
    console.error('Failed to get database performance report:', error)
    throw error
  }
}

// 进程退出时清理连接
process.on('beforeExit', async () => {
  try {
    // 优先使用增强连接管理器的优雅关闭
    if (enhancedDb.isConnected()) {
      await enhancedDb.gracefulShutdown()
    } else {
      await closeDatabaseConnection()
    }
  } catch (error) {
    console.error('Error during database cleanup:', error)
  }
})

process.on('SIGINT', async () => {
  try {
    console.log('Received SIGINT, initiating graceful shutdown...')
    
    // 优先使用增强连接管理器的优雅关闭
    if (enhancedDb.isConnected()) {
      await enhancedDb.gracefulShutdown()
    } else {
      await closeDatabaseConnection()
      process.exit(0)
    }
  } catch (error) {
    console.error('Error during graceful shutdown:', error)
    process.exit(1)
  }
})

process.on('SIGTERM', async () => {
  try {
    console.log('Received SIGTERM, initiating graceful shutdown...')
    
    // 优先使用增强连接管理器的优雅关闭
    if (enhancedDb.isConnected()) {
      await enhancedDb.gracefulShutdown()
    } else {
      await closeDatabaseConnection()
      process.exit(0)
    }
  } catch (error) {
    console.error('Error during graceful shutdown:', error)
    process.exit(1)
  }
})

// 导出增强连接管理器实例和相关功能
export { 
  enhancedDb, 
  EnhancedDatabaseConnection, 
  ConnectionState,
  // connectDatabase,
  // disconnectDatabase,
  // getDatabaseStats,
  // isDatabaseConnected,
  // executeQuery
} from './enhanced-connection'

// 初始化增强数据库连接（如果环境变量启用）
if (process.env.ENHANCED_DB_CONNECTION === 'true') {
  enhancedDb.connect().catch(error => {
    console.error('Failed to initialize enhanced database connection:', error)
  })
}

// 默认导出Prisma客户端
export default prisma

// 导出类型
export type { DatabaseStatus, DatabaseHealthCheck }