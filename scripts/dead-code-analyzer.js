#!/usr/bin/env node
/**
 * 死代码分析器
 * 深度分析项目中的未使用代码、导入和变量
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');

/**
 * 死代码分析器类
 */
class DeadCodeAnalyzer {
  constructor() {
    this.sourceFiles = [];
    this.imports = new Map();
    this.exports = new Map();
    this.functions = new Map();
    this.variables = new Map();
    this.unusedImports = [];
    this.unusedExports = [];
    this.unusedFunctions = [];
    this.potentialDeadCode = [];
    
    this.analysisReport = {
      timestamp: new Date().toISOString(),
      summary: {},
      details: {}
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
   * 获取所有源代码文件
   */
  async collectSourceFiles() {
    this.log('收集源代码文件...', 'info');
    
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    
    const scanDir = async (dirPath) => {
      try {
        const items = await fs.promises.readdir(dirPath, { withFileTypes: true });
        
        for (const item of items) {
          const fullPath = path.join(dirPath, item.name);
          
          if (item.isDirectory() && !this.shouldSkipDirectory(item.name)) {
            await scanDir(fullPath);
          } else if (item.isFile()) {
            const ext = path.extname(item.name);
            if (extensions.includes(ext)) {
              this.sourceFiles.push({
                name: item.name,
                path: fullPath,
                relativePath: path.relative(PROJECT_ROOT, fullPath),
                extension: ext
              });
            }
          }
        }
      } catch (error) {
        // 忽略权限错误
      }
    };
    
    await scanDir(PROJECT_ROOT);
    this.log(`发现 ${this.sourceFiles.length} 个源代码文件`, 'info');
  }

  /**
   * 检查是否应该跳过某个目录
   * @param {string} dirName - 目录名
   * @returns {boolean} 是否跳过
   */
  shouldSkipDirectory(dirName) {
    const skipDirs = [
      'node_modules', '.git', '.next', 'dist', 'build', 'coverage',
      '.vscode', '.idea', 'logs', 'uploads', '.vercel', 'public'
    ];
    return skipDirs.includes(dirName) || dirName.startsWith('.');
  }

  /**
   * 分析单个文件
   * @param {Object} file - 文件信息
   */
  async analyzeFile(file) {
    try {
      const content = await fs.promises.readFile(file.path, 'utf8');
      
      // 分析导入
      this.analyzeImports(file, content);
      
      // 分析导出
      this.analyzeExports(file, content);
      
      // 分析函数
      this.analyzeFunctions(file, content);
      
      // 分析变量
      this.analyzeVariables(file, content);
      
    } catch (error) {
      this.log(`分析文件失败: ${file.relativePath} - ${error.message}`, 'error');
    }
  }

  /**
   * 分析导入语句
   * @param {Object} file - 文件信息
   * @param {string} content - 文件内容
   */
  analyzeImports(file, content) {
    // 匹配各种导入模式
    const importPatterns = [
      // import { a, b } from 'module'
      /import\s*{([^}]+)}\s*from\s*['"]([^'"]+)['"]/g,
      // import a from 'module'
      /import\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s+from\s*['"]([^'"]+)['"]/g,
      // import * as a from 'module'
      /import\s*\*\s*as\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s+from\s*['"]([^'"]+)['"]/g,
      // import 'module'
      /import\s*['"]([^'"]+)['"]/g
    ];
    
    for (const pattern of importPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const importInfo = {
          file: file.relativePath,
          line: this.getLineNumber(content, match.index),
          fullMatch: match[0],
          used: false
        };
        
        if (match[1] && match[2]) {
          // 有具体导入项
          const imports = match[1].split(',').map(imp => imp.trim());
          const module = match[2];
          
          for (const imp of imports) {
            const cleanImport = imp.replace(/\s+as\s+\w+/, '').trim();
            if (cleanImport) {
              importInfo.import = cleanImport;
              importInfo.module = module;
              
              // 检查是否在文件中使用
              const usageRegex = new RegExp(`\\b${cleanImport}\\b`, 'g');
              const matches = content.match(usageRegex);
              importInfo.used = matches && matches.length > 1; // 大于1因为导入语句本身也会匹配
              
              if (!this.imports.has(file.relativePath)) {
                this.imports.set(file.relativePath, []);
              }
              this.imports.get(file.relativePath).push(importInfo);
            }
          }
        } else if (match[1]) {
          // 默认导入或命名空间导入
          const importName = match[1];
          const module = match[2] || match[1];
          
          importInfo.import = importName;
          importInfo.module = module;
          
          if (module !== importName) {
            const usageRegex = new RegExp(`\\b${importName}\\b`, 'g');
            const matches = content.match(usageRegex);
            importInfo.used = matches && matches.length > 1;
          } else {
            importInfo.used = true; // 副作用导入
          }
          
          if (!this.imports.has(file.relativePath)) {
            this.imports.set(file.relativePath, []);
          }
          this.imports.get(file.relativePath).push(importInfo);
        }
      }
    }
  }

