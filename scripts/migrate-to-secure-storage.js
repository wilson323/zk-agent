/**
 * localStorage到安全存储的迁移脚本
 * 自动检测和替换localStorage的直接使用
 */

const fs = require('fs');
const path = require('path');

class LocalStorageMigrator {
  constructor(options = {}) {
    this.options = {
      projectRoot: options.projectRoot || process.cwd(),
      dryRun: options.dryRun || false,
      backupDir: options.backupDir || path.join(process.cwd(), 'backups', 'localStorage-migration'),
      excludeDirs: options.excludeDirs || ['node_modules', '.git', 'dist', 'build', 'archive'],
      includeExtensions: options.includeExtensions || ['.ts', '.tsx', '.js', '.jsx'],
      ...options
    };
    
    this.stats = {
      filesScanned: 0,
      filesModified: 0,
      replacements: 0,
      errors: 0
    };
    
    this.replacementPatterns = [
      {
        pattern: /localStorage\.setItem\s*\(\s*(['"`])([^'"`)]+)\1\s*,\s*([^)]+)\)/g,
        replacement: 'secureStorage.setItem($1$2$1, $3)',
        description: 'localStorage.setItem() -> secureStorage.setItem()'
      },
      {
        pattern: /localStorage\.getItem\s*\(\s*(['"`])([^'"`)]+)\1\s*\)/g,
        replacement: 'secureStorage.getItem($1$2$1)',
        description: 'localStorage.getItem() -> secureStorage.getItem()'
      },
      {
        pattern: /localStorage\.removeItem\s*\(\s*(['"`])([^'"`)]+)\1\s*\)/g,
        replacement: 'secureStorage.removeItem($1$2$1)',
        description: 'localStorage.removeItem() -> secureStorage.removeItem()'
      },
      {
        pattern: /localStorage\.clear\s*\(\s*\)/g,
        replacement: 'secureStorage.clear()',
        description: 'secureStorage.clear() -> secureStorage.clear()'
      },
      {
        pattern: /localStorage\.key\s*\(\s*([^)]+)\s*\)/g,
        replacement: 'secureStorage.getAllKeys()[$1]',
        description: 'localStorage.key() -> secureStorage.getAllKeys()[]'
      },
      {
        pattern: /localStorage\.length/g,
        replacement: 'secureStorage.getAllKeys().length',
        description: 'secureStorage.getAllKeys().length -> secureStorage.getAllKeys().length'
      }
    ];
  }

  /**
   * 记录日志
   */
  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[${timestamp}]`;
    
    switch (type) {
      case 'success':
        console.log(`${prefix} ✅ ${message}`);
        break;
      case 'warning':
        console.log(`${prefix} ⚠️  ${message}`);
        break;
      case 'error':
        console.log(`${prefix} ❌ ${message}`);
        break;
      default:
        console.log(`${prefix} ${message}`);
        break;
    }
  }

  /**
   * 检查文件是否应该被处理
   */
  shouldProcessFile(filePath) {
    // 检查文件扩展名
    const ext = path.extname(filePath);
    if (!this.options.includeExtensions.includes(ext)) {
      return false;
    }
    
    // 检查是否在排除目录中
    const relativePath = path.relative(this.options.projectRoot, filePath);
    for (const excludeDir of this.options.excludeDirs) {
      if (relativePath.startsWith(excludeDir)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 递归扫描目录
   */
  scanDirectory(dir) {
    const files = [];
    
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          files.push(...this.scanDirectory(fullPath));
        } else if (stat.isFile() && this.shouldProcessFile(fullPath)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      this.log(`扫描目录失败: ${dir} - ${error.message}`, 'error');
      this.stats.errors++;
    }
    
    return files;
  }

  /**
   * 创建备份
   */
  createBackup(filePath, content) {
    try {
      const relativePath = path.relative(this.options.projectRoot, filePath);
      const backupPath = path.join(this.options.backupDir, relativePath);
      const backupDir = path.dirname(backupPath);
      
      // 确保备份目录存在
      fs.mkdirSync(backupDir, { recursive: true });
      
      // 写入备份文件
      fs.writeFileSync(backupPath, content, 'utf8');
      
      return backupPath;
    } catch (error) {
      this.log(`创建备份失败: ${filePath} - ${error.message}`, 'error');
      return null;
    }
  }

  /**
   * 检查文件是否需要导入secureStorage
   */
  needsSecureStorageImport(content) {
    // 检查是否已经导入
    if (content.includes('secureStorage') || content.includes('secure-storage')) {
      return false;
    }
    
    // 检查是否使用了localStorage
    return /localStorage\.(setItem|getItem|removeItem|clear|key|length)/.test(content);
  }

  /**
   * 添加secureStorage导入
   */
  addSecureStorageImport(content, filePath) {
    const ext = path.extname(filePath);
    const isTypeScript = ext === '.ts' || ext === '.tsx';
    
    // 构建导入语句
    const importStatement = `import { secureStorage } from '@/lib/utils/secure-storage';\n`;
    
    // 查找插入位置（在其他导入之后）
    const lines = content.split('\n');
    let insertIndex = 0;
    
    // 找到最后一个import语句的位置
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ') || lines[i].trim().startsWith('const ') && lines[i].includes('require(')) {
        insertIndex = i + 1;
      } else if (lines[i].trim() === '' && insertIndex > 0) {
        // 空行，可能是导入结束
        break;
      } else if (lines[i].trim() !== '' && !lines[i].trim().startsWith('//') && !lines[i].trim().startsWith('/*')) {
        // 非空行且非注释，导入结束
        break;
      }
    }
    
    // 插入导入语句
    lines.splice(insertIndex, 0, importStatement);
    
    return lines.join('\n');
  }

  /**
   * 处理单个文件
   */
  processFile(filePath) {
    try {
      this.stats.filesScanned++;
      
      const content = fs.readFileSync(filePath, 'utf8');
      let modifiedContent = content;
      let fileReplacements = 0;
      
      // 应用替换模式
      for (const pattern of this.replacementPatterns) {
        const matches = modifiedContent.match(pattern.pattern);
        if (matches) {
          modifiedContent = modifiedContent.replace(pattern.pattern, pattern.replacement);
          fileReplacements += matches.length;
          this.log(`  ${pattern.description}: ${matches.length} 处替换`);
        }
      }
      
      // 如果有替换，添加导入语句
      if (fileReplacements > 0) {
        if (this.needsSecureStorageImport(content)) {
          modifiedContent = this.addSecureStorageImport(modifiedContent, filePath);
        }
        
        // 创建备份
        if (!this.options.dryRun) {
          this.createBackup(filePath, content);
        }
        
        // 写入修改后的文件
        if (!this.options.dryRun) {
          fs.writeFileSync(filePath, modifiedContent, 'utf8');
        }
        
        this.stats.filesModified++;
        this.stats.replacements += fileReplacements;
        
        this.log(`✅ 已处理: ${path.relative(this.options.projectRoot, filePath)} (${fileReplacements} 处替换)`, 'success');
      }
      
    } catch (error) {
      this.log(`处理文件失败: ${filePath} - ${error.message}`, 'error');
      this.stats.errors++;
    }
  }

  /**
   * 生成迁移报告
   */
  generateReport() {
    const reportPath = path.join(this.options.projectRoot, 'localStorage-migration-report.md');
    
    const report = `# localStorage 迁移报告

生成时间: ${new Date().toLocaleString()}

## 迁移统计

- 扫描文件数: ${this.stats.filesScanned}
- 修改文件数: ${this.stats.filesModified}
- 总替换数: ${this.stats.replacements}
- 错误数: ${this.stats.errors}

## 替换模式

${this.replacementPatterns.map(p => `- ${p.description}`).join('\n')}

## 使用说明

迁移完成后，请确保：

1. 安装必要的依赖：\`npm install crypto-js\`
2. 检查导入路径是否正确
3. 测试应用功能是否正常
4. 如有问题，可从备份目录恢复文件

## 备份位置

备份文件保存在: \`${this.options.backupDir}\`

## 安全存储优势

- 🔐 数据加密存储
- ⏰ 支持过期时间
- 🛡️ 错误处理机制
- 🧹 自动清理过期数据
- 📊 存储使用统计
`;
    
    try {
      fs.writeFileSync(reportPath, report, 'utf8');
      this.log(`📄 迁移报告已生成: ${reportPath}`, 'success');
    } catch (error) {
      this.log(`生成报告失败: ${error.message}`, 'error');
    }
  }

  /**
   * 执行迁移
   */
  async migrate() {
    this.log('🚀 开始 localStorage 迁移...');
    this.log(`📁 项目根目录: ${this.options.projectRoot}`);
    this.log(`🔄 模式: ${this.options.dryRun ? '试运行' : '实际执行'}`);
    
    const startTime = Date.now();
    
    // 扫描文件
    this.log('🔍 扫描项目文件...');
    const files = this.scanDirectory(this.options.projectRoot);
    this.log(`📄 发现 ${files.length} 个文件待处理`);
    
    // 处理文件
    for (const file of files) {
      this.processFile(file);
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // 显示统计信息
    this.log('\n📊 迁移完成!');
    this.log(`⏱️  耗时: ${duration}秒`);
    this.log(`📁 扫描文件: ${this.stats.filesScanned}`);
    this.log(`✏️  修改文件: ${this.stats.filesModified}`);
    this.log(`🔄 总替换数: ${this.stats.replacements}`);
    
    if (this.stats.errors > 0) {
      this.log(`❌ 错误数: ${this.stats.errors}`, 'error');
    }
    
    // 生成报告
    this.generateReport();
    
    if (this.options.dryRun) {
      this.log('\n💡 这是试运行模式，没有实际修改文件');
      this.log('💡 要执行实际迁移，请移除 --dry-run 参数');
    } else {
      this.log('\n✅ 迁移完成！请测试应用功能');
      this.log('💡 如有问题，可从备份目录恢复文件');
    }
  }
}

// 命令行参数解析
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--project-root':
        options.projectRoot = args[++i];
        break;
      case '--backup-dir':
        options.backupDir = args[++i];
        break;
      case '--help':
      case '-h':
        console.log(`
localStorage 迁移工具

用法:
  node migrate-to-secure-storage.js [选项]

选项:
  --dry-run              试运行模式，不实际修改文件
  --project-root <路径>   项目根目录 (默认: 当前目录)
  --backup-dir <路径>     备份目录 (默认: ./backups/localStorage-migration)
  --help, -h             显示帮助信息

示例:
  node migrate-to-secure-storage.js --dry-run
  node migrate-to-secure-storage.js --project-root ./src
`);
        process.exit(0);
        break;
    }
  }
  
  return options;
}

// 主函数
async function main() {
  try {
    const options = parseArgs();
    const migrator = new LocalStorageMigrator(options);
    await migrator.migrate();
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { LocalStorageMigrator };