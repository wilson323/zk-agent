// @ts-nocheck
/**
 * @file Poster Mock Handlers
 * @description 海报生成相关的Mock API处理器
 * @author ZK-Agent Team A
 * @date 2024-12-19
 */

import { http, HttpResponse } from 'msw'

// 海报模板类型
interface PosterTemplate {
  id: string
  name: string
  description: string
  category: 'business' | 'event' | 'social' | 'education' | 'marketing'
  style: 'modern' | 'classic' | 'minimalist' | 'creative' | 'professional'
  dimensions: {
    width: number
    height: number
  }
  thumbnail: string
  isPopular: boolean
  isPremium: boolean
  tags: string[]
  createdAt: Date
}

// 海报生成任务类型
interface PosterGenerationTask {
  id: string
  templateId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  config: {
    title: string
    subtitle?: string
    content: string
    colors: {
      primary: string
      secondary: string
      background: string
      text: string
    }
    fonts: {
      title: string
      body: string
    }
    images?: string[]
    customElements?: any[]
  }
  result?: {
    imageUrl: string
    downloadUrl: string
    fileSize: number
    format: string
  }
  createdAt: Date
  completedAt?: Date
  processingTime?: number
}

// Mock模板数据
const mockTemplates: PosterTemplate[] = [
  {
    id: 'template-001',
    name: '商务简约',
    description: '适合企业宣传和商务活动的简约风格海报',
    category: 'business',
    style: 'professional',
    dimensions: { width: 1080, height: 1920 },
    thumbnail: '/templates/business-simple.jpg',
    isPopular: true,
    isPremium: false,
    tags: ['商务', '简约', '企业', '专业'],
    createdAt: new Date('2024-01-15')
  },
  {
    id: 'template-002',
    name: '活动宣传',
    description: '色彩丰富的活动宣传海报模板',
    category: 'event',
    style: 'creative',
    dimensions: { width: 1080, height: 1350 },
    thumbnail: '/templates/event-colorful.jpg',
    isPopular: true,
    isPremium: true,
    tags: ['活动', '宣传', '色彩', '创意'],
    createdAt: new Date('2024-02-01')
  },
  {
    id: 'template-003',
    name: '社交媒体',
    description: '专为社交媒体设计的正方形海报',
    category: 'social',
    style: 'modern',
    dimensions: { width: 1080, height: 1080 },
    thumbnail: '/templates/social-square.jpg',
    isPopular: false,
    isPremium: false,
    tags: ['社交', '媒体', '正方形', '现代'],
    createdAt: new Date('2024-02-15')
  },
  {
    id: 'template-004',
    name: '教育培训',
    description: '适合教育机构和培训课程的海报模板',
    category: 'education',
    style: 'classic',
    dimensions: { width: 1080, height: 1920 },
    thumbnail: '/templates/education-classic.jpg',
    isPopular: false,
    isPremium: false,
    tags: ['教育', '培训', '课程', '经典'],
    createdAt: new Date('2024-03-01')
  },
  {
    id: 'template-005',
    name: '营销推广',
    description: '高转化率的营销推广海报模板',
    category: 'marketing',
    style: 'creative',
    dimensions: { width: 1080, height: 1920 },
    thumbnail: '/templates/marketing-creative.jpg',
    isPopular: true,
    isPremium: true,
    tags: ['营销', '推广', '转化', '创意'],
    createdAt: new Date('2024-03-15')
  }
]

// Mock生成任务数据
const mockGenerationTasks: PosterGenerationTask[] = [
  {
    id: 'task-001',
    templateId: 'template-001',
    status: 'completed',
    progress: 100,
    config: {
      title: '企业年会邀请',
      subtitle: '共创辉煌未来',
      content: '诚邀您参加我们的年度盛会',
      colors: {
        primary: '#2563eb',
        secondary: '#64748b',
        background: '#ffffff',
        text: '#1e293b'
      },
      fonts: {
        title: 'PingFang SC',
        body: 'PingFang SC'
      }
    },
    result: {
      imageUrl: '/generated/poster-001.jpg',
      downloadUrl: '/download/poster-001.jpg',
      fileSize: 2048576,
      format: 'jpg'
    },
    createdAt: new Date('2024-12-19T08:00:00Z'),
    completedAt: new Date('2024-12-19T08:02:30Z'),
    processingTime: 150000
  }
]

