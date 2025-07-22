# ZK-Agent 项目统一规范

> **文档版本**: v2.0  
> **最后更新**: 2024年12月  
> **维护人员**: 项目管理团队  
> **状态**: 🔴 紧急统一中

## 📋 规范统一说明

**本文档是ZK-Agent项目的统一规范文档，旨在解决项目中存在的规范分散、配置冲突等问题，建立统一的开发标准。**

---

## 🚨 发现的规范问题

### 1. 配置文件冲突

- **ESLint配置冲突**: 存在`.eslintrc.js`、`.eslintrc.json`、`.eslintrc.enhanced.js`多个配置文件
- **Jest配置分散**: 多个Jest配置文件分布在不同目录
- **TypeScript配置重复**: `tsconfig.json`、`tsconfig.dev.json`、`tsconfig.jest.json`配置不一致

### 2. 文档规范分散

- 开发规范分散在多个文档中
- 规范版本不统一
- 部分规范内容重复或冲突

### 3. 目录结构不规范

- 临时文件和脚本未及时清理
- 配置文件位置不统一
- 文档目录结构混乱

---

## 🎯 统一规范目标

### 核心原则

1. **一个项目，一套规范** - 消除所有规范冲突
2. **配置文件统一** - 每种配置只保留一个主配置文件
3. **文档集中管理** - 所有规范文档统一管理
4. **持续维护** - 建立规范维护机制

---

## 🏗️ 统一项目结构规范

### 标准目录结构

```
zk-agent/
├── app/                    # Next.js App Router
│   ├── (public)/          # 用户端页面
│   │   ├── chat/          # 对话智能体
│   │   ├── cad-analyzer/  # CAD分析专家
│   │   ├── poster-generator/ # 海报设计师
│   │   └── profile/       # 用户中心
│   ├── admin/             # 管理端页面
│   │   ├── dashboard/     # 仪表板
│   │   ├── agents/        # 智能体管理
│   │   ├── ai-models/     # AI模型管理器
│   │   └── analytics/     # 数据分析
│   └── api/               # API路由
│       ├── ag-ui/         # 用户端API
│       └── admin/         # 管理端API
├── components/            # UI组件库
│   ├── ui/               # 基础UI组件
│   ├── business/         # 业务组件
│   └── admin/            # 管理端专用组件
├── lib/                  # 业务逻辑库
│   ├── agents/           # 智能体相关
│   ├── ai-models/        # AI模型管理
│   ├── auth/             # 认证授权
│   ├── chat/             # 对话系统
│   ├── cad/              # CAD分析
│   ├── poster/           # 海报生成
│   ├── database/         # 数据库操作
│   ├── utils/            # 工具函数
│   └── config/           # 配置管理
├── types/                # TypeScript类型定义
│   ├── core/             # 核心类型
│   ├── agents/           # 智能体类型
│   ├── api/              # API类型
│   └── admin/            # 管理端类型
├── config/               # 统一配置目录
│   ├── database.ts       # 数据库配置
│   ├── ai-providers.ts   # AI提供商配置
│   ├── env.ts            # 环境变量配置
│   └── constants.ts      # 常量定义
├── docs/                 # 项目文档
│   ├── standards/        # 规范文档
│   ├── api/              # API文档
│   ├── deployment/       # 部署文档
│   └── guides/           # 使用指南
├── __tests__/            # 测试文件
│   ├── unit/             # 单元测试
│   ├── integration/      # 集成测试
│   └── e2e/              # 端到端测试
├── scripts/              # 工具脚本
├── public/               # 静态资源
├── styles/               # 全局样式
└── prisma/               # 数据库Schema
```

### 文件命名规范

```typescript
// 统一文件命名约定
组件文件: PascalCase.tsx        (UserProfile.tsx)
Hook文件: use + PascalCase.ts    (useUserAuth.ts)
工具文件: camelCase.ts           (formatDate.ts)
类型文件: camelCase.types.ts     (user.types.ts)
API文件: kebab-case.ts           (user-profile.ts)
页面文件: kebab-case/page.tsx    (user-profile/page.tsx)
配置文件: kebab-case.config.ts   (database.config.ts)
常量文件: UPPER_CASE.ts          (API_CONSTANTS.ts)
```

---

## ⚙️ 统一配置规范

### 1. ESLint配置统一

**保留文件**: `.eslintrc.js` (主配置)
**删除文件**: `.eslintrc.json`, `.eslintrc.enhanced.js`

