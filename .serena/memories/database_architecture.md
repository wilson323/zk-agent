# 数据库架构

## 数据库配置
- **数据库**: PostgreSQL
- **ORM**: Prisma 5.22.0
- **连接池**: 增强连接池管理
- **监控**: 实时性能监控
- **安全**: SSL/TLS + 密码策略

## 核心数据模型

### 用户管理
- **User**: 用户基础信息
- **RefreshToken**: 刷新令牌
- **PasswordReset**: 密码重置

### 聊天系统
- **ChatSession**: 聊天会话
- **ChatMessage**: 聊天消息

### 海报系统
- **PosterStyle**: 海报样式
- **PosterSize**: 海报尺寸
- **ColorPalette**: 调色板
- **PosterTemplate**: 海报模板
- **PosterTemplateTag**: 模板标签
- **PosterTask**: 海报任务
- **PosterGeneration**: 海报生成记录

### 系统配置
- **SystemConfig**: 系统配置
- **AgentConfig**: 代理配置
- **IndustryConfig**: 行业配置

### 监控和日志
- **UsageStats**: 使用统计
- **ErrorLog**: 错误日志
- **Like**: 点赞记录

## 枚举类型
- **Role**: USER, ADMIN
- **UserStatus**: ACTIVE, INACTIVE, SUSPENDED
- **TaskStatus**: PENDING, PROCESSING, COMPLETED, FAILED
- **AgentType**: CHAT, POSTER, ANALYSIS
- **AgentStatus**: ACTIVE, INACTIVE, MAINTENANCE
- **LogLevel**: DEBUG, INFO, WARN, ERROR, FATAL

## 数据库管理特性
- 连接池优化
- 查询性能监控
- 慢查询检测
- 自动重连机制
- 健康检查
- 缓存集成
- 事务管理
- 错误恢复