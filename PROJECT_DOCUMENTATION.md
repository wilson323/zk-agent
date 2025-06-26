# ZK-Agent 项目全面介绍文档

## 📋 目录

1. [项目概述](#项目概述)
2. [技术架构](#技术架构)
3. [功能模块介绍](#功能模块介绍)
4. [项目结构](#项目结构)
5. [开发规范](#开发规范)
6. [API设计](#api设计)
7. [数据库设计](#数据库设计)
8. [部署与运维](#部署与运维)
9. [开发指南](#开发指南)
10. [性能优化](#性能优化)

---

## 🎯 项目概述

### 项目定位
**ZK-Agent** 是一个企业级AI多智能体协同平台，集成了对话智能体、CAD分析专家、AI海报设计师三大核心AI能力，为用户提供统一的AI服务入口和现代化的交互体验。

### 核心特性
- 🤖 **多智能体协同**：支持多种AI智能体类型，包括聊天、CAD分析、海报生成等
- 🎨 **现代化UI设计**：基于Tailwind CSS的响应式设计，支持深色/浅色主题切换
- 🔒 **企业级安全**：完整的用户认证、权限管理和数据安全保护
- 📊 **智能分析**：CAD文件智能解析、结构分析、设备检测等专业功能
- 🎭 **创意设计**：AI驱动的海报生成，支持多种模板和风格定制
- 📱 **响应式体验**：适配桌面端、平板和移动端的完美体验

### 技术亮点
- **Next.js 15** + **React 18** + **TypeScript** 现代前端技术栈
- **Prisma ORM** + **PostgreSQL** 高性能数据层
- **FastGPT集成** + **多AI服务商支持**
- **Service Worker缓存优化** + **性能监控**
- **Docker容器化部署** + **CI/CD自动化**

---

## 🏗️ 技术架构

### 系统架构图
```
┌─────────────────────────────────────────────────────────────┐
│                        前端层 (Next.js)                      │
├─────────────────────────────────────────────────────────────┤
│  用户端界面  │  管理端界面  │  API路由  │  中间件  │  组件库   │
├─────────────────────────────────────────────────────────────┤
│                        业务逻辑层                            │
├─────────────────────────────────────────────────────────────┤
│  智能体服务  │  认证服务   │  文件服务  │  AI集成  │  工具库   │
├─────────────────────────────────────────────────────────────┤
│                        数据访问层                            │
├─────────────────────────────────────────────────────────────┤
│  Prisma ORM │  PostgreSQL │  Redis缓存 │  文件存储 │  监控    │
└─────────────────────────────────────────────────────────────┘
```

### 技术栈详情

#### 前端技术栈
- **框架**: Next.js 15 (App Router)
- **UI库**: React 18 + TypeScript
- **样式**: Tailwind CSS + CSS Variables
- **状态管理**: React Context + Hooks
- **组件库**: 自研组件 + Radix UI
- **图标**: Lucide React
- **动画**: CSS Transitions + Framer Motion

#### 后端技术栈
- **运行时**: Node.js + Next.js API Routes
- **数据库**: PostgreSQL + Prisma ORM
- **认证**: JWT + Session + RBAC
- **文件存储**: 本地存储 + 云存储支持
- **缓存**: Redis (可选)
- **AI集成**: FastGPT + 多厂商AI服务

#### 开发工具链
- **包管理**: npm/yarn
- **代码规范**: ESLint + Prettier
- **类型检查**: TypeScript
- **测试**: Jest + React Testing Library
- **构建**: Next.js + Webpack
- **部署**: Docker + CI/CD

---

## 🚀 功能模块介绍

### 1. 智能对话模块 (`/chat`)

#### 功能特性
- **多轮对话**: 支持上下文记忆的智能对话
- **FastGPT集成**: 深度集成FastGPT API
- **流式响应**: 实时流式文本生成
- **多模态支持**: 文本、图片、文档等多种输入
- **会话管理**: 会话历史、导出、分享功能
- **个性化配置**: 温度、最大token等参数调节

#### 技术实现
- **组件**: `ChatInterface`, `MessageList`, `InputArea`
- **API**: `/api/fastgpt/chat` - 聊天接口
- **状态管理**: `ChatContext` + `useChat` Hook
- **数据模型**: `ChatSession`, `ChatMessage`

### 2. CAD分析模块 (`/cad-analyzer`)

#### 功能特性
- **文件上传**: 支持多种CAD格式 (DWG, DXF, STEP等)
- **智能解析**: AI驱动的CAD文件结构分析
- **3D渲染**: 基于WebGL的3D模型展示
- **专业分析**: 
  - 结构完整性分析
  - 设备检测与识别
  - 安防布局优化建议
  - 合规性检查
  - 风险评估报告
- **报告生成**: 详细的分析报告和可视化图表
- **历史记录**: 分析历史和结果对比

#### 技术实现
- **组件**: `CADFileUploader`, `CADViewer`, `AnalysisResults`
- **API**: `/api/cad/*` - CAD相关接口
- **文件处理**: 多部分上传、进度跟踪
- **数据模型**: `CADFile`, `AnalysisResult`

### 3. AI海报设计模块 (`/poster-generator`)

#### 功能特性
- **智能生成**: AI驱动的创意海报设计
- **模板系统**: 丰富的预设模板库
- **风格定制**: 多种设计风格和配色方案
- **高级编辑**: 
  - 图像滤镜和特效
  - 智能裁剪和调整
  - 文字排版优化
  - 元素拖拽编辑
- **格式支持**: PNG, JPG, PDF等多种导出格式
- **批量生成**: 支持批量任务处理
- **分享功能**: 在线预览和社交分享

#### 技术实现
- **组件**: `PosterGeneratorInterface`, `TemplateSelector`, `StyleEditor`
- **API**: `/api/poster/*` - 海报生成接口
- **任务队列**: 异步任务处理
- **数据模型**: `PosterTask`, `PosterGeneration`

### 4. 管理后台模块 (`/admin`)

#### 功能特性
- **用户管理**: 用户列表、权限分配、状态管理
- **AI模型管理**: 模型配置、API密钥管理、使用统计
- **系统监控**: 性能指标、错误日志、使用分析
- **内容管理**: 模板管理、素材库、审核流程
- **数据分析**: 用户行为分析、功能使用统计
- **系统配置**: 全局设置、功能开关、限制配置

#### 技术实现
- **组件**: `AdminDashboard`, `UserManagement`, `ModelConfig`
- **API**: `/api/admin/*` - 管理接口
- **权限控制**: RBAC权限模型
- **数据模型**: `User`, `AIModel`, `SystemConfig`

---

## 📁 项目结构

```
zk-agent/
├── 📁 app/                     # Next.js App Router
│   ├── 📁 (public)/           # 用户端页面
│   │   ├── 📄 page.tsx        # 首页
│   │   ├── 📁 chat/           # 对话页面
│   │   ├── 📁 cad-analyzer/   # CAD分析页面
│   │   └── 📁 poster-generator/ # 海报生成页面
│   ├── 📁 admin/              # 管理端页面
│   │   ├── 📄 page.tsx        # 管理首页
│   │   ├── 📁 dashboard/      # 仪表板
│   │   ├── 📁 users/          # 用户管理
│   │   └── 📁 ai-models/      # AI模型管理
│   ├── 📁 api/                # API路由
│   │   ├── 📁 auth/           # 认证接口
│   │   ├── 📁 fastgpt/        # FastGPT集成
│   │   ├── 📁 cad/            # CAD分析接口
│   │   ├── 📁 poster/         # 海报生成接口
│   │   └── 📁 admin/          # 管理接口
│   └── 📄 layout.tsx          # 根布局
├── 📁 components/             # 可复用组件
│   ├── 📁 ui/                 # 基础UI组件
│   ├── 📁 chat/               # 聊天相关组件
│   ├── 📁 cad/                # CAD相关组件
│   ├── 📁 poster/             # 海报相关组件
│   └── 📁 admin/              # 管理相关组件
├── 📁 lib/                    # 业务逻辑库
│   ├── 📁 services/           # 业务服务
│   ├── 📁 utils/              # 工具函数
│   ├── 📁 auth/               # 认证逻辑
│   └── 📁 ai/                 # AI集成
├── 📁 types/                  # TypeScript类型定义
│   ├── 📁 core/               # 核心类型
│   ├── 📁 agents/             # 智能体类型
│   ├── 📁 cad/                # CAD相关类型
│   └── 📄 ai-models.ts        # AI模型类型
├── 📁 config/                 # 配置文件
│   ├── 📄 database.ts         # 数据库配置
│   ├── 📄 ai-models.ts        # AI模型配置
│   └── 📄 default-agent.ts    # 默认智能体配置
├── 📁 contexts/               # React上下文
│   ├── 📄 auth-context.tsx    # 认证上下文
│   └── 📄 theme-context.tsx   # 主题上下文
├── 📁 hooks/                  # 自定义Hooks
│   ├── 📄 use-auth.ts         # 认证Hook
│   ├── 📄 use-chat.ts         # 聊天Hook
│   └── 📄 use-theme.ts        # 主题Hook
├── 📁 prisma/                 # 数据库相关
│   ├── 📄 schema.prisma       # 数据库模型
│   ├── 📁 migrations/         # 数据库迁移
│   └── 📁 seeds/              # 种子数据
├── 📁 public/                 # 静态资源
│   ├── 📁 images/             # 图片资源
│   ├── 📁 icons/              # 图标资源
│   └── 📁 templates/          # 模板资源
├── 📁 styles/                 # 样式文件
│   ├── 📄 globals.css         # 全局样式
│   └── 📄 components.css      # 组件样式
├── 📁 docs/                   # 项目文档
│   ├── 📄 API.md              # API文档
│   ├── 📄 DEPLOYMENT.md       # 部署文档
│   └── 📄 DEVELOPMENT.md      # 开发文档
├── 📁 scripts/                # 工具脚本
│   ├── 📄 build.js            # 构建脚本
│   ├── 📄 test.js             # 测试脚本
│   └── 📄 deploy.js           # 部署脚本
├── 📁 tests/                  # 测试文件
│   ├── 📁 __tests__/          # 单元测试
│   ├── 📁 e2e/                # 端到端测试
│   └── 📁 fixtures/           # 测试数据
└── 📄 package.json            # 项目配置
```

### 目录设计原则

1. **职责分离**: 每个目录都有明确的职责和边界
2. **模块化**: 按功能模块组织代码，便于维护和扩展
3. **可复用性**: 公共组件和工具函数统一管理
4. **类型安全**: 完整的TypeScript类型定义
5. **配置集中**: 所有配置文件统一管理

---

## 📋 开发规范

### 1. 代码规范

#### 命名约定
- **文件命名**: kebab-case (如: `user-profile.tsx`)
- **组件命名**: PascalCase (如: `UserProfile`)
- **函数命名**: camelCase (如: `getUserProfile`)
- **常量命名**: UPPER_SNAKE_CASE (如: `API_BASE_URL`)
- **类型命名**: PascalCase (如: `UserProfile`)

#### 文件组织
```typescript
// 文件头部注释
/**
 * @file components/chat/chat-interface.tsx
 * @description 聊天界面主组件
 * @author zk-agent开发团队
 * @lastUpdate 2024-12-19
 */

// 1. 外部依赖导入
import React from 'react'
import { useState, useEffect } from 'react'

// 2. 内部依赖导入
import { Button } from '@/components/ui/button'
import { useChat } from '@/hooks/use-chat'

// 3. 类型定义
interface ChatInterfaceProps {
  agentId: string
  initialMessages?: Message[]
}

// 4. 组件实现
export function ChatInterface({ agentId, initialMessages }: ChatInterfaceProps) {
  // 组件逻辑
}

// 5. 默认导出
export default ChatInterface
```

#### TypeScript规范
- **严格类型**: 启用严格模式，避免any类型
- **接口定义**: 优先使用interface而非type
- **泛型使用**: 合理使用泛型提高代码复用性
- **类型导出**: 统一从types目录导出类型

### 2. 组件开发规范

#### React组件规范
```typescript
// ✅ 推荐的组件结构
export function UserProfile({ userId, onUpdate }: UserProfileProps) {
  // 1. Hooks调用
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  
  // 2. 副作用
  useEffect(() => {
    fetchUser(userId).then(setUser)
  }, [userId])
  
  // 3. 事件处理函数
  const handleUpdate = useCallback((data: Partial<User>) => {
    // 处理逻辑
  }, [onUpdate])
  
  // 4. 渲染逻辑
  if (loading) return <LoadingSpinner />
  if (!user) return <ErrorMessage />
  
  return (
    <div className="user-profile">
      {/* 组件内容 */}
    </div>
  )
}
```

#### 组件设计原则
- **单一职责**: 每个组件只负责一个功能
- **可复用性**: 通过props实现组件的灵活配置
- **可测试性**: 组件逻辑清晰，便于单元测试
- **性能优化**: 合理使用memo、useMemo、useCallback

### 3. API开发规范

#### RESTful API设计
```typescript
// ✅ 标准的API路由结构
// GET /api/users - 获取用户列表
// GET /api/users/[id] - 获取单个用户
// POST /api/users - 创建用户
// PUT /api/users/[id] - 更新用户
// DELETE /api/users/[id] - 删除用户

// API响应格式
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  timestamp: string
}
```

#### 错误处理
- **统一错误格式**: 使用标准的错误响应格式
- **错误码规范**: 定义清晰的错误码体系
- **日志记录**: 记录详细的错误日志便于调试

### 4. 数据库规范

#### Prisma模型设计
```prisma
// ✅ 标准的模型定义
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  avatar    String?
  role      Role     @default(USER)
  status    UserStatus @default(ACTIVE)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // 关联关系
  chatSessions ChatSession[]
  
  @@map("users")
}
```

#### 数据库设计原则
- **规范化**: 避免数据冗余，保持数据一致性
- **索引优化**: 为查询频繁的字段添加索引
- **软删除**: 重要数据使用软删除而非物理删除
- **审计字段**: 添加创建时间、更新时间等审计字段

### 5. 测试规范

#### 单元测试
```typescript
// ✅ 组件测试示例
import { render, screen, fireEvent } from '@testing-library/react'
import { UserProfile } from './user-profile'

describe('UserProfile', () => {
  it('should render user information correctly', () => {
    const mockUser = { id: '1', name: 'John Doe', email: 'john@example.com' }
    render(<UserProfile user={mockUser} />)
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
  })
  
  it('should handle update action', () => {
    const mockOnUpdate = jest.fn()
    render(<UserProfile user={mockUser} onUpdate={mockOnUpdate} />)
    
    fireEvent.click(screen.getByText('Update'))
    expect(mockOnUpdate).toHaveBeenCalled()
  })
})
```

#### 测试覆盖率要求
- **单元测试**: 覆盖率 ≥ 80%
- **集成测试**: 覆盖核心业务流程
- **E2E测试**: 覆盖关键用户路径

### 6. 性能规范

#### 前端性能优化
- **代码分割**: 使用动态导入实现路由级代码分割
- **图片优化**: 使用Next.js Image组件优化图片加载
- **缓存策略**: 合理使用浏览器缓存和Service Worker
- **Bundle分析**: 定期分析打包体积，优化依赖

#### 后端性能优化
- **数据库查询**: 优化SQL查询，避免N+1问题
- **缓存机制**: 使用Redis缓存热点数据
- **API限流**: 实现请求限流防止滥用
- **监控告警**: 建立完善的性能监控体系

### 7. 安全规范

#### 认证与授权
- **JWT令牌**: 使用安全的JWT实现
- **权限控制**: 实现细粒度的RBAC权限模型
- **密码安全**: 使用bcrypt加密存储密码
- **会话管理**: 安全的会话管理和令牌刷新

#### 数据安全
- **输入验证**: 严格验证所有用户输入
- **SQL注入防护**: 使用参数化查询
- **XSS防护**: 对输出内容进行转义
- **CSRF防护**: 实现CSRF令牌验证

---

## 🔌 API设计

### API架构概览

```
/api/
├── auth/                    # 认证相关
│   ├── login               # 用户登录
│   ├── register            # 用户注册
│   ├── refresh             # 令牌刷新
│   └── logout              # 用户登出
├── fastgpt/                # FastGPT集成
│   ├── chat                # 聊天接口
│   ├── models              # 模型列表
│   └── config              # 配置管理
├── cad/                    # CAD分析
│   ├── upload              # 文件上传
│   ├── analyze             # 分析处理
│   ├── results/[id]        # 分析结果
│   └── history             # 历史记录
├── poster/                 # 海报生成
│   ├── generate            # 生成海报
│   ├── templates           # 模板管理
│   ├── tasks/[id]          # 任务状态
│   └── gallery             # 作品画廊
├── admin/                  # 管理接口
│   ├── users               # 用户管理
│   ├── ai-models           # AI模型管理
│   ├── analytics           # 数据分析
│   └── system              # 系统配置
└── shared/                 # 共享接口
    ├── upload              # 文件上传
    ├── health              # 健康检查
    └── metrics             # 性能指标
```

### 核心API接口

#### 1. 认证API

```typescript
// POST /api/auth/login
interface LoginRequest {
  email: string
  password: string
  rememberMe?: boolean
}

interface LoginResponse {
  success: boolean
  data: {
    user: User
    accessToken: string
    refreshToken: string
    expiresIn: number
  }
}

// POST /api/auth/register
interface RegisterRequest {
  email: string
  password: string
  name: string
  avatar?: string
}
```

#### 2. FastGPT聊天API

```typescript
// POST /api/fastgpt/chat
interface ChatRequest {
  messages: Message[]
  chatId?: string
  variables?: Record<string, any>
  stream?: boolean
  agentId: string
}

interface ChatResponse {
  success: boolean
  data: {
    message: Message
    chatId: string
    usage: {
      promptTokens: number
      completionTokens: number
      totalTokens: number
    }
  }
}
```

#### 3. CAD分析API

```typescript
// POST /api/cad/upload
interface CADUploadRequest {
  file: File
  analysisConfig: {
    structuralAnalysis: boolean
    deviceDetection: boolean
    riskAssessment: boolean
    complianceCheck: boolean
  }
}

// GET /api/cad/results/[id]
interface CADAnalysisResult {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  results: {
    structuralAnalysis?: StructuralAnalysisResult
    deviceDetection?: DeviceDetectionResult
    riskAssessment?: RiskAssessmentResult
    complianceCheck?: ComplianceCheckResult
  }
  createdAt: string
  completedAt?: string
}
```

#### 4. 海报生成API

```typescript
// POST /api/poster/generate
interface PosterGenerateRequest {
  prompt: string
  template?: string
  style: string
  size: {
    width: number
    height: number
  }
  options: {
    colorScheme?: string
    fontStyle?: string
    imageStyle?: string
  }
}

interface PosterGenerateResponse {
  success: boolean
  data: {
    taskId: string
    estimatedTime: number
    status: 'queued' | 'processing' | 'completed' | 'failed'
  }
}
```

### API设计原则

1. **RESTful设计**: 遵循REST架构风格
2. **统一响应格式**: 所有API使用统一的响应格式
3. **版本控制**: 支持API版本管理
4. **错误处理**: 完善的错误码和错误信息
5. **文档完整**: 详细的API文档和示例
6. **性能优化**: 支持分页、过滤、排序等功能

---

## 🗄️ 数据库设计

### 数据库架构

#### 核心表结构

```sql
-- 用户表
CREATE TABLE users (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR UNIQUE NOT NULL,
    name VARCHAR,
    avatar VARCHAR,
    password VARCHAR NOT NULL,
    role user_role DEFAULT 'USER',
    status user_status DEFAULT 'ACTIVE',
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMP,
    last_login_at TIMESTAMP,
    login_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 聊天会话表
CREATE TABLE chat_sessions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
    agent_id VARCHAR NOT NULL,
    title VARCHAR,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 聊天消息表
CREATE TABLE chat_messages (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role message_role NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 海报任务表
CREATE TABLE poster_tasks (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    template VARCHAR,
    style VARCHAR NOT NULL,
    size JSONB NOT NULL,
    options JSONB,
    status task_status DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 海报生成结果表
CREATE TABLE poster_generations (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id VARCHAR REFERENCES poster_tasks(id) ON DELETE CASCADE,
    user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
    image_url VARCHAR NOT NULL,
    thumbnail_url VARCHAR,
    metadata JSONB,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### 枚举类型定义

```sql
-- 用户角色
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');

-- 用户状态
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED');

-- 消息角色
CREATE TYPE message_role AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- 任务状态
CREATE TYPE task_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
```

### 数据模型关系

```
Users (用户)
├── ChatSessions (聊天会话)
│   └── ChatMessages (聊天消息)
├── PosterTasks (海报任务)
│   └── PosterGenerations (海报生成结果)
├── RefreshTokens (刷新令牌)
└── PasswordResets (密码重置)
```

### 索引优化

```sql
-- 性能优化索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_poster_tasks_user_id ON poster_tasks(user_id);
CREATE INDEX idx_poster_tasks_status ON poster_tasks(status);
CREATE INDEX idx_poster_generations_user_id ON poster_generations(user_id);
CREATE INDEX idx_poster_generations_public ON poster_generations(is_public);
```

---

## 🚀 部署与运维

### 部署架构

#### 生产环境架构
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │────│   Web Servers   │────│   Database      │
│   (Nginx/ALB)   │    │   (Next.js)     │    │   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐
                       │   File Storage  │
                       │   (S3/Local)    │
                       └─────────────────┘
                                │
                       ┌─────────────────┐
                       │   Cache Layer   │
                       │   (Redis)       │
                       └─────────────────┘
```

#### Docker部署配置

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# 安装依赖
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 构建应用
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 生产镜像
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/zkagent
      - NEXTAUTH_SECRET=your-secret-key
      - NEXTAUTH_URL=http://localhost:3000
    depends_on:
      - db
      - redis
    volumes:
      - ./uploads:/app/uploads

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=zkagent
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 环境配置

#### 环境变量

```bash
# .env.production
# 数据库配置
DATABASE_URL="postgresql://user:password@localhost:5432/zkagent"

# 认证配置
NEXTAUTH_SECRET="your-super-secret-key"
NEXTAUTH_URL="https://your-domain.com"

# AI服务配置
FASTGPT_API_KEY="your-fastgpt-api-key"
FASTGPT_BASE_URL="https://api.fastgpt.in"

# 文件存储配置
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE="50MB"

# Redis配置
REDIS_URL="redis://localhost:6379"

# 监控配置
SENTRY_DSN="your-sentry-dsn"
ANALYTICS_ID="your-analytics-id"
```

### CI/CD流程

#### GitHub Actions配置

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test
      - run: npm run test:coverage

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: docker/build-push-action@v3
        with:
          push: true
          tags: zkagent:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to server
        run: |
          ssh user@server 'docker pull zkagent:latest'
          ssh user@server 'docker-compose up -d'
```

### 监控与日志

#### 性能监控
- **应用监控**: Sentry错误追踪
- **性能监控**: Web Vitals指标
- **业务监控**: 用户行为分析
- **基础监控**: 服务器资源监控

#### 日志管理
```typescript
// lib/logger.ts
import winston from 'winston'

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
})
```

---

## 👨‍💻 开发指南

### 快速开始

#### 1. 环境准备

```bash
# 克隆项目
git clone https://github.com/your-org/zk-agent.git
cd zk-agent

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 文件，填入必要的配置

# 初始化数据库
npx prisma generate
npx prisma db push
npx prisma db seed
```

#### 2. 启动开发服务器

```bash
# 启动开发服务器
npm run dev

# 启动数据库（如果使用Docker）
docker-compose up -d db redis

# 运行测试
npm run test
npm run test:watch  # 监听模式

# 代码检查
npm run lint
npm run type-check
```

#### 3. 开发工作流

```bash
# 创建新功能分支
git checkout -b feature/new-feature

# 开发过程中的常用命令
npm run dev          # 启动开发服务器
npm run test:watch   # 监听测试
npm run lint:fix     # 自动修复代码风格

# 提交代码
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature

# 创建Pull Request
# 代码审查通过后合并到main分支
```

### 开发工具配置

#### VSCode配置

```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "emmet.includeLanguages": {
    "javascript": "javascriptreact"
  }
}
```

```json
// .vscode/extensions.json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "prisma.prisma",
    "ms-vscode.vscode-json"
  ]
}
```

### 调试指南

#### 前端调试
```typescript
// 使用React DevTools
// 在组件中添加调试信息
const ChatInterface = () => {
  const [messages, setMessages] = useState([])
  
  // 调试Hook
  useEffect(() => {
    console.log('Messages updated:', messages)
  }, [messages])
  
  return (
    <div>
      {/* 开发环境显示调试信息 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="debug-info">
          <pre>{JSON.stringify(messages, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
```

#### 后端调试
```typescript
// API路由调试
export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // 记录请求信息
    logger.info('API Request', {
      url: request.url,
      method: request.method,
      body: body
    })
    
    // 业务逻辑
    const result = await processRequest(body)
    
    // 记录响应信息
    logger.info('API Response', { result })
    
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    // 错误日志
    logger.error('API Error', {
      error: error.message,
      stack: error.stack
    })
    
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
```

---

## ⚡ 性能优化

### 前端性能优化

#### 1. 代码分割与懒加载

```typescript
// 路由级代码分割
import dynamic from 'next/dynamic'

const ChatInterface = dynamic(() => import('@/components/chat/chat-interface'), {
  loading: () => <LoadingSpinner />,
  ssr: false
})

const CADAnalyzer = dynamic(() => import('@/components/cad/cad-analyzer'), {
  loading: () => <LoadingSpinner />
})

// 组件级懒加载
const HeavyComponent = lazy(() => import('./heavy-component'))

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <HeavyComponent />
    </Suspense>
  )
}
```

#### 2. 图片优化

```typescript
// 使用Next.js Image组件
import Image from 'next/image'

function UserAvatar({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={40}
      height={40}
      className="rounded-full"
      priority={false}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
    />
  )
}
```

#### 3. 缓存策略

```typescript
// Service Worker缓存
// public/sw.js
self.addEventListener('fetch', (event) => {
  if (event.request.destination === 'image') {
    event.respondWith(
      caches.open('images').then((cache) => {
        return cache.match(event.request).then((response) => {
          return response || fetch(event.request).then((fetchResponse) => {
            cache.put(event.request, fetchResponse.clone())
            return fetchResponse
          })
        })
      })
    )
  }
})

// React Query缓存
import { useQuery } from '@tanstack/react-query'

function UserProfile({ userId }: { userId: string }) {
  const { data: user, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    staleTime: 5 * 60 * 1000, // 5分钟
    cacheTime: 10 * 60 * 1000, // 10分钟
  })
  
  if (isLoading) return <LoadingSpinner />
  return <div>{user?.name}</div>
}
```

#### 4. 虚拟化长列表

```typescript
// 使用react-window进行虚拟化
import { FixedSizeList as List } from 'react-window'

function MessageList({ messages }: { messages: Message[] }) {
  const Row = ({ index, style }: { index: number; style: any }) => (
    <div style={style}>
      <MessageItem message={messages[index]} />
    </div>
  )
  
  return (
    <List
      height={600}
      itemCount={messages.length}
      itemSize={80}
      width="100%"
    >
      {Row}
    </List>
  )
}
```

### 后端性能优化

#### 1. 数据库查询优化

```typescript
// 使用Prisma的查询优化
// ❌ N+1查询问题
const users = await prisma.user.findMany()
for (const user of users) {
  const posts = await prisma.post.findMany({
    where: { userId: user.id }
  })
}

// ✅ 使用include预加载
const users = await prisma.user.findMany({
  include: {
    posts: true
  }
})

// ✅ 使用select只查询需要的字段
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    email: true
  }
})
```

#### 2. 缓存机制

```typescript
// Redis缓存实现
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

export async function getCachedUser(userId: string): Promise<User | null> {
  const cacheKey = `user:${userId}`
  
  // 尝试从缓存获取
  const cached = await redis.get(cacheKey)
  if (cached) {
    return JSON.parse(cached)
  }
  
  // 从数据库查询
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })
  
  if (user) {
    // 缓存结果，过期时间1小时
    await redis.setex(cacheKey, 3600, JSON.stringify(user))
  }
  
  return user
}
```

#### 3. API限流

```typescript
// 实现API限流中间件
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 15分钟内最多100个请求
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
})

// 在API路由中使用
export async function POST(request: Request) {
  // 应用限流
  await limiter(request)
  
  // 处理请求
  // ...
}
```

### 性能监控

#### 1. Web Vitals监控

```typescript
// lib/analytics.ts
export function reportWebVitals(metric: any) {
  // 发送到分析服务
  if (process.env.NODE_ENV === 'production') {
    // Google Analytics
    gtag('event', metric.name, {
      event_category: 'Web Vitals',
      value: Math.round(metric.value),
      event_label: metric.id,
      non_interaction: true,
    })
    
    // 自定义分析
    fetch('/api/analytics/web-vitals', {
      method: 'POST',
      body: JSON.stringify(metric),
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// pages/_app.tsx
export { reportWebVitals }
```

#### 2. 性能预算

```javascript
// next.config.mjs
const nextConfig = {
  experimental: {
    bundlePagesRouterDependencies: true,
  },
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Bundle分析
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
          reportFilename: 'bundle-report.html'
        })
      )
    }
    return config
  }
}
```

---

## 📚 总结

**ZK-Agent** 是一个功能完整、架构清晰、技术先进的AI多智能体协同平台。项目采用现代化的技术栈，遵循严格的开发规范，具备企业级的安全性、可扩展性和可维护性。

### 项目亮点

1. **技术先进性**: 采用Next.js 15、React 18、TypeScript等最新技术
2. **架构合理性**: 清晰的分层架构，模块化设计
3. **功能完整性**: 涵盖对话、CAD分析、海报生成等多个AI应用场景
4. **开发规范性**: 完整的代码规范、测试规范、部署规范
5. **性能优化**: 全面的前后端性能优化策略
6. **安全可靠**: 完善的认证授权、数据安全保护机制

### 技术特色

- 🎯 **多智能体协同**: 统一平台集成多种AI能力
- 🚀 **现代化技术栈**: Next.js + React + TypeScript + Prisma
- 🎨 **优秀的用户体验**: 响应式设计 + 深色模式 + 流畅动画
- 🔒 **企业级安全**: JWT认证 + RBAC权限 + 数据加密
- 📊 **智能分析**: CAD文件解析 + AI驱动的专业分析
- 🎭 **创意设计**: AI海报生成 + 丰富的模板和风格
- 📱 **全端适配**: 桌面端 + 移动端完美体验
- ⚡ **高性能**: 代码分割 + 缓存优化 + 性能监控

### 发展方向

1. **功能扩展**: 增加更多AI智能体类型和应用场景
2. **性能优化**: 持续优化系统性能和用户体验
3. **生态建设**: 构建开放的AI智能体生态系统
4. **国际化**: 支持多语言和国际化部署
5. **移动端**: 开发原生移动应用
6. **企业版**: 提供更多企业级功能和服务

这份文档为项目的开发、维护和扩展提供了全面的指导，是团队协作和知识传承的重要资料。