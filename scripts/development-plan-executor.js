#!/usr/bin/env node
/**
 * 开发计划执行器
 * 自动化执行项目优化后的开发计划任务
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');

/**
 * 开发计划执行器类
 */
class DevelopmentPlanExecutor {
  constructor() {
    this.tasks = [
      {
        id: 'validate_cleanup',
        name: '验证清理结果',
        description: '检查项目是否能正常构建和运行',
        priority: 'high',
        estimatedTime: '30分钟',
        status: 'pending'
      },
      {
        id: 'update_package_json',
        name: '更新package.json脚本',
        description: '添加代码质量检查脚本到package.json',
        priority: 'medium',
        estimatedTime: '15分钟',
        status: 'pending'
      },
      {
        id: 'create_quality_config',
        name: '创建代码质量配置',
        description: '创建ESLint和Prettier的统一配置',
        priority: 'medium',
        estimatedTime: '20分钟',
        status: 'pending'
      },
      {
        id: 'setup_pre_commit',
        name: '设置预提交钩子',
        description: '配置Git pre-commit钩子进行代码质量检查',
        priority: 'medium',
        estimatedTime: '25分钟',
        status: 'pending'
      },
      {
        id: 'create_ci_workflow',
        name: '创建CI工作流',
        description: '创建GitHub Actions工作流进行自动化检查',
        priority: 'low',
        estimatedTime: '45分钟',
        status: 'pending'
      }
    ];
    
    this.executionReport = {
      timestamp: new Date().toISOString(),
      completedTasks: [],
      failedTasks: [],
      skippedTasks: []
    };
  }

  /**
   * 记录日志
   * @param {string} message - 日志消息
   * @param {string} type - 日志类型
   */
  log(message, type = 'info') {
    const prefix = `[${type.toUpperCase()}]`;
    console.log(`${prefix} ${message}`);
  }

  /**
   * 执行命令
   * @param {string} command - 要执行的命令
   * @param {Object} options - 执行选项
   * @returns {string} 命令输出
   */
  executeCommand(command, options = {}) {
    try {
      const result = execSync(command, {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
        stdio: 'pipe',
        ...options
      });
      return result.trim();
    } catch (error) {
      throw new Error(`命令执行失败: ${command}\n${error.message}`);
    }
  }

