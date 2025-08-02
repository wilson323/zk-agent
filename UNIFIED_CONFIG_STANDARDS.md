# ZK-Agent 项目统一配置规范

## 📋 配置文件清单

### ✅ 保留的核心配置文件

- `.eslintrc.js` - ESLint 代码检查配置
- `.prettierrc` - Prettier 代码格式化配置
- `jest.config.js` - Jest 测试配置
- `jest.setup.js` - Jest 测试环境设置
- `tsconfig.json` - TypeScript 编译配置
- `next.config.mjs` - Next.js 应用配置
- `tailwind.config.ts` - Tailwind CSS 配置
- `package.json` - 项目依赖和脚本配置
- `.env.template` - 环境变量模板

### ❌ 已删除的冗余配置文件

- `.eslintrc.json` (冗余)
- `.eslintrc.enhanced.js` (冗余)
- `.prettierrc.js` (冗余)
- `.prettierrc.enhanced.js` (冗余)
- `jest.config.unified.js` (冗余)
- `jest.env.js` (冗余)
- `jest.setup.unified.js` (冗余)
- `tsconfig.dev.json` (冗余)
- `tsconfig.jest.json` (冗余)
- `tsconfig.prod.json` (冗余)

## 🔧 配置规范说明

### ESLint 配置规范

**文件**: `.eslintrc.js`

- 使用 TypeScript ESLint 解析器
- 集成 Next.js 和 React 规则
- 启用 Prettier 集成
- 配置导入排序和重复检测
- 测试文件特殊规则覆盖

### Prettier 配置规范

**文件**: `.prettierrc`

- 统一代码格式化标准
- 与 ESLint 配置兼容
- 支持 TypeScript 和 JSX

### Jest 配置规范

**文件**: `jest.config.js`

- 使用 ts-jest 预设
- jsdom 测试环境
- 路径别名映射
- 覆盖率阈值设置
- 测试文件匹配模式

### TypeScript 配置规范

**文件**: `tsconfig.json`

- 严格模式启用
- 路径别名配置
- Next.js 插件集成
- 编译目标和模块设置

## 📁 项目结构规范

```
zk-agent/
├── .eslintrc.js          # ESLint 配置
├── .prettierrc           # Prettier 配置
├── jest.config.js        # Jest 配置
├── jest.setup.js         # Jest 设置
├── tsconfig.json         # TypeScript 配置
├── next.config.mjs       # Next.js 配置
├── tailwind.config.ts    # Tailwind 配置
├── package.json          # 项目配置
├── .env.template         # 环境变量模板
├── app/                  # Next.js 应用目录
├── components/           # React 组件
├── lib/                  # 核心库文件
│   ├── utils/           # 工具函数
│   ├── types/           # 类型定义
│   └── config/          # 配置文件
├── __tests__/           # 测试文件
├── docs/                # 文档目录
└── scripts/             # 脚本文件
```

## 🚀 开发工作流

### 1. 代码检查

```bash
npm run lint          # ESLint 检查
npm run lint:fix      # 自动修复
```

### 2. 代码格式化

```bash
npm run format        # Prettier 格式化
```

### 3. 测试执行

```bash
npm test              # 运行测试
npm run test:coverage # 覆盖率测试
```

### 4. 类型检查

```bash
npm run type-check    # TypeScript 类型检查
```

## 📝 配置维护规则

### ✅ 允许的操作

1. 修改现有配置文件的规则和选项
2. 添加新的 ESLint 规则或插件
3. 更新依赖版本
4. 调整测试配置参数

### ❌ 禁止的操作

1. 创建重复的配置文件
2. 使用不同的配置格式（如 .json vs .js）
3. 绕过统一配置使用内联配置
4. 删除核心配置文件

## 🔍 配置验证

### 自动验证脚本

```bash
# 验证配置文件完整性
npm run validate:config

# 检查配置冲突
npm run check:conflicts
```

### 手动检查清单

- [ ] 只存在一个 ESLint 配置文件
- [ ] 只存在一个 Prettier 配置文件
- [ ] 只存在一个 Jest 配置文件
- [ ] 只存在一个主 TypeScript 配置文件
- [ ] 所有配置文件格式一致
- [ ] 环境变量使用模板文件

## 📞 支持与维护

如有配置相关问题，请：

1. 查阅本文档
2. 检查 `PROJECT_UNIFIED_STANDARDS.md`
3. 提交 Issue 或 PR

---

**最后更新**: 2024年12月30日
**维护者**: ZK-Agent 开发团队
