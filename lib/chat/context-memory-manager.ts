// @ts-nocheck
/**
 * @file Context Memory Manager
 * @description 上下文内存管理器，用于管理聊天上下文、记忆存储和智能压缩
 * @author ZK-Agent Team A
 * @date 2024-12-19
 */

import { AdvancedCacheManager } from '@/lib/cache/advanced-cache-manager'

// 消息类型
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: {
    isImportant?: boolean
    isWelcome?: boolean
    isSummary?: boolean
    tokens?: number
    model?: string
    sessionId?: string
    userId?: string
  }
}

// 上下文会话
export interface ContextSession {
  id: string
  userId: string
  agentId: string
  title: string
  messages: ChatMessage[]
  metadata: {
    createdAt: Date
    updatedAt: Date
    lastActiveAt: Date
    totalTokens: number
    messageCount: number
    isActive: boolean
    tags?: string[]
    summary?: string
  }
  config: {
    maxTokens: number
    maxMessages: number
    compressionThreshold: number
    retentionDays: number
  }
}

// 记忆片段
export interface MemoryFragment {
  id: string
  sessionId: string
  userId: string
  type: 'fact' | 'preference' | 'context' | 'skill' | 'relationship'
  content: string
  importance: number // 0-1
  confidence: number // 0-1
  createdAt: Date
  lastAccessedAt: Date
  accessCount: number
  tags: string[]
  metadata?: Record<string, any>
}

// 上下文压缩结果
export interface CompressionResult {
  originalTokens: number
  compressedTokens: number
  compressionRatio: number
  preservedMessages: ChatMessage[]
  summaryMessage: ChatMessage
  removedCount: number
}

/**
 * 上下文内存管理器
 */
export class ContextMemoryManager {
  private cache: AdvancedCacheManager<ContextSession>
  private memoryCache: AdvancedCacheManager<MemoryFragment[]>
  private compressionCache: AdvancedCacheManager<CompressionResult>

  constructor() {
    this.cache = new AdvancedCacheManager({
      maxSize: 1000,
      ttl: 24 * 60 * 60 * 1000, // 24小时
      evictionPolicy: 'lru'
    })

    this.memoryCache = new AdvancedCacheManager({
      maxSize: 5000,
      ttl: 7 * 24 * 60 * 60 * 1000, // 7天
      evictionPolicy: 'lfu'
    })

    this.compressionCache = new AdvancedCacheManager({
      maxSize: 500,
      ttl: 60 * 60 * 1000, // 1小时
      evictionPolicy: 'ttl'
    })
  }

  /**
   * 创建新的上下文会话
   */
  async createSession(
    userId: string,
    agentId: string,
    title?: string,
    config?: Partial<ContextSession['config']>
  ): Promise<ContextSession> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const now = new Date()

    const session: ContextSession = {
      id: sessionId,
      userId,
      agentId,
      title: title || `对话 ${now.toLocaleString()}`,
      messages: [],
      metadata: {
        createdAt: now,
        updatedAt: now,
        lastActiveAt: now,
        totalTokens: 0,
        messageCount: 0,
        isActive: true
      },
      config: {
        maxTokens: 4000,
        maxMessages: 100,
        compressionThreshold: 0.8,
        retentionDays: 30,
        ...config
      }
    }

    // 缓存会话
    this.cache.set(sessionId, session, {
      tags: [`user:${userId}`, `agent:${agentId}`]
    })

    // 持久化到本地存储
    this.persistSession(session)