```javascript
// .eslintrc.js - 统一ESLint配置
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking',
    'next/core-web-vitals',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'import'],
  rules: {
    // TypeScript规则
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],

    // React规则
    'react/jsx-key': 'error',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // 导入规则
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],

    // 通用规则
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-var': 'error',
  },
};
```

### 2. Prettier配置统一

**保留文件**: `.prettierrc`

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "avoid",
  "endOfLine": "lf",
  "jsxSingleQuote": true
}
```

### 3. TypeScript配置统一

**主配置**: `tsconfig.json`
**扩展配置**: `tsconfig.dev.json`, `tsconfig.jest.json`

```json
// tsconfig.json - 主配置
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "ES6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["./components/*"],
      "@/lib/*": ["./lib/*"],
      "@/types/*": ["./types/*"],
      "@/config/*": ["./config/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", ".next", "dist", "build"]
}
```

### 4. Jest配置统一

**主配置**: `jest.config.js`
**删除**: 其他分散的Jest配置文件

```javascript
// jest.config.js - 统一Jest配置
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: [
    '<rootDir>/__tests__/**/*.(test|spec).{ts,tsx,js,jsx}',
    '<rootDir>/**/__tests__/**/*.(test|spec).{ts,tsx,js,jsx}',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/types/(.*)$': '<rootDir>/types/$1',
  },
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/*.config.{ts,js}',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

---

## 📝 代码开发规范

### 1. TypeScript开发规范

#### 类型定义规范

```typescript
// 接口定义 - 使用PascalCase
interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt?: Date;
}

// 类型别名 - 使用PascalCase
type UserRole = 'admin' | 'user' | 'guest';

// 枚举定义 - 使用PascalCase
enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
}

// 泛型约束
interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}
```

#### 函数定义规范

```typescript
/**
 * 用户数据处理函数
 * @param userData 用户数据对象
 * @param options 处理选项
 * @returns 处理后的用户数据
 * @throws {ValidationError} 当用户数据无效时抛出
 */
async function processUserData(
  userData: UserProfile,
  options: ProcessOptions = {}
): Promise<ProcessedUserData> {
  // 函数实现
}
```

### 2. React组件开发规范

#### 组件定义规范

```typescript
// 组件Props接口定义
interface UserCardProps {
  user: UserProfile;
  onEdit?: (user: UserProfile) => void;
  onDelete?: (userId: string) => void;
  className?: string;
}

// 组件定义 - 使用React.memo优化性能
const UserCard = React.memo<UserCardProps>(({
  user,
  onEdit,
  onDelete,
  className
}) => {
  // 组件逻辑
  const handleEdit = useCallback(() => {
    onEdit?.(user);
  }, [user, onEdit]);

  return (
    <div className={cn('user-card', className)}>
      {/* 组件内容 */}
    </div>
  );
});

UserCard.displayName = 'UserCard';
export default UserCard;
```

#### Hook开发规范

```typescript
/**
 * 用户认证Hook
 * @returns 用户认证状态和操作方法
 */
function useUserAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hook逻辑

  return {
    user,
    loading,
    error,
    login,
    logout,
    refresh,
  } as const;
}
```

### 3. API开发规范

#### API路由规范

```typescript
// app/api/users/route.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// 请求验证Schema
const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

/**
 * 创建用户API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = CreateUserSchema.parse(body);

    // API逻辑实现

    return NextResponse.json({
      success: true,
      data: newUser,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
}
```

---

## 🧪 测试规范

### 1. 测试文件组织

```
__tests__/
├── unit/                  # 单元测试
│   ├── components/        # 组件测试
│   ├── hooks/            # Hook测试
│   ├── utils/            # 工具函数测试
│   └── lib/              # 业务逻辑测试
├── integration/          # 集成测试
│   ├── api/              # API集成测试
│   └── database/         # 数据库集成测试
└── e2e/                  # 端到端测试
    ├── user-flows/       # 用户流程测试
    └── admin-flows/      # 管理端流程测试
```

### 2. 测试命名规范

```typescript
// 组件测试示例
describe('UserCard Component', () => {
  it('should render user information correctly', () => {
    // 测试实现
  });

  it('should call onEdit when edit button is clicked', () => {
    // 测试实现
  });

  it('should handle loading state properly', () => {
    // 测试实现
  });
});
```

### 3. 测试覆盖率要求

- **单元测试覆盖率**: ≥ 80%
- **集成测试覆盖率**: ≥ 70%
- **关键业务逻辑**: 100%
- **API端点**: 100%

---

## 📚 文档规范

### 1. 文档分类

- **规范文档**: 开发规范、代码规范、流程规范
- **技术文档**: API文档、架构文档、部署文档
- **用户文档**: 使用指南、FAQ、故障排除
- **项目文档**: 需求文档、设计文档、测试文档

### 2. 文档格式规范

```markdown
# 文档标题

> **文档版本**: v1.0  
> **最后更新**: 2024年12月  
> **维护人员**: 责任人姓名  
> **状态**: 🟢 已完成 / 🟡 进行中 / 🔴 待处理

## 概述

文档概述内容...

## 详细内容

### 子章节

内容...

---

## 更新记录

| 版本 | 日期       | 更新内容 | 更新人 |
| ---- | ---------- | -------- | ------ |
| v1.0 | 2024-12-XX | 初始版本 | XXX    |
```

### 3. 代码注释规范

````typescript
/**
 * 函数功能描述
 *
 * @param param1 参数1描述
 * @param param2 参数2描述
 * @returns 返回值描述
 * @throws {ErrorType} 异常描述
 *
 * @example
 * ```typescript
 * const result = functionName(param1, param2);
 * console.log(result);
 * ```
 */
