# 🔧 ZK-Agent 故障排除指南

本文档提供了 ZK-Agent 项目常见问题的解决方案和调试技巧。

## 🚨 常见问题

### 1. 数据库相关问题

#### 问题：数据库连接失败
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**解决方案：**
```bash
# 1. 检查 PostgreSQL 是否运行
sudo systemctl status postgresql

# 2. 启动 PostgreSQL
sudo systemctl start postgresql

# 3. 检查数据库连接
npm run db:test-connection

# 4. 验证环境变量
echo $DATABASE_URL
```

#### 问题：Prisma 迁移失败
```
Error: P3009 migrate found failed migration
```

**解决方案：**
```bash
# 1. 重置数据库（开发环境）
npm run db:reset

# 2. 手动解决迁移冲突
prisma migrate resolve --applied "migration_name"

# 3. 重新生成客户端
npm run db:generate
```

#### 问题：数据库权限错误
```
Error: permission denied for table users
```

**解决方案：**
```sql
-- 授予用户权限
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_user;
```

### 2. 环境变量问题

#### 问题：环境变量未加载
```
Error: Environment variable DATABASE_URL is not defined
```

**解决方案：**
```bash
# 1. 检查 .env 文件是否存在
ls -la .env*

# 2. 验证环境变量格式
cat .env.local

# 3. 重启开发服务器
npm run dev
```

#### 问题：Next.js 环境变量不可用
```
Error: process.env.CUSTOM_VAR is undefined
```

**解决方案：**
```javascript
// next.config.js
module.exports = {
  env: {
    CUSTOM_VAR: process.env.CUSTOM_VAR,
  },
  // 或使用公共变量前缀
  publicRuntimeConfig: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
}
```

### 3. 依赖包问题

#### 问题：npm 安装失败
```
Error: ERESOLVE unable to resolve dependency tree
```

**解决方案：**
```bash
# 1. 清理缓存
npm cache clean --force

# 2. 删除 node_modules 和 package-lock.json
rm -rf node_modules package-lock.json

# 3. 重新安装
npm install

# 4. 使用 --legacy-peer-deps（如果需要）
npm install --legacy-peer-deps
```

#### 问题：TypeScript 类型错误
```
Error: Cannot find module '@types/node'
```

**解决方案：**
```bash
# 1. 安装缺失的类型定义
npm install -D @types/node @types/react @types/react-dom

# 2. 检查 TypeScript 配置
npm run type-check

# 3. 重新生成类型
npm run db:generate
```

### 4. 构建和部署问题

#### 问题：Next.js 构建失败
```
Error: Build optimization failed
```

**解决方案：**
```bash
# 1. 清理构建缓存
rm -rf .next

# 2. 检查 ESLint 错误
npm run lint

# 3. 修复类型错误
npm run type-check

# 4. 重新构建
npm run build
```

#### 问题：内存不足
```
Error: JavaScript heap out of memory
```

**解决方案：**
```bash
# 1. 增加 Node.js 内存限制
export NODE_OPTIONS="--max-old-space-size=4096"

# 2. 或在 package.json 中设置
"scripts": {
  "build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
}
```

### 5. 性能问题

#### 问题：页面加载缓慢

**诊断步骤：**
```bash
# 1. 启用性能监控
export ENABLE_PERFORMANCE_MONITORING=true

# 2. 分析构建包大小
npm run analyze:bundle

# 3. 检查数据库查询性能
npm run db:performance-report
```

**优化方案：**
- 启用代码分割
- 优化图片加载
- 使用 Redis 缓存
- 数据库查询优化

#### 问题：数据库查询慢

**解决方案：**
```sql
-- 1. 添加索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at);

-- 2. 分析查询计划
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'user@example.com';

-- 3. 优化查询
-- 使用 LIMIT 和分页
-- 避免 SELECT *
-- 使用适当的 JOIN
```

### 6. 安全问题

#### 问题：CORS 错误
```
Error: Access to fetch blocked by CORS policy
```

**解决方案：**
```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type,Authorization' },
        ],
      },
    ]
  },
}
```

#### 问题：JWT 令牌验证失败
```
Error: JsonWebTokenError: invalid signature
```

