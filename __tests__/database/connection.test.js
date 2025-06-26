const { checkDatabaseConnection, getDatabasePoolStatus } = require('../../lib/database/connection')

// Mock Prisma Client for testing
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
      $queryRaw: jest.fn().mockResolvedValue([{ version: '14.0' }]),
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, name: 'test' })
      }
    }))
  }
})

// Mock enhanced database connection
jest.mock('../../lib/database/enhanced-connection', () => {
  const mockEnhancedDb = {
    isConnected: jest.fn().mockReturnValue(true),
    connect: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn().mockResolvedValue(true),
    getClient: jest.fn().mockReturnValue({
      $connect: jest.fn().mockResolvedValue(undefined),
      $queryRaw: jest.fn().mockResolvedValue([{ version: '14.0' }]),
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, name: 'test' })
      }
    }),
    getStats: jest.fn().mockReturnValue({
      state: 'connected',
      uptime: 10000,
      totalQueries: 5,
      failedQueries: 0,
      avgLatency: 50,
      reconnectAttempts: 0,
      lastHealthCheck: new Date(),
      isHealthy: true
    }),
    getDetailedStats: jest.fn().mockReturnValue({
      state: 'connected',
      uptime: 10000,
      totalQueries: 5,
      failedQueries: 0,
      avgLatency: 50,
      reconnectAttempts: 0,
      lastHealthCheck: new Date(),
      isHealthy: true,
      configuration: {
        pool: { maxConnections: 10, minConnections: 2 },
        recovery: { maxRetries: 3, retryDelay: 1000 }
      },
      performance: {
        successRate: 100,
        queriesPerSecond: 0.5,
        avgResponseTime: 50
      }
    })
  }
  
  return {
    enhancedDb: mockEnhancedDb
  }
})

