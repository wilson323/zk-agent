/**
 * 自动化工具管理器
 * 功能：统一管理和执行所有代码质量、依赖分析工具
 * 作者：ZK-Agent Team
 * 创建时间：2024
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');
const DependencyAnalyzer = require('./dependency-analyzer');
const ESLintEnhancer = require('./eslint-enhancer');

class ToolManager {
  constructor() {
    this.projectRoot = process.cwd();
    this.configPath = path.join(this.projectRoot, 'tool-manager.config.json');
    this.reportDir = path.join(this.projectRoot, 'reports', 'tool-manager');
    this.dependencyAnalyzer = new DependencyAnalyzer();
    this.eslintEnhancer = new ESLintEnhancer();
    
    this.ensureDirectories();
    this.loadConfig();
  }

  /**
   * 确保必要的目录存在
   */
  ensureDirectories() {
    const dirs = [this.reportDir];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * 加载工具配置
   */
  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        this.config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      } else {
        this.config = this.getDefaultConfig();
        this.saveConfig();
      }
    } catch (error) {
      console.error(chalk.red('配置加载失败，使用默认配置:'), error.message);
      this.config = this.getDefaultConfig();
    }
  }

  /**
   * 获取默认配置
   * @returns {Object} 默认配置
   */
  getDefaultConfig() {
    return {
      tools: {
        'ts-prune': {
          enabled: true,
          autoInstall: true,
          schedule: 'daily',
          options: {
            exclude: ['**/*.test.*', '**/*.spec.*']
          }
        },
        'depcheck': {
          enabled: true,
          autoInstall: true,
          schedule: 'weekly',
          options: {
            ignoreMatches: ['@types/*']
          }
        },
        'madge': {
          enabled: true,
          autoInstall: true,
          schedule: 'daily',
          options: {
            circular: true,
            extensions: ['js', 'ts', 'tsx']
          }
        },
        'unimported': {
          enabled: true,
          autoInstall: true,
          schedule: 'weekly',
          options: {}
        },
        'dependency-cruiser': {
          enabled: true,
          autoInstall: true,
          schedule: 'weekly',
          options: {
            outputType: 'json'
          }
        },
        'eslint-unused-imports': {
          enabled: true,
          autoInstall: true,
          schedule: 'daily',
          options: {
            autoFix: true
          }
        }
      },
      reporting: {
        format: ['json', 'html'],
        includeTimestamp: true,
        archiveOldReports: true,
        maxArchiveAge: 30 // 天
      },
      automation: {
        runOnCommit: true,
        runOnPush: true,
        failOnErrors: false,
        notifications: {
          enabled: true,
          channels: ['console', 'file']
        }
      }
    };
  }

  /**
   * 保存配置
   */
  saveConfig() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error(chalk.red('配置保存失败:'), error.message);
    }
  }

  /**
   * 检查工具是否已安装
   * @param {string} toolName 工具名称
   * @returns {boolean} 是否已安装
   */
  isToolInstalled(toolName) {
    try {
      switch (toolName) {
        case 'ts-prune':
          execSync('npx ts-prune --version', { stdio: 'ignore' });
          return true;
        case 'depcheck':
          execSync('npx depcheck --version', { stdio: 'ignore' });
          return true;
        case 'madge':
          execSync('npx madge --version', { stdio: 'ignore' });
          return true;
        case 'unimported':
          execSync('npx unimported --version', { stdio: 'ignore' });
          return true;
        case 'dependency-cruiser':
          execSync('npx depcruise --version', { stdio: 'ignore' });
          return true;
        case 'eslint-unused-imports':
          // 检查是否在package.json中存在
          const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
          return !!(packageJson.devDependencies && packageJson.devDependencies['eslint-plugin-unused-imports']);
        case 'ts-unused-exports':
        try {
          execSync('npx ts-unused-exports --help', { stdio: 'ignore' });
          return false; // 工具存在但退出码为1
        } catch (error) {
          return error.status === 1; // 退出码1表示工具已安装但需要参数
        }
        case 'npm-check':
          execSync('npx npm-check --version', { stdio: 'ignore' });
          return true;
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * 安装工具
   * @param {string} toolName 工具名称
   * @returns {Promise<boolean>} 安装是否成功
   */
  async installTool(toolName) {
    console.log(chalk.blue(`📦 安装工具: ${toolName}...`));
    
    const installCommands = {
      'ts-prune': 'npm install -D ts-prune',
      'depcheck': 'npm install -g depcheck',
      'madge': 'npm install -g madge',
      'unimported': 'npm install -g unimported',
      'dependency-cruiser': 'npm install -D dependency-cruiser',
      'eslint-unused-imports': 'npm install -D eslint-plugin-unused-imports',
      'ts-unused-exports': 'npm install -g ts-unused-exports',
      'npm-check': 'npm install -g npm-check'
    };
    
    try {
      const command = installCommands[toolName];
      if (!command) {
        throw new Error(`未知工具: ${toolName}`);
      }
      
      execSync(command, { stdio: 'inherit', cwd: this.projectRoot });
      console.log(chalk.green(`✅ ${toolName} 安装成功`));
      return true;
    } catch (error) {
      console.error(chalk.red(`❌ ${toolName} 安装失败:`), error.message);
      return false;
    }
  }

  /**
   * 运行单个工具
   * @param {string} toolName 工具名称
   * @returns {Promise<Object>} 运行结果
   */
  async runTool(toolName) {
    const toolConfig = this.config.tools[toolName];
    if (!toolConfig || !toolConfig.enabled) {
      return {
        tool: toolName,
        status: 'skipped',
        reason: '工具未启用'
      };
    }

    // 检查工具是否已安装
    if (!this.isToolInstalled(toolName) && toolConfig.autoInstall) {
      const installed = await this.installTool(toolName);
      if (!installed) {
        return {
          tool: toolName,
          status: 'error',
          reason: '工具安装失败'
        };
      }
    }

    try {
      switch (toolName) {
        case 'ts-prune':
          return await this.dependencyAnalyzer.runTsPrune();
        case 'depcheck':
          return await this.dependencyAnalyzer.runDepcheck();
        case 'madge':
          return await this.dependencyAnalyzer.runMadge();
        case 'unimported':
          return await this.dependencyAnalyzer.runUnimported();
        case 'dependency-cruiser':
          return await this.dependencyAnalyzer.runDependencyCruiser();
        case 'eslint-unused-imports':
          return await this.eslintEnhancer.runLintCheck('check');
        default:
          return {
            tool: toolName,
            status: 'error',
            reason: '未知工具'
          };
      }
    } catch (error) {
      return {
        tool: toolName,
        status: 'error',
        reason: error.message
      };
    }
  }

  /**
   * 运行所有启用的工具
   * @returns {Promise<Object>} 综合运行结果
   */
  async runAllTools() {
    console.log(chalk.green('🚀 开始运行所有工具...'));
    
    const results = {
      timestamp: new Date().toISOString(),
      summary: {
        total: 0,
        success: 0,
        error: 0,
        skipped: 0
      },
      tools: []
    };

    const enabledTools = Object.keys(this.config.tools)
      .filter(tool => this.config.tools[tool].enabled);

    results.summary.total = enabledTools.length;

    for (const toolName of enabledTools) {
      console.log(chalk.blue(`\n🔧 运行工具: ${toolName}`));
      const result = await this.runTool(toolName);
      results.tools.push(result);
      
      switch (result.status) {
        case 'success':
          results.summary.success++;
          break;
        case 'error':
          results.summary.error++;
          break;
        case 'skipped':
          results.summary.skipped++;
          break;
      }
    }

    // 生成综合报告
    await this.generateComprehensiveReport(results);
    
    // 打印摘要
    this.printExecutionSummary(results);
    
    return results;
  }

  /**
   * 生成综合报告
   * @param {Object} results 运行结果
   */
  async generateComprehensiveReport(results) {
    const reportPath = path.join(this.reportDir, `comprehensive-report-${Date.now()}.json`);
    
    try {
      // JSON报告
      fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
      
      // HTML报告
      if (this.config.reporting.format.includes('html')) {
        const htmlReport = this.generateHTMLReport(results);
        const htmlPath = reportPath.replace('.json', '.html');
        fs.writeFileSync(htmlPath, htmlReport);
      }
      
      console.log(chalk.green(`📊 综合报告已生成: ${reportPath}`));
    } catch (error) {
      console.error(chalk.red('报告生成失败:'), error.message);
    }
  }

  /**
   * 生成HTML报告
   * @param {Object} results 运行结果
   * @returns {string} HTML内容
   */
  generateHTMLReport(results) {
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>代码质量工具综合报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .summary-card h3 { margin: 0 0 10px 0; color: #333; }
        .summary-card .number { font-size: 2em; font-weight: bold; }
        .success { color: #28a745; }
        .error { color: #dc3545; }
        .warning { color: #ffc107; }
        .info { color: #17a2b8; }
        .tool-result { margin-bottom: 20px; padding: 15px; border-left: 4px solid #ddd; background: #f8f9fa; }
        .tool-result.success { border-left-color: #28a745; }
        .tool-result.error { border-left-color: #dc3545; }
        .tool-result.warning { border-left-color: #ffc107; }
        .tool-name { font-weight: bold; font-size: 1.2em; margin-bottom: 10px; }
        .tool-summary { margin-bottom: 10px; }
        .timestamp { text-align: center; color: #666; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔧 代码质量工具综合报告</h1>
            <p>ZK-Agent 项目自动化工具执行报告</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <h3>总工具数</h3>
                <div class="number info">${results.summary.total}</div>
            </div>
            <div class="summary-card">
                <h3>成功执行</h3>
                <div class="number success">${results.summary.success}</div>
            </div>
            <div class="summary-card">
                <h3>执行失败</h3>
                <div class="number error">${results.summary.error}</div>
            </div>
            <div class="summary-card">
                <h3>跳过执行</h3>
                <div class="number warning">${results.summary.skipped}</div>
            </div>
        </div>
        
        <h2>📋 详细结果</h2>
        ${results.tools.map(tool => `
            <div class="tool-result ${tool.status}">
                <div class="tool-name">${tool.tool}</div>
                <div class="tool-summary">${tool.summary || tool.reason || '无摘要信息'}</div>
                <div class="status">状态: <strong>${this.getStatusText(tool.status)}</strong></div>
            </div>
        `).join('')}
        
        <div class="timestamp">
            <p>报告生成时间: ${new Date(results.timestamp).toLocaleString('zh-CN')}</p>
        </div>
    </div>
</body>
</html>`;
    
    return html;
  }

  /**
   * 获取状态文本
   * @param {string} status 状态
   * @returns {string} 状态文本
   */
  getStatusText(status) {
    const statusMap = {
      'success': '✅ 成功',
      'error': '❌ 失败',
      'warning': '⚠️ 警告',
      'skipped': '⏭️ 跳过'
    };
    return statusMap[status] || status;
  }

  /**
   * 打印执行摘要
   * @param {Object} results 运行结果
   */
  printExecutionSummary(results) {
    console.log(chalk.green('\n📊 执行摘要:'));
    console.log(chalk.gray('='.repeat(50)));
    console.log(chalk.blue(`总工具数: ${results.summary.total}`));
    console.log(chalk.green(`成功: ${results.summary.success}`));
    console.log(chalk.red(`失败: ${results.summary.error}`));
    console.log(chalk.yellow(`跳过: ${results.summary.skipped}`));
    console.log(chalk.gray('='.repeat(50)));
    
    results.tools.forEach(tool => {
      const statusIcon = tool.status === 'success' ? '✅' : 
                        tool.status === 'error' ? '❌' : 
                        tool.status === 'warning' ? '⚠️' : '⏭️';
      console.log(`${statusIcon} ${tool.tool}: ${tool.summary || tool.reason || '无信息'}`);
    });
    
    console.log(chalk.blue(`\n📁 报告保存位置: ${this.reportDir}`));
  }

  /**
   * 设置工具配置
   * @param {string} toolName 工具名称
   * @param {Object} config 配置
   */
  setToolConfig(toolName, config) {
    this.config.tools[toolName] = {
      ...this.config.tools[toolName],
      ...config
    };
    this.saveConfig();
  }

  /**
   * 启用/禁用工具
   * @param {string} toolName 工具名称
   * @param {boolean} enabled 是否启用
   */
  toggleTool(toolName, enabled) {
    if (this.config.tools[toolName]) {
      this.config.tools[toolName].enabled = enabled;
      this.saveConfig();
      console.log(chalk.green(`✅ ${toolName} 已${enabled ? '启用' : '禁用'}`));
    } else {
      console.error(chalk.red(`❌ 工具 ${toolName} 不存在`));
    }
  }

  /**
   * 显示工具状态
   */
  showStatus() {
    console.log(chalk.green('🔧 工具状态:'));
    console.log(chalk.gray('='.repeat(60)));
    
    Object.entries(this.config.tools).forEach(([name, config]) => {
      const status = config.enabled ? '✅ 启用' : '❌ 禁用';
      const installed = this.isToolInstalled(name) ? '📦 已安装' : '📦 未安装';
      console.log(`${name.padEnd(20)} ${status.padEnd(10)} ${installed}`);
    });
  }
}

// 命令行执行
if (require.main === module) {
  const manager = new ToolManager();
  
  const command = process.argv[2] || 'run';
  const toolName = process.argv[3];
  
  switch (command) {
    case 'run':
      if (toolName) {
        manager.runTool(toolName);
      } else {
        manager.runAllTools();
      }
      break;
    case 'install':
      if (toolName) {
        manager.installTool(toolName);
      } else {
        console.log(chalk.red('请指定要安装的工具名称'));
      }
      break;
    case 'enable':
      if (toolName) {
        manager.toggleTool(toolName, true);
      } else {
        console.log(chalk.red('请指定要启用的工具名称'));
      }
      break;
    case 'disable':
      if (toolName) {
        manager.toggleTool(toolName, false);
      } else {
        console.log(chalk.red('请指定要禁用的工具名称'));
      }
      break;
    case 'status':
      manager.showStatus();
      break;
    case 'config':
      console.log(JSON.stringify(manager.config, null, 2));
      break;
    default:
      console.log(chalk.blue('可用命令:'));
      console.log('  run [tool]     - 运行工具（不指定则运行所有）');
      console.log('  install <tool> - 安装指定工具');
      console.log('  enable <tool>  - 启用指定工具');
      console.log('  disable <tool> - 禁用指定工具');
      console.log('  status         - 显示工具状态');
      console.log('  config         - 显示当前配置');
      break;
  }
}

module.exports = ToolManager;