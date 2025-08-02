# ZK-Agent API 设计规范

## 概述

本文档详细描述 ZK-Agent 项目的 API 设计规范，包括路由架构、数据格式、错误处理、认证授权、版本控制等方面的设计原则和实现细节。

## 1. API 架构概览

### 1.1 整体架构

```
ZK-Agent API Architecture
├── /api/v1/                    # 版本化API
│   ├── auth/                   # 认证相关
│   ├── users/                  # 用户管理
│   ├── teams/                  # 团队管理
│   └── tasks/                  # 任务管理
├── /api/multi-agent/           # 多智能体系统
│   ├── agents/                 # 智能体管理
│   ├── teams/                  # 智能体团队
│   ├── executions/             # 执行管理
│   └── deep-research/          # 深度研究
├── /api/ag-ui/                 # AG-UI接口
│   ├── chat/                   # 对话接口
│   ├── cad-analysis/           # CAD分析
│   └── compliance/             # 合规检查
└── /api/admin/                 # 管理接口
    ├── metrics/                # 性能指标
    ├── logs/                   # 日志管理
    └── health/                 # 健康检查
```

### 1.2 技术栈

- **框架**: Next.js 14+ API Routes
- **运行时**: Node.js 18+ / Edge Runtime
- **认证**: NextAuth.js
- **验证**: Zod Schema
- **数据库**: Prisma ORM + PostgreSQL
- **缓存**: Redis
- **文档**: OpenAPI 3.0

## 2. 路由设计规范

### 2.1 RESTful 设计原则

#### 资源命名规范
```typescript
// ✅ 正确的资源命名
GET    /api/v1/users              # 获取用户列表
GET    /api/v1/users/{id}         # 获取特定用户
POST   /api/v1/users              # 创建用户
PUT    /api/v1/users/{id}         # 更新用户
DELETE /api/v1/users/{id}         # 删除用户

// ✅ 嵌套资源
GET    /api/v1/teams/{id}/members # 获取团队成员
POST   /api/v1/teams/{id}/members # 添加团队成员

// ❌ 错误的命名
GET    /api/v1/getUsers           # 动词不应出现在URL中
POST   /api/v1/user               # 应使用复数形式
```

#### HTTP 方法使用规范

| 方法 | 用途 | 幂等性 | 安全性 | 示例 |
|------|------|--------|--------|---------|
| GET | 获取资源 | ✅ | ✅ | 获取用户信息 |
| POST | 创建资源 | ❌ | ❌ | 创建新用户 |
| PUT | 完整更新 | ✅ | ❌ | 更新用户信息 |
| PATCH | 部分更新 | ❌ | ❌ | 更新用户状态 |
| DELETE | 删除资源 | ✅ | ❌ | 删除用户 |

### 2.2 路由实现示例

#### 用户管理 API
```typescript
// app/api/v1/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateRequest } from '@/lib/validation';

// 用户创建验证模式
const createUserSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  role: z.enum(['USER', 'ADMIN', 'MODERATOR']).default('USER'),
});

// 查询参数验证模式
const getUsersQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.enum(['USER', 'ADMIN', 'MODERATOR']).optional(),
  sortBy: z.enum(['name', 'email', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// 获取用户列表
export async function GET(request: NextRequest) {
  try {
    // 认证检查
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 参数验证
    const { searchParams } = new URL(request.url);
    const query = getUsersQuerySchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      search: searchParams.get('search'),
      role: searchParams.get('role'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    });

    // 构建查询条件
    const where = {
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
      ...(query.role && { role: query.role }),
    };

    // 执行查询
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              teams: true,
              tasks: true,
            },
          },
        },
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.user.count({ where }),
    ]);

    // 构建响应
    const response = {
      data: users,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching users:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// 创建用户
export async function POST(request: NextRequest) {
  try {
    // 认证检查
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // 请求体验证
    const body = await request.json();
    const validatedData = createUserSchema.parse(body);

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      );
    }

    // 创建用户
    const user = await prisma.user.create({
      data: validatedData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        data: user,
        message: 'User created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating user:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
```

