# 依赖注入系统使用指南

## 概述

依赖注入（Dependency Injection，简称DI）是一种设计模式，它允许我们将对象的创建和使用分离，从而提高代码的可测试性、可维护性和灵活性。本项目实现了一个轻量级的依赖注入容器，支持装饰器语法，使得依赖注入更加简洁和直观。

## 核心组件

### 1. 容器（Container）

容器是依赖注入系统的核心，负责管理所有服务的注册和解析。

```typescript
import { container } from '@/lib/di/container';
```

### 2. 服务标识符（TYPES）

使用Symbol作为服务的唯一标识符，避免命名冲突。

```typescript
import { TYPES } from '@/lib/di/container';

// 使用示例
const logger = container.resolve(TYPES.Logger);
```

### 3. 装饰器

#### @injectable

标记一个类为可注入的服务。

```typescript
import { injectable } from '@/lib/di/container';

@injectable()
class MyService {
  // ...
}

// 也可以自动注册到容器
@injectable(TYPES.MyService)
class MyService {
  // ...
}
```

#### @inject

标记构造函数参数，指定依赖的服务标识符。

```typescript
import { inject } from '@/lib/di/container';

class MyService {
  constructor(
    @inject(TYPES.Logger) private logger: ILogger,
    @inject(TYPES.Config) private config: IConfig
  ) {}
}
```

## 使用方法

### 1. 注册服务

```typescript
// 注册单例服务
container.registerSingleton(TYPES.MyService, () => {
  return new MyService();
});

// 注册瞬态服务（每次解析都创建新实例）
container.registerTransient(TYPES.MyService, () => {
  return new MyService();
});

// 带依赖的服务注册
container.registerSingleton(TYPES.MyService, (container) => {
  const logger = container.resolve(TYPES.Logger);
  const config = container.resolve(TYPES.Config);
  return new MyService(logger, config);
});
```

### 2. 解析服务

```typescript
// 从容器中获取服务
const myService = container.resolve<MyService>(TYPES.MyService);

// 使用便捷函数获取服务
import { getService } from '@/lib/di/container';
const myService = getService<MyService>(TYPES.MyService);
```

### 3. 使用装饰器自动注入

```typescript
@injectable()
class MyController {
  constructor(
    @inject(TYPES.MyService) private myService: MyService,
    @inject(TYPES.Logger) private logger: ILogger
  ) {}
  
  async handleRequest() {
    this.logger.info('处理请求');
    return this.myService.doSomething();
  }
}

// 创建实例（依赖会自动注入）
const controller = new MyController();
```

## 最佳实践

1. **接口优先**：始终为服务定义接口，依赖接口而非具体实现。

```typescript
interface IMyService {
  doSomething(): void;
}

@injectable(TYPES.MyService)
class MyService implements IMyService {
  doSomething() { /* ... */ }
}
```

2. **模块化注册**：将相关服务的注册逻辑组织在一起。

```typescript
export function registerServices() {
  container.registerSingleton(TYPES.Service1, () => new Service1());
  container.registerSingleton(TYPES.Service2, () => new Service2());
  // ...
}
```

3. **测试友好**：在测试中替换真实服务为模拟实现。

```typescript
// 测试前替换服务
container.registerSingleton(TYPES.MyService, () => {
  return new MockMyService();
});
```

## 示例

完整的依赖注入示例可以参考 `lib/examples/di-example.ts` 文件，该示例展示了如何使用装饰器和容器API进行依赖注入。

## 注意事项

1. 确保在 `tsconfig.json` 中启用了装饰器和元数据反射：

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

2. 安装 `reflect-metadata` 依赖：

```bash
pnpm add reflect-metadata
```

3. 在应用入口点导入 `reflect-metadata`：

```typescript
import 'reflect-metadata';
```

4. 避免循环依赖，这可能导致解析服务时出现问题。

5. 在服务端初始化容器，避免在客户端重复初始化：

```typescript
if (typeof window === 'undefined') {
  // 仅在服务端初始化
  configureServices();
}
```
