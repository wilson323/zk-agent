# 🚀 ZK-Agent 部署指南

本文档提供了 ZK-Agent 项目的完整部署指南，包括开发环境、测试环境和生产环境的配置。

## 📋 部署前检查清单

### 系统要求
- Node.js >= 18.0.0
- npm >= 8.0.0
- PostgreSQL >= 13
- Redis >= 6.0
- Git

### 必需的环境变量
```bash
# 数据库配置
DATABASE_URL="postgresql://username:password@localhost:5432/zkagent"
DATABASE_URL_PROD="postgresql://username:password@prod-host:5432/zkagent_prod"

# 身份认证
NEXTAUTH_SECRET="your-nextauth-secret-key"
JWT_SECRET="your-jwt-secret-key"

# API 密钥
OPENAI_API_KEY="your-openai-api-key"
FASTGPT_API_KEY="your-fastgpt-api-key"
FASTGPT_BASE_URL="https://api.fastgpt.in/api"

# Redis 配置
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD="your-redis-password"
```

## 🔧 开发环境部署

### 1. 克隆项目
```bash
git clone <repository-url>
cd zk-agent
```

### 2. 安装依赖
```bash
npm install
```

### 3. 配置环境变量
```bash
# 复制环境变量模板
cp .env.example .env.local

# 编辑环境变量
nano .env.local
```

### 4. 数据库设置
```bash
# 生成 Prisma 客户端
npm run db:generate

# 运行数据库迁移
npm run db:migrate

# 填充测试数据（可选）
npm run db:seed
```

### 5. 启动开发服务器
```bash
npm run dev
```

## 🧪 测试环境部署

### 1. 运行测试套件
```bash
# 运行所有测试
npm run test:all

# 运行安全测试
npm run test:security

# 运行性能测试
npm run test:performance
```

### 2. 代码质量检查
```bash
# ESLint 检查
npm run lint

# TypeScript 类型检查
npm run type-check

# 格式化代码
npm run format
```

### 3. 构建测试
```bash
npm run build
```

## 🌐 生产环境部署

### 1. 环境准备
```bash
# 设置生产环境变量
export NODE_ENV=production

# 安装生产依赖
npm ci --only=production
```

### 2. 数据库迁移
```bash
# 生产环境数据库迁移
npm run db:migrate:deploy
```

### 3. 构建应用
```bash
npm run build:production
```

### 4. 启动生产服务器
```bash
npm run start:production
```

## 🐳 Docker 部署

### 1. 构建 Docker 镜像
```bash
docker build -t zk-agent .
```

### 2. 运行容器
```bash
docker run -d \
  --name zk-agent \
  -p 3000:3000 \
  --env-file .env.production \
  zk-agent
```

### 3. Docker Compose 部署
```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: zkagent
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}

volumes:
  postgres_data:
```

## 🔒 安全配置

### 1. SSL/TLS 配置
```bash
# 使用 Let's Encrypt 获取 SSL 证书
certbot --nginx -d yourdomain.com
```

### 2. 防火墙设置
```bash
# 只开放必要端口
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw enable
```

### 3. 数据库安全
```sql
-- 创建专用数据库用户
CREATE USER zkagent_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE zkagent TO zkagent_user;
GRANT USAGE ON SCHEMA public TO zkagent_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO zkagent_user;
```

## 📊 监控和日志

### 1. 应用监控
```bash
# 启用性能监控
export ENABLE_PERFORMANCE_MONITORING=true

# 启用错误追踪
export ENABLE_ERROR_TRACKING=true
```

### 2. 日志配置
```bash
# 设置日志级别
export LOG_LEVEL=info

# 设置日志文件路径
export LOG_FILE_PATH=/var/log/zk-agent/app.log
```

### 3. 健康检查
```bash
# 数据库健康检查
npm run db:health-check

# 应用健康检查
curl http://localhost:3000/api/health
```

## 🔄 CI/CD 配置

### GitHub Actions 示例
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:ci
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to server
        run: |
          # 部署脚本
          ssh user@server 'cd /app && git pull && npm ci && npm run build && pm2 restart zk-agent'
```

## 🚨 故障排除

### 常见问题

1. **数据库连接失败**
   ```bash
   # 检查数据库连接
   npm run db:test-connection
   ```

2. **端口被占用**
   ```bash
   # 查找占用端口的进程
   netstat -tulpn | grep :3000
   ```

3. **内存不足**
   ```bash
   # 增加 Node.js 内存限制
   export NODE_OPTIONS="--max-old-space-size=4096"
   ```

### 性能优化

1. **启用 Gzip 压缩**
2. **配置 CDN**
3. **数据库索引优化**
4. **Redis 缓存策略**

## 📞 支持

如果在部署过程中遇到问题，请：

1. 查看 [故障排除指南](./TROUBLESHOOTING.md)
2. 检查 [安全配置文档](./SECURITY.md)
3. 提交 Issue 到项目仓库

---

**注意**: 请确保在生产环境中使用强密码和安全的配置。定期更新依赖包和安全补丁。