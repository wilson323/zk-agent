#!/usr/bin/env ts-node

/**
 * 错误处理迁移验证脚本
 * 
 * 功能：
 * 1. 验证API路由是否正确使用统一错误处理
 * 2. 检查错误代码的一致性
 * 3. 验证错误响应格式
 * 4. 生成迁移报告
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';

interface ValidationResult {
  file: string;
  issues: ValidationIssue[];
  score: number;
}

interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  line?: number;
  message: string;
  suggestion?: string;
}

interface MigrationReport {
  totalFiles: number;
  migratedFiles: number;
  issuesFound: number;
  overallScore: number;
  results: ValidationResult[];
}

class ErrorHandlingValidator {
  private readonly apiRoutesPattern = 'app/api/**/route.ts';
  private readonly projectRoot: string;
  
  // 验证规则配置
  private readonly validationRules = {
    // 必须使用统一错误处理
    requireUnifiedErrorHandling: true,
    // 禁止直接使用console.error
    forbidConsoleError: true,
    // 必须使用UnifiedErrorCode
    requireUnifiedErrorCode: true,
    // 禁止硬编码错误消息
    forbidHardcodedErrorMessages: true,
    // 必须有适当的错误分类
    requireErrorClassification: true
  };
  
  // 错误模式匹配
  private readonly errorPatterns = {
    // 旧的错误处理模式
    oldTryCatch: /try\s*{[\s\S]*?}\s*catch\s*\([^)]*\)\s*{[\s\S]*?console\.error[\s\S]*?}/g,
    oldErrorCode: /ErrorCode\.[A-Z_]+/g,
    hardcodedError: /ApiResponseWrapper\.error\([^,]*,\s*['"][^'"]*['"]/g,
    consoleError: /console\.error/g,
    
    // 新的错误处理模式
    unifiedErrorHandling: /withUnifiedErrorHandling/g,
    unifiedErrorCode: /UnifiedErrorCode\.[A-Z_]+/g,
    handleApiError: /handleApiError/g
  };
  
  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }
  
  /**
   * 运行完整的验证流程
   */
  async validate(): Promise<MigrationReport> {
    console.log(chalk.blue('🔍 开始验证错误处理迁移...\n'));
    
    const apiFiles = await this.findApiRoutes();
    const results: ValidationResult[] = [];
    
    for (const file of apiFiles) {
      const result = await this.validateFile(file);
      results.push(result);
      this.printFileResult(result);
    }
    
    const report = this.generateReport(results);
    this.printSummaryReport(report);
    
    return report;
  }
  
  /**
   * 查找所有API路由文件
   */
  private async findApiRoutes(): Promise<string[]> {
    const pattern = path.join(this.projectRoot, this.apiRoutesPattern);
    const files = await glob(pattern, { ignore: ['**/node_modules/**'] });
    
    console.log(chalk.gray(`找到 ${files.length} 个API路由文件`));
    return files;
  }
  
  /**
   * 验证单个文件
   */
  private async validateFile(filePath: string): Promise<ValidationResult> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const issues: ValidationIssue[] = [];
    
    // 检查是否使用统一错误处理
    this.checkUnifiedErrorHandling(content, lines, issues);
    
    // 检查错误代码使用
    this.checkErrorCodeUsage(content, lines, issues);
    
    // 检查控制台错误输出
    this.checkConsoleErrorUsage(content, lines, issues);
    
    // 检查硬编码错误消息
    this.checkHardcodedErrorMessages(content, lines, issues);
    
    // 检查导入语句
    this.checkImportStatements(content, lines, issues);
    
    // 计算文件得分
    const score = this.calculateFileScore(issues);
    
    return {
      file: path.relative(this.projectRoot, filePath),
      issues,
      score
    };
  }
  
  /**
   * 检查是否使用统一错误处理
   */
  private checkUnifiedErrorHandling(content: string, lines: string[], issues: ValidationIssue[]): void {
    const hasUnifiedErrorHandling = this.errorPatterns.unifiedErrorHandling.test(content);
    const hasOldTryCatch = this.errorPatterns.oldTryCatch.test(content);
    
    if (!hasUnifiedErrorHandling && hasOldTryCatch) {
      issues.push({
        type: 'error',
        message: '未使用统一错误处理装饰器 withUnifiedErrorHandling',
        suggestion: '使用 withUnifiedErrorHandling 包装API处理函数'
      });
    }
    
    // 检查是否有未迁移的try-catch块
    const oldTryCatchMatches = content.match(this.errorPatterns.oldTryCatch);
    if (oldTryCatchMatches) {
      oldTryCatchMatches.forEach((match, index) => {
        const lineNumber = this.findLineNumber(content, match);
        issues.push({
          type: 'warning',
          line: lineNumber,
          message: '发现未迁移的try-catch错误处理模式',
          suggestion: '迁移到统一错误处理模式'
        });
      });
    }
  }
  
  /**
   * 检查错误代码使用
   */
  private checkErrorCodeUsage(content: string, lines: string[], issues: ValidationIssue[]): void {
    // 检查是否还在使用旧的ErrorCode
    const oldErrorCodeMatches = content.match(this.errorPatterns.oldErrorCode);
    if (oldErrorCodeMatches) {
      oldErrorCodeMatches.forEach((match) => {
        const lineNumber = this.findLineNumber(content, match);
        issues.push({
          type: 'error',
          line: lineNumber,
          message: `使用了旧的错误代码: ${match}`,
          suggestion: `替换为 Unified${match}`
        });
      });
    }
    
    // 检查是否使用了新的UnifiedErrorCode
    const hasUnifiedErrorCode = this.errorPatterns.unifiedErrorCode.test(content);
    if (!hasUnifiedErrorCode && content.includes('ErrorCode')) {
      issues.push({
        type: 'warning',
        message: '未使用统一错误代码 UnifiedErrorCode',
        suggestion: '导入并使用 UnifiedErrorCode 枚举'
      });
    }
  }
  
  /**
   * 检查控制台错误输出
   */
  private checkConsoleErrorUsage(content: string, lines: string[], issues: ValidationIssue[]): void {
    const consoleErrorMatches = content.match(this.errorPatterns.consoleError);
    if (consoleErrorMatches) {
      consoleErrorMatches.forEach((match) => {
        const lineNumber = this.findLineNumber(content, match);
        issues.push({
          type: 'warning',
          line: lineNumber,
          message: '使用了 console.error 进行错误记录',
          suggestion: '使用统一的错误处理器进行日志记录'
        });
      });
    }
  }
  
  /**
   * 检查硬编码错误消息
   */
  private checkHardcodedErrorMessages(content: string, lines: string[], issues: ValidationIssue[]): void {
    const hardcodedErrorMatches = content.match(this.errorPatterns.hardcodedError);
    if (hardcodedErrorMatches) {
      hardcodedErrorMatches.forEach((match) => {
        const lineNumber = this.findLineNumber(content, match);
        issues.push({
          type: 'info',
          line: lineNumber,
          message: '发现硬编码的错误消息',
          suggestion: '考虑使用错误代码映射的标准消息'
        });
      });
    }
  }
  
  /**
   * 检查导入语句
   */
  private checkImportStatements(content: string, lines: string[], issues: ValidationIssue[]): void {
    const requiredImports = [
      'withUnifiedErrorHandling',
      'UnifiedErrorCode',
      'handleApiError'
    ];
    
    const missingImports = requiredImports.filter(importName => {
      return content.includes(importName) && !content.includes(`import.*${importName}`);
    });
    
    if (missingImports.length > 0) {
      issues.push({
        type: 'error',
        message: `缺少必要的导入: ${missingImports.join(', ')}`,
        suggestion: '添加统一错误处理相关的导入语句'
      });
    }
    
    // 检查是否还有旧的导入
    if (content.includes('import') && content.includes('ErrorCode') && !content.includes('UnifiedErrorCode')) {
      issues.push({
        type: 'warning',
        message: '可能存在旧的ErrorCode导入',
        suggestion: '更新导入语句使用UnifiedErrorCode'
      });
    }
  }
  
  /**
   * 查找匹配文本在文件中的行号
   */
  private findLineNumber(content: string, searchText: string): number {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(searchText)) {
        return i + 1;
      }
    }
    return 0;
  }
  
  /**
   * 计算文件得分
   */
  private calculateFileScore(issues: ValidationIssue[]): number {
    let score = 100;
    
    issues.forEach(issue => {
      switch (issue.type) {
        case 'error':
          score -= 20;
          break;
        case 'warning':
          score -= 10;
          break;
        case 'info':
          score -= 5;
          break;
      }
    });
    
    return Math.max(0, score);
  }
  
  /**
   * 生成迁移报告
   */
  private generateReport(results: ValidationResult[]): MigrationReport {
    const totalFiles = results.length;
    const migratedFiles = results.filter(r => r.score >= 80).length;
    const issuesFound = results.reduce((sum, r) => sum + r.issues.length, 0);
    const overallScore = results.reduce((sum, r) => sum + r.score, 0) / totalFiles;
    
    return {
      totalFiles,
      migratedFiles,
      issuesFound,
      overallScore,
      results
    };
  }
  
  /**
   * 打印文件验证结果
   */
  private printFileResult(result: ValidationResult): void {
    const scoreColor = result.score >= 80 ? 'green' : result.score >= 60 ? 'yellow' : 'red';
    const scoreIcon = result.score >= 80 ? '✅' : result.score >= 60 ? '⚠️' : '❌';
    
    console.log(`${scoreIcon} ${chalk[scoreColor](result.file)} (得分: ${result.score})`);
    
    if (result.issues.length > 0) {
      result.issues.forEach(issue => {
        const icon = issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️';
        const color = issue.type === 'error' ? 'red' : issue.type === 'warning' ? 'yellow' : 'blue';
        const lineInfo = issue.line ? ` (行 ${issue.line})` : '';
        
        console.log(`  ${icon} ${chalk[color](issue.message)}${lineInfo}`);
        if (issue.suggestion) {
          console.log(`     💡 ${chalk.gray(issue.suggestion)}`);
        }
      });
    }
    
    console.log();
  }
  
  /**
   * 打印汇总报告
   */
  private printSummaryReport(report: MigrationReport): void {
    console.log(chalk.blue('\n📊 迁移验证报告'));
    console.log(chalk.blue('='.repeat(50)));
    
    console.log(`📁 总文件数: ${report.totalFiles}`);
    console.log(`✅ 已迁移文件: ${report.migratedFiles}`);
    console.log(`⚠️ 发现问题: ${report.issuesFound}`);
    console.log(`📈 整体得分: ${report.overallScore.toFixed(1)}/100`);
    
    const migrationProgress = (report.migratedFiles / report.totalFiles * 100).toFixed(1);
    console.log(`🎯 迁移进度: ${migrationProgress}%`);
    
    // 按问题类型分组统计
    const issuesByType = {
      error: 0,
      warning: 0,
      info: 0
    };
    
    report.results.forEach(result => {
      result.issues.forEach(issue => {
        issuesByType[issue.type]++;
      });
    });
    
    console.log('\n📋 问题分布:');
    console.log(`  ❌ 错误: ${issuesByType.error}`);
    console.log(`  ⚠️ 警告: ${issuesByType.warning}`);
    console.log(`  ℹ️ 信息: ${issuesByType.info}`);
    
    // 迁移建议
    console.log('\n💡 迁移建议:');
    
    if (report.overallScore < 60) {
      console.log('  🔴 迁移进度较低，建议优先处理错误级别的问题');
    } else if (report.overallScore < 80) {
      console.log('  🟡 迁移进度良好，建议继续处理警告级别的问题');
    } else {
      console.log('  🟢 迁移进度优秀，可以考虑处理信息级别的优化建议');
    }
    
    if (issuesByType.error > 0) {
      console.log('  📝 运行迁移脚本: npx ts-node scripts/migrate-api-error-handling.ts');
    }
    
    if (report.migratedFiles < report.totalFiles) {
      console.log('  📖 参考迁移指南: docs/error-handling-migration-guide.md');
    }
    
    console.log();
  }
  
  /**
   * 生成详细的JSON报告
   */
  async generateJsonReport(outputPath: string): Promise<void> {
    const report = await this.validate();
    
    const jsonReport = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: report.totalFiles,
        migratedFiles: report.migratedFiles,
        issuesFound: report.issuesFound,
        overallScore: report.overallScore,
        migrationProgress: (report.migratedFiles / report.totalFiles * 100)
      },
      files: report.results.map(result => ({
        file: result.file,
        score: result.score,
        issues: result.issues
      }))
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(jsonReport, null, 2));
    console.log(chalk.green(`📄 详细报告已保存到: ${outputPath}`));
  }
}

// CLI 接口
if (require.main === module) {
  const args = process.argv.slice(2);
  const validator = new ErrorHandlingValidator();
  
  if (args.includes('--json')) {
    const outputPath = args[args.indexOf('--json') + 1] || 'migration-report.json';
    validator.generateJsonReport(outputPath);
  } else {
    validator.validate();
  }
}

export type { ErrorHandlingValidator, ValidationResult, ValidationIssue, MigrationReport };