#### 动态路由实现
```typescript
// app/api/v1/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: {
    id: string;
  };
}

// 获取特定用户
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params;
    
    // 验证ID格式
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // 认证检查
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 权限检查：只能查看自己的信息或管理员可以查看所有
    if (session.user.id !== id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // 查询用户
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        teams: {
          select: {
            team: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// 更新用户
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params;
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 权限检查
    if (session.user.id !== id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updateUserSchema = z.object({
      name: z.string().min(2).max(50).optional(),
      email: z.string().email().optional(),
      role: z.enum(['USER', 'ADMIN', 'MODERATOR']).optional(),
    });

    const validatedData = updateUserSchema.parse(body);

    // 如果更新邮箱，检查是否已存在
    if (validatedData.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: validatedData.email,
          NOT: { id },
        },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 409 }
        );
      }
    }

    // 更新用户
    const updatedUser = await prisma.user.update({
      where: { id },
      data: validatedData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      data: updatedUser,
      message: 'User updated successfully',
    });
  } catch (error) {
    console.error('Error updating user:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// 删除用户
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params;
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            teams: true,
            tasks: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 检查是否有关联数据
    if (user._count.teams > 0 || user._count.tasks > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete user with associated teams or tasks',
          details: {
            teams: user._count.teams,
            tasks: user._count.tasks,
          },
        },
        { status: 409 }
      );
    }

    // 删除用户
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
```

## 3. 多智能体系统 API

### 3.1 智能体管理 API

```typescript
// app/api/multi-agent/agents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SwarmsIntegrationService } from '@/lib/services/swarms-integration-service';

// 智能体创建验证模式
const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['RESEARCHER', 'ANALYST', 'WRITER', 'REVIEWER', 'COORDINATOR']),
  capabilities: z.array(z.string()),
  model: z.object({
    provider: z.enum(['OPENAI', 'ANTHROPIC', 'GOOGLE']),
    name: z.string(),
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().min(1).max(32000).default(4000),
  }),
  systemPrompt: z.string().min(10),
  tools: z.array(z.object({
    name: z.string(),
    description: z.string(),
    parameters: z.record(z.any()),
  })).optional(),
  metadata: z.record(z.any()).optional(),
});

// 创建智能体
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = createAgentSchema.parse(body);

    // 创建智能体
    const agent = await prisma.agent.create({
      data: {
        ...validatedData,
        creatorId: session.user.id,
        status: 'ACTIVE',
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // 注册到 Swarms 框架
    const swarmsService = new SwarmsIntegrationService();
    await swarmsService.registerAgent(agent);

    return NextResponse.json(
      {
        data: agent,
        message: 'Agent created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating agent:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// 获取智能体列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const querySchema = z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      type: z.enum(['RESEARCHER', 'ANALYST', 'WRITER', 'REVIEWER', 'COORDINATOR']).optional(),
      status: z.enum(['ACTIVE', 'INACTIVE', 'BUSY', 'ERROR']).optional(),
      search: z.string().optional(),
    });

    const query = querySchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      type: searchParams.get('type'),
      status: searchParams.get('status'),
      search: searchParams.get('search'),
    });

    const where = {
      ...(query.type && { type: query.type }),
      ...(query.status && { status: query.status }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [agents, total] = await Promise.all([
      prisma.agent.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              executions: true,
              teamMemberships: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.agent.count({ where }),
    ]);

    return NextResponse.json({
      data: agents,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
```

### 3.2 深度研究 API

