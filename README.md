# 组件标准库 (Component Standards Library)

一个现代化的 React 组件标准库，提供一致性、可访问性、性能优化和开发体验的完整解决方案。

## 🌟 特性

- **🎨 设计系统兼容** - 支持 Tailwind CSS、Styled Components、Emotion 等主流样式方案
- **♿ 可访问性优先** - 遵循 WCAG 2.1 AA 标准和 WAI-ARIA 最佳实践
- **⚡ 性能优化** - 内置懒加载、虚拟化、防抖节流等性能优化工具
- **🔒 类型安全** - 完整的 TypeScript 支持和运行时验证
- **🧪 测试友好** - 内置测试工具和覆盖率检查
- **📚 文档完善** - 自动生成文档和 Storybook 集成
- **🔧 工具链集成** - ESLint、Prettier、Husky 等开发工具支持
- **📦 渐进式迁移** - 兼容现有项目，支持逐步迁移

## 🔧 最新改进 (2024)

### 代码质量提升
- ✅ **ESLint 配置优化** - 增强了代码质量检查规则，包括 TypeScript、React Hooks 和导入顺序检查
- ✅ **Git Hooks 集成** - 添加了 pre-commit 钩子，自动执行代码检查和格式化
- ✅ **Lint-staged 配置** - 只对暂存文件执行检查，提高提交效率

### 安全性增强
- ✅ **环境变量安全** - 移除了硬编码密码，添加了安全配置指南
- ✅ **安全文档** - 创建了 `SECURITY.md` 文件，提供详细的安全配置指南
- ✅ **密钥管理** - 添加了 JWT、API 密钥等安全配置项

### 监控系统
- ✅ **性能监控** - 实现了 `PerformanceMonitor` 类，支持请求指标收集和系统监控
- ✅ **错误追踪** - 创建了 `ErrorTracker` 系统，支持错误分析和告警
- ✅ **数据库集成** - 错误日志导出功能已从模拟数据改为真实数据库查询

### 开发体验
- ✅ **自动化工具** - 配置了代码格式化和质量检查的自动化流程
- ✅ **类型安全** - 增强了 TypeScript 配置和类型检查
- ✅ **文档完善** - 更新了安全配置和开发指南

## 🚀 快速开始

### 自动初始化（推荐）

```bash
# 使用初始化脚本快速设置
npx tsx scripts/init-component-standards.ts

# 或者使用自定义配置
npx tsx scripts/init-component-standards.ts \
  --name=my-project \
  --framework=next \
  --styling=tailwind \
  --testing=jest
```

### 手动安装

```bash
# 安装核心依赖
npm install react react-dom zod clsx class-variance-authority

# 安装开发依赖
npm install -D typescript @types/react @types/react-dom

# 如果使用 Tailwind CSS
npm install -D tailwindcss autoprefixer postcss tailwind-merge
```

## 📁 项目结构

```
project/
├── src/
│   ├── components/          # 组件目录
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx
│   │   └── Button.stories.tsx
│   ├── lib/
│   │   ├── component-standards/  # 组件标准库
│   │   │   ├── index.ts         # 主入口
│   │   │   ├── component-factory.ts
│   │   │   ├── design-tokens.ts
│   │   │   ├── component-patterns.ts
│   │   │   ├── validation-schemas.ts
│   │   │   ├── accessibility-helpers.ts
│   │   │   └── performance-optimizers.ts
│   │   └── utils.ts
│   ├── hooks/              # 自定义 Hooks
│   ├── types/              # 类型定义
│   └── styles/             # 样式文件
├── scripts/                # 工具脚本
│   ├── init-component-standards.ts
│   ├── component-standards-checker.ts
│   ├── migrate-components.ts
│   └── component-standards.config.json
├── docs/                   # 文档
│   ├── component-factory-standards.md
│   ├── component-standards-usage-examples.md
│   └── migration-guide.md
└── .storybook/             # Storybook 配置
```

## 🎯 核心概念

### 1. 组件工厂模式

使用组件工厂创建一致性的组件变体：

```typescript
import { createComponentVariants } from '@/lib/component-standards';

const buttonVariants = createComponentVariants({
  base: "inline-flex items-center justify-center rounded-md",
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground",
      secondary: "bg-secondary text-secondary-foreground",
    },
    size: {
      sm: "h-9 px-3",
      lg: "h-11 px-8",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "sm",
  },
});
```

### 2. 设计令牌系统

统一的设计令牌管理：

```typescript
import { designTokens } from '@/lib/component-standards';

const theme = {
  colors: designTokens.colors.primary,
  spacing: designTokens.spacing.md,
  typography: designTokens.typography.body,
};
```

### 3. 可访问性辅助

内置可访问性工具：

```typescript
import { useFocusTrap, useScreenReaderAnnouncement } from '@/lib/component-standards';

function Dialog({ isOpen, children }) {
  const focusTrapRef = useFocusTrap(isOpen);
  const announce = useScreenReaderAnnouncement();
  
  useEffect(() => {
    if (isOpen) {
      announce('对话框已打开');
    }
  }, [isOpen]);
  
  return (
    <div ref={focusTrapRef} role="dialog" aria-modal="true">
      {children}
    </div>
  );
}
```

### 4. 性能优化

自动性能优化：

