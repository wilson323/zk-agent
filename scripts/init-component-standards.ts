#!/usr/bin/env node

/**
 * 组件标准库初始化工具
 * 自动设置项目的组件标准库环境
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { execSync } from 'child_process';

// 初始化配置接口
interface InitConfig {
  projectName: string;
  framework: 'next' | 'react' | 'vite';
  styling: 'tailwind' | 'styled-components' | 'emotion' | 'css-modules';
  testing: 'jest' | 'vitest' | 'none';
  storybook: boolean;
  typescript: boolean;
  eslint: boolean;
  prettier: boolean;
  husky: boolean;
  commitlint: boolean;
}

// 文件模板
const templates = {
  // TypeScript 配置
  tsconfig: {
    compilerOptions: {
      target: 'ES2020',
      lib: ['DOM', 'DOM.Iterable', 'ES6'],
      allowJs: true,
      skipLibCheck: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      strict: true,
      forceConsistentCasingInFileNames: true,
      noFallthroughCasesInSwitch: true,
      module: 'ESNext',
      moduleResolution: 'node',
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      jsx: 'react-jsx',
      baseUrl: '.',
      paths: {
        '@/*': ['./src/*'],
        '@/components/*': ['./src/components/*'],
        '@/lib/*': ['./src/lib/*'],
        '@/hooks/*': ['./src/hooks/*'],
        '@/utils/*': ['./src/utils/*'],
        '@/types/*': ['./src/types/*']
      }
    },
    include: [
      'src',
      'components',
      'lib',
      'scripts'
    ],
    exclude: [
      'node_modules',
      'dist',
      'build'
    ]
  },

  // ESLint 配置
  eslintConfig: {
    extends: [
      'eslint:recommended',
      '@typescript-eslint/recommended',
      'plugin:react/recommended',
      'plugin:react-hooks/recommended',
      'plugin:jsx-a11y/recommended',
      'plugin:@next/next/recommended'
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      ecmaFeatures: {
        jsx: true
      }
    },
    plugins: [
      '@typescript-eslint',
      'react',
      'react-hooks',
      'jsx-a11y'
    ],
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      'jsx-a11y/anchor-is-valid': 'off'
    },
    settings: {
      react: {
        version: 'detect'
      }
    }
  },

  // Prettier 配置
  prettierConfig: {
    semi: true,
    trailingComma: 'es5',
    singleQuote: true,
    printWidth: 80,
    tabWidth: 2,
    useTabs: false
  },

  // Husky 预提交钩子
  preCommitHook: `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
npm run component:check
`,

  // lint-staged 配置
  lintStagedConfig: {
    '*.{ts,tsx}': [
      'eslint --fix',
      'prettier --write'
    ],
    '*.{json,md}': [
      'prettier --write'
    ]
  },

  // commitlint 配置
  commitlintConfig: {
    extends: ['@commitlint/config-conventional'],
    rules: {
      'type-enum': [
        2,
        'always',
        [
          'feat',
          'fix',
          'docs',
          'style',
          'refactor',
          'perf',
          'test',
          'chore',
          'component'
        ]
      ]
    }
  },

  // Jest 配置
  jestConfig: {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
    moduleNameMapping: {
      '^@/(.*)$': '<rootDir>/src/$1'
    },
    transform: {
      '^.+\\.(ts|tsx)$': 'ts-jest'
    },
    collectCoverageFrom: [
      'src/**/*.{ts,tsx}',
      '!src/**/*.d.ts',
      '!src/**/*.stories.{ts,tsx}'
    ],
    coverageThreshold: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    }
  },

  // Storybook 主配置
  storybookMain: `import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx|mdx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    '@storybook/addon-docs'
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
};

export default config;
`,

  // Storybook 预览配置
  storybookPreview: `import type { Preview } from '@storybook/react';
import '../src/styles/globals.css';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    docs: {
      toc: true,
    },
  },
};

export default preview;
`,

  // 测试设置文件
  setupTests: `import '@testing-library/jest-dom';

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};
`,

  // GitHub Actions 工作流
  githubWorkflow: `name: Component Standards CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  component-standards:
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
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
    
    - name: Build Storybook
      run: npm run build-storybook
`
};

