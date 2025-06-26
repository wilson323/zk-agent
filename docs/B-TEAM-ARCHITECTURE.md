# B团队后端架构文档

## 🎯 核心职责与性能约束

### 核心职责
- **后端API开发**: 高性能、可扩展的API服务
- **AI服务集成**: FastGPT、千问、硅基流动的标准化适配器
- **数据库管理**: 强制事务、查询优化、连接池管理
- **系统架构**: 高可用、低延迟、资源优化

### 性能约束
- ⚡ **API响应时间**: ≤500ms
- 🚀 **并发处理能力**: ≥1000 QPS
- 💾 **数据库查询**: ≤100ms
- 🔄 **高可用性**: 99.9%+ 可用性
- 📊 **资源优化**: 最低资源使用

## 🏗️ 系统架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                    B团队后端架构                              │
├─────────────────────────────────────────────────────────────┤
│  🌐 API Layer                                               │
│  ├── Performance Monitor (≤500ms)                          │
│  ├── Rate Limiting (≥1000 QPS)                             │
│  └── Error Handling & Logging                              │
├─────────────────────────────────────────────────────────────┤
│  🤖 AI Integration Layer                                    │
│  ├── Unified AI Adapter                                    │
│  ├── Circuit Breaker Pattern                               │
│  ├── Load Balancing                                        │
│  └── Failover Management                                   │
├─────────────────────────────────────────────────────────────┤
│  💾 Database Layer                                          │
│  ├── Enhanced Database Manager                             │
│  ├── Connection Pool (≤100ms)                              │
│  ├── Query Optimization                                    │
│  └── Transaction Management                                │
├─────────────────────────────────────────────────────────────┤
│  📊 Monitoring & HA Layer                                   │
│  ├── High Availability Manager                             │
│  ├── Resource Optimization                                 │
│  ├── Health Checks                                         │
│  └── System Monitoring                                     │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 核心组件详解

### 1. 性能监控中间件 (`lib/middleware/performance-monitor.ts`)

**功能特性:**
- ⏱️ 实时API响应时间监控
- 📈 QPS计数和限流
- 🚨 性能阈值告警
- 📊 详细性能指标收集

**使用方法:**
```typescript
import { withPerformanceMonitoring } from '@/lib/middleware/performance-monitor';

export const GET = withPerformanceMonitoring(async (request) => {
  // 你的API逻辑
  return NextResponse.json({ data: 'response' });
});
```

**性能指标:**
- API响应时间: ≤500ms
- QPS限制: ≥1000
- 内存使用监控
- CPU使用监控

### 2. 统一AI适配器 (`lib/ai/unified-ai-adapter.ts`)

**支持的AI服务:**
- 🤖 **FastGPT**: GPT系列模型
- 🧠 **千问**: 阿里云通义千问
- ⚡ **硅基流动**: DeepSeek等模型

**核心特性:**
- 🔄 统一接口标准
- 🛡️ 熔断器模式
- ⚖️ 智能负载均衡
- 🔀 自动故障转移

**使用示例:**
```typescript
import { unifiedAIAdapter, AIProvider } from '@/lib/ai/unified-ai-adapter';

// 单一服务调用
const response = await unifiedAIAdapter.call(AIProvider.FASTGPT, {
  messages: [{ role: 'user', content: '你好' }],
  temperature: 0.7,
  maxTokens: 1000,
});

// 智能负载均衡调用
const optimalProvider = await getOptimalAIProvider();
const response = await unifiedAIAdapter.call(optimalProvider, request);
```

### 3. 增强数据库管理器 (`lib/database/enhanced-database-manager.ts`)

**核心功能:**
- 🔒 强制事务管理
- ⚡ 查询性能优化 (≤100ms)
- 🏊 连接池管理
- 💾 智能查询缓存

**事务使用:**
```typescript
import { executeTransaction } from '@/lib/database/enhanced-database-manager';

const result = await executeTransaction(async (prisma) => {
  const user = await prisma.user.create({ data: userData });
  const profile = await prisma.profile.create({ 
    data: { ...profileData, userId: user.id } 
  });
  return { user, profile };
});
```

**缓存查询:**
```typescript
import { executeQuery } from '@/lib/database/enhanced-database-manager';

const users = await executeQuery(
  () => prisma.user.findMany(),
  'users:all', // 缓存键
  300000 // 5分钟TTL
);
```

### 4. 高可用管理器 (`lib/system/high-availability-manager.ts`)

**高可用特性:**
- 🏥 实时健康检查
- 🔄 自动故障转移
- 📊 资源使用优化
- ⚖️ 智能负载均衡

**系统监控:**
```typescript
import { getSystemStatus } from '@/lib/system/high-availability-manager';

const status = await getSystemStatus();
console.log('系统状态:', status);
```

### 5. Mock数据服务 (`lib/mocks/enhanced-mock-service.ts`)

**Mock数据类型:**
- 👥 用户数据 (50个用户)
- 📁 CAD文件数据 (30个文件)
- 💬 聊天消息 (100条消息)
- 🤖 AI模型数据 (5个模型)
- 🎨 海报数据 (20个海报)

**使用示例:**
```typescript
import { getMockUsers, getMockCADFiles } from '@/lib/mocks/enhanced-mock-service';

// 获取分页用户数据
const users = getMockUsers(1, 10, { role: 'admin' });

// 获取CAD文件数据
const cadFiles = getMockCADFiles(1, 5);
```

