# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此代码库中工作时提供指导。
注意：所有回复必须使用汉语，禁止使用英语。

## 项目概述

一个生产级的 Next.js 14 多智能体系统，结合了 AI 对话、CAD 分析和海报生成功能。使用 Prisma ORM 配合 PostgreSQL，Redis 缓存管理和云原生部署。

## 架构

**技术栈：**
- **前端：** Next.js 14 App Router, React 18, TypeScript 5.4, TailwindCSS
- **后端：** Next.js API Routes, Prisma ORM, PostgreSQL 14+
- **AI 集成：** AutoGen/CrewAI/LangGraph 的统一适配器
- **基础设施：** Docker, K8s, Redis 6+, 云存储
- **DevOps：** Playwright, Vitest, ESLint, Prettier

## 关键系统

**核心领域：**
- **agents/** - 多框架智能体编排 (AutoGen, CrewAI, LangGraph)
- **poster/** - AI 驱动的海报生成系统
- **cad/** - 带有 AI 见解的 CAD 文件分析引擎
- **chat/** - 跨智能体的统一消息系统
- **database/** - 连接池、缓存、监控
- **auth/** - 基于 JWT 的认证和刷新令牌
- **cache/** - Redis 支持的多级缓存
- **security/** - 自动化扫描和漏洞评估

## 包命令

**开发：**
```bash
npm run dev                    # 启动开发服务器
npm run type-check             # TypeScript 严格检查
npm run lint                   # ESLint 严格规则检查
npm run lint:fix               # 自动修复 lint 问题
npm run clean                  # 清理构建产物
```

**数据库：**
```bash
npm run db:generate            # 生成 Prisma 客户端
npm run db:migrate             # 运行待处理的迁移
npm run db:seed                # 初始化种子数据
npm run db:studio              # 打开 Prisma Studio
npm run db:reset               # 重置数据库并重新种子数据
```

**测试：**
```bash
npm run test                   # 运行所有测试 (Vitest)
npm run test:unit              # 仅运行单元测试
npm run test:watch             # 监视模式测试
npm run test:e2e               # Playwright 端到端测试
npm run test:e2e:ui            # 带 Playwright UI 的端到端测试
```

**生产：**
```bash
npm run build                  # 生产构建
npm run build:production       # 带优化的生产构建
npm run start                  # 启动生产服务器
npm run analyze                # 包分析
```

**质量：**
```bash
npm run security:scan          # 安全漏洞扫描器
npm run quality:check          # 综合质量检查
npm run monitor:all            # 系统监控仪表板
npm run performance:test       # 性能基准测试
```

## 环境设置

**必需的环境变量：**
```bash
# 数据库
DATABASE_URL="postgresql://user:pass@localhost:5432/zk_agent"
REDIS_URL="redis://localhost:6379"

# AI 服务
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-..."
COHERE_API_KEY="..."

# 安全
JWT_SECRET="your-secret-key"
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"

# 存储 (云)
CLOUD_STORAGE_BUCKET="your-bucket"
GOOGLE_APPLICATION_CREDENTIALS="path/to/key.json"
```

**文件结构：**
```
├── app/
│   ├── api/                   # 所有 API 路由
│   ├── auth/                  # 认证页面
│   ├── agents/                # 智能体管理
│   ├── poster/                # 海报生成
│   ├── cad/                   # CAD 文件处理
│   └── admin/                 # 管理员仪表板
├── lib/
│   ├── agents/                # 智能体实现
│   ├── chat/                  # 聊天系统
│   ├── poster/                # 海报生成引擎
│   ├── cad/                   # CAD 分析
│   ├── database/              # 数据库和缓存
│   ├── auth/                  # 认证逻辑
│   ├── security/              # 安全和扫描
│   └── monitoring/            # 系统监控
├── components/
│   ├── ui/                    # 可复用的 UI 组件
│   ├── agents/                # 智能体特定组件
│   ├── poster/                # 海报生成 UI
│   └── cad/                   # CAD 文件接口
├── prisma/
│   └── schema.prisma          # 完整的数据库模式
└── types/                     # TypeScript 类型定义
```

## 开发工作流程

**1. 设置：**
```bash
npm install                    # 安装依赖
npm run db:generate            # 生成 Prisma 客户端
npm run db:migrate             # 运行迁移
npm run db:seed                # 初始化数据
```

**2. 开发：**
```bash
npm run dev                    # 启动开发服务器 (端口 3000)
npm run test:watch             # 并行监视测试
```

**3. 质量门禁：**
```bash
npm run type-check             # 严格的 TypeScript 检查
npm run lint                   # 代码质量检查
npm run test                   # 完整测试套件
npm run security:scan          # 安全验证
```

## 关键文件

- **lib/config/core/manager.ts** - 中心配置系统
- **lib/database/connection.ts** - 数据库连接管理
- **lib/agents/service.ts** - 智能体编排服务
- **lib/middleware/** - 请求管道和错误处理
- **lib/monitoring/** - 系统健康和性能跟踪
- **types/**/*.ts** - 集中类型定义
- **prisma/schema.prisma** - 完整数据库模式

## 数据库模式重点

**核心表：**
- `User` - 带 JWT 刷新令牌的增强用户管理
- `AgentConfig` - 多框架智能体配置
- `PosterStyle/Template` - AI 海报生成配置
- `ChatSession/Message` - 持久化对话系统
- `UsageStats` - 使用跟踪和分析
- `ErrorLog` - 综合错误跟踪

## 智能体集成模式

**AI 框架适配器：**
- **AutoGen 智能体** - 对话驱动的智能体
- **CrewAI 智能体** - 基于角色的多智能体团队
- **LangGraph 智能体** - 面向工作流的智能体
- **统一适配器** - 所有框架的单一接口

**智能体生命周期：**
1. 配置 → 2. 初始化 → 3. 任务处理 → 4. 结果生成 → 5. 清理

两个导致中断的问题个导致执行中断的问题：

    🧠 诊断问题

    问题1: 工具调用限制

    - 工具调用参数过长导致截断
    - Read/Write操作超时

    问题2: 上下文长度限制

    - 响应超过最大token限制
    - 复杂任务被中断

    需要基于现有提示词策略进行优化来针对代码量工作量维度分析超过110k  tokens内容必须拆分成更小的工作任务