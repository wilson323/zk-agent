#!/usr/bin/env node

/**
 * 组件标准检查工具
 * 用于验证项目中的组件是否遵循组件标准库的规范
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import * as ts from 'typescript';
import chalk from 'chalk';
import { z } from 'zod';

// 检查结果接口
interface CheckResult {
  file: string;
  issues: Issue[];
  score: number;
  suggestions: string[];
}

interface Issue {
  type: 'error' | 'warning' | 'info';
  rule: string;
  message: string;
  line?: number;
  column?: number;
  severity: 'high' | 'medium' | 'low';
}

// 检查规则配置
interface CheckConfig {
  rules: {
    [ruleName: string]: {
      enabled: boolean;
      severity: 'error' | 'warning' | 'info';
      options?: any;
    };
  };
  exclude: string[];
  include: string[];
}

// 默认配置
const defaultConfig: CheckConfig = {
  rules: {
    'component-naming': {
      enabled: true,
      severity: 'error'
    },
    'props-interface': {
      enabled: true,
      severity: 'error'
    },
    'accessibility-props': {
      enabled: true,
      severity: 'warning'
    },
    'performance-optimization': {
      enabled: true,
      severity: 'info'
    },
    'design-tokens-usage': {
      enabled: true,
      severity: 'warning'
    },
    'component-factory-usage': {
      enabled: true,
      severity: 'info'
    },
    'typescript-strict': {
      enabled: true,
      severity: 'error'
    },
    'testing-coverage': {
      enabled: true,
      severity: 'warning'
    }
  },
  exclude: [
    'node_modules/**',
    'dist/**',
    'build/**',
    '**/*.test.tsx',
    '**/*.stories.tsx'
  ],
  include: [
    'components/**/*.tsx',
    'components/**/*.ts',
    'src/components/**/*.tsx',
    'src/components/**/*.ts'
  ]
};

// 检查器类
class ComponentStandardsChecker {
  private config: CheckConfig;
  private program: ts.Program;
  private checker: ts.TypeChecker;

  constructor(config: CheckConfig = defaultConfig) {
    this.config = config;
    
    // 创建 TypeScript 程序
    const configPath = ts.findConfigFile('./', ts.sys.fileExists, 'tsconfig.json');
    const tsConfig = configPath ? ts.readConfigFile(configPath, ts.sys.readFile) : undefined;
    
    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      ...tsConfig?.config?.compilerOptions
    };

