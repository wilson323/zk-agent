import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals'
import { enhancedDb } from '../../lib/database/enhanced-connection'
import { databaseMonitor } from '../../lib/database/monitoring'
import { poolOptimizer } from '../../lib/database/pool-optimizer'
import { errorRecovery } from '../../lib/database/error-recovery'
import { checkDatabaseConnection, getDatabasePoolStatus } from '../../lib/database/connection'

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db'
process.env.ENHANCED_DB_CONNECTION = 'true'
process.env.DB_MONITORING_ENABLED = 'true'
process.env.DB_POOL_OPTIMIZATION_ENABLED = 'true'
process.env.DB_ERROR_RECOVERY_ENABLED = 'true'

describe('Database Integration Tests', () => {
  beforeAll(async () => {
    // 确保所有模块都已初始化
    await new Promise(resolve => setTimeout(resolve, 1000))
  })

  afterAll(async () => {
    // 清理所有连接和监控
    await enhancedDb.disconnect()
    databaseMonitor.stop()
    poolOptimizer.stop()
    errorRecovery.stop()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Enhanced Database Connection Integration', () => {
    it('should connect and provide basic functionality', async () => {
      const isConnected = await enhancedDb.connect()
      expect(isConnected).toBe(true)
      expect(enhancedDb.isConnected()).toBe(true)

      const stats = enhancedDb.getStats()
      expect(stats.state).toBe('connected')
      expect(stats.isHealthy).toBe(true)
    })

    it('should handle configuration updates', async () => {
      const newConfig = {
        maxConnections: 15,
        minConnections: 3,
        connectionTimeout: 8000
      }

      await enhancedDb.updateConfiguration(newConfig)
      const config = enhancedDb.getConfiguration()
      expect(config.pool).toMatchObject(newConfig)
    })

    it('should provide detailed statistics', () => {
      const detailedStats = enhancedDb.getDetailedStats()
      
      expect(detailedStats).toHaveProperty('state')
      expect(detailedStats).toHaveProperty('uptime')
      expect(detailedStats).toHaveProperty('configuration')
      expect(detailedStats).toHaveProperty('performance')
      expect(detailedStats.performance).toHaveProperty('successRate')
      expect(detailedStats.performance).toHaveProperty('queriesPerSecond')
      expect(detailedStats.performance).toHaveProperty('avgResponseTime')
    })
  })

  describe('Database Monitoring Integration', () => {
    it('should start monitoring and collect metrics', async () => {
      databaseMonitor.start()
      
      // 等待监控收集一些数据
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const metrics = databaseMonitor.getMetrics()
      expect(metrics).toHaveProperty('timestamp')
      expect(metrics).toHaveProperty('connections')
      expect(metrics).toHaveProperty('performance')
      expect(metrics).toHaveProperty('system')
    })

    it('should detect performance issues', async () => {
      const alertSpy = jest.fn()
      databaseMonitor.on('alert', alertSpy)

      // 模拟性能问题
      const mockMetrics = {
        timestamp: new Date(),
        connections: {
          active: 18, // 超过阈值
          idle: 2,
          total: 20
        },
        performance: {
          avgLatency: 1200, // 超过阈值
          queryRate: 50,
          errorRate: 0.05
        },
        system: {
          cpuUsage: 85, // 超过阈值
          memoryUsage: 90,
          diskUsage: 60
        }
      }

      // 手动触发性能检查
      databaseMonitor['checkPerformanceThresholds'](mockMetrics)
      
      // 验证是否生成了警报
      expect(alertSpy).toHaveBeenCalled()
    })
  })

  describe('Pool Optimizer Integration', () => {
    it('should start optimization and evaluate strategies', async () => {
      poolOptimizer.start()
      
      // 等待优化器运行
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const history = poolOptimizer.getOptimizationHistory()
      expect(Array.isArray(history)).toBe(true)
    })

    it('should respond to performance alerts', async () => {
      const optimizationSpy = jest.fn()
      poolOptimizer.on('optimizationApplied', optimizationSpy)

      // 模拟性能警报
      const alert = {
        id: 'test-alert',
        type: 'performance' as const,
        severity: 'high' as const,
        message: 'High connection usage detected',
        timestamp: new Date(),
        metrics: {
          connections: { active: 18, idle: 2, total: 20 },
          performance: { avgLatency: 800, queryRate: 100, errorRate: 0.02 }
        }
      }

      // 手动触发警报处理
      poolOptimizer['handleAlert'](alert)
      
      // 验证是否应用了优化
      expect(optimizationSpy).toHaveBeenCalled()
    })
  })

  describe('Error Recovery Integration', () => {
    it('should start error recovery system', () => {
      errorRecovery.start()
      
      const stats = errorRecovery.getStats()
      expect(stats).toHaveProperty('totalErrors')
      expect(stats).toHaveProperty('recoveryAttempts')
      expect(stats).toHaveProperty('circuitBreakerState')
    })

    it('should handle database errors', async () => {
      const recoverySpy = jest.fn()
      errorRecovery.on('recoveryExecuted', recoverySpy)

      // 模拟数据库错误
      const error = new Error('Connection timeout')
      error.name = 'ConnectionError'

      // 手动触发错误处理
      await errorRecovery.handleError(error)
      
      // 验证是否执行了恢复策略
      expect(recoverySpy).toHaveBeenCalled()
    })

    it('should update circuit breaker state', async () => {
      // 模拟多次错误以触发断路器
      for (let i = 0; i < 6; i++) {
        const error = new Error(`Error ${i}`)
        await errorRecovery.handleError(error)
      }

      const stats = errorRecovery.getStats()
      expect(stats.circuitBreakerState).toBe('open')
    })
  })

  describe('Legacy Connection Integration', () => {
    it('should work with existing connection functions', async () => {
      const connectionStatus = await checkDatabaseConnection()
      
      expect(connectionStatus).toHaveProperty('connected')
      expect(connectionStatus).toHaveProperty('message')
      expect(connectionStatus).toHaveProperty('stats')
      
      if (connectionStatus.connected) {
        expect(connectionStatus.stats).toHaveProperty('totalQueries')
        expect(connectionStatus.stats).toHaveProperty('failedQueries')
        expect(connectionStatus.stats).toHaveProperty('avgLatency')
      }
    })

    it('should provide enhanced pool status', async () => {
      const poolStatus = await getDatabasePoolStatus()
      
      expect(poolStatus).toHaveProperty('status')
      expect(poolStatus).toHaveProperty('connections')
      expect(poolStatus).toHaveProperty('performance')
      
      if (enhancedDb.isConnected()) {
        expect(poolStatus.performance).toHaveProperty('successRate')
        expect(poolStatus.performance).toHaveProperty('avgLatency')
        expect(poolStatus.connections).toHaveProperty('reconnectAttempts')
      }
    })
  })

  describe('End-to-End Workflow', () => {
    it('should handle complete error recovery workflow', async () => {
      // 1. 连接数据库
      await enhancedDb.connect()
      expect(enhancedDb.isConnected()).toBe(true)

      // 2. 启动所有监控系统
      databaseMonitor.start()
      poolOptimizer.start()
      errorRecovery.start()

      // 3. 模拟查询执行
      try {
        await enhancedDb.executeQuery(async (prisma) => {
          // 模拟简单查询
          return { result: 'success' }
        })
      } catch (error) {
        // 预期可能的错误
      }

      // 4. 检查统计信息
      const stats = enhancedDb.getDetailedStats()
      expect(stats.totalQueries).toBeGreaterThan(0)

      // 5. 验证监控数据
      const metrics = databaseMonitor.getMetrics()
      expect(metrics.timestamp).toBeInstanceOf(Date)

      // 6. 验证错误恢复状态
      const errorStats = errorRecovery.getStats()
      expect(errorStats).toHaveProperty('totalErrors')

      // 7. 清理
      databaseMonitor.stop()
      poolOptimizer.stop()
      errorRecovery.stop()
      await enhancedDb.disconnect()
    })

    it('should maintain system stability under load', async () => {
      await enhancedDb.connect()
      
      // 启动监控
      databaseMonitor.start()
      errorRecovery.start()

      // 模拟并发查询
      const queries = Array.from({ length: 10 }, (_, i) => 
        enhancedDb.executeQuery(async () => ({ id: i, result: 'test' }))
          .catch(error => ({ error: error.message }))
      )

      const results = await Promise.all(queries)
      
      // 验证系统仍然稳定
      expect(enhancedDb.isConnected()).toBe(true)
      expect(results.length).toBe(10)

      // 检查性能指标
      const detailedStats = enhancedDb.getDetailedStats()
      expect(detailedStats.performance.successRate).toBeGreaterThan(0)

      // 清理
      databaseMonitor.stop()
      errorRecovery.stop()
      await enhancedDb.disconnect()
    })
  })

  describe('Configuration Management', () => {
    it('should handle dynamic configuration updates', async () => {
      await enhancedDb.connect()

      // 更新连接池配置
      const poolConfig = {
        maxConnections: 25,
        minConnections: 5,
        connectionTimeout: 10000
      }
      
      await enhancedDb.updateConfiguration(poolConfig)
      
      // 更新恢复配置
      const recoveryConfig = {
        maxRetries: 5,
        retryDelay: 2000,
        circuitBreakerThreshold: 8
      }
      
      enhancedDb.updateRecoveryConfiguration(recoveryConfig)
      
      // 验证配置已更新
      const currentConfig = enhancedDb.getConfiguration()
      expect(currentConfig.pool).toMatchObject(poolConfig)
      expect(currentConfig.recovery).toMatchObject(recoveryConfig)
    })
  })
})