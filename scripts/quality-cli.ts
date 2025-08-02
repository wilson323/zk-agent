#!/usr/bin/env node

/**
 * 智能化质量保障体系命令行工具
 * 提供架构符合度评估、实时监控、报告生成等功能的命令行接口
 * 
 * @author ZK-Agent Team
 * @version 1.0.0
 */

import { Command } from 'commander';
import { QualityAssuranceSystem, createQualityAssuranceSystem } from '../lib/quality';
import { promises as fs } from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';

/**
 * CLI配置接口
 */
interface CLIConfig {
  projectPath: string;
  configPath?: string;
  outputDir?: string;
  format?: 'html' | 'json' | 'markdown' | 'console';
  watch?: boolean;
  verbose?: boolean;
}

/**
 * 命令行工具类
 */
class QualityCLI {
  private program: Command;
  private system?: QualityAssuranceSystem;

  constructor() {
    this.program = new Command();
    this.setupCommands();
  }

  /**
   * 设置命令
   */
  private setupCommands(): void {
    this.program
      .name('quality-cli')
      .description('ZK-Agent 智能化质量保障体系命令行工具')
      .version('1.0.0');

    // 评估命令
    this.program
      .command('evaluate')
      .alias('eval')
      .description('执行架构符合度评估')
      .option('-p, --project <path>', '项目路径', process.cwd())
      .option('-c, --config <path>', '配置文件路径')
      .option('-f, --format <format>', '输出格式 (html|json|markdown|console)', 'console')
      .option('-o, --output <dir>', '输出目录', './reports')
      .option('-v, --verbose', '详细输出')
      .action(this.handleEvaluate.bind(this));

    // 监控命令
    this.program
      .command('monitor')
      .alias('watch')
      .description('启动实时架构符合度监控')
      .option('-p, --project <path>', '项目路径', process.cwd())
      .option('-c, --config <path>', '配置文件路径')
      .option('-i, --interval <minutes>', '报告生成间隔（分钟）', '60')
      .option('-v, --verbose', '详细输出')
      .action(this.handleMonitor.bind(this));

    // 报告命令
    this.program
      .command('report')
      .description('生成质量报告')
      .option('-p, --project <path>', '项目路径', process.cwd())
      .option('-c, --config <path>', '配置文件路径')
      .option('-f, --format <format>', '输出格式 (html|json|markdown)', 'html')
      .option('-o, --output <dir>', '输出目录', './reports')
      .option('-t, --type <type>', '报告类型 (compliance|quality|debt)', 'compliance')
      .action(this.handleReport.bind(this));

    // 初始化命令
    this.program
      .command('init')
      .description('初始化质量保障体系配置')
      .option('-p, --project <path>', '项目路径', process.cwd())
      .option('-f, --force', '强制覆盖现有配置')
      .action(this.handleInit.bind(this));

    // 状态命令
    this.program
      .command('status')
      .description('查看质量保障体系状态')
      .option('-p, --project <path>', '项目路径', process.cwd())
      .option('-c, --config <path>', '配置文件路径')
      .action(this.handleStatus.bind(this));

    // 扫描命令
    this.program
      .command('scan')
      .description('执行代码质量扫描')
      .option('-p, --project <path>', '项目路径', process.cwd())
      .option('-c, --config <path>', '配置文件路径')
      .option('-f, --format <format>', '输出格式 (json|table)', 'table')
      .option('--fix', '自动修复可修复的问题')
      .action(this.handleScan.bind(this));

    // 趋势命令
    this.program
      .command('trend')
      .description('查看架构健康度趋势')
      .option('-p, --project <path>', '项目路径', process.cwd())
      .option('-d, --days <days>', '天数', '7')
      .option('-f, --format <format>', '输出格式 (json|chart)', 'chart')
      .action(this.handleTrend.bind(this));
  }