  /**
   * 分析导出语句
   * @param {Object} file - 文件信息
   * @param {string} content - 文件内容
   */
  analyzeExports(file, content) {
    const exportPatterns = [
      // export { a, b }
      /export\s*{([^}]+)}/g,
      // export function name
      /export\s+(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
      // export const name
      /export\s+const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
      // export default
      /export\s+default\s+/g
    ];
    
    for (const pattern of exportPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const exportInfo = {
          file: file.relativePath,
          line: this.getLineNumber(content, match.index),
          fullMatch: match[0],
          used: false // 需要跨文件分析
        };
        
        if (match[1]) {
          if (match[1].includes(',')) {
            // 多个导出
            const exports = match[1].split(',').map(exp => exp.trim());
            for (const exp of exports) {
              exportInfo.export = exp;
              if (!this.exports.has(file.relativePath)) {
                this.exports.set(file.relativePath, []);
              }
              this.exports.get(file.relativePath).push({...exportInfo});
            }
          } else {
            exportInfo.export = match[1];
            if (!this.exports.has(file.relativePath)) {
              this.exports.set(file.relativePath, []);
            }
            this.exports.get(file.relativePath).push(exportInfo);
          }
        } else {
          exportInfo.export = 'default';
          if (!this.exports.has(file.relativePath)) {
            this.exports.set(file.relativePath, []);
          }
          this.exports.get(file.relativePath).push(exportInfo);
        }
      }
    }
  }

  /**
   * 分析函数定义
   * @param {Object} file - 文件信息
   * @param {string} content - 文件内容
   */
  analyzeFunctions(file, content) {
    const functionPatterns = [
      // function name()
      /(?:^|\n)\s*(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
      // const name = function
      /const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?function/g,
      // const name = () =>
      /const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g
    ];
    
    for (const pattern of functionPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const funcName = match[1];
        const funcInfo = {
          file: file.relativePath,
          line: this.getLineNumber(content, match.index),
          name: funcName,
          used: false
        };
        
        // 检查函数是否被使用（简单检查）
        const usageRegex = new RegExp(`\\b${funcName}\\b`, 'g');
        const matches = content.match(usageRegex);
        funcInfo.used = matches && matches.length > 1;
        
        if (!this.functions.has(file.relativePath)) {
          this.functions.set(file.relativePath, []);
        }
        this.functions.get(file.relativePath).push(funcInfo);
      }
    }
  }

  /**
   * 分析变量定义
   * @param {Object} file - 文件信息
   * @param {string} content - 文件内容
   */
  analyzeVariables(file, content) {
    const variablePatterns = [
      // const name =
      /const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g,
      // let name =
      /let\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g,
      // var name =
      /var\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g
    ];
    
    for (const pattern of variablePatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const varName = match[1];
        
        // 跳过一些常见的变量名
        if (['React', 'Component', 'useState', 'useEffect'].includes(varName)) {
          continue;
        }
        
        const varInfo = {
          file: file.relativePath,
          line: this.getLineNumber(content, match.index),
          name: varName,
          used: false
        };
        
        // 检查变量是否被使用
        const usageRegex = new RegExp(`\\b${varName}\\b`, 'g');
        const matches = content.match(usageRegex);
        varInfo.used = matches && matches.length > 1;
        
        if (!this.variables.has(file.relativePath)) {
          this.variables.set(file.relativePath, []);
        }
        this.variables.get(file.relativePath).push(varInfo);
      }
    }
  }

  /**
   * 获取行号
   * @param {string} content - 文件内容
   * @param {number} index - 字符索引
   * @returns {number} 行号
   */
  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * 识别未使用的代码
   */
  identifyUnusedCode() {
    this.log('识别未使用的代码...', 'info');
    
    // 收集未使用的导入
    for (const [file, imports] of this.imports) {
      for (const imp of imports) {
        if (!imp.used && imp.import) {
          this.unusedImports.push({
            file,
            line: imp.line,
            import: imp.import,
            module: imp.module,
            fullMatch: imp.fullMatch
          });
        }
      }
    }
    
    // 收集未使用的函数
    for (const [file, functions] of this.functions) {
      for (const func of functions) {
        if (!func.used) {
          this.unusedFunctions.push({
            file,
            line: func.line,
            name: func.name
          });
        }
      }
    }
    
    this.log(`发现 ${this.unusedImports.length} 个未使用的导入`, 'warning');
    this.log(`发现 ${this.unusedFunctions.length} 个可能未使用的函数`, 'warning');
  }

  /**
   * 生成分析报告
   */
  generateReport() {
    this.analysisReport.summary = {
      totalFiles: this.sourceFiles.length,
      unusedImports: this.unusedImports.length,
      unusedFunctions: this.unusedFunctions.length,
      totalIssues: this.unusedImports.length + this.unusedFunctions.length
    };
    
    this.analysisReport.details = {
      unusedImports: this.unusedImports,
      unusedFunctions: this.unusedFunctions
    };
    
    const reportPath = path.join(PROJECT_ROOT, 'dead-code-analysis-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.analysisReport, null, 2));
    
    this.log('\n=== 死代码分析报告 ===', 'info');
    this.log(`分析文件: ${this.analysisReport.summary.totalFiles}`, 'info');
    this.log(`未使用导入: ${this.analysisReport.summary.unusedImports}`, 'warning');
    this.log(`未使用函数: ${this.analysisReport.summary.unusedFunctions}`, 'warning');
    this.log(`总问题数: ${this.analysisReport.summary.totalIssues}`, 'info');
    this.log(`\n详细报告已保存到: ${reportPath}`, 'success');
    
    // 显示前10个未使用的导入
    if (this.unusedImports.length > 0) {
      this.log('\n未使用的导入 (前10个):', 'warning');
      this.unusedImports.slice(0, 10).forEach(imp => {
        this.log(`  ${imp.file}:${imp.line} - ${imp.import} from '${imp.module}'`, 'warning');
      });
    }
    
    // 显示前10个未使用的函数
    if (this.unusedFunctions.length > 0) {
      this.log('\n可能未使用的函数 (前10个):', 'warning');
      this.unusedFunctions.slice(0, 10).forEach(func => {
        this.log(`  ${func.file}:${func.line} - ${func.name}()`, 'warning');
      });
    }
  }

  /**
   * 执行分析
   */
  async run() {
    this.log('开始死代码分析...', 'info');
    
    try {
      await this.collectSourceFiles();
      
      this.log('分析源代码文件...', 'info');
      for (const file of this.sourceFiles) {
        await this.analyzeFile(file);
      }
      
      this.identifyUnusedCode();
      this.generateReport();
      
      this.log('\n死代码分析完成!', 'success');
      
    } catch (error) {
      this.log(`分析过程中出现错误: ${error.message}`, 'error');
      throw error;
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const analyzer = new DeadCodeAnalyzer();
  analyzer.run().catch(error => {
    console.error('分析失败:', error);
    process.exit(1);
  });
}

module.exports = DeadCodeAnalyzer;