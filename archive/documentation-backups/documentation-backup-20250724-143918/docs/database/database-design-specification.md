# ZK-Agent 数据库设计规范

## 概述

本文档详细描述 ZK-Agent 项目的数据库设计规范，包括数据模型设计、关系定义、索引优化、性能调优、数据迁移策略等方面的设计原则和实现细节。

## 1. 数据库架构概览

### 1.1 技术栈

- **数据库**: PostgreSQL 15+
- **ORM**: Prisma 5.x
- **缓存**: Redis 7.x
- **连接池**: PgBouncer
- **监控**: PostgreSQL Stats Collector
- **备份**: pg_dump + AWS S3

### 1.2 数据库架构图

```
ZK-Agent Database Architecture
├── Primary Database (PostgreSQL)
│   ├── Core Schema
│   │   ├── users                    # 用户管理
│   │   ├── teams                    # 团队管理
│   │   ├── team_members             # 团队成员关系
│   │   └── api_keys                 # API密钥管理
│   ├── Multi-Agent Schema
│   │   ├── agents                   # 智能体定义
│   │   ├── agent_teams              # 智能体团队
│   │   ├── agent_team_members       # 智能体团队成员
│   │   ├── research_tasks           # 研究任务
│   │   ├── task_executions          # 任务执行记录
│   │   └── knowledge_base           # 知识库
│   ├── AG-UI Schema
│   │   ├── chat_sessions            # 聊天会话
│   │   ├── chat_messages            # 聊天消息
│   │   ├── cad_analyses             # CAD分析记录
│   │   └── compliance_checks        # 合规检查记录
│   └── System Schema
│       ├── audit_logs               # 审计日志
│       ├── performance_metrics      # 性能指标
│       ├── system_configs           # 系统配置
│       └── migrations               # 数据迁移记录
├── Read Replicas (PostgreSQL)
│   ├── Analytics Replica            # 分析查询专用
│   └── Reporting Replica            # 报表查询专用
└── Cache Layer (Redis)
    ├── Session Cache                # 会话缓存
    ├── Query Cache                  # 查询结果缓存
    ├── Rate Limiting                # 限流计数器
    └── Real-time Data              # 实时数据缓存
```

## 2. 核心数据模型设计

### 2.1 用户管理模块

#### 用户表 (users)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255),
    role user_role NOT NULL DEFAULT 'USER',
    avatar_url TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    preferences JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 枚举类型定义
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN', 'MODERATOR');

-- 索引定义
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_preferences ON users USING GIN(preferences);
```

#### 团队表 (teams)
```sql
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 索引定义
CREATE INDEX idx_teams_owner_id ON teams(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_teams_name ON teams(name) WHERE deleted_at IS NULL;
CREATE INDEX idx_teams_created_at ON teams(created_at);
```

#### 团队成员表 (team_members)
```sql
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role team_member_role NOT NULL DEFAULT 'MEMBER',
    permissions TEXT[] DEFAULT '{}',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    
    UNIQUE(team_id, user_id)
);

-- 枚举类型定义
CREATE TYPE team_member_role AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- 索引定义
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_role ON team_members(role);
```

### 2.2 多智能体系统模块

#### 智能体表 (agents)
```sql
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type agent_type NOT NULL,
    status agent_status DEFAULT 'ACTIVE',
    capabilities TEXT[] DEFAULT '{}',
    model_config JSONB NOT NULL,
    system_prompt TEXT NOT NULL,
    tools JSONB DEFAULT '[]',
    creator_id UUID NOT NULL REFERENCES users(id),
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    performance_metrics JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 枚举类型定义
CREATE TYPE agent_type AS ENUM (
    'RESEARCHER', 'ANALYST', 'WRITER', 'REVIEWER', 
    'COORDINATOR', 'SPECIALIST', 'GENERALIST'
);

CREATE TYPE agent_status AS ENUM (
    'ACTIVE', 'INACTIVE', 'BUSY', 'ERROR', 'MAINTENANCE'
);

