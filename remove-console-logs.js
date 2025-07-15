#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 移除或替换console语句的脚本
 * 支持:
 * - 移除console.log语句
 * - 将console.error替换为适当的日志记录
 * - 将console.warn替换为适当的日志记录
 * - 保留必要的调试信息但使用条件编译
 */

class ConsoleLogRemover {
  constructor(options = {}) {
    this.options = {
      dryRun: options.dryRun || false,
      removeConsoleLog: options.removeConsoleLog !== false,
      replaceConsoleError: options.replaceConsoleError !== false,
      replaceConsoleWarn: options.replaceConsoleWarn !== false,
      addLogger: options.addLogger !== false,
      preserveDebugInfo: options.preserveDebugInfo !== false,
      ...options
    };
    
    this.stats = {
      filesProcessed: 0,
      consoleLogsRemoved: 0,
      consoleErrorsReplaced: 0,
      consoleWarnsReplaced: 0,
      loggersAdded: 0
    };
  }

  /**
   * 处理单个文件
   */
  processFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      let modifiedContent = content;
      let hasChanges = false;
      let needsLogger = false;

      // 检查是否已经导入了logger
      const hasLoggerImport = /import.*logger.*from|const.*logger.*=.*require/i.test(content);

      // 移除console.log语句
      if (this.options.removeConsoleLog) {
        const consoleLogPattern = /^\s*console\.log\([^;]*\);?\s*$/gm;
        const matches = content.match(consoleLogPattern);
        if (matches) {
          this.stats.consoleLogsRemoved += matches.length;
          modifiedContent = modifiedContent.replace(consoleLogPattern, '');
          hasChanges = true;
        }
      }

      // 替换console.error
      if (this.options.replaceConsoleError) {
        const consoleErrorPattern = /console\.error\(/g;
        const matches = content.match(consoleErrorPattern);
        if (matches) {
          this.stats.consoleErrorsReplaced += matches.length;
          modifiedContent = modifiedContent.replace(consoleErrorPattern, 'logger.error(');
          hasChanges = true;
          needsLogger = true;
        }
      }

      // 替换console.warn
      if (this.options.replaceConsoleWarn) {
        const consoleWarnPattern = /console\.warn\(/g;
        const matches = content.match(consoleWarnPattern);
        if (matches) {
          this.stats.consoleWarnsReplaced += matches.length;
          modifiedContent = modifiedContent.replace(consoleWarnPattern, 'logger.warn(');
          hasChanges = true;
          needsLogger = true;
        }
      }

      // 添加logger导入（如果需要且不存在）
      if (needsLogger && !hasLoggerImport && this.options.addLogger) {
        const importStatement = "import { logger } from '@/lib/utils/logger';\n";
        
        // 查找最后一个import语句的位置
        const importPattern = /^import.*from.*['"];?$/gm;
        const imports = [...modifiedContent.matchAll(importPattern)];
        
        if (imports.length > 0) {
          const lastImport = imports[imports.length - 1];
          const insertPosition = lastImport.index + lastImport[0].length;
          modifiedContent = modifiedContent.slice(0, insertPosition) + '\n' + importStatement + modifiedContent.slice(insertPosition);
        } else {
          // 如果没有import语句，在文件开头添加
          modifiedContent = importStatement + '\n' + modifiedContent;
        }
        
        this.stats.loggersAdded++;
        hasChanges = true;
      }

      // 清理多余的空行
      if (hasChanges) {
        modifiedContent = modifiedContent.replace(/\n\s*\n\s*\n/g, '\n\n');
      }

      // 写入文件（如果不是dry run且有变化）
      if (hasChanges && !this.options.dryRun) {
        fs.writeFileSync(filePath, modifiedContent, 'utf8');
      }

      if (hasChanges) {
        this.stats.filesProcessed++;
        console.log(`✅ Processed: ${filePath}`);
        
        if (this.options.dryRun) {
          console.log('   Changes that would be made:');
          if (this.options.removeConsoleLog) {
            const removed = (originalContent.match(/^\s*console\.log\([^;]*\);?\s*$/gm) || []).length;
            if (removed > 0) console.log(`   - Remove ${removed} console.log statements`);
          }
          if (this.options.replaceConsoleError) {
            const replaced = (originalContent.match(/console\.error\(/g) || []).length;
            if (replaced > 0) console.log(`   - Replace ${replaced} console.error with logger.error`);
          }
          if (this.options.replaceConsoleWarn) {
            const replaced = (originalContent.match(/console\.warn\(/g) || []).length;
            if (replaced > 0) console.log(`   - Replace ${replaced} console.warn with logger.warn`);
          }
          if (needsLogger && !hasLoggerImport) {
            console.log('   - Add logger import');
          }
        }
      }

      return hasChanges;
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
      return false;
    }
  }

  /**
   * 递归处理目录
   */
  processDirectory(dirPath) {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // 跳过node_modules和.git目录
          if (!['node_modules', '.git', '.next', 'dist', 'build'].includes(entry.name)) {
            this.processDirectory(fullPath);
          }
        } else if (entry.isFile()) {
          // 只处理TypeScript和JavaScript文件
          if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
            this.processFile(fullPath);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error processing directory ${dirPath}:`, error.message);
    }
  }

  /**
   * 生成统计报告
   */
  generateReport() {
    console.log('\n📊 Console Log Removal Report:');
    console.log('================================');
    console.log(`Files processed: ${this.stats.filesProcessed}`);
    console.log(`Console.log statements removed: ${this.stats.consoleLogsRemoved}`);
    console.log(`Console.error statements replaced: ${this.stats.consoleErrorsReplaced}`);
    console.log(`Console.warn statements replaced: ${this.stats.consoleWarnsReplaced}`);
    console.log(`Logger imports added: ${this.stats.loggersAdded}`);
    
    const totalChanges = this.stats.consoleLogsRemoved + 
                        this.stats.consoleErrorsReplaced + 
                        this.stats.consoleWarnsReplaced;
    console.log(`Total console statements processed: ${totalChanges}`);
    
    if (this.options.dryRun) {
      console.log('\n⚠️  This was a dry run. No files were actually modified.');
      console.log('   Run without --dry-run to apply changes.');
    }
  }
}

// 命令行参数解析
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    removeConsoleLog: !args.includes('--keep-console-log'),
    replaceConsoleError: !args.includes('--keep-console-error'),
    replaceConsoleWarn: !args.includes('--keep-console-warn'),
    addLogger: !args.includes('--no-logger'),
    preserveDebugInfo: args.includes('--preserve-debug')
  };
  
  const targetPath = args.find(arg => !arg.startsWith('--')) || './lib';
  
  return { options, targetPath };
}

// 主函数
function main() {
  const { options, targetPath } = parseArgs();
  
  console.log('🧹 Console Log Remover');
  console.log('======================');
  console.log(`Target: ${targetPath}`);
  console.log(`Mode: ${options.dryRun ? 'DRY RUN' : 'APPLY CHANGES'}`);
  console.log('');
  
  if (!fs.existsSync(targetPath)) {
    console.error(`❌ Target path does not exist: ${targetPath}`);
    process.exit(1);
  }
  
  const remover = new ConsoleLogRemover(options);
  
  const stat = fs.statSync(targetPath);
  if (stat.isDirectory()) {
    remover.processDirectory(targetPath);
  } else {
    remover.processFile(targetPath);
  }
  
  remover.generateReport();
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { ConsoleLogRemover };