```typescript
// app/api/multi-agent/deep-research/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DeepResearchService } from '@/lib/multi-agent/deep-research';

// 深度研究请求验证模式
const deepResearchSchema = z.object({
  query: z.string().min(10).max(1000),
  domain: z.enum(['TECHNOLOGY', 'SCIENCE', 'BUSINESS', 'HEALTHCARE', 'EDUCATION']),
  complexity: z.enum(['SIMPLE', 'MODERATE', 'COMPLEX', 'EXPERT']).default('MODERATE'),
  deadline: z.string().datetime().optional(),
  requirements: z.array(z.object({
    type: z.string(),
    description: z.string(),
    mandatory: z.boolean(),
  })).optional(),
  preferences: z.object({
    sources: z.array(z.enum(['ACADEMIC', 'WEB', 'NEWS', 'PATENTS'])).optional(),
    languages: z.array(z.string()).optional(),
    timeframe: z.object({
      start: z.string().datetime().optional(),
      end: z.string().datetime().optional(),
    }).optional(),
    qualityThreshold: z.number().min(0).max(1).default(0.7),
  }).optional(),
});

// 执行深度研究
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = deepResearchSchema.parse(body);

    // 创建研究任务
    const task = await prisma.researchTask.create({
      data: {
        title: `Deep Research: ${validatedData.query.substring(0, 50)}...`,
        description: validatedData.query,
        domain: validatedData.domain,
        complexity: validatedData.complexity,
        deadline: validatedData.deadline ? new Date(validatedData.deadline) : undefined,
        requirements: validatedData.requirements || [],
        status: 'PENDING',
        priority: 'MEDIUM',
        creatorId: session.user.id,
        metadata: {
          preferences: validatedData.preferences,
          researchType: 'DEEP_RESEARCH',
        },
      },
    });

    // 启动深度研究服务
    const researchService = new DeepResearchService();
    
    // 异步执行研究（不阻塞响应）
    researchService.executeResearch(task)
      .then(async (result) => {
        // 更新任务状态和结果
        await prisma.researchTask.update({
          where: { id: task.id },
          data: {
            status: 'COMPLETED',
            results: [{
              id: crypto.randomUUID(),
              type: 'DEEP_RESEARCH_REPORT',
              content: result,
              source: 'DEEP_RESEARCH_SERVICE',
              confidence: result.metadata.confidence,
              createdAt: new Date(),
              metadata: {
                processingTime: result.metadata.processingTime,
                sourcesUsed: result.metadata.sourcesUsed,
              },
            }],
          },
        });
      })
      .catch(async (error) => {
        console.error('Deep research failed:', error);
        await prisma.researchTask.update({
          where: { id: task.id },
          data: {
            status: 'FAILED',
            metadata: {
              ...task.metadata,
              error: error.message,
            },
          },
        });
      });

    return NextResponse.json(
      {
        data: {
          taskId: task.id,
          status: 'STARTED',
          estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000), // 5分钟估计
        },
        message: 'Deep research started successfully',
      },
      { status: 202 } // Accepted
    );
  } catch (error) {
    console.error('Error starting deep research:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
```

### 3.3 研究任务状态查询 API

```typescript
// app/api/multi-agent/deep-research/[taskId]/route.ts
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: {
    taskId: string;
  };
}

// 获取研究任务状态和结果
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { taskId } = params;
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 查询任务
    const task = await prisma.researchTask.findUnique({
      where: { id: taskId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedAgents: {
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                type: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // 权限检查
    if (task.creatorId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // 计算进度
    let progress = 0;
    switch (task.status) {
      case 'PENDING':
        progress = 0;
        break;
      case 'IN_PROGRESS':
        progress = 50;
        break;
      case 'COMPLETED':
        progress = 100;
        break;
      case 'FAILED':
        progress = 0;
        break;
    }

    const response = {
      data: {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        progress,
        domain: task.domain,
        complexity: task.complexity,
        priority: task.priority,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        deadline: task.deadline,
        creator: task.creator,
        assignedAgents: task.assignedAgents.map(assignment => assignment.agent),
        results: task.results,
        metadata: task.metadata,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching research task:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// 取消研究任务
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { taskId } = params;
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 查询任务
    const task = await prisma.researchTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // 权限检查
    if (task.creatorId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // 只能取消进行中或待处理的任务
    if (!['PENDING', 'IN_PROGRESS'].includes(task.status)) {
      return NextResponse.json(
        { error: 'Cannot cancel completed or failed task' },
        { status: 409 }
      );
    }

    // 更新任务状态
    await prisma.researchTask.update({
      where: { id: taskId },
      data: {
        status: 'CANCELLED',
        metadata: {
          ...task.metadata,
          cancelledAt: new Date().toISOString(),
          cancelledBy: session.user.id,
        },
      },
    });

    return NextResponse.json({
      message: 'Task cancelled successfully',
    });
  } catch (error) {
    console.error('Error cancelling research task:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
```

## 4. AG-UI 集成 API

### 4.1 聊天接口