// 模拟生成进度更新
const simulateGenerationProgress = (taskId: string) => {
  const task = mockGenerationTasks.find(t => t.id === taskId)
  if (!task || task.status === 'completed') {return}

  const updateProgress = () => {
    if (task.progress < 100) {
      task.progress += Math.floor(Math.random() * 25) + 10
      if (task.progress >= 100) {
        task.progress = 100
        task.status = 'completed'
        task.completedAt = new Date()
        task.processingTime = Date.now() - task.createdAt.getTime()
        
        // 生成结果
        task.result = {
          imageUrl: `/generated/poster-${taskId}.jpg`,
          downloadUrl: `/download/poster-${taskId}.jpg`,
          fileSize: Math.floor(Math.random() * 3000000) + 1000000,
          format: 'jpg'
        }
      }
      setTimeout(updateProgress, 800)
    }
  }

  setTimeout(updateProgress, 800)
}

export const posterHandlers = [
  // 获取海报模板列表
  http.get('/api/poster/templates', ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const category = url.searchParams.get('category')
    const style = url.searchParams.get('style')
    const search = url.searchParams.get('search') || ''
    const popular = url.searchParams.get('popular') === 'true'

    let filteredTemplates = mockTemplates

    // 过滤逻辑
    if (search) {
      filteredTemplates = filteredTemplates.filter(template =>
        template.name.toLowerCase().includes(search.toLowerCase()) ||
        template.description.toLowerCase().includes(search.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
      )
    }

    if (category) {
      filteredTemplates = filteredTemplates.filter(template => template.category === category)
    }

    if (style) {
      filteredTemplates = filteredTemplates.filter(template => template.style === style)
    }

    if (popular) {
      filteredTemplates = filteredTemplates.filter(template => template.isPopular)
    }

    // 分页
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedTemplates = filteredTemplates.slice(startIndex, endIndex)

    return HttpResponse.json({
      success: true,
      data: paginatedTemplates,
      pagination: {
        page,
        limit,
        total: filteredTemplates.length,
        totalPages: Math.ceil(filteredTemplates.length / limit)
      }
    })
  }),

  // 获取单个模板详情
  http.get('/api/poster/templates/:id', ({ params }) => {
    const { id } = params
    const template = mockTemplates.find(t => t.id === id)

    if (!template) {
      return HttpResponse.json(
        { success: false, message: '模板不存在' },
        { status: 404 }
      )
    }

    return HttpResponse.json({
      success: true,
      data: template
    })
  }),

  // 创建海报生成任务
  http.post('/api/poster/generate', async ({ request }) => {
    const body = await request.json() as {
      templateId: string
      config: PosterGenerationTask['config']
    }

    const template = mockTemplates.find(t => t.id === body.templateId)
    if (!template) {
      return HttpResponse.json(
        { success: false, message: '模板不存在' },
        { status: 404 }
      )
    }

    // 创建生成任务
    const generationTask: PosterGenerationTask = {
      id: `task-${Date.now()}`,
      templateId: body.templateId,
      status: 'processing',
      progress: 0,
      config: body.config,
      createdAt: new Date()
    }

    mockGenerationTasks.push(generationTask)
    
    // 开始模拟生成进度
    simulateGenerationProgress(generationTask.id)

    return HttpResponse.json({
      success: true,
      data: {
        taskId: generationTask.id,
        message: '海报生成任务已创建'
      }
    }, { status: 201 })
  }),

  // 获取生成任务列表
  http.get('/api/poster/tasks', ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const status = url.searchParams.get('status')

    let filteredTasks = mockGenerationTasks

    if (status) {
      filteredTasks = filteredTasks.filter(task => task.status === status)
    }

    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedTasks = filteredTasks.slice(startIndex, endIndex)

    return HttpResponse.json({
      success: true,
      data: paginatedTasks,
      pagination: {
        page,
        limit,
        total: filteredTasks.length,
        totalPages: Math.ceil(filteredTasks.length / limit)
      }
    })
  }),

  // 获取单个生成任务
  http.get('/api/poster/tasks/:id', ({ params }) => {
    const { id } = params
    const task = mockGenerationTasks.find(t => t.id === id)

    if (!task) {
      return HttpResponse.json(
        { success: false, message: '生成任务不存在' },
        { status: 404 }
      )
    }

    return HttpResponse.json({
      success: true,
      data: task
    })
  }),

  // 获取生成进度
  http.get('/api/poster/tasks/:id/progress', ({ params }) => {
    const { id } = params
    const task = mockGenerationTasks.find(t => t.id === id)

    if (!task) {
      return HttpResponse.json(
        { success: false, message: '生成任务不存在' },
        { status: 404 }
      )
    }

    return HttpResponse.json({
      success: true,
      data: {
        id: task.id,
        status: task.status,
        progress: task.progress,
        message: task.status === 'processing' ? '正在生成中...' : 
                task.status === 'completed' ? '生成完成' : 
                task.status === 'failed' ? '生成失败' : '等待处理'
      }
    })
  }),

  // 删除生成任务
  http.delete('/api/poster/tasks/:id', ({ params }) => {
    const { id } = params
    const taskIndex = mockGenerationTasks.findIndex(t => t.id === id)
    
    if (taskIndex === -1) {
      return HttpResponse.json(
        { success: false, message: '生成任务不存在' },
        { status: 404 }
      )
    }

    mockGenerationTasks.splice(taskIndex, 1)

    return HttpResponse.json({
      success: true,
      message: '生成任务已删除'
    })
  }),

  // 获取模板分类
  http.get('/api/poster/categories', () => {
    const categories = [
      { id: 'business', name: '商务', count: mockTemplates.filter(t => t.category === 'business').length },
      { id: 'event', name: '活动', count: mockTemplates.filter(t => t.category === 'event').length },
      { id: 'social', name: '社交', count: mockTemplates.filter(t => t.category === 'social').length },
      { id: 'education', name: '教育', count: mockTemplates.filter(t => t.category === 'education').length },
      { id: 'marketing', name: '营销', count: mockTemplates.filter(t => t.category === 'marketing').length }
    ]

    return HttpResponse.json({
      success: true,
      data: categories
    })
  }),

  // 获取海报生成统计
  http.get('/api/poster/stats', () => {
    const totalTasks = mockGenerationTasks.length
    const completedTasks = mockGenerationTasks.filter(t => t.status === 'completed').length
    const processingTasks = mockGenerationTasks.filter(t => t.status === 'processing').length
    const avgProcessingTime = mockGenerationTasks
      .filter(t => t.processingTime)
      .reduce((sum, t) => sum + (t.processingTime || 0), 0) / completedTasks || 0

    return HttpResponse.json({
      success: true,
      data: {
        totalTasks,
        completedTasks,
        processingTasks,
        totalTemplates: mockTemplates.length,
        popularTemplates: mockTemplates.filter(t => t.isPopular).length,
        premiumTemplates: mockTemplates.filter(t => t.isPremium).length,
        successRate: totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(1) : '0',
        avgProcessingTime: Math.round(avgProcessingTime / 1000), // 转换为秒
        supportedFormats: ['JPG', 'PNG', 'PDF', 'SVG'],
        maxResolution: '4096x4096'
      }
    })
  })
] 