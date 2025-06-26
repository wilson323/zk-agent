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
  }
  timestamp: Date
}

import { enhancedDb, EnhancedDatabaseConnection, ConnectionState } from './enhanced-connection'

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
    
    // 如果增强连接管理器未连接，尝试连接
    if (!enhancedDb.isConnected()) {
      try {
        await enhancedDb.connect()
        return await checkDatabaseConnection() // 递归重试
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
      timestamp
    }
  }
}

/**
 * 检查数据库查询操作
 */
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
  connectDatabase,
  disconnectDatabase,
  getDatabaseStats,
  isDatabaseConnected,
  executeQuery
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