```typescript
// app/api/ag-ui/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AgUICoreAdapter } from '@/lib/ag-ui/core-adapter';
import { FastGPTAdapter } from '@/lib/integrations/fastgpt-adapter';

// 聊天请求验证模式
const chatRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  chatId: z.string().optional(),
  sessionId: z.string().optional(),
  context: z.object({
    userId: z.string(),
    appId: z.string().optional(),
    variables: z.record(z.any()).optional(),
  }),
  options: z.object({
    stream: z.boolean().default(true),
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().min(1).max(8000).default(2000),
    model: z.string().optional(),
  }).optional(),
});

// 流式聊天接口
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = chatRequestSchema.parse(body);

    // 获取 FastGPT 配置
    const fastgptConfig = {
      baseURL: process.env.FASTGPT_BASE_URL!,
      apiKey: process.env.FASTGPT_API_KEY!,
    };

    // 创建适配器实例
    const agUIAdapter = new AgUICoreAdapter();
    const fastGPTAdapter = new FastGPTAdapter(fastgptConfig);

    // 初始化会话（如果需要）
    if (!validatedData.chatId) {
      await agUIAdapter.initializeSession({
        appId: validatedData.context.appId,
        variables: validatedData.context.variables,
      });
    }

    // 创建响应流
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 发送运行开始事件
          const runStartEvent = {
            type: 'RUN_STARTED',
            data: {
              runId: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
            },
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(runStartEvent)}\n\n`)
          );

          // 发送消息开始事件
          const messageStartEvent = {
            type: 'TEXT_MESSAGE_START',
            data: {
              messageId: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
            },
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(messageStartEvent)}\n\n`)
          );

          // 调用 FastGPT API
          const fastgptStream = await fastGPTAdapter.chat(
            validatedData.chatId || crypto.randomUUID(),
            validatedData.message,
            validatedData.options || {}
          );

          // 处理流式响应
          const reader = fastgptStream.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  
                  // 转换为 AG-UI 事件格式
                  if (data.choices?.[0]?.delta?.content) {
                    const contentEvent = {
                      type: 'TEXT_MESSAGE_CONTENT',
                      data: {
                        content: data.choices[0].delta.content,
                        timestamp: new Date().toISOString(),
                      },
                    };
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify(contentEvent)}\n\n`)
                    );
                  }

                  // 处理工具调用
                  if (data.choices?.[0]?.delta?.tool_calls) {
                    const toolCallEvent = {
                      type: 'TOOL_CALL_START',
                      data: {
                        toolCallId: crypto.randomUUID(),
                        toolName: data.choices[0].delta.tool_calls[0].function.name,
                        timestamp: new Date().toISOString(),
                      },
                    };
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify(toolCallEvent)}\n\n`)
                    );
                  }
                } catch (parseError) {
                  console.error('Error parsing FastGPT response:', parseError);
                }
              }
            }
          }

          // 发送消息结束事件
          const messageEndEvent = {
            type: 'TEXT_MESSAGE_END',
            data: {
              timestamp: new Date().toISOString(),
              usage: {
                promptTokens: 0, // 从 FastGPT 响应中获取
                completionTokens: 0,
                totalTokens: 0,
              },
            },
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(messageEndEvent)}\n\n`)
          );

          // 发送运行结束事件
          const runEndEvent = {
            type: 'RUN_FINISHED',
            data: {
              timestamp: new Date().toISOString(),
              status: 'completed',
            },
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(runEndEvent)}\n\n`)
          );

          controller.close();
        } catch (error) {
          console.error('Error in chat stream:', error);
          
          // 发送错误事件
          const errorEvent = {
            type: 'ERROR',
            data: {
              error: 'Internal server error',
              timestamp: new Date().toISOString(),
            },
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`)
          );
          
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
```

## 5. 数据格式规范

### 5.1 标准响应格式

```typescript
// 成功响应格式
interface SuccessResponse<T> {
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    version?: string;
  };
}

// 错误响应格式
interface ErrorResponse {
  error: string;
  details?: any;
  code?: string;
  timestamp?: string;
  requestId?: string;
}

// 验证错误响应
interface ValidationErrorResponse {
  error: 'Validation Error';
  details: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}
```

### 5.2 分页响应格式

```typescript
// 分页查询响应
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;          // 当前页码
    limit: number;         // 每页数量
    total: number;         // 总记录数
    pages: number;         // 总页数
    hasNext: boolean;      // 是否有下一页
    hasPrev: boolean;      // 是否有上一页
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

// 分页查询参数
interface PaginationQuery {
  page?: number;         // 页码，默认 1
  limit?: number;        // 每页数量，默认 20，最大 100
  sortBy?: string;       // 排序字段
  sortOrder?: 'asc' | 'desc'; // 排序方向，默认 desc
  search?: string;       // 搜索关键词
}
```

### 5.3 事件流格式

```typescript
// AG-UI 事件基础格式
interface BaseEvent {
  type: string;
  data: any;
  timestamp: string;
  id?: string;
}

