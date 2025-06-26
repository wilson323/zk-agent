# 组件标准化迁移指南

本指南提供了将现有组件迁移到组件标准库的详细步骤和最佳实践。

## 目录

- [迁移概述](#迁移概述)
- [迁移前准备](#迁移前准备)
- [分阶段迁移策略](#分阶段迁移策略)
- [具体迁移步骤](#具体迁移步骤)
- [兼容性处理](#兼容性处理)
- [测试和验证](#测试和验证)
- [常见问题](#常见问题)
- [迁移检查清单](#迁移检查清单)

## 迁移概述

### 迁移目标

- ✅ 统一组件设计和行为
- ✅ 提升可访问性和性能
- ✅ 增强类型安全和开发体验
- ✅ 建立可维护的组件架构
- ✅ 保持向后兼容性

### 迁移原则

1. **渐进式迁移**: 逐步迁移，避免大规模重构
2. **向后兼容**: 保持现有 API 的兼容性
3. **测试驱动**: 每个迁移步骤都要有充分的测试
4. **文档同步**: 及时更新文档和示例
5. **性能优先**: 确保迁移后性能不降低

## 迁移前准备

### 1. 环境检查

```bash
# 检查 Node.js 版本 (推荐 18+)
node --version

# 检查包管理器
npm --version
# 或
yarn --version
# 或
pnpm --version
```

### 2. 依赖安装

```bash
# 安装必要的依赖
npm install class-variance-authority clsx tailwind-merge
npm install @radix-ui/react-slot @radix-ui/react-focus-scope
npm install framer-motion lucide-react
npm install zod

# 开发依赖
npm install -D @types/react @types/react-dom
npm install -D @testing-library/react @testing-library/jest-dom
npm install -D jest-axe @axe-core/react
```

### 3. 项目结构分析

```bash
# 分析现有组件结构
find ./components -name "*.tsx" -o -name "*.ts" | head -20

# 检查组件依赖关系
# 使用工具如 madge 或 dependency-cruiser
npx madge --image graph.svg ./components
```

### 4. 创建迁移分支

```bash
git checkout -b feature/component-standards-migration
git push -u origin feature/component-standards-migration
```

## 分阶段迁移策略

### 阶段 1: 基础设施搭建 (1-2 天)

- [x] 安装组件标准库
- [x] 配置设计令牌
- [x] 设置开发工具
- [ ] 建立测试环境

### 阶段 2: 基础组件迁移 (3-5 天)

- [ ] Button 组件
- [ ] Input 组件
- [ ] Card 组件
- [ ] Typography 组件

### 阶段 3: 复合组件迁移 (5-7 天)

- [ ] Form 组件
- [ ] Table 组件
- [ ] Modal/Dialog 组件
- [ ] Navigation 组件

### 阶段 4: 业务组件迁移 (7-10 天)

- [ ] 用户管理组件
- [ ] 聊天组件
- [ ] 仪表板组件
- [ ] 其他业务特定组件

### 阶段 5: 优化和清理 (2-3 天)

- [ ] 性能优化
- [ ] 可访问性审计
- [ ] 代码清理
- [ ] 文档更新

## 具体迁移步骤

### 步骤 1: 分析现有组件

```typescript
// 1. 记录现有组件的 API
interface ExistingButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

// 2. 识别组件的依赖和使用模式
// - 在哪些地方被使用
// - 传递了哪些 props
// - 是否有自定义样式覆盖
```

### 步骤 2: 创建迁移计划

```typescript
// migration-plan.ts
export interface ComponentMigrationPlan {
  componentName: string;
  currentPath: string;
  newPath: string;
  apiChanges: {
    breaking: string[];
    deprecated: string[];
    new: string[];
  };
  dependencies: string[];
  usageCount: number;
  estimatedEffort: 'low' | 'medium' | 'high';
}

const buttonMigrationPlan: ComponentMigrationPlan = {
  componentName: 'Button',
  currentPath: 'components/ui/button.tsx',
  newPath: 'components/ui/button.tsx', // 原地迁移
  apiChanges: {
    breaking: [], // 尽量避免破坏性变更
    deprecated: ['variant="danger"'], // 标记为废弃
    new: ['loading', 'leftIcon', 'rightIcon'] // 新增功能
  },
  dependencies: ['class-variance-authority', '@radix-ui/react-slot'],
  usageCount: 45, // 在项目中被使用的次数
  estimatedEffort: 'medium'
};
```

### 步骤 3: 实施迁移

#### 3.1 创建新版本组件

```typescript
// components/ui/button.v2.tsx (临时文件)
import React from 'react';
import {
  componentStandards,
  designTokens,
  validationSchemas
} from '@/lib/component-standards';

// 新的标准化组件实现
const ButtonV2 = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => {
    // 标准化实现
  }
);

export { ButtonV2 };
```

#### 3.2 创建兼容性包装器

```typescript
// components/ui/button.tsx (更新现有文件)
import React from 'react';
import { ButtonV2 } from './button.v2';

// 原有接口
interface LegacyButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

// 兼容性映射
const mapLegacyProps = (props: LegacyButtonProps) => {
  const { variant, size, ...rest } = props;
  
  // 映射旧的 variant 到新的
  const newVariant = variant === 'danger' ? 'destructive' : variant;
  
  // 映射旧的 size 到新的
  const sizeMap = {
    small: 'sm',
    medium: 'default',
    large: 'lg'
  } as const;
  
  return {
    ...rest,
    variant: newVariant,
    size: sizeMap[size || 'medium']
  };
};

// 兼容性组件
export const Button = React.forwardRef<HTMLButtonElement, LegacyButtonProps>(
  (props, ref) => {
    // 开发环境警告
    if (process.env.NODE_ENV === 'development') {
      if (props.variant === 'danger') {
        console.warn(
          'Button: variant="danger" is deprecated. Use variant="destructive" instead.'
        );
      }
    }
    
    const mappedProps = mapLegacyProps(props);
    return <ButtonV2 ref={ref} {...mappedProps} />;
  }
);

// 同时导出新版本供新代码使用
export { ButtonV2 as StandardButton };
```

#### 3.3 逐步替换使用

```typescript
// 创建 codemod 脚本自动化替换
// scripts/migrate-button-usage.js
const jscodeshift = require('jscodeshift');

module.exports = function transformer(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);
  
  // 替换 variant="danger" 为 variant="destructive"
  root
    .find(j.JSXAttribute, {
      name: { name: 'variant' },
      value: { value: 'danger' }
    })
    .forEach(path => {
      path.value.value.value = 'destructive';
    });
  
  return root.toSource();
};

// 运行迁移脚本
// npx jscodeshift -t scripts/migrate-button-usage.js components/**/*.tsx
```

### 步骤 4: 测试迁移结果

```typescript
// __tests__/button-migration.test.tsx
import { render, screen } from '@testing-library/react';
import { Button, StandardButton } from '../button';

describe('Button Migration', () => {
  // 测试向后兼容性
  it('maintains backward compatibility', () => {
    render(
      <Button variant="danger" size="small">
        Legacy Button
      </Button>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('destructive'); // 映射到新的 variant
    expect(button).toHaveClass('sm'); // 映射到新的 size
  });
  
  // 测试新功能
  it('supports new features', () => {
    render(
      <StandardButton loading leftIcon={<span>👍</span>}>
        New Button
      </StandardButton>
    );
    
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });
  
  // 测试废弃警告
  it('shows deprecation warnings in development', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    render(<Button variant="danger">Test</Button>);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('variant="danger" is deprecated')
    );
    
    consoleSpy.mockRestore();
  });
});
```

## 兼容性处理

### 1. API 兼容性策略

```typescript
// utils/compatibility.ts
export interface CompatibilityConfig {
  enableDeprecationWarnings: boolean;
  enableLegacySupport: boolean;
  migrationMode: 'strict' | 'loose';
}

export const createCompatibilityWrapper = <T, U>(
  NewComponent: React.ComponentType<U>,
  propMapper: (props: T) => U,
  config: CompatibilityConfig = {
    enableDeprecationWarnings: process.env.NODE_ENV === 'development',
    enableLegacySupport: true,
    migrationMode: 'loose'
  }
) => {
  return React.forwardRef<any, T>((props, ref) => {
    // 属性映射和警告逻辑
    const mappedProps = propMapper(props);
    
    if (config.enableDeprecationWarnings) {
      // 检查废弃的属性并发出警告
    }
    
    return <NewComponent ref={ref} {...mappedProps} />;
  });
};
```

### 2. 样式兼容性

```typescript
// styles/compatibility.css
/* 为旧的 CSS 类名提供兼容性 */
.btn-primary {
  @apply bg-primary text-primary-foreground hover:bg-primary/90;
}

.btn-danger {
  @apply bg-destructive text-destructive-foreground hover:bg-destructive/90;
}

.btn-small {
  @apply h-9 px-3 text-xs;
}
```

### 3. 主题兼容性

```typescript
// lib/theme-compatibility.ts
import { designTokens } from '@/lib/component-standards';

// 映射旧的主题变量到新的设计令牌
export const legacyThemeMapping = {
  // 颜色映射
  primaryColor: designTokens.colors.primary[500],
  dangerColor: designTokens.colors.destructive[500],
  
  // 尺寸映射
  smallSize: designTokens.spacing[2],
  mediumSize: designTokens.spacing[4],
  largeSize: designTokens.spacing[6],
  
  // 字体映射
  smallFont: designTokens.typography.fontSize.sm,
  mediumFont: designTokens.typography.fontSize.base,
  largeFont: designTokens.typography.fontSize.lg
};

// CSS 变量注入
export const injectLegacyThemeVariables = () => {
  const root = document.documentElement;
  
  Object.entries(legacyThemeMapping).forEach(([key, value]) => {
    root.style.setProperty(`--legacy-${key}`, value);
  });
};
```

## 测试和验证

### 1. 自动化测试

```typescript
// scripts/migration-tests.ts
import { execSync } from 'child_process';
import { glob } from 'glob';

// 运行所有迁移相关的测试
const runMigrationTests = async () => {
  console.log('🧪 运行迁移测试...');
  
  // 1. 单元测试
  execSync('npm test -- --testPathPattern=migration', { stdio: 'inherit' });
  
  // 2. 集成测试
  execSync('npm run test:integration', { stdio: 'inherit' });
  
  // 3. 可访问性测试
  execSync('npm run test:a11y', { stdio: 'inherit' });
  
  // 4. 视觉回归测试
  execSync('npm run test:visual', { stdio: 'inherit' });
  
  console.log('✅ 所有测试通过');
};

// 验证组件 API 兼容性
const validateApiCompatibility = async () => {
  const componentFiles = await glob('components/**/*.tsx');
  
  for (const file of componentFiles) {
    // 检查是否有破坏性变更
    // 使用 TypeScript 编译器 API 进行类型检查
  }
};
```

### 2. 性能基准测试

```typescript
// scripts/performance-benchmark.ts
import { performance } from 'perf_hooks';
import { render } from '@testing-library/react';

const benchmarkComponent = (Component: React.ComponentType, props: any) => {
  const iterations = 1000;
  const times: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    render(<Component {...props} />);
    const end = performance.now();
    times.push(end - start);
  }
  
  const average = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  
  return { average, min, max };
};

// 比较迁移前后的性能
const comparePerformance = () => {
  const oldButtonPerf = benchmarkComponent(OldButton, { children: 'Test' });
  const newButtonPerf = benchmarkComponent(NewButton, { children: 'Test' });
  
  console.log('性能对比:');
  console.log('旧组件:', oldButtonPerf);
  console.log('新组件:', newButtonPerf);
  
  const improvement = ((oldButtonPerf.average - newButtonPerf.average) / oldButtonPerf.average) * 100;
  console.log(`性能改进: ${improvement.toFixed(2)}%`);
};
```

### 3. 可访问性验证

```typescript
// scripts/accessibility-audit.ts
import { axe } from 'jest-axe';
import { render } from '@testing-library/react';

const auditAccessibility = async (components: React.ComponentType[]) => {
  const results = [];
  
  for (const Component of components) {
    const { container } = render(<Component />);
    const axeResults = await axe(container);
    
    results.push({
      component: Component.displayName || Component.name,
      violations: axeResults.violations,
      passes: axeResults.passes.length
    });
  }
  
  // 生成可访问性报告
  const report = results.map(result => ({
    component: result.component,
    score: result.passes / (result.passes + result.violations.length),
    issues: result.violations.map(v => v.description)
  }));
  
  console.table(report);
  return report;
};
```

## 常见问题

### Q1: 迁移过程中如何处理样式冲突？

**A**: 使用 CSS 层级和命名空间来避免冲突：

```css
/* 使用 @layer 指令管理样式优先级 */
@layer base, components, utilities;

@layer components {
  .btn-v2 {
    /* 新组件样式 */
  }
}

/* 或使用命名空间 */
.component-standards {
  .button {
    /* 标准化样式 */
  }
}
```

### Q2: 如何处理第三方组件库的集成？

**A**: 创建适配器组件：

```typescript
// adapters/antd-button.tsx
import { Button as AntdButton } from 'antd';
import { ButtonProps as StandardButtonProps } from '@/components/ui/button';

const AntdButtonAdapter: React.FC<StandardButtonProps> = (props) => {
  // 将标准属性映射到 Antd 属性
  const antdProps = mapStandardToAntd(props);
  return <AntdButton {...antdProps} />;
};
```

### Q3: 迁移后如何确保团队采用新标准？

**A**: 使用 ESLint 规则和代码审查：

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    // 禁止使用废弃的组件
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['**/old-components/**'],
            message: '请使用标准化组件库中的组件'
          }
        ]
      }
    ]
  }
};
```

### Q4: 如何处理大型项目的迁移？

**A**: 采用微前端或模块化迁移策略：

```typescript
// 按模块逐步迁移
const migrationPlan = {
  phase1: ['components/ui/**'],
  phase2: ['components/forms/**'],
  phase3: ['components/layout/**'],
  phase4: ['pages/**']
};

// 使用特性标志控制迁移
const useStandardComponents = process.env.ENABLE_STANDARD_COMPONENTS === 'true';

export const Button = useStandardComponents ? StandardButton : LegacyButton;
```

## 迁移检查清单

### 迁移前检查

- [ ] 📋 完成项目现状分析
- [ ] 📋 制定详细的迁移计划
- [ ] 📋 设置测试环境
- [ ] 📋 备份现有代码
- [ ] 📋 团队培训和沟通

### 迁移过程检查

- [ ] 🔄 组件标准库安装和配置
- [ ] 🔄 基础组件迁移完成
- [ ] 🔄 复合组件迁移完成
- [ ] 🔄 业务组件迁移完成
- [ ] 🔄 兼容性测试通过
- [ ] 🔄 性能测试通过
- [ ] 🔄 可访问性测试通过

### 迁移后检查

- [ ] ✅ 所有测试用例通过
- [ ] ✅ 文档更新完成
- [ ] ✅ 代码审查完成
- [ ] ✅ 部署到测试环境
- [ ] ✅ 用户验收测试
- [ ] ✅ 生产环境部署
- [ ] ✅ 监控和反馈收集

### 清理工作

- [ ] 🧹 移除废弃的组件文件
- [ ] 🧹 清理未使用的依赖
- [ ] 🧹 更新构建配置
- [ ] 🧹 优化包大小
- [ ] 🧹 更新 CI/CD 流程

## 迁移时间估算

| 项目规模 | 组件数量 | 预估时间 | 团队规模 |
|---------|---------|---------|----------|
| 小型项目 | < 20 | 1-2 周 | 1-2 人 |
| 中型项目 | 20-50 | 3-4 周 | 2-3 人 |
| 大型项目 | 50-100 | 6-8 周 | 3-5 人 |
| 企业级项目 | > 100 | 10-12 周 | 5+ 人 |

## 成功指标

- 🎯 **代码一致性**: 90%+ 的组件使用标准化模式
- 🎯 **性能提升**: 渲染性能提升 20%+
- 🎯 **可访问性**: WCAG 2.1 AA 合规率 95%+
- 🎯 **开发效率**: 新组件开发时间减少 30%+
- 🎯 **维护成本**: Bug 修复时间减少 40%+
- 🎯 **团队满意度**: 开发者体验评分 8/10+

---

**注意**: 迁移是一个持续的过程，需要团队的共同努力和持续的改进。建议定期回顾迁移进度，及时调整策略，确保迁移的成功。