// 依赖包配置
const dependencies = {
  base: {
    react: '^18.2.0',
    'react-dom': '^18.2.0'
  },
  typescript: {
    typescript: '^5.0.0',
    '@types/react': '^18.2.0',
    '@types/react-dom': '^18.2.0',
    '@types/node': '^20.0.0'
  },
  tailwind: {
    tailwindcss: '^3.3.0',
    autoprefixer: '^10.4.0',
    postcss: '^8.4.0',
    'class-variance-authority': '^0.7.0',
    clsx: '^2.0.0',
    'tailwind-merge': '^2.0.0'
  },
  testing: {
    jest: {
      jest: '^29.0.0',
      '@testing-library/react': '^14.0.0',
      '@testing-library/jest-dom': '^6.0.0',
      '@testing-library/user-event': '^14.0.0',
      'jest-environment-jsdom': '^29.0.0',
      'ts-jest': '^29.0.0'
    },
    vitest: {
      vitest: '^1.0.0',
      '@testing-library/react': '^14.0.0',
      '@testing-library/jest-dom': '^6.0.0',
      '@testing-library/user-event': '^14.0.0',
      'jsdom': '^23.0.0'
    }
  },
  storybook: {
    '@storybook/react': '^7.6.0',
    '@storybook/react-vite': '^7.6.0',
    '@storybook/addon-essentials': '^7.6.0',
    '@storybook/addon-interactions': '^7.6.0',
    '@storybook/addon-links': '^7.6.0',
    '@storybook/addon-a11y': '^7.6.0',
    '@storybook/addon-docs': '^7.6.0'
  },
  eslint: {
    eslint: '^8.0.0',
    '@typescript-eslint/eslint-plugin': '^6.0.0',
    '@typescript-eslint/parser': '^6.0.0',
    'eslint-plugin-react': '^7.33.0',
    'eslint-plugin-react-hooks': '^4.6.0',
    'eslint-plugin-jsx-a11y': '^6.8.0'
  },
  prettier: {
    prettier: '^3.0.0'
  },
  husky: {
    husky: '^8.0.0',
    'lint-staged': '^15.0.0'
  },
  commitlint: {
    '@commitlint/cli': '^18.0.0',
    '@commitlint/config-conventional': '^18.0.0'
  },
  componentStandards: {
    zod: '^3.22.0',
    chalk: '^5.3.0',
    glob: '^10.3.0',
    tsx: '^4.6.0'
  }
};

// 初始化器类
class ComponentStandardsInitializer {
  private config: InitConfig;
  private projectRoot: string;

  constructor(config: InitConfig) {
    this.config = config;
    this.projectRoot = process.cwd();
  }

  // 主初始化方法
  async initialize(): Promise<void> {
    console.log(chalk.blue('🚀 初始化组件标准库...\n'));

    try {
      // 1. 创建目录结构
      await this.createDirectoryStructure();
      
      // 2. 安装依赖
      await this.installDependencies();
      
      // 3. 创建配置文件
      await this.createConfigFiles();
      
      // 4. 创建组件标准库文件
      await this.createComponentStandardsFiles();
      
      // 5. 设置工具链
      await this.setupToolchain();
      
      // 6. 创建示例组件
      await this.createExampleComponents();
      
      // 7. 设置脚本
      await this.setupScripts();
      
      console.log(chalk.green('\n🎉 组件标准库初始化完成！'));
      this.printNextSteps();
      
    } catch (error) {
      console.error(chalk.red('❌ 初始化失败:'), error);
      process.exit(1);
    }
  }

  // 创建目录结构
  private async createDirectoryStructure(): Promise<void> {
    console.log(chalk.blue('📁 创建目录结构...'));
    
    const directories = [
      'src/components',
      'src/lib/component-standards',
      'src/hooks',
      'src/utils',
      'src/types',
      'src/styles',
      'scripts',
      'docs',
      'stories',
      '.storybook',
      '.github/workflows'
    ];

    directories.forEach(dir => {
      const fullPath = path.join(this.projectRoot, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(chalk.green(`  ✅ 创建目录: ${dir}`));
      }
    });
  }