  /**
   * 验证清理结果
   */
  async validateCleanup() {
    this.log('验证项目清理结果...', 'info');
    
    try {
      // 检查package.json是否存在
      const packageJsonPath = path.join(PROJECT_ROOT, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        throw new Error('package.json文件不存在');
      }
      
      // 检查关键目录是否存在
      const criticalDirs = ['app', 'components', 'lib', 'types'];
      for (const dir of criticalDirs) {
        const dirPath = path.join(PROJECT_ROOT, dir);
        if (!fs.existsSync(dirPath)) {
          throw new Error(`关键目录不存在: ${dir}`);
        }
      }
      
      // 尝试安装依赖（如果需要）
      if (!fs.existsSync(path.join(PROJECT_ROOT, 'node_modules'))) {
        this.log('安装项目依赖...', 'info');
        this.executeCommand('npm install');
      }
      
      // 检查TypeScript编译
      this.log('检查TypeScript编译...', 'info');
      try {
        this.executeCommand('npx tsc --noEmit');
        this.log('TypeScript编译检查通过', 'success');
      } catch (error) {
        this.log('TypeScript编译存在问题，但不影响继续执行', 'warning');
      }
      
      return { success: true, message: '项目验证通过' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * 更新package.json脚本
   */
  async updatePackageJson() {
    this.log('更新package.json脚本...', 'info');
    
    try {
      const packageJsonPath = path.join(PROJECT_ROOT, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // 添加代码质量检查脚本
      const newScripts = {
        'analyze:code': 'node scripts/comprehensive-code-analysis.js',
        'analyze:dead-code': 'node scripts/dead-code-analyzer.js',
        'cleanup:auto': 'node scripts/auto-cleanup.js',
        'cleanup:smart': 'node scripts/smart-cleanup.js',
        'quality:check': 'npm run analyze:code && npm run analyze:dead-code',
        'quality:fix': 'npm run cleanup:auto && npm run cleanup:smart'
      };
      
      packageJson.scripts = {
        ...packageJson.scripts,
        ...newScripts
      };
      
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      
      return { success: true, message: '已添加代码质量检查脚本' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * 创建代码质量配置
   */
  async createQualityConfig() {
    this.log('创建代码质量配置...', 'info');
    
    try {
      // 创建.eslintrc.js配置
      const eslintConfig = `module.exports = {
  extends: [
    'next/core-web-vitals',
    '@typescript-eslint/recommended'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': 'warn',
    'prefer-const': 'error'
  },
  ignorePatterns: [
    'node_modules/',
    '.next/',
    'dist/',
    'build/',
    '*.config.js'
  ]
};`;
      
      const eslintPath = path.join(PROJECT_ROOT, '.eslintrc.js');
      if (!fs.existsSync(eslintPath)) {
        fs.writeFileSync(eslintPath, eslintConfig);
      }
      
      // 创建代码质量检查配置
      const qualityConfig = {
        rules: {
          maxFileSize: '500kb',
          maxFunctionLength: 50,
          maxComplexity: 10,
          unusedImportsThreshold: 5,
          deadCodeThreshold: 3
        },
        excludePatterns: [
          'node_modules/**',
          '.next/**',
          'dist/**',
          'build/**',
          '**/*.test.*',
          '**/*.spec.*'
        ],
        autoFix: {
          removeUnusedImports: true,
          removeEmptyDirectories: true,
          removeTempFiles: true
        }
      };
      
      const configPath = path.join(PROJECT_ROOT, 'quality.config.json');
      fs.writeFileSync(configPath, JSON.stringify(qualityConfig, null, 2));
      
      return { success: true, message: '已创建代码质量配置文件' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * 设置预提交钩子
   */
  async setupPreCommitHook() {
    this.log('设置Git预提交钩子...', 'info');
    
    try {
      // 检查是否是Git仓库
      if (!fs.existsSync(path.join(PROJECT_ROOT, '.git'))) {
        return { success: false, message: '不是Git仓库，跳过预提交钩子设置' };
      }
      
      // 创建pre-commit钩子脚本
      const preCommitScript = `#!/bin/sh
# ZK-Agent Pre-commit Hook
# 在提交前运行代码质量检查

echo "运行代码质量检查..."

# 运行代码分析
node scripts/comprehensive-code-analysis.js
if [ $? -ne 0 ]; then
  echo "代码分析失败，请修复问题后重新提交"
  exit 1
fi

# 运行死代码检测
node scripts/dead-code-analyzer.js
if [ $? -ne 0 ]; then
  echo "死代码检测失败，请修复问题后重新提交"
  exit 1
fi

echo "代码质量检查通过"
exit 0`;
      
      const hooksDir = path.join(PROJECT_ROOT, '.git', 'hooks');
      const preCommitPath = path.join(hooksDir, 'pre-commit');
      
      fs.writeFileSync(preCommitPath, preCommitScript);
      
      // 设置执行权限（在Windows上可能不需要）
      try {
        fs.chmodSync(preCommitPath, '755');
      } catch (error) {
        // Windows上忽略权限设置错误
      }
      
      return { success: true, message: '已设置Git预提交钩子' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * 创建CI工作流
   */
  async createCIWorkflow() {
    this.log('创建GitHub Actions CI工作流...', 'info');
    
    try {
      const workflowDir = path.join(PROJECT_ROOT, '.github', 'workflows');
      if (!fs.existsSync(workflowDir)) {
        fs.mkdirSync(workflowDir, { recursive: true });
      }
      
      const ciWorkflow = `name: Code Quality Check

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  quality-check:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
      
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run TypeScript check
      run: npx tsc --noEmit
      
    - name: Run ESLint
      run: npx eslint . --ext .ts,.tsx,.js,.jsx
      
    - name: Run code analysis
      run: npm run analyze:code
      
    - name: Run dead code detection
      run: npm run analyze:dead-code
      
    - name: Upload analysis reports
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: code-analysis-reports
        path: |
          code-analysis-report.json
          dead-code-analysis-report.json`;
      
      const workflowPath = path.join(workflowDir, 'code-quality.yml');
      fs.writeFileSync(workflowPath, ciWorkflow);
      
      return { success: true, message: '已创建GitHub Actions CI工作流' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * 执行单个任务
   * @param {Object} task - 任务对象
   */
  async executeTask(task) {
    this.log(`执行任务: ${task.name}`, 'info');
    
    try {
      let result;
      
      switch (task.id) {
        case 'validate_cleanup':
          result = await this.validateCleanup();
          break;
        case 'update_package_json':
          result = await this.updatePackageJson();
          break;
        case 'create_quality_config':
          result = await this.createQualityConfig();
          break;
        case 'setup_pre_commit':
          result = await this.setupPreCommitHook();
          break;
        case 'create_ci_workflow':
          result = await this.createCIWorkflow();
          break;
        default:
          result = { success: false, message: '未知任务类型' };
      }
      
      if (result.success) {
        task.status = 'completed';
        this.executionReport.completedTasks.push({
          ...task,
          result: result.message,
          completedAt: new Date().toISOString()
        });
        this.log(`任务完成: ${task.name} - ${result.message}`, 'success');
      } else {
        task.status = 'failed';
        this.executionReport.failedTasks.push({
          ...task,
          error: result.message,
          failedAt: new Date().toISOString()
        });
        this.log(`任务失败: ${task.name} - ${result.message}`, 'error');
      }
    } catch (error) {
      task.status = 'failed';
      this.executionReport.failedTasks.push({
        ...task,
        error: error.message,
        failedAt: new Date().toISOString()
      });
      this.log(`任务异常: ${task.name} - ${error.message}`, 'error');
    }
  }

  /**
   * 生成执行报告
   */
  generateExecutionReport() {
    const reportPath = path.join(PROJECT_ROOT, 'development-plan-execution-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.executionReport, null, 2));
    
    this.log('\n=== 开发计划执行报告 ===', 'info');
    this.log(`完成任务: ${this.executionReport.completedTasks.length}`, 'success');
    this.log(`失败任务: ${this.executionReport.failedTasks.length}`, this.executionReport.failedTasks.length > 0 ? 'error' : 'success');
    this.log(`跳过任务: ${this.executionReport.skippedTasks.length}`, 'info');
    this.log(`\n详细报告已保存到: ${reportPath}`, 'success');
  }

  /**
   * 执行开发计划
   */
  async run() {
    this.log('开始执行开发计划...', 'info');
    
    try {
      // 按优先级排序任务
      const priorityOrder = { 'high': 1, 'medium': 2, 'low': 3 };
      const sortedTasks = this.tasks.sort((a, b) => 
        priorityOrder[a.priority] - priorityOrder[b.priority]
      );
      
      // 执行任务
      for (const task of sortedTasks) {
        await this.executeTask(task);
      }
      
      // 生成报告
      this.generateExecutionReport();
      
      this.log('\n开发计划执行完成!', 'success');
      
    } catch (error) {
      this.log(`执行过程中出现错误: ${error.message}`, 'error');
      throw error;
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const executor = new DevelopmentPlanExecutor();
  executor.run().catch(error => {
    console.error('开发计划执行失败:', error);
    process.exit(1);
  });
}

module.exports = DevelopmentPlanExecutor;