// 具体事件类型
interface TextMessageContentEvent extends BaseEvent {
  type: 'TEXT_MESSAGE_CONTENT';
  data: {
    content: string;
    messageId: string;
    timestamp: string;
  };
}

interface ToolCallStartEvent extends BaseEvent {
  type: 'TOOL_CALL_START';
  data: {
    toolCallId: string;
    toolName: string;
    timestamp: string;
  };
}

interface RunFinishedEvent extends BaseEvent {
  type: 'RUN_FINISHED';
  data: {
    runId: string;
    status: 'completed' | 'failed' | 'cancelled';
    timestamp: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      cost?: number;
    };
  };
}
```

## 6. 错误处理规范

### 6.1 HTTP 状态码使用

| 状态码 | 含义 | 使用场景 |
|--------|------|----------|
| 200 | OK | 请求成功 |
| 201 | Created | 资源创建成功 |
| 202 | Accepted | 请求已接受，异步处理中 |
| 204 | No Content | 请求成功，无返回内容 |
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 未认证 |
| 403 | Forbidden | 无权限 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 资源冲突 |
| 422 | Unprocessable Entity | 语义错误 |
| 429 | Too Many Requests | 请求过于频繁 |
| 500 | Internal Server Error | 服务器内部错误 |
| 502 | Bad Gateway | 网关错误 |
| 503 | Service Unavailable | 服务不可用 |

### 6.2 错误处理中间件

```typescript
// lib/middleware/error-handler.ts
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export class APIError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export function handleAPIError(error: unknown): NextResponse {
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  console.error('API Error:', {
    error,
    requestId,
    timestamp,
  });

  // Zod 验证错误
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Validation Error',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        })),
        requestId,
        timestamp,
      },
      { status: 400 }
    );
  }

  // Prisma 错误
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return NextResponse.json(
          {
            error: 'Unique constraint violation',
            details: error.meta,
            requestId,
            timestamp,
          },
          { status: 409 }
        );
      case 'P2025':
        return NextResponse.json(
          {
            error: 'Record not found',
            requestId,
            timestamp,
          },
          { status: 404 }
        );
      default:
        return NextResponse.json(
          {
            error: 'Database error',
            code: error.code,
            requestId,
            timestamp,
          },
          { status: 500 }
        );
    }
  }

  // 自定义 API 错误
  if (error instanceof APIError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        details: error.details,
        requestId,
        timestamp,
      },
      { status: error.statusCode }
    );
  }

  // 未知错误
  return NextResponse.json(
    {
      error: 'Internal Server Error',
      requestId,
      timestamp,
    },
    { status: 500 }
  );
}

// 错误处理装饰器
export function withErrorHandler(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      return handleAPIError(error);
    }
  };
}
```

## 7. 认证授权规范

### 7.1 JWT Token 格式

```typescript
// JWT Payload 格式
interface JWTPayload {
  sub: string;           // 用户ID
  email: string;         // 用户邮箱
  name: string;          // 用户姓名
  role: 'USER' | 'ADMIN' | 'MODERATOR'; // 用户角色
  permissions: string[]; // 权限列表
  iat: number;          // 签发时间
  exp: number;          // 过期时间
  iss: string;          // 签发者
  aud: string;          // 受众
}

// 权限检查中间件
export async function requireAuth(
  request: NextRequest,
  requiredRole?: string,
  requiredPermissions?: string[]
): Promise<{ user: JWTPayload } | NextResponse> {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // 角色检查
  if (requiredRole && session.user.role !== requiredRole && session.user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }

  // 权限检查
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasPermission = requiredPermissions.every(permission =>
      session.user.permissions.includes(permission)
    );
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
  }

  return { user: session.user };
}
```

### 7.2 API 密钥认证

```typescript
// API 密钥验证
export async function validateAPIKey(
  request: NextRequest
): Promise<{ apiKey: APIKey } | NextResponse> {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing or invalid API key' },
      { status: 401 }
    );
  }

  const apiKey = authHeader.slice(7); // Remove 'Bearer ' prefix
  
  // 验证 API 密钥
  const keyRecord = await prisma.apiKey.findUnique({
    where: { key: apiKey },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (!keyRecord || !keyRecord.isActive) {
    return NextResponse.json(
      { error: 'Invalid or inactive API key' },
      { status: 401 }
    );
  }

  // 检查过期时间
  if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
    return NextResponse.json(
      { error: 'API key expired' },
      { status: 401 }
    );
  }

  // 更新最后使用时间
  await prisma.apiKey.update({
    where: { id: keyRecord.id },
    data: { lastUsedAt: new Date() },
  });

  return { apiKey: keyRecord };
}
```

## 8. 版本控制规范

### 8.1 API 版本策略

```typescript
// 版本控制策略
const API_VERSIONS = {
  v1: {
    path: '/api/v1',
    deprecated: false,
    sunset: null,
  },
  v2: {
    path: '/api/v2',
    deprecated: false,
    sunset: null,
  },
} as const;

