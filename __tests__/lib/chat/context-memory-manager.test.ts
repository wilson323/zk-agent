// @ts-nocheck
/**
 * 上下文内存管理器测试
 * 确保智能对话的上下文管理100%可靠
 */

import { ContextMemoryManager } from '@/lib/chat/context-memory-manager'

describe('ContextMemoryManager - 智能对话上下文内存管理', () => {
  let contextManager: ContextMemoryManager
  
  beforeEach(() => {
    contextManager = new ContextMemoryManager()
  })
  
  afterEach(() => {
    jest.clearAllMocks()
    contextManager.clear()
  })

  describe('基础功能测试', () => {
    test('应该正确初始化上下文内存管理器', () => {
      expect(contextManager).toBeDefined()
      expect(contextManager).toBeInstanceOf(ContextMemoryManager)
    })

    test('应该正确设置默认配置', () => {
      const config = contextManager.getConfig()
      expect(config).toMatchObject({
        maxContextLength: expect.any(Number),
        maxMessages: expect.any(Number),
        compressionThreshold: expect.any(Number),
        retentionTime: expect.any(Number)
      })
    })
  })

  describe('消息存储测试', () => {
    test('应该正确存储单条消息', () => {
      const message = {
        id: 'msg-1',
        content: '你好',
        role: 'user',
        timestamp: Date.now()
      }
      
      contextManager.addMessage('session-1', message)
      const messages = contextManager.getMessages('session-1')
      
      expect(messages).toHaveLength(1)
      expect(messages[0]).toMatchObject(message)
    })

    test('应该正确存储多条消息', () => {
      const messages = [
        { id: 'msg-1', content: '你好', role: 'user', timestamp: Date.now() },
        { id: 'msg-2', content: '你好！有什么可以帮助你的吗？', role: 'assistant', timestamp: Date.now() + 1000 },
        { id: 'msg-3', content: '请介绍一下你的功能', role: 'user', timestamp: Date.now() + 2000 }
      ]
      
      messages.forEach(msg => contextManager.addMessage('session-1', msg))
      const storedMessages = contextManager.getMessages('session-1')
      
      expect(storedMessages).toHaveLength(3)
      expect(storedMessages).toEqual(messages)
    })

    test('应该按时间顺序存储消息', () => {
      const message1 = { id: 'msg-1', content: '第一条', role: 'user', timestamp: Date.now() + 2000 }
      const message2 = { id: 'msg-2', content: '第二条', role: 'user', timestamp: Date.now() + 1000 }
      const message3 = { id: 'msg-3', content: '第三条', role: 'user', timestamp: Date.now() + 3000 }
      
      contextManager.addMessage('session-1', message1)
      contextManager.addMessage('session-1', message2)
      contextManager.addMessage('session-1', message3)
      
      const messages = contextManager.getMessages('session-1')
      expect(messages[0].content).toBe('第二条')
      expect(messages[1].content).toBe('第一条')
      expect(messages[2].content).toBe('第三条')
    })
  })

  describe('上下文长度管理测试', () => {
    test('应该正确计算上下文长度', () => {
      const messages = [
        { id: 'msg-1', content: '短消息', role: 'user', timestamp: Date.now() },
        { id: 'msg-2', content: '这是一条比较长的消息内容，用于测试上下文长度计算', role: 'assistant', timestamp: Date.now() + 1000 }
      ]
      
      messages.forEach(msg => contextManager.addMessage('session-1', msg))
      const contextLength = contextManager.getContextLength('session-1')
      
      expect(contextLength).toBeGreaterThan(0)
      expect(contextLength).toBe(messages.reduce((total, msg) => total + msg.content.length, 0))
    })

    test('应该在超过最大长度时自动压缩', () => {
      // 设置较小的最大长度用于测试
      contextManager.updateConfig({ maxContextLength: 100 })
      
      const longMessages = Array.from({ length: 10 }, (_, i) => ({
        id: `msg-${i}`,
        content: `这是第${i}条很长的消息内容，用于测试自动压缩功能`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        timestamp: Date.now() + i * 1000
      }))
      
      longMessages.forEach(msg => contextManager.addMessage('session-1', msg))
      
      const contextLength = contextManager.getContextLength('session-1')
      expect(contextLength).toBeLessThanOrEqual(100)
    })
  })

  describe('消息数量限制测试', () => {
    test('应该在超过最大消息数时移除旧消息', () => {
      // 设置较小的最大消息数用于测试
      contextManager.updateConfig({ maxMessages: 5 })
      
      const messages = Array.from({ length: 10 }, (_, i) => ({
        id: `msg-${i}`,
        content: `消息 ${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        timestamp: Date.now() + i * 1000
      }))
      
      messages.forEach(msg => contextManager.addMessage('session-1', msg))
      const storedMessages = contextManager.getMessages('session-1')
      
      expect(storedMessages).toHaveLength(5)
      expect(storedMessages[0].content).toBe('消息 5')
      expect(storedMessages[4].content).toBe('消息 9')
    })
  })

  describe('上下文压缩测试', () => {
    test('应该正确压缩长上下文', () => {
      const longMessages = Array.from({ length: 20 }, (_, i) => ({
        id: `msg-${i}`,
        content: `这是第${i}条消息，包含了很多详细的内容和信息，用于测试上下文压缩功能的有效性`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        timestamp: Date.now() + i * 1000
      }))
      
      longMessages.forEach(msg => contextManager.addMessage('session-1', msg))
      
      const originalLength = contextManager.getContextLength('session-1')
      await contextManager.compressContext('session-1')
      const compressedLength = contextManager.getContextLength('session-1')
      
      expect(compressedLength).toBeLessThan(originalLength)
    })

    test('应该保留重要消息在压缩后', async () => {
      const messages = [
        { id: 'msg-1', content: '重要：这是关键信息', role: 'user', timestamp: Date.now(), importance: 'high' },
        { id: 'msg-2', content: '普通消息', role: 'assistant', timestamp: Date.now() + 1000 },
        { id: 'msg-3', content: '另一条普通消息', role: 'user', timestamp: Date.now() + 2000 },
        { id: 'msg-4', content: '重要：这也是关键信息', role: 'assistant', timestamp: Date.now() + 3000, importance: 'high' }
      ]
      
      messages.forEach(msg => contextManager.addMessage('session-1', msg))
      await contextManager.compressContext('session-1')
      
      const compressedMessages = contextManager.getMessages('session-1')
      const importantMessages = compressedMessages.filter(msg => msg.content.includes('重要'))
      
      expect(importantMessages).toHaveLength(2)
    })
  })

  describe('会话管理测试', () => {
    test('应该正确管理多个会话', () => {
      const session1Messages = [
        { id: 'msg-1-1', content: '会话1消息1', role: 'user', timestamp: Date.now() },
        { id: 'msg-1-2', content: '会话1消息2', role: 'assistant', timestamp: Date.now() + 1000 }
      ]
      
      const session2Messages = [
        { id: 'msg-2-1', content: '会话2消息1', role: 'user', timestamp: Date.now() },
        { id: 'msg-2-2', content: '会话2消息2', role: 'assistant', timestamp: Date.now() + 1000 }
      ]
      
      session1Messages.forEach(msg => contextManager.addMessage('session-1', msg))
      session2Messages.forEach(msg => contextManager.addMessage('session-2', msg))
      
      expect(contextManager.getMessages('session-1')).toHaveLength(2)
      expect(contextManager.getMessages('session-2')).toHaveLength(2)
      expect(contextManager.getSessionCount()).toBe(2)
    })

    test('应该正确删除指定会话', () => {
      contextManager.addMessage('session-1', { id: 'msg-1', content: '消息1', role: 'user', timestamp: Date.now() })
      contextManager.addMessage('session-2', { id: 'msg-2', content: '消息2', role: 'user', timestamp: Date.now() })
      
      expect(contextManager.getSessionCount()).toBe(2)
      
      contextManager.deleteSession('session-1')
      
      expect(contextManager.getSessionCount()).toBe(1)
      expect(contextManager.getMessages('session-1')).toHaveLength(0)
      expect(contextManager.getMessages('session-2')).toHaveLength(1)
    })

    test('应该正确清空所有会话', () => {
      contextManager.addMessage('session-1', { id: 'msg-1', content: '消息1', role: 'user', timestamp: Date.now() })
      contextManager.addMessage('session-2', { id: 'msg-2', content: '消息2', role: 'user', timestamp: Date.now() })
      
      expect(contextManager.getSessionCount()).toBe(2)
      
      contextManager.clear()
      
      expect(contextManager.getSessionCount()).toBe(0)
    })
  })

  describe('上下文检索测试', () => {
    test('应该正确检索相关上下文', () => {
      const messages = [
        { id: 'msg-1', content: '我想了解人工智能', role: 'user', timestamp: Date.now() },
        { id: 'msg-2', content: '人工智能是一个广泛的领域', role: 'assistant', timestamp: Date.now() + 1000 },
        { id: 'msg-3', content: '机器学习是AI的一个分支', role: 'assistant', timestamp: Date.now() + 2000 },
        { id: 'msg-4', content: '今天天气怎么样？', role: 'user', timestamp: Date.now() + 3000 }
      ]
      
      messages.forEach(msg => contextManager.addMessage('session-1', msg))
      
      const relevantContext = contextManager.getRelevantContext('session-1', '人工智能的应用')
      
      expect(relevantContext.length).toBeGreaterThan(0)
      expect(relevantContext.some(msg => msg.content.includes('人工智能'))).toBe(true)
    })

    test('应该按相关性排序上下文', () => {
      const messages = [
        { id: 'msg-1', content: '深度学习是机器学习的一个重要分支', role: 'assistant', timestamp: Date.now() },
        { id: 'msg-2', content: '今天天气很好', role: 'user', timestamp: Date.now() + 1000 },
        { id: 'msg-3', content: '神经网络是深度学习的基础', role: 'assistant', timestamp: Date.now() + 2000 }
      ]
      
      messages.forEach(msg => contextManager.addMessage('session-1', msg))
      
      const relevantContext = contextManager.getRelevantContext('session-1', '深度学习')
      
      expect(relevantContext[0].content).toContain('深度学习')
    })
  })

  describe('内存优化测试', () => {
    test('应该正确清理过期会话', () => {
      // 设置较短的保留时间用于测试
      contextManager.updateConfig({ retentionTime: 1000 }) // 1秒
      
      contextManager.addMessage('session-1', { 
        id: 'msg-1', 
        content: '旧消息', 
        role: 'user', 
        timestamp: Date.now() - 2000 // 2秒前
      })
      
      contextManager.addMessage('session-2', { 
        id: 'msg-2', 
        content: '新消息', 
        role: 'user', 
        timestamp: Date.now() // 现在
      })
      
      contextManager.cleanup()
      
      expect(contextManager.getMessages('session-1')).toHaveLength(0)
      expect(contextManager.getMessages('session-2')).toHaveLength(1)
    })

    test('应该正确报告内存使用情况', () => {
      const messages = Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        content: `消息内容 ${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        timestamp: Date.now() + i * 1000
      }))
      
      messages.forEach(msg => contextManager.addMessage('session-1', msg))
      
      const memoryUsage = contextManager.getMemoryUsage()
      
      expect(memoryUsage).toMatchObject({
        totalSessions: expect.any(Number),
        totalMessages: expect.any(Number),
        totalContextLength: expect.any(Number),
        memorySize: expect.any(Number)
      })
      
      expect(memoryUsage.totalMessages).toBe(100)
      expect(memoryUsage.totalSessions).toBe(1)
    })
  })

  describe('配置更新测试', () => {
    test('应该允许更新配置', () => {
      const newConfig = {
        maxContextLength: 5000,
        maxMessages: 50,
        compressionThreshold: 0.7,
        retentionTime: 86400000 // 24小时
      }
      
      contextManager.updateConfig(newConfig)
      const updatedConfig = contextManager.getConfig()
      
      expect(updatedConfig).toMatchObject(newConfig)
    })

    test('应该验证配置参数的有效性', () => {
      const invalidConfig = {
        maxContextLength: -1,
        maxMessages: 0,
        compressionThreshold: 1.5,
        retentionTime: -1000
      }
      
      expect(() => contextManager.updateConfig(invalidConfig))
        .toThrow('Invalid configuration')
    })
  })

  describe('并发安全测试', () => {
    test('应该正确处理并发消息添加', async () => {
      const promises = Array.from({ length: 100 }, (_, i) => 
        Promise.resolve().then(() => 
          contextManager.addMessage('session-1', {
            id: `msg-${i}`,
            content: `并发消息 ${i}`,
            role: i % 2 === 0 ? 'user' : 'assistant',
            timestamp: Date.now() + i
          })
        )
      )
      
      await Promise.all(promises)
      
      const messages = contextManager.getMessages('session-1')
      expect(messages).toHaveLength(100)
    })
  })
}) 