```typescript
import { useVirtualization, useDebounce } from '@/lib/component-standards';

function LargeList({ items }) {
  const virtualizer = useVirtualization({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });
  
  return (
    <div ref={parentRef}>
      {virtualizer.getVirtualItems().map(virtualItem => (
        <div key={virtualItem.index}>
          {items[virtualItem.index]}
        </div>
      ))}
    </div>
  );
}
```

## 🛠️ 开发工具

### 组件标准检查

```bash
# 检查组件是否符合标准
npm run component:check

# 详细模式
npm run component:check:verbose

# 生成报告
npm run component:check -- --output=report.json
```

### 组件迁移

```bash
# 自动迁移现有组件
npm run component:migrate

# 指定源目录
npm run component:migrate -- --src=./old-components
```

### 测试和验证

```bash
# 运行测试
npm run test

# 测试覆盖率
npm run test:coverage

# 类型检查
npm run type-check

# 代码检查
npm run lint
```

## 📖 使用示例

### 基础按钮组件

```typescript
import React from 'react';
import { createComponentVariants } from '@/lib/component-standards';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const buttonVariants = createComponentVariants({
  base: "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50",
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground hover:bg-primary/90",
      primary: "bg-blue-600 text-white hover:bg-blue-700",
      secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
    },
    size: {
      sm: "h-9 px-3 text-sm",
      md: "h-10 px-4 text-sm",
      lg: "h-11 px-8 text-base",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
  },
});

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>((
  { className, variant, size, ...props },
  ref
) => {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      ref={ref}
      {...props}
    />
  );
});

Button.displayName = "Button";

export { Button, type ButtonProps };
```

### 复杂表单组件

```typescript
import React from 'react';
import { 
  useFormValidation, 
  useAccessibilityValidation,
  createAriaDescription 
} from '@/lib/component-standards';

interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  error?: string;
  children?: React.ReactNode;
}

function FormField({ label, name, type = 'text', required, error, children }: FormFieldProps) {
  const fieldId = `field-${name}`;
  const errorId = `${fieldId}-error`;
  const descriptionId = `${fieldId}-description`;
  
  const ariaProps = createAriaDescription({
    describedBy: error ? errorId : descriptionId,
    invalid: !!error,
    required,
  });
  
  return (
    <div className="space-y-2">
      <label 
        htmlFor={fieldId}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {label}
        {required && <span className="text-red-500 ml-1" aria-label="必填">*</span>}
      </label>
      
      {children || (
        <input
          id={fieldId}
          name={name}
          type={type}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          {...ariaProps}
        />
      )}
      
      {error && (
        <p id={errorId} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export { FormField, type FormFieldProps };
```

## 🔧 配置

### 组件标准配置

在 `scripts/component-standards.config.json` 中配置检查规则：

```json
{
  "rules": {
    "componentNaming": {
      "enabled": true,
      "pattern": "PascalCase",
      "severity": "error"
    },
    "propsInterface": {
      "enabled": true,
      "requireExplicitTypes": true,
      "severity": "warning"
    },
    "accessibility": {
      "enabled": true,
      "requireAriaLabels": true,
      "checkColorContrast": true,
      "severity": "error"
    }
  }
}
```

### Tailwind CSS 配置

```javascript
// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
      },
    },
  },
  plugins: [],
};
```

## 🧪 测试策略

### 单元测试

```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Button } from './Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies variant styles correctly', () => {
    render(<Button variant="primary">Primary Button</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-blue-600');
  });
});
```

### 可访问性测试

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Button Accessibility', () => {
  it('should not have accessibility violations', async () => {
    const { container } = render(<Button>Accessible Button</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

## 📚 文档和故事书

### Storybook 集成

```typescript
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '一个灵活的按钮组件，支持多种变体和尺寸。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'primary', 'secondary'],
      description: '按钮的视觉变体',
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
      description: '按钮的尺寸',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Default Button',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-4">
      <Button variant="default">Default</Button>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
    </div>
  ),
};
```

## 🚀 部署和 CI/CD

### GitHub Actions 工作流

```yaml
# .github/workflows/ci.yml
name: Component Standards CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run TypeScript check
      run: npm run type-check
    
    - name: Run ESLint
      run: npm run lint
    
    - name: Run component standards check
      run: npm run component:check
    
    - name: Run tests
      run: npm run test:coverage
    
    - name: Build Storybook
      run: npm run build-storybook
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开 Pull Request

### 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档更新
- `style:` 代码格式化
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建过程或辅助工具的变动
- `component:` 组件相关更改

## 📄 许可证

MIT License - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

感谢以下开源项目的启发和支持：

- [Radix UI](https://www.radix-ui.com/) - 无样式、可访问的组件
- [Tailwind CSS](https://tailwindcss.com/) - 实用优先的 CSS 框架
- [Class Variance Authority](https://cva.style/) - 组件变体管理
- [React Hook Form](https://react-hook-form.com/) - 高性能表单库
- [Storybook](https://storybook.js.org/) - 组件开发环境
- [Testing Library](https://testing-library.com/) - 简单而完整的测试工具

## 📞 支持

如果你有任何问题或建议，请：

1. 查看 [文档](./docs/)
2. 搜索 [Issues](../../issues)
3. 创建新的 [Issue](../../issues/new)
4. 参与 [Discussions](../../discussions)

---

**让我们一起构建更好的组件生态系统！** 🚀