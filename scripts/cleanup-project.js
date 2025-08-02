#!/usr/bin/env node
/**
 * 项目清理脚本
 * 清理与项目核心功能无关的文件和目录
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const PROJECT_ROOT = path.resolve(__dirname, '..');

/**
 * 需要清理的目录列表
 * 这些目录包含自动生成的文件或与核心功能无关的内容
 */
const CLEANUP_DIRECTORIES = [
  'coverage',           // 测试覆盖率报告
  'test-reports',       // 测试报告
  'reports',           // 各种自动生成的报告
  'temp',              // 临时文件
  'logs',              // 日志文件（保留目录结构，清理内容）
  '.next',             // Next.js 构建缓存
  'node_modules/.cache', // 缓存文件
];

/**
 * 需要清理的临时脚本文件
 * 这些是开发过程中创建的临时脚本，不属于核心功能
 */
const CLEANUP_SCRIPTS = [
  'scripts/check-config-conflicts.js',
  'scripts/fix-error-constants.js', 
  'scripts/fix-error-messages.ts',
  'scripts/fix-logger-imports.ts',
  'scripts/fix-test-config.js',
  'scripts/fix-types.js',
  'scripts/remove-unused-imports.js',
  'scripts/unify-tech-stack.js',
  'scripts/check-consistency.js',
  'scripts/validate-config.js',
  'scripts/validate-env.js',
  'scripts/validate-production-config.js',
  'scripts/validate-project.js',
  'scripts/execute-phase-123.ts',
  'scripts/migrate-api-error-handling.ts',
  'scripts/migrate-components.ts',
  'scripts/run-comprehensive-tests.ts',
  'scripts/validate-error-handling-migration.ts',
  'scripts/phase4-continuous-improvement.js',
  'scripts/production-delivery-validator.js',
];

/**
 * 需要清理的配置和文档文件
 * 这些是重复或过时的配置文件
 */
const CLEANUP_CONFIG_FILES = [
  'tsconfig.ultimate.json',  // 重复的TypeScript配置
  'next.config.performance.mjs', // 重复的Next.js配置
  'config/jest.simple.config.js', // 简化的Jest配置
  'quality-gates.config.json',    // 质量门配置
];

/**
 * 需要清理的IDE和工具配置目录
 * 这些是特定IDE的配置，不应该提交到版本控制
 */
const CLEANUP_IDE_DIRECTORIES = [
  '.claude',
  '.comate', 
  '.cursor',
  '.trae',
  '.serena',
  '.mcp-memory',
  '.mcp',
];

class ProjectCleaner {
  constructor() {
    this.deletedFiles = [];
    this.deletedDirectories = [];
    this.errors = [];
  }