// 版本兼容性检查
export function checkAPIVersion(
  request: NextRequest
): { version: string; isSupported: boolean } {
  const pathname = request.nextUrl.pathname;
  
  for (const [version, config] of Object.entries(API_VERSIONS)) {
    if (pathname.startsWith(config.path)) {
      return {
        version,
        isSupported: !config.deprecated,
      };
    }
  }
  
  return {
    version: 'unknown',
    isSupported: false,
  };
}

// 版本弃用警告
export function addDeprecationWarning(
  response: NextResponse,
  version: string,
  sunsetDate?: string
): NextResponse {
  response.headers.set('Warning', '299 - "API version deprecated"');
  response.headers.set('Deprecation', 'true');
  
  if (sunsetDate) {
    response.headers.set('Sunset', sunsetDate);
  }
  
  return response;
}
```

### 8.2 向后兼容性

```typescript
// 响应格式转换器
export class ResponseTransformer {
  static transformToV1<T>(data: T): any {
    // 将新版本数据格式转换为 v1 格式
    if (Array.isArray(data)) {
      return data.map(item => this.transformItemToV1(item));
    }
    return this.transformItemToV1(data);
  }
  
  private static transformItemToV1(item: any): any {
    // 移除 v2 新增字段，重命名字段等
    const { newField, renamedField, ...v1Item } = item;
    
    return {
      ...v1Item,
      oldFieldName: renamedField, // 字段重命名兼容
    };
  }
  
  static transformToV2<T>(data: T): any {
    // v2 格式转换逻辑
    return data;
  }
}
```

## 9. 性能优化

### 9.1 缓存策略

```typescript
// 缓存装饰器
export function withCache(
  keyGenerator: (request: NextRequest, ...args: any[]) => string,
  ttl: number = 300 // 5分钟默认TTL
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;
    
    descriptor.value = async function (
      request: NextRequest,
      ...args: any[]
    ) {
      const cacheKey = keyGenerator(request, ...args);
      
      // 检查缓存
      const cached = await redis.get(cacheKey);
      if (cached) {
        const response = NextResponse.json(JSON.parse(cached));
        response.headers.set('X-Cache', 'HIT');
        return response;
      }
      
      // 执行原方法
      const result = await method.apply(this, [request, ...args]);
      
      // 缓存结果
      if (result.status === 200) {
        const responseData = await result.json();
        await redis.setex(cacheKey, ttl, JSON.stringify(responseData));
        
        const newResponse = NextResponse.json(responseData);
        newResponse.headers.set('X-Cache', 'MISS');
        return newResponse;
      }
      
      return result;
    };
  };
}

// 使用示例
class UserController {
  @withCache(
    (request) => `users:list:${request.nextUrl.searchParams.toString()}`,
    300
  )
  async getUsers(request: NextRequest) {
    // 实现逻辑
  }
}
```

### 9.2 请求限流

```typescript
// 限流中间件
export class RateLimiter {
  private static limits = new Map<string, { count: number; resetTime: number }>();
  
  static async checkLimit(
    identifier: string,
    limit: number,
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const key = `${identifier}:${Math.floor(now / windowMs)}`;
    
    const current = this.limits.get(key) || { count: 0, resetTime: now + windowMs };
    
    if (current.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: current.resetTime,
      };
    }
    
    current.count++;
    this.limits.set(key, current);
    
