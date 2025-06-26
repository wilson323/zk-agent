// @ts-nocheck
/**
 * AG-UI智能对话API测试
 * 确保智能对话API接口100%可靠
 */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/ag-ui/chat/route'

// 模拟依赖
jest.mock('@/lib/auth/session-manager', () => ({
  validateSession: jest.fn()
}))

jest.mock('@/lib/ai/unified-ai-adapter', () => ({
  UnifiedAIAdapter: jest.fn().mockImplementation(() => ({
    chatCompletion: jest.fn(),
    streamChatCompletion: jest.fn()
  }))
}))

jest.mock('@/lib/chat/context-memory-manager', () => ({
  ContextMemoryManager: jest.fn().mockImplementation(() => ({
    addMessage: jest.fn(),
    getMessages: jest.fn().mockReturnValue([]),
    getRelevantContext: jest.fn().mockReturnValue([])
  }))
}))

jest.mock('@/lib/chat/error-retry-manager', () => ({
  ErrorRetryManager: jest.fn().mockImplementation(() => ({
    executeWithRetry: jest.fn()
  }))
}))

describe('AG-UI Chat API - 智能对话接口测试', () => {
  let mockValidateSession: jest.Mock
  let mockAIAdapter: any
  let mockContextManager: any
  let mockErrorRetryManager: any

  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks()
    
    // 设置模拟
    const { validateSession } = require('@/lib/auth/session-manager')
    mockValidateSession = validateSession as jest.Mock
    
    const { UnifiedAIAdapter } = require('@/lib/ai/unified-ai-adapter')
    mockAIAdapter = new UnifiedAIAdapter()
    
    const { ContextMemoryManager } = require('@/lib/chat/context-memory-manager')
    mockContextManager = new ContextMemoryManager()
    
    const { ErrorRetryManager } = require('@/lib/chat/error-retry-manager')
    mockErrorRetryManager = new ErrorRetryManager()
  })

  describe('请求验证测试', () => {
    test('应该拒绝无效的HTTP方法', async () => {
      const request = new NextRequest('http://localhost:3000/api/ag-ui/chat', {
        method: 'GET'
      })

      const response = await POST(request)
      expect(response.status).toBe(405)
    })

    test('应该拒绝未认证的请求', async () => {
      mockValidateSession.mockResolvedValue({ valid: false, error: 'Unauthorized' })
      
      const request = new NextRequest('http://localhost:3000/api/ag-ui/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: '你好',
          sessionId: 'test-session'
        })
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
    })

    test('应该验证请求体格式', async () => {
      mockValidateSession.mockResolvedValue({ valid: true, userId: 'user-1' })
      
      const request = new NextRequest('http://localhost:3000/api/ag-ui/chat', {
        method: 'POST',
        body: JSON.stringify({
          // 缺少必需字段
        })
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.error).toContain('validation')
    })

    test('应该验证消息内容长度', async () => {
      mockValidateSession.mockResolvedValue({ valid: true, userId: 'user-1' })
      
      const longMessage = 'a'.repeat(10000) // 超长消息
      const request = new NextRequest('http://localhost:3000/api/ag-ui/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: longMessage,
          sessionId: 'test-session'
        })
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.error).toContain('too long')
    })
  })

  describe('消息处理测试', () => {
    beforeEach(() => {
      mockValidateSession.mockResolvedValue({ valid: true, userId: 'user-1' })
    })

    test('应该正确处理简单文本消息', async () => {
      const mockResponse = {
        content: '你好！我是AI助手，有什么可以帮助你的吗？',
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
      }
      
      mockAIAdapter.chatCompletion.mockResolvedValue(mockResponse)
      mockErrorRetryManager.executeWithRetry.mockImplementation(fn => fn())
      
      const request = new NextRequest('http://localhost:3000/api/ag-ui/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: '你好',
          sessionId: 'test-session'
        })
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.content).toBe(mockResponse.content)
      expect(data.usage).toEqual(mockResponse.usage)
    })

    test('应该正确处理多轮对话', async () => {
      const conversationHistory = [
        { role: 'user', content: '你好' },
        { role: 'assistant', content: '你好！有什么可以帮助你的吗？' },
        { role: 'user', content: '请介绍一下你的功能' }
      ]
      
      mockContextManager.getMessages.mockReturnValue(conversationHistory.slice(0, 2))
      mockAIAdapter.chatCompletion.mockResolvedValue({
        content: '我是一个AI助手，可以帮助你解答问题、提供信息和协助完成各种任务。',
        usage: { prompt_tokens: 50, completion_tokens: 30, total_tokens: 80 }
      })
      mockErrorRetryManager.executeWithRetry.mockImplementation(fn => fn())
      
      const request = new NextRequest('http://localhost:3000/api/ag-ui/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: '请介绍一下你的功能',
          sessionId: 'test-session'
        })
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      
      // 验证上下文管理器被正确调用
      expect(mockContextManager.getMessages).toHaveBeenCalledWith('test-session')
      expect(mockContextManager.addMessage).toHaveBeenCalledTimes(2) // 用户消息和AI回复
    })

    test('应该正确处理流式响应', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield { content: '我是' }
          yield { content: 'AI助手' }
          yield { content: '，很高兴为你服务！' }
        }
      }
      
      mockAIAdapter.streamChatCompletion.mockResolvedValue(mockStream)
      mockErrorRetryManager.executeWithRetry.mockImplementation(fn => fn())
      
      const request = new NextRequest('http://localhost:3000/api/ag-ui/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: '你好',
          sessionId: 'test-session',
          stream: true
        })
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain('text/stream')
    })
  })

  describe('错误处理测试', () => {
    beforeEach(() => {
      mockValidateSession.mockResolvedValue({ valid: true, userId: 'user-1' })
    })

    test('应该正确处理AI服务错误', async () => {
      const aiError = new Error('AI service unavailable')
      mockAIAdapter.chatCompletion.mockRejectedValue(aiError)
      mockErrorRetryManager.executeWithRetry.mockRejectedValue(aiError)
      
      const request = new NextRequest('http://localhost:3000/api/ag-ui/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: '你好',
          sessionId: 'test-session'
        })
      })

      const response = await POST(request)
      expect(response.status).toBe(500)
      
      const data = await response.json()
      expect(data.error).toContain('AI service')
    })

    test('应该正确处理网络超时', async () => {
      const timeoutError = new Error('Request timeout')
      timeoutError.name = 'TimeoutError'
      
      mockAIAdapter.chatCompletion.mockRejectedValue(timeoutError)
      mockErrorRetryManager.executeWithRetry.mockRejectedValue(timeoutError)
      
      const request = new NextRequest('http://localhost:3000/api/ag-ui/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: '你好',
          sessionId: 'test-session'
        })
      })

      const response = await POST(request)
      expect(response.status).toBe(408)
      
      const data = await response.json()
      expect(data.error).toContain('timeout')
    })

    test('应该正确处理速率限制', async () => {
      const rateLimitError = new Error('Rate limit exceeded')
      rateLimitError.name = 'RateLimitError'
      
      mockAIAdapter.chatCompletion.mockRejectedValue(rateLimitError)
      mockErrorRetryManager.executeWithRetry.mockRejectedValue(rateLimitError)
      
      const request = new NextRequest('http://localhost:3000/api/ag-ui/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: '你好',
          sessionId: 'test-session'
        })
      })

      const response = await POST(request)
      expect(response.status).toBe(429)
      
      const data = await response.json()
      expect(data.error).toContain('rate limit')
    })
  })

  describe('上下文管理测试', () => {
    beforeEach(() => {
      mockValidateSession.mockResolvedValue({ valid: true, userId: 'user-1' })
    })

    test('应该正确管理对话上下文', async () => {
      const existingMessages = [
        { role: 'user', content: '你好' },
        { role: 'assistant', content: '你好！有什么可以帮助你的吗？' }
      ]
      
      mockContextManager.getMessages.mockReturnValue(existingMessages)
      mockAIAdapter.chatCompletion.mockResolvedValue({
        content: '当然可以！',
        usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 }
      })
      mockErrorRetryManager.executeWithRetry.mockImplementation(fn => fn())
      
      const request = new NextRequest('http://localhost:3000/api/ag-ui/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: '你能帮我写代码吗？',
          sessionId: 'test-session'
        })
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      
      // 验证上下文被正确传递给AI
      expect(mockAIAdapter.chatCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            ...existingMessages,
            { role: 'user', content: '你能帮我写代码吗？' }
          ])
        })
      )
    })

    test('应该正确限制上下文长度', async () => {
      // 模拟大量历史消息
      const longHistory = Array.from({ length: 100 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `消息 ${i}`
      }))
      
      mockContextManager.getMessages.mockReturnValue(longHistory)
      mockContextManager.getRelevantContext.mockReturnValue(longHistory.slice(-10)) // 返回最近10条
      
      mockAIAdapter.chatCompletion.mockResolvedValue({
        content: '好的，我明白了。',
        usage: { prompt_tokens: 100, completion_tokens: 15, total_tokens: 115 }
      })
      mockErrorRetryManager.executeWithRetry.mockImplementation(fn => fn())
      
      const request = new NextRequest('http://localhost:3000/api/ag-ui/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: '总结一下我们的对话',
          sessionId: 'test-session'
        })
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      
      // 验证使用了相关上下文而不是全部历史
      expect(mockContextManager.getRelevantContext).toHaveBeenCalled()
    })
  })

  describe('性能测试', () => {
    beforeEach(() => {
      mockValidateSession.mockResolvedValue({ valid: true, userId: 'user-1' })
    })

    test('应该在合理时间内响应', async () => {
      mockAIAdapter.chatCompletion.mockResolvedValue({
        content: '快速响应',
        usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 }
      })
      mockErrorRetryManager.executeWithRetry.mockImplementation(fn => fn())
      
      const startTime = Date.now()
      
      const request = new NextRequest('http://localhost:3000/api/ag-ui/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: '快速测试',
          sessionId: 'test-session'
        })
      })

      const response = await POST(request)
      const endTime = Date.now()
      
      expect(response.status).toBe(200)
      expect(endTime - startTime).toBeLessThan(5000) // 5秒内响应
    })

    test('应该正确处理并发请求', async () => {
      mockAIAdapter.chatCompletion.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100)) // 模拟处理时间
        return {
          content: '并发响应',
          usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 }
        }
      })
      mockErrorRetryManager.executeWithRetry.mockImplementation(fn => fn())
      
      const requests = Array.from({ length: 5 }, (_, i) => 
        new NextRequest('http://localhost:3000/api/ag-ui/chat', {
          method: 'POST',
          body: JSON.stringify({
            message: `并发消息 ${i}`,
            sessionId: `test-session-${i}`
          })
        })
      )

      const responses = await Promise.all(requests.map(req => POST(req)))
      
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })
    })
  })

  describe('安全性测试', () => {
    beforeEach(() => {
      mockValidateSession.mockResolvedValue({ valid: true, userId: 'user-1' })
    })

    test('应该过滤恶意输入', async () => {
      const maliciousInput = '<script>alert("xss")</script>'
      
      const request = new NextRequest('http://localhost:3000/api/ag-ui/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: maliciousInput,
          sessionId: 'test-session'
        })
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.error).toContain('invalid content')
    })

    test('应该限制请求频率', async () => {
      // 模拟快速连续请求
      const requests = Array.from({ length: 10 }, () => 
        new NextRequest('http://localhost:3000/api/ag-ui/chat', {
          method: 'POST',
          body: JSON.stringify({
            message: '频率测试',
            sessionId: 'test-session'
          })
        })
      )

      const responses = await Promise.all(requests.map(req => POST(req)))
      
      // 应该有一些请求被限制
      const rateLimitedResponses = responses.filter(res => res.status === 429)
      expect(rateLimitedResponses.length).toBeGreaterThan(0)
    })

    test('应该验证会话所有权', async () => {
      mockValidateSession.mockResolvedValue({ valid: true, userId: 'user-1' })
      
      const request = new NextRequest('http://localhost:3000/api/ag-ui/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: '你好',
          sessionId: 'other-user-session' // 其他用户的会话
        })
      })

      const response = await POST(request)
      expect(response.status).toBe(403)
      
      const data = await response.json()
      expect(data.error).toContain('access denied')
    })
  })

  describe('监控和日志测试', () => {
    beforeEach(() => {
      mockValidateSession.mockResolvedValue({ valid: true, userId: 'user-1' })
    })

    test('应该记录请求日志', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      
      mockAIAdapter.chatCompletion.mockResolvedValue({
        content: '测试响应',
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 }
      })
      mockErrorRetryManager.executeWithRetry.mockImplementation(fn => fn())
      
      const request = new NextRequest('http://localhost:3000/api/ag-ui/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: '日志测试',
          sessionId: 'test-session'
        })
      })

      await POST(request)
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Chat request processed')
      )
      
      consoleSpy.mockRestore()
    })

    test('应该记录错误日志', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      
      const error = new Error('测试错误')
      mockAIAdapter.chatCompletion.mockRejectedValue(error)
      mockErrorRetryManager.executeWithRetry.mockRejectedValue(error)
      
      const request = new NextRequest('http://localhost:3000/api/ag-ui/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: '错误测试',
          sessionId: 'test-session'
        })
      })

      await POST(request)
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Chat API error'),
        expect.any(Error)
      )
      
      consoleErrorSpy.mockRestore()
    })
  })
}) 