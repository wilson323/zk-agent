/**
 * @file Enhanced Database Connection Tests
 * @description 增强数据库连接管理器的测试文件
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import type { MockedFunction, MockedClass } from 'jest-mock'
import { 
  EnhancedDatabaseConnection, 
  ConnectionState,
  enhancedDb,
  connectDatabase,
  disconnectDatabase,
  getDatabaseStats,
  isDatabaseConnected,
  executeQuery
} from '../../lib/database/enhanced-connection'
import { PrismaClient } from '@prisma/client'

// 模拟Prisma客户端
jest.mock('@prisma/client')
const MockedPrismaClient = PrismaClient as MockedClass<typeof PrismaClient>

describe('增强数据库连接管理器测试', () => {
  let connection: EnhancedDatabaseConnection
  let mockPrismaClient: any

  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks()
    
    // 创建模拟的Prisma客户端
    mockPrismaClient = {
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      $queryRaw: jest.fn(),
    } as any
    
    MockedPrismaClient.mockImplementation(() => mockPrismaClient)
    
    // 创建新的连接实例
    connection = new EnhancedDatabaseConnection(
      { maxConnections: 10, minConnections: 2 },
      { enabled: true, maxRetries: 3 },
      { enabled: true, intervalMs: 5000 }
    )
  })

  afterEach(async () => {
    // 清理连接
    if (connection.isConnected()) {
      await connection.disconnect()
    }
  })

  describe('连接管理', () => {
    it('应该成功连接到数据库', async () => {
      // 模拟成功连接
      mockPrismaClient.$connect.mockResolvedValue(undefined)
      mockPrismaClient.$queryRaw.mockResolvedValue([{ test: 1 }])
      
      await connection.connect()
      
      expect(connection.isConnected()).toBe(true)
      expect(connection.getState()).toBe(ConnectionState.CONNECTED)
      expect(mockPrismaClient.$connect).toHaveBeenCalled()
    })

    it('应该处理连接失败', async () => {
      // 模拟连接失败
      const connectionError = new Error('Connection failed')
      mockPrismaClient.$connect.mockRejectedValue(connectionError)
      
      await expect(connection.connect()).rejects.toThrow('Connection failed')
      expect(connection.getState()).toBe(ConnectionState.FAILED)
    })

    it('应该成功断开连接', async () => {
      // 先连接
      mockPrismaClient.$connect.mockResolvedValue(undefined)
      mockPrismaClient.$queryRaw.mockResolvedValue([{ test: 1 }])
      await connection.connect()
      
      // 模拟断开连接
      mockPrismaClient.$disconnect.mockResolvedValue(undefined)
      
      await connection.disconnect()
      
      expect(connection.isConnected()).toBe(false)
      expect(connection.getState()).toBe(ConnectionState.DISCONNECTED)
      expect(mockPrismaClient.$disconnect).toHaveBeenCalled()
    })
  })

  describe('重连机制', () => {
    it('应该在连接失败后自动重连', async () => {
      // 配置重连
      connection.updateConfig(undefined, { 
        enabled: true, 
        maxRetries: 2, 
        retryDelayMs: 100 
      })
      
      // 第一次连接失败
      mockPrismaClient.$connect
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce(undefined)
      
      mockPrismaClient.$queryRaw.mockResolvedValue([{ test: 1 }])
      
      // 监听重连事件
      const reconnectingPromise = new Promise(resolve => {
        connection.once('reconnecting', resolve)
      })
      
      const reconnectedPromise = new Promise(resolve => {
        connection.once('reconnected', resolve)
      })
      
      // 尝试连接（会失败并触发重连）
      await expect(connection.connect()).rejects.toThrow('First attempt failed')
      
      // 等待重连事件
      await reconnectingPromise
      await reconnectedPromise
      
      expect(connection.isConnected()).toBe(true)
    }, 10000)

    it('应该在达到最大重试次数后停止重连', async () => {
      // 配置重连
      connection.updateConfig(undefined, { 
        enabled: true, 
        maxRetries: 1, 
        retryDelayMs: 100 
      })
      
      // 所有连接尝试都失败
      mockPrismaClient.$connect.mockRejectedValue(new Error('Connection always fails'))
      
      // 监听错误事件
      const errorPromise = new Promise(resolve => {
        connection.once('error', resolve)
      })
      
      // 尝试连接
      await expect(connection.connect()).rejects.toThrow('Connection always fails')
      
      // 等待错误事件
      await errorPromise
      
      // 等待重连尝试完成
      await new Promise(resolve => setTimeout(resolve, 500))
      
      expect(connection.getState()).toBe(ConnectionState.FAILED)
    }, 10000)
  })

  describe('健康检查', () => {
    it('应该定期执行健康检查', async () => {
      // 启用健康检查
      connection.updateConfig(undefined, undefined, { 
        enabled: true, 
        intervalMs: 200 
      })
      
      // 模拟成功连接和健康检查
      mockPrismaClient.$connect.mockResolvedValue(undefined)
      mockPrismaClient.$queryRaw.mockResolvedValue([{ health_check: 1 }])
      
      await connection.connect()
      
      // 监听健康检查事件
      const healthCheckPromise = new Promise(resolve => {
        connection.once('healthCheck', resolve)
      })
      
      // 等待健康检查执行
      const result = await healthCheckPromise
      
      expect(result).toBe(true)
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('health_check')])
      )
    }, 5000)

    it('应该处理健康检查失败', async () => {
      // 启用健康检查
      connection.updateConfig(undefined, undefined, { 
        enabled: true, 
        intervalMs: 200,
        timeoutMs: 100
      })
      
      // 模拟成功连接但健康检查失败
      mockPrismaClient.$connect.mockResolvedValue(undefined)
      mockPrismaClient.$queryRaw
        .mockResolvedValueOnce([{ test: 1 }]) // 初始连接验证
        .mockRejectedValue(new Error('Health check failed')) // 健康检查失败
      
      await connection.connect()
      
      // 监听健康检查失败事件
      const healthCheckPromise = new Promise(resolve => {
        connection.once('healthCheck', resolve)
      })
      
      // 等待健康检查失败
      const result = await healthCheckPromise
      
      expect(result).toBe(false)
    }, 5000)
  })

  describe('查询执行', () => {
    it('应该成功执行查询并更新统计信息', async () => {
      // 连接数据库
      mockPrismaClient.$connect.mockResolvedValue(undefined)
      mockPrismaClient.$queryRaw.mockResolvedValue([{ test: 1 }])
      await connection.connect()
      
      // 执行查询
      const queryResult = await connection.executeQuery(async (client) => {
        return await client.$queryRaw`SELECT * FROM users LIMIT 1`
      })
      
      expect(queryResult).toEqual([{ test: 1 }])
      
      // 检查统计信息
      const stats = connection.getStats()
      expect(stats.totalQueries).toBeGreaterThan(0)
      expect(stats.avgLatency).toBeGreaterThan(0)
    })

    it('应该处理查询失败并更新失败统计', async () => {
      // 连接数据库
      mockPrismaClient.$connect.mockResolvedValue(undefined)
      mockPrismaClient.$queryRaw
        .mockResolvedValueOnce([{ test: 1 }]) // 连接验证
        .mockRejectedValueOnce(new Error('Query failed')) // 查询失败
      
      await connection.connect()
      
      // 执行失败的查询
      await expect(connection.executeQuery(async (client) => {
        return await client.$queryRaw`SELECT * FROM non_existent_table`
      })).rejects.toThrow('Query failed')
      
      // 检查失败统计
      const stats = connection.getStats()
      expect(stats.failedQueries).toBeGreaterThan(0)
    })

    it('应该在未连接时拒绝查询', async () => {
      // 确保未连接
      expect(connection.isConnected()).toBe(false)
      
      // 尝试执行查询
      await expect(connection.executeQuery(async (client) => {
        return await client.$queryRaw`SELECT 1`
      })).rejects.toThrow('Database not connected')
    })
  })

  describe('统计信息', () => {
    it('应该正确跟踪连接统计信息', async () => {
      // 连接数据库
      mockPrismaClient.$connect.mockResolvedValue(undefined)
      mockPrismaClient.$queryRaw.mockResolvedValue([{ test: 1 }])
      await connection.connect()
      
      // 获取统计信息
      const stats = connection.getStats()
      
      expect(stats.state).toBe(ConnectionState.CONNECTED)
      expect(stats.connectedAt).toBeInstanceOf(Date)
      expect(stats.reconnectAttempts).toBe(0)
      expect(stats.uptime).toBeGreaterThanOrEqual(0)
    })

    it('应该正确计算运行时间', async () => {
      // 连接数据库
      mockPrismaClient.$connect.mockResolvedValue(undefined)
      mockPrismaClient.$queryRaw.mockResolvedValue([{ test: 1 }])
      await connection.connect()
      
      // 等待一段时间
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // 检查运行时间
      const stats = connection.getStats()
      expect(stats.uptime).toBeGreaterThan(90) // 至少90ms
    })
  })

  describe('配置更新', () => {
    it('应该允许动态更新连接池配置', () => {
      const newPoolConfig = {
        maxConnections: 20,
        minConnections: 5
      }
      
      connection.updateConfig(newPoolConfig)
      
      // 配置应该已更新（无法直接验证私有属性，但不应抛出错误）
      expect(() => connection.updateConfig(newPoolConfig)).not.toThrow()
    })

    it('应该允许动态更新重连配置', () => {
      const newReconnectionConfig = {
        enabled: false,
        maxRetries: 5
      }
      
      connection.updateConfig(undefined, newReconnectionConfig)
      
      // 配置应该已更新
      expect(() => connection.updateConfig(undefined, newReconnectionConfig)).not.toThrow()
    })

    it('应该允许动态更新健康检查配置', async () => {
      // 先连接
      mockPrismaClient.$connect.mockResolvedValue(undefined)
      mockPrismaClient.$queryRaw.mockResolvedValue([{ test: 1 }])
      await connection.connect()
      
      const newHealthCheckConfig = {
        enabled: true,
        intervalMs: 1000
      }
      
      connection.updateConfig(undefined, undefined, newHealthCheckConfig)
      
      // 配置应该已更新
      expect(() => connection.updateConfig(undefined, undefined, newHealthCheckConfig)).not.toThrow()
    })
  })

  describe('全局实例测试', () => {
    it('应该提供全局数据库连接实例', () => {
      expect(enhancedDb).toBeInstanceOf(EnhancedDatabaseConnection)
    })

    it('应该提供便捷的连接函数', async () => {
      // 模拟成功连接
      mockPrismaClient.$connect.mockResolvedValue(undefined)
      mockPrismaClient.$queryRaw.mockResolvedValue([{ test: 1 }])
      
      await connectDatabase()
      
      expect(isDatabaseConnected()).toBe(true)
      
      const stats = getDatabaseStats()
      expect(stats.state).toBe(ConnectionState.CONNECTED)
      
      await disconnectDatabase()
      expect(isDatabaseConnected()).toBe(false)
    })

    it('应该提供便捷的查询执行函数', async () => {
      // 模拟成功连接
      mockPrismaClient.$connect.mockResolvedValue(undefined)
      mockPrismaClient.$queryRaw.mockResolvedValue([{ result: 'success' }])
      
      await connectDatabase()
      
      const result = await executeQuery(async (client) => {
        return await client.$queryRaw`SELECT 'success' as result`
      })
      
      expect(result).toEqual([{ result: 'success' }])
      
      await disconnectDatabase()
    })
  })

  describe('错误处理', () => {
    it('应该正确识别连接相关错误', async () => {
      // 连接数据库
      mockPrismaClient.$connect.mockResolvedValue(undefined)
      mockPrismaClient.$queryRaw
        .mockResolvedValueOnce([{ test: 1 }]) // 连接验证
        .mockRejectedValueOnce(new Error('ECONNREFUSED: Connection refused')) // 连接错误
      
      await connection.connect()
      
      // 监听错误事件
      const errorPromise = new Promise(resolve => {
        connection.once('error', resolve)
      })
      
      // 执行会导致连接错误的查询
      await expect(connection.executeQuery(async (client) => {
        return await client.$queryRaw`SELECT 1`
      })).rejects.toThrow('ECONNREFUSED')
      
      // 等待错误事件
      await errorPromise
    })

    it('应该处理优雅关闭', async () => {
      // 连接数据库
      mockPrismaClient.$connect.mockResolvedValue(undefined)
      mockPrismaClient.$queryRaw.mockResolvedValue([{ test: 1 }])
      mockPrismaClient.$disconnect.mockResolvedValue(undefined)
      
      await connection.connect()
      
      // 执行优雅关闭
      await expect(connection.gracefulShutdown()).resolves.not.toThrow()
    })
  })

  describe('事件系统', () => {
    it('应该正确触发连接事件', async () => {
      // 监听连接事件
      const connectedPromise = new Promise(resolve => {
        connection.once('connected', resolve)
      })
      
      // 模拟成功连接
      mockPrismaClient.$connect.mockResolvedValue(undefined)
      mockPrismaClient.$queryRaw.mockResolvedValue([{ test: 1 }])
      
      await connection.connect()
      
      // 等待连接事件
      await connectedPromise
    })

    it('应该正确触发断开连接事件', async () => {
      // 先连接
      mockPrismaClient.$connect.mockResolvedValue(undefined)
      mockPrismaClient.$queryRaw.mockResolvedValue([{ test: 1 }])
      await connection.connect()
      
      // 监听断开连接事件
      const disconnectedPromise = new Promise(resolve => {
        connection.once('disconnected', resolve)
      })
      
      // 模拟断开连接
      mockPrismaClient.$disconnect.mockResolvedValue(undefined)
      
      await connection.disconnect()
      
      // 等待断开连接事件
      await disconnectedPromise
    })

    it('应该正确触发错误事件', async () => {
      // 监听错误事件
      const errorPromise = new Promise(resolve => {
        connection.once('error', resolve)
      })
      
      // 模拟连接失败
      const connectionError = new Error('Connection failed')
      mockPrismaClient.$connect.mockRejectedValue(connectionError)
      
      await expect(connection.connect()).rejects.toThrow('Connection failed')
      
      // 等待错误事件
      const error = await errorPromise
      expect(error).toBe(connectionError)
    })
  })
})