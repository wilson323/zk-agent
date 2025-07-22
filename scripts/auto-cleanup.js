#!/usr/bin/env node
/**
 * 自动清理脚本
 * 基于代码分析报告自动清理空目录和重复配置
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ANALYSIS_REPORT_PATH = path.join(PROJECT_ROOT, 'code-analysis-report.json');

/**
 * 自动清理器类
 */
class AutoCleaner {
  constructor() {
    this.cleanupReport = {
      timestamp: new Date().toISOString(),
      actions: [],
      summary: {
        directoriesRemoved: 0,
        filesRemoved: 0,
        configsOptimized: 0,
        errors: 0
      }
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
   * 记录清理动作
   * @param {string} action - 动作类型
   * @param {string} target - 目标路径
   * @param {boolean} success - 是否成功
   * @param {string} reason - 原因
   */
  recordAction(action, target, success, reason = '') {
    this.cleanupReport.actions.push({
      action,
      target,
      success,
      reason,
      timestamp: new Date().toISOString()
    });
    
    if (success) {
      switch (action) {
        case 'remove_directory':
          this.cleanupReport.summary.directoriesRemoved++;
          break;
        case 'remove_file':
          this.cleanupReport.summary.filesRemoved++;
          break;
        case 'optimize_config':
          this.cleanupReport.summary.configsOptimized++;
          break;
      }
    } else {
      this.cleanupReport.summary.errors++;
    }
  }

  /**
   * 读取分析报告
   * @returns {Object} 分析报告数据
   */
  readAnalysisReport() {
    try {
      const reportContent = fs.readFileSync(ANALYSIS_REPORT_PATH, 'utf8');
      return JSON.parse(reportContent);
    } catch (error) {
      this.log(`无法读取分析报告: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 清理空目录
   * @param {Array} emptyDirectories - 空目录列表
   */
  async cleanupEmptyDirectories(emptyDirectories) {
    this.log('开始清理空目录...', 'info');
    
    for (const dir of emptyDirectories) {
      try {
        // 再次确认目录是否为空
        const items = await fs.promises.readdir(dir.path);
        if (items.length === 0) {
          await fs.promises.rmdir(dir.path);
          this.log(`已删除空目录: ${dir.relativePath}`, 'success');
          this.recordAction('remove_directory', dir.relativePath, true);
        } else {
          this.log(`跳过非空目录: ${dir.relativePath}`, 'warning');
          this.recordAction('remove_directory', dir.relativePath, false, '目录不为空');
        }
      } catch (error) {
        this.log(`删除目录失败: ${dir.relativePath} - ${error.message}`, 'error');
        this.recordAction('remove_directory', dir.relativePath, false, error.message);
      }
    }
  }

  /**
   * 优化Docker配置
   * @param {Object} dockerConfig - Docker配置信息
   */
  async optimizeDockerConfigs(dockerConfig) {
    this.log('分析Docker配置文件...', 'info');
    
    // Docker配置文件通常是合理的，不建议自动删除
    // 只记录建议
    const suggestions = {
      'Dockerfile': '主要的Docker构建文件',
      'Dockerfile.test': '测试环境Docker文件',
      'services/manus-gesture/Dockerfile': '手势服务专用Docker文件',
      'docker-compose.yml': '开发环境编排文件',
      'docker-compose.prod.yml': '生产环境编排文件',
      'docker-compose.test.yml': '测试环境编排文件'
    };
    
    this.log('Docker配置文件分析:', 'info');
    for (const file of dockerConfig.files) {
      const suggestion = suggestions[file.relativePath] || '用途需要确认';
      this.log(`  - ${file.relativePath}: ${suggestion}`, 'info');
    }
    
    this.recordAction('optimize_config', 'docker_configs', true, '已分析，建议保留所有文件');
  }

  /**
   * 优化Prettier配置
   * @param {Object} prettierConfig - Prettier配置信息
   */
  async optimizePrettierConfigs(prettierConfig) {
    this.log('分析Prettier配置文件...', 'info');
    
    // .prettierrc 和 .prettierignore 都是必要的
    this.log('Prettier配置文件分析:', 'info');
    this.log('  - .prettierrc: 代码格式化规则配置', 'info');
    this.log('  - .prettierignore: 忽略格式化的文件列表', 'info');
    this.log('建议保留两个文件，它们各有不同用途', 'info');
    
    this.recordAction('optimize_config', 'prettier_configs', true, '已分析，建议保留所有文件');
  }

  /**
   * 检查并清理其他潜在问题
   */
  async checkAdditionalIssues() {
    this.log('检查其他潜在问题...', 'info');
    
    // 检查是否有临时文件
    const tempPatterns = ['*.tmp', '*.temp', '*.bak', '*.orig', '.DS_Store', 'Thumbs.db'];
    
    for (const pattern of tempPatterns) {
      const tempFiles = await this.findFilesByPattern(pattern);
      for (const file of tempFiles) {
        try {
          await fs.promises.unlink(file.path);
          this.log(`已删除临时文件: ${file.relativePath}`, 'success');
          this.recordAction('remove_file', file.relativePath, true, '临时文件');
        } catch (error) {
          this.log(`删除临时文件失败: ${file.relativePath}`, 'error');
          this.recordAction('remove_file', file.relativePath, false, error.message);
        }
      }
    }
  }

  /**
   * 根据模式查找文件
   * @param {string} pattern - 文件模式
   * @returns {Array} 匹配的文件列表
   */
  async findFilesByPattern(pattern) {
    const files = [];
    
    const scanDir = async (dirPath) => {
      try {
        const items = await fs.promises.readdir(dirPath, { withFileTypes: true });
        
        for (const item of items) {
          const fullPath = path.join(dirPath, item.name);
          
          if (item.isDirectory() && !this.shouldSkipDirectory(item.name)) {
            await scanDir(fullPath);
          } else if (item.isFile()) {
            const regex = new RegExp(pattern.replace('*', '.*'));
            if (regex.test(item.name)) {
              files.push({
                name: item.name,
                path: fullPath,
                relativePath: path.relative(PROJECT_ROOT, fullPath)
              });
            }
          }
        }
      } catch (error) {
        // 忽略权限错误
      }
    };
    
    await scanDir(PROJECT_ROOT);
    return files;
  }

  /**
   * 检查是否应该跳过某个目录
   * @param {string} dirName - 目录名
   * @returns {boolean} 是否跳过
   */
  shouldSkipDirectory(dirName) {
    const skipDirs = [
      'node_modules', '.git', '.next', 'dist', 'build', 'coverage',
      '.vscode', '.idea', 'logs', 'uploads', '.vercel'
    ];
    return skipDirs.includes(dirName) || dirName.startsWith('.');
  }

  /**
   * 保存清理报告
   */
  saveCleanupReport() {
    const reportPath = path.join(PROJECT_ROOT, 'cleanup-execution-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.cleanupReport, null, 2));
    this.log(`清理报告已保存到: ${reportPath}`, 'success');
  }

  /**
   * 显示清理摘要
   */
  showSummary() {
    this.log('\n=== 清理摘要 ===', 'info');
    this.log(`删除目录: ${this.cleanupReport.summary.directoriesRemoved}`, 'success');
    this.log(`删除文件: ${this.cleanupReport.summary.filesRemoved}`, 'success');
    this.log(`优化配置: ${this.cleanupReport.summary.configsOptimized}`, 'success');
    this.log(`错误数量: ${this.cleanupReport.summary.errors}`, this.cleanupReport.summary.errors > 0 ? 'warning' : 'success');
  }

  /**
   * 执行清理
   */
  async run() {
    this.log('开始自动清理...', 'info');
    
    try {
      // 读取分析报告
      const analysisReport = this.readAnalysisReport();
      
      // 清理空目录
      if (analysisReport.details.emptyDirectories.length > 0) {
        await this.cleanupEmptyDirectories(analysisReport.details.emptyDirectories);
      }
      
      // 优化配置文件
      for (const config of analysisReport.details.redundantConfigs) {
        if (config.type === 'docker') {
          await this.optimizeDockerConfigs(config);
        } else if (config.type === 'prettier') {
          await this.optimizePrettierConfigs(config);
        }
      }
      
      // 检查其他问题
      await this.checkAdditionalIssues();
      
      // 保存报告和显示摘要
      this.saveCleanupReport();
      this.showSummary();
      
      this.log('\n自动清理完成!', 'success');
      
    } catch (error) {
      this.log(`清理过程中出现错误: ${error.message}`, 'error');
      throw error;
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const cleaner = new AutoCleaner();
  cleaner.run().catch(error => {
    console.error('清理失败:', error);
    process.exit(1);
  });
}

module.exports = AutoCleaner;