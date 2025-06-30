# ZK-Agent 数据库设置指南

## 概述

本文档介绍如何为 ZK-Agent 项目设置和配置 PostgreSQL 数据库。

## 数据库信息

- **数据库名称**: `zk_agent`
- **主机**: `localhost`
- **端口**: `5432`
- **用户名**: `postgres`
- **密码**: `123456`

## 快速设置

### 方法一：使用 PowerShell 脚本（推荐）

```powershell
# 完整设置数据库（检查、创建、初始化）
.\scripts\setup-database.ps1 -Action setup

# 测试数据库连接
.\scripts\setup-database.ps1 -Action test

# 重置数据库（删除并重新创建）
.\scripts\setup-database.ps1 -Action reset
```

### 方法二：使用 Node.js 脚本

```bash
# 测试数据库连接
node scripts/test-db-connection.js test

# 检查数据库是否存在
node scripts/test-db-connection.js check

# 创建数据库（如果不存在）
node scripts/test-db-connection.js create

# 初始化数据库结构
node scripts/test-db-connection.js init
```

## 手动设置

### 1. 创建数据库

```sql
CREATE DATABASE "zk_agent";
```

### 2. 初始化数据库结构

```bash
psql -h localhost -p 5432 -U postgres -d zk_agent -f scripts/init-zk-agent-db.sql
```

## 数据库结构

数据库包含以下核心表：

### 用户管理
- `users` - 用户信息表
- `api_keys` - API密钥管理表

### 对话系统
- `conversations` - 对话记录表
- `messages` - 消息记录表

### 功能模块
- `cad_analyses` - CAD分析记录表
- `poster_generations` - 海报生成记录表

### 系统管理
- `system_configs` - 系统配置表
- `audit_logs` - 审计日志表

## 配置文件

数据库配置位于以下文件：

- `config/database.config.js` - 主要数据库配置
- `lib/database/database.config.js` - 扩展数据库配置

### 环境配置

项目支持多环境配置：

- **开发环境**: `zk_agent`
- **测试环境**: `zk_agent_test`
- **生产环境**: `zk_agent`

## 故障排除

### 常见问题

1. **PostgreSQL 服务未运行**
   ```powershell
   # 启动 PostgreSQL 服务
   Start-Service postgresql*
   ```

2. **psql 命令不可用**
   - 确保 PostgreSQL 客户端工具已安装
   - 将 PostgreSQL bin 目录添加到 PATH 环境变量
   - 通常位于：`C:\Program Files\PostgreSQL\[版本]\bin\`

3. **连接被拒绝**
   - 检查 PostgreSQL 服务状态
   - 验证主机、端口、用户名和密码
   - 检查防火墙设置

4. **权限不足**
   - 确保用户具有创建数据库的权限
   - 使用超级用户（如 postgres）进行初始设置

### 日志检查

```bash
# 查看 PostgreSQL 日志
# Windows: C:\Program Files\PostgreSQL\[版本]\data\log
# 或查看 Windows 事件查看器
```

## 安全注意事项

1. **生产环境**：
   - 更改默认密码
   - 使用强密码策略
   - 限制网络访问
   - 启用 SSL 连接

2. **开发环境**：
   - 不要在代码中硬编码密码
   - 使用环境变量管理敏感信息
   - 定期备份重要数据

## 备份和恢复

### 备份数据库

```bash
pg_dump -h localhost -p 5432 -U postgres -d zk_agent > backup.sql
```

### 恢复数据库

```bash
psql -h localhost -p 5432 -U postgres -d zk_agent < backup.sql
```

## 性能优化

1. **连接池配置**：项目已配置连接池，默认最大连接数为 20
2. **索引优化**：关键字段已创建索引
3. **查询优化**：使用 EXPLAIN 分析慢查询

## 监控和维护

1. **健康检查**：项目包含数据库健康检查功能
2. **连接监控**：监控活跃连接数和慢查询
3. **定期维护**：定期执行 VACUUM 和 ANALYZE

## 支持

如果遇到问题，请：

1. 检查本文档的故障排除部分
2. 查看项目日志文件
3. 联系开发团队获取支持

---

**最后更新**: 2025-01-27  
**版本**: 1.0.0  
**维护者**: ZK-Agent Team