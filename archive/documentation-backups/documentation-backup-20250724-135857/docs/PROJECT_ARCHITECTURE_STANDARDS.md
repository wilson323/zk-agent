# ZK-Agent 项目架构统一标准

## 概述

本文档定义了 ZK-Agent 项目的统一架构标准，旨在解决当前项目中存在的架构不一致和代码冗余问题，确保项目的可维护性和扩展性。

## 1. 前端架构统一标准

### 1.1 主架构选择

**确定架构：Next.js App Router**
- 主目录：`app/` - Next.js App Router 架构
- 组件库：`components/` - 共享UI组件库
- 工具库：`lib/` - 工具函数和服务

### 1.2 目录结构规范

```
zk-agent/
├── app/                    # Next.js App Router 主架构
│   ├── (user)/            # 用户端页面组
│   ├── admin/             # 管理端页面
│   ├── api/               # API 路由
│   ├── auth/              # 认证页面
│   ├── globals.css        # 全局样式
│   ├── layout.tsx         # 根布局
│   └── page.tsx           # 首页
├── components/            # 共享组件库
│   ├── admin/             # 管理端组件
│   ├── ag-ui/             # AG-UI 协议组件
│   ├── auth/              # 认证组件
│   ├── chat/              # 聊天组件
│   ├── ui/                # 基础UI组件
│   └── ...
├── lib/                   # 工具库
│   ├── ag-ui/             # AG-UI 适配器
│   ├── api/               # API 客户端
│   ├── engines/           # 引擎服务
│   └── utils/             # 工具函数
└── types/                 # TypeScript 类型定义
```

### 1.3 需要清理的冗余目录

**立即清理：**
- `src/` - 空目录结构，仅包含 .gitkeep 文件
- `frontend/src/` - 重复的前端架构

**迁移策略：**
1. 检查 `frontend/src/` 中的有效代码
2. 将有效组件迁移到 `components/` 目录
3. 将状态管理迁移到 `lib/stores/` 目录
4. 删除冗余目录

## 2. 后端架构标准

### 2.1 目录结构（已规范）

```
backend/
├── app/
│   ├── api/               # API 版本管理
│   ├── core/              # 核心配置
│   ├── models/            # 数据模型
│   ├── routers/           # 路由处理
│   ├── services/          # 业务服务
│   └── utils/             # 工具函数
├── main.py                # 应用入口
└── requirements.txt       # 依赖管理
```

### 2.2 服务规范

**命名规范：**
- 文件名：`{功能}_service.py`
- 类名：`{功能}Service`
- 方法名：使用动词开头的驼峰命名

**依赖注入：**
- 使用依赖注入模式
- 统一的服务基类
- 配置管理集中化

## 3. 文档架构标准

### 3.1 文档目录结构

```
docs/
├── api/                   # API 文档
├── architecture/          # 架构设计文档
├── database/              # 数据库设计文档
├── frontend/              # 前端设计文档
├── optimization/          # 优化方案文档
└── PROJECT_ARCHITECTURE_STANDARDS.md  # 本文档
```

### 3.2 根目录文档规范

**保留文档：**
- `README.md` - 项目介绍和快速开始
- `DEPLOYMENT.md` - 部署指南
- `SECURITY.md` - 安全指南
- `TROUBLESHOOTING.md` - 故障排除

**需要整理的文档：**
- 多个重复的优化报告文件
- 临时生成的分析报告
- 过期的备份文件

## 4. 配置文件标准

### 4.1 统一配置管理

**前端配置：**
- `next.config.mjs` - Next.js 配置
- `tailwind.config.ts` - Tailwind CSS 配置
- `tsconfig.json` - TypeScript 配置
- `components.json` - shadcn/ui 配置

**后端配置：**
- `backend/app/core/config.py` - 应用配置
- `backend/requirements.txt` - Python 依赖

**开发工具配置：**
- `.eslintrc.js` - ESLint 配置
- `.prettierrc` - Prettier 配置
- `jest.config.js` - Jest 测试配置

### 4.2 环境变量管理