  // 安装依赖
  private async installDependencies(): Promise<void> {
    console.log(chalk.blue('\n📦 安装依赖包...'));
    
    const allDeps = {
      ...dependencies.base,
      ...dependencies.componentStandards
    };
    
    const devDeps: Record<string, string> = {};
    
    if (this.config.typescript) {
      Object.assign(devDeps, dependencies.typescript);
    }
    
    if (this.config.styling === 'tailwind') {
      Object.assign(devDeps, dependencies.tailwind);
    }
    
    if (this.config.testing === 'jest') {
      Object.assign(devDeps, dependencies.testing.jest);
    } else if (this.config.testing === 'vitest') {
      Object.assign(devDeps, dependencies.testing.vitest);
    }
    
    if (this.config.storybook) {
      Object.assign(devDeps, dependencies.storybook);
    }
    
    if (this.config.eslint) {
      Object.assign(devDeps, dependencies.eslint);
    }
    
    if (this.config.prettier) {
      Object.assign(devDeps, dependencies.prettier);
    }
    
    if (this.config.husky) {
      Object.assign(devDeps, dependencies.husky);
    }
    
    if (this.config.commitlint) {
      Object.assign(devDeps, dependencies.commitlint);
    }

    // 安装生产依赖
    if (Object.keys(allDeps).length > 0) {
      const depsString = Object.entries(allDeps)
        .map(([name, version]) => `${name}@${version}`)
        .join(' ');
      
      console.log(chalk.yellow('安装生产依赖...'));
      execSync(`npm install ${depsString}`, { stdio: 'inherit' });
    }

    // 安装开发依赖
    if (Object.keys(devDeps).length > 0) {
      const devDepsString = Object.entries(devDeps)
        .map(([name, version]) => `${name}@${version}`)
        .join(' ');
      
      console.log(chalk.yellow('安装开发依赖...'));
      execSync(`npm install -D ${devDepsString}`, { stdio: 'inherit' });
    }
  }

  // 创建配置文件
  private async createConfigFiles(): Promise<void> {
    console.log(chalk.blue('\n⚙️  创建配置文件...'));
    
    // TypeScript 配置
    if (this.config.typescript) {
      this.writeJsonFile('tsconfig.json', templates.tsconfig);
      console.log(chalk.green('  ✅ 创建 tsconfig.json'));
    }
    
    // ESLint 配置
    if (this.config.eslint) {
      this.writeJsonFile('.eslintrc.json', templates.eslintConfig);
      console.log(chalk.green('  ✅ 创建 .eslintrc.json'));
    }
    
    // Prettier 配置
    if (this.config.prettier) {
      this.writeJsonFile('.prettierrc', templates.prettierConfig);
      console.log(chalk.green('  ✅ 创建 .prettierrc'));
    }
    
    // Jest 配置
    if (this.config.testing === 'jest') {
      this.writeJsonFile('jest.config.json', templates.jestConfig);
      this.writeFile('src/setupTests.ts', templates.setupTests);
      console.log(chalk.green('  ✅ 创建 Jest 配置'));
    }
    
    // Storybook 配置
    if (this.config.storybook) {
      this.writeFile('.storybook/main.ts', templates.storybookMain);
      this.writeFile('.storybook/preview.ts', templates.storybookPreview);
      console.log(chalk.green('  ✅ 创建 Storybook 配置'));
    }
    
    // Husky 配置
    if (this.config.husky) {
      this.writeJsonFile('.lintstagedrc', templates.lintStagedConfig);
      console.log(chalk.green('  ✅ 创建 lint-staged 配置'));
    }
    
    // Commitlint 配置
    if (this.config.commitlint) {
      this.writeJsonFile('.commitlintrc.json', templates.commitlintConfig);
      console.log(chalk.green('  ✅ 创建 commitlint 配置'));
    }
    
    // GitHub Actions
    this.writeFile('.github/workflows/ci.yml', templates.githubWorkflow);
    console.log(chalk.green('  ✅ 创建 GitHub Actions 工作流'));
  }

