# 详细系统设计规范

## 目录
1. [系统流程图设计](#1-系统流程图设计)
2. [数据结构设计](#2-数据结构设计)
3. [完整开发规范](#3-完整开发规范)
4. [实施计划](#4-实施计划)

---

## 1. 系统流程图设计

### 1.1 系统整体架构流程图

```mermaid
flowchart TB
    subgraph "用户层"
        WebUI[Web用户界面]
        AdminUI[管理端界面]
    end
    
    subgraph "网关层"
        APIGateway[API网关]
        Auth[认证中间件]
        RateLimit[速率限制]
    end
    
    subgraph "业务服务层"
        ChatService[对话智能体服务]
        CADService[CAD解读服务]
        PosterService[海报设计服务]
        AgentManager[智能体管理器]
        ModelManager[AI模型管理器 - 管理端专用]
    end
    
    subgraph "集成层"
        FastGPTAPI[FastGPT API]
        AliCloudAPI[阿里云千问API]
        SiliconFlowAPI[硅基流动API]
        VoiceAPI[语音识别API]
    end
    
    subgraph "数据层"
        PostgresDB[(PostgreSQL)]
        RedisCache[(Redis缓存)]
        FileStorage[文件存储]
    end
    
    WebUI --> APIGateway
    AdminUI --> APIGateway
    APIGateway --> Auth
    Auth --> RateLimit
    RateLimit --> ChatService
    RateLimit --> CADService
    RateLimit --> PosterService
    RateLimit --> AgentManager
    
    %% 管理端专用连接
    AdminUI -.-> ModelManager
    ModelManager -.-> PostgresDB
    
    ChatService --> FastGPTAPI
    ChatService --> VoiceAPI
    CADService --> AliCloudAPI
    PosterService --> SiliconFlowAPI
    
    AgentManager --> PostgresDB
    ModelManager --> PostgresDB
    ChatService --> RedisCache
    CADService --> FileStorage
    PosterService --> FileStorage
    
    %% 样式说明
    style ModelManager fill:#ff9999,stroke:#ff0000,stroke-width:2px
    style AdminUI fill:#99ccff,stroke:#0066cc,stroke-width:2px
```

### 1.2 用户交互流程图

```mermaid
sequenceDiagram
    participant U as 用户
    participant W as Web界面
    participant G as API网关
    participant A as 智能体服务
    participant F as FastGPT
    participant D as 数据库
    
    U->>W: 访问对话页面
    W->>G: 获取智能体列表
    G->>A: 查询可用智能体
    A->>D: 查询智能体配置
    D-->>A: 返回智能体列表
    A-->>G: 返回智能体数据
    G-->>W: 返回响应
    W-->>U: 显示智能体选择
    
    U->>W: 选择智能体并发送消息
    W->>G: 发送对话请求
    G->>A: 处理对话请求
    A->>F: 调用FastGPT API
    F-->>A: 返回AI响应
    A->>D: 保存对话记录
    A-->>G: 返回响应
    G-->>W: 流式返回数据
    W-->>U: 实时显示回复
```

### 1.3 CAD文件解析流程图

```mermaid
flowchart TD
    A[用户上传CAD文件] --> B{文件类型检测}
    B -->|DWG| C[DWG解析器]
    B -->|STEP| D[STEP解析器]
    B -->|IGES| E[IGES解析器]
    B -->|其他| F[错误提示]
    
    C --> G[提取几何数据]
    D --> G
    E --> G
    
    G --> H[生成3D模型]
    H --> I[AI分析引擎]
    I --> J[生成分析报告]
    J --> K[保存到数据库]
    K --> L[返回结果给用户]
    
    G --> M[生成缩略图]
    M --> N[文件存储]
```

### 1.4 数据流向图

```mermaid
flowchart LR
    subgraph "输入数据"
        UserInput[用户输入]
        FileUpload[文件上传]
        AdminConfig[管理配置]
    end
    
    subgraph "数据处理"
        Validation[数据验证]
        Transform[数据转换]
        Business[业务逻辑]
    end
    
    subgraph "数据存储"
        Cache[缓存层]
        Database[数据库]
        FileStore[文件存储]
    end
    
    subgraph "输出数据"
        APIResponse[API响应]
        UIRender[界面渲染]
        FileDownload[文件下载]
    end
    
    UserInput --> Validation
    FileUpload --> Validation
    AdminConfig --> Validation
    
    Validation --> Transform
    Transform --> Business
    
    Business --> Cache
    Business --> Database
    Business --> FileStore
    
    Cache --> APIResponse
    Database --> APIResponse
    FileStore --> FileDownload
    
    APIResponse --> UIRender
```

---

## 2. 数据结构设计

### 2.1 数据库表结构设计

#### 2.1.1 用户管理表

```sql
-- 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(255) UNIQUE NOT NULL,
    nickname VARCHAR(100),
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- 管理员表
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE,
    role VARCHAR(20) DEFAULT 'admin',
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);
```

#### 2.1.2 AI模型管理表（管理端功能）

```sql
-- AI模型提供商表（管理端管理）
CREATE TABLE ai_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'fastgpt', 'alicloud', 'silicon_flow'
    api_endpoint TEXT NOT NULL,
    api_key_encrypted TEXT,
    config JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active',
    created_by UUID REFERENCES admin_users(id), -- 管理员创建
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI模型表（管理端管理）
CREATE TABLE ai_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES ai_providers(id),
    name VARCHAR(100) NOT NULL,
    model_id VARCHAR(100) NOT NULL,
    description TEXT,
    capabilities JSONB DEFAULT '[]', -- ['chat', 'multimodal', 'voice']
    pricing JSONB DEFAULT '{}',
    max_tokens INTEGER DEFAULT 4096,
    temperature DECIMAL(3,2) DEFAULT 0.7,
    is_available BOOLEAN DEFAULT true,
    created_by UUID REFERENCES admin_users(id), -- 管理员创建
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI模型使用统计表（管理端查看）
CREATE TABLE ai_model_usage_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES ai_models(id),
    date DATE NOT NULL,
    request_count INTEGER DEFAULT 0,
    token_consumption BIGINT DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    avg_response_time_ms INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2.1.3 智能体管理表

```sql
-- 智能体类别表
CREATE TABLE agent_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- 智能体表
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- 'chat', 'cad_analyzer', 'poster_generator'
    category_id UUID REFERENCES agent_categories(id),
    avatar_url TEXT,
    system_prompt TEXT,
    config JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active',
    is_featured BOOLEAN DEFAULT false,
    usage_count BIGINT DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0,
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- FastGPT智能体配置表
CREATE TABLE fastgpt_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    app_id VARCHAR(100) NOT NULL,
    app_key VARCHAR(255) NOT NULL,
    api_endpoint TEXT,
    chat_id VARCHAR(100),
    variables JSONB DEFAULT '{}',
    stream_enabled BOOLEAN DEFAULT true,
    voice_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2.1.4 对话管理表

```sql
-- 对话会话表
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    agent_id UUID REFERENCES agents(id),
    title VARCHAR(200),
    status VARCHAR(20) DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 消息表
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text', -- 'text', 'image', 'audio', 'file'
    metadata JSONB DEFAULT '{}',
    tokens_used INTEGER DEFAULT 0,
    response_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2.1.5 CAD分析表

```sql
-- CAD文件表
CREATE TABLE cad_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    original_filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(20) NOT NULL, -- 'dwg', 'step', 'iges'
    file_size BIGINT NOT NULL,
    file_hash VARCHAR(64) UNIQUE,
    thumbnail_path TEXT,
    status VARCHAR(20) DEFAULT 'processing',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CAD分析结果表
CREATE TABLE cad_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID REFERENCES cad_files(id) ON DELETE CASCADE,
    analysis_type VARCHAR(50) NOT NULL,
    result JSONB NOT NULL,
    confidence_score DECIMAL(5,4),
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.2 TypeScript类型定义

#### 2.2.1 核心数据类型

```typescript
// types/core/index.ts

export interface User {
  id: string;
  deviceId: string;
  nickname?: string;
  avatarUrl?: string;
  preferences: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
  isActive: boolean;
}

export interface AdminUser {
  id: string;
  username: string;
  email?: string;
  role: 'admin' | 'super_admin';
  permissions: string[];
  createdAt: string;
  lastLoginAt?: string;
  isActive: boolean;
}

export interface AIProvider {
  id: string;
  name: string;
  type: 'fastgpt' | 'alicloud' | 'silicon_flow';
  apiEndpoint: string;
  config: Record<string, any>;
  status: 'active' | 'inactive' | 'error';
  createdAt: string;
  updatedAt: string;
}

export interface AIModel {
  id: string;
  providerId: string;
  provider?: AIProvider;
  name: string;
  modelId: string;
  description?: string;
  capabilities: ('chat' | 'multimodal' | 'voice')[];
  pricing: {
    inputTokens?: number;
    outputTokens?: number;
    currency?: string;
  };
  maxTokens: number;
  temperature: number;
  isAvailable: boolean;
  createdAt: string;
}
```

#### 2.2.2 智能体相关类型

```typescript
// types/agents/index.ts

export type AgentType = 'chat' | 'cad_analyzer' | 'poster_generator';
export type AgentStatus = 'active' | 'inactive' | 'maintenance';

export interface AgentCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface BaseAgent {
  id: string;
  name: string;
  description?: string;
  type: AgentType;
  categoryId?: string;
  category?: AgentCategory;
  avatarUrl?: string;
  systemPrompt?: string;
  config: Record<string, any>;
  status: AgentStatus;
  isFeatured: boolean;
  usageCount: number;
  rating: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FastGPTAgentConfig {
  id: string;
  agentId: string;
  appId: string;
  appKey: string;
  apiEndpoint?: string;
  chatId?: string;
  variables: Record<string, any>;
  streamEnabled: boolean;
  voiceEnabled: boolean;
  createdAt: string;
}

export interface ChatAgent extends BaseAgent {
  type: 'chat';
  fastgptConfig?: FastGPTAgentConfig;
}

export interface CADAgent extends BaseAgent {
  type: 'cad_analyzer';
  supportedFormats: string[];
  analysisCapabilities: string[];
}

export interface PosterAgent extends BaseAgent {
  type: 'poster_generator';
  templates: string[];
  styles: string[];
}

export type Agent = ChatAgent | CADAgent | PosterAgent;
```

#### 2.2.3 对话相关类型

```typescript
// types/chat/index.ts

export interface Conversation {
  id: string;
  userId: string;
  agentId: string;
  agent?: Agent;
  title?: string;
  status: 'active' | 'archived' | 'deleted';
  metadata: Record<string, any>;
  messages?: Message[];
  createdAt: string;
  updatedAt: string;
}

export type MessageRole = 'user' | 'assistant' | 'system';
export type ContentType = 'text' | 'image' | 'audio' | 'file';

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  contentType: ContentType;
  metadata: Record<string, any>;
  tokensUsed?: number;
  responseTimeMs?: number;
  createdAt: string;
}

export interface ChatStreamResponse {
  id: string;
  object: 'chat.completion.chunk';
  choices: {
    index: number;
    delta: {
      content?: string;
      role?: MessageRole;
    };
    finish_reason?: 'stop' | 'length' | 'content_filter';
  }[];
}
```

#### 2.2.4 CAD相关类型

```typescript
// types/cad/index.ts

export type CADFileType = 'dwg' | 'step' | 'iges';
export type CADFileStatus = 'uploading' | 'processing' | 'completed' | 'error';

export interface CADFile {
  id: string;
  userId: string;
  originalFilename: string;
  filePath: string;
  fileType: CADFileType;
  fileSize: number;
  fileHash: string;
  thumbnailPath?: string;
  status: CADFileStatus;
  analyses?: CADAnalysis[];
  createdAt: string;
}

export interface CADAnalysis {
  id: string;
  fileId: string;
  analysisType: string;
  result: Record<string, any>;
  confidenceScore?: number;
  processingTimeMs?: number;
  createdAt: string;
}

export interface CADGeometry {
  vertices: number[][];
  faces: number[][];
  normals: number[][];
  bounds: {
    min: [number, number, number];
    max: [number, number, number];
  };
}

export interface CADAnalysisRequest {
  fileId: string;
  analysisTypes: string[];
  options?: Record<string, any>;
}

export interface CADAnalysisResponse {
  fileId: string;
  analyses: CADAnalysis[];
  geometry?: CADGeometry;
  thumbnail?: string;
}
```

### 2.3 API接口设计

#### 2.3.1 RESTful API设计规范

```typescript
// types/api/index.ts

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  category?: string;
  status?: string;
  type?: string;
  tags?: string[];
}

// 智能体相关API接口
export interface AgentListParams extends PaginationParams, FilterParams {
  featured?: boolean;
}

export interface AgentCreateRequest {
  name: string;
  description?: string;
  type: AgentType;
  categoryId?: string;
  avatarUrl?: string;
  systemPrompt?: string;
  config: Record<string, any>;
  fastgptConfig?: Omit<FastGPTAgentConfig, 'id' | 'agentId' | 'createdAt'>;
}

export interface AgentUpdateRequest extends Partial<AgentCreateRequest> {
  status?: AgentStatus;
  isFeatured?: boolean;
}

// 对话相关API接口
export interface ChatInitRequest {
  agentId: string;
  title?: string;
  variables?: Record<string, any>;
}

export interface ChatMessageRequest {
  conversationId: string;
  content: string;
  contentType?: ContentType;
  metadata?: Record<string, any>;
}

export interface ChatStreamRequest extends ChatMessageRequest {
  stream: true;
}
```

#### 2.3.2 API路由设计

```
# 用户端API
GET    /api/ag-ui/agents                    # 获取智能体列表
GET    /api/ag-ui/agents/:id               # 获取智能体详情
POST   /api/ag-ui/init-chat                # 初始化对话
POST   /api/ag-ui/chat/stream              # 流式对话
GET    /api/ag-ui/history                  # 获取对话历史
POST   /api/ag-ui/feedback                 # 提交反馈

# CAD分析API
POST   /api/cad/upload                     # 上传CAD文件
GET    /api/cad/files/:id                  # 获取文件详情
POST   /api/cad/analyze/:id                # 分析CAD文件
GET    /api/cad/analyses/:id               # 获取分析结果

# 海报生成API
POST   /api/poster/generate                # 生成海报
GET    /api/poster/templates               # 获取模板列表
GET    /api/poster/styles                  # 获取样式列表

# 管理端API (需要管理员认证)
POST   /api/admin/auth/login               # 管理员登录
GET    /api/admin/agents                   # 管理智能体
POST   /api/admin/agents                   # 创建智能体
PUT    /api/admin/agents/:id               # 更新智能体
DELETE /api/admin/agents/:id               # 删除智能体

# AI模型管理API (管理端专用)
GET    /api/admin/ai-providers             # 获取AI模型提供商列表
POST   /api/admin/ai-providers             # 创建AI模型提供商
PUT    /api/admin/ai-providers/:id         # 更新AI模型提供商
DELETE /api/admin/ai-providers/:id         # 删除AI模型提供商
GET    /api/admin/ai-models                # 获取AI模型列表
POST   /api/admin/ai-models                # 创建AI模型
PUT    /api/admin/ai-models/:id            # 更新AI模型
DELETE /api/admin/ai-models/:id            # 删除AI模型
GET    /api/admin/ai-models/usage-stats    # 获取AI模型使用统计

GET    /api/admin/analytics                # 数据分析
GET    /api/admin/users                    # 用户管理
GET    /api/admin/system/config            # 系统配置

# 系统API
GET    /api/health                         # 健康检查
GET    /api/system/status                  # 系统状态
```

---

## 3. 完整开发规范

### 3.1 代码规范

#### 3.1.1 TypeScript代码规范

```typescript
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/prefer-const": "error",
    "prefer-const": "error",
    "no-var": "error",
    "object-shorthand": "error",
    "prefer-template": "error"
  }
}

// 命名规范
interface NamingConventions {
  // 1. 文件命名：kebab-case
  // ✅ user-service.ts, chat-interface.tsx
  // ❌ UserService.ts, chatInterface.tsx
  
  // 2. 组件命名：PascalCase
  // ✅ ChatInterface, UserProfile
  // ❌ chatInterface, userProfile
  
  // 3. 变量和函数：camelCase
  // ✅ userName, getUserInfo
  // ❌ user_name, GetUserInfo
  
  // 4. 常量：SCREAMING_SNAKE_CASE
  // ✅ API_ENDPOINT, MAX_RETRY_COUNT
  // ❌ apiEndpoint, maxRetryCount
  
  // 5. 类型和接口：PascalCase
  // ✅ User, UserProfile, APIResponse
  // ❌ user, userProfile, apiResponse
}
```

#### 3.1.2 组件开发规范

```typescript
// components/chat/chat-interface.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { Agent, Message, Conversation } from '@/types/agents';

interface ChatInterfaceProps {
  agent: Agent;
  conversation?: Conversation;
  onMessageSend: (message: string) => Promise<void>;
  onConversationCreate?: (title: string) => Promise<void>;
  className?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  agent,
  conversation,
  onMessageSend,
  onConversationCreate,
  className
}) => {
  // 1. 状态定义
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // 2. 计算属性
  const sortedMessages = useMemo(() => {
    return messages.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [messages]);

  // 3. 事件处理
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim()) return;
    
    setIsLoading(true);
    try {
      await onMessageSend(inputValue);
      setInputValue('');
    } catch (error) {
      console.error('发送消息失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, onMessageSend]);

  // 4. 渲染
  return (
    <div className={`chat-interface ${className || ''}`}>
      {/* 组件内容 */}
    </div>
  );
};

export default ChatInterface;
```

#### 3.1.3 API服务规范

```typescript
// lib/services/agent-service.ts
import { APIResponse, Agent, AgentListParams } from '@/types';
import { apiClient } from '@/lib/api/client';

export class AgentService {
  private static instance: AgentService;
  
  static getInstance(): AgentService {
    if (!AgentService.instance) {
      AgentService.instance = new AgentService();
    }
    return AgentService.instance;
  }

  async getAgents(params: AgentListParams): Promise<APIResponse<Agent[]>> {
    try {
      const response = await apiClient.get('/api/ag-ui/agents', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getAgentById(id: string): Promise<APIResponse<Agent>> {
    try {
      const response = await apiClient.get(`/api/ag-ui/agents/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): Error {
    if (error.response?.data?.error) {
      return new Error(error.response.data.error.message);
    }
    return new Error('网络请求失败');
  }
}

export const agentService = AgentService.getInstance();
```

### 3.2 项目结构规范

```
project-root/
├── app/                          # Next.js 15 App Router
│   ├── (public)/                 # 公开页面组
│   │   ├── page.tsx             # 首页
│   │   ├── chat/                # 对话智能体
│   │   ├── cad-analyzer/        # CAD解读
│   │   └── poster-generator/    # 海报设计
│   ├── admin/                   # 管理端页面
│   │   ├── layout.tsx           # 管理端布局
│   │   ├── login/               # 登录页
│   │   └── dashboard/           # 仪表板
│   └── api/                     # API路由
│       ├── ag-ui/               # 用户端API
│       ├── admin/               # 管理端API
│       └── system/              # 系统API
├── components/                   # 组件库
│   ├── ui/                      # 基础UI组件
│   ├── chat/                    # 对话相关组件
│   ├── cad/                     # CAD相关组件
│   ├── poster/                  # 海报相关组件
│   └── admin/                   # 管理端组件
├── lib/                         # 核心库
│   ├── services/                # 业务服务
│   ├── api/                     # API客户端
│   ├── utils/                   # 工具函数
│   ├── hooks/                   # 自定义Hooks
│   ├── stores/                  # 状态管理
│   └── database/                # 数据库
├── types/                       # 类型定义
│   ├── agents/                  # 智能体类型
│   ├── chat/                    # 对话类型
│   ├── cad/                     # CAD类型
│   └── api/                     # API类型
└── config/                      # 配置文件
    ├── database.ts              # 数据库配置
    ├── ai-providers.ts          # AI提供商配置
    └── constants.ts             # 常量定义
```

### 3.3 Git工作流规范

#### 3.3.1 分支管理策略

```bash
# 主分支
main                 # 生产环境分支，只能通过PR合并
develop              # 开发分支，集成最新功能

# 功能分支
feature/chat-agent          # 对话智能体功能
feature/cad-analyzer        # CAD解读功能
feature/poster-generator    # 海报生成功能
feature/admin-dashboard     # 管理端功能

# 修复分支
hotfix/critical-bug-fix     # 紧急修复分支
bugfix/minor-issue-fix      # 常规修复分支

# 发布分支
release/v1.0.0             # 发布准备分支
```

#### 3.3.2 提交信息规范

```bash
# 提交信息格式
<type>(<scope>): <subject>

<body>

<footer>

# 类型说明
feat:     新功能
fix:      修复bug
docs:     文档更新
style:    代码格式调整
refactor: 重构代码
test:     测试相关
chore:    构建过程或辅助工具的变动

# 示例
feat(chat): 添加语音消息支持

- 集成语音识别API
- 添加语音播放控件
- 实现语音消息存储

Closes #123
```

### 3.4 测试规范

#### 3.4.1 单元测试规范

```typescript
// __tests__/services/agent-service.test.ts
import { AgentService } from '@/lib/services/agent-service';
import { apiClient } from '@/lib/api/client';

jest.mock('@/lib/api/client');

describe('AgentService', () => {
  let agentService: AgentService;
  const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

  beforeEach(() => {
    agentService = AgentService.getInstance();
    jest.clearAllMocks();
  });

  describe('getAgents', () => {
    it('应该返回智能体列表', async () => {
      // Arrange
      const mockAgents = [
        { id: '1', name: '测试智能体', type: 'chat' }
      ];
      mockApiClient.get.mockResolvedValue({
        data: { success: true, data: mockAgents }
      });

      // Act
      const result = await agentService.getAgents({});

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAgents);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/ag-ui/agents',
        { params: {} }
      );
    });

    it('应该处理API错误', async () => {
      // Arrange
      mockApiClient.get.mockRejectedValue(new Error('网络错误'));

      // Act & Assert
      await expect(agentService.getAgents({})).rejects.toThrow('网络错误');
    });
  });
});
```

#### 3.4.2 集成测试规范

```typescript
// __tests__/api/ag-ui/agents.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '@/app/api/ag-ui/agents/route';

