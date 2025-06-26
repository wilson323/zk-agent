/**
 * 数据库服务测试
 * 测试database/index.ts中的DatabaseService类
 */

import { DatabaseService, prisma, cleanup } from '@/lib/database/index'
import { PrismaClient } from '@prisma/client'

// Mock Prisma Client
jest.mock('@prisma/client')

const mockPrismaInstance = {
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $queryRaw: jest.fn(),
  $transaction: jest.fn(),
}

;(PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(() => mockPrismaInstance as any)

// Mock console methods
const consoleSpy = {
  log: jest.spyOn(console, 'log').mockImplementation(),
  error: jest.spyOn(console, 'error').mockImplementation(),
}

describe('DatabaseService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    consoleSpy.log.mockClear()
    consoleSpy.error.mockClear()
  })

  afterAll(() => {
    consoleSpy.log.mockRestore()
    consoleSpy.error.mockRestore()
  })

  describe('getInstance', () => {
    it('应该返回Prisma客户端实例', () => {
      const instance = DatabaseService.getInstance()
      expect(instance).toBeDefined()
      expect(PrismaClient).toHaveBeenCalled()
    })

    it('应该返回相同的实例（单例模式）', () => {
      const instance1 = DatabaseService.getInstance()
      const instance2 = DatabaseService.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('connect', () => {
    it('应该成功连接数据库', async () => {
      mockPrismaInstance.$connect.mockResolvedValue(undefined)

      await DatabaseService.connect()

      expect(mockPrismaInstance.$connect).toHaveBeenCalled()
      expect(consoleSpy.log).toHaveBeenCalledWith('✅ Database connected successfully')
    })

    it('应该处理连接失败的情况', async () => {
      const error = new Error('Connection failed')
      mockPrismaInstance.$connect.mockRejectedValue(error)

      await expect(DatabaseService.connect()).rejects.toThrow('Connection failed')
      expect(consoleSpy.error).toHaveBeenCalledWith('❌ Database connection failed:', error)
    })
  })

  describe('disconnect', () => {
    it('应该成功断开数据库连接', async () => {
      mockPrismaInstance.$disconnect.mockResolvedValue(undefined)

      await DatabaseService.disconnect()

      expect(mockPrismaInstance.$disconnect).toHaveBeenCalled()
      expect(consoleSpy.log).toHaveBeenCalledWith('✅ Database disconnected successfully')
    })

    it('应该处理断开连接失败的情况', async () => {
      const error = new Error('Disconnection failed')
      mockPrismaInstance.$disconnect.mockRejectedValue(error)

      await expect(DatabaseService.disconnect()).rejects.toThrow('Disconnection failed')
      expect(consoleSpy.error).toHaveBeenCalledWith('❌ Database disconnection failed:', error)
    })
  })

  describe('healthCheck', () => {
    it('应该在数据库健康时返回true', async () => {
      mockPrismaInstance.$queryRaw.mockResolvedValue([{ '1': 1 }])

      const result = await DatabaseService.healthCheck()

      expect(result).toBe(true)
      expect(mockPrismaInstance.$queryRaw).toHaveBeenCalled()
    })

    it('应该在数据库不健康时返回false', async () => {
      const error = new Error('Health check failed')
      mockPrismaInstance.$queryRaw.mockRejectedValue(error)

      const result = await DatabaseService.healthCheck()

      expect(result).toBe(false)
      expect(consoleSpy.error).toHaveBeenCalledWith('❌ Database health check failed:', error)
    })
  })

  describe('runTransaction', () => {
    it('应该成功执行事务', async () => {
      const mockCallback = jest.fn().mockResolvedValue('transaction result')
      mockPrismaInstance.$transaction.mockImplementation((callback) => callback(mockPrismaInstance))

      const result = await DatabaseService.runTransaction(mockCallback)

      expect(result).toBe('transaction result')
      expect(mockPrismaInstance.$transaction).toHaveBeenCalled()
      expect(mockCallback).toHaveBeenCalledWith(mockPrismaInstance)
    })

    it('应该处理事务执行失败的情况', async () => {
      const error = new Error('Transaction failed')
      const mockCallback = jest.fn().mockRejectedValue(error)
      mockPrismaInstance.$transaction.mockImplementation((callback) => callback(mockPrismaInstance))

      await expect(DatabaseService.runTransaction(mockCallback)).rejects.toThrow('Transaction failed')
    })
  })

  describe('cleanup', () => {
    it('应该调用disconnect方法', async () => {
      mockPrismaInstance.$disconnect.mockResolvedValue(undefined)

      await cleanup()

      expect(mockPrismaInstance.$disconnect).toHaveBeenCalled()
    })
  })

  describe('prisma export', () => {
    it('应该导出prisma实例', () => {
      expect(prisma).toBeDefined()
      expect(prisma).toBe(DatabaseService.getInstance())
    })
  })
})

// 测试进程事件监听器
describe('Process Event Listeners', () => {
  let originalProcess: NodeJS.Process

  beforeAll(() => {
    originalProcess = global.process
  })

  afterAll(() => {
    global.process = originalProcess
  })

  it('应该注册进程退出事件监听器', () => {
    const mockProcess = {
      on: jest.fn(),
    } as any

    global.process = mockProcess

    // 重新导入模块以触发事件监听器注册
    jest.resetModules()
    require('@/lib/database/index')

    expect(mockProcess.on).toHaveBeenCalledWith('beforeExit', expect.any(Function))
    expect(mockProcess.on).toHaveBeenCalledWith('SIGINT', expect.any(Function))
    expect(mockProcess.on).toHaveBeenCalledWith('SIGTERM', expect.any(Function))
  })
})