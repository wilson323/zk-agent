最大模型上下大模型最大上下文长度128k因此注意最大长度不要超过128k需要分步骤写入

用汉语回复





  项目概述



  这是一个生产级多智能体系统，集成AI对话、CAD分析、海报设计的统一平台。基于Next.js 14 +

  TypeScript构建，支持云原生部署。



  核心架构



  - 前端: Next.js 14 App Router, React 18, TypeScript 5.4

  - 后端: Next.js API Routes + Prisma ORM + PostgreSQL

  - AI引擎: 集成AutoGen/CrewAI/LangGraph三大框架

  - 缓存: Redis多级缓存策略

  - 部署: Docker容器化 + K8s编排



  目录结构



  /lib                核心业务逻辑

  ├── agents         智能体管理

  ├── cad           CAD分析引擎

  ├── poster        海报生成系统

  ├── chat         聊天系统

  ├── database     数据库连接池

  ├── auth         认证授权

  └── cache        缓存管理

  /components      组件库（按功能分类）

  /app            Next.js页面/API

  /types          TypeScript类型定义

  /scripts        自动化脚本



  常用命令



  # 开发

  npm run dev                 # 本地开发

  npm run type-check         # 类型检查

  npm run lint               # 代码检查

  npm run lint:fix          # 自动修复



  # 测试

  npm run test              # 运行全部测试

  npm run test:unit         # 单元测试

  npm run test:integration  # 集成测试

  npm run test:e2e          # Playwright端到端

  npm run test:watch        # 监听模式



  # 数据库

  npm run db:migrate        # 应用迁移

  npm run db:generate       # 生成客户端

  npm run db:seed          # 初始化数据

  npm run db:studio        # Prisma管理界面



  # 生产部署

  npm run build            # 生产构建

  npm run build:production # 生产环境专属

  npm run start            # 生产启动



  # 质量监控

  npm run monitor:all      # 全面监控检查

  npm run quality:check    # 质量门禁

  npm run security:scan    # 安全扫描

  npm run performance:test # 性能测试



  开发规范



  1. 接口驱动开发：先定义类型接口

  2. 依赖注入：统一服务管理

  3. 组件工厂：标准化组件开发

  4. 错误边界：全流程异常处理

  5. 测试优先：覆盖率>98%



  环境建议



  - Node.js 18+, PostgreSQL 14+, Redis 6+

  - 使用Docker Compose管理本地依赖

  - .env.local配置环境变量

  - Prisma初始化后立即生成客户端

