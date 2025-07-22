#!/usr/bin/env node

/**
 * 项目结构优化器
 * 统一规范项目目录结构，确保路径一致性和最佳实践
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ProjectStructureOptimizer {
  constructor() {
    this.projectRoot = process.cwd();
    this.packageJson = this.loadPackageJson();
    this.results = {
      timestamp: new Date().toISOString(),
      optimizations: [],
      created: [],
      moved: [],
      updated: [],
      issues: [],
      summary: {
        totalActions: 0,
        directoriesCreated: 0,
        filesMoved: 0,
        configsUpdated: 0,
        issuesFound: 0
      }
    };
    
    // 标准目录结构定义
    this.standardStructure = {
      // 源代码目录
      'src/': {
        description: '源代码目录',
        subdirs: {
          'components/': '可重用组件',
          'pages/': '页面组件',
          'hooks/': '自定义Hooks',
          'utils/': '工具函数',
          'types/': 'TypeScript类型定义',
          'constants/': '常量定义',
          'services/': '服务层代码',
          'store/': '状态管理',
          'styles/': '样式文件',
          'assets/': '静态资源'
        }
      },
      
      // 测试目录
      'tests/': {
        description: '测试文件目录',
        subdirs: {
          'unit/': '单元测试',
          'integration/': '集成测试',
          'e2e/': '端到端测试',
          'fixtures/': '测试数据',
          'mocks/': '模拟数据',
          'utils/': '测试工具'
        }
      },
      
      // 文档目录
      'docs/': {
        description: '项目文档',
        subdirs: {
          'api/': 'API文档',
          'guides/': '使用指南',
          'architecture/': '架构文档',
          'deployment/': '部署文档',
          'development/': '开发文档',
          'assets/': '文档资源'
        }
      },
      
      // 脚本目录
      'scripts/': {
        description: '项目脚本',
        subdirs: {
          'build/': '构建脚本',
          'deploy/': '部署脚本',
          'ci/': 'CI/CD脚本',
          'tools/': '开发工具脚本',
          'migration/': '数据迁移脚本',
          'setup/': '环境设置脚本'
        }
      },
      
      // 配置目录
      'config/': {
        description: '配置文件',
        subdirs: {
          'environments/': '环境配置',
          'webpack/': 'Webpack配置',
          'jest/': 'Jest配置',
          'eslint/': 'ESLint配置',
          'docker/': 'Docker配置'
        }
      },
      
      // 公共资源目录
      'public/': {
        description: '公共静态资源',
        subdirs: {
          'images/': '图片资源',
          'icons/': '图标资源',
          'fonts/': '字体文件',
          'data/': '静态数据文件'
        }
      },
      
      // 构建输出目录
      'dist/': {
        description: '构建输出目录',
        gitignore: true
      },
      
      // 报告目录
      'reports/': {
        description: '各类报告文件',
        subdirs: {
          'coverage/': '测试覆盖率报告',
          'performance/': '性能测试报告',
          'security/': '安全扫描报告',
          'quality/': '代码质量报告',
          'cicd/': 'CI/CD分析报告',
          'dependency/': '依赖分析报告'
        },
        gitignore: true
      },
      
      // 日志目录
      'logs/': {
        description: '日志文件',
        gitignore: true
      },
      
      // 临时文件目录
      'temp/': {
        description: '临时文件',
        gitignore: true
      },
      
      // 缓存目录
      'cache/': {
        description: '缓存文件',
        gitignore: true
      }
    };
  }

  loadPackageJson() {
    try {
      const packagePath = path.join(this.projectRoot, 'package.json');
      return JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    } catch (error) {
      throw new Error(`无法读取package.json: ${error.message}`);
    }
  }

  addAction(type, action, details = {}) {
    const actionRecord = {
      type,
      action,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.results[type].push(actionRecord);
    this.results.summary.totalActions++;
    
    switch (type) {
      case 'created':
        this.results.summary.directoriesCreated++;
        break;
      case 'moved':
        this.results.summary.filesMoved++;
        break;
      case 'updated':
        this.results.summary.configsUpdated++;
        break;
      case 'issues':
        this.results.summary.issuesFound++;
        break;
    }
  }

  // 创建标准目录结构
  createStandardDirectories() {
    console.log('📁 创建标准目录结构...');
    
    Object.entries(this.standardStructure).forEach(([dirPath, config]) => {
      const fullPath = path.join(this.projectRoot, dirPath);
      
      // 创建主目录
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        this.addAction('created', `创建目录: ${dirPath}`, {
          path: fullPath,
          description: config.description
        });
        
        // 创建.gitkeep文件以确保空目录被跟踪
        if (!config.gitignore) {
          const gitkeepPath = path.join(fullPath, '.gitkeep');
          fs.writeFileSync(gitkeepPath, '');
        }
      }
      
      // 创建子目录
      if (config.subdirs) {
        Object.entries(config.subdirs).forEach(([subDir, description]) => {
          const subDirPath = path.join(fullPath, subDir);
          if (!fs.existsSync(subDirPath)) {
            fs.mkdirSync(subDirPath, { recursive: true });
            this.addAction('created', `创建子目录: ${dirPath}${subDir}`, {
              path: subDirPath,
              description
            });
            
            // 创建.gitkeep文件
            if (!config.gitignore) {
              const gitkeepPath = path.join(subDirPath, '.gitkeep');
              fs.writeFileSync(gitkeepPath, '');
            }
          }
        });
      }
    });
  }

  // 分析现有文件结构
  analyzeExistingStructure() {
    console.log('🔍 分析现有文件结构...');
    
    const issues = [];
    
    // 检查是否有文件放在了错误的位置
    const misplacedFiles = this.findMisplacedFiles();
    if (misplacedFiles.length > 0) {
      issues.push({
        type: 'misplaced_files',
        count: misplacedFiles.length,
        files: misplacedFiles,
        recommendation: '将文件移动到合适的目录'
      });
    }
    
    // 检查是否有空的重要目录
    const emptyDirs = this.findEmptyImportantDirectories();
    if (emptyDirs.length > 0) {
      issues.push({
        type: 'empty_directories',
        directories: emptyDirs,
        recommendation: '考虑添加.gitkeep文件或移除空目录'
      });
    }
    
    // 检查命名规范
    const namingIssues = this.checkNamingConventions();
    if (namingIssues.length > 0) {
      issues.push({
        type: 'naming_conventions',
        issues: namingIssues,
        recommendation: '统一文件和目录命名规范'
      });
    }
    
    issues.forEach(issue => {
      this.addAction('issues', issue.type, issue);
    });
    
    return issues;
  }

  findMisplacedFiles() {
    const misplaced = [];
    
    // 检查根目录下的文件
    const rootFiles = fs.readdirSync(this.projectRoot)
      .filter(item => {
        const itemPath = path.join(this.projectRoot, item);
        return fs.statSync(itemPath).isFile();
      })
      .filter(file => {
        // 排除常见的根目录文件
        const allowedRootFiles = [
          'package.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock',
          'README.md', 'LICENSE', 'CHANGELOG.md', 'CONTRIBUTING.md',
          '.gitignore', '.gitattributes', '.editorconfig',
          '.eslintrc.js', '.eslintrc.json', '.prettierrc', '.prettierignore',
          'tsconfig.json', 'jsconfig.json', 'next.config.js', 'vite.config.js',
          'webpack.config.js', 'rollup.config.js', 'babel.config.js',
          'jest.config.js', 'vitest.config.js', 'playwright.config.js',
          'tailwind.config.js', 'postcss.config.js',
          'Dockerfile', 'docker-compose.yml', '.dockerignore',
          'vercel.json', 'netlify.toml', '.env.example'
        ];
        return !allowedRootFiles.includes(file) && !file.startsWith('.');
      });
    
    rootFiles.forEach(file => {
      const ext = path.extname(file);
      let suggestedLocation = 'src/';
      
      if (['.test.js', '.test.ts', '.spec.js', '.spec.ts'].some(testExt => file.includes(testExt))) {
        suggestedLocation = 'tests/';
      } else if (['.md'].includes(ext)) {
        suggestedLocation = 'docs/';
      } else if (['.sh', '.bat', '.ps1'].includes(ext)) {
        suggestedLocation = 'scripts/';
      }
      
      misplaced.push({
        file,
        currentLocation: './',
        suggestedLocation,
        reason: `${ext} 文件应该放在 ${suggestedLocation} 目录中`
      });
    });
    
    return misplaced;
  }

  findEmptyImportantDirectories() {
    const empty = [];
    const importantDirs = ['src', 'tests', 'docs'];
    
    importantDirs.forEach(dir => {
      const dirPath = path.join(this.projectRoot, dir);
      if (fs.existsSync(dirPath)) {
        const contents = fs.readdirSync(dirPath);
        if (contents.length === 0 || (contents.length === 1 && contents[0] === '.gitkeep')) {
          empty.push(dir);
        }
      }
    });
    
    return empty;
  }

  checkNamingConventions() {
    const issues = [];
    
    // 检查目录命名
    const checkDirectory = (dirPath, relativePath = '') => {
      if (!fs.existsSync(dirPath)) return;
      
      const items = fs.readdirSync(dirPath);
      
      items.forEach(item => {
        const itemPath = path.join(dirPath, item);
        const relativeItemPath = path.join(relativePath, item);
        
        if (fs.statSync(itemPath).isDirectory()) {
          // 检查目录命名规范
          if (item.includes(' ')) {
            issues.push({
              type: 'directory_spaces',
              path: relativeItemPath,
              issue: '目录名包含空格',
              suggestion: '使用连字符或下划线替代空格'
            });
          }
          
          if (item !== item.toLowerCase() && !item.includes('.')) {
            issues.push({
              type: 'directory_case',
              path: relativeItemPath,
              issue: '目录名包含大写字母',
              suggestion: '使用小写字母和连字符'
            });
          }
          
          // 递归检查子目录
          checkDirectory(itemPath, relativeItemPath);
        } else {
          // 检查文件命名规范
          const ext = path.extname(item);
          const basename = path.basename(item, ext);
          
          if (item.includes(' ')) {
            issues.push({
              type: 'file_spaces',
              path: relativeItemPath,
              issue: '文件名包含空格',
              suggestion: '使用连字符、下划线或驼峰命名'
            });
          }
          
          // 检查特定文件类型的命名规范
          if (['.js', '.ts', '.jsx', '.tsx'].includes(ext)) {
            if (basename.includes('_') && !basename.includes('.')) {
              // 组件文件建议使用PascalCase或kebab-case
              if (relativePath.includes('components') || relativePath.includes('pages')) {
                issues.push({
                  type: 'component_naming',
                  path: relativeItemPath,
                  issue: '组件文件建议使用PascalCase或kebab-case',
                  suggestion: '如: MyComponent.tsx 或 my-component.tsx'
                });
              }
            }
          }
        }
      });
    };
    
    checkDirectory(this.projectRoot);
    return issues;
  }

  // 优化package.json配置
  optimizePackageJson() {
    console.log('📦 优化package.json配置...');
    
    let updated = false;
    const updates = [];
    
    // 检查并添加标准字段
    const standardFields = {
      main: 'src/index.js',
      types: 'src/index.d.ts',
      files: ['dist', 'src'],
      directories: {
        lib: 'src',
        test: 'tests',
        doc: 'docs'
      }
    };
    
    Object.entries(standardFields).forEach(([field, value]) => {
      if (!this.packageJson[field]) {
        this.packageJson[field] = value;
        updates.push(`添加 ${field} 字段`);
        updated = true;
      }
    });
    
    // 优化scripts
    const recommendedScripts = {
      'clean': 'rimraf dist coverage reports/.temp',
      'clean:all': 'rimraf dist coverage reports node_modules/.cache',
      'prebuild': 'npm run clean',
      'postinstall': 'npm run setup:env',
      'setup:env': 'node scripts/setup/environment-setup.js',
      'check:structure': 'node scripts/tools/project-structure-optimizer.js --check',
      'fix:structure': 'node scripts/tools/project-structure-optimizer.js --fix'
    };
    
    Object.entries(recommendedScripts).forEach(([script, command]) => {
      if (!this.packageJson.scripts[script]) {
        this.packageJson.scripts[script] = command;
        updates.push(`添加脚本: ${script}`);
        updated = true;
      }
    });
    
    if (updated) {
      const packagePath = path.join(this.projectRoot, 'package.json');
      fs.writeFileSync(packagePath, JSON.stringify(this.packageJson, null, 2));
      
      this.addAction('updated', 'package.json优化', {
        updates,
        path: packagePath
      });
    }
    
    return updated;
  }

  // 创建项目结构文档
  createStructureDocumentation() {
    console.log('📚 创建项目结构文档...');
    
    const docContent = this.generateStructureDoc();
    const docPath = path.join(this.projectRoot, 'docs', 'PROJECT_STRUCTURE.md');
    
    // 确保docs目录存在
    const docsDir = path.dirname(docPath);
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
    
    fs.writeFileSync(docPath, docContent);
    
    this.addAction('created', '项目结构文档', {
      path: docPath,
      description: '详细的项目目录结构说明'
    });
    
    return docPath;
  }

  generateStructureDoc() {
    return `# 项目结构说明

本文档描述了项目的标准目录结构和文件组织规范。

## 📁 目录结构

\`\`\`
${this.generateDirectoryTree()}
\`\`\`

## 📋 目录说明

${this.generateDirectoryDescriptions()}

## 🔧 命名规范

### 目录命名
- 使用小写字母和连字符
- 避免使用空格和特殊字符
- 使用描述性名称

### 文件命名
- **组件文件**: PascalCase (如: \`MyComponent.tsx\`) 或 kebab-case (如: \`my-component.tsx\`)
- **工具函数**: camelCase (如: \`formatDate.js\`) 或 kebab-case (如: \`format-date.js\`)
- **测试文件**: 与被测试文件同名，添加 \`.test\` 或 \`.spec\` 后缀
- **类型定义**: kebab-case，使用 \`.types.ts\` 或 \`.d.ts\` 后缀

### 导入路径规范
- 使用绝对路径导入 (配置路径别名)
- 按类型分组导入语句
- 优先使用 index 文件进行模块导出

## 🚀 最佳实践

### 文件组织
1. **按功能分组**: 相关文件放在同一目录下
2. **保持扁平**: 避免过深的目录嵌套
3. **单一职责**: 每个文件只负责一个功能
4. **清晰命名**: 文件名应该清楚表达其用途

### 目录管理
1. **及时清理**: 删除不再使用的文件和目录
2. **保持整洁**: 避免在根目录堆积文件
3. **使用索引**: 为目录创建 index 文件统一导出
4. **文档同步**: 及时更新目录结构文档

## 🔍 检查工具

使用以下命令检查和修复项目结构:

\`\`\`bash
# 检查项目结构
npm run check:structure

# 自动修复结构问题
npm run fix:structure

# 生成结构报告
node scripts/tools/project-structure-optimizer.js --report
\`\`\`

---

**维护者**: ZK-Agent开发团队  
**最后更新**: ${new Date().toISOString().split('T')[0]}  
**版本**: 1.0.0
`;
  }

  generateDirectoryTree() {
    const tree = [];
    
    Object.keys(this.standardStructure).forEach(dir => {
      tree.push(dir);
      const config = this.standardStructure[dir];
      if (config.subdirs) {
        Object.keys(config.subdirs).forEach(subdir => {
          tree.push(`├── ${dir}${subdir}`);
        });
      }
    });
    
    return tree.join('\n');
  }

  generateDirectoryDescriptions() {
    const descriptions = [];
    
    Object.entries(this.standardStructure).forEach(([dir, config]) => {
      descriptions.push(`### ${dir}`);
      descriptions.push(config.description);
      
      if (config.subdirs) {
        Object.entries(config.subdirs).forEach(([subdir, desc]) => {
          descriptions.push(`- **${subdir}**: ${desc}`);
        });
      }
      
      descriptions.push('');
    });
    
    return descriptions.join('\n');
  }

  // 生成报告
  generateReport(outputPath = null) {
    const reportPath = outputPath || path.join(this.projectRoot, 'reports', 'project-structure-optimization.json');
    
    // 确保报告目录存在
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`📊 报告已生成: ${reportPath}`);
    
    return reportPath;
  }

  // 打印摘要
  printSummary() {
    const { summary } = this.results;
    
    console.log('\n📋 优化摘要:');
    console.log(`   总操作数: ${summary.totalActions}`);
    console.log(`   📁 创建目录: ${summary.directoriesCreated}`);
    console.log(`   📦 移动文件: ${summary.filesMoved}`);
    console.log(`   ⚙️  更新配置: ${summary.configsUpdated}`);
    console.log(`   ⚠️  发现问题: ${summary.issuesFound}`);
    
    if (summary.issuesFound > 0) {
      console.log('\n⚠️  发现的问题:');
      this.results.issues.forEach(issue => {
        console.log(`   • ${issue.action}: ${issue.details.type || issue.details.issues?.length || '多个问题'}`);
      });
    }
    
    if (summary.directoriesCreated > 0) {
      console.log('\n📁 创建的目录:');
      this.results.created.forEach(item => {
        if (item.action.includes('目录')) {
          console.log(`   • ${item.action}`);
        }
      });
    }
    
    console.log('\n🎯 优化建议:');
    console.log('   1. 定期运行结构检查');
    console.log('   2. 遵循命名规范');
    console.log('   3. 保持目录整洁');
    console.log('   4. 及时更新文档');
  }

  // 运行所有优化
  async runOptimization(options = {}) {
    console.log('🚀 开始项目结构优化...');
    
    try {
      // 创建标准目录结构
      this.createStandardDirectories();
      
      // 分析现有结构
      this.analyzeExistingStructure();
      
      // 优化package.json
      if (options.optimizePackageJson !== false) {
        this.optimizePackageJson();
      }
      
      // 创建结构文档
      if (options.createDocs !== false) {
        this.createStructureDocumentation();
      }
      
      console.log('✅ 项目结构优化完成');
      return this.results;
    } catch (error) {
      console.error('❌ 优化过程中发生错误:', error.message);
      this.addAction('issues', '优化错误', {
        error: error.message,
        stack: error.stack
      });
      return this.results;
    }
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const options = {
    check: false,
    fix: false,
    report: false,
    output: null,
    optimizePackageJson: true,
    createDocs: true
  };
  
  // 解析命令行参数
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--check':
        options.check = true;
        options.fix = false;
        break;
      case '--fix':
        options.fix = true;
        break;
      case '--report':
        options.report = true;
        break;
      case '--output':
      case '-o':
        options.output = args[++i];
        break;
      case '--no-package-json':
        options.optimizePackageJson = false;
        break;
      case '--no-docs':
        options.createDocs = false;
        break;
      case '--help':
      case '-h':
        console.log(`
项目结构优化器

用法: node project-structure-optimizer.js [选项]

选项:
  --check              仅检查项目结构，不进行修改
  --fix                检查并修复项目结构问题
  --report             生成详细报告
  -o, --output <path>  指定报告输出路径
  --no-package-json    跳过package.json优化
  --no-docs           跳过文档生成
  -h, --help          显示帮助信息

示例:
  node project-structure-optimizer.js --check
  node project-structure-optimizer.js --fix
  node project-structure-optimizer.js --report --output ./reports/structure.json
`);
        process.exit(0);
        break;
    }
  }
  
  try {
    const optimizer = new ProjectStructureOptimizer();
    
    if (options.check) {
      console.log('🔍 检查项目结构...');
      optimizer.analyzeExistingStructure();
    } else if (options.fix || (!options.check && !options.report)) {
      await optimizer.runOptimization(options);
    }
    
    if (options.report || options.check) {
      optimizer.generateReport(options.output);
    }
    
    optimizer.printSummary();
    
    // 根据结果设置退出码
    const exitCode = optimizer.results.summary.issuesFound > 0 ? 1 : 0;
    process.exit(exitCode);
  } catch (error) {
    console.error('❌ 优化失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = ProjectStructureOptimizer;