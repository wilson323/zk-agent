#!/usr/bin/env node
/**
 * 全面代码分析脚本
 * 分析项目中的冗余代码、死代码、空文件夹和未使用的导入
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');

/**
 * 代码分析器类
 * 负责分析项目代码质量和识别问题
 */
class CodeAnalyzer {
  constructor() {
    this.emptyDirectories = [];
    this.duplicateFiles = [];
    this.unusedImports = [];
    this.deadCode = [];
    this.redundantConfigs = [];
    this.analysisReport = {
      timestamp: new Date().toISOString(),
      summary: {},
      details: {}
    };
  }

  /**
   * 记录日志信息
   * @param {string} message - 日志消息
   * @param {string} type - 日志类型
   */
  log(message, type = 'info') {
    const prefix = `[${type.toUpperCase()}]`;
    console.log(`${prefix} ${message}`);
  }

  /**
   * 检查目录是否为空
   * @param {string} dirPath - 目录路径
   * @returns {boolean} 是否为空目录
   */
  async isEmptyDirectory(dirPath) {
    try {
      const items = await fs.promises.readdir(dirPath);
      return items.length === 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * 扫描空目录
   * @param {string} startPath - 开始扫描的路径
   */
  async scanEmptyDirectories(startPath = PROJECT_ROOT) {
    this.log('扫描空目录...', 'info');
    
    const scanDir = async (dirPath) => {
      try {
        const items = await fs.promises.readdir(dirPath, { withFileTypes: true });
        
        for (const item of items) {
          if (item.isDirectory()) {
            const fullPath = path.join(dirPath, item.name);
            
            // 跳过特定目录
            if (this.shouldSkipDirectory(item.name)) {
              continue;
            }
            
            if (await this.isEmptyDirectory(fullPath)) {
              this.emptyDirectories.push({
                path: fullPath,
                relativePath: path.relative(PROJECT_ROOT, fullPath)
              });
            } else {
              await scanDir(fullPath);
            }
          }
        }
      } catch (error) {
        this.log(`扫描目录失败: ${dirPath} - ${error.message}`, 'error');
      }
    };
    
    await scanDir(startPath);
    this.log(`发现 ${this.emptyDirectories.length} 个空目录`, 'info');
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
   * 分析重复配置文件
   */
  async analyzeDuplicateConfigs() {
    this.log('分析重复配置文件...', 'info');
    
    const configPatterns = {
      typescript: ['tsconfig*.json'],
      eslint: ['.eslintrc*'],
      prettier: ['.prettierrc*', '.prettierignore'],
      jest: ['jest.config*'],
      next: ['next.config*'],
      docker: ['Dockerfile*', 'docker-compose*']
    };
    
    for (const [type, patterns] of Object.entries(configPatterns)) {
      const files = [];
      
      for (const pattern of patterns) {
        const matches = await this.findFilesByPattern(pattern);
        files.push(...matches);
      }
      
      if (files.length > 1) {
        this.redundantConfigs.push({
          type,
          files,
          count: files.length
        });
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
   * 分析未使用的导入
   */
  async analyzeUnusedImports() {
    this.log('分析未使用的导入...', 'info');
    
    const tsFiles = await this.findFilesByPattern('*.ts');
    const tsxFiles = await this.findFilesByPattern('*.tsx');
    const jsFiles = await this.findFilesByPattern('*.js');
    const jsxFiles = await this.findFilesByPattern('*.jsx');
    
    const allFiles = [...tsFiles, ...tsxFiles, ...jsFiles, ...jsxFiles];
    
    for (const file of allFiles) {
      try {
        const content = await fs.promises.readFile(file.path, 'utf8');
        const imports = this.extractImports(content);
        const unusedInFile = this.findUnusedImports(content, imports);
        
        if (unusedInFile.length > 0) {
          this.unusedImports.push({
            file: file.relativePath,
            unused: unusedInFile
          });
        }
      } catch (error) {
        this.log(`分析文件失败: ${file.relativePath}`, 'error');
      }
    }
  }

  /**
   * 提取文件中的导入语句
   * @param {string} content - 文件内容
   * @returns {Array} 导入列表
   */
  extractImports(content) {
    const importRegex = /import\s+(?:{[^}]*}|[^\s,]+|\*\s+as\s+\w+)\s+from\s+['"][^'"]+['"]/g;
    const imports = [];
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[0]);
    }
    
    return imports;
  }

  /**
   * 查找未使用的导入
   * @param {string} content - 文件内容
   * @param {Array} imports - 导入列表
   * @returns {Array} 未使用的导入
   */
  findUnusedImports(content, imports) {
    const unused = [];
    
    for (const importStatement of imports) {
      // 简单的未使用检测（可以进一步优化）
      const importMatch = importStatement.match(/import\s+(?:{([^}]*)}|([^\s,]+))/);
      if (importMatch) {
        const importedItems = importMatch[1] ? 
          importMatch[1].split(',').map(item => item.trim()) : 
          [importMatch[2]];
        
        for (const item of importedItems) {
          const cleanItem = item.replace(/\s+as\s+\w+/, '').trim();
          if (cleanItem && !content.includes(cleanItem)) {
            unused.push(importStatement);
            break;
          }
        }
      }
    }
    
    return unused;
  }

  /**
   * 生成分析报告
   */
  generateReport() {
    this.analysisReport.summary = {
      emptyDirectories: this.emptyDirectories.length,
      redundantConfigs: this.redundantConfigs.length,
      filesWithUnusedImports: this.unusedImports.length,
      totalIssues: this.emptyDirectories.length + this.redundantConfigs.length + this.unusedImports.length
    };
    
    this.analysisReport.details = {
      emptyDirectories: this.emptyDirectories,
      redundantConfigs: this.redundantConfigs,
      unusedImports: this.unusedImports
    };
    
    const reportPath = path.join(PROJECT_ROOT, 'code-analysis-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.analysisReport, null, 2));
    
    this.log(`\n=== 代码分析报告 ===`, 'info');
    this.log(`空目录: ${this.emptyDirectories.length}`, 'warning');
    this.log(`重复配置: ${this.redundantConfigs.length}`, 'warning');
    this.log(`未使用导入: ${this.unusedImports.length}`, 'warning');
    this.log(`总问题数: ${this.analysisReport.summary.totalIssues}`, 'info');
    this.log(`\n详细报告已保存到: ${reportPath}`, 'success');
    
    // 显示详细信息
    if (this.emptyDirectories.length > 0) {
      this.log('\n空目录列表:', 'warning');
      this.emptyDirectories.forEach(dir => {
        this.log(`  - ${dir.relativePath}`, 'warning');
      });
    }
    
    if (this.redundantConfigs.length > 0) {
      this.log('\n重复配置文件:', 'warning');
      this.redundantConfigs.forEach(config => {
        this.log(`  ${config.type} (${config.count} 个文件):`, 'warning');
        config.files.forEach(file => {
          this.log(`    - ${file.relativePath}`, 'warning');
        });
      });
    }
  }

  /**
   * 执行完整分析
   */
  async run() {
    this.log('开始全面代码分析...', 'info');
    
    try {
      await this.scanEmptyDirectories();
      await this.analyzeDuplicateConfigs();
      await this.analyzeUnusedImports();
      
      this.generateReport();
      
      this.log('\n代码分析完成!', 'success');
    } catch (error) {
      this.log(`分析过程中出现错误: ${error.message}`, 'error');
      throw error;
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const analyzer = new CodeAnalyzer();
  analyzer.run().catch(error => {
    console.error('分析失败:', error);
    process.exit(1);
  });
}

module.exports = CodeAnalyzer;