describe('Database Connection Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Set environment variable for enhanced connection
    process.env.ENHANCED_DB_CONNECTION = 'true'
  })

  afterEach(() => {
    delete process.env.ENHANCED_DB_CONNECTION
  })

  describe('checkDatabaseConnection', () => {
    it('should successfully connect to database with enhanced connection', async () => {
      const result = await checkDatabaseConnection()
      
      expect(result).toHaveProperty('connected')
      expect(result).toHaveProperty('message')
      expect(result).toHaveProperty('stats')
      
      if (result.connected) {
        expect(result.stats).toHaveProperty('totalQueries')
        expect(result.stats).toHaveProperty('failedQueries')
        expect(result.stats).toHaveProperty('avgLatency')
        expect(result.stats).toHaveProperty('reconnectAttempts')
      }
    })

    it('should handle connection errors gracefully', async () => {
      // Mock enhanced db to simulate connection failure
      const { enhancedDb } = require('../../lib/database/enhanced-connection')
      enhancedDb.isConnected.mockReturnValue(false)
      enhancedDb.getClient.mockReturnValue(null)
      
      const result = await checkDatabaseConnection()
      
      expect(result).toHaveProperty('connected')
      expect(result).toHaveProperty('message')
      expect(typeof result.connected).toBe('boolean')
      expect(typeof result.message).toBe('string')
    })

    it('should provide detailed error information on failure', async () => {
      // Mock enhanced db to throw error
      const { enhancedDb } = require('../../lib/database/enhanced-connection')
      enhancedDb.getClient.mockImplementation(() => {
        throw new Error('Connection timeout')
      })
      
      const result = await checkDatabaseConnection()
      
      expect(result.connected).toBe(false)
      expect(result.message).toContain('Connection timeout')
    })
  })

  describe('getDatabasePoolStatus', () => {
    it('should return comprehensive pool status with enhanced connection', async () => {
      const result = await getDatabasePoolStatus()
      
      expect(result).toHaveProperty('status')
      expect(result).toHaveProperty('connections')
      expect(result).toHaveProperty('performance')
      expect(result).toHaveProperty('configuration')
      
      // Check enhanced connection specific fields
      if (result.connections) {
        expect(result.connections).toHaveProperty('state')
        expect(result.connections).toHaveProperty('uptime')
        expect(result.connections).toHaveProperty('reconnectAttempts')
      }
      
      if (result.performance) {
        expect(result.performance).toHaveProperty('successRate')
        expect(result.performance).toHaveProperty('avgLatency')
      }
    })

    it('should handle enhanced connection unavailable scenario', async () => {
      // Mock enhanced db as disconnected
      const { enhancedDb } = require('../../lib/database/enhanced-connection')
      enhancedDb.isConnected.mockReturnValue(false)
      
      const result = await getDatabasePoolStatus()
      
      expect(result).toHaveProperty('status')
      expect(result.status).toBe('disconnected')
    })

    it('should provide fallback status when enhanced connection fails', async () => {
      // Mock enhanced db to throw error
      const { enhancedDb } = require('../../lib/database/enhanced-connection')
      enhancedDb.getDetailedStats.mockImplementation(() => {
        throw new Error('Stats unavailable')
      })
      
      const result = await getDatabasePoolStatus()
      
      expect(result).toHaveProperty('status')
      expect(typeof result.status).toBe('string')
    })
  })

  describe('Database Connection Integration', () => {
    it('should maintain connection state consistency', async () => {
      const connectionResult = await checkDatabaseConnection()
      const poolStatus = await getDatabasePoolStatus()
      
      // If connection is successful, pool should reflect that
      if (connectionResult.connected) {
        expect(poolStatus.status).not.toBe('error')
      }
    })

    it('should provide performance metrics', async () => {
      const poolStatus = await getDatabasePoolStatus()
      
      if (poolStatus.performance) {
        expect(typeof poolStatus.performance.successRate).toBe('number')
        expect(typeof poolStatus.performance.avgLatency).toBe('number')
        expect(poolStatus.performance.successRate).toBeGreaterThanOrEqual(0)
        expect(poolStatus.performance.successRate).toBeLessThanOrEqual(100)
      }
    })

    it('should handle configuration information', async () => {
      const poolStatus = await getDatabasePoolStatus()
      
      if (poolStatus.configuration) {
        expect(poolStatus.configuration).toHaveProperty('pool')
        if (poolStatus.configuration.pool) {
          expect(typeof poolStatus.configuration.pool).toBe('object')
        }
      }
    })
  })

  describe('Error Recovery and Resilience', () => {
    it('should handle database reconnection scenarios', async () => {
      const { enhancedDb } = require('../../lib/database/enhanced-connection')
      
      // Simulate reconnection scenario
      enhancedDb.getStats.mockReturnValue({
        state: 'connected',
        uptime: 5000,
        totalQueries: 10,
        failedQueries: 2,
        avgLatency: 75,
        reconnectAttempts: 1,
        lastHealthCheck: new Date(),
        isHealthy: true
      })
      
      const result = await checkDatabaseConnection()
      
      expect(result.connected).toBe(true)
      expect(result.stats.reconnectAttempts).toBe(1)
    })

    it('should track query performance over time', async () => {
      const { enhancedDb } = require('../../lib/database/enhanced-connection')
      
      // Simulate performance tracking
      enhancedDb.getDetailedStats.mockReturnValue({
        state: 'connected',
        uptime: 60000,
        totalQueries: 100,
        failedQueries: 5,
        avgLatency: 45,
        reconnectAttempts: 0,
        lastHealthCheck: new Date(),
        isHealthy: true,
        configuration: {
          pool: { maxConnections: 20, minConnections: 5 },
          recovery: { maxRetries: 5, retryDelay: 2000 }
        },
        performance: {
          successRate: 95,
          queriesPerSecond: 1.67,
          avgResponseTime: 45
        }
      })
      
      const poolStatus = await getDatabasePoolStatus()
      
      expect(poolStatus.performance.successRate).toBe(95)
      expect(poolStatus.performance.queriesPerSecond).toBeCloseTo(1.67, 1)
      expect(poolStatus.connections.totalQueries).toBe(100)
      expect(poolStatus.connections.failedQueries).toBe(5)
    })
  })
})