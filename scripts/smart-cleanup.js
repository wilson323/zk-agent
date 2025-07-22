#!/usr/bin/env node
/**
 * 智能清理脚本
 * 基于死代码分析报告智能清理未使用的导入和代码
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEAD_CODE_REPORT_PATH = path.join(PROJECT_ROOT, 'dead-code-analysis-report.json');

/**
 * 智能清理器类
 */
class SmartCleaner {
  constructor() {
    this.cleanupActions = [];
    this.skippedActions = [];
    this.errors = [];
    
    // 不应该自动删除的导入模式
    this.preservePatterns = [
      // React相关
      /^React$/,
      /^Component$/,
      /^useState$/,
      /^useEffect$/,
      /^useCallback$/,
      /^useMemo$/,
      /^useRef$/,
      /^useContext$/,
      
      // Next.js相关
      /^NextRequest$/,
      /^NextResponse$/,
      /^Image$/,
      /^Link$/,
      /^Head$/,
      
      // 样式相关
      /\.css$/,
      /\.scss$/,
      /\.module\./,
      
      // 类型定义
      /^.*Type$/,
      /^.*Interface$/,
      /^.*Props$/,
      
      // 副作用导入
      /^\.\/.*\.css$/,
      /^\.\/.*\.scss$/,
      /^@\/styles/,
      
      // 配置和常量
      /^.*_CONFIG$/,
      /^.*_CONSTANTS$/,
      /^.*Config$/,
      /^.*Constants$/
    ];
    
    // 不应该自动删除的文件模式
    this.preserveFiles = [
      /\.d\.ts$/,
      /\.config\./,
      /\.test\./,
      /\.spec\./,
      /index\./,
      /layout\./,
      /page\./,
      /loading\./,
      /error\./,
      /not-found\./
    ];
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
   * 读取死代码分析报告
   * @returns {Object} 分析报告数据
   */
  readDeadCodeReport() {
    try {
      const reportContent = fs.readFileSync(DEAD_CODE_REPORT_PATH, 'utf8');
      return JSON.parse(reportContent);
    } catch (error) {
      this.log(`无法读取死代码分析报告: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 检查导入是否应该保留
   * @param {Object} importInfo - 导入信息
   * @returns {boolean} 是否应该保留
   */
  shouldPreserveImport(importInfo) {
    // 检查导入名称
    for (const pattern of this.preservePatterns) {
      if (pattern.test(importInfo.import) || pattern.test(importInfo.module)) {
        return true;
      }
    }
    
    // 检查文件类型
    for (const pattern of this.preserveFiles) {
      if (pattern.test(importInfo.file)) {
        return true;
      }
    }
    
    // 检查是否是副作用导入（没有具体导入项）
    if (!importInfo.import || importInfo.import.trim() === '') {
      return true;
    }
    
    // 检查是否是样式导入
    if (importInfo.module.includes('.css') || 
        importInfo.module.includes('.scss') || 
        importInfo.module.includes('styles')) {
      return true;
    }
    
    return false;
  }

  /**
   * 清理文件中的未使用导入
   * @param {string} filePath - 文件路径
   * @param {Array} unusedImports - 未使用的导入列表
   */
  async cleanupFileImports(filePath, unusedImports) {
    try {
      const fullPath = path.join(PROJECT_ROOT, filePath);
      let content = await fs.promises.readFile(fullPath, 'utf8');
      let modified = false;
      let removedCount = 0;
      
      // 按行号倒序排序，从后往前删除，避免行号变化
      const sortedImports = unusedImports.sort((a, b) => b.line - a.line);
      
      for (const importInfo of sortedImports) {
        if (this.shouldPreserveImport(importInfo)) {
          this.skippedActions.push({
            type: 'skip_import',
            file: filePath,
            line: importInfo.line,
            import: importInfo.import,
            reason: '匹配保留模式'
          });
          continue;
        }
        
        // 尝试移除整行导入
        const lines = content.split('\n');
        const targetLine = importInfo.line - 1; // 转换为0基索引
        
        if (targetLine >= 0 && targetLine < lines.length) {
          const originalLine = lines[targetLine];
          
          // 检查是否是完整的导入行
          if (originalLine.trim().startsWith('import') && 
              originalLine.includes(importInfo.import)) {
            
            // 如果是单个导入，删除整行
            if (originalLine.includes(`import { ${importInfo.import} }`) ||
                originalLine.includes(`import ${importInfo.import} from`)) {
              lines.splice(targetLine, 1);
              modified = true;
              removedCount++;
              
              this.cleanupActions.push({
                type: 'remove_import_line',
                file: filePath,
                line: importInfo.line,
                import: importInfo.import,
                originalLine: originalLine.trim()
              });
            }
            // 如果是多个导入中的一个，只删除该导入
            else if (originalLine.includes(`{ `) && originalLine.includes(` }`)) {
              const newLine = this.removeImportFromLine(originalLine, importInfo.import);
              if (newLine !== originalLine) {
                lines[targetLine] = newLine;
                modified = true;
                removedCount++;
                
                this.cleanupActions.push({
                  type: 'remove_import_item',
                  file: filePath,
                  line: importInfo.line,
                  import: importInfo.import,
                  originalLine: originalLine.trim(),
                  newLine: newLine.trim()
                });
              }
            }
          }
        }
      }
      
      if (modified) {
        // 清理连续的空行
        const cleanedContent = this.cleanupEmptyLines(lines.join('\n'));
        await fs.promises.writeFile(fullPath, cleanedContent, 'utf8');
        this.log(`已清理文件 ${filePath}: 移除 ${removedCount} 个未使用的导入`, 'success');
      }
      
    } catch (error) {
      this.errors.push({
        type: 'file_cleanup_error',
        file: filePath,
        error: error.message
      });
      this.log(`清理文件失败 ${filePath}: ${error.message}`, 'error');
    }
  }

  /**
   * 从导入行中移除特定的导入项
   * @param {string} line - 原始行
   * @param {string} importToRemove - 要移除的导入
   * @returns {string} 修改后的行
   */
  removeImportFromLine(line, importToRemove) {
    // 匹配 import { a, b, c } from 'module' 格式
    const match = line.match(/import\s*{([^}]+)}\s*from\s*['"]([^'"]+)['"]/);    
    if (match) {
      const imports = match[1].split(',').map(imp => imp.trim());
      const filteredImports = imports.filter(imp => {
        const cleanImp = imp.replace(/\s+as\s+\w+/, '').trim();
        return cleanImp !== importToRemove;
      });
      
      if (filteredImports.length === 0) {
        // 如果没有剩余导入，删除整行
        return '';
      } else if (filteredImports.length < imports.length) {
        // 重构导入行
        return line.replace(match[1], filteredImports.join(', '));
      }
    }
    
    return line;
  }

  /**
   * 清理多余的空行
   * @param {string} content - 文件内容
   * @returns {string} 清理后的内容
   */
  cleanupEmptyLines(content) {
    // 将连续的空行替换为单个空行
    return content.replace(/\n\s*\n\s*\n/g, '\n\n');
  }

  /**
   * 生成清理报告
   */
  generateCleanupReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalActions: this.cleanupActions.length,
        skippedActions: this.skippedActions.length,
        errors: this.errors.length,
        filesModified: [...new Set(this.cleanupActions.map(a => a.file))].length
      },
      details: {
        cleanupActions: this.cleanupActions,
        skippedActions: this.skippedActions,
        errors: this.errors
      }
    };
    
    const reportPath = path.join(PROJECT_ROOT, 'smart-cleanup-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.log('\n=== 智能清理报告 ===', 'info');
    this.log(`执行清理: ${report.summary.totalActions}`, 'success');
    this.log(`跳过清理: ${report.summary.skippedActions}`, 'info');
    this.log(`修改文件: ${report.summary.filesModified}`, 'success');
    this.log(`错误数量: ${report.summary.errors}`, report.summary.errors > 0 ? 'warning' : 'success');
    this.log(`\n详细报告已保存到: ${reportPath}`, 'success');
    
    // 显示一些清理示例
    if (this.cleanupActions.length > 0) {
      this.log('\n清理示例 (前5个):', 'info');
      this.cleanupActions.slice(0, 5).forEach(action => {
        this.log(`  ${action.file}:${action.line} - 移除 '${action.import}'`, 'info');
      });
    }
    
    if (this.skippedActions.length > 0) {
      this.log('\n跳过示例 (前5个):', 'warning');
      this.skippedActions.slice(0, 5).forEach(action => {
        this.log(`  ${action.file}:${action.line} - 保留 '${action.import}' (${action.reason})`, 'warning');
      });
    }
  }

  /**
   * 执行智能清理
   */
  async run() {
    this.log('开始智能清理...', 'info');
    
    try {
      // 读取死代码分析报告
      const deadCodeReport = this.readDeadCodeReport();
      
      if (!deadCodeReport.details.unusedImports || deadCodeReport.details.unusedImports.length === 0) {
        this.log('没有发现未使用的导入，无需清理', 'info');
        return;
      }
      
      this.log(`发现 ${deadCodeReport.details.unusedImports.length} 个未使用的导入`, 'info');
      
      // 按文件分组未使用的导入
      const importsByFile = new Map();
      for (const importInfo of deadCodeReport.details.unusedImports) {
        if (!importsByFile.has(importInfo.file)) {
          importsByFile.set(importInfo.file, []);
        }
        importsByFile.get(importInfo.file).push(importInfo);
      }
      
      this.log(`需要处理 ${importsByFile.size} 个文件`, 'info');
      
      // 逐个文件清理
      for (const [filePath, unusedImports] of importsByFile) {
        await this.cleanupFileImports(filePath, unusedImports);
      }
      
      // 生成报告
      this.generateCleanupReport();
      
      this.log('\n智能清理完成!', 'success');
      
    } catch (error) {
      this.log(`清理过程中出现错误: ${error.message}`, 'error');
      throw error;
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const cleaner = new SmartCleaner();
  cleaner.run().catch(error => {
    console.error('智能清理失败:', error);
    process.exit(1);
  });
}

module.exports = SmartCleaner;