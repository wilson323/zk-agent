// @ts-nocheck
/**
 * @file Auth Mock Handlers
 * @description 认证相关的Mock API处理器
 * @author ZK-Agent Team A
 * @date 2024-12-19
 */

import { http, HttpResponse } from 'msw'

// 用户类型
interface User {
  id: string
  username: string
  email: string
  avatar?: string
  role: 'admin' | 'user' | 'premium'
  profile: {
    firstName: string
    lastName: string
    bio?: string
    company?: string
    location?: string
    website?: string
  }
  preferences: {
    theme: 'light' | 'dark' | 'auto'
    language: string
    notifications: {
      email: boolean
      push: boolean
      sms: boolean
    }
  }
  subscription: {
    plan: 'free' | 'pro' | 'enterprise'
    status: 'active' | 'inactive' | 'expired'
    expiresAt?: Date
  }
  usage: {
    chatMessages: number
    cadAnalyses: number
    posterGenerations: number
    storageUsed: number // bytes
  }
  limits: {
    chatMessages: number
    cadAnalyses: number
    posterGenerations: number
    storageLimit: number // bytes
  }
  createdAt: Date
  lastLoginAt?: Date
  isActive: boolean
}

// Mock用户数据
const mockUsers: User[] = [
  {
    id: 'user-001',
    username: 'demo_user',
    email: 'demo@example.com',
    avatar: '/avatars/demo.jpg',
    role: 'user',
    profile: {
      firstName: '演示',
      lastName: '用户',
      bio: '这是一个演示用户账户',
      company: 'ZK-Agent',
      location: '北京',
      website: 'https://zk-agent.com'
    },
    preferences: {
      theme: 'light',
      language: 'zh-CN',
      notifications: {
        email: true,
        push: true,
        sms: false
      }
    },
    subscription: {
      plan: 'pro',
      status: 'active',
      expiresAt: new Date('2025-12-31')
    },
    usage: {
      chatMessages: 1250,
      cadAnalyses: 45,
      posterGenerations: 120,
      storageUsed: 1024 * 1024 * 500 // 500MB
    },
    limits: {
      chatMessages: 10000,
      cadAnalyses: 100,
      posterGenerations: 500,
      storageLimit: 1024 * 1024 * 1024 * 5 // 5GB
    },
    createdAt: new Date('2024-01-15'),
    lastLoginAt: new Date('2024-12-19T08:30:00Z'),
    isActive: true
  }
]

// 当前登录用户
let currentUser: User | null = null

// JWT Token模拟
const generateToken = (user: User) => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(JSON.stringify({ 
    sub: user.id, 
    email: user.email, 
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24小时过期
  }))
  const signature = btoa('mock-signature')
  return `${header}.${payload}.${signature}`
}