function functionName(param1: string, param2: number): ReturnType {
  // 实现逻辑
}
````

---

## 🔧 工具配置规范

### 1. VS Code配置

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "files.exclude": {
    "node_modules": true,
    ".next": true,
    "dist": true,
    "build": true
  }
}
```

### 2. Git配置

```bash
# .gitignore 统一配置
node_modules/
.next/
dist/
build/
coverage/
.env.local
.env.*.local
*.log
.DS_Store
```

### 3. Husky配置

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
npm run type-check
npm run test:changed
```

---

## 🚀 部署规范

### 1. 环境配置

- **开发环境**: `development`
- **测试环境**: `testing`
- **预生产环境**: `staging`
- **生产环境**: `production`

### 2. 环境变量管理

```bash
# .env.example - 环境变量模板
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
FASTGPT_API_URL=https://...
FASTGPT_API_KEY=sk-...
```

### 3. 构建配置

```json
// package.json scripts
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx",
    "lint:fix": "eslint . --ext .ts,.tsx,.js,.jsx --fix",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:changed": "jest --onlyChanged"
  }
}
```

---

## 📊 质量保证

### 1. 代码质量指标

- **ESLint错误**: 0个
- **TypeScript错误**: 0个
- **测试覆盖率**: ≥ 80%
- **构建成功率**: 100%
- **性能评分**: ≥ 90分

### 2. 代码审查清单

- [ ] 代码符合ESLint规范
- [ ] TypeScript类型定义完整
- [ ] 单元测试覆盖率达标
- [ ] 组件性能优化到位
- [ ] API错误处理完善
- [ ] 文档更新及时
- [ ] 安全性检查通过

### 3. 发布流程

1. **开发完成** → 自测通过
2. **代码审查** → 同行评审
3. **自动化测试** → CI/CD流水线
4. **集成测试** → 测试环境验证
5. **预生产验证** → 生产环境模拟
6. **生产发布** → 监控和回滚准备

---

## 🔄 规范维护

### 1. 定期审查

- **月度审查**: 规范执行情况检查
- **季度更新**: 规范内容优化调整
- **年度评估**: 规范体系全面评估

### 2. 问题反馈

- **规范问题**: 通过Issue提交
- **改进建议**: 通过PR提交
- **紧急修复**: 直接联系维护人员

### 3. 培训机制

- **新员工培训**: 规范入门培训
- **定期培训**: 规范更新培训
- **专项培训**: 特定技术规范培训

---

## 📞 联系方式

### 规范维护团队

- **项目负责人**: 项目经理
- **技术负责人**: 架构师
- **文档维护**: 技术文档工程师
- **质量保证**: QA工程师

### 问题反馈渠道

- **技术问题**: GitHub Issues
- **规范建议**: 团队会议讨论
- **紧急问题**: 直接联系负责人

---

## 📋 执行清单

### 立即执行任务

- [ ] 删除冗余的ESLint配置文件
- [ ] 统一Jest配置文件
- [ ] 清理临时脚本文件
- [ ] 整理文档目录结构
- [ ] 更新package.json脚本

### 短期任务（1周内）

- [ ] 建立代码审查流程
- [ ] 配置自动化测试流水线
- [ ] 完善文档模板
- [ ] 建立规范培训计划

### 中期任务（1个月内）

- [ ] 完善监控和告警机制
- [ ] 建立性能基准测试
- [ ] 优化构建和部署流程
- [ ] 建立规范执行检查机制

---

**本文档将作为项目的统一规范标准，所有团队成员必须严格遵守。任何对规范的修改都需要经过团队讨论和批准。**