    this.program = ts.createProgram([], compilerOptions);
    this.checker = this.program.getTypeChecker();
  }

  // 主检查方法
  async check(): Promise<CheckResult[]> {
    console.log(chalk.blue('🔍 开始检查组件标准合规性...\n'));

    const files = await this.getFilesToCheck();
    const results: CheckResult[] = [];

    for (const file of files) {
      const result = await this.checkFile(file);
      results.push(result);
    }

    this.printSummary(results);
    return results;
  }

  // 获取需要检查的文件
  private async getFilesToCheck(): Promise<string[]> {
    const allFiles: string[] = [];

    for (const pattern of this.config.include) {
      const files = await glob(pattern, {
        ignore: this.config.exclude
      });
      allFiles.push(...files);
    }

    return [...new Set(allFiles)];
  }

  // 检查单个文件
  private async checkFile(filePath: string): Promise<CheckResult> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    const issues: Issue[] = [];
    const suggestions: string[] = [];

    // 执行各种检查规则
    if (this.config.rules['component-naming']?.enabled) {
      issues.push(...this.checkComponentNaming(sourceFile));
    }

    if (this.config.rules['props-interface']?.enabled) {
      issues.push(...this.checkPropsInterface(sourceFile));
    }

    if (this.config.rules['accessibility-props']?.enabled) {
      issues.push(...this.checkAccessibilityProps(sourceFile));
    }

    if (this.config.rules['performance-optimization']?.enabled) {
      issues.push(...this.checkPerformanceOptimization(sourceFile));
    }

    if (this.config.rules['design-tokens-usage']?.enabled) {
      issues.push(...this.checkDesignTokensUsage(sourceFile));
    }

    if (this.config.rules['component-factory-usage']?.enabled) {
      issues.push(...this.checkComponentFactoryUsage(sourceFile));
    }

    if (this.config.rules['typescript-strict']?.enabled) {
      issues.push(...this.checkTypeScriptStrict(sourceFile));
    }

    // 生成建议
    suggestions.push(...this.generateSuggestions(sourceFile, issues));

    // 计算分数
    const score = this.calculateScore(issues);

    return {
      file: filePath,
      issues,
      score,
      suggestions
    };
  }

  // 检查组件命名规范
  private checkComponentNaming(sourceFile: ts.SourceFile): Issue[] {
    const issues: Issue[] = [];

    const visit = (node: ts.Node) => {
      // 检查函数组件命名
      if (ts.isFunctionDeclaration(node) && node.name) {
        const name = node.name.text;
        if (!this.isPascalCase(name)) {
          issues.push({
            type: 'error',
            rule: 'component-naming',
            message: `组件名称 "${name}" 应使用 PascalCase`,
            line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
            severity: 'high'
          });
        }
      }

      // 检查变量声明中的组件
      if (ts.isVariableDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
        const name = node.name.text;
        if (node.initializer && this.isReactComponent(node.initializer)) {
          if (!this.isPascalCase(name)) {
            issues.push({
              type: 'error',
              rule: 'component-naming',
              message: `组件名称 "${name}" 应使用 PascalCase`,
              line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
              severity: 'high'
            });
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return issues;
  }

  // 检查 Props 接口定义
  private checkPropsInterface(sourceFile: ts.SourceFile): Issue[] {
    const issues: Issue[] = [];
    const componentNames: string[] = [];
    const interfaceNames: string[] = [];

    const visit = (node: ts.Node) => {
      // 收集组件名称
      if ((ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node)) && node.name) {
        const name = ts.isIdentifier(node.name) ? node.name.text : '';
        if (name && this.isReactComponent(node)) {
          componentNames.push(name);
        }
      }

      // 收集接口名称
      if (ts.isInterfaceDeclaration(node)) {
        interfaceNames.push(node.name.text);
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    // 检查每个组件是否有对应的 Props 接口
    componentNames.forEach(componentName => {
      const expectedPropsName = `${componentName}Props`;
      if (!interfaceNames.includes(expectedPropsName)) {
        issues.push({
          type: 'warning',
          rule: 'props-interface',
          message: `组件 "${componentName}" 缺少 Props 接口定义 "${expectedPropsName}"`,
          severity: 'medium'
        });
      }
    });

    return issues;
  }

  // 检查可访问性属性
  private checkAccessibilityProps(sourceFile: ts.SourceFile): Issue[] {
    const issues: Issue[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tagName = this.getJsxTagName(node);
        
        // 检查交互元素的可访问性
        if (['button', 'input', 'select', 'textarea'].includes(tagName.toLowerCase())) {
          const attributes = this.getJsxAttributes(node);
          
          if (tagName.toLowerCase() === 'button' && !attributes.includes('aria-label') && !this.hasTextContent(node)) {
            issues.push({
              type: 'warning',
              rule: 'accessibility-props',
              message: '按钮元素应该有 aria-label 或文本内容',
              line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
              severity: 'medium'
            });
          }

          if (tagName.toLowerCase() === 'input' && !attributes.includes('aria-label') && !attributes.includes('aria-labelledby')) {
            issues.push({
              type: 'warning',
              rule: 'accessibility-props',
              message: '输入元素应该有 aria-label 或 aria-labelledby',
              line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
              severity: 'medium'
            });
          }
        }

        // 检查图片的 alt 属性
        if (tagName.toLowerCase() === 'img') {
          const attributes = this.getJsxAttributes(node);
          if (!attributes.includes('alt')) {
            issues.push({
              type: 'error',
              rule: 'accessibility-props',
              message: '图片元素必须有 alt 属性',
              line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
              severity: 'high'
            });
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return issues;
  }

  // 检查性能优化
  private checkPerformanceOptimization(sourceFile: ts.SourceFile): Issue[] {
    const issues: Issue[] = [];
    let hasReactMemo = false;
    let hasUseCallback = false;
    let hasUseMemo = false;

    const visit = (node: ts.Node) => {
      // 检查是否使用了 React.memo
      if (ts.isCallExpression(node)) {
        const expression = node.expression;
        if (ts.isPropertyAccessExpression(expression) && 
            expression.expression.getText() === 'React' && 
            expression.name.text === 'memo') {
          hasReactMemo = true;
        }
        if (ts.isIdentifier(expression) && expression.text === 'memo') {
          hasReactMemo = true;
        }
      }

      // 检查是否使用了 useCallback 和 useMemo
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        const functionName = node.expression.text;
        if (functionName === 'useCallback') {
          hasUseCallback = true;
        }
        if (functionName === 'useMemo') {
          hasUseMemo = true;
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    // 检查是否有复杂组件但没有使用性能优化
    const componentComplexity = this.calculateComponentComplexity(sourceFile);
    if (componentComplexity > 10) {
      if (!hasReactMemo) {
        issues.push({
          type: 'info',
          rule: 'performance-optimization',
          message: '复杂组件建议使用 React.memo 进行优化',
          severity: 'low'
        });
      }
      if (!hasUseCallback) {
        issues.push({
          type: 'info',
          rule: 'performance-optimization',
          message: '复杂组件建议使用 useCallback 优化回调函数',
          severity: 'low'
        });
      }
    }

    return issues;
  }

  // 检查设计令牌使用
  private checkDesignTokensUsage(sourceFile: ts.SourceFile): Issue[] {
    const issues: Issue[] = [];
    const content = sourceFile.getFullText();

    // 检查硬编码的颜色值
    const colorRegex = /#[0-9a-fA-F]{3,6}|rgb\(|rgba\(|hsl\(|hsla\(/g;
    const colorMatches = content.match(colorRegex);
    
    if (colorMatches && colorMatches.length > 0) {
      issues.push({
        type: 'warning',
        rule: 'design-tokens-usage',
        message: `发现 ${colorMatches.length} 个硬编码的颜色值，建议使用设计令牌`,
        severity: 'medium'
      });
    }

    // 检查硬编码的间距值
    const spacingRegex = /\b\d+px\b/g;
    const spacingMatches = content.match(spacingRegex);
    
    if (spacingMatches && spacingMatches.length > 2) {
      issues.push({
        type: 'info',
        rule: 'design-tokens-usage',
        message: `发现多个硬编码的像素值，建议使用设计令牌中的间距系统`,
        severity: 'low'
      });
    }

    return issues;
  }

  // 检查组件工厂使用
  private checkComponentFactoryUsage(sourceFile: ts.SourceFile): Issue[] {
    const issues: Issue[] = [];
    let hasComponentFactory = false;
    let hasClassVarianceAuthority = false;

    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier.getText().replace(/["']/g, '');
        
        if (moduleSpecifier.includes('component-standards')) {
          hasComponentFactory = true;
        }
        
        if (moduleSpecifier === 'class-variance-authority') {
          hasClassVarianceAuthority = true;
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    // 如果使用了 cva 但没有使用组件工厂，建议迁移
    if (hasClassVarianceAuthority && !hasComponentFactory) {
      issues.push({
        type: 'info',
        rule: 'component-factory-usage',
        message: '建议使用组件标准库的组件工厂替代直接使用 class-variance-authority',
        severity: 'low'
      });
    }

    return issues;
  }

  // 检查 TypeScript 严格模式
  private checkTypeScriptStrict(sourceFile: ts.SourceFile): Issue[] {
    const issues: Issue[] = [];

    const visit = (node: ts.Node) => {
      // 检查 any 类型的使用
      if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName) && node.typeName.text === 'any') {
        issues.push({
          type: 'warning',
          rule: 'typescript-strict',
          message: '避免使用 any 类型，建议使用更具体的类型定义',
          line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          severity: 'medium'
        });
      }

      // 检查未定义类型的参数
      if (ts.isParameter(node) && !node.type) {
        issues.push({
          type: 'warning',
          rule: 'typescript-strict',
          message: '参数缺少类型定义',
          line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          severity: 'medium'
        });
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return issues;
  }

  // 生成改进建议
  private generateSuggestions(sourceFile: ts.SourceFile, issues: Issue[]): string[] {
    const suggestions: string[] = [];
    const errorCount = issues.filter(i => i.type === 'error').length;
    const warningCount = issues.filter(i => i.type === 'warning').length;

    if (errorCount > 0) {
      suggestions.push('优先修复所有错误级别的问题');
    }

    if (warningCount > 3) {
      suggestions.push('考虑重构组件以减少警告数量');
    }

    if (issues.some(i => i.rule === 'accessibility-props')) {
      suggestions.push('参考 WCAG 2.1 指南改进可访问性');
    }

    if (issues.some(i => i.rule === 'performance-optimization')) {
      suggestions.push('使用 React DevTools Profiler 分析性能瓶颈');
    }

    if (issues.some(i => i.rule === 'design-tokens-usage')) {
      suggestions.push('迁移到设计令牌系统以提高一致性');
    }

    return suggestions;
  }

  // 计算组件分数
  private calculateScore(issues: Issue[]): number {
    const maxScore = 100;
    let deductions = 0;

    issues.forEach(issue => {
      switch (issue.severity) {
        case 'high':
          deductions += 15;
          break;
        case 'medium':
          deductions += 8;
          break;
        case 'low':
          deductions += 3;
          break;
      }
    });

    return Math.max(0, maxScore - deductions);
  }

  // 计算组件复杂度
  private calculateComponentComplexity(sourceFile: ts.SourceFile): number {
    let complexity = 0;

    const visit = (node: ts.Node) => {
      // 条件语句增加复杂度
      if (ts.isIfStatement(node) || ts.isConditionalExpression(node)) {
        complexity += 1;
      }

      // 循环语句增加复杂度
      if (ts.isForStatement(node) || ts.isWhileStatement(node) || ts.isDoStatement(node)) {
        complexity += 2;
      }

      // JSX 元素增加复杂度
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
        complexity += 0.5;
      }

      // Hook 调用增加复杂度
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        const name = node.expression.text;
        if (name.startsWith('use')) {
          complexity += 1;
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return complexity;
  }

  // 工具方法
  private isPascalCase(name: string): boolean {
    return /^[A-Z][a-zA-Z0-9]*$/.test(name);
  }

  private isReactComponent(node: ts.Node): boolean {
    // 简化的 React 组件检测
    const text = node.getText();
    return text.includes('React.') || text.includes('jsx') || text.includes('tsx');
  }

  private getJsxTagName(node: ts.JsxElement | ts.JsxSelfClosingElement): string {
    if (ts.isJsxElement(node)) {
      return node.openingElement.tagName.getText();
    }
    return node.tagName.getText();
  }

  private getJsxAttributes(node: ts.JsxElement | ts.JsxSelfClosingElement): string[] {
    const attributes: string[] = [];
    const props = ts.isJsxElement(node) 
      ? node.openingElement.attributes.properties
      : node.attributes.properties;

    props.forEach(prop => {
      if (ts.isJsxAttribute(prop) && prop.name) {
        attributes.push(prop.name.text);
      }
    });

    return attributes;
  }

  private hasTextContent(node: ts.JsxElement | ts.JsxSelfClosingElement): boolean {
    if (ts.isJsxSelfClosingElement(node)) {
      return false;
    }
    
    return node.children.some(child => 
      ts.isJsxText(child) && child.text.trim().length > 0
    );
  }

  // 打印检查摘要
  private printSummary(results: CheckResult[]): void {
    console.log(chalk.blue('\n📊 检查摘要\n'));

    const totalFiles = results.length;
    const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
    const averageScore = results.reduce((sum, r) => sum + r.score, 0) / totalFiles;

    const errorCount = results.reduce((sum, r) => 
      sum + r.issues.filter(i => i.type === 'error').length, 0
    );
    const warningCount = results.reduce((sum, r) => 
      sum + r.issues.filter(i => i.type === 'warning').length, 0
    );
    const infoCount = results.reduce((sum, r) => 
      sum + r.issues.filter(i => i.type === 'info').length, 0
    );

    console.log(`📁 检查文件数: ${totalFiles}`);
    console.log(`🐛 总问题数: ${totalIssues}`);
    console.log(`❌ 错误: ${chalk.red(errorCount)}`);
    console.log(`⚠️  警告: ${chalk.yellow(warningCount)}`);
    console.log(`ℹ️  信息: ${chalk.blue(infoCount)}`);
    console.log(`📈 平均分数: ${this.getScoreColor(averageScore)}${averageScore.toFixed(1)}/100${chalk.reset()}`);

    // 显示分数分布
    console.log('\n📊 分数分布:');
    const scoreRanges = {
      '90-100': 0,
      '80-89': 0,
      '70-79': 0,
      '60-69': 0,
      '< 60': 0
    };

    results.forEach(result => {
      if (result.score >= 90) scoreRanges['90-100']++;
      else if (result.score >= 80) scoreRanges['80-89']++;
      else if (result.score >= 70) scoreRanges['70-79']++;
      else if (result.score >= 60) scoreRanges['60-69']++;
      else scoreRanges['< 60']++;
    });

    Object.entries(scoreRanges).forEach(([range, count]) => {
      const percentage = ((count / totalFiles) * 100).toFixed(1);
      console.log(`  ${range}: ${count} 文件 (${percentage}%)`);
    });

    // 显示最需要改进的文件
    console.log('\n🔧 最需要改进的文件:');
    const worstFiles = results
      .sort((a, b) => a.score - b.score)
      .slice(0, 5);

    worstFiles.forEach((result, index) => {
      const scoreColor = this.getScoreColor(result.score);
      console.log(`  ${index + 1}. ${result.file} - ${scoreColor}${result.score}/100${chalk.reset()}`);
      
      if (result.issues.length > 0) {
        const topIssue = result.issues[0];
        console.log(`     ${this.getIssueIcon(topIssue.type)} ${topIssue.message}`);
      }
    });

    // 显示改进建议
    console.log('\n💡 总体建议:');
    const allSuggestions = results.flatMap(r => r.suggestions);
    const uniqueSuggestions = [...new Set(allSuggestions)];
    
    uniqueSuggestions.slice(0, 5).forEach((suggestion, index) => {
      console.log(`  ${index + 1}. ${suggestion}`);
    });

    console.log('\n');
  }

  private getScoreColor(score: number): string {
    if (score >= 90) return chalk.green;
    if (score >= 80) return chalk.yellow;
    if (score >= 70) return chalk.orange;
    return chalk.red;
  }

  private getIssueIcon(type: string): string {
    switch (type) {
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '•';
    }
  }
}

// CLI 接口
class CLI {
  static async run(): Promise<void> {
    const args = process.argv.slice(2);
    const configPath = args.find(arg => arg.startsWith('--config='))?.split('=')[1];
    const outputPath = args.find(arg => arg.startsWith('--output='))?.split('=')[1];
    const verbose = args.includes('--verbose');
    const fix = args.includes('--fix');

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

    // 运行检查
    const checker = new ComponentStandardsChecker(config);
    const results = await checker.check();

    // 输出详细结果
    if (verbose) {
      results.forEach(result => {
        console.log(chalk.cyan(`\n📄 ${result.file}`));
        console.log(`分数: ${result.score}/100`);
        
        if (result.issues.length > 0) {
          console.log('问题:');
          result.issues.forEach(issue => {
            const icon = issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️';
            const location = issue.line ? `:${issue.line}` : '';
            console.log(`  ${icon} ${issue.message} ${location}`);
          });
        }
        
        if (result.suggestions.length > 0) {
          console.log('建议:');
          result.suggestions.forEach(suggestion => {
            console.log(`  💡 ${suggestion}`);
          });
        }
      });
    }

    // 输出到文件
    if (outputPath) {
      const report = {
        timestamp: new Date().toISOString(),
        summary: {
          totalFiles: results.length,
          totalIssues: results.reduce((sum, r) => sum + r.issues.length, 0),
          averageScore: results.reduce((sum, r) => sum + r.score, 0) / results.length
        },
        results
      };
      
      fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
      console.log(chalk.green(`\n📄 报告已保存到: ${outputPath}`));
    }

    // 根据结果设置退出码
    const hasErrors = results.some(r => r.issues.some(i => i.type === 'error'));
    if (hasErrors) {
      process.exit(1);
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  CLI.run().catch(error => {
    console.error(chalk.red('检查过程中发生错误:'), error);
    process.exit(1);
  });
}

export { ComponentStandardsChecker, CLI };
export type { CheckResult, Issue, CheckConfig };