/**
 * ESLint增强配置脚本
 * 功能：集成eslint-plugin-unused-imports等高级代码质量检查插件
 * 作者：ZK-Agent Team
 * 创建时间：2024
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

class ESLintEnhancer {
  constructor() {
    this.projectRoot = process.cwd();
    this.eslintConfigPath = path.join(this.projectRoot, '.eslintrc.js');
    this.packageJsonPath = path.join(this.projectRoot, 'package.json');
  }

  /**
   * 安装必要的ESLint插件
   * @returns {Promise<boolean>} 安装是否成功
   */
  async installPlugins() {
    console.log(chalk.blue('📦 安装ESLint增强插件...'));
    
    const plugins = [
      'eslint-plugin-unused-imports',
      'eslint-plugin-import',
      '@typescript-eslint/eslint-plugin',
      '@typescript-eslint/parser'
    ];

    try {
      for (const plugin of plugins) {
        console.log(chalk.yellow(`安装 ${plugin}...`));
        execSync(`npm install -D ${plugin}`, { 
          stdio: 'inherit',
          cwd: this.projectRoot 
        });
      }
      
      console.log(chalk.green('✅ 所有插件安装完成'));
      return true;
    } catch (error) {
      console.error(chalk.red('❌ 插件安装失败:'), error.message);
      return false;
    }
  }

  /**
   * 读取当前ESLint配置
   * @returns {Object} 当前配置
   */
  readCurrentConfig() {
    try {
      // 删除require缓存以获取最新配置
      delete require.cache[require.resolve(this.eslintConfigPath)];
      return require(this.eslintConfigPath);
    } catch (error) {
      console.error(chalk.red('读取ESLint配置失败:'), error.message);
      return null;
    }
  }

  /**
   * 生成增强的ESLint配置
   * @param {Object} currentConfig 当前配置
   * @returns {Object} 增强后的配置
   */
  generateEnhancedConfig(currentConfig) {
    const enhancedConfig = {
      ...currentConfig,
      plugins: [
        ...(currentConfig.plugins || []),
        'unused-imports'
      ].filter((plugin, index, arr) => arr.indexOf(plugin) === index), // 去重
      
      rules: {
        ...currentConfig.rules,
        
        // 未使用导入相关规则
        'unused-imports/no-unused-imports': 'error',
        'unused-imports/no-unused-vars': [
          'warn',
          {
            vars: 'all',
            varsIgnorePattern: '^_',
            args: 'after-used',
            argsIgnorePattern: '^_'
          }
        ],
        
        // 增强的导入规则
        'import/no-unused-modules': [
          'error',
          {
            unusedExports: true,
            src: ['src/**/*'],
            ignoreExports: ['src/index.ts', 'src/main.ts', 'src/app.ts']
          }
        ],
        'import/no-duplicates': 'error',
        'import/no-self-import': 'error',
        'import/no-cycle': ['error', { maxDepth: 10 }],
        'import/no-useless-path-segments': 'error',
        
        // TypeScript增强规则
        '@typescript-eslint/no-unused-vars': 'off', // 使用unused-imports替代
        '@typescript-eslint/no-unused-expressions': 'error',
        '@typescript-eslint/no-unnecessary-type-assertion': 'error',
        '@typescript-eslint/prefer-nullish-coalescing': 'error',
        '@typescript-eslint/prefer-optional-chain': 'error',
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/await-thenable': 'error',
        
        // 代码质量规则
        'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
        'no-debugger': 'error',
        'no-alert': 'error',
        'no-eval': 'error',
        'no-implied-eval': 'error',
        'prefer-const': 'error',
        'no-var': 'error',
        'object-shorthand': 'error',
        'prefer-template': 'error',
        'prefer-arrow-callback': 'error',
        'arrow-spacing': 'error',
        'no-duplicate-imports': 'error'
      },
      
      settings: {
        ...currentConfig.settings,
        'import/resolver': {
          typescript: {
            alwaysTryTypes: true,
            project: './tsconfig.json'
          },
          node: {
            extensions: ['.js', '.jsx', '.ts', '.tsx']
          }
        }
      }
    };

    return enhancedConfig;
  }

  /**
   * 备份当前配置
   * @returns {boolean} 备份是否成功
   */
  backupCurrentConfig() {
    try {
      const backupPath = `${this.eslintConfigPath}.backup.${Date.now()}`;
      fs.copyFileSync(this.eslintConfigPath, backupPath);
      console.log(chalk.green(`✅ 配置已备份到: ${backupPath}`));
      return true;
    } catch (error) {
      console.error(chalk.red('❌ 配置备份失败:'), error.message);
      return false;
    }
  }

  /**
   * 写入增强配置
   * @param {Object} config 配置对象
   * @returns {boolean} 写入是否成功
   */
  writeEnhancedConfig(config) {
    try {
      const configContent = `/** @type {import('eslint').Linter.Config} */
module.exports = ${JSON.stringify(config, null, 2)};`;
      
      fs.writeFileSync(this.eslintConfigPath, configContent);
      console.log(chalk.green('✅ ESLint增强配置已更新'));
      return true;
    } catch (error) {
      console.error(chalk.red('❌ 配置写入失败:'), error.message);
      return false;
    }
  }

  /**
   * 更新package.json脚本
   * @returns {boolean} 更新是否成功
   */
  updatePackageScripts() {
    try {
      const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
      
      const newScripts = {
        'lint:unused': 'eslint . --ext .ts,.tsx,.js,.jsx --rule "unused-imports/no-unused-imports: error"',
        'lint:fix-unused': 'eslint . --ext .ts,.tsx,.js,.jsx --rule "unused-imports/no-unused-imports: error" --fix',
        'lint:imports': 'eslint . --ext .ts,.tsx,.js,.jsx --rule "import/no-unused-modules: error"',
        'lint:comprehensive': 'eslint . --ext .ts,.tsx,.js,.jsx',
        'lint:fix-all': 'eslint . --ext .ts,.tsx,.js,.jsx --fix'
      };
      
      packageJson.scripts = {
        ...packageJson.scripts,
        ...newScripts
      };
      
      fs.writeFileSync(this.packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log(chalk.green('✅ package.json脚本已更新'));
      return true;
    } catch (error) {
      console.error(chalk.red('❌ package.json更新失败:'), error.message);
      return false;
    }
  }

  /**
   * 运行ESLint检查
   * @param {string} mode 检查模式 ('check' | 'fix')
   * @returns {Object} 检查结果
   */
  async runLintCheck(mode = 'check') {
    console.log(chalk.blue(`🔍 运行ESLint${mode === 'fix' ? '修复' : '检查'}...`));
    
    try {
      const command = mode === 'fix' 
        ? 'npm run lint:fix-all'
        : 'npm run lint:comprehensive';
        
      const output = execSync(command, { 
        encoding: 'utf8',
        cwd: this.projectRoot 
      });
      
      return {
        status: 'success',
        output,
        summary: '代码检查通过'
      };
    } catch (error) {
      // ESLint错误通常包含有用的输出
      return {
        status: 'warning',
        output: error.stdout || error.message,
        summary: '发现代码质量问题'
      };
    }
  }

  /**
   * 生成代码质量报告
   * @returns {Object} 质量报告
   */
  async generateQualityReport() {
    console.log(chalk.blue('📊 生成代码质量报告...'));
    
    const reportDir = path.join(this.projectRoot, 'reports', 'code-quality');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    try {
      // 运行各种检查
      const unusedImportsCheck = await this.runLintCheck('check');
      const fixResults = await this.runLintCheck('fix');
      
      const report = {
        timestamp: new Date().toISOString(),
        checks: {
          unusedImports: unusedImportsCheck,
          autoFix: fixResults
        },
        summary: {
          totalIssues: this.countIssues(unusedImportsCheck.output),
          fixedIssues: this.countIssues(fixResults.output),
          status: unusedImportsCheck.status === 'success' ? 'healthy' : 'needs-attention'
        }
      };
      
      const reportPath = path.join(reportDir, 'eslint-quality-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      
      console.log(chalk.green(`✅ 质量报告已生成: ${reportPath}`));
      return report;
    } catch (error) {
      console.error(chalk.red('❌ 报告生成失败:'), error.message);
      return null;
    }
  }

  /**
   * 统计问题数量
   * @param {string} output ESLint输出
   * @returns {number} 问题数量
   */
  countIssues(output) {
    if (!output) return 0;
    
    const lines = output.split('\n');
    let count = 0;
    
    lines.forEach(line => {
      if (line.includes('error') || line.includes('warning')) {
        count++;
      }
    });
    
    return count;
  }

  /**
   * 执行完整的ESLint增强流程
   * @returns {Promise<boolean>} 执行是否成功
   */
  async enhance() {
    console.log(chalk.green('🚀 开始ESLint增强流程...'));
    
    // 1. 安装插件
    const pluginsInstalled = await this.installPlugins();
    if (!pluginsInstalled) {
      return false;
    }
    
    // 2. 备份当前配置
    const backupSuccess = this.backupCurrentConfig();
    if (!backupSuccess) {
      console.log(chalk.yellow('⚠️ 配置备份失败，继续执行...'));
    }
    
    // 3. 读取当前配置
    const currentConfig = this.readCurrentConfig();
    if (!currentConfig) {
      return false;
    }
    
    // 4. 生成增强配置
    const enhancedConfig = this.generateEnhancedConfig(currentConfig);
    
    // 5. 写入增强配置
    const configWritten = this.writeEnhancedConfig(enhancedConfig);
    if (!configWritten) {
      return false;
    }
    
    // 6. 更新package.json脚本
    const scriptsUpdated = this.updatePackageScripts();
    if (!scriptsUpdated) {
      console.log(chalk.yellow('⚠️ package.json更新失败，但ESLint配置已完成'));
    }
    
    // 7. 生成质量报告
    await this.generateQualityReport();
    
    console.log(chalk.green('✅ ESLint增强完成！'));
    console.log(chalk.blue('💡 可用的新命令:'));
    console.log(chalk.gray('  npm run lint:unused      - 检查未使用的导入'));
    console.log(chalk.gray('  npm run lint:fix-unused  - 自动修复未使用的导入'));
    console.log(chalk.gray('  npm run lint:imports     - 检查导入问题'));
    console.log(chalk.gray('  npm run lint:comprehensive - 综合代码检查'));
    console.log(chalk.gray('  npm run lint:fix-all     - 自动修复所有问题'));
    
    return true;
  }
}

// 命令行执行
if (require.main === module) {
  const enhancer = new ESLintEnhancer();
  
  const command = process.argv[2] || 'enhance';
  
  switch (command) {
    case 'install':
      enhancer.installPlugins();
      break;
    case 'check':
      enhancer.runLintCheck('check');
      break;
    case 'fix':
      enhancer.runLintCheck('fix');
      break;
    case 'report':
      enhancer.generateQualityReport();
      break;
    case 'enhance':
    default:
      enhancer.enhance();
      break;
  }
}

module.exports = ESLintEnhancer;