describe('/api/ag-ui/agents', () => {
  it('GET 应该返回智能体列表', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });
});
```

### 3.5 部署和运维规范

#### 3.5.1 环境配置

```bash
# .env.production
NODE_ENV=production
NEXT_PUBLIC_API_BASE_URL=https://api.yourapp.com
DATABASE_URL=postgresql://user:pass@host:5432/dbname
REDIS_URL=redis://host:6379
JWT_SECRET=your-secret-key
FASTGPT_API_ENDPOINT=https://api.fastgpt.in
```

#### 3.5.2 Docker配置

```dockerfile
# Dockerfile.prod
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3000
ENV PORT 3000

CMD ["npm", "start"]
```

### 3.6 性能监控规范

#### 3.6.1 性能指标

```typescript
// lib/monitoring/performance.ts
export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
  databaseConnectionPool: number;
}

export class PerformanceMonitor {
  static recordAPIResponse(endpoint: string, duration: number): void {
    // 记录API响应时间
  }

  static recordError(error: Error, context: string): void {
    // 记录错误信息
  }

  static getMetrics(): PerformanceMetrics {
    // 获取当前性能指标
    return {
      responseTime: 0,
      throughput: 0,
      errorRate: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      databaseConnectionPool: 0
    };
  }
}
```

---

## 4. 实施计划

### 4.1 开发阶段划分

#### 阶段一：基础架构搭建（2周）
1. **第1周**：
   - 数据库设计和创建
   - 基础类型定义
   - API路由框架
   - 认证系统

2. **第2周**：
   - 核心服务层实现
   - 基础UI组件库
   - 错误处理机制
   - 日志系统

#### 阶段二：核心功能开发（4周）
1. **第3周**：
   - 智能体管理系统
   - FastGPT集成
   - 基础对话功能

2. **第4周**：
   - CAD文件上传和解析
   - 3D渲染组件
   - 文件存储系统

3. **第5周**：
   - AI分析引擎集成
   - 海报生成功能
   - 模板管理系统

4. **第6周**：
   - 管理端界面
   - 数据分析功能
   - 用户权限管理

#### 阶段三：优化和测试（2周）
1. **第7周**：
   - 性能优化
   - 安全加固
   - 单元测试

2. **第8周**：
   - 集成测试
   - 用户体验优化
   - 文档完善

### 4.2 质量保证流程

```mermaid
flowchart LR
    A[代码开发] --> B[代码审查]
    B --> C[单元测试]
    C --> D[集成测试]
    D --> E[性能测试]
    E --> F[安全测试]
    F --> G[用户验收测试]
    G --> H[生产部署]
    
    B --> I[不通过]
    C --> I
    D --> I
    E --> I
    F --> I
    G --> I
    
    I --> A
```

### 4.3 部署流程

```mermaid
flowchart TB
    A[开发环境] --> B[代码提交]
    B --> C[自动化测试]
    C --> D{测试通过?}
    D -->|是| E[构建Docker镜像]
    D -->|否| F[返回修复]
    F --> A
    
    E --> G[推送到注册表]
    G --> H[部署到测试环境]
    H --> I[集成测试]
    I --> J{测试通过?}
    J -->|是| K[部署到生产环境]
    J -->|否| F
    
    K --> L[健康检查]
    L --> M[监控报警]
```

### 4.4 监控和维护

1. **实时监控**：
   - 应用性能监控
   - 错误日志收集
   - 用户行为分析
   - 系统资源监控

2. **定期维护**：
   - 数据库性能优化
   - 缓存清理
   - 日志归档
   - 安全更新

3. **备份策略**：
   - 数据库每日备份
   - 文件存储同步备份
   - 配置文件版本控制
   - 灾难恢复预案

---

## 总结

本设计规范提供了完整的系统架构、数据结构设计和开发规范，确保项目能够按照高质量标准进行开发和部署。所有团队成员都应严格遵循这些规范，以确保代码质量、系统可靠性和项目的成功交付。 