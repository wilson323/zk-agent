# 错误处理系统性迁移指南

## 概述

本指南旨在帮助开发团队系统性地将现有的异常处理模式迁移到统一的错误处理架构。通过标准化错误代码、统一处理流程和自动化迁移工具，提升系统的可维护性和可观测性。

## 迁移目标

### 1. 统一错误代码
- 使用 `UnifiedErrorCode` 枚举替代分散的错误代码定义
- 按错误类型分类管理（认证、验证、资源、数据库等）
- 提供错误代码到HTTP状态码、用户消息、严重程度的映射

### 2. 标准化错误处理
- 统一API路由的异常处理模式
- 集中化错误日志记录和指标收集
- 敏感信息过滤和环境适配

### 3. 提升可观测性
- 结构化错误日志
- 错误指标监控
- 错误告警机制

## 核心组件

### 1. 统一错误代码 (`types/core/unified-error-codes.ts`)

```typescript
// 统一的错误代码枚举
export enum UnifiedErrorCode {
  // 认证和授权错误 (1000-1999)
  AUTH_INVALID_TOKEN = 'AUTH_INVALID_TOKEN',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  AUTH_INSUFFICIENT_PERMISSIONS = 'AUTH_INSUFFICIENT_PERMISSIONS',
  
  // 验证错误 (2000-2999)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  VALIDATION_INVALID_FORMAT = 'VALIDATION_INVALID_FORMAT',
  
  // 资源错误 (3000-3999)
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  
  // 数据库错误 (4000-4999)
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  DATABASE_QUERY_ERROR = 'DATABASE_QUERY_ERROR',
  
  // 网络和外部服务错误 (5000-5999)
  NETWORK_ERROR = 'NETWORK_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  
  // 系统错误 (6000-6999)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // 其他分类...
}
```

### 2. 统一错误处理器 (`lib/middleware/unified-error-handler.ts`)

```typescript
// 统一异常处理装饰器
export function withUnifiedErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleUnifiedException(error, args[0]?.headers?.get?.('x-request-id'));
    }
  };
}

// 核心异常处理函数
export function handleUnifiedException(error: unknown, requestId?: string): NextResponse {
  const standardizedError = normalizeError(error, requestId);
  
  // 记录日志
  logError(standardizedError);
  
  // 记录指标
  recordMetrics(standardizedError);
  
  // 返回标准化响应
  return createErrorResponse(standardizedError);
}
```

### 3. 迁移脚本 (`scripts/migrate-api-error-handling.ts`)

自动化迁移工具，支持：
- 批量文件处理
- 错误模式识别和替换
- 导入语句更新
- 迁移结果验证
- 备份和回滚

## 迁移步骤

### 阶段1：准备工作

1. **备份现有代码**
   ```bash
   git checkout -b error-handling-migration
   git add .
   git commit -m "Backup before error handling migration"
   ```

2. **安装依赖**
   ```bash
   npm install --save-dev @types/node
   ```

3. **创建核心文件**
   - `types/core/unified-error-codes.ts` - 统一错误代码
   - `lib/middleware/unified-error-handler.ts` - 统一错误处理器
   - `scripts/migrate-api-error-handling.ts` - 迁移脚本

### 阶段2：错误代码迁移

1. **识别现有错误代码**
   ```bash
   # 查找所有ErrorCode使用
   grep -r "ErrorCode\|ERROR_CODES" app/ lib/ --include="*.ts" --include="*.tsx"
   ```

2. **更新导入语句**
   ```typescript
   // 旧的导入
   import { ErrorCode } from '@/types/core';
   
   // 新的导入
   import { UnifiedErrorCode } from '@/types/core/unified-error-codes';
   ```

3. **替换错误代码引用**
   ```typescript
   // 旧的用法
   ErrorCode.VALIDATION_ERROR
   
   // 新的用法
   UnifiedErrorCode.VALIDATION_ERROR
   ```

### 阶段3：API路由迁移

1. **运行迁移脚本**
   ```bash
   npx ts-node scripts/migrate-api-error-handling.ts --dry-run
   npx ts-node scripts/migrate-api-error-handling.ts --apply
   ```

2. **手动处理复杂情况**
   - 自定义错误类
   - 复杂的错误处理逻辑
   - 第三方库集成

3. **更新API路由**
   ```typescript
   // 旧的模式
   export async function POST(req: NextRequest) {
     try {
       // 业务逻辑
       return ApiResponseWrapper.success(result);
     } catch (error) {
       console.error('Error:', error);
       return ApiResponseWrapper.error(
         ErrorCode.INTERNAL_SERVER_ERROR,
         'Internal server error',
         null,
         500
       );
     }
   }
   
   // 新的模式
   export const POST = withUnifiedErrorHandling(async (req: NextRequest) => {
     // 业务逻辑
     return ApiResponseWrapper.success(result);
   });
   ```

