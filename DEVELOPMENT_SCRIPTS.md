# ZK-Agent 开发环境脚本使用指南

本项目提供了一套完整的Windows批处理脚本，帮助开发者快速设置、管理和监控开发环境。

## 📋 脚本概览

| 脚本名称 | 功能描述 | 使用场景 |
|---------|---------|----------|
| `setup-dev.bat` | 🚀 一键设置开发环境 | 新项目初始化、环境重置 |
| `start-dev.bat` | ▶️ 启动开发环境 | 日常开发启动 |
| `stop-dev.bat` | ⏹️ 停止开发环境 | 结束开发、系统维护 |
| `restart-dev.bat` | 🔄 重启开发环境 | 配置更新、问题排查 |
| `check-dev-status.bat` | 📊 检查环境状态 | 问题诊断、状态监控 |

## 🚀 快速开始

### 首次使用

1. **克隆项目后，首次设置开发环境：**
   ```bash
   # 以管理员身份运行（推荐）
   setup-dev.bat
   ```

2. **日常开发启动：**
   ```bash
   start-dev.bat
   ```

3. **检查环境状态：**
   ```bash
   check-dev-status.bat
   ```

## 📖 详细说明

### 1. setup-dev.bat - 开发环境设置

**功能特性：**
- ✅ 自动检查必要工具（Node.js、Python、pnpm、Docker）
- ✅ 智能安装缺失依赖
- ✅ 配置环境变量（.env文件）
- ✅ 安装前端和后端依赖
- ✅ 初始化数据库（支持Docker和本地PostgreSQL）
- ✅ 运行代码质量检查
- ✅ 构建项目

**使用步骤：**
```bash
# 1. 以管理员身份打开命令提示符
# 2. 导航到项目根目录
cd /d "E:\zk-agent"

# 3. 运行设置脚本
setup-dev.bat
```

**交互选项：**
- 环境变量配置：选择是否编辑.env文件
- 数据库部署：选择Docker或本地PostgreSQL
- 立即启动：设置完成后是否启动开发环境

### 2. start-dev.bat - 启动开发环境

**功能特性：**
- 🔍 环境检查（Node.js、Python、pnpm、Docker）
- ⚙️ 环境变量配置
- 📦 依赖安装和更新
- 🗄️ 数据库初始化和健康检查
- 🔍 代码质量检查
- 🚀 并行启动前后端服务
- 🌐 自动打开浏览器

**启动的服务：**
- 前端服务：http://localhost:3000
- 后端服务：http://localhost:8000
- 数据库服务：PostgreSQL + Redis（如果使用Docker）

**使用方法：**
```bash
start-dev.bat
```

### 3. stop-dev.bat - 停止开发环境

**功能特性：**
- 🛑 停止前端Next.js服务
- 🛑 停止Python后端服务
- 🛑 停止Docker服务（可选）
- 🧹 清理临时文件和进程
- 📊 最终状态检查

**使用方法：**
```bash
stop-dev.bat
```

### 4. restart-dev.bat - 重启开发环境

**功能特性：**
- 🔄 智能停止现有服务
- 🔍 快速健康检查
- 🗄️ 数据库连接验证
- 🧹 缓存清理
- 🚀 重新启动服务

**使用场景：**
- 配置文件更新后
- 依赖包更新后
- 服务异常时
- 数据库连接问题时

**使用方法：**
```bash
restart-dev.bat
```

### 5. check-dev-status.bat - 环境状态检查

**检查项目：**
- 🔧 系统环境（Node.js、Python、pnpm、Docker）
- ⚙️ 项目配置（.env文件、依赖安装）
- 🌐 服务运行状态（端口占用）
- 🐳 Docker服务状态
- 🗄️ 数据库连接
- 🏥 HTTP服务健康检查
- 📝 日志和报告

**状态指示：**
- 🟢 ✓ 正常
- 🟡 ⚠ 警告
- 🔴 ✗ 错误

**使用方法：**
```bash
check-dev-status.bat
```

## 🛠️ 环境要求

### 必需工具
- **Node.js** 18+ (LTS推荐)
- **Python** 3.8+
- **pnpm** (脚本会自动安装)

### 可选工具
- **Docker Desktop** (推荐，用于数据库服务)
- **Git** (版本控制)

### 系统要求
- Windows 10/11
- PowerShell 5.0+
- 管理员权限（推荐）

## 🔧 配置说明

### 环境变量配置

脚本会自动从`.env.example`创建`.env`文件，需要配置以下关键变量：

```env
# 数据库连接
DATABASE_URL="postgresql://username:password@localhost:5432/zkagent"

# API密钥
OPENAI_API_KEY="your-openai-api-key"
ANTHROPIC_API_KEY="your-anthropic-api-key"

# 其他配置
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### 数据库配置

**Docker方式（推荐）：**
```bash
# 脚本会自动启动
docker-compose up -d postgres redis
```

**本地PostgreSQL：**
```bash
# 确保PostgreSQL服务运行
# 配置正确的DATABASE_URL
```

## 🚨 故障排除

### 常见问题

**1. 端口占用**
```bash
# 检查端口占用
netstat -ano | findstr ":3000"
netstat -ano | findstr ":8000"

# 终止占用进程
taskkill /PID <进程ID> /F
```

**2. 依赖安装失败**
```bash
# 清理缓存
pnpm store prune
npm cache clean --force

# 重新安装
rm -rf node_modules
pnpm install
```

**3. 数据库连接失败**
```bash
# 检查数据库服务
docker ps
docker-compose logs postgres

# 重启数据库服务
docker-compose restart postgres
```

**4. Python环境问题**
```bash
# 重建虚拟环境
cd backend
rmdir /s .venv
python -m venv .venv
call .venv\Scripts\activate.bat
pip install -r requirements.txt
```

### 日志位置

- **前端日志**: 控制台输出
- **后端日志**: `backend/logs/`
- **数据库日志**: Docker容器日志
- **质量报告**: `quality-reports/`

## 📊 性能优化

### 启动优化

1. **使用SSD存储**
2. **关闭不必要的防病毒实时扫描**
3. **增加Node.js内存限制**：
   ```bash
   set NODE_OPTIONS=--max-old-space-size=4096
   ```

### 开发优化

1. **启用热重载**
2. **使用增量构建**
3. **配置IDE排除node_modules**

## 🔄 更新和维护

### 定期维护

```bash
# 1. 更新依赖
pnpm update
pip install -r requirements.txt --upgrade

# 2. 清理缓存
pnpm store prune
docker system prune

# 3. 运行质量检查
npm run quality:check

# 4. 备份数据库
npm run db:backup
```

### 脚本更新

脚本会随项目更新，建议定期检查更新：

```bash
git pull origin main
# 检查脚本是否有更新
```

## 🤝 贡献指南

如果你发现脚本问题或有改进建议：

1. 创建Issue描述问题
2. 提交Pull Request
3. 更新相关文档

## 📞 支持

- **文档**: `docs/`目录
- **Issues**: GitHub Issues页面
- **讨论**: GitHub Discussions

---

**提示**: 建议将这些脚本添加到系统PATH中，以便在任何位置快速调用。

```bash
# 添加到PATH（可选）
set PATH=%PATH%;E:\zk-agent
```