  // 创建组件标准库文件
  private async createComponentStandardsFiles(): Promise<void> {
    console.log(chalk.blue('\n🏗️  创建组件标准库文件...'));
    
    // 这些文件应该已经存在，如果不存在则创建基础版本
    const standardsFiles = [
      'src/lib/component-standards/index.ts',
      'src/lib/component-standards/design-tokens.ts',
      'src/lib/component-standards/component-factory.ts',
      'src/lib/component-standards/component-patterns.ts',
      'src/lib/component-standards/validation-schemas.ts',
      'src/lib/component-standards/accessibility-helpers.ts',
      'src/lib/component-standards/performance-optimizers.ts'
    ];
    
    standardsFiles.forEach(file => {
      const fullPath = path.join(this.projectRoot, file);
      if (!fs.existsSync(fullPath)) {
        // 创建基础导出文件
        const content = `// ${path.basename(file, '.ts')} - 待实现\nexport {};
`;
        this.writeFile(file, content);
        console.log(chalk.yellow(`  ⚠️  创建占位文件: ${file}`));
      } else {
        console.log(chalk.green(`  ✅ 文件已存在: ${file}`));
      }
    });
    
    // 创建 utils 文件
    const utilsContent = `import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`;
    
    this.writeFile('src/lib/utils.ts', utilsContent);
    console.log(chalk.green('  ✅ 创建 utils.ts'));
  }

  // 设置工具链
  private async setupToolchain(): Promise<void> {
    console.log(chalk.blue('\n🔧 设置工具链...'));
    
    // 初始化 Husky
    if (this.config.husky) {
      try {
        execSync('npx husky install', { stdio: 'inherit' });
        execSync('npx husky add .husky/pre-commit "npx lint-staged"', { stdio: 'inherit' });
        console.log(chalk.green('  ✅ 设置 Husky 预提交钩子'));
      } catch (error) {
        console.log(chalk.yellow('  ⚠️  Husky 设置失败，请手动配置'));
      }
    }
    
    // 初始化 Git（如果还没有）
    if (!fs.existsSync('.git')) {
      try {
        execSync('git init', { stdio: 'inherit' });
        console.log(chalk.green('  ✅ 初始化 Git 仓库'));
      } catch (error) {
        console.log(chalk.yellow('  ⚠️  Git 初始化失败'));
      }
    }
  }

  // 创建示例组件
  private async createExampleComponents(): Promise<void> {
    console.log(chalk.blue('\n🎨 创建示例组件...'));
    
    // Button 组件示例
    const buttonComponent = `import React from 'react';
import { createComponentVariants } from '@/lib/component-standards';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const buttonVariants = createComponentVariants({
  base: "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground hover:bg-primary/90",
      primary: "bg-primary text-primary-foreground hover:bg-primary/90",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      outline: "border border-input hover:bg-accent hover:text-accent-foreground"
    },
    size: {
      sm: "h-9 px-3 rounded-md",
      md: "h-10 py-2 px-4",
      lg: "h-11 px-8 rounded-md"
    }
  },
  defaultVariants: {
    variant: "default",
    size: "md"
  }
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
`;
    
    this.writeFile('src/components/Button.tsx', buttonComponent);
    console.log(chalk.green('  ✅ 创建 Button 组件'));
    
    // Button 测试文件
    if (this.config.testing !== 'none') {
      const buttonTest = `import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Button } from './Button';

describe('Button', () => {
  it('renders without crashing', () => {
    render(<Button>Test Button</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Button className="custom-class">Test</Button>);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('renders different variants', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
    
    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
`;
      
      this.writeFile('src/components/Button.test.tsx', buttonTest);
      console.log(chalk.green('  ✅ 创建 Button 测试文件'));
    }
    
    // Button Storybook 文件
    if (this.config.storybook) {
      const buttonStory = `import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'primary', 'secondary', 'outline'],
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Button',
  },
};

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline Button',
  },
};
`;
      
      this.writeFile('src/components/Button.stories.tsx', buttonStory);
      console.log(chalk.green('  ✅ 创建 Button Storybook 文件'));
    }
  }