export const authHandlers = [
  // 用户登录
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as { email: string; password: string }
    
    // 简单的登录验证
    const user = mockUsers.find(u => u.email === body.email)
    
    if (!user) {
      return HttpResponse.json(
        { success: false, message: '用户不存在' },
        { status: 401 }
      )
    }

    if (!user.isActive) {
      return HttpResponse.json(
        { success: false, message: '账户已被禁用' },
        { status: 401 }
      )
    }

    // 模拟密码验证（实际应用中应该使用加密密码）
    if (body.password !== 'demo123') {
      return HttpResponse.json(
        { success: false, message: '密码错误' },
        { status: 401 }
      )
    }

    // 更新最后登录时间
    user.lastLoginAt = new Date()
    currentUser = user

    const token = generateToken(user)

    return HttpResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          profile: user.profile,
          subscription: user.subscription
        },
        token,
        expiresIn: 86400 // 24小时
      }
    })
  }),

  // 用户注册
  http.post('/api/auth/register', async ({ request }) => {
    const body = await request.json() as {
      username: string
      email: string
      password: string
      firstName: string
      lastName: string
    }

    // 检查邮箱是否已存在
    const existingUser = mockUsers.find(u => u.email === body.email)
    if (existingUser) {
      return HttpResponse.json(
        { success: false, message: '邮箱已被注册' },
        { status: 400 }
      )
    }

    // 检查用户名是否已存在
    const existingUsername = mockUsers.find(u => u.username === body.username)
    if (existingUsername) {
      return HttpResponse.json(
        { success: false, message: '用户名已被使用' },
        { status: 400 }
      )
    }

    // 创建新用户
    const newUser: User = {
      id: `user-${Date.now()}`,
      username: body.username,
      email: body.email,
      role: 'user',
      profile: {
        firstName: body.firstName,
        lastName: body.lastName
      },
      preferences: {
        theme: 'light',
        language: 'zh-CN',
        notifications: {
          email: true,
          push: true,
          sms: false
        }
      },
      subscription: {
        plan: 'free',
        status: 'active'
      },
      usage: {
        chatMessages: 0,
        cadAnalyses: 0,
        posterGenerations: 0,
        storageUsed: 0
      },
      limits: {
        chatMessages: 100,
        cadAnalyses: 5,
        posterGenerations: 10,
        storageLimit: 1024 * 1024 * 100 // 100MB
      },
      createdAt: new Date(),
      isActive: true
    }

    mockUsers.push(newUser)
    currentUser = newUser

    const token = generateToken(newUser)

    return HttpResponse.json({
      success: true,
      data: {
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          avatar: newUser.avatar,
          role: newUser.role,
          profile: newUser.profile,
          subscription: newUser.subscription
        },
        token,
        expiresIn: 86400
      }
    }, { status: 201 })
  }),

  // 获取当前用户信息
  http.get('/api/auth/me', ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, message: '未授权访问' },
        { status: 401 }
      )
    }

    if (!currentUser) {
      return HttpResponse.json(
        { success: false, message: '用户未登录' },
        { status: 401 }
      )
    }

    return HttpResponse.json({
      success: true,
      data: currentUser
    })
  }),

  // 更新用户资料
  http.put('/api/auth/profile', async ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader || !currentUser) {
      return HttpResponse.json(
        { success: false, message: '未授权访问' },
        { status: 401 }
      )
    }

    const body = await request.json() as Partial<User['profile']>
    
    currentUser.profile = { ...currentUser.profile, ...body }

    return HttpResponse.json({
      success: true,
      data: currentUser
    })
  }),

  // 更新用户偏好设置
  http.put('/api/auth/preferences', async ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader || !currentUser) {
      return HttpResponse.json(
        { success: false, message: '未授权访问' },
        { status: 401 }
      )
    }

    const body = await request.json() as Partial<User['preferences']>
    
    currentUser.preferences = { ...currentUser.preferences, ...body }

    return HttpResponse.json({
      success: true,
      data: currentUser
    })
  }),

  // 修改密码
  http.post('/api/auth/change-password', async ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader || !currentUser) {
      return HttpResponse.json(
        { success: false, message: '未授权访问' },
        { status: 401 }
      )
    }

    const body = await request.json() as {
      currentPassword: string
      newPassword: string
    }

    // 验证当前密码
    if (body.currentPassword !== 'demo123') {
      return HttpResponse.json(
        { success: false, message: '当前密码错误' },
        { status: 400 }
      )
    }

    // 模拟密码更新
    return HttpResponse.json({
      success: true,
      message: '密码修改成功'
    })
  }),

  // 用户登出
  http.post('/api/auth/logout', () => {
    currentUser = null
    
    return HttpResponse.json({
      success: true,
      message: '登出成功'
    })
  }),

  // 刷新Token
  http.post('/api/auth/refresh', ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader || !currentUser) {
      return HttpResponse.json(
        { success: false, message: '未授权访问' },
        { status: 401 }
      )
    }

    const newToken = generateToken(currentUser)

    return HttpResponse.json({
      success: true,
      data: {
        token: newToken,
        expiresIn: 86400
      }
    })
  }),

  // 获取用户使用统计
  http.get('/api/auth/usage', ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader || !currentUser) {
      return HttpResponse.json(
        { success: false, message: '未授权访问' },
        { status: 401 }
      )
    }

    const usagePercentage = {
      chatMessages: (currentUser.usage.chatMessages / currentUser.limits.chatMessages) * 100,
      cadAnalyses: (currentUser.usage.cadAnalyses / currentUser.limits.cadAnalyses) * 100,
      posterGenerations: (currentUser.usage.posterGenerations / currentUser.limits.posterGenerations) * 100,
      storage: (currentUser.usage.storageUsed / currentUser.limits.storageLimit) * 100
    }

    return HttpResponse.json({
      success: true,
      data: {
        usage: currentUser.usage,
        limits: currentUser.limits,
        percentage: usagePercentage,
        subscription: currentUser.subscription
      }
    })
  }),

  // 忘记密码
  http.post('/api/auth/forgot-password', async ({ request }) => {
    const body = await request.json() as { email: string }
    
    const user = mockUsers.find(u => u.email === body.email)
    
    if (!user) {
      return HttpResponse.json(
        { success: false, message: '邮箱不存在' },
        { status: 404 }
      )
    }

    // 模拟发送重置邮件
    return HttpResponse.json({
      success: true,
      message: '密码重置邮件已发送'
    })
  }),

  // 重置密码
  http.post('/api/auth/reset-password', async ({ request }) => {
    const body = await request.json() as {
      token: string
      newPassword: string
    }

    // 模拟token验证
    if (!body.token || body.token.length < 10) {
      return HttpResponse.json(
        { success: false, message: '无效的重置令牌' },
        { status: 400 }
      )
    }

    return HttpResponse.json({
      success: true,
      message: '密码重置成功'
    })
  })
] 