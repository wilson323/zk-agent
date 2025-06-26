# Zod 验证系统集成指南

## 📋 概述

本文档介绍了如何在 zk-agent 多智能体平台中使用新集成的 Zod 验证系统。该系统为现有 API 提供了强大的数据验证、类型安全和安全增强功能。

## 🎯 设计目标

- **类型安全**: 提供编译时和运行时类型检查
- **数据验证**: 确保输入数据的完整性和正确性
- **安全增强**: 防止恶意输入和注入攻击
- **向后兼容**: 不破坏现有 API 功能
- **开发体验**: 提供清晰的错误信息和调试支持

## 🏗️ 架构设计

```
lib/validation/
├── schemas.ts          # 核心验证模式定义
├── middleware.ts       # 验证中间件
└── utils.ts           # 验证工具函数

app/api/
├── cad/
│   ├── upload/route.ts         # 原始API（保持不变）
│   └── upload-enhanced/route.ts # 增强版API（集成验证）
├── chat/
│   └── enhanced/route.ts       # 增强版聊天API
└── auth/
    └── enhanced/route.ts       # 增强版认证API
```

## 📚 核心组件

### 1. 验证模式 (Schemas)

#### 基础文件验证
```typescript
import { CADFileSchema, validateCADFile } from '@/lib/validation/schemas'

// 验证CAD文件
const result = validateCADFile({
  name: 'model.dwg',
  size: 1024000,
  type: 'application/x-dwg'
})

if (result.success) {
  console.log('文件验证通过:', result.data)
} else {
  console.error('验证失败:', result.error.issues)
}
```

#### 聊天消息验证
```typescript
import { ChatMessageSchema, validateChatMessage } from '@/lib/validation/schemas'

const message = {
  content: '请分析这个CAD文件',
  type: 'text',
  role: 'user'
}

const result = validateChatMessage(message)
```

#### 智能体配置验证
```typescript
import { AgentConfigSchema, validateAgentConfig } from '@/lib/validation/schemas'

const agentConfig = {
  id: 'cad-analyzer-v2',
  name: 'CAD分析智能体',
  type: 'cad',
  capabilities: ['geometry_analysis', 'ai_insights'],
  priority: 80
}

const result = validateAgentConfig(agentConfig)
```

### 2. 验证中间件 (Middleware)

#### 基础使用
```typescript
import { withValidation } from '@/lib/validation/middleware'
import { z } from 'zod'

const handler = withValidation({
  validateBody: z.object({
    name: z.string().min(1),
    email: z.string().email()
  })
})(async (request) => {
  // request.validatedBody 包含验证后的数据
  const { name, email } = request.validatedBody
  
  return NextResponse.json({ success: true })
})

export const POST = handler
```

#### 组合中间件
```typescript
import { 
  withValidation, 
  withSecurity, 
  combineMiddleware 
} from '@/lib/validation/middleware'

const enhancedHandler = combineMiddleware(
  withSecurity({
    enableCSRF: true,
    maxRequestSize: 10 * 1024 * 1024,
    allowedOrigins: ['https://yourdomain.com']
  }),
  withValidation({
    validateBody: UserInputSchema,
    debug: process.env.NODE_ENV === 'development'
  })
)(async (request) => {
  // 处理验证和安全检查后的请求
  return NextResponse.json({ success: true })
})

export const POST = enhancedHandler
```

#### 预定义验证器
```typescript
import { validateRequest } from '@/lib/validation/middleware'

// CAD文件上传验证
export const POST = validateRequest.cadFileUpload()(async (request) => {
  const { file, options } = request.validatedBody
  // 处理已验证的CAD文件上传
})

// 聊天消息验证
export const POST = validateRequest.chatMessage()(async (request) => {
  const { content, type, role } = request.validatedBody
  // 处理已验证的聊天消息
})

// 用户认证验证
export const POST = validateRequest.userAuth()(async (request) => {
  const { email, password, name } = request.validatedBody
  // 处理已验证的用户认证
})
```

## 🔧 实际应用示例

### 1. 增强版 CAD 上传 API