    return {
      allowed: true,
      remaining: limit - current.count,
      resetTime: current.resetTime,
    };
  }
  
  static async middleware(
    request: NextRequest,
    identifier: string,
    limit: number = 100,
    windowMs: number = 60000 // 1分钟
  ): Promise<NextResponse | null> {
    const result = await this.checkLimit(identifier, limit, windowMs);
    
    if (!result.allowed) {
      return NextResponse.json(
        {
          error: 'Too Many Requests',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': result.resetTime.toString(),
            'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }
    
    return null; // 允许继续处理
  }
}

// 使用示例
export async function withRateLimit(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const identifier = request.ip || 'anonymous';
  
  const rateLimitResponse = await RateLimiter.middleware(
    request,
    identifier,
    100, // 每分钟100次请求
    60000
  );
  
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  
  return handler();
}
```

### 9.3 数据库查询优化

```typescript
// 查询优化工具
export class QueryOptimizer {
  // 批量查询优化
  static async batchLoad<T>(
    ids: string[],
    loader: (ids: string[]) => Promise<T[]>,
    keyExtractor: (item: T) => string
  ): Promise<Map<string, T>> {
    const results = await loader(ids);
    const map = new Map<string, T>();
    
    results.forEach(item => {
      map.set(keyExtractor(item), item);
    });
    
    return map;
  }
  
  // 分页查询优化
  static buildPaginationQuery(
    page: number,
    limit: number,
    maxLimit: number = 100
  ) {
    const normalizedLimit = Math.min(Math.max(limit, 1), maxLimit);
    const normalizedPage = Math.max(page, 1);
    
    return {
      skip: (normalizedPage - 1) * normalizedLimit,
      take: normalizedLimit,
    };
  }
  
  // 搜索查询优化
  static buildSearchQuery(
    search: string,
    fields: string[]
  ) {
    if (!search || search.trim().length === 0) {
      return {};
    }
    
    const searchTerm = search.trim();
    
    return {
      OR: fields.map(field => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive' as const,
        },
      })),
    };
  }
}
```

## 10. 监控和日志

### 10.1 请求日志

```typescript
// 请求日志中间件
export function requestLogger(request: NextRequest): void {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  console.log({
    type: 'REQUEST_START',
    requestId,
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent'),
    ip: request.ip,
    timestamp: new Date().toISOString(),
  });
  
  // 在响应中添加请求ID
  request.headers.set('X-Request-ID', requestId);
}

export function responseLogger(
  request: NextRequest,
  response: NextResponse,
  startTime: number
): void {
  const duration = Date.now() - startTime;
  const requestId = request.headers.get('X-Request-ID');
  
  console.log({
    type: 'REQUEST_END',
    requestId,
    method: request.method,
    url: request.url,
    status: response.status,
    duration,
    timestamp: new Date().toISOString(),
  });
}
```

### 10.2 性能监控

```typescript
// 性能监控
export class PerformanceMonitor {
  static async trackAPICall<T>(
    operation: string,
    handler: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    
    try {
      const result = await handler();
      
      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      
      // 记录性能指标
      console.log({
        type: 'PERFORMANCE_METRIC',
        operation,
        duration: endTime - startTime,
        memoryUsage: {
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        },
        timestamp: new Date().toISOString(),
      });
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      
      console.error({
        type: 'PERFORMANCE_ERROR',
        operation,
        duration: endTime - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      
      throw error;
    }
  }
}
```

## 11. 安全规范

### 11.1 输入验证

```typescript
// 安全验证工具
export class SecurityValidator {
  // SQL注入防护
  static validateSQLInput(input: string): boolean {
    const sqlInjectionPattern = /('|(\-\-)|(;)|(\||\|)|(\*|\*))/i;
    return !sqlInjectionPattern.test(input);
  }
  
  // XSS防护
  static sanitizeHTML(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
  
  // 文件上传验证
  static validateFileUpload(file: File): {
    valid: boolean;
    error?: string;
  } {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'File type not allowed',
      };
    }
    
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size too large',
      };
    }
    
    return { valid: true };
  }
}
```

### 11.2 CORS 配置

```typescript
// CORS 配置
export function setCORSHeaders(response: NextResponse): NextResponse {
  const allowedOrigins = [
    'http://localhost:3000',
    'https://zk-agent.com',
    'https://app.zk-agent.com',
  ];
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');
  
  // 动态设置允许的源
  const origin = response.headers.get('origin');
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  
  return response;
}
```

## 12. 测试规范

### 12.1 API 测试示例

```typescript
// __tests__/api/users.test.ts
import { createMocks } from 'node-mocks-http';
import { GET, POST } from '@/app/api/v1/users/route';

