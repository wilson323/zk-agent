#!/usr/bin/env node
/**
 * 环境兼容性检查器
 * 检查项目在不同环境下的兼容性，确保开发和生产环境的一致性
 * 
 * @author ZK-Agent Team
 * @version 1.0.0
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class EnvironmentCompatibilityChecker {
  constructor() {
    this.requirements = {
      node: {
        min: '18.0.0',
        recommended: '20.0.0',
        description: 'Node.js运行时环境'
      },
      npm: {
        min: '8.0.0',
        recommended: '10.0.0',
        description: 'NPM包管理器'
      },
      python: {
        min: '3.8.0',
        recommended: '3.11.0',
        description: 'Python运行时（Claude Code支持）'
      },
      git: {
        min: '2.20.0',
        recommended: '2.40.0',
        description: 'Git版本控制'
      }
    };
    
    this.claudeCodeRequirements = {
      python: '>=3.8',
      pip: '>=21.0',
      venv: true,
      description: 'Claude Code开发环境要求'
    };
    
    this.geminiCliRequirements = {
      node: '>=18.0',
      npm: '>=8.0',
      curl: true,
      description: 'Gemini CLI开发环境要求'
    };
  }

  /**
   * 检查版本是否满足要求
   * @param {string} current 当前版本
   * @param {string} required 要求版本
   * @returns {boolean} 是否满足要求
   */
  compareVersions(current, required) {
    const currentParts = current.replace(/[^\d.]/g, '').split('.').map(Number);
    const requiredParts = required.split('.').map(Number);
    
    for (let i = 0; i < Math.max(currentParts.length, requiredParts.length); i++) {
      const currentPart = currentParts[i] || 0;
      const requiredPart = requiredParts[i] || 0;
      
      if (currentPart > requiredPart) return true;
      if (currentPart < requiredPart) return false;
    }
    
    return true;
  }

  /**
   * 检查命令是否存在
   * @param {string} command 命令名称
   * @returns {boolean} 命令是否存在
   */
  checkCommandExists(command) {
    try {
      execSync(`where ${command}`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取命令版本
   * @param {string} command 命令名称
   * @param {string} versionFlag 版本标志
   * @returns {string|null} 版本号或null
   */
  getVersion(command, versionFlag = '--version') {
    try {
      const output = execSync(`${command} ${versionFlag}`, { 
        encoding: 'utf8', 
        stdio: 'pipe' 
      });
      return output.trim();
    } catch {
      return null;
    }
  }

  /**
   * 检查Node.js环境
   * @returns {Object} 检查结果
   */
  checkNodeEnvironment() {
    const nodeVersion = this.getVersion('node', '--version');
    const npmVersion = this.getVersion('npm', '--version');
    
    return {
      node: {
        installed: !!nodeVersion,
        version: nodeVersion,
        compatible: nodeVersion ? this.compareVersions(nodeVersion, this.requirements.node.min) : false,
        recommended: nodeVersion ? this.compareVersions(nodeVersion, this.requirements.node.recommended) : false
      },
      npm: {
        installed: !!npmVersion,
        version: npmVersion,
        compatible: npmVersion ? this.compareVersions(npmVersion, this.requirements.npm.min) : false,
        recommended: npmVersion ? this.compareVersions(npmVersion, this.requirements.npm.recommended) : false
      }
    };
  }

  /**
   * 检查Python环境（Claude Code支持）
   * @returns {Object} 检查结果
   */
  checkPythonEnvironment() {
    const pythonCommands = ['python', 'python3', 'py'];
    let pythonResult = null;
    
    for (const cmd of pythonCommands) {
      if (this.checkCommandExists(cmd)) {
        const version = this.getVersion(cmd, '--version');
        if (version) {
          pythonResult = {
            command: cmd,
            installed: true,
            version: version,
            compatible: this.compareVersions(version, this.requirements.python.min),
            recommended: this.compareVersions(version, this.requirements.python.recommended)
          };
          break;
        }
      }
    }
    
    if (!pythonResult) {
      pythonResult = {
        command: null,
        installed: false,
        version: null,
        compatible: false,
        recommended: false
      };
    }
    
    // 检查pip
    const pipVersion = this.getVersion('pip', '--version');
    const pipResult = {
      installed: !!pipVersion,
      version: pipVersion,
      compatible: !!pipVersion
    };
    
    return {
      python: pythonResult,
      pip: pipResult,
      venv: this.checkCommandExists('python') && this.checkVenvSupport()
    };
  }

  /**
   * 检查虚拟环境支持
   * @returns {boolean} 是否支持虚拟环境
   */
  checkVenvSupport() {
    try {
      execSync('python -m venv --help', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 检查Git环境
   * @returns {Object} 检查结果
   */
  checkGitEnvironment() {
    const gitVersion = this.getVersion('git', '--version');
    
    return {
      installed: !!gitVersion,
      version: gitVersion,
      compatible: gitVersion ? this.compareVersions(gitVersion, this.requirements.git.min) : false,
      recommended: gitVersion ? this.compareVersions(gitVersion, this.requirements.git.recommended) : false
    };
  }

  /**
   * 检查Claude Code兼容性
   * @param {Object} pythonEnv Python环境检查结果
   * @returns {Object} 兼容性检查结果
   */
  checkClaudeCodeCompatibility(pythonEnv) {
    const compatible = pythonEnv.python.compatible && 
                      pythonEnv.pip.installed && 
                      pythonEnv.venv;
    
    return {
      compatible,
      issues: [
        !pythonEnv.python.compatible && 'Python版本过低（需要>=3.8）',
        !pythonEnv.pip.installed && 'pip未安装',
        !pythonEnv.venv && '虚拟环境支持缺失'
      ].filter(Boolean),
      recommendations: [
        !pythonEnv.python.recommended && '建议升级到Python 3.11+',
        !pythonEnv.pip.compatible && '建议升级pip到最新版本'
      ].filter(Boolean)
    };
  }

  /**
   * 检查Gemini CLI兼容性
   * @param {Object} nodeEnv Node.js环境检查结果
   * @returns {Object} 兼容性检查结果
   */
  checkGeminiCliCompatibility(nodeEnv) {
    const curlExists = this.checkCommandExists('curl');
    const compatible = nodeEnv.node.compatible && 
                      nodeEnv.npm.compatible && 
                      curlExists;
    
    return {
      compatible,
      issues: [
        !nodeEnv.node.compatible && 'Node.js版本过低（需要>=18.0）',
        !nodeEnv.npm.compatible && 'npm版本过低（需要>=8.0）',
        !curlExists && 'curl命令缺失'
      ].filter(Boolean),
      recommendations: [
        !nodeEnv.node.recommended && '建议升级到Node.js 20+',
        !nodeEnv.npm.recommended && '建议升级npm到最新版本'
      ].filter(Boolean)
    };
  }

  /**
   * 生成兼容性报告
   * @returns {Object} 完整的兼容性报告
   */
  generateCompatibilityReport() {
    console.log(chalk.blue('🔍 开始环境兼容性检查...\n'));
    
    const nodeEnv = this.checkNodeEnvironment();
    const pythonEnv = this.checkPythonEnvironment();
    const gitEnv = this.checkGitEnvironment();
    
    const claudeCodeCompat = this.checkClaudeCodeCompatibility(pythonEnv);
    const geminiCliCompat = this.checkGeminiCliCompatibility(nodeEnv);
    
    return {
      environment: {
        node: nodeEnv,
        python: pythonEnv,
        git: gitEnv
      },
      compatibility: {
        claudeCode: claudeCodeCompat,
        geminiCli: geminiCliCompat
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 打印环境状态
   * @param {string} name 环境名称
   * @param {Object} env 环境信息
   */
  printEnvironmentStatus(name, env) {
    const status = env.installed ? 
      (env.compatible ? '✅' : '⚠️') : '❌';
    const version = env.version || '未安装';
    
    console.log(`${status} ${name.padEnd(15)} ${version}`);
    
    if (env.installed && !env.compatible) {
      console.log(chalk.yellow(`   ⚠️  版本过低，建议升级`));
    }
    if (env.installed && !env.recommended) {
      console.log(chalk.gray(`   💡 建议升级到推荐版本`));
    }
  }

  /**
   * 打印兼容性状态
   * @param {string} name 工具名称
   * @param {Object} compat 兼容性信息
   */
  printCompatibilityStatus(name, compat) {
    const status = compat.compatible ? '✅' : '❌';
    console.log(`${status} ${name} 兼容性`);
    
    if (compat.issues.length > 0) {
      console.log(chalk.red('   问题:'));
      compat.issues.forEach(issue => {
        console.log(chalk.red(`   • ${issue}`));
      });
    }
    
    if (compat.recommendations.length > 0) {
      console.log(chalk.yellow('   建议:'));
      compat.recommendations.forEach(rec => {
        console.log(chalk.yellow(`   • ${rec}`));
      });
    }
  }

  /**
   * 运行完整的兼容性检查
   */
  async run() {
    try {
      const report = this.generateCompatibilityReport();
      
      // 打印环境状态
      console.log(chalk.green('📋 开发环境状态:'));
      console.log('='.repeat(50));
      
      this.printEnvironmentStatus('Node.js', report.environment.node.node);
      this.printEnvironmentStatus('npm', report.environment.node.npm);
      this.printEnvironmentStatus('Python', report.environment.python.python);
      this.printEnvironmentStatus('pip', report.environment.python.pip);
      this.printEnvironmentStatus('Git', report.environment.git);
      
      console.log('\n' + chalk.green('🔗 工具兼容性:'));
      console.log('='.repeat(50));
      
      this.printCompatibilityStatus('Claude Code', report.compatibility.claudeCode);
      this.printCompatibilityStatus('Gemini CLI', report.compatibility.geminiCli);
      
      // 保存报告
      const reportPath = path.join(process.cwd(), 'reports', 'environment-compatibility.json');
      const reportsDir = path.dirname(reportPath);
      
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 报告已保存: ${reportPath}`);
      
      // 返回总体兼容性状态
      const overallCompatible = report.compatibility.claudeCode.compatible && 
                               report.compatibility.geminiCli.compatible;
      
      if (overallCompatible) {
        console.log(chalk.green('\n✅ 开发环境完全兼容 Claude Code 和 Gemini CLI'));
      } else {
        console.log(chalk.red('\n❌ 开发环境存在兼容性问题，请根据上述建议进行修复'));
      }
      
      return overallCompatible;
      
    } catch (error) {
      console.error(chalk.red('环境检查失败:'), error.message);
      return false;
    }
  }
}

// 命令行执行
if (require.main === module) {
  const checker = new EnvironmentCompatibilityChecker();
  
  checker.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error(chalk.red('检查过程出错:'), error);
    process.exit(1);
  });
}

module.exports = EnvironmentCompatibilityChecker;