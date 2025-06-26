#!/usr/bin/env node

/**
 * 组件迁移工具
 * 自动将现有组件迁移到组件标准库模式
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import * as ts from 'typescript';
import chalk from 'chalk';

// 迁移配置接口
interface MigrationConfig {
  sourcePatterns: string[];
  targetDir: string;
  backupDir: string;
  rules: {
    addPropsInterface: boolean;
    addComponentFactory: boolean;
    addAccessibilityProps: boolean;
    addPerformanceOptimization: boolean;
    updateImports: boolean;
    addDocumentation: boolean;
    addTests: boolean;
    addStorybook: boolean;
  };
  preserveOriginal: boolean;
  dryRun: boolean;
}

// 迁移结果接口
interface MigrationResult {
  file: string;
  status: 'success' | 'error' | 'skipped';
  changes: string[];
  errors: string[];
  warnings: string[];
}

// 组件信息接口
interface ComponentInfo {
  name: string;
  filePath: string;
  isFunction: boolean;
  hasProps: boolean;
  propsType?: string;
  imports: string[];
  exports: string[];
  jsxElements: string[];
  hooks: string[];
  complexity: number;
}

// 默认迁移配置
const defaultConfig: MigrationConfig = {
  sourcePatterns: [
    'components/**/*.tsx',
    'src/components/**/*.tsx'
  ],
  targetDir: 'components-migrated',
  backupDir: 'components-backup',
  rules: {
    addPropsInterface: true,
    addComponentFactory: true,
    addAccessibilityProps: true,
    addPerformanceOptimization: true,
    updateImports: true,
    addDocumentation: true,
    addTests: false,
    addStorybook: false
  },
  preserveOriginal: true,
  dryRun: false
};

// 组件迁移器类
class ComponentMigrator {
  private config: MigrationConfig;
  private results: MigrationResult[] = [];

  constructor(config: MigrationConfig = defaultConfig) {
    this.config = config;
  }

  // 主迁移方法
  async migrate(): Promise<MigrationResult[]> {
    console.log(chalk.blue('🚀 开始组件迁移...\n'));

    if (this.config.dryRun) {
      console.log(chalk.yellow('⚠️  干运行模式 - 不会实际修改文件\n'));
    }

    // 获取需要迁移的文件
    const files = await this.getFilesToMigrate();
    console.log(chalk.green(`📁 找到 ${files.length} 个组件文件\n`));

    // 创建备份和目标目录
    if (!this.config.dryRun) {
      this.ensureDirectories();
    }

    // 迁移每个文件
    for (const file of files) {
      const result = await this.migrateFile(file);
      this.results.push(result);
      this.printFileResult(result);
    }

    this.printSummary();
    return this.results;
  }

  // 获取需要迁移的文件
  private async getFilesToMigrate(): Promise<string[]> {
    const allFiles: string[] = [];

    for (const pattern of this.config.sourcePatterns) {
      const files = await glob(pattern, {
        ignore: ['node_modules/**', 'dist/**', 'build/**']
      });
      allFiles.push(...files);
    }

    return [...new Set(allFiles)];
  }

  // 确保目录存在
  private ensureDirectories(): void {
    if (this.config.preserveOriginal && !fs.existsSync(this.config.backupDir)) {
      fs.mkdirSync(this.config.backupDir, { recursive: true });
    }
    
    if (!fs.existsSync(this.config.targetDir)) {
      fs.mkdirSync(this.config.targetDir, { recursive: true });
    }
  }