describe('/api/v1/users', () => {
  describe('GET', () => {
    it('should return users list', async () => {
      const { req } = createMocks({
        method: 'GET',
        url: '/api/v1/users?page=1&limit=10',
      });
      
      const response = await GET(req as any);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('pagination');
      expect(Array.isArray(data.data)).toBe(true);
    });
    
    it('should handle validation errors', async () => {
      const { req } = createMocks({
        method: 'GET',
        url: '/api/v1/users?page=0&limit=1000',
      });
      
      const response = await GET(req as any);
      
      expect(response.status).toBe(400);
    });
  });
  
  describe('POST', () => {
    it('should create a new user', async () => {
      const { req } = createMocks({
        method: 'POST',
        body: {
          name: 'Test User',
          email: 'test@example.com',
          role: 'USER',
        },
      });
      
      const response = await POST(req as any);
      const data = await response.json();
      
      expect(response.status).toBe(201);
      expect(data.data).toHaveProperty('id');
      expect(data.data.name).toBe('Test User');
    });
  });
});
```

## 13. 文档规范

### 13.1 OpenAPI 规范

```yaml
# docs/api/openapi.yaml
openapi: 3.0.3
info:
  title: ZK-Agent API
  description: ZK-Agent 多智能体系统 API 文档
  version: 1.0.0
  contact:
    name: ZK-Agent Team
    email: support@zk-agent.com
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: https://api.zk-agent.com/v1
    description: 生产环境
  - url: https://staging-api.zk-agent.com/v1
    description: 测试环境
  - url: http://localhost:3000/api/v1
    description: 开发环境

paths:
  /users:
    get:
      summary: 获取用户列表
      tags:
        - Users
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            minimum: 1
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
      responses:
        '200':
          description: 成功返回用户列表
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UsersResponse'
        '400':
          $ref: '#/components/responses/ValidationError'
        '401':
          $ref: '#/components/responses/Unauthorized'

components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        email:
          type: string
          format: email
        role:
          type: string
          enum: [USER, ADMIN, MODERATOR]
        createdAt:
          type: string
          format: date-time
    
    UsersResponse:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/User'
        pagination:
          $ref: '#/components/schemas/Pagination'
  
  responses:
    ValidationError:
      description: 验证错误
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: string
              details:
                type: array
                items:
                  type: object
```

## 14. 部署和运维

### 14.1 健康检查

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

export async function GET() {
  const startTime = Date.now();
  
  try {
    // 数据库健康检查
    await prisma.$queryRaw`SELECT 1`;
    const dbStatus = 'healthy';
    
    // Redis 健康检查
    await redis.ping();
    const redisStatus = 'healthy';
    
    // 系统信息
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    const response = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: uptime,
      responseTime: Date.now() - startTime,
      services: {
        database: dbStatus,
        redis: redisStatus,
      },
      system: {
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        },
        cpu: process.cpuUsage(),
      },
      version: process.env.APP_VERSION || '1.0.0',
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
```

## 15. 最佳实践总结

### 15.1 API 设计原则

1. **一致性**: 保持命名、响应格式、错误处理的一致性
2. **可预测性**: API 行为应该可预测，相同输入产生相同输出
3. **向后兼容**: 新版本应保持向后兼容性
4. **安全性**: 始终验证输入，使用 HTTPS，实施适当的认证授权
5. **性能**: 合理使用缓存，优化数据库查询，实施限流
6. **可观测性**: 完善的日志记录和监控
7. **文档化**: 提供清晰、完整的 API 文档

### 15.2 开发流程

1. **设计阶段**: 定义 API 规范，设计数据模型
2. **实现阶段**: 编写代码，添加验证和错误处理
3. **测试阶段**: 单元测试、集成测试、性能测试
4. **文档阶段**: 更新 API 文档和示例
5. **部署阶段**: 部署到测试环境，进行验收测试
6. **监控阶段**: 监控 API 性能和错误率

### 15.3 维护指南

1. **定期审查**: 定期审查 API 使用情况和性能指标
2. **版本管理**: 合理规划 API 版本升级
3. **安全更新**: 及时修复安全漏洞
4. **性能优化**: 根据监控数据优化性能瓶颈
5. **文档维护**: 保持文档与代码同步更新

---

本文档将随着项目发展持续更新，确保 API 设计始终符合最佳实践和业务需求。