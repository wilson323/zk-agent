# 数据库配置指南

## 概述

本文档详细说明了ZK-Agent项目的数据库配置、连接管理、性能监控和健康检查功能。

## 配置文件结构

### 1. 环境变量配置 (.env)

```bash
# 数据库连接配置
DATABASE_URL=postgresql://username:password@localhost:5432/zk_agent
DB_HOST=localhost
DB_PORT=5432
DB_NAME=zk_agent
DB_USER=username
DB_PASSWORD=password

# 连接池配置
DB_POOL_MAX=20
DB_POOL_MIN=5
DB_POOL_ACQUIRE=60000
DB_POOL_IDLE=10000
DB_POOL_EVICT=1000

# SSL配置
DB_SSL_ENABLED=false
DB_SSL_REJECT_UNAUTHORIZED=false

# 超时配置
DB_CONNECT_TIMEOUT=10000
DB_REQUEST_TIMEOUT=30000
DB_CANCEL_TIMEOUT=5000

# 健康检查配置
DB_HEALTH_CHECK=true
DB_HEALTH_CHECK_INTERVAL=30000
DB_HEALTH_CHECK_TIMEOUT=5000
```

### 2. 数据库配置文件 (config/database.config.js)

支持多环境配置：
- **production**: 生产环境配置
- **test**: 测试环境配置
- **development**: 开发环境配置

## 核心功能模块

### 1. 增强数据库管理器 (EnhancedDatabaseManager)

**功能特性：**
- 单例模式确保全局唯一实例
- 查询缓存机制
- 慢查询检测和告警
- 查询性能监控
- 批量操作优化
- 事务管理
- 连接池状态监控

**主要方法：**
```typescript
// 执行查询（带缓存）
await dbManager.executeQuery(queryFn, cacheKey, cacheTTL);

// 执行事务
await dbManager.executeTransaction(transactionFn);

// 批量操作
await dbManager.executeBatch(operations);

// 健康检查
const health = await dbManager.healthCheck();

// 获取查询分析
const analytics = dbManager.getQueryAnalytics();
```

### 2. 数据库健康检查器 (DatabaseHealthChecker)

**功能特性：**
- 连接状态监控
- 自动重连机制
- 连接池状态跟踪
- 健康检查定时任务
- 连接错误处理

**使用示例：**
```javascript
const healthChecker = new DatabaseHealthChecker(config);

// 测试连接
await healthChecker.testConnection();

// 获取连接池状态
const poolStatus = healthChecker.getPoolStatus();

// 执行查询
const result = await healthChecker.executeQuery('SELECT NOW()');
```

### 3. 数据库性能监控器 (DatabasePerformanceMonitor)

**功能特性：**
- 查询性能指标收集
- 慢查询识别
- 错误统计
- 性能报告生成
- 告警阈值检查
- 历史数据清理

**监控指标：**
- 查询执行时间
- 查询成功率
- 慢查询数量
- 错误率统计
- 连接池使用率

## 数据库迁移

### 迁移文件结构

```
migrations/
├── 001_initial_schema.sql      # 基础表结构
├── 002_performance_optimization.sql  # 性能优化
└── ...
```

### 运行迁移

```bash
# 初始化数据库
npm run db:init

# 运行Prisma迁移
npm run db:migrate

# 部署迁移到生产环境
npm run db:migrate:deploy
```

## 性能优化配置

### 1. 连接池优化

```javascript
// 生产环境推荐配置
const poolConfig = {
  max: 20,           // 最大连接数
  min: 5,            // 最小连接数
  acquire: 60000,    // 获取连接超时
  idle: 10000,       // 空闲超时
  evict: 1000,       // 连接回收间隔
  handleDisconnects: true
};
```

### 2. 查询缓存配置

```javascript
// 启用查询缓存
dbManager.setCacheEnabled(true);

// 设置慢查询阈值
dbManager.setSlowQueryThreshold(1000); // 1秒
```

### 3. 性能监控配置

```javascript
// 启动性能监控
const monitor = new DatabasePerformanceMonitor({
  slowQueryThreshold: 1000,
  errorThreshold: 0.05,
  alertInterval: 300000
});
```

## 健康检查和监控

### 1. 健康检查端点

```bash
# 测试数据库连接
npm run db:health-check

# 完整连接测试
npm run db:test-connection
```

### 2. 性能报告

```bash
# 生成性能报告
npm run db:performance-report
```

### 3. 监控指标

**连接池监控：**
- 活跃连接数
- 空闲连接数
- 等待连接数
- 连接池状态

**查询性能监控：**
- 平均响应时间
- 慢查询数量
- 查询成功率
- 错误率统计

## 生产环境部署

### 1. 环境变量设置

```bash
# 生产数据库连接
DATABASE_URL=postgresql://prod_user:secure_password@prod-db:5432/zk_agent_prod

# 启用SSL
DB_SSL_ENABLED=true
DB_SSL_REJECT_UNAUTHORIZED=true

# 优化连接池
DB_POOL_MAX=50
DB_POOL_MIN=10

# 启用健康检查
DB_HEALTH_CHECK=true
DB_HEALTH_CHECK_INTERVAL=30000
```

### 2. 性能调优

```bash
# 设置合适的超时时间
DB_CONNECT_TIMEOUT=10000
DB_REQUEST_TIMEOUT=30000
DB_CANCEL_TIMEOUT=5000

# 启用连接池优化
DB_POOL_EVICT=1000
```

### 3. 监控和告警

- 配置慢查询告警（>1秒）
- 设置错误率告警（>5%）
- 监控连接池使用率
- 定期清理性能日志

## 故障排除

### 常见问题

1. **连接超时**
   - 检查网络连接
   - 调整连接超时设置
   - 验证数据库服务状态

2. **连接池耗尽**
   - 增加最大连接数
   - 检查连接泄漏
   - 优化查询性能

3. **慢查询问题**
   - 分析查询执行计划
   - 添加适当索引
   - 优化查询逻辑

### 调试工具

```bash
# 连接测试
npm run db:test-connection

# 健康检查
npm run db:health-check

# 性能分析
npm run db:performance-report
```

## 最佳实践

1. **连接管理**
   - 使用连接池
   - 及时释放连接
   - 监控连接状态

2. **查询优化**
   - 使用查询缓存
   - 避免N+1查询
   - 合理使用索引

3. **错误处理**
   - 实现重试机制
   - 记录详细错误日志
   - 设置合理超时

4. **监控告警**
   - 定期健康检查
   - 性能指标监控
   - 异常情况告警

5. **安全配置**
   - 使用SSL连接
   - 限制数据库权限
   - 定期更新密码

## 总结

通过以上配置和优化，ZK-Agent项目的数据库系统具备了：
- 高可用性和稳定性
- 优秀的性能表现
- 完善的监控体系
- 强大的故障恢复能力

这确保了系统在生产环境中的可靠运行，满足了零异常率的要求。