-- 索引定义
CREATE INDEX idx_agents_type ON agents(type) WHERE deleted_at IS NULL;
CREATE INDEX idx_agents_status ON agents(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_agents_creator_id ON agents(creator_id);
CREATE INDEX idx_agents_team_id ON agents(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX idx_agents_capabilities ON agents USING GIN(capabilities);
CREATE INDEX idx_agents_model_config ON agents USING GIN(model_config);
```

#### 研究任务表 (research_tasks)
```sql
CREATE TABLE research_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    domain task_domain NOT NULL,
    complexity complexity_level NOT NULL DEFAULT 'MODERATE',
    status task_status NOT NULL DEFAULT 'PENDING',
    priority task_priority NOT NULL DEFAULT 'MEDIUM',
    creator_id UUID NOT NULL REFERENCES users(id),
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    deadline TIMESTAMP WITH TIME ZONE,
    requirements JSONB DEFAULT '[]',
    results JSONB DEFAULT '[]',
    learning_data JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 枚举类型定义
CREATE TYPE task_domain AS ENUM (
    'TECHNOLOGY', 'SCIENCE', 'BUSINESS', 'HEALTHCARE', 
    'EDUCATION', 'FINANCE', 'LEGAL', 'MARKETING'
);

CREATE TYPE complexity_level AS ENUM (
    'SIMPLE', 'MODERATE', 'COMPLEX', 'EXPERT'
);

CREATE TYPE task_status AS ENUM (
    'PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 
    'CANCELLED', 'ON_HOLD'
);

CREATE TYPE task_priority AS ENUM (
    'LOW', 'MEDIUM', 'HIGH', 'URGENT'
);

-- 索引定义
CREATE INDEX idx_research_tasks_status ON research_tasks(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_research_tasks_priority ON research_tasks(priority) WHERE deleted_at IS NULL;
CREATE INDEX idx_research_tasks_domain ON research_tasks(domain) WHERE deleted_at IS NULL;
CREATE INDEX idx_research_tasks_creator_id ON research_tasks(creator_id);
CREATE INDEX idx_research_tasks_team_id ON research_tasks(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX idx_research_tasks_deadline ON research_tasks(deadline) WHERE deadline IS NOT NULL;
CREATE INDEX idx_research_tasks_created_at ON research_tasks(created_at);
CREATE INDEX idx_research_tasks_requirements ON research_tasks USING GIN(requirements);
```

#### 任务执行记录表 (task_executions)
```sql
CREATE TABLE task_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES research_tasks(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    execution_type execution_type NOT NULL,
    status execution_status NOT NULL DEFAULT 'PENDING',
    input_data JSONB,
    output_data JSONB,
    error_details JSONB,
    performance_metrics JSONB DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 枚举类型定义
CREATE TYPE execution_type AS ENUM (
    'RESEARCH', 'ANALYSIS', 'SYNTHESIS', 'REVIEW', 
    'COORDINATION', 'VALIDATION'
);

CREATE TYPE execution_status AS ENUM (
    'PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 
    'CANCELLED', 'TIMEOUT'
);

-- 索引定义
CREATE INDEX idx_task_executions_task_id ON task_executions(task_id);
CREATE INDEX idx_task_executions_agent_id ON task_executions(agent_id);
CREATE INDEX idx_task_executions_status ON task_executions(status);
CREATE INDEX idx_task_executions_type ON task_executions(execution_type);
CREATE INDEX idx_task_executions_started_at ON task_executions(started_at);
CREATE INDEX idx_task_executions_duration ON task_executions(duration_ms) WHERE duration_ms IS NOT NULL;
```

### 2.3 知识库模块

#### 知识条目表 (knowledge_entries)
```sql
CREATE TABLE knowledge_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    type knowledge_type NOT NULL,
    domain task_domain,
    tags TEXT[] DEFAULT '{}',
    source_type source_type NOT NULL,
    source_url TEXT,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    quality_metrics JSONB DEFAULT '{}',
    relationships JSONB DEFAULT '[]',
    access_control JSONB DEFAULT '{}',
    creator_id UUID REFERENCES users(id),
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 枚举类型定义
CREATE TYPE knowledge_type AS ENUM (
    'FACT', 'CONCEPT', 'PROCEDURE', 'PRINCIPLE', 
    'CASE_STUDY', 'BEST_PRACTICE', 'LESSON_LEARNED'
);

CREATE TYPE source_type AS ENUM (
    'ACADEMIC_PAPER', 'WEB_ARTICLE', 'BOOK', 'REPORT', 
    'INTERVIEW', 'EXPERIMENT', 'USER_GENERATED'
);

-- 全文搜索索引
CREATE INDEX idx_knowledge_entries_fts ON knowledge_entries 
USING GIN(to_tsvector('english', title || ' ' || content)) 
WHERE deleted_at IS NULL;

-- 其他索引
CREATE INDEX idx_knowledge_entries_type ON knowledge_entries(type) WHERE deleted_at IS NULL;
CREATE INDEX idx_knowledge_entries_domain ON knowledge_entries(domain) WHERE deleted_at IS NULL;
CREATE INDEX idx_knowledge_entries_tags ON knowledge_entries USING GIN(tags);
CREATE INDEX idx_knowledge_entries_creator_id ON knowledge_entries(creator_id);
CREATE INDEX idx_knowledge_entries_confidence ON knowledge_entries(confidence_score);
```

### 2.4 AG-UI 集成模块

#### 聊天会话表 (chat_sessions)
```sql
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    app_id VARCHAR(100),
    title VARCHAR(200),
    context JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    status session_status DEFAULT 'ACTIVE',
    last_message_at TIMESTAMP WITH TIME ZONE,
    message_count INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    total_cost DECIMAL(10,4) DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE
);

-- 枚举类型定义
CREATE TYPE session_status AS ENUM (
    'ACTIVE', 'ENDED', 'PAUSED', 'ERROR'
);

-- 索引定义
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_app_id ON chat_sessions(app_id) WHERE app_id IS NOT NULL;
CREATE INDEX idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX idx_chat_sessions_last_message_at ON chat_sessions(last_message_at);
CREATE INDEX idx_chat_sessions_created_at ON chat_sessions(created_at);
```

#### 聊天消息表 (chat_messages)
```sql
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role message_role NOT NULL,
    content TEXT NOT NULL,
    content_type content_type DEFAULT 'TEXT',
    attachments JSONB DEFAULT '[]',
    tool_calls JSONB DEFAULT '[]',
    token_count INTEGER,
    cost DECIMAL(8,4),
    response_time_ms INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 枚举类型定义
CREATE TYPE message_role AS ENUM (
    'USER', 'ASSISTANT', 'SYSTEM', 'TOOL'
);

CREATE TYPE content_type AS ENUM (
    'TEXT', 'IMAGE', 'FILE', 'CODE', 'MARKDOWN'
);

-- 索引定义
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_role ON chat_messages(role);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX idx_chat_messages_content_fts ON chat_messages 
USING GIN(to_tsvector('english', content));
```

## 3. 数据关系设计

### 3.1 实体关系图 (ERD)

```mermaid
erDiagram
    users ||--o{ teams : owns
    users ||--o{ team_members : belongs_to
    teams ||--o{ team_members : has
    users ||--o{ agents : creates
    teams ||--o{ agents : contains
    users ||--o{ research_tasks : creates
    teams ||--o{ research_tasks : assigns
    research_tasks ||--o{ task_executions : has
    agents ||--o{ task_executions : executes
    users ||--o{ knowledge_entries : creates
    teams ||--o{ knowledge_entries : owns
    users ||--o{ chat_sessions : has
    chat_sessions ||--o{ chat_messages : contains
    users ||--o{ api_keys : owns
    
    users {
        uuid id PK
        string email UK
        string name
        string password_hash
        enum role
        timestamp created_at
    }
    
    teams {
        uuid id PK
        string name
        uuid owner_id FK
        jsonb settings
        timestamp created_at
    }
    
    agents {
        uuid id PK
        string name
        enum type
        enum status
        uuid creator_id FK
        uuid team_id FK
        jsonb model_config
        timestamp created_at
    }
    
    research_tasks {
        uuid id PK
        string title
        enum domain
        enum status
        uuid creator_id FK
        uuid team_id FK
        timestamp created_at
    }
```

### 3.2 关系约束设计

#### 外键约束
```sql
-- 用户相关约束
ALTER TABLE teams ADD CONSTRAINT fk_teams_owner 
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE team_members ADD CONSTRAINT fk_team_members_team 
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

ALTER TABLE team_members ADD CONSTRAINT fk_team_members_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 智能体相关约束
ALTER TABLE agents ADD CONSTRAINT fk_agents_creator 
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE agents ADD CONSTRAINT fk_agents_team 
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;

-- 任务相关约束
ALTER TABLE research_tasks ADD CONSTRAINT fk_research_tasks_creator 
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE task_executions ADD CONSTRAINT fk_task_executions_task 
    FOREIGN KEY (task_id) REFERENCES research_tasks(id) ON DELETE CASCADE;

ALTER TABLE task_executions ADD CONSTRAINT fk_task_executions_agent 
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;
```

#### 检查约束
```sql
-- 用户邮箱格式检查
ALTER TABLE users ADD CONSTRAINT chk_users_email_format 
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- 任务截止时间检查
ALTER TABLE research_tasks ADD CONSTRAINT chk_research_tasks_deadline 
    CHECK (deadline IS NULL OR deadline > created_at);

-- 执行时间检查
ALTER TABLE task_executions ADD CONSTRAINT chk_task_executions_time 
    CHECK (completed_at IS NULL OR completed_at >= started_at);

-- 置信度分数检查
ALTER TABLE knowledge_entries ADD CONSTRAINT chk_knowledge_confidence 
    CHECK (confidence_score >= 0 AND confidence_score <= 1);
```

## 4. 索引优化策略

### 4.1 查询模式分析

#### 常见查询模式
```sql
-- 1. 用户相关查询
-- 按邮箱查找用户（登录）
SELECT * FROM users WHERE email = ? AND deleted_at IS NULL;

-- 获取用户的团队列表
SELECT t.* FROM teams t 
JOIN team_members tm ON t.id = tm.team_id 
WHERE tm.user_id = ? AND tm.left_at IS NULL;

-- 2. 任务相关查询
-- 获取用户的任务列表（分页）
SELECT * FROM research_tasks 
WHERE creator_id = ? AND deleted_at IS NULL 
ORDER BY created_at DESC 
LIMIT ? OFFSET ?;

-- 按状态和优先级查询任务
SELECT * FROM research_tasks 
WHERE status = ? AND priority = ? AND deleted_at IS NULL;

-- 3. 智能体相关查询
-- 获取可用的智能体
SELECT * FROM agents 
WHERE status = 'ACTIVE' AND type = ? AND deleted_at IS NULL;

-- 获取智能体的执行历史
SELECT * FROM task_executions 
WHERE agent_id = ? 
ORDER BY started_at DESC;

-- 4. 知识库查询
-- 全文搜索
SELECT * FROM knowledge_entries 
WHERE to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', ?) 
AND deleted_at IS NULL;

-- 按标签查询
SELECT * FROM knowledge_entries 
WHERE tags && ARRAY[?] AND deleted_at IS NULL;
```

### 4.2 复合索引设计

```sql
-- 用户查询优化
CREATE INDEX idx_users_email_deleted ON users(email, deleted_at);
CREATE INDEX idx_users_role_created ON users(role, created_at) WHERE deleted_at IS NULL;

-- 团队成员查询优化
CREATE INDEX idx_team_members_user_left ON team_members(user_id, left_at);
CREATE INDEX idx_team_members_team_role ON team_members(team_id, role);

-- 任务查询优化
CREATE INDEX idx_research_tasks_creator_status ON research_tasks(creator_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_research_tasks_status_priority ON research_tasks(status, priority) WHERE deleted_at IS NULL;
CREATE INDEX idx_research_tasks_domain_created ON research_tasks(domain, created_at) WHERE deleted_at IS NULL;

-- 智能体查询优化
CREATE INDEX idx_agents_status_type ON agents(status, type) WHERE deleted_at IS NULL;
CREATE INDEX idx_agents_team_status ON agents(team_id, status) WHERE team_id IS NOT NULL AND deleted_at IS NULL;

-- 执行记录查询优化
CREATE INDEX idx_task_executions_agent_started ON task_executions(agent_id, started_at);
CREATE INDEX idx_task_executions_task_status ON task_executions(task_id, status);
CREATE INDEX idx_task_executions_status_started ON task_executions(status, started_at);

-- 聊天相关优化
CREATE INDEX idx_chat_sessions_user_last_message ON chat_sessions(user_id, last_message_at);
CREATE INDEX idx_chat_messages_session_created ON chat_messages(session_id, created_at);
```

### 4.3 分区表设计

#### 按时间分区的表
```sql
-- 审计日志分区表
CREATE TABLE audit_logs (
    id UUID DEFAULT gen_random_uuid(),
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- 创建月度分区
CREATE TABLE audit_logs_2024_01 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE audit_logs_2024_02 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- 性能指标分区表
CREATE TABLE performance_metrics (
    id UUID DEFAULT gen_random_uuid(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    tags JSONB DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) PARTITION BY RANGE (recorded_at);

-- 创建日分区
CREATE TABLE performance_metrics_2024_01_01 PARTITION OF performance_metrics
    FOR VALUES FROM ('2024-01-01') TO ('2024-01-02');
```

## 5. 性能优化策略

### 5.1 查询优化

#### 查询重写示例
```sql
-- 优化前：N+1 查询问题
-- 获取用户及其团队信息
SELECT * FROM users WHERE id = ?;
-- 然后为每个用户执行：
SELECT * FROM teams WHERE owner_id = ?;

-- 优化后：使用 JOIN
SELECT 
    u.*,
    t.id as team_id,
    t.name as team_name,
    t.created_at as team_created_at
FROM users u
LEFT JOIN teams t ON u.id = t.owner_id
WHERE u.id = ? AND u.deleted_at IS NULL;

-- 优化前：子查询
SELECT * FROM research_tasks 
WHERE creator_id IN (
    SELECT user_id FROM team_members WHERE team_id = ?
);

-- 优化后：使用 EXISTS
SELECT rt.* FROM research_tasks rt
WHERE EXISTS (
    SELECT 1 FROM team_members tm 
    WHERE tm.user_id = rt.creator_id AND tm.team_id = ?
) AND rt.deleted_at IS NULL;
```

#### 分页优化
```sql
-- 优化前：OFFSET 分页（性能随页数增加而下降）
SELECT * FROM research_tasks 
ORDER BY created_at DESC 
LIMIT 20 OFFSET 1000;

-- 优化后：游标分页
SELECT * FROM research_tasks 
WHERE created_at < ? 
ORDER BY created_at DESC 
LIMIT 20;

-- 或使用 ID 游标
SELECT * FROM research_tasks 
WHERE id > ? 
ORDER BY id 
LIMIT 20;
```

### 5.2 连接池配置

```typescript
// lib/database/connection.ts
import { PrismaClient } from '@prisma/client';

// 生产环境连接池配置
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
  ],
});

// 查询性能监控
prisma.$on('query', (e) => {
  if (e.duration > 1000) { // 超过1秒的慢查询
    console.warn('Slow query detected:', {
      query: e.query,
      duration: e.duration,
      params: e.params,
    });
  }
});

// 连接池配置（通过环境变量）
// DATABASE_URL="postgresql://user:password@localhost:5432/zkagent?connection_limit=20&pool_timeout=20"

export { prisma };
```

### 5.3 读写分离

```typescript
// lib/database/read-replica.ts
import { PrismaClient } from '@prisma/client';

// 主数据库（写操作）
export const primaryDB = new PrismaClient({
  datasources: {
    db: {
      url: process.env.PRIMARY_DATABASE_URL,
    },
  },
});

// 只读副本（读操作）
export const replicaDB = new PrismaClient({
  datasources: {
    db: {
      url: process.env.REPLICA_DATABASE_URL,
    },
  },
});

// 数据库路由器
export class DatabaseRouter {
  static async read<T>(operation: (db: PrismaClient) => Promise<T>): Promise<T> {
    try {
      return await operation(replicaDB);
    } catch (error) {
      console.warn('Replica read failed, falling back to primary:', error);
      return await operation(primaryDB);
    }
  }
  
  static async write<T>(operation: (db: PrismaClient) => Promise<T>): Promise<T> {
    return await operation(primaryDB);
  }
  
  static async transaction<T>(
    operations: (db: PrismaClient) => Promise<T>
  ): Promise<T> {
    return await primaryDB.$transaction(async (tx) => {
      return await operations(tx as PrismaClient);
    });
  }
}

// 使用示例
// 读操作使用副本
const users = await DatabaseRouter.read(db => 
  db.user.findMany({ where: { deleted_at: null } })
);

// 写操作使用主库
const newUser = await DatabaseRouter.write(db => 
  db.user.create({ data: userData })
);
```

## 6. 缓存策略

### 6.1 Redis 缓存设计

```typescript
// lib/cache/redis-client.ts
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

// 缓存键命名规范
export class CacheKeys {
  static user(id: string): string {
    return `user:${id}`;
  }
  
  static userTeams(userId: string): string {
    return `user:${userId}:teams`;
  }
  
  static agentsByTeam(teamId: string): string {
    return `team:${teamId}:agents`;
  }
  
  static tasksByUser(userId: string, page: number): string {
    return `user:${userId}:tasks:page:${page}`;
  }
  
  static knowledgeSearch(query: string, domain?: string): string {
    const domainSuffix = domain ? `:${domain}` : '';
    return `knowledge:search:${Buffer.from(query).toString('base64')}${domainSuffix}`;
  }
}

// 缓存管理器
export class CacheManager {
  private static readonly DEFAULT_TTL = 300; // 5分钟
  
  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }
  
  static async set<T>(
    key: string, 
    value: T, 
    ttl: number = this.DEFAULT_TTL
  ): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }
  
  static async del(key: string | string[]): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }
  
  static async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache pattern invalidation error:', error);
    }
  }
  
  // 缓存穿透保护
  static async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    const value = await fetcher();
    await this.set(key, value, ttl);
    return value;
  }
}

export { redis };
```

### 6.2 缓存失效策略

```typescript
// lib/cache/invalidation.ts
export class CacheInvalidation {
  // 用户相关缓存失效
  static async invalidateUser(userId: string): Promise<void> {
    await Promise.all([
      CacheManager.del(CacheKeys.user(userId)),
      CacheManager.del(CacheKeys.userTeams(userId)),
      CacheManager.invalidatePattern(`user:${userId}:*`),
    ]);
  }
  
  // 团队相关缓存失效
  static async invalidateTeam(teamId: string): Promise<void> {
    await Promise.all([
      CacheManager.invalidatePattern(`team:${teamId}:*`),
      CacheManager.invalidatePattern(`user:*:teams`), // 所有用户的团队列表
    ]);
  }
  
  // 任务相关缓存失效
  static async invalidateTask(taskId: string, creatorId: string): Promise<void> {
    await Promise.all([
      CacheManager.invalidatePattern(`user:${creatorId}:tasks:*`),
      CacheManager.invalidatePattern(`task:${taskId}:*`),
    ]);
  }
  
  // 知识库搜索缓存失效
  static async invalidateKnowledgeSearch(): Promise<void> {
    await CacheManager.invalidatePattern('knowledge:search:*');
  }
}
```

## 7. 数据迁移策略

### 7.1 Prisma 迁移管理

```typescript
// prisma/migrations/migration-utils.ts
import { PrismaClient } from '@prisma/client';

export class MigrationUtils {
  private prisma: PrismaClient;
  
  constructor() {
    this.prisma = new PrismaClient();
  }
  
  // 安全的列添加
  async addColumnSafely(
    tableName: string,
    columnName: string,
    columnType: string,
    defaultValue?: any
  ): Promise<void> {
    const columnExists = await this.checkColumnExists(tableName, columnName);
    
    if (!columnExists) {
      const sql = `
        ALTER TABLE ${tableName} 
        ADD COLUMN ${columnName} ${columnType}
        ${defaultValue !== undefined ? `DEFAULT ${defaultValue}` : ''};
      `;
      
      await this.prisma.$executeRawUnsafe(sql);
      console.log(`Added column ${columnName} to ${tableName}`);
    } else {
      console.log(`Column ${columnName} already exists in ${tableName}`);
    }
  }
  
  // 检查列是否存在
  private async checkColumnExists(
    tableName: string, 
    columnName: string
  ): Promise<boolean> {
    const result = await this.prisma.$queryRawUnsafe(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = $1 AND column_name = $2;
    `, tableName, columnName);
    
    return Array.isArray(result) && result.length > 0;
  }
  
  // 批量数据迁移
  async batchMigration<T>(
    query: string,
    processor: (batch: T[]) => Promise<void>,
    batchSize: number = 1000
  ): Promise<void> {
    let offset = 0;
    let hasMore = true;
    
    while (hasMore) {
      const batch = await this.prisma.$queryRawUnsafe<T[]>(
        `${query} LIMIT ${batchSize} OFFSET ${offset}`
      );
      
      if (batch.length === 0) {
        hasMore = false;
        break;
      }
      
      await processor(batch);
      offset += batchSize;
      
      console.log(`Processed ${offset} records`);
    }
  }
}
```

### 7.2 数据迁移脚本示例

```sql
-- 20240101000000_add_agent_performance_metrics.sql
-- 为智能体表添加性能指标字段

BEGIN;

-- 添加新列
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS performance_metrics JSONB DEFAULT '{}';

-- 创建索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_performance 
ON agents USING GIN(performance_metrics);

-- 初始化现有记录的性能指标
UPDATE agents 
SET performance_metrics = '{
  "total_executions": 0,
  "success_rate": 0.0,
  "average_response_time": 0,
  "last_execution_at": null
}'
WHERE performance_metrics = '{}';

COMMIT;
```

```typescript
// scripts/migrate-knowledge-entries.ts
import { PrismaClient } from '@prisma/client';
import { MigrationUtils } from '../prisma/migrations/migration-utils';

const prisma = new PrismaClient();
const migrationUtils = new MigrationUtils();

async function migrateKnowledgeEntries() {
  console.log('Starting knowledge entries migration...');
  
  // 批量处理知识条目，添加置信度分数
  await migrationUtils.batchMigration(
    'SELECT * FROM knowledge_entries WHERE confidence_score IS NULL',
    async (batch) => {
      const updates = batch.map(entry => {
        // 根据来源类型计算初始置信度
        let confidence = 0.5; // 默认值
        
        switch (entry.source_type) {
          case 'ACADEMIC_PAPER':
            confidence = 0.9;
            break;
          case 'BOOK':
          case 'REPORT':
            confidence = 0.8;
            break;
          case 'WEB_ARTICLE':
            confidence = 0.6;
            break;
          case 'USER_GENERATED':
            confidence = 0.4;
            break;
        }
        
        return prisma.knowledge_entries.update({
          where: { id: entry.id },
          data: { confidence_score: confidence },
        });
      });
      
      await Promise.all(updates);
    },
    500 // 每批处理500条记录
  );
  
  console.log('Knowledge entries migration completed');
}

if (require.main === module) {
  migrateKnowledgeEntries()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
```

## 8. 备份和恢复策略

### 8.1 自动备份脚本

```bash
#!/bin/bash
# scripts/backup-database.sh

set -e

# 配置
DB_NAME="zkagent"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"
BACKUP_DIR="/var/backups/postgresql"
S3_BUCKET="zkagent-backups"
RETENTION_DAYS=30

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 生成备份文件名
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${DB_NAME}_${TIMESTAMP}.sql.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

echo "Starting database backup: $BACKUP_FILE"

# 执行备份
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --verbose --clean --no-owner --no-privileges \
  | gzip > "$BACKUP_PATH"

echo "Backup completed: $BACKUP_PATH"

# 上传到 S3
if command -v aws &> /dev/null; then
  echo "Uploading backup to S3..."
  aws s3 cp "$BACKUP_PATH" "s3://${S3_BUCKET}/daily/"
  echo "Upload completed"
fi

# 清理本地旧备份
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup process completed successfully"
```

### 8.2 恢复脚本

```bash
#!/bin/bash
# scripts/restore-database.sh

set -e

if [ $# -ne 1 ]; then
  echo "Usage: $0 <backup_file>"
  echo "Example: $0 zkagent_20240101_120000.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"
DB_NAME="zkagent"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"

echo "WARNING: This will completely replace the current database!"
read -p "Are you sure you want to continue? (yes/no): " -r
if [[ ! $REPLY =~ ^yes$ ]]; then
  echo "Restore cancelled"
  exit 1
fi

echo "Starting database restore from: $BACKUP_FILE"

# 终止所有连接到目标数据库的会话
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "
  SELECT pg_terminate_backend(pid) 
  FROM pg_stat_activity 
  WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();
"

# 删除并重建数据库
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"

# 恢复数据
if [[ "$BACKUP_FILE" == *.gz ]]; then
  gunzip -c "$BACKUP_FILE" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"
else
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE"
fi

echo "Database restore completed successfully"
echo "Please run 'npx prisma db push' to ensure schema is up to date"
```

## 9. 监控和维护

### 9.1 数据库监控

```sql
-- 创建监控视图
CREATE OR REPLACE VIEW db_performance_summary AS
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_live_tup as live_tuples,
  n_dead_tup as dead_tuples,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

-- 慢查询监控
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows,
  100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
WHERE mean_time > 1000 -- 超过1秒的查询
ORDER BY mean_time DESC;

-- 索引使用情况
CREATE OR REPLACE VIEW index_usage AS
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_tup_read,
  idx_tup_fetch,
  idx_scan,
  CASE 
    WHEN idx_scan = 0 THEN 'Unused'
    WHEN idx_scan < 10 THEN 'Low Usage'
    ELSE 'Active'
  END as usage_status
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;
```

### 9.2 自动维护任务

```typescript
// lib/database/maintenance.ts
import { PrismaClient } from '@prisma/client';
import { CacheManager } from '../cache/redis-client';

const prisma = new PrismaClient();

export class DatabaseMaintenance {
  // 清理软删除的记录
  static async cleanupSoftDeleted(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // 30天前
    
    const tables = [
      'users',
      'teams', 
      'agents',
      'research_tasks',
      'knowledge_entries'
    ];
    
    for (const table of tables) {
      const result = await prisma.$executeRawUnsafe(`
        DELETE FROM ${table} 
        WHERE deleted_at IS NOT NULL 
        AND deleted_at < $1
      `, cutoffDate);
      
      console.log(`Cleaned up ${result} records from ${table}`);
    }
  }
  
  // 清理过期的会话
  static async cleanupExpiredSessions(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7); // 7天前
    
    const result = await prisma.chat_sessions.deleteMany({
      where: {
        status: 'ENDED',
        ended_at: {
          lt: cutoffDate,
        },
      },
    });
    
    console.log(`Cleaned up ${result.count} expired chat sessions`);
  }
  
  // 更新统计信息
  static async updateStatistics(): Promise<void> {
    await prisma.$executeRaw`ANALYZE;`;
    console.log('Database statistics updated');
  }
  
  // 清理缓存
  static async cleanupCache(): Promise<void> {
    // 清理过期的搜索缓存
    await CacheManager.invalidatePattern('knowledge:search:*');
    
    // 清理过期的用户缓存
    await CacheManager.invalidatePattern('user:*:tasks:*');
    
    console.log('Cache cleanup completed');
  }
  
  // 执行完整维护
  static async runMaintenance(): Promise<void> {
    console.log('Starting database maintenance...');
    
    try {
      await this.cleanupSoftDeleted();
      await this.cleanupExpiredSessions();
      await this.updateStatistics();
      await this.cleanupCache();
      
      console.log('Database maintenance completed successfully');
    } catch (error) {
      console.error('Database maintenance failed:', error);
      throw error;
    }
  }
}

// 定时任务
if (process.env.NODE_ENV === 'production') {
  // 每天凌晨2点执行维护
  setInterval(async () => {
    const now = new Date();
    if (now.getHours() === 2 && now.getMinutes() === 0) {
      await DatabaseMaintenance.runMaintenance();
    }
  }, 60000); // 每分钟检查一次
}
```

## 10. 安全规范

### 10.1 数据加密

```sql
-- 启用行级安全
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_tasks ENABLE ROW LEVEL SECURITY;

-- 用户只能访问自己的数据
CREATE POLICY user_isolation ON users
  FOR ALL TO authenticated_user
  USING (id = current_setting('app.current_user_id')::uuid);

-- 团队成员只能访问所属团队的数据
CREATE POLICY team_member_access ON research_tasks
  FOR ALL TO authenticated_user
  USING (
    creator_id = current_setting('app.current_user_id')::uuid
    OR team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = current_setting('app.current_user_id')::uuid
      AND left_at IS NULL
    )
  );
```

### 10.2 敏感数据处理

```typescript
// lib/security/encryption.ts
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;
const ALGORITHM = 'aes-256-gcm';

export class DataEncryption {
  static encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
    cipher.setAAD(Buffer.from('zkagent', 'utf8'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }
  
  static decrypt(encryptedText: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
    decipher.setAAD(Buffer.from('zkagent', 'utf8'));
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

// 敏感字段处理
export class SensitiveDataHandler {
  // API密钥脱敏
  static maskApiKey(apiKey: string): string {
    if (apiKey.length <= 8) return '*'.repeat(apiKey.length);
    return apiKey.substring(0, 4) + '*'.repeat(apiKey.length - 8) + apiKey.substring(apiKey.length - 4);
  }
  
  // 邮箱脱敏
  static maskEmail(email: string): string {
    const [username, domain] = email.split('@');
    if (username.length <= 2) return '*'.repeat(username.length) + '@' + domain;
    return username.substring(0, 2) + '*'.repeat(username.length - 2) + '@' + domain;
  }
  
  // 清理日志中的敏感信息
  static sanitizeLogData(data: any): any {
    const sensitiveFields = ['password', 'apiKey', 'token', 'secret'];
    
    if (typeof data !== 'object' || data === null) {
      return data;
    }
    
    const sanitized = { ...data };
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
}
```

---

本文档将随着项目发展持续更新，确保数据库设计始终符合最佳实践和业务需求。