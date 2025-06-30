// @ts-nocheck
/**
 * @file Chat Mock Handlers
 * @description 聊天相关的Mock API处理器，支持流式响应
 * @author ZK-Agent Team A
 * @date 2024-12-19
 */

import { http, HttpResponse } from 'msw'

import { ChatMessage } from '../../types/interfaces';

// 聊天会话类型
interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
  model: string
  settings: {
    temperature: number
    maxTokens: number
    systemPrompt?: string
  }
}

// Mock数据
const mockSessions: ChatSession[] = [
  {
    id: 'session-001',
    title: '智能对话测试',
    messages: [
      {
        id: 'msg-001',
        role: 'user',
        content: '你好，请介绍一下这个平台的功能',
        timestamp: new Date('2024-12-19T10:00:00Z')
      },
      {
        id: 'msg-002',
        role: 'assistant',
        content: '您好！欢迎使用ZK-Agent多智能体平台。我们的平台集成了多种AI能力：\n\n1. **智能对话** - 基于FastGPT的对话助手\n2. **CAD分析** - 专业的工程文件分析\n3. **海报生成** - AI驱动的设计工具\n\n您想了解哪个功能的详细信息呢？',
        timestamp: new Date('2024-12-19T10:00:05Z'),
        metadata: {
          model: 'gpt-4',
          tokens: 156,
          responseTime: 850
        }
      }
    ],
    createdAt: new Date('2024-12-19T10:00:00Z'),
    updatedAt: new Date('2024-12-19T10:00:05Z'),
    model: 'gpt-4',
    settings: {
      temperature: 0.7,
      maxTokens: 2048,
      systemPrompt: '你是ZK-Agent平台的智能助手，专业、友好地为用户提供帮助。'
    }
  }
]

// 模拟流式响应
const createStreamResponse = (content: string, delay: number = 50) => {
  const chunks = content.split('')
  let index = 0

  const stream = new ReadableStream({
    start(controller) {
      const sendChunk = () => {
        if (index < chunks.length) {
          const chunk = {
            type: 'content',
            delta: chunks[index],
            timestamp: new Date().toISOString()
          }
          controller.enqueue(`data: ${JSON.stringify(chunk)}\n\n`)
          index++
          setTimeout(sendChunk, delay)
        } else {
          // 发送结束标记
          const endChunk = {
            type: 'end',
            timestamp: new Date().toISOString()
          }
          controller.enqueue(`data: ${JSON.stringify(endChunk)}\n\n`)
          controller.close()
        }
      }
      sendChunk()
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}

export const chatHandlers = [
  // 获取聊天会话列表
  http.get('/api/chat/sessions', ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')

    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedSessions = mockSessions.slice(startIndex, endIndex)

    return HttpResponse.json({
      success: true,
      data: paginatedSessions,
      pagination: {
        page,
        limit,
        total: mockSessions.length,
        totalPages: Math.ceil(mockSessions.length / limit)
      }
    })
  }),

  // 获取单个聊天会话
  http.get('/api/chat/sessions/:id', ({ params }) => {
    const { id } = params
    const session = mockSessions.find(s => s.id === id)

    if (!session) {
      return HttpResponse.json(
        { success: false, message: '会话不存在' },
        { status: 404 }
      )
    }

    return HttpResponse.json({
      success: true,
      data: session
    })
  }),

  // 创建新的聊天会话
  http.post('/api/chat/sessions', async ({ request }) => {
    const body = await request.json() as Partial<ChatSession>
    
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: body.title || '新对话',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      model: body.model || 'gpt-4',
      settings: {
        temperature: 0.7,
        maxTokens: 2048,
        ...body.settings
      }
    }

    mockSessions.push(newSession)

    return HttpResponse.json({
      success: true,
      data: newSession
    }, { status: 201 })
  }),

  // 发送消息 - 支持流式响应
  http.post('/api/chat/sessions/:id/messages', async ({ params, request }) => {
    const { id } = params
    const body = await request.json() as { content: string; stream?: boolean }
    
    const session = mockSessions.find(s => s.id === id)
    if (!session) {
      return HttpResponse.json(
        { success: false, message: '会话不存在' },
        { status: 404 }
      )
    }

    // 添加用户消息
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: body.content,
      timestamp: new Date()
    }
    session.messages.push(userMessage)

    // 生成AI回复
    const responses = [
      '这是一个很好的问题。让我为您详细解答...',
      '根据您的需求，我建议您可以尝试以下几种方案：\n\n1. 首先...\n2. 其次...\n3. 最后...',
      '我理解您的关注点。基于我的分析，这个问题可以从多个角度来看待。',
      '感谢您的提问！这确实是一个值得深入探讨的话题。',
      '让我帮您分析一下这个情况的各个方面...'
    ]
    
    const responseContent = responses[Math.floor(Math.random() * responses.length)]

    // 如果请求流式响应
    if (body.stream) {
      return createStreamResponse(responseContent)
    }

    // 非流式响应
    const assistantMessage: ChatMessage = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: responseContent,
      timestamp: new Date(),
      metadata: {
        model: session.model,
        tokens: Math.floor(Math.random() * 200) + 50,
        responseTime: Math.floor(Math.random() * 1000) + 500
      }
    }
    session.messages.push(assistantMessage)
    session.updatedAt = new Date()

    return HttpResponse.json({
      success: true,
      data: assistantMessage
    })
  }),

  // 删除聊天会话
  http.delete('/api/chat/sessions/:id', ({ params }) => {
    const { id } = params
    const sessionIndex = mockSessions.findIndex(s => s.id === id)
    
    if (sessionIndex === -1) {
      return HttpResponse.json(
        { success: false, message: '会话不存在' },
        { status: 404 }
      )
    }

    mockSessions.splice(sessionIndex, 1)

    return HttpResponse.json({
      success: true,
      message: '会话已删除'
    })
  }),

  // 更新会话设置
  http.put('/api/chat/sessions/:id/settings', async ({ params, request }) => {
    const { id } = params
    const body = await request.json() as Partial<ChatSession['settings']>
    
    const session = mockSessions.find(s => s.id === id)
    if (!session) {
      return HttpResponse.json(
        { success: false, message: '会话不存在' },
        { status: 404 }
      )
    }

    session.settings = { ...session.settings, ...body }
    session.updatedAt = new Date()

    return HttpResponse.json({
      success: true,
      data: session
    })
  }),

  // 获取聊天统计
  http.get('/api/chat/stats', () => {
    const totalSessions = mockSessions.length
    const totalMessages = mockSessions.reduce((sum, session) => sum + session.messages.length, 0)
    const avgMessagesPerSession = totalSessions > 0 ? totalMessages / totalSessions : 0

    return HttpResponse.json({
      success: true,
      data: {
        totalSessions,
        totalMessages,
        avgMessagesPerSession: Math.round(avgMessagesPerSession * 100) / 100,
        activeUsers: Math.floor(Math.random() * 100) + 50,
        responseTime: Math.floor(Math.random() * 500) + 200
      }
    })
  })
]