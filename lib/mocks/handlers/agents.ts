/* eslint-disable */
// @ts-nocheck
/**
 * @file Agent Mock Handlers
 * @description 智能体相关的Mock API处理器
 * @author ZK-Agent Team A
 * @date 2024-12-19
 */

import { http, HttpResponse } from 'msw'
import type { Agent, AgentType, AgentStatus } from '@/types/agents'

// Mock数据
const mockAgents: Agent[] = [
  {
    id: 'agent-001',
    name: 'FastGPT助手',
    description: '基于FastGPT的智能对话助手，支持多轮对话和上下文理解',
    type: 'fastgpt' as AgentType,
    status: 'active' as AgentStatus,
    tags: ['对话', 'FastGPT', '通用'],
    apiEndpoint: 'https://api.fastgpt.com/v1/chat',
    capabilities: ['chat', 'context', 'multimodal'],
    configuration: {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2048
    },
    metrics: {
      totalRequests: 1250,
      successfulRequests: 1198,
      failedRequests: 52,
      averageResponseTime: 850,
      dailyActiveUsers: 45,
      weeklyActiveUsers: 180,
      monthlyActiveUsers: 650,
      rating: 4.6,
      reviewCount: 89,
      uptime: 99.2
    },
    version: '2.1.0',
    isPublic: true,
    ownerId: null,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-12-18')
  },
  {
    id: 'agent-002',
    name: 'CAD分析专家',
    description: '专业的CAD文件分析智能体，支持多种CAD格式的解析和分析',
    type: 'cad' as AgentType,
    status: 'active' as AgentStatus,
    tags: ['CAD', '分析', '工程'],
    apiEndpoint: 'https://api.cad-analyzer.com/v1/analyze',
    capabilities: ['cad_analysis', 'file_parsing', 'visualization'],
    configuration: {
      supportedFormats: ['dwg', 'dxf', 'step', 'iges'],
      maxFileSize: 50 * 1024 * 1024,
      analysisDepth: 'detailed'
    },
    metrics: {
      totalRequests: 890,
      successfulRequests: 856,
      failedRequests: 34,
      averageResponseTime: 2400,
      dailyActiveUsers: 28,
      weeklyActiveUsers: 95,
      monthlyActiveUsers: 320,
      rating: 4.4,
      reviewCount: 56,
      uptime: 98.8
    },
    version: '1.8.2',
    isPublic: true,
    ownerId: null,
    createdAt: new Date('2024-02-20'),
    updatedAt: new Date('2024-12-17')
  },
  {
    id: 'agent-003',
    name: '海报生成器',
    description: '智能海报设计生成器，支持多种模板和自定义设计',
    type: 'poster' as AgentType,
    status: 'active' as AgentStatus,
    tags: ['设计', '海报', '创意'],
    apiEndpoint: 'https://api.poster-gen.com/v1/generate',
    capabilities: ['poster_generation', 'template_design', 'image_processing'],
    configuration: {
      outputFormats: ['png', 'jpg', 'pdf'],
      maxResolution: '4096x4096',
      templateCount: 150
    },
    metrics: {
      totalRequests: 2100,
      successfulRequests: 2045,
      failedRequests: 55,
      averageResponseTime: 1200,
      dailyActiveUsers: 78,
      weeklyActiveUsers: 290,
      monthlyActiveUsers: 980,
      rating: 4.8,
      reviewCount: 145,
      uptime: 99.5
    },
    version: '3.2.1',
    isPublic: true,
    ownerId: null,
    createdAt: new Date('2024-03-10'),
    updatedAt: new Date('2024-12-19')
  }
]

export const agentHandlers: any = [
  // 获取智能体列表
  http.get('/api/agents', ({ request }) => {
    const url: any = new URL(request.url)
    const page: any = parseInt(url.searchParams.get('page') || '1')
    const limit: any = parseInt(url.searchParams.get('limit') || '20')
    const search: any = url.searchParams.get('search') || ''
    const type: any = url.searchParams.get('type') as AgentType
    const status: any = url.searchParams.get('status') as AgentStatus
    const tags: any = url.searchParams.get('tags')?.split(',') || []

    // 过滤逻辑
    let filteredAgents: any = mockAgents

    if (search) {
      filteredAgents = filteredAgents.filter(agent =>
        agent.name.toLowerCase().includes(search.toLowerCase()) ||
        agent.description.toLowerCase().includes(search.toLowerCase())
      )
    }

    if (type) {
      filteredAgents = filteredAgents.filter(agent => agent.type === type)
    }

    if (status) {
      filteredAgents = filteredAgents.filter(agent => agent.status === status)
    }

    if (tags.length > 0) {
      filteredAgents = filteredAgents.filter(agent =>
        tags.some(tag => agent.tags.includes(tag))
      )
    }

    // 分页
    const startIndex: any = (page - 1) * limit
    const endIndex: any = startIndex + limit
    const paginatedAgents: any = filteredAgents.slice(startIndex, endIndex)

    return HttpResponse.json({
      success: true,
      data: paginatedAgents,
      pagination: {
        page,
        limit,
        total: filteredAgents.length,
        totalPages: Math.ceil(filteredAgents.length / limit)
      }
    })
  }),

  // 获取单个智能体详情
  http.get('/api/agents/:id', ({ params }) => {
    const { id } = params
    const agent: any = mockAgents.find(a => a.id === id)

    if (!agent) {
      return HttpResponse.json(
        { success: false, message: '智能体不存在' },
        { status: 404 }
      )
    }

    return HttpResponse.json({
      success: true,
      data: agent
    })
  }),

  // 创建智能体
  http.post('/api/agents', async ({ request }) => {
    const body: any = await request.json() as Partial<Agent>
    
    const newAgent: Agent = {
      id: `agent-${Date.now()}`,
      name: body.name || '新智能体',
      description: body.description || '',
      type: body.type || 'fastgpt' as AgentType,
      status: 'active' as AgentStatus,
      tags: body.tags || [],
      apiEndpoint: body.apiEndpoint || '',
      capabilities: body.capabilities || [],
      configuration: body.configuration || {},
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        dailyActiveUsers: 0,
        weeklyActiveUsers: 0,
        monthlyActiveUsers: 0,
        rating: 0,
        reviewCount: 0,
        uptime: 100
      },
      version: '1.0.0',
      isPublic: body.isPublic || false,
      ownerId: 'current-user',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    mockAgents.push(newAgent)

    return HttpResponse.json({
      success: true,
      data: newAgent
    }, { status: 201 })
  }),

  // 更新智能体
  http.put('/api/agents/:id', async ({ params, request }) => {
    const { id } = params
    const body: any = await request.json() as Partial<Agent>
    
    const agentIndex: any = mockAgents.findIndex(a => a.id === id)
    if (agentIndex === -1) {
      return HttpResponse.json(
        { success: false, message: '智能体不存在' },
        { status: 404 }
      )
    }

    mockAgents[agentIndex] = {
      ...mockAgents[agentIndex],
      ...body,
      updatedAt: new Date()
    }

    return HttpResponse.json({
      success: true,
      data: mockAgents[agentIndex]
    })
  }),

  // 删除智能体
  http.delete('/api/agents/:id', ({ params }) => {
    const { id } = params
    const agentIndex: any = mockAgents.findIndex(a => a.id === id)
    
    if (agentIndex === -1) {
      return HttpResponse.json(
        { success: false, message: '智能体不存在' },
        { status: 404 }
      )
    }

    mockAgents.splice(agentIndex, 1)

    return HttpResponse.json({
      success: true,
      message: '智能体已删除'
    })
  })
] 