  // 迁移单个文件
  private async migrateFile(filePath: string): Promise<MigrationResult> {
    const result: MigrationResult = {
      file: filePath,
      status: 'success',
      changes: [],
      errors: [],
      warnings: []
    };

    try {
      // 读取和分析文件
      const content = fs.readFileSync(filePath, 'utf-8');
      const componentInfo = this.analyzeComponent(filePath, content);

      if (!componentInfo) {
        result.status = 'skipped';
        result.warnings.push('未检测到 React 组件');
        return result;
      }

      // 备份原文件
      if (this.config.preserveOriginal && !this.config.dryRun) {
        const backupPath = path.join(this.config.backupDir, path.basename(filePath));
        fs.copyFileSync(filePath, backupPath);
        result.changes.push(`备份到 ${backupPath}`);
      }

      // 生成迁移后的代码
      const migratedCode = this.generateMigratedCode(componentInfo, content);

      // 写入迁移后的文件
      if (!this.config.dryRun) {
        const targetPath = path.join(this.config.targetDir, path.basename(filePath));
        fs.writeFileSync(targetPath, migratedCode);
        result.changes.push(`迁移到 ${targetPath}`);
      } else {
        result.changes.push('生成迁移代码（干运行）');
      }

      // 生成相关文件
      if (this.config.rules.addTests) {
        const testCode = this.generateTestFile(componentInfo);
        if (!this.config.dryRun) {
          const testPath = path.join(
            this.config.targetDir,
            `${componentInfo.name}.test.tsx`
          );
          fs.writeFileSync(testPath, testCode);
          result.changes.push(`生成测试文件 ${testPath}`);
        } else {
          result.changes.push('生成测试文件（干运行）');
        }
      }

      if (this.config.rules.addStorybook) {
        const storyCode = this.generateStoryFile(componentInfo);
        if (!this.config.dryRun) {
          const storyPath = path.join(
            this.config.targetDir,
            `${componentInfo.name}.stories.tsx`
          );
          fs.writeFileSync(storyPath, storyCode);
          result.changes.push(`生成 Storybook 文件 ${storyPath}`);
        } else {
          result.changes.push('生成 Storybook 文件（干运行）');
        }
      }

    } catch (error) {
      result.status = 'error';
      result.errors.push(`迁移失败: ${error}`);
    }

    return result;
  }

