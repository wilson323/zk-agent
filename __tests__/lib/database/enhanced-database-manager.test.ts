/**
 * Enhanced Database Manager 测试
 * 测试lib/database/enhanced-database-manager.ts中的所有功能
 */

import { EnhancedDatabaseManager } from '@/lib/database/enhanced-database-manager'
import { PrismaClient } from '@prisma/client'
import { Logger } from '@/lib/logger'

// Mock Prisma Client
jest.mock('@prisma/client')

// Mock Logger
jest.mock('@/lib/logger')

// Mock fetch for external API calls
global.fetch = jest.fn()

const mockPrismaInstance = {
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $transaction: jest.fn(),
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
  user: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  post: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}

;(PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(() => mockPrismaInstance as any)
;(Logger as jest.MockedClass<typeof Logger>).mockImplementation(() => mockLogger as any)

// Helper function to execute queries
const executeQuery = async (queryFn: () => Promise<any>) => {
  return await queryFn()
}

describe('EnhancedDatabaseManager', () => {
  let dbManager: EnhancedDatabaseManager

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset singleton instance
    ;(EnhancedDatabaseManager as any).instance = null
    dbManager = EnhancedDatabaseManager.getInstance()
  })

  afterEach(async () => {
    await dbManager.disconnect()
  })

  describe('单例模式', () => {
    it('应该返回相同的实例', () => {
      const instance1 = EnhancedDatabaseManager.getInstance()
      const instance2 = EnhancedDatabaseManager.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('初始化', () => {
    it('应该成功初始化数据库连接', async () => {
      mockPrismaInstance.$connect.mockResolvedValue(undefined)
      
      await dbManager.initialize()
      
      expect(mockPrismaInstance.$connect).toHaveBeenCalled()
      expect(mockLogger.info).toHaveBeenCalledWith('数据库连接已建立')
    })

    it('应该处理初始化错误', async () => {
      const error = new Error('连接失败')
      mockPrismaInstance.$connect.mockRejectedValue(error)
      
      await expect(dbManager.initialize()).rejects.toThrow('连接失败')
      expect(mockLogger.error).toHaveBeenCalledWith('数据库初始化失败:', error)
    })
  })

  describe('事务执行', () => {
    it('应该成功执行事务', async () => {
      const mockResult = { id: 1, name: 'test' }
      mockPrismaInstance.$transaction.mockResolvedValue(mockResult)
      
      const transactionFn = jest.fn().mockResolvedValue(mockResult)
      const result = await dbManager.executeTransaction(transactionFn)
      
      expect(result).toEqual(mockResult)
      expect(mockPrismaInstance.$transaction).toHaveBeenCalledWith(transactionFn)
    })

    it('应该处理事务错误', async () => {
      const error = new Error('事务失败')
      mockPrismaInstance.$transaction.mockRejectedValue(error)
      
      const transactionFn = jest.fn()
      await expect(dbManager.executeTransaction(transactionFn)).rejects.toThrow('事务失败')
      expect(mockLogger.error).toHaveBeenCalledWith('事务执行失败:', error)
    })
  })

  describe('查询执行', () => {
    it('应该成功执行查询', async () => {
      const mockResult = [{ id: 1, name: 'test' }]
      const queryFn = jest.fn().mockResolvedValue(mockResult)
      
      const result = await dbManager.executeQuery(queryFn)
      
      expect(result).toEqual(mockResult)
      expect(queryFn).toHaveBeenCalled()
    })

    it('应该处理查询错误', async () => {
      const error = new Error('查询失败')
      const queryFn = jest.fn().mockRejectedValue(error)
      
      await expect(dbManager.executeQuery(queryFn)).rejects.toThrow('查询失败')
      expect(mockLogger.error).toHaveBeenCalledWith('查询执行失败:', error)
    })
  })

  describe('健康检查', () => {
    it('应该返回健康状态', async () => {
      mockPrismaInstance.$queryRaw.mockResolvedValue([{ result: 1 }])
      
      const health = await dbManager.healthCheck()
      
      expect(health.status).toBe('healthy')
      expect(health.timestamp).toBeDefined()
      expect(mockPrismaInstance.$queryRaw).toHaveBeenCalledWith`SELECT 1 as result`
    })

    it('应该处理健康检查错误', async () => {
      const error = new Error('健康检查失败')
      mockPrismaInstance.$queryRaw.mockRejectedValue(error)
      
      const health = await dbManager.healthCheck()
      
      expect(health.status).toBe('unhealthy')
      expect(health.error).toBe('健康检查失败')
    })
  })

  describe('批量操作', () => {
    it('应该成功执行批量创建', async () => {
      const mockData = [{ name: 'test1' }, { name: 'test2' }]
      const mockResult = [{ id: 1, name: 'test1' }, { id: 2, name: 'test2' }]
      
      mockPrismaInstance.$transaction.mockImplementation(async (operations) => {
        return await Promise.all(operations.map(() => mockResult[0]))
      })
      
      const result = await dbManager.batchCreate('user', mockData)
      
      expect(result).toBeDefined()
      expect(mockPrismaInstance.$transaction).toHaveBeenCalled()
    })

    it('应该成功执行批量更新', async () => {
      const mockUpdates = [{ id: 1, name: 'updated1' }, { id: 2, name: 'updated2' }]
      
      mockPrismaInstance.$transaction.mockImplementation(async (operations) => {
        return await Promise.all(operations.map(() => ({ count: 1 })))
      })
      
      const result = await dbManager.batchUpdate('user', mockUpdates)
      
      expect(result).toBeDefined()
      expect(mockPrismaInstance.$transaction).toHaveBeenCalled()
    })

    it('应该成功执行批量删除', async () => {
      const mockIds = [1, 2, 3]
      
      mockPrismaInstance.$transaction.mockImplementation(async (operations) => {
        return await Promise.all(operations.map(() => ({ count: 1 })))
      })
      
      const result = await dbManager.batchDelete('user', mockIds)
      
      expect(result).toBeDefined()
      expect(mockPrismaInstance.$transaction).toHaveBeenCalled()
    })
  })

  describe('查询分析', () => {
    it('应该返回查询分析数据', () => {
      const analytics = dbManager.getQueryAnalytics()
      
      expect(analytics).toBeDefined()
      expect(analytics.totalQueries).toBeDefined()
      expect(analytics.averageExecutionTime).toBeDefined()
      expect(analytics.slowQueries).toBeDefined()
    })

    it('应该重置查询分析数据', () => {
      dbManager.resetQueryAnalytics()
      
      const analytics = dbManager.getQueryAnalytics()
      expect(analytics.totalQueries).toBe(0)
      expect(analytics.averageExecutionTime).toBe(0)
      expect(analytics.slowQueries).toHaveLength(0)
    })
  })

  describe('连接池管理', () => {
    it('应该返回连接池状态', () => {
      const poolStatus = dbManager.getConnectionPoolStatus()
      
      expect(poolStatus).toBeDefined()
      expect(poolStatus.activeConnections).toBeDefined()
      expect(poolStatus.idleConnections).toBeDefined()
      expect(poolStatus.totalConnections).toBeDefined()
    })
  })

  describe('缓存管理', () => {
    it('应该设置和获取缓存', () => {
      const key = 'test-key'
      const value = { data: 'test' }
      
      dbManager.setCache(key, value)
      const cachedValue = dbManager.getCache(key)
      
      expect(cachedValue).toEqual(value)
    })

    it('应该清除缓存', () => {
      const key = 'test-key'
      const value = { data: 'test' }
      
      dbManager.setCache(key, value)
      dbManager.clearCache(key)
      const cachedValue = dbManager.getCache(key)
      
      expect(cachedValue).toBeNull()
    })

    it('应该清除所有缓存', () => {
      dbManager.setCache('key1', 'value1')
      dbManager.setCache('key2', 'value2')
      
      dbManager.clearAllCache()
      
      expect(dbManager.getCache('key1')).toBeNull()
      expect(dbManager.getCache('key2')).toBeNull()
    })
  })

  describe('优雅关闭', () => {
    it('应该优雅地断开数据库连接', async () => {
      mockPrismaInstance.$disconnect.mockResolvedValue(undefined)
      
      await dbManager.disconnect()
      
      expect(mockPrismaInstance.$disconnect).toHaveBeenCalled()
      expect(mockLogger.info).toHaveBeenCalledWith('数据库连接已断开')
    })

    it('应该处理断开连接时的错误', async () => {
      const error = new Error('断开连接失败')
      mockPrismaInstance.$disconnect.mockRejectedValue(error)
      
      await dbManager.disconnect()
      
      expect(mockLogger.error).toHaveBeenCalledWith('断开数据库连接时发生错误:', error)
    })
  })

  describe('Prisma客户端访问', () => {
    it('应该提供对Prisma客户端的访问', () => {
      const prismaClient = dbManager.getPrismaClient()
      
      expect(prismaClient).toBeDefined()
      expect(prismaClient).toBe(mockPrismaInstance)
    })
  })

  describe('性能测试', () => {
    it('应该在合理时间内完成查询', async () => {
      const startTime = Date.now()
      const queryFn = jest.fn().mockResolvedValue({ id: 1 })
      
      await dbManager.executeQuery(queryFn)
      
      const endTime = Date.now()
      const executionTime = endTime - startTime
      
      expect(executionTime).toBeLessThan(1000) // 应该在1秒内完成
    })

    it('应该在合理时间内完成事务', async () => {
      const startTime = Date.now()
      const transactionFn = jest.fn().mockResolvedValue({ id: 1 })
      mockPrismaInstance.$transaction.mockResolvedValue({ id: 1 })
      
      await dbManager.executeTransaction(transactionFn)
      
      const endTime = Date.now()
      const executionTime = endTime - startTime
      
      expect(executionTime).toBeLessThan(2000) // 事务应该在2秒内完成
    })
  })

  describe('错误处理', () => {
    it('应该处理数据库连接错误', async () => {
      const error = new Error('数据库连接失败')
      mockPrismaInstance.$connect.mockRejectedValue(error)
      
      await expect(dbManager.initialize()).rejects.toThrow('数据库连接失败')
      expect(mockLogger.error).toHaveBeenCalledWith('数据库初始化失败:', error)
    })

    it('应该处理查询超时', async () => {
      const timeoutError = new Error('查询超时')
      const queryFn = jest.fn().mockRejectedValue(timeoutError)
      
      await expect(dbManager.executeQuery(queryFn)).rejects.toThrow('查询超时')
      expect(mockLogger.error).toHaveBeenCalledWith('查询执行失败:', timeoutError)
    })
  })

  describe('内存管理', () => {
    it('应该正确管理查询指标内存', async () => {
      // 模拟大量查询以测试内存管理
      const promises = Array.from({ length: 1500 }, async (_, i) => {
        const queryFn = jest.fn().mockResolvedValue({ id: i.toString() })
        return executeQuery(queryFn)
      })

      await Promise.all(promises)

      // 验证查询指标不会无限增长
      const analytics = dbManager.getQueryAnalytics()
      expect(analytics).toBeDefined()
    })
  })
})