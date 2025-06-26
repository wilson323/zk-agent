/**
 * 数据库连接测试
 * 测试database/connection.ts中的所有功能
 */

import {
  checkDatabaseConnection,
  performDatabaseHealthCheck,
  closeDatabaseConnection,
  reconnectDatabase,
  getDatabasePoolStatus,
  prisma,
  DatabaseStatus,
  DatabaseHealthCheck,
} from '@/lib/database/connection'
import { PrismaClient } from '@prisma/client'

// Mock Prisma Client
jest.mock('@prisma/client')

const mockPrismaInstance = {
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $queryRaw: jest.fn(),
}

;(PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(() => mockPrismaInstance as any)

// Mock console methods
const consoleSpy = {
  log: jest.spyOn(console, 'log').mockImplementation(),
  error: jest.spyOn(console, 'error').mockImplementation(),
  warn: jest.spyOn(console, 'warn').mockImplementation(),
}

// Mock Date.now for consistent timing tests
const mockDateNow = jest.spyOn(Date, 'now')

describe('Database Connection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    consoleSpy.log.mockClear()
    consoleSpy.error.mockClear()
    consoleSpy.warn.mockClear()
    mockDateNow.mockReturnValue(1000)
  })

  afterAll(() => {
    consoleSpy.log.mockRestore()
    consoleSpy.error.mockRestore()
    consoleSpy.warn.mockRestore()
    mockDateNow.mockRestore()
  })

  describe('checkDatabaseConnection', () => {
    it('应该成功检查数据库连接', async () => {
      mockPrismaInstance.$connect.mockResolvedValue(undefined)
      mockPrismaInstance.$queryRaw.mockResolvedValue([{ test: 1 }])
      
      // Mock version query
      mockPrismaInstance.$queryRaw
        .mockResolvedValueOnce([{ test: 1 }]) // First call for connection test
        .mockResolvedValueOnce([{ version: 'PostgreSQL 14.0' }]) // Second call for version

      mockDateNow
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1050) // End time

      const result = await checkDatabaseConnection()

      expect(result.connected).toBe(true)
      expect(result.latency).toBe(50)
      expect(result.version).toBe('PostgreSQL 14.0')
      expect(result.timestamp).toBeInstanceOf(Date)
      expect(mockPrismaInstance.$connect).toHaveBeenCalled()
    })

    it('应该处理连接失败的情况', async () => {
      const error = new Error('Connection failed')
      mockPrismaInstance.$connect.mockRejectedValue(error)
      
      mockDateNow
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1100) // End time

      const result = await checkDatabaseConnection()

      expect(result.connected).toBe(false)
      expect(result.error).toBe('Connection failed')
      expect(result.latency).toBe(100)
      expect(consoleSpy.error).toHaveBeenCalledWith('Database connection check failed:', error)
    })

    it('应该处理版本查询失败的情况', async () => {
      mockPrismaInstance.$connect.mockResolvedValue(undefined)
      mockPrismaInstance.$queryRaw
        .mockResolvedValueOnce([{ test: 1 }]) // Connection test succeeds
        .mockRejectedValueOnce(new Error('Version query failed')) // Version query fails

      const result = await checkDatabaseConnection()

      expect(result.connected).toBe(true)
      expect(result.version).toBeUndefined()
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        'Failed to get database version:',
        expect.any(Error)
      )
    })
  })

  describe('performDatabaseHealthCheck', () => {
    beforeEach(() => {
      // Mock successful connection by default
      mockPrismaInstance.$connect.mockResolvedValue(undefined)
      mockPrismaInstance.$queryRaw.mockResolvedValue([{ test: 1 }])
    })

    it('应该返回健康状态', async () => {
      const result = await performDatabaseHealthCheck()

      expect(result.status).toBe('healthy')
      expect(result.checks.connection.connected).toBe(true)
      expect(result.checks.queries.read).toBe(true)
      expect(result.checks.queries.write).toBe(true)
      expect(result.checks.migrations.pending).toBe(0)
      expect(result.timestamp).toBeInstanceOf(Date)
    })

    it('应该返回不健康状态当连接失败时', async () => {
      mockPrismaInstance.$connect.mockRejectedValue(new Error('Connection failed'))

      const result = await performDatabaseHealthCheck()

      expect(result.status).toBe('unhealthy')
      expect(result.checks.connection.connected).toBe(false)
    })

    it('应该处理健康检查异常', async () => {
      // Mock an error that occurs during health check setup
      mockPrismaInstance.$connect.mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const result = await performDatabaseHealthCheck()

      expect(result.status).toBe('unhealthy')
      expect(result.checks.connection.connected).toBe(false)
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Database health check failed:',
        expect.any(Error)
      )
    })
  })

  describe('closeDatabaseConnection', () => {
    it('应该成功关闭数据库连接', async () => {
      mockPrismaInstance.$disconnect.mockResolvedValue(undefined)

      await closeDatabaseConnection()

      expect(mockPrismaInstance.$disconnect).toHaveBeenCalled()
      expect(consoleSpy.log).toHaveBeenCalledWith('Database connection closed successfully')
    })

    it('应该处理关闭连接时的错误', async () => {
      const error = new Error('Disconnect failed')
      mockPrismaInstance.$disconnect.mockRejectedValue(error)

      await closeDatabaseConnection()

      expect(consoleSpy.error).toHaveBeenCalledWith('Error closing database connection:', error)
    })
  })

  describe('reconnectDatabase', () => {
    it('应该成功重新连接数据库', async () => {
      mockPrismaInstance.$disconnect.mockResolvedValue(undefined)
      mockPrismaInstance.$connect.mockResolvedValue(undefined)
      mockPrismaInstance.$queryRaw.mockResolvedValue([{ test: 1 }])

      const result = await reconnectDatabase()

      expect(result).toBe(true)
      expect(mockPrismaInstance.$disconnect).toHaveBeenCalled()
      expect(mockPrismaInstance.$connect).toHaveBeenCalled()
    })

    it('应该处理重连失败的情况', async () => {
      const error = new Error('Reconnection failed')
      mockPrismaInstance.$disconnect.mockRejectedValue(error)

      const result = await reconnectDatabase()

      expect(result).toBe(false)
      expect(consoleSpy.error).toHaveBeenCalledWith('Database reconnection failed:', error)
    })
  })

  describe('getDatabasePoolStatus', () => {
    it('应该返回连接池状态', async () => {
      mockPrismaInstance.$connect.mockResolvedValue(undefined)
      mockPrismaInstance.$queryRaw.mockResolvedValue([{ test: 1 }])
      
      mockDateNow
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1050)

      const result = await getDatabasePoolStatus()

      expect(result.connected).toBe(true)
      expect(result.latency).toBe(50)
      expect(result.pool.active).toBe(1)
      expect(result.pool.idle).toBe(0)
      expect(result.pool.total).toBe(1)
    })

    it('应该处理连接池状态检查失败', async () => {
      mockPrismaInstance.$connect.mockRejectedValue(new Error('Pool status failed'))

      const result = await getDatabasePoolStatus()

      expect(result.connected).toBe(false)
      expect(result.error).toBe('Pool status failed')
      expect(result.pool.active).toBe(0)
      expect(result.pool.total).toBe(0)
    })
  })

  describe('prisma export', () => {
    it('应该导出prisma实例', () => {
      expect(prisma).toBeDefined()
    })
  })
})

// 测试进程事件监听器
describe('Process Event Listeners', () => {
  let originalProcess: NodeJS.Process
  let mockExit: jest.SpyInstance

  beforeAll(() => {
    originalProcess = global.process
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called')
    })
  })

  afterAll(() => {
    global.process = originalProcess
    mockExit.mockRestore()
  })

  it('应该注册进程退出事件监听器', () => {
    const mockProcess = {
      on: jest.fn(),
    } as any

    global.process = mockProcess

    // 重新导入模块以触发事件监听器注册
    jest.resetModules()
    require('@/lib/database/connection')

    expect(mockProcess.on).toHaveBeenCalledWith('beforeExit', expect.any(Function))
    expect(mockProcess.on).toHaveBeenCalledWith('SIGINT', expect.any(Function))
    expect(mockProcess.on).toHaveBeenCalledWith('SIGTERM', expect.any(Function))
  })
})