  // 分析组件
  private analyzeComponent(filePath: string, content: string): ComponentInfo | null {
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    let componentInfo: ComponentInfo | null = null;
    const imports: string[] = [];
    const exports: string[] = [];
    const jsxElements: string[] = [];
    const hooks: string[] = [];
    let complexity = 0;

    const visit = (node: ts.Node) => {
      // 检测组件声明
      if (ts.isFunctionDeclaration(node) && node.name) {
        const name = node.name.text;
        if (this.isReactComponent(node)) {
          componentInfo = {
            name,
            filePath,
            isFunction: true,
            hasProps: node.parameters.length > 0,
            propsType: this.getPropsType(node),
            imports,
            exports,
            jsxElements,
            hooks,
            complexity: 0
          };
        }
      }

      // 检测变量声明中的组件
      if (ts.isVariableDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
        const name = node.name.text;
        if (node.initializer && this.isReactComponent(node.initializer)) {
          componentInfo = {
            name,
            filePath,
            isFunction: true,
            hasProps: this.hasPropsParameter(node.initializer),
            propsType: this.getPropsTypeFromInitializer(node.initializer),
            imports,
            exports,
            jsxElements,
            hooks,
            complexity: 0
          };
        }
      }

      // 收集导入
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier.getText().replace(/["']/g, '');
        imports.push(moduleSpecifier);
      }

      // 收集导出
      if (ts.isExportDeclaration(node) || ts.isExportAssignment(node)) {
        exports.push(node.getText());
      }

      // 收集 JSX 元素
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tagName = this.getJsxTagName(node);
        if (!jsxElements.includes(tagName)) {
          jsxElements.push(tagName);
        }
      }

      // 收集 Hook 调用
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        const name = node.expression.text;
        if (name.startsWith('use') && !hooks.includes(name)) {
          hooks.push(name);
        }
      }

      // 计算复杂度
      if (ts.isIfStatement(node) || ts.isConditionalExpression(node)) {
        complexity += 1;
      }
      if (ts.isForStatement(node) || ts.isWhileStatement(node)) {
        complexity += 2;
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    if (componentInfo) {
      componentInfo.complexity = complexity;
    }

    return componentInfo;
  }

  // 生成迁移后的代码
  private generateMigratedCode(componentInfo: ComponentInfo, originalContent: string): string {
    let code = '';

    // 添加导入
    code += this.generateImports(componentInfo);
    code += '\n';

    // 添加 Props 接口
    if (this.config.rules.addPropsInterface && componentInfo.hasProps) {
      code += this.generatePropsInterface(componentInfo);
      code += '\n';
    }

    // 添加组件变体（如果使用组件工厂）
    if (this.config.rules.addComponentFactory) {
      code += this.generateComponentVariants(componentInfo);
      code += '\n';
    }

    // 生成主组件
    code += this.generateMainComponent(componentInfo, originalContent);
    code += '\n';

    // 添加导出
    code += this.generateExports(componentInfo);

    return code;
  }

  // 生成导入语句
  private generateImports(componentInfo: ComponentInfo): string {
    const imports = [
      "import React from 'react';",
    ];

    if (this.config.rules.addComponentFactory) {
      imports.push(
        "import { createStandardComponent, createComponentVariants } from '@/lib/component-standards';",
        "import { cn } from '@/lib/utils';"
      );
    }

    if (this.config.rules.addAccessibilityProps) {
      imports.push(
        "import { useAccessibilityValidation, useAriaRelationships } from '@/lib/component-standards/accessibility-helpers';"
      );
    }

    if (this.config.rules.addPerformanceOptimization && componentInfo.complexity > 5) {
      imports.push(
        "import { createOptimizedMemo, useStableCallback } from '@/lib/component-standards/performance-optimizers';"
      );
    }

    // 保留原有的第三方导入
    componentInfo.imports.forEach(imp => {
      if (!imp.startsWith('.') && !imp.startsWith('@/') && imp !== 'react') {
        imports.push(`import from '${imp}';`);
      }
    });

    return imports.join('\n');
  }

  // 生成 Props 接口
  private generatePropsInterface(componentInfo: ComponentInfo): string {
    const interfaceName = `${componentInfo.name}Props`;
    
    let propsInterface = `interface ${interfaceName} {\n`;
    
    // 基础属性
    propsInterface += '  className?: string;\n';
    propsInterface += '  children?: React.ReactNode;\n';
    
    // 如果使用组件工厂，添加变体属性
    if (this.config.rules.addComponentFactory) {
      propsInterface += '  variant?: "default" | "primary" | "secondary" | "outline";\n';
      propsInterface += '  size?: "sm" | "md" | "lg";\n';
    }
    
    // 可访问性属性
    if (this.config.rules.addAccessibilityProps) {
      propsInterface += '  "aria-label"?: string;\n';
      propsInterface += '  "aria-labelledby"?: string;\n';
      propsInterface += '  "aria-describedby"?: string;\n';
    }
    
    // 根据 JSX 元素添加特定属性
    if (componentInfo.jsxElements.includes('button')) {
      propsInterface += '  onClick?: () => void;\n';
      propsInterface += '  disabled?: boolean;\n';
    }
    
    if (componentInfo.jsxElements.includes('input')) {
      propsInterface += '  value?: string;\n';
      propsInterface += '  onChange?: (value: string) => void;\n';
      propsInterface += '  placeholder?: string;\n';
    }
    
    propsInterface += '}\n';
    
    return propsInterface;
  }

  // 生成组件变体
  private generateComponentVariants(componentInfo: ComponentInfo): string {
    const variantName = `${componentInfo.name.toLowerCase()}Variants`;
    
    return `const ${variantName} = createComponentVariants({
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
});\n`;
  }

  // 生成主组件
  private generateMainComponent(componentInfo: ComponentInfo, originalContent: string): string {
    const propsType = this.config.rules.addPropsInterface ? `${componentInfo.name}Props` : 'any';
    
    let component = `const ${componentInfo.name} = React.forwardRef<HTMLElement, ${propsType}>((\n`;
    component += '  { className, children, variant, size, ...props },\n';
    component += '  ref\n';
    component += ') => {\n';
    
    // 添加可访问性验证
    if (this.config.rules.addAccessibilityProps) {
      component += '  useAccessibilityValidation(props);\n';
    }
    
    // 添加组件变体类名
    if (this.config.rules.addComponentFactory) {
      const variantName = `${componentInfo.name.toLowerCase()}Variants`;
      component += `  const classes = cn(${variantName}({ variant, size }), className);\n`;
    }
    
    // 提取原组件的主要逻辑（简化版）
    component += '\n  // TODO: 迁移原组件逻辑\n';
    component += '  // 原组件代码需要手动迁移\n\n';
    
    // 基础返回结构
    const mainElement = this.getMainJsxElement(componentInfo);
    component += `  return (\n`;
    component += `    <${mainElement}\n`;
    component += '      ref={ref}\n';
    
    if (this.config.rules.addComponentFactory) {
      component += '      className={classes}\n';
    } else {
      component += '      className={className}\n';
    }
    
    component += '      {...props}\n';
    component += '    >\n';
    component += '      {children}\n';
    component += `    </${mainElement}>\n`;
    component += '  );\n';
    component += '});\n';
    
    // 添加显示名称
    component += `\n${componentInfo.name}.displayName = "${componentInfo.name}";\n`;
    
    // 如果需要性能优化
    if (this.config.rules.addPerformanceOptimization && componentInfo.complexity > 5) {
      component = `const Optimized${componentInfo.name} = createOptimizedMemo(${component});\n`;
    }
    
    return component;
  }

  // 生成导出语句
  private generateExports(componentInfo: ComponentInfo): string {
    let exports = `export { ${componentInfo.name} };\n`;
    
    if (this.config.rules.addPropsInterface) {
      exports += `export type { ${componentInfo.name}Props };\n`;
    }
    
    exports += `export default ${componentInfo.name};\n`;
    
    return exports;
  }

  // 生成测试文件
  private generateTestFile(componentInfo: ComponentInfo): string {
    return `import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ${componentInfo.name} } from './${componentInfo.name}';

describe('${componentInfo.name}', () => {
  it('renders without crashing', () => {
    render(<${componentInfo.name} />);
  });

  it('applies custom className', () => {
    const customClass = 'custom-class';
    render(<${componentInfo.name} className={customClass} />);
    // Add specific assertions based on component structure
  });

  it('renders children correctly', () => {
    const testContent = 'Test Content';
    render(<${componentInfo.name}>{testContent}</${componentInfo.name}>);
    expect(screen.getByText(testContent)).toBeInTheDocument();
  });

  // Add more specific tests based on component functionality
});
`;
  }

  // 生成 Storybook 文件
  private generateStoryFile(componentInfo: ComponentInfo): string {
    return `import type { Meta, StoryObj } from '@storybook/react';
import { ${componentInfo.name} } from './${componentInfo.name}';

const meta: Meta<typeof ${componentInfo.name}> = {
  title: 'Components/${componentInfo.name}',
  component: ${componentInfo.name},
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
    children: '${componentInfo.name}',
  },
};

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary ${componentInfo.name}',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary ${componentInfo.name}',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline ${componentInfo.name}',
  },
};
`;
  }

  // 工具方法
  private isReactComponent(node: ts.Node): boolean {
    const text = node.getText();
    return text.includes('jsx') || text.includes('JSX') || text.includes('React.') || 
           /return\s*\(\s*</.test(text) || /return\s*</.test(text);
  }

  private hasPropsParameter(node: ts.Node): boolean {
    if (ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
      return node.parameters.length > 0;
    }
    return false;
  }

  private getPropsType(node: ts.FunctionDeclaration): string | undefined {
    if (node.parameters.length > 0) {
      const firstParam = node.parameters[0];
      if (firstParam.type) {
        return firstParam.type.getText();
      }
    }
    return undefined;
  }

  private getPropsTypeFromInitializer(node: ts.Node): string | undefined {
    // 简化实现
    return undefined;
  }

  private getJsxTagName(node: ts.JsxElement | ts.JsxSelfClosingElement): string {
    if (ts.isJsxElement(node)) {
      return node.openingElement.tagName.getText();
    }
    return node.tagName.getText();
  }

  private getMainJsxElement(componentInfo: ComponentInfo): string {
    // 根据组件中使用的元素推断主要元素
    if (componentInfo.jsxElements.includes('button')) return 'button';
    if (componentInfo.jsxElements.includes('input')) return 'input';
    if (componentInfo.jsxElements.includes('div')) return 'div';
    return 'div'; // 默认
  }

  // 打印单个文件结果
  private printFileResult(result: MigrationResult): void {
    const statusIcon = result.status === 'success' ? '✅' : 
                      result.status === 'error' ? '❌' : '⏭️';
    
    console.log(`${statusIcon} ${result.file}`);
    
    if (result.changes.length > 0) {
      result.changes.forEach(change => {
        console.log(`  ${chalk.green('+')} ${change}`);
      });
    }
    
    if (result.warnings.length > 0) {
      result.warnings.forEach(warning => {
        console.log(`  ${chalk.yellow('⚠')} ${warning}`);
      });
    }
    
    if (result.errors.length > 0) {
      result.errors.forEach(error => {
        console.log(`  ${chalk.red('✗')} ${error}`);
      });
    }
    
    console.log('');
  }

  // 打印迁移摘要
  private printSummary(): void {
    console.log(chalk.blue('\n📊 迁移摘要\n'));
    
    const totalFiles = this.results.length;
    const successCount = this.results.filter(r => r.status === 'success').length;
    const errorCount = this.results.filter(r => r.status === 'error').length;
    const skippedCount = this.results.filter(r => r.status === 'skipped').length;
    
    console.log(`📁 总文件数: ${totalFiles}`);
    console.log(`✅ 成功迁移: ${chalk.green(successCount)}`);
    console.log(`❌ 迁移失败: ${chalk.red(errorCount)}`);
    console.log(`⏭️  跳过文件: ${chalk.yellow(skippedCount)}`);
    
    const totalChanges = this.results.reduce((sum, r) => sum + r.changes.length, 0);
    console.log(`🔄 总变更数: ${totalChanges}`);
    
    if (this.config.dryRun) {
      console.log(chalk.yellow('\n⚠️  这是干运行模式，没有实际修改文件'));
      console.log(chalk.blue('💡 要执行实际迁移，请移除 --dry-run 参数'));
    } else {
      console.log(chalk.green('\n🎉 迁移完成！'));
      if (this.config.preserveOriginal) {
        console.log(chalk.blue(`📦 原文件已备份到: ${this.config.backupDir}`));
      }
      console.log(chalk.blue(`📁 迁移文件位于: ${this.config.targetDir}`));
    }
  }
}

// CLI 接口
class MigrationCLI {
  static async run(): Promise<void> {
    const args = process.argv.slice(2);
    const configPath = args.find(arg => arg.startsWith('--config='))?.split('=')[1];
    const dryRun = args.includes('--dry-run');
    const noBackup = args.includes('--no-backup');
    const targetDir = args.find(arg => arg.startsWith('--target='))?.split('=')[1];
    
    // 加载配置
    let config = defaultConfig;
    if (configPath && fs.existsSync(configPath)) {
      try {
        const configContent = fs.readFileSync(configPath, 'utf-8');
        config = { ...defaultConfig, ...JSON.parse(configContent) };
      } catch (error) {
        console.error(chalk.red(`配置文件加载失败: ${error}`));
        process.exit(1);
      }
    }
    
    // 应用命令行参数
    if (dryRun) config.dryRun = true;
    if (noBackup) config.preserveOriginal = false;
    if (targetDir) config.targetDir = targetDir;
    
    // 运行迁移
    const migrator = new ComponentMigrator(config);
    const results = await migrator.migrate();
    
    // 根据结果设置退出码
    const hasErrors = results.some(r => r.status === 'error');
    if (hasErrors) {
      process.exit(1);
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  MigrationCLI.run().catch(error => {
    console.error(chalk.red('迁移过程中发生错误:'), error);
    process.exit(1);
  });
}

export { ComponentMigrator, MigrationCLI };
export type { MigrationConfig, MigrationResult, ComponentInfo };