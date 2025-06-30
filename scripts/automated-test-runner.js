#!/usr/bin/env node

/**
 * @file automated-test-runner.js
 * @description ZK-Agent 自动化测试运行器
 * @author ZK-Agent Team
 * @date 2025-05-25
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { getDatabaseUrl, validateDatabaseConfig } = require('../lib/database/database.config');

class AutomatedTestRunner {
  constructor() {
    this.startTime = Date.now();
    this.logFile = path.join(process.cwd(), 'test-reports', 'automated-test-log.json');
    this.summaryFile = path.join(process.cwd(), 'test-reports', 'test-summary.md');
    this.testResults = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      phases: []
    };
    
    // 确保日志目录存在
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * 记录日志到文件
   */
  log(level, message, data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      phase: this.currentPhase || 'INIT'
    };
    
    // 写入日志文件
    fs.appendFileSync(this.logFile, JSON.stringify(logEntry) + '\n');
    
    // 控制台输出
    const icon = {
      'INFO': 'ℹ️',
      'SUCCESS': '✅',
      'ERROR': '❌',
      'WARNING': '⚠️',
      'DEBUG': '🔍'
    }[level] || 'ℹ️';
    
    console.log(`${icon} [${new Date().toLocaleTimeString()}] ${message}`);
    if (Object.keys(data).length > 0) {
      console.log('   详情:', JSON.stringify(data, null, 2));
    }
  }

  /**
   * 执行命令并返回Promise
   */
  executeCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
      this.log('INFO', `执行命令: ${command}`);
      
      const child = spawn('bash', ['-c', command], {
        stdio: 'pipe',
        cwd: process.cwd(),
        ...options
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
        if (options.realtime) {
          process.stdout.write(data);
        }
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
        if (options.realtime) {
          process.stderr.write(data);
        }
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject({ stdout, stderr, code, command });
        }
      });
      
      child.on('error', (error) => {
        reject({ error, command });
      });
    });
  }

  /**
   * 验证环境配置
   */
  async validateEnvironment() {
    this.currentPhase = 'ENV_VALIDATION';
    this.log('INFO', '开始环境验证...');
    
    const checks = [
      {
        name: '检查Node.js版本',
        command: 'node --version',
        validator: (output) => {
          const version = output.stdout.trim();
          const majorVersion = parseInt(version.replace('v', '').split('.')[0]);
          return majorVersion >= 18;
        }
      },
      {
        name: '检查npm版本',
        command: 'npm --version',
        validator: (output) => output.code === 0
      },
      {
        name: '验证生产数据库配置',
        command: 'echo "Database config check"',
        validator: () => validateDatabaseConfig('production')
      },
      {
        name: '验证测试数据库配置',
        command: 'echo "Test database config check"',
        validator: () => validateDatabaseConfig('test')
      },
      {
        name: '检查package.json',
        command: 'test -f package.json',
        validator: (output) => output.code === 0
      },
      {
        name: '检查Jest配置',
        command: 'test -f jest.config.production.js',
        validator: (output) => output.code === 0
      }
    ];
    
    for (const check of checks) {
      try {
        const result = await this.executeCommand(check.command);
        const isValid = check.validator(result);
        
        if (isValid) {
          this.log('SUCCESS', `${check.name} - 通过`);
        } else {
          this.log('ERROR', `${check.name} - 失败`);
          throw new Error(`环境验证失败: ${check.name}`);
        }
      } catch (error) {
        this.log('ERROR', `${check.name} - 错误`, { error: error.message });
        throw error;
      }
    }
    
    this.log('SUCCESS', '环境验证完成');
  }

  /**
   * 修复依赖问题
   */
  async fixDependencies() {
    this.currentPhase = 'DEPENDENCY_FIX';
    this.log('INFO', '开始修复依赖问题...');
    
    try {
      // 清理缓存
      this.log('INFO', '清理npm缓存...');
      await this.executeCommand('npm cache clean --force');
      
      // 删除node_modules和lock文件
      this.log('INFO', '清理旧依赖...');
      await this.executeCommand('rm -rf node_modules package-lock.json .npm');
      
      // 修复package.json中的依赖冲突
      this.log('INFO', '修复依赖冲突...');
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      // 修复vaul版本冲突
      if (packageJson.dependencies && packageJson.dependencies.vaul) {
        packageJson.dependencies.vaul = '^0.9.9';
        this.log('INFO', '修复vaul版本冲突');
      }
      
      fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
      
      // 重新安装依赖
      this.log('INFO', '重新安装依赖...');
      await this.executeCommand('npm install --legacy-peer-deps', { realtime: true });
      
      this.log('SUCCESS', '依赖修复完成');
    } catch (error) {
      this.log('ERROR', '依赖修复失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 运行测试套件
   */
  async runTestSuite() {
    this.currentPhase = 'TEST_EXECUTION';
    this.log('INFO', '开始执行测试套件...');
    
    // 设置测试环境变量
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = getDatabaseUrl('test');
    
    const testPhases = [
      {
        name: '单元测试',
        command: 'npm run test:unit -- --passWithNoTests --maxWorkers=1',
        critical: true
      },
      {
        name: '集成测试',
        command: 'npm run test:integration -- --passWithNoTests --maxWorkers=1',
        critical: true
      },
      {
        name: 'API测试',
        command: 'npm run test:integration:api -- --passWithNoTests --maxWorkers=1',
        critical: false
      },
      {
        name: '安全测试',
        command: 'npm run test:security -- --passWithNoTests --maxWorkers=1',
        critical: false
      }
    ];
    
    for (const phase of testPhases) {
      try {
        this.log('INFO', `执行${phase.name}...`);
        const startTime = Date.now();
        
        const result = await this.executeCommand(phase.command, { realtime: true });
        const duration = Date.now() - startTime;
        
        // 解析测试结果
        const testOutput = result.stdout + result.stderr;
        const passedMatch = testOutput.match(/(\d+) passed/);
        const failedMatch = testOutput.match(/(\d+) failed/);
        const totalMatch = testOutput.match(/Tests:\s+(\d+)/);
        
        const phaseResult = {
          name: phase.name,
          duration,
          passed: passedMatch ? parseInt(passedMatch[1]) : 0,
          failed: failedMatch ? parseInt(failedMatch[1]) : 0,
          total: totalMatch ? parseInt(totalMatch[1]) : 0,
          success: result.code === 0
        };
        
        this.testResults.phases.push(phaseResult);
        this.testResults.total += phaseResult.total;
        this.testResults.passed += phaseResult.passed;
        this.testResults.failed += phaseResult.failed;
        
        if (phaseResult.success) {
          this.log('SUCCESS', `${phase.name}完成`, phaseResult);
        } else {
          this.log('ERROR', `${phase.name}失败`, phaseResult);
          if (phase.critical) {
            throw new Error(`关键测试阶段失败: ${phase.name}`);
          }
        }
        
      } catch (error) {
        this.log('ERROR', `${phase.name}执行错误`, { error: error.message });
        if (phase.critical) {
          throw error;
        }
      }
    }
    
    this.log('SUCCESS', '测试套件执行完成');
  }

  /**
   * 生成测试报告
   */
  async generateReport() {
    this.currentPhase = 'REPORT_GENERATION';
    this.log('INFO', '生成测试报告...');
    
    const totalDuration = Date.now() - this.startTime;
    const successRate = this.testResults.total > 0 
      ? (this.testResults.passed / this.testResults.total * 100).toFixed(1)
      : 0;
    
    const report = `# ZK-Agent 自动化测试报告

## 测试概览
- **执行时间**: ${new Date().toLocaleString()}
- **总耗时**: ${(totalDuration / 1000).toFixed(2)}秒
- **测试环境**: ${process.env.NODE_ENV}
- **数据库**: ${getDatabaseUrl('test')}

## 测试结果
- **总测试数**: ${this.testResults.total}
- **通过**: ${this.testResults.passed} ✅
- **失败**: ${this.testResults.failed} ❌
- **跳过**: ${this.testResults.skipped} ⏭️
- **成功率**: ${successRate}%

## 各阶段详情
${this.testResults.phases.map(phase => `
### ${phase.name}
- 状态: ${phase.success ? '✅ 通过' : '❌ 失败'}
- 耗时: ${(phase.duration / 1000).toFixed(2)}秒
- 测试数: ${phase.total}
- 通过: ${phase.passed}
- 失败: ${phase.failed}
`).join('\n')}

## 系统信息
- **Node.js**: ${process.version}
- **平台**: ${process.platform}
- **架构**: ${process.arch}
- **内存使用**: ${JSON.stringify(process.memoryUsage(), null, 2)}

---
*报告生成时间: ${new Date().toISOString()}*
`;
    
    fs.writeFileSync(this.summaryFile, report);
    this.log('SUCCESS', `测试报告已生成: ${this.summaryFile}`);
  }

  /**
   * 主执行流程
   */
  async run() {
    try {
      this.log('INFO', '🚀 ZK-Agent 自动化测试开始执行...');
      
      await this.validateEnvironment();
      await this.fixDependencies();
      await this.runTestSuite();
      await this.generateReport();
      
      const totalDuration = Date.now() - this.startTime;
      const successRate = this.testResults.total > 0 
        ? (this.testResults.passed / this.testResults.total * 100).toFixed(1)
        : 0;
      
      this.log('SUCCESS', '🎯 自动化测试执行完成!', {
        totalDuration: `${(totalDuration / 1000).toFixed(2)}秒`,
        successRate: `${successRate}%`,
        results: this.testResults
      });
      
      // 如果成功率低于80%，退出码为1
      if (parseFloat(successRate) < 80) {
        process.exit(1);
      }
      
    } catch (error) {
      this.log('ERROR', '自动化测试执行失败', { error: error.message });
      process.exit(1);
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const runner = new AutomatedTestRunner();
  runner.run();
}

module.exports = AutomatedTestRunner; 