# ZK-Agent 重复代码清理计划

## 清理目标
消除项目中的重复代码，提高代码质量和可维护性，确保代码规范统一。

## 发现的重复代码类型

### 1. 重复的枚举定义
- `CloudProvider`: `lib/storage/real-cloud-storage-adapter.ts` 和 `lib/storage/cloud-storage-adapter.ts`
- `CircuitBreakerState`: `lib/ai/unified-ai-adapter.ts` 和 `lib/errors/agent-errors.ts`
- `CacheStrategy`: 多个文件中重复定义
- `AlertLevel`: `lib/database/monitoring-interfaces.ts` 和 `lib/database/monitoring.ts`
- `ErrorType`: `lib/database/error-recovery.ts`、`lib/chat/error-retry-manager.ts`、`lib/utils/error-handler.ts`
- `UserRole`: `lib/auth/middleware.ts` 和 `lib/auth/permission-system.ts`

### 2. 重复的类型定义
- `ValidationResult`: 多个文件中重复
- `CADFileType`: 多个文件中重复
- `ChatMessageType`: 多个文件中重复
- 组件相关类型: `ColorToken`、`SpacingToken`、`ButtonProps`等

### 3. 重复的工具函数
- 性能测量函数: `measureTime`、`getMemoryUsage`、`getCPUUsage`
- 文件操作函数: 文件上传、下载、删除等
- 验证函数: 各种数据验证逻辑
- 错误处理函数: 错误标准化、日志记录等

### 4. 重复的常量定义
- API路由常量: 大量`export const GET/POST/PUT/DELETE`模式
- 配置常量: `LOCAL_STORAGE_KEYS`、`MODEL_PURPOSES`等
- UI常量: `POSTER_STYLES`、`MARKETING_HEADLINES`等

## 清理策略

### 阶段1: 创建统一的类型定义文件
1. 创建 `lib/types/common.ts` - 通用类型定义
2. 创建 `lib/types/enums.ts` - 统一枚举定义
3. 创建 `lib/types/interfaces.ts` - 接口定义
4. 创建 `lib/types/api.ts` - API相关类型

### 阶段2: 创建统一的工具函数库
1. 创建 `lib/utils/performance.ts` - 性能测量工具
2. 创建 `lib/utils/file-operations.ts` - 文件操作工具
3. 创建 `lib/utils/validation.ts` - 验证工具
4. 创建 `lib/utils/error-handling.ts` - 错误处理工具

### 阶段3: 创建统一的常量定义
1. 创建 `lib/constants/api.ts` - API常量
2. 创建 `lib/constants/ui.ts` - UI常量
3. 创建 `lib/constants/config.ts` - 配置常量

### 阶段4: 重构现有代码
1. 逐步替换重复的类型定义
2. 替换重复的工具函数
3. 替换重复的常量定义
4. 更新导入语句

### 阶段5: 验证和测试
1. 运行完整的测试套件
2. 检查类型检查是否通过
3. 验证功能完整性
4. 性能回归测试

## 实施原则
1. 保持向后兼容性
2. 分步骤实施，避免大规模破坏性更改
3. 每个阶段完成后进行测试验证
4. 保持代码质量和可读性
5. 遵循项目的编码规范

## 预期收益
- 减少代码重复率50%以上
- 提高代码可维护性
- 统一代码风格和规范
- 减少潜在的不一致性错误
- 提升开发效率