# 组件工厂模式规范与标准

## 概述

本文档定义了项目中组件工厂模式的规范和要求，基于业界最佳实践和成熟的开源标准，确保组件的一致性、可维护性和可扩展性。

## 核心原则

### 1. 设计系统兼容性
- 遵循 [Design Tokens Community Group](https://design-tokens.github.io/community-group/) 标准
- 兼容 [Figma Design Tokens](https://www.figma.com/community/plugin/888356646278934516/Design-Tokens) 格式
- 支持 [Style Dictionary](https://amzn.github.io/style-dictionary/) 转换

### 2. 组件变体系统
- 基于 [Class Variance Authority (CVA)](https://cva.style/docs) 实现
- 遵循 [Stitches](https://stitches.dev/) 变体模式
- 兼容 [Tailwind CSS](https://tailwindcss.com/) 类名系统

### 3. 类型安全
- 使用 [TypeScript](https://www.typescriptlang.org/) 严格模式
- 遵循 [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/) 最佳实践
- 实现 [Zod](https://zod.dev/) 运行时验证

## 技术标准

### 1. 组件工厂接口

```typescript
// 基于 CVA 标准的变体定义
interface ComponentVariants {
  variants: Record<string, Record<string, string>>;
  compoundVariants?: Array<{
    [key: string]: string | string[];
    class: string;
  }>;
  defaultVariants?: Record<string, string>;
}

// 遵循 React.forwardRef 标准
interface ComponentFactory<T = HTMLElement> {
  displayName: string;
  variants: ComponentVariants;
  create: <P extends Record<string, any>>(
    config: ComponentConfig<P>
  ) => React.ForwardRefExoticComponent<P & React.RefAttributes<T>>;
}
```

### 2. 设计令牌标准

基于 [W3C Design Tokens Format Module](https://www.w3.org/community/design-tokens/) 规范：

```typescript
// 遵循 Design Tokens Community Group 标准
interface DesignToken {
  $value: string | number;
  $type?: 'color' | 'dimension' | 'fontFamily' | 'fontWeight' | 'duration' | 'cubicBezier';
  $description?: string;
}

// 兼容 Style Dictionary 格式
interface TokenGroup {
  [key: string]: DesignToken | TokenGroup;
}
```

### 3. 可访问性标准

遵循 [WCAG 2.1 AA](https://www.w3.org/WAI/WCAG21/quickref/) 标准：

```typescript
// 基于 @radix-ui/react-* 可访问性模式
interface AccessibilityProps {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  role?: string;
  tabIndex?: number;
}

// 遵循 React ARIA 最佳实践
interface KeyboardNavigation {
  onKeyDown?: (event: React.KeyboardEvent) => void;
  onFocus?: (event: React.FocusEvent) => void;
  onBlur?: (event: React.FocusEvent) => void;
}
```

## 实现规范

### 1. 组件命名约定

遵循 [React 官方命名约定](https://react.dev/learn/thinking-in-react)：

- 组件名使用 PascalCase：`Button`, `InputField`, `DataTable`
- 变体名使用 camelCase：`variant`, `size`, `colorScheme`
- 文件名使用 kebab-case：`button.tsx`, `input-field.tsx`, `data-table.tsx`

### 2. 目录结构标准

基于 [Atomic Design](https://atomicdesign.bradfrost.com/) 方法论：

```
components/
├── atoms/           # 原子组件
│   ├── button/
│   ├── input/
│   └── icon/
├── molecules/       # 分子组件
│   ├── form-field/
│   ├── search-box/
│   └── card/
├── organisms/       # 有机体组件
│   ├── header/
│   ├── sidebar/
│   └── data-table/
├── templates/       # 模板组件
└── pages/          # 页面组件
```

### 3. 样式系统集成

#### Tailwind CSS 集成

遵循 [Tailwind CSS 组件模式](https://tailwindcss.com/docs/reusing-styles#extracting-components-with-apply)：

```typescript
// 使用 @apply 指令创建组件类
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "underline-offset-4 hover:underline text-primary"
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
```

#### CSS-in-JS 集成

支持 [Emotion](https://emotion.sh/) 和 [Styled Components](https://styled-components.com/) 标准：

```typescript
// Emotion 集成
import { css } from '@emotion/react';

const buttonStyles = (theme: Theme) => css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${theme.radii.md};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  transition: ${theme.transitions.colors};
`;
```

### 4. 状态管理集成

#### React Hook Form 集成

遵循 [React Hook Form](https://react-hook-form.com/) 最佳实践：

```typescript
import { useController, Control } from 'react-hook-form';

interface FormFieldProps {
  name: string;
  control: Control<any>;
  label?: string;
  description?: string;
  required?: boolean;
}

const FormField = ({ name, control, ...props }: FormFieldProps) => {
  const {
    field,
    fieldState: { invalid, error }
  } = useController({ name, control });
  
  return (
    <div className="space-y-2">
      {/* 组件实现 */}
    </div>
  );
};
```

#### Zustand 状态集成

支持 [Zustand](https://zustand-demo.pmnd.rs/) 状态管理模式：

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface ComponentState {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
}

const useComponentStore = create<ComponentState>()(devtools(
  (set) => ({
    isOpen: false,
    toggle: () => set((state) => ({ isOpen: !state.isOpen })),
    close: () => set({ isOpen: false })
  }),
  { name: 'component-store' }
));
```

## 性能优化标准

### 1. 代码分割

遵循 [React.lazy](https://react.dev/reference/react/lazy) 和 [Next.js Dynamic Imports](https://nextjs.org/docs/advanced-features/dynamic-import) 标准：

```typescript
// 组件级代码分割
const LazyComponent = React.lazy(() => import('./heavy-component'));

// Next.js 动态导入
const DynamicComponent = dynamic(() => import('./component'), {
  loading: () => <ComponentSkeleton />,
  ssr: false
});
```

### 2. 内存优化

基于 [React DevTools Profiler](https://react.dev/blog/2018/09/10/introducing-the-react-profiler) 最佳实践：

```typescript
// 使用 React.memo 优化重渲染
const OptimizedComponent = React.memo(Component, (prevProps, nextProps) => {
  return prevProps.id === nextProps.id;
});

// 使用 useMemo 优化计算
const memoizedValue = useMemo(() => {
  return expensiveCalculation(props.data);
}, [props.data]);

// 使用 useCallback 优化函数引用
const memoizedCallback = useCallback(() => {
  doSomething(a, b);
}, [a, b]);
```

## 测试标准

### 1. 单元测试

遵循 [Testing Library](https://testing-library.com/) 最佳实践：

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './button';

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### 2. 可访问性测试

使用 [jest-axe](https://github.com/nickcolley/jest-axe) 进行自动化可访问性测试：

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

it('should not have accessibility violations', async () => {
  const { container } = render(<Button>Accessible Button</Button>);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### 3. 视觉回归测试

集成 [Storybook](https://storybook.js.org/) 和 [Chromatic](https://www.chromatic.com/)：

```typescript
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link']
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Button'
  }
};
```

## 文档标准

### 1. 组件文档

遵循 [JSDoc](https://jsdoc.app/) 标准：

```typescript
/**
 * Button component with multiple variants and sizes
 * 
 * @example
 * ```tsx
 * <Button variant="primary" size="lg" onClick={handleClick}>
 *   Click me
 * </Button>
 * ```
 * 
 * @param variant - The visual style variant
 * @param size - The size of the button
 * @param children - The button content
 * @param onClick - Click event handler
 */
export interface ButtonProps {
  /** The visual style variant */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  /** The size of the button */
  size?: 'default' | 'sm' | 'lg';
  /** The button content */
  children: React.ReactNode;
  /** Click event handler */
  onClick?: () => void;
}
```

### 2. API 文档

使用 [TypeDoc](https://typedoc.org/) 生成 API 文档：

```json
// typedoc.json
{
  "entryPoints": ["./src/components/index.ts"],
  "out": "./docs/api",
  "theme": "default",
  "includeVersion": true,
  "excludePrivate": true,
  "excludeProtected": true,
  "excludeExternals": true
}
```

## 版本管理

### 1. 语义化版本

遵循 [Semantic Versioning](https://semver.org/) 标准：

- **MAJOR**: 破坏性变更
- **MINOR**: 新功能添加
- **PATCH**: 错误修复

### 2. 变更日志

使用 [Keep a Changelog](https://keepachangelog.com/) 格式：

```markdown
# Changelog

## [1.2.0] - 2024-01-15

### Added
- New `ghost` variant for Button component
- Support for custom icons in Input component

### Changed
- Updated default spacing in Card component
- Improved accessibility for all form components

### Fixed
- Fixed focus ring visibility in dark mode
- Resolved TypeScript type issues in Select component
```

## 工具链集成

### 1. 开发工具

- **ESLint**: 使用 [@typescript-eslint/recommended](https://typescript-eslint.io/)
- **Prettier**: 遵循 [Prettier 配置标准](https://prettier.io/docs/en/configuration.html)
- **Husky**: 集成 [Git Hooks](https://typicode.github.io/husky/)
- **lint-staged**: 使用 [lint-staged](https://github.com/okonet/lint-staged) 优化提交

### 2. 构建工具

- **Vite**: 使用 [Vite](https://vitejs.dev/) 作为构建工具
- **Rollup**: 支持 [Rollup](https://rollupjs.org/) 库打包
- **TypeScript**: 严格模式配置

### 3. CI/CD 集成

```yaml
# .github/workflows/component-quality.yml
name: Component Quality Check

on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test
      - run: npm run build
      
      - name: Visual Regression Tests
        run: npm run chromatic
        env:
          CHROMATIC_PROJECT_TOKEN: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
```

## 迁移指南

### 1. 现有组件迁移

1. **评估现有组件**: 使用组件审计工具分析当前组件
2. **创建迁移计划**: 按优先级排序组件迁移
3. **渐进式迁移**: 使用适配器模式保持向后兼容
4. **测试覆盖**: 确保迁移后功能完整性

### 2. 团队培训

1. **文档学习**: 提供完整的组件库文档
2. **实践工作坊**: 组织团队培训会议
3. **代码审查**: 建立组件质量检查流程
4. **持续改进**: 定期收集反馈并优化

## 合规性检查

### 1. 自动化检查

```typescript
// 组件合规性检查工具
interface ComplianceCheck {
  hasDisplayName: boolean;
  hasForwardRef: boolean;
  hasAccessibilityProps: boolean;
  hasTypeDefinitions: boolean;
  hasTests: boolean;
  hasDocumentation: boolean;
}

const checkComponentCompliance = (component: any): ComplianceCheck => {
  return {
    hasDisplayName: !!component.displayName,
    hasForwardRef: component.$$typeof === Symbol.for('react.forward_ref'),
    hasAccessibilityProps: hasAriaProps(component),
    hasTypeDefinitions: hasTypeScript(component),
    hasTests: hasTestFiles(component),
    hasDocumentation: hasJSDoc(component)
  };
};
```

### 2. 质量门禁

- **代码覆盖率**: 最低 80%
- **可访问性**: WCAG 2.1 AA 合规
- **性能**: Lighthouse 评分 > 90
- **类型安全**: TypeScript 严格模式无错误

## 总结

本规范基于业界成熟的开源标准和最佳实践，确保组件工厂模式的实现具有：

1. **标准兼容性**: 遵循 W3C、React、TypeScript 等官方标准
2. **工具链集成**: 支持主流开发工具和构建系统
3. **可维护性**: 清晰的架构和文档标准
4. **可扩展性**: 模块化设计支持未来扩展
5. **质量保证**: 完整的测试和合规性检查

通过遵循这些规范，项目将获得一致、可靠、高质量的组件系统。