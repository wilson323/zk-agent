# 增强版API客户端

## 概述

增强版API客户端是一个基于Axios的HTTP客户端封装，提供了以下功能：

- JWT令牌自动刷新
- 请求/响应拦截
- 统一的错误处理
- 请求日志记录
- 健康检查
- 类型安全的API响应

## 文件结构

- `enhanced-api-client.ts` - 增强版API客户端实现
- `enhanced-fastgpt-client.ts` - 增强版FastGPT客户端实现
- `api-user-service.ts` - 基于API的用户服务示例

## 使用方法

### 基本用法

```typescript
import { enhancedApiClient } from '@/lib/api/enhanced-api-client';

// GET请求
const response = await enhancedApiClient.get('/api/users');

// POST请求
const createResponse = await enhancedApiClient.post('/api/users', {
  name: 'John Doe',
  email: 'john@example.com',
});

// 带类型的请求
interface User {
  id: string;
  name: string;
  email: string;
}

const userResponse = await enhancedApiClient.get<User>('/api/users/123');
if (userResponse.success) {
  const user = userResponse.data; // 类型为User
  console.log(user.name);
} else {
  console.error(userResponse.error?.message);
}
```

### 设置全局请求头

```typescript
// 设置请求头
enhancedApiClient.setHeader('X-API-Key', 'your-api-key');

// 移除请求头
enhancedApiClient.removeHeader('X-API-Key');
```

### 自定义配置

```typescript
import { EnhancedApiClient } from '@/lib/api/enhanced-api-client';

const customClient = new EnhancedApiClient({
  baseURL: 'https://api.example.com',
  timeout: 5000,
  headers: {
    'X-Custom-Header': 'value',
  },
  enableTokenRefresh: true,
  enableRequestLogging: true,
  enableResponseLogging: true,
  enableErrorLogging: true,
});
```

## JWT令牌刷新机制

增强版API客户端集成了JWT令牌自动刷新机制：

1. 在每次请求前检查访问令牌是否即将过期
2. 如果即将过期，使用刷新令牌获取新的令牌对
3. 更新本地存储的令牌
4. 使用新令牌继续原始请求
5. 如果刷新失败，清除令牌并重定向到登录页

## 错误处理

增强版API客户端提供了统一的错误处理机制：

```typescript
const response = await enhancedApiClient.get('/api/users/123');

if (!response.success) {
  // 处理错误
  const errorMessage = response.error?.message || '未知错误';
  const errorCode = response.error?.code || 'UNKNOWN_ERROR';
  const statusCode = response.error?.status || 500;
  
  console.error(`错误: ${errorMessage}, 代码: ${errorCode}, 状态码: ${statusCode}`);
}
```

## 示例组件

查看 `components/examples/UserManagement.tsx` 了解完整的使用示例。

## 与服务集成

增强版API客户端可以与服务层集成，如 `lib/services/api-user-service.ts` 所示。

```typescript
import { enhancedApiClient } from '@/lib/api/enhanced-api-client';

export class ApiUserService {
  private readonly baseUrl = '/api/users';
  
  async getUsers() {
    const response = await enhancedApiClient.get(this.baseUrl);
    // 处理响应
    return response.data;
  }
  
  // 其他方法...
}
```