  /**
   * 处理评估命令
   */
  private async handleEvaluate(options: any): Promise<void> {
    const spinner = ora('正在执行架构符合度评估...').start();
    
    try {
      const config: CLIConfig = {
        projectPath: path.resolve(options.project),
        configPath: options.config,
        format: options.format,
        verbose: options.verbose
      };

      await this.validateProjectPath(config.projectPath);
      
      this.system = createQualityAssuranceSystem({
        projectPath: config.projectPath,
        configPath: config.configPath,
        enableRealTimeMonitoring: false,
        enableAutoReporting: false,
        dashboard: {
          outputFormat: config.format,
          outputDir: options.output
        }
      });

      await this.system.initialize();
      const result = await this.system.evaluateArchitectureCompliance();

      spinner.succeed('架构符合度评估完成');

      if (config.format === 'console') {
        this.displayEvaluationResult(result);
      } else {
        const reportPath = await this.system.generateComprehensiveReport(config.format);
        console.log(chalk.green(`\n📊 报告已生成: ${reportPath}`));
      }

    } catch (error) {
      spinner.fail('架构符合度评估失败');
      console.error(chalk.red('错误:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  /**
   * 处理监控命令
   */
  private async handleMonitor(options: any): Promise<void> {
    const spinner = ora('正在启动实时监控...').start();
    
    try {
      const config: CLIConfig = {
        projectPath: path.resolve(options.project),
        configPath: options.config,
        verbose: options.verbose
      };

      await this.validateProjectPath(config.projectPath);
      
      this.system = createQualityAssuranceSystem({
        projectPath: config.projectPath,
        configPath: config.configPath,
        enableRealTimeMonitoring: true,
        enableAutoReporting: true,
        reportingInterval: parseInt(options.interval),
        monitoring: {
          enableRealTimeReporting: true
        }
      });

      await this.system.initialize();
      
      spinner.succeed('实时监控已启动');
      
      console.log(chalk.green('\n🔍 实时架构符合度监控已启动'));
      console.log(chalk.blue(`📁 监控目录: ${config.projectPath}`));
      console.log(chalk.blue(`⏱️  报告间隔: ${options.interval}分钟`));
      console.log(chalk.yellow('\n按 Ctrl+C 停止监控\n'));

      // 设置优雅退出
      process.on('SIGINT', async () => {
        console.log(chalk.yellow('\n正在停止监控...'));
        if (this.system) {
          await this.system.shutdown();
        }
        console.log(chalk.green('监控已停止'));
        process.exit(0);
      });

      // 保持进程运行
      await new Promise(() => {});

    } catch (error) {
      spinner.fail('启动监控失败');
      console.error(chalk.red('错误:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  /**
   * 处理报告命令
   */
  private async handleReport(options: any): Promise<void> {
    const spinner = ora('正在生成质量报告...').start();
    
    try {
      const config: CLIConfig = {
        projectPath: path.resolve(options.project),
        configPath: options.config,
        format: options.format
      };

      await this.validateProjectPath(config.projectPath);
      
      this.system = createQualityAssuranceSystem({
        projectPath: config.projectPath,
        configPath: config.configPath,
        enableRealTimeMonitoring: false,
        enableAutoReporting: false,
        dashboard: {
          outputFormat: config.format,
          outputDir: options.output
        }
      });

      await this.system.initialize();
      
      let reportPath: string;
      
      switch (options.type) {
        case 'compliance':
          reportPath = await this.system.generateComprehensiveReport(config.format);
          break;
        case 'quality':
          const scanResult = await this.system.performCodeQualityScan();
          reportPath = await this.generateQualityScanReport(scanResult, options.output, config.format!);
          break;
        case 'debt':
          const debtAnalysis = await this.system.getTechnicalDebtAnalysis();
          reportPath = await this.generateTechnicalDebtReport(debtAnalysis, options.output, config.format!);
          break;
        default:
          throw new Error(`不支持的报告类型: ${options.type}`);
      }

      spinner.succeed('质量报告生成完成');
      console.log(chalk.green(`\n📊 报告已生成: ${reportPath}`));

    } catch (error) {
      spinner.fail('生成报告失败');
      console.error(chalk.red('错误:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  /**
   * 处理初始化命令
   */
  private async handleInit(options: any): Promise<void> {
    const spinner = ora('正在初始化质量保障体系配置...').start();
    
    try {
      const projectPath = path.resolve(options.project);
      await this.validateProjectPath(projectPath);
      
      const configPath = path.join(projectPath, 'config', 'architecture-compliance.config.json');
      
      // 检查配置文件是否已存在
      if (!options.force) {
        try {
          await fs.access(configPath);
          spinner.stop();
          
          const { overwrite } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'overwrite',
              message: '配置文件已存在，是否覆盖？',
              default: false
            }
          ]);
          
          if (!overwrite) {
            console.log(chalk.yellow('初始化已取消'));
            return;
          }
          
          spinner.start('正在初始化质量保障体系配置...');
        } catch {
          // 文件不存在，继续初始化
        }
      }
      
      // 创建配置目录
      await fs.mkdir(path.dirname(configPath), { recursive: true });
      
      // 生成默认配置
      const defaultConfig = await this.generateDefaultConfig(projectPath);
      await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
      
      spinner.succeed('质量保障体系配置初始化完成');
      console.log(chalk.green(`\n✅ 配置文件已创建: ${configPath}`));
      console.log(chalk.blue('\n可以使用以下命令开始使用:'));
      console.log(chalk.cyan(`  quality-cli evaluate -p ${projectPath}`));
      console.log(chalk.cyan(`  quality-cli monitor -p ${projectPath}`));

    } catch (error) {
      spinner.fail('初始化失败');
      console.error(chalk.red('错误:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  /**
   * 处理状态命令
   */
  private async handleStatus(options: any): Promise<void> {
    const spinner = ora('正在获取系统状态...').start();
    
    try {
      const config: CLIConfig = {
        projectPath: path.resolve(options.project),
        configPath: options.config
      };

      await this.validateProjectPath(config.projectPath);
      
      this.system = createQualityAssuranceSystem({
        projectPath: config.projectPath,
        configPath: config.configPath,
        enableRealTimeMonitoring: false,
        enableAutoReporting: false
      });

      await this.system.initialize();
      const status = this.system.getSystemStatus();
      const metrics = await this.system.getQualityMetrics();
      
      spinner.succeed('系统状态获取完成');
      
      this.displaySystemStatus(status, metrics);

    } catch (error) {
      spinner.fail('获取状态失败');
      console.error(chalk.red('错误:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  /**
   * 处理扫描命令
   */
  private async handleScan(options: any): Promise<void> {
    const spinner = ora('正在执行代码质量扫描...').start();
    
    try {
      const config: CLIConfig = {
        projectPath: path.resolve(options.project),
        configPath: options.config
      };

      await this.validateProjectPath(config.projectPath);
      
      this.system = createQualityAssuranceSystem({
        projectPath: config.projectPath,
        configPath: config.configPath,
        enableRealTimeMonitoring: false,
        enableAutoReporting: false
      });

      await this.system.initialize();
      const scanResult = await this.system.performCodeQualityScan();
      
      spinner.succeed('代码质量扫描完成');
      
      if (options.format === 'json') {
        console.log(JSON.stringify(scanResult, null, 2));
      } else {
        this.displayScanResult(scanResult);
      }

    } catch (error) {
      spinner.fail('代码扫描失败');
      console.error(chalk.red('错误:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  /**
   * 处理趋势命令
   */
  private async handleTrend(options: any): Promise<void> {
    const spinner = ora('正在获取架构健康度趋势...').start();
    
    try {
      const config: CLIConfig = {
        projectPath: path.resolve(options.project)
      };

      await this.validateProjectPath(config.projectPath);
      
      this.system = createQualityAssuranceSystem({
        projectPath: config.projectPath,
        enableRealTimeMonitoring: false,
        enableAutoReporting: false
      });

      await this.system.initialize();
      const trend = await this.system.getArchitectureHealthTrend(parseInt(options.days));
      
      spinner.succeed('趋势数据获取完成');
      
      if (options.format === 'json') {
        console.log(JSON.stringify(trend, null, 2));
      } else {
        this.displayTrendChart(trend);
      }

    } catch (error) {
      spinner.fail('获取趋势失败');
      console.error(chalk.red('错误:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  /**
   * 验证项目路径
   */
  private async validateProjectPath(projectPath: string): Promise<void> {
    try {
      const stats = await fs.stat(projectPath);
      if (!stats.isDirectory()) {
        throw new Error(`路径不是有效目录: ${projectPath}`);
      }
    } catch (error) {
      throw new Error(`项目路径无效: ${projectPath}`);
    }
  }

  /**
   * 生成默认配置
   */
  private async generateDefaultConfig(projectPath: string): Promise<any> {
    // 检测项目类型
    const packageJsonPath = path.join(projectPath, 'package.json');
    let techStack = 'mixed';
    
    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      if (dependencies.react) techStack = 'react';
      else if (dependencies.vue) techStack = 'vue';
      else if (dependencies['@angular/core']) techStack = 'angular';
      else if (dependencies.express || dependencies.koa) techStack = 'node';
    } catch {
      // 无法检测，使用默认值
    }
    
    return {
      version: '1.0.0',
      projectInfo: {
        name: path.basename(projectPath),
        type: techStack,
        phase: 'development'
      },
      architecturePatterns: {
        cleanArchitecture: {
          enabled: true,
          strictness: 'medium',
          layerValidation: {
            presentation: { allowedDependencies: ['application'] },
            application: { allowedDependencies: ['domain', 'infrastructure'] },
            domain: { allowedDependencies: [] },
            infrastructure: { allowedDependencies: ['domain'] }
          }
        },
        domainDrivenDesign: {
          enabled: true,
          aggregateValidation: true,
          valueObjectValidation: true,
          repositoryPatternValidation: true
        },
        microservices: {
          enabled: false,
          serviceIndependenceCheck: true,
          communicationPatternValidation: true
        },
        cqrs: {
          enabled: false,
          commandQuerySeparation: true,
          eventSourcingValidation: false
        }
      },
      qualityThresholds: {
        overallScore: 85,
        layeredArchitectureCompliance: 85,
        domainModelPurity: 80,
        serviceBoundaryClarity: 75,
        dependencyInversionCompliance: 80
      },
      qualityMetrics: {
        codeQuality: { target: 95, weight: 0.3 },
        testCoverage: { target: 90, weight: 0.25 },
        performance: { target: 85, weight: 0.2 },
        security: { target: 100, weight: 0.25 }
      },
      realTimeMonitoring: {
        enabled: true,
        evaluationDelay: 2000,
        watchPatterns: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
        ignorePatterns: ['**/node_modules/**', '**/dist/**', '**/build/**']
      },
      adaptiveThresholds: {
        enabled: true,
        projectPhase: 'development',
        teamSize: 'medium',
        techStack: techStack
      }
    };
  }

  /**
   * 显示评估结果
   */
  private displayEvaluationResult(result: any): void {
    console.log(chalk.blue('\n🏗️  架构符合度评估结果'));
    console.log('='.repeat(50));
    
    console.log(chalk.green(`\n🎯 总体评分: ${result.overallScore}/100`));
    
    console.log(chalk.blue('\n📊 详细评分:'));
    console.log(`  分层架构合规度: ${this.formatScore(result.layeredArchitectureCompliance)}`);
    console.log(`  领域模型纯度: ${this.formatScore(result.domainModelPurity)}`);
    console.log(`  服务边界清晰度: ${this.formatScore(result.serviceBoundaryClarity)}`);
    console.log(`  依赖倒置原则: ${this.formatScore(result.dependencyInversionCompliance)}`);
    
    if (result.highRiskViolations.length > 0) {
      console.log(chalk.red('\n🔴 高风险违规:'));
      result.highRiskViolations.slice(0, 5).forEach((violation: any, index: number) => {
        console.log(`  ${index + 1}. ${violation.description}`);
        console.log(`     📁 ${path.basename(violation.filePath)}:${violation.lineNumber}`);
      });
      
      if (result.highRiskViolations.length > 5) {
        console.log(chalk.gray(`     ... 还有 ${result.highRiskViolations.length - 5} 个违规`));
      }
    } else {
      console.log(chalk.green('\n🟢 未发现高风险违规！'));
    }
    
    if (result.bestPractices.length > 0) {
      console.log(chalk.green('\n🟢 优秀实践:'));
      result.bestPractices.slice(0, 3).forEach((practice: any, index: number) => {
        console.log(`  ${index + 1}. ${practice.description}`);
      });
    }
  }

  /**
   * 显示系统状态
   */
  private displaySystemStatus(status: any, metrics: any): void {
    console.log(chalk.blue('\n📊 质量保障体系状态'));
    console.log('='.repeat(40));
    
    console.log(`\n初始化状态: ${status.initialized ? chalk.green('✅ 已初始化') : chalk.red('❌ 未初始化')}`);
    console.log(`监控状态: ${status.monitoring ? chalk.green('🔍 监控中') : chalk.gray('⏸️  未监控')}`);
    console.log(`总评估次数: ${status.totalEvaluations}`);
    console.log(`平均评估时间: ${status.averageEvaluationTime.toFixed(2)}ms`);
    
    if (status.lastEvaluationTime) {
      console.log(`最后评估时间: ${new Date(status.lastEvaluationTime).toLocaleString()}`);
    }
    
    console.log(chalk.blue('\n🎯 质量指标:'));
    console.log(`  代码质量: ${this.formatScore(metrics.codeQuality)}`);
    console.log(`  测试覆盖率: ${this.formatScore(metrics.testCoverage)}`);
    console.log(`  架构健康度: ${this.formatScore(metrics.architectureHealth)}`);
    console.log(`  性能回归: ${this.formatScore(metrics.performanceRegression)}`);
    console.log(`  安全漏洞: ${metrics.securityVulnerabilities === 100 ? chalk.green('✅ 无高危') : chalk.red('❌ 存在风险')}`);
  }

  /**
   * 显示扫描结果
   */
  private displayScanResult(result: any): void {
    console.log(chalk.blue('\n🔍 代码质量扫描结果'));
    console.log('='.repeat(40));
    
    const { summary } = result;
    console.log(`\n总问题数: ${summary.totalIssues}`);
    console.log(`  错误: ${chalk.red(summary.errorCount)}`);
    console.log(`  警告: ${chalk.yellow(summary.warningCount)}`);
    console.log(`  信息: ${chalk.blue(summary.infoCount)}`);
    
    if (result.issues.length > 0) {
      console.log(chalk.blue('\n📋 问题详情:'));
      result.issues.slice(0, 10).forEach((issue: any, index: number) => {
        const severityColor = issue.severity === 'error' ? chalk.red : 
                             issue.severity === 'warning' ? chalk.yellow : chalk.blue;
        console.log(`  ${index + 1}. ${severityColor(issue.severity.toUpperCase())} ${issue.message}`);
        console.log(`     📁 ${path.basename(issue.file)}:${issue.line}`);
        console.log(`     🔧 规则: ${issue.rule}`);
      });
      
      if (result.issues.length > 10) {
        console.log(chalk.gray(`     ... 还有 ${result.issues.length - 10} 个问题`));
      }
    }
  }

  /**
   * 显示趋势图表
   */
  private displayTrendChart(trend: any[]): void {
    console.log(chalk.blue('\n📈 架构健康度趋势'));
    console.log('='.repeat(40));
    
    trend.forEach(point => {
      const score = Math.round(point.score);
      const bar = '█'.repeat(Math.floor(score / 5));
      const scoreColor = score >= 90 ? chalk.green : score >= 70 ? chalk.yellow : chalk.red;
      
      console.log(`${point.date} ${scoreColor(bar)} ${scoreColor(score)}% (违规: ${point.violations})`);
    });
  }

  /**
   * 格式化评分
   */
  private formatScore(score: number): string {
    const rounded = Math.round(score);
    if (rounded >= 90) return chalk.green(`${rounded}%`);
    if (rounded >= 70) return chalk.yellow(`${rounded}%`);
    return chalk.red(`${rounded}%`);
  }

  /**
   * 生成质量扫描报告
   */
  private async generateQualityScanReport(result: any, outputDir: string, format: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `quality-scan-${timestamp}.${format}`;
    const filePath = path.join(outputDir, fileName);
    
    await fs.mkdir(outputDir, { recursive: true });
    
    if (format === 'json') {
      await fs.writeFile(filePath, JSON.stringify(result, null, 2), 'utf-8');
    } else {
      // 生成其他格式的报告
      const content = `# 代码质量扫描报告\n\n生成时间: ${new Date().toLocaleString()}\n\n## 摘要\n\n- 总问题数: ${result.summary.totalIssues}\n- 错误: ${result.summary.errorCount}\n- 警告: ${result.summary.warningCount}\n- 信息: ${result.summary.infoCount}\n`;
      await fs.writeFile(filePath, content, 'utf-8');
    }
    
    return filePath;
  }

  /**
   * 生成技术债务报告
   */
  private async generateTechnicalDebtReport(analysis: any, outputDir: string, format: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `technical-debt-${timestamp}.${format}`;
    const filePath = path.join(outputDir, fileName);
    
    await fs.mkdir(outputDir, { recursive: true });
    
    if (format === 'json') {
      await fs.writeFile(filePath, JSON.stringify(analysis, null, 2), 'utf-8');
    } else {
      const content = `# 技术债务分析报告\n\n生成时间: ${new Date().toLocaleString()}\n\n## 债务评分\n\n总评分: ${analysis.totalDebtScore}/100\n\n## 债务项目\n\n债务项目数: ${analysis.debtItems.length}\n\n## 重构建议\n\n建议数: ${analysis.refactoringRecommendations.length}\n`;
      await fs.writeFile(filePath, content, 'utf-8');
    }
    
    return filePath;
  }

  /**
   * 运行CLI
   */
  public run(): void {
    this.program.parse();
  }
}

// 创建并运行CLI实例
if (require.main === module) {
  const cli = new QualityCLI();
  cli.run();
}

export default QualityCLI;