## 🚀 快速开始

### 1. 系统初始化

```typescript
import { initializeSystem } from '@/lib/system/system-initializer';

// 在应用启动时调用
await initializeSystem();
```

### 2. 环境配置

创建 `.env.local` 文件:

```env
# 数据库配置
DATABASE_URL="postgresql://user:password@localhost:5432/database"

# AI服务配置
FASTGPT_API_URL="https://api.fastgpt.com"
FASTGPT_API_KEY="your-fastgpt-key"

QWEN_BASE_URL="https://dashscope.aliyuncs.com"
QWEN_API_KEY="your-qwen-key"

SILICONFLOW_BASE_URL="https://api.siliconflow.cn"
SILICONFLOW_API_KEY="your-siliconflow-key"

# 开发环境Mock数据
ENABLE_MOCKS="true"
```

### 3. API端点示例

```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withPerformanceMonitoring } from '@/lib/middleware/performance-monitor';
import { executeQuery } from '@/lib/database/enhanced-database-manager';
import { getOptimalAIProvider, unifiedAIAdapter } from '@/lib/ai/unified-ai-adapter';

export const GET = withPerformanceMonitoring(async (request: NextRequest) => {
  try {
    // 数据库查询（带缓存）
    const data = await executeQuery(
      () => prisma.example.findMany(),
      'example:all',
      300000
    );

    // AI服务调用（智能负载均衡）
    const aiProvider = await getOptimalAIProvider();
    const aiResponse = await unifiedAIAdapter.call(aiProvider, {
      messages: [{ role: 'user', content: 'Process this data' }],
    });

    return NextResponse.json({
      success: true,
      data,
      aiResponse: aiResponse.data,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
```

## 📊 监控和告警

### 系统监控API

```bash
# 系统概览
GET /api/admin/system-monitor?type=overview

# 性能指标
GET /api/admin/system-monitor?type=performance

# 健康检查
GET /api/admin/system-monitor?type=health

# 数据库指标
GET /api/admin/system-monitor?type=database

# AI服务指标
GET /api/admin/system-monitor?type=ai

# 资源使用
GET /api/admin/system-monitor?type=resources
```

### 告警阈值

| 指标 | 阈值 | 动作 |
|------|------|------|
| API响应时间 | >500ms | 发送告警 |
| QPS | >1000 | 启用限流 |
| 数据库查询 | >100ms | 记录慢查询 |
| 内存使用 | >85% | 触发GC |
| CPU使用 | >80% | 资源优化 |

## 🔧 开发规范

### 1. 代码规范
- ✅ 使用TypeScript严格模式
- ✅ 遵循ESLint和Prettier配置
- ✅ 所有函数必须有类型注解
- ✅ 错误处理必须完整

### 2. 性能规范
- ⚡ API响应时间必须≤500ms
- 💾 数据库查询必须≤100ms
- 🔄 必须使用事务处理数据修改
- 📊 必须添加性能监控

### 3. 协作规范
- 📝 接口变更提前3天通知
- 🧪 提供完整Mock数据
- 📋 API文档必须及时更新
- 🔍 代码审查必须通过

## 🚨 故障处理

### 常见问题排查

1. **API响应慢**
   ```bash
   # 检查性能指标
   curl /api/admin/system-monitor?type=performance
   
   # 检查数据库
   curl /api/admin/system-monitor?type=database
   ```

2. **AI服务不可用**
   ```bash
   # 检查AI服务状态
   curl /api/admin/system-monitor?type=ai
   
   # 重置熔断器
   # 在代码中调用 unifiedAIAdapter.resetCircuitBreaker(provider)
   ```

3. **数据库连接问题**
   ```bash
   # 检查数据库健康
   curl /api/admin/system-monitor?type=database
   
   # 检查连接池状态
   # 查看 connectionPool 字段
   ```

## 📈 性能优化建议

### 1. API优化
- 使用响应缓存
- 实现请求去重
- 优化序列化性能
- 减少不必要的数据传输

### 2. 数据库优化
- 添加适当索引
- 使用查询缓存
- 优化复杂查询
- 定期分析慢查询

### 3. AI服务优化
- 使用连接池
- 实现请求缓存
- 优化提示词长度
- 合理设置超时时间

### 4. 资源优化
- 定期清理缓存
- 监控内存使用
- 优化垃圾回收
- 使用CDN加速

## 🔄 部署和运维

### 生产环境配置

```env
NODE_ENV=production
DATABASE_URL="postgresql://prod-user:password@prod-db:5432/prod-db"

# 禁用Mock数据
ENABLE_MOCKS="false"

# 生产环境AI配置
FASTGPT_API_URL="https://api.fastgpt.com"
# ... 其他配置
```

### 健康检查

```bash
# 系统健康检查
curl -f http://localhost:3000/api/admin/system-monitor?type=health || exit 1
```

### 监控集成

系统支持与以下监控工具集成:
- Prometheus + Grafana
- DataDog
- New Relic
- 自定义监控系统

---

## 📞 联系方式

**B团队后端架构师**
- 📧 Email: backend-team@company.com
- 💬 Slack: #b-team-backend
- 📋 Jira: B-TEAM项目

**紧急联系**
- 🚨 On-call: +86-xxx-xxxx-xxxx
- 📱 微信群: B团队技术支持

---

*最后更新: 2024-12-19*
*版本: v1.0.0* 