```typescript
// app/api/cad/upload-enhanced/route.ts
import { 
  withValidation, 
  withSecurity, 
  combineMiddleware 
} from '@/lib/validation/middleware'
import { CADFileSchema, VALIDATION_LIMITS } from '@/lib/validation/schemas'

const enhancedHandler = combineMiddleware(
  withSecurity({
    maxRequestSize: VALIDATION_LIMITS.MAX_FILE_SIZE,
    enableCSRF: false // FormData上传不需要CSRF
  }),
  withValidation({
    debug: process.env.NODE_ENV === 'development'
  })
)(async (request) => {
  // 处理增强验证后的CAD文件上传
  const formData = await request.formData()
  const file = formData.get('file') as File
  
  // 使用zod验证文件
  const validation = validateCADFile({
    name: file.name,
    size: file.size,
    type: file.type
  })
  
  if (!validation.success) {
    return NextResponse.json({
      success: false,
      errors: validation.error.issues
    }, { status: 400 })
  }
  
  // 继续处理验证通过的文件...
})

export const POST = enhancedHandler
```

### 2. 增强版聊天 API

```typescript
// app/api/chat/enhanced/route.ts
import { validateRequest } from '@/lib/validation/middleware'

export const POST = validateRequest.chatMessage({
  debug: true,
  onValidationError: (error) => {
    return NextResponse.json({
      error: '消息格式不正确',
      details: error.issues
    }, { status: 400 })
  }
})(async (request) => {
  const { content, type, role, metadata } = request.validatedBody
  
  // 处理已验证的聊天消息
  // content 已经过XSS检查和长度验证
  // type 确保是有效的消息类型
  // role 确保是有效的角色
  
  return NextResponse.json({
    success: true,
    message: '消息已接收并验证'
  })
})
```

### 3. 增强版用户认证 API

```typescript
// app/api/auth/enhanced/route.ts
import { validateRequest } from '@/lib/validation/middleware'
import { UserInputSchema } from '@/lib/validation/schemas'

export const POST = validateRequest.userAuth({
  sanitizeInput: true,
  enableCSRF: true
})(async (request) => {
  const { email, password, name } = request.validatedBody
  
  // email 已验证格式正确
  // password 已验证强度要求
  // name 已验证长度和字符要求
  
  // 继续处理用户认证逻辑...
  
  return NextResponse.json({
    success: true,
    message: '用户信息验证通过'
  })
})
```

## 🛡️ 安全特性

### 1. 输入清理
```typescript
import { sanitizeAndValidate } from '@/lib/validation/schemas'

// 自动清理和验证输入
const result = sanitizeAndValidate(
  UserInputSchema,
  userInput,
  [
    (input) => input.trim(), // 去除空白
    (input) => escapeHtml(input), // HTML转义
    (input) => removeScriptTags(input) // 移除脚本标签
  ]
)
```

### 2. CSRF 保护
```typescript
const handler = withSecurity({
  enableCSRF: true,
  allowedOrigins: ['https://yourdomain.com']
})(async (request) => {
  // 自动检查CSRF令牌和来源
})
```

### 3. 请求大小限制
```typescript
const handler = withSecurity({
  maxRequestSize: 50 * 1024 * 1024 // 50MB限制
})(async (request) => {
  // 自动检查请求大小
})
```

## 📊 错误处理

### 1. 标准错误格式
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "数据验证失败",
    "details": [
      {
        "field": "email",
        "issue": "邮箱格式不正确"
      },
      {
        "field": "password",
        "issue": "密码必须包含大小写字母和数字"
      }
    ]
  },
  "metadata": {
    "timestamp": "2024-12-19T10:30:00.000Z",
    "requestId": "req_123456",
    "processingTime": 45,
    "version": "1.0.0"
  }
}
```

### 2. 自定义错误处理
```typescript
const handler = withValidation({
  onValidationError: (error) => {
    // 记录错误日志
    console.error('验证失败:', error)
    
    // 返回自定义错误响应
    return NextResponse.json({
      message: '请检查输入数据',
      errors: error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message
      }))
    }, { status: 400 })
  }
})(async (request) => {
  // 处理逻辑
})
```

## 🧪 测试示例

### 1. 单元测试
```typescript
import { validateCADFile } from '@/lib/validation/schemas'

describe('CAD文件验证', () => {
  test('应该接受有效的DWG文件', () => {
    const result = validateCADFile({
      name: 'model.dwg',
      size: 1024000,
      type: 'application/x-dwg'
    })
    
    expect(result.success).toBe(true)
    expect(result.data.name).toBe('model.dwg')
  })
  
  test('应该拒绝无效的文件格式', () => {
    const result = validateCADFile({
      name: 'document.pdf',
      size: 1024000,
      type: 'application/pdf'
    })
    
    expect(result.success).toBe(false)
    expect(result.error.issues[0].message).toContain('不支持的CAD文件格式')
  })
})
```

### 2. 集成测试
```typescript
import { POST } from '@/app/api/cad/upload-enhanced/route'