```
.env.local          # 本地开发环境
.env.production     # 生产环境
.env.example        # 环境变量模板
```

## 5. 代码规范标准

### 5.1 导入路径规范

**绝对路径导入：**
```typescript
// 正确
import { Button } from '@/components/ui/button'
import { AgentService } from '@/lib/services/agent-service'

// 错误
import { Button } from '../../../components/ui/button'
```

**路径别名配置：**
```json
{
  "@/*": ["./*"],
  "@/components/*": ["./components/*"],
  "@/lib/*": ["./lib/*"],
  "@/app/*": ["./app/*"]
}
```

### 5.2 组件命名规范

**文件命名：**
- 组件文件：`PascalCase.tsx`
- 工具文件：`kebab-case.ts`
- 页面文件：`page.tsx`, `layout.tsx`

**组件导出：**
```typescript
// 默认导出
export default function ComponentName() {}

// 命名导出（工具函数）
export { functionName, ClassName }
```

## 6. 测试架构标准

### 6.1 测试目录结构

```
tests/
├── __tests__/
│   ├── unit/              # 单元测试
│   ├── integration/       # 集成测试
│   ├── api/               # API 测试
│   └── e2e/               # 端到端测试
├── __mocks__/             # Mock 文件
└── performance/           # 性能测试
```

### 6.2 测试命名规范

```
{功能}.test.ts             # 单元测试
{功能}.integration.test.ts # 集成测试
{功能}.e2e.test.ts         # 端到端测试
```

## 7. 部署架构标准

### 7.1 容器化标准

**Docker 配置：**
- `Dockerfile` - 生产环境镜像
- `Dockerfile.test` - 测试环境镜像
- `docker-compose.yml` - 开发环境
- `docker-compose.prod.yml` - 生产环境

### 7.2 CI/CD 标准

**GitHub Actions：**
- 统一的工作流配置
- 避免重复的备份文件
- 清理过期的配置

## 8. 实施计划

### 8.1 第一阶段：清理冗余（1-2天）

1. **删除空目录：**
   ```bash
   # 删除 src/ 目录（仅包含空文件）
   rm -rf src/
   ```

2. **检查 frontend/ 目录：**
   - 分析 `frontend/src/components/` 中的组件
   - 分析 `frontend/src/stores/` 中的状态管理
   - 确定迁移策略

3. **清理根目录文档：**
   - 整理重复的报告文件
   - 删除临时分析文件
   - 保留核心文档

### 8.2 第二阶段：代码迁移（2-3天）

1. **迁移有效代码：**
   - 将 `frontend/src/components/` 迁移到 `components/`
   - 将 `frontend/src/stores/` 迁移到 `lib/stores/`
   - 更新导入路径

2. **更新配置文件：**
   - 更新 TypeScript 路径配置
   - 更新 ESLint 和 Prettier 配置
   - 更新测试配置

### 8.3 第三阶段：验证和优化（1-2天）

1. **功能验证：**
   - 运行所有测试
   - 验证构建过程
   - 检查页面功能

2. **性能优化：**
   - 优化导入路径
   - 清理未使用的依赖
   - 优化构建配置

## 9. 维护标准

### 9.1 代码审查标准

**必检项目：**
- 架构一致性
- 导入路径规范
- 命名规范
- 文档更新

### 9.2 持续监控

**自动化检查：**
- ESLint 规则检查
- 依赖关系分析
- 构建时间监控
- 代码重复度检查

## 10. 总结

本标准旨在建立统一、可维护的项目架构。所有团队成员必须严格遵循这些标准，确保项目的长期健康发展。

**核心原则：**
1. **统一性** - 一个项目一套架构
2. **简洁性** - 避免不必要的复杂性
3. **可维护性** - 清晰的结构和命名
4. **可扩展性** - 支持未来功能扩展
5. **一致性** - 统一的代码风格和规范

---

**文档版本：** v1.0.0  
**创建日期：** 2024-01-24  
**最后更新：** 2024-01-24  
**维护者：** ZK-Agent 架构团队