// @ts-nocheck
/**
 * 错误重试管理器测试
 * 确保智能对话的错误处理和重试机制100%可靠
 */

import { ErrorRetryManager } from '@/lib/chat/error-retry-manager'

describe('ErrorRetryManager - 智能对话错误重试管理', () => {
  let errorRetryManager: ErrorRetryManager
  
  beforeEach(() => {
    errorRetryManager = new ErrorRetryManager()
  })
  
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('基础功能测试', () => {
    test('应该正确初始化错误重试管理器', () => {
      expect(errorRetryManager).toBeDefined()
      expect(errorRetryManager).toBeInstanceOf(ErrorRetryManager)
    })

    test('应该正确设置默认配置', () => {
      const config = errorRetryManager.getConfig()
      expect(config).toMatchObject({
        maxRetries: expect.any(Number),
        baseDelay: expect.any(Number),
        maxDelay: expect.any(Number),
        backoffMultiplier: expect.any(Number)
      })
    })
  })

  describe('错误分类测试', () => {
    test('应该正确识别网络错误', () => {
      const networkError = new Error('Network request failed')
      networkError.name = 'NetworkError'
      
      const isRetryable = errorRetryManager.isRetryableError(networkError)
      expect(isRetryable).toBe(true)
    })

    test('应该正确识别超时错误', () => {
      const timeoutError = new Error('Request timeout')
      timeoutError.name = 'TimeoutError'
      
      const isRetryable = errorRetryManager.isRetryableError(timeoutError)
      expect(isRetryable).toBe(true)
    })

    test('应该正确识别服务器错误', () => {
      const serverError = new Error('Internal server error')
      serverError.name = 'ServerError'
      
      const isRetryable = errorRetryManager.isRetryableError(serverError)
      expect(isRetryable).toBe(true)
    })

    test('应该正确识别不可重试错误', () => {
      const authError = new Error('Unauthorized')
      authError.name = 'AuthError'
      
      const isRetryable = errorRetryManager.isRetryableError(authError)
      expect(isRetryable).toBe(false)
    })
  })

  describe('重试延迟计算测试', () => {
    test('应该正确计算指数退避延迟', () => {
      const delay1 = errorRetryManager.calculateDelay(1)
      const delay2 = errorRetryManager.calculateDelay(2)
      const delay3 = errorRetryManager.calculateDelay(3)
      
      expect(delay1).toBeGreaterThan(0)
      expect(delay2).toBeGreaterThan(delay1)
      expect(delay3).toBeGreaterThan(delay2)
    })

    test('应该限制最大延迟时间', () => {
      const maxDelay = errorRetryManager.getConfig().maxDelay
      const delay = errorRetryManager.calculateDelay(10)
      
      expect(delay).toBeLessThanOrEqual(maxDelay)
    })

    test('应该添加随机抖动', () => {
      const delay1 = errorRetryManager.calculateDelay(1)
      const delay2 = errorRetryManager.calculateDelay(1)
      
      // 由于随机抖动，两次计算的延迟可能不同
      expect(delay1).toBeGreaterThan(0)
      expect(delay2).toBeGreaterThan(0)
    })
  })

  describe('重试执行测试', () => {
    test('应该在成功时立即返回结果', async () => {
      const successFn = jest.fn().mockResolvedValue('success')
      
      const result = await errorRetryManager.executeWithRetry(successFn)
      
      expect(result).toBe('success')
      expect(successFn).toHaveBeenCalledTimes(1)
    })

    test('应该在可重试错误时进行重试', async () => {
      const retryableFn = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout error'))
        .mockResolvedValue('success')
      
      const result = await errorRetryManager.executeWithRetry(retryableFn)
      
      expect(result).toBe('success')
      expect(retryableFn).toHaveBeenCalledTimes(3)
    })

    test('应该在达到最大重试次数后抛出错误', async () => {
      const failingFn = jest.fn().mockRejectedValue(new Error('Persistent error'))
      
      await expect(errorRetryManager.executeWithRetry(failingFn))
        .rejects.toThrow('Persistent error')
      
      const maxRetries = errorRetryManager.getConfig().maxRetries
      expect(failingFn).toHaveBeenCalledTimes(maxRetries + 1)
    })

    test('应该在不可重试错误时立即抛出', async () => {
      const authError = new Error('Unauthorized')
      authError.name = 'AuthError'
      const nonRetryableFn = jest.fn().mockRejectedValue(authError)
      
      await expect(errorRetryManager.executeWithRetry(nonRetryableFn))
        .rejects.toThrow('Unauthorized')
      
      expect(nonRetryableFn).toHaveBeenCalledTimes(1)
    })
  })

  describe('错误统计测试', () => {
    test('应该正确记录错误统计', async () => {
      const failingFn = jest.fn().mockRejectedValue(new Error('Test error'))
      
      try {
        await errorRetryManager.executeWithRetry(failingFn)
      } catch (error) {
        // 预期的错误
      }
      
      const stats = errorRetryManager.getErrorStats()
      expect(stats.totalErrors).toBeGreaterThan(0)
      expect(stats.retryAttempts).toBeGreaterThan(0)
    })

    test('应该正确分类错误类型统计', async () => {
      const networkError = new Error('Network error')
      networkError.name = 'NetworkError'
      const networkFn = jest.fn().mockRejectedValue(networkError)
      
      try {
        await errorRetryManager.executeWithRetry(networkFn)
      } catch (error) {
        // 预期的错误
      }
      
      const stats = errorRetryManager.getErrorStats()
      expect(stats.errorTypes['NetworkError']).toBeGreaterThan(0)
    })
  })

  describe('配置更新测试', () => {
    test('应该允许更新重试配置', () => {
      const newConfig = {
        maxRetries: 5,
        baseDelay: 2000,
        maxDelay: 30000,
        backoffMultiplier: 3
      }
      
      errorRetryManager.updateConfig(newConfig)
      const updatedConfig = errorRetryManager.getConfig()
      
      expect(updatedConfig).toMatchObject(newConfig)
    })

    test('应该验证配置参数的有效性', () => {
      const invalidConfig = {
        maxRetries: -1,
        baseDelay: 0,
        maxDelay: -1000,
        backoffMultiplier: 0
      }
      
      expect(() => errorRetryManager.updateConfig(invalidConfig))
        .toThrow('Invalid configuration')
    })
  })

  describe('并发处理测试', () => {
    test('应该正确处理并发重试请求', async () => {
      const concurrentFns = Array.from({ length: 5 }, (_, i) => 
        jest.fn()
          .mockRejectedValueOnce(new Error(`Error ${i}`))
          .mockResolvedValue(`Success ${i}`)
      )
      
      const promises = concurrentFns.map(fn => 
        errorRetryManager.executeWithRetry(fn)
      )
      
      const results = await Promise.all(promises)
      
      expect(results).toEqual([
        'Success 0',
        'Success 1', 
        'Success 2',
        'Success 3',
        'Success 4'
      ])
    })
  })

  describe('内存管理测试', () => {
    test('应该正确清理过期的错误记录', () => {
      // 模拟大量错误记录
      for (let i = 0; i < 1000; i++) {
        errorRetryManager.recordError(new Error(`Error ${i}`))
      }
      
      const statsBefore = errorRetryManager.getErrorStats()
      expect(statsBefore.totalErrors).toBe(1000)
      
      // 清理过期记录
      errorRetryManager.cleanup()
      
      const statsAfter = errorRetryManager.getErrorStats()
      expect(statsAfter.totalErrors).toBeLessThan(1000)
    })
  })
}) 