  /**
   * 记录日志信息
   * @param {string} message - 日志消息
   * @param {string} type - 日志类型 (info, success, warning, error)
   */
  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      warning: chalk.yellow,
      error: chalk.red
    };
    
    console.log(`[${timestamp}] ${colors[type](message)}`);
  }

  /**
   * 安全删除文件
   * @param {string} filePath - 文件路径
   * @returns {boolean} 是否删除成功
   */
  safeDeleteFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
          fs.unlinkSync(filePath);
          this.deletedFiles.push(filePath);
          this.log(`删除文件: ${path.relative(PROJECT_ROOT, filePath)}`, 'success');
          return true;
        }
      }
      return false;
    } catch (error) {
      this.errors.push(`删除文件失败 ${filePath}: ${error.message}`);
      this.log(`删除文件失败 ${filePath}: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * 安全删除目录
   * @param {string} dirPath - 目录路径
   * @returns {boolean} 是否删除成功
   */
  safeDeleteDirectory(dirPath) {
    try {
      if (fs.existsSync(dirPath)) {
        const stats = fs.statSync(dirPath);
        if (stats.isDirectory()) {
          fs.rmSync(dirPath, { recursive: true, force: true });
          this.deletedDirectories.push(dirPath);
          this.log(`删除目录: ${path.relative(PROJECT_ROOT, dirPath)}`, 'success');
          return true;
        }
      }
      return false;
    } catch (error) {
      this.errors.push(`删除目录失败 ${dirPath}: ${error.message}`);
      this.log(`删除目录失败 ${dirPath}: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * 清理指定目录中的内容但保留目录结构
   * @param {string} dirPath - 目录路径
   */
  cleanDirectoryContents(dirPath) {
    try {
      if (fs.existsSync(dirPath)) {
        const items = fs.readdirSync(dirPath);
        for (const item of items) {
          const itemPath = path.join(dirPath, item);
          const stats = fs.statSync(itemPath);
          
          if (stats.isDirectory()) {
            this.safeDeleteDirectory(itemPath);
          } else {
            this.safeDeleteFile(itemPath);
          }
        }
        this.log(`清理目录内容: ${path.relative(PROJECT_ROOT, dirPath)}`, 'success');
      }
    } catch (error) {
      this.errors.push(`清理目录内容失败 ${dirPath}: ${error.message}`);
      this.log(`清理目录内容失败 ${dirPath}: ${error.message}`, 'error');
    }
  }

  /**
   * 清理自动生成的目录
   */
  cleanupDirectories() {
    this.log('开始清理自动生成的目录...', 'info');
    
    for (const dir of CLEANUP_DIRECTORIES) {
      const dirPath = path.join(PROJECT_ROOT, dir);
      
      // 对于logs目录，只清理内容，保留目录结构
      if (dir === 'logs') {
        this.cleanDirectoryContents(dirPath);
      } else {
        this.safeDeleteDirectory(dirPath);
      }
    }
  }

  /**
   * 清理临时脚本文件
   */
  cleanupScripts() {
    this.log('开始清理临时脚本文件...', 'info');
    
    for (const script of CLEANUP_SCRIPTS) {
      const scriptPath = path.join(PROJECT_ROOT, script);
      this.safeDeleteFile(scriptPath);
    }
  }

  /**
   * 清理配置文件
   */
  cleanupConfigFiles() {
    this.log('开始清理重复的配置文件...', 'info');
    
    for (const configFile of CLEANUP_CONFIG_FILES) {
      const configPath = path.join(PROJECT_ROOT, configFile);
      this.safeDeleteFile(configPath);
    }
  }

  /**
   * 清理IDE配置目录
   */
  cleanupIDEDirectories() {
    this.log('开始清理IDE配置目录...', 'info');
    
    for (const ideDir of CLEANUP_IDE_DIRECTORIES) {
      const ideDirPath = path.join(PROJECT_ROOT, ideDir);
      this.safeDeleteDirectory(ideDirPath);
    }
  }

  /**
   * 清理monitoring目录中的临时文件
   */
  cleanupMonitoringScripts() {
    this.log('开始清理monitoring目录中的临时脚本...', 'info');
    
    const monitoringDir = path.join(PROJECT_ROOT, 'scripts', 'monitoring');
    if (fs.existsSync(monitoringDir)) {
      const scriptsToDelete = [
        'development-progress-lite.js',
        'development-progress.js', 
        'quality-gates.js',
        'risk-detection-lite.js',
        'risk-detection.js',
        'task-analysis.js'
      ];
      
      for (const script of scriptsToDelete) {
        const scriptPath = path.join(monitoringDir, script);
        this.safeDeleteFile(scriptPath);
      }
      
      // 如果monitoring目录为空，删除整个目录
      try {
        const remainingItems = fs.readdirSync(monitoringDir);
        if (remainingItems.length === 0) {
          this.safeDeleteDirectory(monitoringDir);
        }
      } catch (error) {
        this.log(`检查monitoring目录失败: ${error.message}`, 'warning');
      }
    }
  }

  /**
   * 生成清理报告
   */
  generateReport() {
    this.log('\n=== 项目清理报告 ===', 'info');
    this.log(`删除的文件数量: ${this.deletedFiles.length}`, 'info');
    this.log(`删除的目录数量: ${this.deletedDirectories.length}`, 'info');
    this.log(`错误数量: ${this.errors.length}`, this.errors.length > 0 ? 'warning' : 'info');
    
    if (this.deletedFiles.length > 0) {
      this.log('\n删除的文件:', 'info');
      this.deletedFiles.forEach(file => {
        this.log(`  - ${path.relative(PROJECT_ROOT, file)}`, 'info');
      });
    }
    
    if (this.deletedDirectories.length > 0) {
      this.log('\n删除的目录:', 'info');
      this.deletedDirectories.forEach(dir => {
        this.log(`  - ${path.relative(PROJECT_ROOT, dir)}`, 'info');
      });
    }
    
    if (this.errors.length > 0) {
      this.log('\n错误信息:', 'error');
      this.errors.forEach(error => {
        this.log(`  - ${error}`, 'error');
      });
    }
    
    // 保存报告到文件
    const reportPath = path.join(PROJECT_ROOT, 'cleanup-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      deletedFiles: this.deletedFiles.map(f => path.relative(PROJECT_ROOT, f)),
      deletedDirectories: this.deletedDirectories.map(d => path.relative(PROJECT_ROOT, d)),
      errors: this.errors,
      summary: {
        filesDeleted: this.deletedFiles.length,
        directoriesDeleted: this.deletedDirectories.length,
        errorsCount: this.errors.length
      }
    };
    
    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      this.log(`\n清理报告已保存到: ${path.relative(PROJECT_ROOT, reportPath)}`, 'success');
    } catch (error) {
      this.log(`保存清理报告失败: ${error.message}`, 'error');
    }
  }

  /**
   * 执行完整的项目清理
   */
  async run() {
    this.log('开始执行项目清理...', 'info');
    this.log(`项目根目录: ${PROJECT_ROOT}`, 'info');
    
    try {
      // 执行各种清理操作
      this.cleanupDirectories();
      this.cleanupScripts();
      this.cleanupConfigFiles();
      this.cleanupIDEDirectories();
      this.cleanupMonitoringScripts();
      
      // 生成清理报告
      this.generateReport();
      
      this.log('\n项目清理完成！', 'success');
      
    } catch (error) {
      this.log(`项目清理过程中发生错误: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const cleaner = new ProjectCleaner();
  cleaner.run().catch(error => {
    console.error('清理脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = ProjectCleaner;