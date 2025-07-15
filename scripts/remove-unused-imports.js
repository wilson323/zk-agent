#!/usr/bin/env node
/**
 * 自动检测和移除未使用的导入
 * 使用 TypeScript 编译器 API 进行精确分析
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

class UnusedImportDetector {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.tsConfigPath = path.join(projectRoot, 'tsconfig.json');
    this.results = [];
  }

  /**
   * 分析单个文件的未使用导入
   */
  analyzeFile(filePath) {
    try {
      const sourceCode = fs.readFileSync(filePath, 'utf8');
      const sourceFile = ts.createSourceFile(
        filePath,
        sourceCode,
        ts.ScriptTarget.Latest,
        true
      );

      const imports = this.extractImports(sourceFile);
      const usedIdentifiers = this.extractUsedIdentifiers(sourceFile);
      const unusedImports = this.findUnusedImports(imports, usedIdentifiers);

      if (unusedImports.length > 0) {
        this.results.push({
          file: filePath,
          unusedImports,
          totalImports: imports.length
        });
      }

      return unusedImports;
    } catch (error) {
      console.error(`Error analyzing ${filePath}:`, error.message);
      return [];
    }
  }

  /**
   * 提取文件中的所有导入
   */
  extractImports(sourceFile) {
    const imports = [];

    function visit(node) {
      if (ts.isImportDeclaration(node)) {
        const importClause = node.importClause;
        if (importClause) {
          // Default import
          if (importClause.name) {
            imports.push({
              name: importClause.name.text,
              type: 'default',
              line: ts.getLineAndCharacterOfPosition(sourceFile, node.getStart()).line + 1,
              moduleSpecifier: node.moduleSpecifier.text
            });
          }

          // Named imports
          if (importClause.namedBindings) {
            if (ts.isNamedImports(importClause.namedBindings)) {
              importClause.namedBindings.elements.forEach(element => {
                imports.push({
                  name: element.name.text,
                  type: 'named',
                  line: ts.getLineAndCharacterOfPosition(sourceFile, node.getStart()).line + 1,
                  moduleSpecifier: node.moduleSpecifier.text
                });
              });
            }
            // Namespace import
            else if (ts.isNamespaceImport(importClause.namedBindings)) {
              imports.push({
                name: importClause.namedBindings.name.text,
                type: 'namespace',
                line: ts.getLineAndCharacterOfPosition(sourceFile, node.getStart()).line + 1,
                moduleSpecifier: node.moduleSpecifier.text
              });
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return imports;
  }

  /**
   * 提取文件中使用的标识符
   */
  extractUsedIdentifiers(sourceFile) {
    const usedIdentifiers = new Set();

    function visit(node) {
      // 跳过导入声明
      if (ts.isImportDeclaration(node)) {
        return;
      }

      if (ts.isIdentifier(node)) {
        usedIdentifiers.add(node.text);
      }

      // 处理类型引用
      if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
        usedIdentifiers.add(node.typeName.text);
      }

      // 处理属性访问
      if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression)) {
        usedIdentifiers.add(node.expression.text);
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return usedIdentifiers;
  }

  /**
   * 找出未使用的导入
   */
  findUnusedImports(imports, usedIdentifiers) {
    return imports.filter(imp => {
      // 特殊情况：React 在 JSX 中隐式使用
      if (imp.name === 'React' && imp.type === 'default') {
        return false;
      }

      // 特殊情况：类型导入可能在注释中使用
      if (imp.moduleSpecifier.includes('/types/') || imp.moduleSpecifier.includes('@types/')) {
        return false;
      }

      return !usedIdentifiers.has(imp.name);
    });
  }

  /**
   * 扫描目录中的所有 TypeScript 文件
   */
  scanDirectory(dirPath, extensions = ['.ts', '.tsx']) {
    const files = [];

    function scanRecursive(currentPath) {
      const items = fs.readdirSync(currentPath);

      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          // 跳过 node_modules 和其他不需要的目录
          if (!['node_modules', '.git', '.next', 'dist', 'build'].includes(item)) {
            scanRecursive(fullPath);
          }
        } else if (stat.isFile()) {
          const ext = path.extname(fullPath);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    }

    scanRecursive(dirPath);
    return files;
  }

  /**
   * 生成修复建议
   */
  generateFixSuggestions() {
    const suggestions = [];

    for (const result of this.results) {
      const { file, unusedImports } = result;
      const relativePath = path.relative(this.projectRoot, file);

      suggestions.push({
        file: relativePath,
        action: 'remove-unused-imports',
        imports: unusedImports.map(imp => ({
          name: imp.name,
          line: imp.line,
          type: imp.type,
          module: imp.moduleSpecifier
        }))
      });
    }

    return suggestions;
  }

  /**
   * 自动修复未使用的导入
   */
  autoFix(filePath, dryRun = true) {
    try {
      const sourceCode = fs.readFileSync(filePath, 'utf8');
      const lines = sourceCode.split('\n');
      const unusedImports = this.analyzeFile(filePath);

      if (unusedImports.length === 0) {
        return { fixed: false, message: 'No unused imports found' };
      }

      // 按行号倒序排列，避免删除时行号变化
      const sortedImports = unusedImports.sort((a, b) => b.line - a.line);
      let fixedLines = [...lines];

      for (const imp of sortedImports) {
        const lineIndex = imp.line - 1;
        const line = fixedLines[lineIndex];

        // 简单的导入移除逻辑
        if (line && line.trim().startsWith('import')) {
          // 如果是整行导入，直接删除
          if (line.includes(`import ${imp.name}`) || line.includes(`{ ${imp.name} }`)) {
            fixedLines.splice(lineIndex, 1);
          }
        }
      }

      const fixedCode = fixedLines.join('\n');

      if (!dryRun) {
        fs.writeFileSync(filePath, fixedCode, 'utf8');
      }

      return {
        fixed: true,
        removedImports: unusedImports.length,
        preview: dryRun ? fixedCode : null
      };
    } catch (error) {
      return {
        fixed: false,
        error: error.message
      };
    }
  }

  /**
   * 生成报告
   */
  generateReport() {
    const totalFiles = this.results.length;
    const totalUnusedImports = this.results.reduce((sum, result) => sum + result.unusedImports.length, 0);

    const report = {
      summary: {
        totalFiles,
        totalUnusedImports,
        averageUnusedPerFile: totalFiles > 0 ? (totalUnusedImports / totalFiles).toFixed(2) : 0
      },
      details: this.results.map(result => ({
        file: path.relative(this.projectRoot, result.file),
        unusedCount: result.unusedImports.length,
        totalImports: result.totalImports,
        unusedImports: result.unusedImports
      }))
    };

    return report;
  }
}

// CLI 接口
if (require.main === module) {
  const projectRoot = process.argv[2] || process.cwd();
  const targetDir = process.argv[3] || path.join(projectRoot, 'lib');
  const dryRun = process.argv.includes('--dry-run');
  const autoFix = process.argv.includes('--fix');

  console.log('🔍 Analyzing unused imports...');
  console.log(`Project root: ${projectRoot}`);
  console.log(`Target directory: ${targetDir}`);
  console.log(`Mode: ${dryRun ? 'dry-run' : autoFix ? 'auto-fix' : 'analysis-only'}`);

  const detector = new UnusedImportDetector(projectRoot);
  const files = detector.scanDirectory(targetDir);

  console.log(`\n📁 Found ${files.length} TypeScript files`);

  // 分析所有文件
  for (const file of files) {
    detector.analyzeFile(file);
  }

  const report = detector.generateReport();

  console.log('\n📊 Analysis Results:');
  console.log(`- Files with unused imports: ${report.summary.totalFiles}`);
  console.log(`- Total unused imports: ${report.summary.totalUnusedImports}`);
  console.log(`- Average unused per file: ${report.summary.averageUnusedPerFile}`);

  if (report.details.length > 0) {
    console.log('\n📋 Detailed Results:');
    for (const detail of report.details) {
      console.log(`\n📄 ${detail.file}`);
      console.log(`   Unused: ${detail.unusedCount}/${detail.totalImports} imports`);
      for (const imp of detail.unusedImports) {
        console.log(`   - Line ${imp.line}: ${imp.name} (${imp.type}) from '${imp.moduleSpecifier}'`);
      }
    }
  }

  // 自动修复
  if (autoFix && report.details.length > 0) {
    console.log('\n🔧 Auto-fixing unused imports...');
    for (const detail of report.details) {
      const fullPath = path.join(projectRoot, detail.file);
      const result = detector.autoFix(fullPath, dryRun);
      
      if (result.fixed) {
        console.log(`✅ Fixed ${detail.file}: removed ${result.removedImports} imports`);
      } else {
        console.log(`❌ Failed to fix ${detail.file}: ${result.error || result.message}`);
      }
    }
  }

  // 生成修复建议
  const suggestions = detector.generateFixSuggestions();
  if (suggestions.length > 0) {
    console.log('\n💡 Fix Suggestions:');
    console.log('Run with --fix flag to automatically remove unused imports');
    console.log('Run with --dry-run --fix to preview changes without applying them');
  }
}

module.exports = { UnusedImportDetector };