  // 设置脚本
  private async setupScripts(): Promise<void> {
    console.log(chalk.blue('\n📜 设置 package.json 脚本...'));
    
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    let packageJson: any = {};
    
    if (fs.existsSync(packageJsonPath)) {
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    }
    
    // 添加脚本
    packageJson.scripts = {
      ...packageJson.scripts,
      'dev': 'next dev',
      'build': 'next build',
      'start': 'next start',
      'lint': 'eslint . --ext .ts,.tsx --fix',
      'type-check': 'tsc --noEmit',
      'test': 'jest',
      'test:watch': 'jest --watch',
      'test:coverage': 'jest --coverage',
      'component:check': 'tsx scripts/component-standards-checker.ts',
      'component:check:verbose': 'tsx scripts/component-standards-checker.ts --verbose',
      'component:migrate': 'tsx scripts/migrate-components.ts',
      'component:init': 'tsx scripts/init-component-standards.ts',
      'storybook': 'storybook dev -p 6006',
      'build-storybook': 'storybook build',
      'prepare': 'husky install'
    };
    
    if (this.config.testing === 'vitest') {
      packageJson.scripts.test = 'vitest';
      packageJson.scripts['test:watch'] = 'vitest --watch';
      packageJson.scripts['test:coverage'] = 'vitest --coverage';
    }
    
    this.writeJsonFile('package.json', packageJson);
    console.log(chalk.green('  ✅ 更新 package.json 脚本'));
  }

  // 工具方法
  private writeFile(filePath: string, content: string): void {
    const fullPath = path.join(this.projectRoot, filePath);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(fullPath, content);
  }

  private writeJsonFile(filePath: string, content: any): void {
    this.writeFile(filePath, JSON.stringify(content, null, 2));
  }

  // 打印后续步骤
  private printNextSteps(): void {
    console.log(chalk.blue('\n📋 后续步骤:'));
    console.log(chalk.white('1. 运行 npm run dev 启动开发服务器'));
    console.log(chalk.white('2. 运行 npm run component:check 检查组件标准'));
    
    if (this.config.storybook) {
      console.log(chalk.white('3. 运行 npm run storybook 启动 Storybook'));
    }
    
    if (this.config.testing !== 'none') {
      console.log(chalk.white('4. 运行 npm run test 执行测试'));
    }
    
    console.log(chalk.white('5. 查看 docs/ 目录了解更多使用指南'));
    console.log(chalk.white('6. 开始创建你的组件！'));
    
    console.log(chalk.green('\n🎯 组件标准库已准备就绪！'));
  }
}

// CLI 接口
class InitCLI {
  static async run(): Promise<void> {
    const args = process.argv.slice(2);
    
    // 解析命令行参数
    const config: InitConfig = {
      projectName: args.find(arg => arg.startsWith('--name='))?.split('=')[1] || 'my-component-library',
      framework: (args.find(arg => arg.startsWith('--framework='))?.split('=')[1] as any) || 'next',
      styling: (args.find(arg => arg.startsWith('--styling='))?.split('=')[1] as any) || 'tailwind',
      testing: (args.find(arg => arg.startsWith('--testing='))?.split('=')[1] as any) || 'jest',
      storybook: !args.includes('--no-storybook'),
      typescript: !args.includes('--no-typescript'),
      eslint: !args.includes('--no-eslint'),
      prettier: !args.includes('--no-prettier'),
      husky: !args.includes('--no-husky'),
      commitlint: !args.includes('--no-commitlint')
    };
    
    console.log(chalk.blue('🎯 组件标准库初始化配置:'));
    console.log(chalk.white(`  项目名称: ${config.projectName}`));
    console.log(chalk.white(`  框架: ${config.framework}`));
    console.log(chalk.white(`  样式: ${config.styling}`));
    console.log(chalk.white(`  测试: ${config.testing}`));
    console.log(chalk.white(`  Storybook: ${config.storybook ? '是' : '否'}`));
    console.log(chalk.white(`  TypeScript: ${config.typescript ? '是' : '否'}`));
    console.log(chalk.white(`  ESLint: ${config.eslint ? '是' : '否'}`));
    console.log(chalk.white(`  Prettier: ${config.prettier ? '是' : '否'}`));
    console.log(chalk.white(`  Husky: ${config.husky ? '是' : '否'}`));
    console.log(chalk.white(`  Commitlint: ${config.commitlint ? '是' : '否'}\n`));
    
    const initializer = new ComponentStandardsInitializer(config);
    await initializer.initialize();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  InitCLI.run().catch(error => {
    console.error(chalk.red('初始化过程中发生错误:'), error);
    process.exit(1);
  });
}

export { ComponentStandardsInitializer, InitCLI };
export type { InitConfig };