**解决方案：**
```bash
# 1. 检查 JWT_SECRET 环境变量
echo $JWT_SECRET

# 2. 确保密钥一致性
# 3. 检查令牌过期时间
# 4. 验证令牌格式
```

## 🔍 调试技巧

### 1. 启用详细日志
```bash
# 设置日志级别
export LOG_LEVEL=debug
export DEBUG=*

# 启动应用
npm run dev
```

### 2. 数据库调试
```javascript
// 启用 Prisma 查询日志
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})
```

### 3. 网络请求调试
```javascript
// 添加请求拦截器
axios.interceptors.request.use(request => {
  console.log('Starting Request:', request)
  return request
})

axios.interceptors.response.use(
  response => {
    console.log('Response:', response)
    return response
  },
  error => {
    console.error('Request Error:', error)
    return Promise.reject(error)
  }
)
```

### 4. 性能分析
```javascript
// 使用 Performance API
const start = performance.now()
// 执行操作
const end = performance.now()
console.log(`操作耗时: ${end - start} 毫秒`)
```

## 🛠️ 诊断工具

### 1. 健康检查脚本
```bash
#!/bin/bash
# health-check.sh

echo "🔍 系统健康检查..."

# 检查 Node.js 版本
echo "Node.js 版本: $(node --version)"

# 检查数据库连接
echo "📊 检查数据库连接..."
npm run db:health-check

# 检查 Redis 连接
echo "🔴 检查 Redis 连接..."
redis-cli ping

# 检查端口占用
echo "🔌 检查端口 3000..."
netstat -tulpn | grep :3000

# 检查磁盘空间
echo "💾 磁盘使用情况:"
df -h

# 检查内存使用
echo "🧠 内存使用情况:"
free -h

echo "✅ 健康检查完成"
```

### 2. 日志分析脚本
```bash
#!/bin/bash
# analyze-logs.sh

echo "📋 分析应用日志..."

# 错误统计
echo "❌ 错误统计:"
grep -c "ERROR" logs/app.log

# 最近的错误
echo "🕐 最近 10 个错误:"
grep "ERROR" logs/app.log | tail -10

# 性能统计
echo "⚡ 慢查询统计:"
grep "slow query" logs/app.log | wc -l
```

## 📊 监控和告警

### 1. 设置监控指标
```javascript
// 监控关键指标
const metrics = {
  responseTime: [],
  errorRate: 0,
  activeUsers: 0,
  databaseConnections: 0
}

// 定期收集指标
setInterval(() => {
  collectMetrics()
}, 60000) // 每分钟收集一次
```

### 2. 告警配置
```javascript
// 设置告警阈值
const ALERT_THRESHOLDS = {
  RESPONSE_TIME: 5000, // 5秒
  ERROR_RATE: 0.05,    // 5%
  CPU_USAGE: 0.8,      // 80%
  MEMORY_USAGE: 0.9    // 90%
}

// 检查告警条件
function checkAlerts(metrics) {
  if (metrics.responseTime > ALERT_THRESHOLDS.RESPONSE_TIME) {
    sendAlert('响应时间过长', metrics)
  }
  // ... 其他检查
}
```

## 🆘 紧急情况处理

### 1. 服务宕机
```bash
# 快速重启服务
sudo systemctl restart zk-agent

# 或使用 PM2
pm2 restart zk-agent

# 检查服务状态
sudo systemctl status zk-agent
```

### 2. 数据库问题
```bash
# 数据库备份
pg_dump zkagent > backup_$(date +%Y%m%d_%H%M%S).sql

# 恢复数据库
psql zkagent < backup_file.sql
```

### 3. 回滚部署
```bash
# Git 回滚
git revert HEAD
git push origin main

# 或回滚到特定版本
git reset --hard <commit-hash>
git push --force-with-lease origin main
```

## 📞 获取帮助

如果以上解决方案都无法解决问题，请：

1. **收集信息**：
   - 错误日志
   - 系统配置
   - 重现步骤

2. **检查文档**：
   - [部署指南](./DEPLOYMENT.md)
   - [安全配置](./SECURITY.md)
   - [API 文档](./docs/api.md)

3. **寻求支持**：
   - 提交 GitHub Issue
   - 联系技术支持
   - 查看社区论坛

---

**提示**: 定期备份数据和配置文件，保持系统和依赖包的更新。