### 阶段4：验证和测试

1. **运行测试套件**
   ```bash
   npm test
   npm run test:integration
   ```

2. **验证错误响应格式**
   ```bash
   # 测试API错误响应
   curl -X POST http://localhost:3000/api/test-endpoint \
     -H "Content-Type: application/json" \
     -d '{"invalid": "data"}'
   ```

3. **检查日志格式**
   ```bash
   # 查看错误日志
   tail -f logs/error.log | jq .
   ```

### 阶段5：监控和优化

1. **配置错误监控**
   - 设置错误告警阈值
   - 配置错误指标仪表板
   - 集成错误追踪服务

2. **性能优化**
   - 分析错误处理性能影响
   - 优化日志记录频率
   - 调整指标收集策略

## 迁移检查清单

### 代码层面
- [ ] 所有 `ErrorCode` 引用已替换为 `UnifiedErrorCode`
- [ ] 导入语句已更新
- [ ] API路由已使用统一错误处理
- [ ] 自定义错误类已适配新架构
- [ ] 错误日志格式已标准化

### 功能层面
- [ ] 错误响应格式一致
- [ ] HTTP状态码正确映射
- [ ] 用户友好错误消息
- [ ] 敏感信息已过滤
- [ ] 开发/生产环境适配

### 监控层面
- [ ] 错误指标正常收集
- [ ] 错误日志结构化
- [ ] 告警规则已配置
- [ ] 错误追踪集成
- [ ] 性能影响可接受

### 测试层面
- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] 错误场景测试覆盖
- [ ] 性能测试通过
- [ ] 安全测试通过

## 常见问题和解决方案

### 1. 错误代码冲突

**问题**：不同模块使用相同的错误代码名称

**解决方案**：
```typescript
// 使用命名空间或前缀区分
export enum UnifiedErrorCode {
  // 用户模块
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  
  // 订单模块
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
  ORDER_ALREADY_EXISTS = 'ORDER_ALREADY_EXISTS',
}
```

### 2. 第三方库错误处理

**问题**：第三方库抛出的错误格式不统一

**解决方案**：
```typescript
function normalizeThirdPartyError(error: unknown): StandardizedError {
  // Prisma错误
  if (error instanceof PrismaClientKnownRequestError) {
    return {
      code: UnifiedErrorCode.DATABASE_QUERY_ERROR,
      message: 'Database operation failed',
      // ...
    };
  }
  
  // Axios错误
  if (axios.isAxiosError(error)) {
    return {
      code: UnifiedErrorCode.EXTERNAL_SERVICE_ERROR,
      message: 'External service request failed',
      // ...
    };
  }
  
  // 默认处理
  return normalizeError(error);
}
```

### 3. 性能影响

**问题**：统一错误处理增加了响应时间

**解决方案**：
```typescript
// 异步日志记录
function logErrorAsync(error: StandardizedError): void {
  setImmediate(() => {
    logError(error);
  });
}

// 批量指标记录
const metricsBuffer: StandardizedError[] = [];
setInterval(() => {
  if (metricsBuffer.length > 0) {
    recordMetricsBatch(metricsBuffer.splice(0));
  }
}, 1000);
```

### 4. 向后兼容性

**问题**：现有客户端依赖旧的错误响应格式

**解决方案**：
```typescript
// 提供兼容性适配器
function createLegacyErrorResponse(error: StandardizedError): NextResponse {
  return NextResponse.json({
    // 新格式
    error: {
      code: error.code,
      message: error.message,
      timestamp: error.timestamp
    },
    // 兼容旧格式
    success: false,
    errorCode: error.code,
    errorMessage: error.message
  }, { status: error.statusCode });
}
```

## 最佳实践

### 1. 错误代码设计
- 使用语义化的错误代码名称
- 按功能模块分组管理
- 预留扩展空间
- 避免过度细分

### 2. 错误消息
- 用户友好的错误描述
- 支持国际化
- 避免暴露内部实现细节
- 提供解决建议

### 3. 日志记录
- 结构化日志格式
- 包含足够的上下文信息
- 避免记录敏感信息
- 合理的日志级别

### 4. 监控告警
- 基于错误严重程度设置告警
- 监控错误趋势和模式
- 设置合理的告警阈值
- 避免告警疲劳

## 总结

通过系统性的错误处理迁移，我们可以实现：

1. **统一性**：标准化的错误代码和处理流程
2. **可维护性**：集中化的错误管理和配置
3. **可观测性**：结构化的错误日志和指标
4. **用户体验**：一致的错误响应和友好的错误消息
5. **开发效率**：自动化的迁移工具和最佳实践

迁移过程需要团队协作，建议分阶段进行，确保每个阶段都经过充分测试和验证。通过持续的监控和优化，可以进一步提升系统的稳定性和可靠性。