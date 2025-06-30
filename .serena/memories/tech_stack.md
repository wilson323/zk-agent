# 技术栈和依赖

## 核心依赖
- **@prisma/client**: 5.22.0 - Prisma数据库客户端
- **next**: 最新版本 - React全栈框架
- **react**: 最新版本 - 前端框架
- **typescript**: 最新版本 - 类型安全
- **ioredis**: Redis客户端
- **pg**: PostgreSQL客户端

## 开发依赖
- **prisma**: 5.22.0 - 数据库工具
- **jest**: 测试框架
- **@playwright/test**: E2E测试
- **eslint**: 代码检查
- **prettier**: 代码格式化
- **husky**: Git钩子
- **lint-staged**: 暂存文件检查

## 数据库架构
- **数据库**: PostgreSQL
- **ORM**: Prisma
- **核心模型**: User, ChatSession, ChatMessage, PosterTask, SystemConfig等
- **枚举**: Role, UserStatus, TaskStatus, AgentType等

## 安全和监控
- SSL/TLS配置
- 密码安全策略
- 连接池优化
- 性能监控
- 错误日志记录