describe('增强版CAD上传API', () => {
  test('应该成功上传有效的CAD文件', async () => {
    const formData = new FormData()
    formData.append('file', new File(['test'], 'model.dwg', {
      type: 'application/x-dwg'
    }))
    
    const request = new Request('http://localhost/api/cad/upload-enhanced', {
      method: 'POST',
      body: formData
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.validation.isValid).toBe(true)
  })
})
```

## 📈 性能优化

### 1. 验证缓存
```typescript
import { LRUCache } from 'lru-cache'

const validationCache = new LRUCache<string, boolean>({
  max: 1000,
  ttl: 1000 * 60 * 5 // 5分钟缓存
})

function cachedValidation(schema: z.ZodSchema, data: unknown) {
  const key = JSON.stringify(data)
  
  if (validationCache.has(key)) {
    return validationCache.get(key)
  }
  
  const result = schema.safeParse(data)
  validationCache.set(key, result.success)
  
  return result.success
}
```

### 2. 异步验证
```typescript
async function validateLargeFile(file: File) {
  // 分块验证大文件
  const chunkSize = 1024 * 1024 // 1MB chunks
  
  for (let offset = 0; offset < file.size; offset += chunkSize) {
    const chunk = file.slice(offset, offset + chunkSize)
    await validateChunk(chunk)
    
    // 允许其他任务执行
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}
```

## 🔄 迁移指南

### 1. 现有API增强
```typescript
// 原始API (保持不变)
// app/api/cad/upload/route.ts

// 增强版API (新增)
// app/api/cad/upload-enhanced/route.ts
```

### 2. 渐进式迁移
1. 创建增强版API端点
2. 在客户端逐步切换到增强版
3. 监控和测试新端点
4. 最终弃用原始端点

### 3. 配置管理
```typescript
// config/validation.ts
export const validationConfig = {
  enableStrictMode: process.env.NODE_ENV === 'production',
  enableDebugLogging: process.env.NODE_ENV === 'development',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600'), // 100MB
  enableCSRF: process.env.ENABLE_CSRF === 'true',
}
```

## 📝 最佳实践

### 1. 命名规范
- Schema名称：`PascalCase + Schema`（如：`UserInputSchema`）
- 验证函数：`validate + 对象名称`（如：`validateCADFile`）
- 中间件：`with + 功能描述`（如：`withValidation`）
- 错误类型：`ValidationError + 类型`（如：`CADValidationError`）

### 2. 错误处理
- 提供清晰的错误信息
- 包含字段路径和具体问题
- 支持国际化错误消息
- 记录详细的调试信息

### 3. 性能考虑
- 缓存验证结果
- 异步处理大文件
- 限制验证复杂度
- 监控验证性能

### 4. 安全原则
- 始终验证用户输入
- 使用白名单而非黑名单
- 实施深度防御策略
- 定期更新验证规则

## 🚀 未来扩展

### 1. 自定义验证器
```typescript
const customCADValidator = z.custom<File>((file) => {
  // 自定义CAD文件验证逻辑
  return isValidCADFile(file)
}, {
  message: '无效的CAD文件'
})
```

### 2. 动态验证规则
```typescript
function createDynamicSchema(userRole: string) {
  const baseSchema = z.object({
    name: z.string(),
    email: z.string().email()
  })
  
  if (userRole === 'admin') {
    return baseSchema.extend({
      permissions: z.array(z.string())
    })
  }
  
  return baseSchema
}
```

### 3. 验证分析
```typescript
// 收集验证统计信息
const validationMetrics = {
  totalValidations: 0,
  failedValidations: 0,
  averageValidationTime: 0,
  commonErrors: new Map<string, number>()
}
```

## 📞 支持和反馈

如有问题或建议，请：
1. 查看现有文档和示例
2. 在项目中搜索类似实现
3. 创建详细的问题报告
4. 提供复现步骤和期望行为

---

**注意**: 本验证系统是对现有 zk-agent 平台的增强，旨在提高数据安全性和开发体验，同时保持向后兼容性。 