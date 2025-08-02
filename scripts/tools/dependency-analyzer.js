/**
 * 依赖分析工具集成脚本
 * 功能：集成多种代码质量和依赖分析工具
 * 作者：ZK-Agent Team
 * 创建时间：2024
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class DependencyAnalyzer {
  constructor() {
    this.projectRoot = process.cwd();
    this.reportDir = path.join(this.projectRoot, 'reports', 'dependency-analysis');
    this.ensureReportDir();
  }

  /**
   * 确保报告目录存在
   */
  ensureReportDir() {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  /**
   * 运行ts-prune检测未使用的导出
   * @returns {Object} 分析结果
   */
  async runTsPrune() {
    console.log(chalk.blue('🔍 运行 ts-prune 检测未使用的导出...'));
    try {
      const output = execSync('npx ts-prune', { 
        encoding: 'utf8',
        cwd: this.projectRoot 
      });
      
      const reportPath = path.join(this.reportDir, 'ts-prune-report.txt');
      fs.writeFileSync(reportPath, output);
      
      const unusedExports = output.split('\n').filter(line => line.trim()).length;
      
      return {
        tool: 'ts-prune',
        status: 'success',
        unusedExports,
        reportPath,
        summary: `发现 ${unusedExports} 个未使用的导出`
      };
    } catch (error) {
      console.error(chalk.red('ts-prune 执行失败:'), error.message);
      return {
        tool: 'ts-prune',
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * 运行depcheck检测未使用的依赖
   * @returns {Object} 分析结果
   */
  async runDepcheck() {
    console.log(chalk.blue('📦 运行 depcheck 检测未使用的依赖...'));
    try {
      // 检查depcheck是否已安装
      try {
        execSync('npx depcheck --version', { stdio: 'ignore' });
      } catch {
        console.log(chalk.yellow('正在安装 depcheck...'));
        execSync('npm install -g depcheck', { stdio: 'inherit' });
      }

      const output = execSync('npx depcheck --json', { 
        encoding: 'utf8',
        cwd: this.projectRoot 
      });
      
      const result = JSON.parse(output);
      const reportPath = path.join(this.reportDir, 'depcheck-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
      
      return {
        tool: 'depcheck',
        status: 'success',
        unusedDependencies: result.dependencies || [],
        unusedDevDependencies: result.devDependencies || [],
        missingDependencies: result.missing || {},
        reportPath,
        summary: `未使用依赖: ${(result.dependencies || []).length}, 缺失依赖: ${Object.keys(result.missing || {}).length}`
      };
    } catch (error) {
      console.error(chalk.red('depcheck 执行失败:'), error.message);
      return {
        tool: 'depcheck',
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * 运行madge检测循环依赖
   * @returns {Object} 分析结果
   */
  async runMadge() {
    console.log(chalk.blue('🔄 运行 madge 检测循环依赖...'));
    try {
      // 检查madge是否已安装
      try {
        execSync('npx madge --version', { stdio: 'ignore' });
      } catch {
        console.log(chalk.yellow('正在安装 madge...'));
        execSync('npm install -g madge', { stdio: 'inherit' });
      }

      // 检测循环依赖
      const circularOutput = execSync('npx madge --circular --json src/', { 
        encoding: 'utf8',
        cwd: this.projectRoot 
      });
      
      const circularDeps = JSON.parse(circularOutput);
      
      // 生成依赖图
      const graphOutput = execSync('npx madge --json src/', { 
        encoding: 'utf8',
        cwd: this.projectRoot 
      });
      
      const dependencyGraph = JSON.parse(graphOutput);
      
      const reportPath = path.join(this.reportDir, 'madge-report.json');
      const report = {
        circularDependencies: circularDeps,
        dependencyGraph,
        timestamp: new Date().toISOString()
      };
      
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      
      return {
        tool: 'madge',
        status: 'success',
        circularDependencies: circularDeps,
        circularCount: circularDeps.length,
        reportPath,
        summary: `发现 ${circularDeps.length} 个循环依赖`
      };
    } catch (error) {
      console.error(chalk.red('madge 执行失败:'), error.message);
      return {
        tool: 'madge',
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * 运行unimported检测未被引用的文件
   * @returns {Object} 分析结果
   */
  async runUnimported() {
    console.log(chalk.blue('📁 运行 unimported 检测未被引用的文件...'));
    try {
      // 检查unimported是否已安装
      try {
        execSync('npx unimported --version', { stdio: 'ignore' });
      } catch {
        console.log(chalk.yellow('正在安装 unimported...'));
        execSync('npm install -g unimported', { stdio: 'inherit' });
      }

      const output = execSync('npx unimported', { 
        encoding: 'utf8',
        cwd: this.projectRoot 
      });
      
      const reportPath = path.join(this.reportDir, 'unimported-report.txt');
      fs.writeFileSync(reportPath, output);
      
      const unimportedFiles = output.split('\n')
        .filter(line => line.trim() && !line.startsWith('✓'))
        .length;
      
      return {
        tool: 'unimported',
        status: 'success',
        unimportedFiles,
        reportPath,
        summary: `发现 ${unimportedFiles} 个未被引用的文件`
      };
    } catch (error) {
      console.error(chalk.red('unimported 执行失败:'), error.message);
      return {
        tool: 'unimported',
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * 运行dependency-cruiser进行高级依赖分析
   * @returns {Object} 分析结果
   */
  async runDependencyCruiser() {
    console.log(chalk.blue('🚢 运行 dependency-cruiser 进行高级依赖分析...'));
    try {
      // 检查dependency-cruiser是否已安装
      try {
        execSync('npx depcruise --version', { stdio: 'ignore' });
      } catch {
        console.log(chalk.yellow('正在安装 dependency-cruiser...'));
        execSync('npm install -D dependency-cruiser', { stdio: 'inherit' });
      }

      // 生成配置文件（如果不存在）
      const configPath = path.join(this.projectRoot, '.dependency-cruiser.js');
      if (!fs.existsSync(configPath)) {
        execSync('npx depcruise --init', { 
          stdio: 'inherit',
          cwd: this.projectRoot 
        });
      }

      // 运行分析
      const output = execSync('npx depcruise src --output-type json', { 
        encoding: 'utf8',
        cwd: this.projectRoot 
      });
      
      const result = JSON.parse(output);
      const reportPath = path.join(this.reportDir, 'dependency-cruiser-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
      
      const violations = result.summary?.violations || 0;
      
      return {
        tool: 'dependency-cruiser',
        status: 'success',
        violations,
        modules: result.modules?.length || 0,
        reportPath,
        summary: `分析了 ${result.modules?.length || 0} 个模块，发现 ${violations} 个违规`
      };
    } catch (error) {
      console.error(chalk.red('dependency-cruiser 执行失败:'), error.message);
      return {
        tool: 'dependency-cruiser',
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * 运行所有分析工具
   * @returns {Object} 综合分析结果
   */
  async runAllAnalysis() {
    console.log(chalk.green('🚀 开始运行综合依赖分析...'));
    
    const results = {
      timestamp: new Date().toISOString(),
      tools: []
    };

    // 运行各个工具
    const tools = [
      () => this.runTsPrune(),
      () => this.runDepcheck(),
      () => this.runMadge(),
      () => this.runUnimported(),
      () => this.runDependencyCruiser()
    ];

    for (const tool of tools) {
      try {
        const result = await tool();
        results.tools.push(result);
      } catch (error) {
        console.error(chalk.red('工具执行失败:'), error.message);
      }
    }

    // 生成综合报告
    const summaryReportPath = path.join(this.reportDir, 'comprehensive-analysis-report.json');
    fs.writeFileSync(summaryReportPath, JSON.stringify(results, null, 2));

    // 打印摘要
    this.printSummary(results);

    return results;
  }

  /**
   * 打印分析摘要
   * @param {Object} results 分析结果
   */
  printSummary(results) {
    console.log(chalk.green('\n📊 依赖分析摘要:'));
    console.log(chalk.gray('=' * 50));
    
    results.tools.forEach(tool => {
      if (tool.status === 'success') {
        console.log(chalk.green(`✅ ${tool.tool}: ${tool.summary}`));
      } else {
        console.log(chalk.red(`❌ ${tool.tool}: ${tool.error}`));
      }
    });
    
    console.log(chalk.gray('=' * 50));
    console.log(chalk.blue(`📁 报告保存位置: ${this.reportDir}`));
  }
}

// 命令行执行
if (require.main === module) {
  const analyzer = new DependencyAnalyzer();
  
  const command = process.argv[2] || 'all';
  
  switch (command) {
    case 'ts-prune':
      analyzer.runTsPrune();
      break;
    case 'depcheck':
      analyzer.runDepcheck();
      break;
    case 'madge':
      analyzer.runMadge();
      break;
    case 'unimported':
      analyzer.runUnimported();
      break;
    case 'dependency-cruiser':
      analyzer.runDependencyCruiser();
      break;
    case 'all':
    default:
      analyzer.runAllAnalysis();
      break;
  }
}

module.exports = DependencyAnalyzer;