    return session
  }

  /**
   * 获取会话
   */
  async getSession(sessionId: string): Promise<ContextSession | null> {
    // 先从缓存获取
    let session = this.cache.get(sessionId)
    
    if (!session) {
      // 从本地存储加载
      session = this.loadSessionFromStorage(sessionId)
      if (session) {
        this.cache.set(sessionId, session)
      }
    }

    return session
  }

  /**
   * 添加消息到会话
   */
  async addMessage(sessionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<ChatMessage> {
    const session = await this.getSession(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    const chatMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        timestamp: new Date(),
      ...message,
      metadata: {
        sessionId,
        ...message.metadata
      }
    }

    // 添加消息
    session.messages.push(chatMessage)
    session.metadata.messageCount++
    session.metadata.lastActiveAt = new Date()
    session.metadata.updatedAt = new Date()

    // 估算token数量
    const tokens = this.estimateTokens(chatMessage.content)
    session.metadata.totalTokens += tokens
    if (chatMessage.metadata) {
      chatMessage.metadata.tokens = tokens
    }

    // 检查是否需要压缩
    if (this.shouldCompress(session)) {
      await this.compressSession(session)
    }

    // 更新缓存
    this.cache.set(sessionId, session)
    this.persistSession(session)

    // 提取记忆片段
    if (message.role === 'user') {
      await this.extractMemoryFragments(session, chatMessage)
    }

    return chatMessage
  }

  /**
   * 获取会话消息
   */
  async getMessages(sessionId: string, limit?: number, offset?: number): Promise<ChatMessage[]> {
    const session = await this.getSession(sessionId)
    if (!session) {
      return []
    }

    let messages = session.messages
    
    if (offset) {
      messages = messages.slice(offset)
    }
    
    if (limit) {
      messages = messages.slice(0, limit)
    }

    return messages
  }

  /**
   * 压缩会话上下文
   */
  async compressSession(session: ContextSession): Promise<CompressionResult> {
    const cacheKey = `compression_${session.id}_${session.metadata.updatedAt.getTime()}`
    
    // 检查缓存
    let result = this.compressionCache.get(cacheKey)
    if (result) {
      return result
    }

    const originalTokens = session.metadata.totalTokens
    const messages = session.messages

    // 保留重要消息
    const importantMessages = messages.filter(msg => 
      msg.role === 'system' || 
      msg.metadata?.isImportant || 
      msg.metadata?.isWelcome
    )

    // 保留最近的消息
    const recentMessages = messages.slice(-20)

    // 合并并去重
    const preservedMessages = [
      ...importantMessages,
      ...recentMessages.filter(msg => 
        !importantMessages.some(im => im.id === msg.id)
      )
    ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    // 创建摘要
    const removedMessages = messages.filter(msg => 
      !preservedMessages.some(pm => pm.id === msg.id)
    )

    const summaryContent = this.createSummary(removedMessages)
    const summaryMessage: ChatMessage = {
      id: `summary_${Date.now()}`,
      role: 'system',
      content: `[上下文摘要] ${summaryContent}`,
      timestamp: new Date(),
      metadata: {
        isSummary: true,
        sessionId: session.id,
        tokens: this.estimateTokens(summaryContent)
      }
    }

    // 更新会话
    session.messages = [summaryMessage, ...preservedMessages]
    const compressedTokens = session.messages.reduce((total, msg) => 
      total + (msg.metadata?.tokens || this.estimateTokens(msg.content)), 0
    )

    session.metadata.totalTokens = compressedTokens

    result = {
      originalTokens,
      compressedTokens,
      compressionRatio: compressedTokens / originalTokens,
      preservedMessages,
      summaryMessage,
      removedCount: removedMessages.length
    }

    // 缓存结果
    this.compressionCache.set(cacheKey, result)

    return result
  }

  /**
   * 提取记忆片段
   */
  async extractMemoryFragments(session: ContextSession, message: ChatMessage): Promise<MemoryFragment[]> {
    const fragments: MemoryFragment[] = []
    const content = message.content.toLowerCase()

    // 提取偏好信息
    const preferencePatterns = [
      /我喜欢|我偏好|我倾向于|我习惯/g,
      /我不喜欢|我讨厌|我不习惯/g
    ]

    // 提取事实信息
    const factPatterns = [
      /我是|我叫|我的名字是|我来自/g,
      /我在|我工作在|我学习在/g
    ]

    // 提取技能信息
    const skillPatterns = [
      /我会|我能够|我擅长|我精通/g,
      /我不会|我不擅长|我不熟悉/g
    ]

    // 处理偏好
    for (const pattern of preferencePatterns) {
      const matches = content.match(pattern)
      if (matches) {
        fragments.push(this.createMemoryFragment(
          session.id,
          session.userId,
          'preference',
          message.content,
          0.7,
          0.8
        ))
      }
    }

    // 处理事实
    for (const pattern of factPatterns) {
      const matches = content.match(pattern)
      if (matches) {
        fragments.push(this.createMemoryFragment(
          session.id,
          session.userId,
          'fact',
          message.content,
          0.9,
          0.9
        ))
      }
    }

    // 处理技能
    for (const pattern of skillPatterns) {
      const matches = content.match(pattern)
      if (matches) {
        fragments.push(this.createMemoryFragment(
          session.id,
          session.userId,
          'skill',
          message.content,
          0.8,
          0.8
        ))
      }
    }

    // 存储记忆片段
    if (fragments.length > 0) {
      await this.storeMemoryFragments(session.userId, fragments)
    }

    return fragments
  }

  /**
   * 获取用户记忆
   */
  async getUserMemory(userId: string, type?: MemoryFragment['type']): Promise<MemoryFragment[]> {
    const cacheKey = `memory_${userId}_${type || 'all'}`
    
    let memories = this.memoryCache.get(cacheKey)
    if (!memories) {
      memories = this.loadMemoryFromStorage(userId, type)
      if (memories) {
        this.memoryCache.set(cacheKey, memories)
      }
    }

    return memories || []
  }

  /**
   * 搜索相关记忆
   */
  async searchMemory(userId: string, query: string, limit = 10): Promise<MemoryFragment[]> {
    const allMemories = await this.getUserMemory(userId)
    const queryLower = query.toLowerCase()

    // 计算相关性分数
    const scoredMemories = allMemories.map(memory => ({
      memory,
      score: this.calculateRelevanceScore(memory, queryLower)
    }))

    // 排序并返回最相关的记忆
    return scoredMemories
      .filter(item => item.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.memory)
  }

  /**
   * 清理过期会话
   */
  async cleanupExpiredSessions(): Promise<number> {
    const allSessions = this.getAllSessionsFromStorage()
    const now = new Date()
    let cleanedCount = 0

    for (const session of allSessions) {
      const daysSinceLastActive = (now.getTime() - session.metadata.lastActiveAt.getTime()) / (1000 * 60 * 60 * 24)
      
      if (daysSinceLastActive > session.config.retentionDays) {
        this.deleteSession(session.id)
        cleanedCount++
      }
    }

    return cleanedCount
  }

  /**
   * 删除会话
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    // 从缓存删除
    this.cache.delete(sessionId)
    
    // 从存储删除
    return this.deleteSessionFromStorage(sessionId)
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      cache: this.cache.getStats(),
      memoryCache: this.memoryCache.getStats(),
      compressionCache: this.compressionCache.getStats()
    }
  }

  /**
   * 获取会话的记忆统计信息
   */
  getMemoryStats(sessionId: string) {
    const session = this.cache.get(sessionId)
    if (!session) {
      return {
        sessionExists: false,
        messageCount: 0,
        totalTokens: 0,
        memoryFragments: 0
      }
    }

    return {
      sessionExists: true,
      messageCount: session.metadata.messageCount,
      totalTokens: session.metadata.totalTokens,
      memoryFragments: 0, // 可以根据需要实现
      lastActivity: session.metadata.lastActiveAt,
      compressionRatio: session.metadata.totalTokens / session.config.maxTokens
    }
  }

  // 私有方法

  private shouldCompress(session: ContextSession): boolean {
    const tokenRatio = session.metadata.totalTokens / session.config.maxTokens
    const messageRatio = session.metadata.messageCount / session.config.maxMessages
    
    return tokenRatio > session.config.compressionThreshold || 
           messageRatio > session.config.compressionThreshold
  }

  private estimateTokens(text: string): number {
    // 简单的token估算：大约4个字符=1个token
    return Math.ceil(text.length / 4)
  }

  private createSummary(messages: ChatMessage[]): string {
    if (messages.length === 0) {return '无对话内容'}

    const topics = new Set<string>()
    const keyPoints: string[] = []

    messages.forEach(msg => {
      if (msg.role === 'user') {
        // 提取关键词
        const words = msg.content.split(/\s+/).filter(word => word.length > 2)
        words.slice(0, 3).forEach(word => topics.add(word))
      } else if (msg.role === 'assistant' && msg.content.length > 50) {
        // 提取重要回答的开头
        keyPoints.push(msg.content.substring(0, 50) + '...')
      }
    })

    const topicsStr = Array.from(topics).slice(0, 5).join(', ')
    const pointsStr = keyPoints.slice(0, 3).join(' ')
    
    return `讨论话题: ${topicsStr}. 关键要点: ${pointsStr}`
  }

  private createMemoryFragment(
    sessionId: string,
    userId: string,
    type: MemoryFragment['type'],
    content: string,
    importance: number,
    confidence: number
  ): MemoryFragment {
    return {
      id: `memory_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      sessionId,
      userId,
      type,
      content,
      importance,
      confidence,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      accessCount: 0,
      tags: this.extractTags(content)
    }
  }

  private extractTags(content: string): string[] {
    const tags: string[] = []
    const contentLower = content.toLowerCase()

    // 简单的标签提取
    if (contentLower.includes('工作') || contentLower.includes('职业')) {tags.push('工作')}
    if (contentLower.includes('学习') || contentLower.includes('教育')) {tags.push('学习')}
    if (contentLower.includes('爱好') || contentLower.includes('兴趣')) {tags.push('爱好')}
    if (contentLower.includes('家庭') || contentLower.includes('家人')) {tags.push('家庭')}
    if (contentLower.includes('技能') || contentLower.includes('能力')) {tags.push('技能')}

    return tags
  }

  private calculateRelevanceScore(memory: MemoryFragment, query: string): number {
    const contentLower = memory.content.toLowerCase()
    let score = 0

    // 直接匹配
    if (contentLower.includes(query)) {
      score += 0.8
    }

    // 标签匹配
    for (const tag of memory.tags) {
      if (tag.toLowerCase().includes(query) || query.includes(tag.toLowerCase())) {
        score += 0.3
      }
    }

    // 重要性和置信度加权
    score *= (memory.importance * 0.7 + memory.confidence * 0.3)

    // 时间衰减
    const daysSinceCreated = (Date.now() - memory.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    const timeDecay = Math.exp(-daysSinceCreated / 30) // 30天半衰期
    score *= timeDecay

    return Math.min(score, 1.0)
  }

  private persistSession(session: ContextSession): void {
    try {
      const key = `context_session_${session.id}`
      localStorage.setItem(key, JSON.stringify(session))
    } catch (error) {
      console.error('Failed to persist session:', error)
    }
  }

  private loadSessionFromStorage(sessionId: string): ContextSession | null {
    try {
      const key = `context_session_${sessionId}`
      const data = localStorage.getItem(key)
      if (data) {
        const session = JSON.parse(data)
        // 转换日期字符串为Date对象
        session.metadata.createdAt = new Date(session.metadata.createdAt)
        session.metadata.updatedAt = new Date(session.metadata.updatedAt)
        session.metadata.lastActiveAt = new Date(session.metadata.lastActiveAt)
        session.messages.forEach((msg: ChatMessage) => {
          msg.timestamp = new Date(msg.timestamp)
        })
        return session
      }
    } catch (error) {
      console.error('Failed to load session from storage:', error)
    }
    return null
  }

  private getAllSessionsFromStorage(): ContextSession[] {
    const sessions: ContextSession[] = []
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('context_session_')) {
          const sessionId = key.replace('context_session_', '')
          const session = this.loadSessionFromStorage(sessionId)
          if (session) {
            sessions.push(session)
          }
        }
      }
    } catch (error) {
      console.error('Failed to get all sessions from storage:', error)
    }

    return sessions
  }

  private deleteSessionFromStorage(sessionId: string): boolean {
    try {
      const key = `context_session_${sessionId}`
      localStorage.removeItem(key)
      return true
    } catch (error) {
      console.error('Failed to delete session from storage:', error)
      return false
    }
  }

  private async storeMemoryFragments(userId: string, fragments: MemoryFragment[]): Promise<void> {
    try {
      const existingMemories = await this.getUserMemory(userId)
      const allMemories = [...existingMemories, ...fragments]
      
      const key = `user_memory_${userId}`
      localStorage.setItem(key, JSON.stringify(allMemories))
      
      // 更新缓存
      this.memoryCache.set(`memory_${userId}_all`, allMemories)
    } catch (error) {
      console.error('Failed to store memory fragments:', error)
    }
  }

  private loadMemoryFromStorage(userId: string, type?: MemoryFragment['type']): MemoryFragment[] | null {
    try {
      const key = `user_memory_${userId}`
      const data = localStorage.getItem(key)
      if (data) {
        let memories: MemoryFragment[] = JSON.parse(data)
        
        // 转换日期字符串为Date对象
        memories = memories.map(memory => ({
          ...memory,
          createdAt: new Date(memory.createdAt),
          lastAccessedAt: new Date(memory.lastAccessedAt)
        }))

        // 按类型过滤
        if (type) {
          memories = memories.filter(memory => memory.type === type)
        }

        return memories
      }
    } catch (error) {
      console.error('Failed to load memory from storage:', error)
    }
    return null
  }
}

// 创建默认实例
export const contextMemoryManager = new ContextMemoryManager()

// 导出类型
export type {
  ChatMessage,
  ContextSession,
  MemoryFragment,
  CompressionResult
}
