#!/usr/bin/env node

/**
 * @file 项目验证脚本
 * @description 验证项目结构、代码质量、配置等
 * @author ZK-Agent Team
 * @date 2024-01-20
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// 验证结果
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  errors: [],
  warnings: [],
};

/**
 * 验证文件是否存在
 */
function validateFileExists(filePath, description) {
  if (fs.existsSync(filePath)) {
    logSuccess(`${description}: ${filePath}`);
    results.passed++;
    return true;
  } else {
    logError(`${description}缺失: ${filePath}`);
    results.failed++;
    results.errors.push(`缺失文件: ${filePath}`);
    return false;
  }
}

/**
 * 验证目录结构
 */
function validateDirectoryStructure() {
  logInfo('验证目录结构...');
  
  const requiredDirs = [
    'app',
    'components',
    'lib',
    'config',
    'types',
    'hooks',
    'contexts',
    'prisma',
    'public',
    'styles',
    'scripts',
    'docs',
    '__tests__',
  ];

  requiredDirs.forEach(dir => {
    validateFileExists(dir, `目录`);
  });
}

/**
 * 验证配置文件
 */
function validateConfigFiles() {
  logInfo('验证配置文件...');
  
  const configFiles = [
    { path: 'package.json', desc: 'Package配置' },
    { path: 'tsconfig.json', desc: 'TypeScript配置' },
    { path: 'tailwind.config.ts', desc: 'Tailwind配置' },
    { path: 'next.config.mjs', desc: 'Next.js配置' },
    { path: '.eslintrc.json', desc: 'ESLint配置' },
    { path: '.prettierrc', desc: 'Prettier配置' },
    { path: 'jest.config.js', desc: 'Jest配置' },
    { path: 'playwright.config.ts', desc: 'Playwright配置' },
    { path: 'components.json', desc: 'UI组件配置' },
  ];

  configFiles.forEach(({ path: filePath, desc }) => {
    validateFileExists(filePath, desc);
  });
}

/**
 * 验证环境变量
 */
function validateEnvironmentVariables() {
  logInfo('验证环境变量配置...');
  
  // 检查环境变量模板文件
  if (fs.existsSync('.env.template')) {
    logSuccess('环境变量模板文件存在');
    results.passed++;
  } else {
    logWarning('建议创建 .env.template 文件');
    results.warnings++;
  }

  // 检查环境变量配置文件
  validateFileExists('config/env.ts', '环境变量配置');
}

/**
 * 验证核心文件
 */
function validateCoreFiles() {
  logInfo('验证核心文件...');
  
  const coreFiles = [
    { path: 'config/constants.ts', desc: '常量配置' },
    { path: 'lib/middleware/auth.ts', desc: '认证中间件' },
    { path: 'lib/middleware/rate-limit.ts', desc: '速率限制中间件' },
  ];

  coreFiles.forEach(({ path: filePath, desc }) => {
    validateFileExists(filePath, desc);
  });
}

/**
 * 验证代码质量
 */
function validateCodeQuality() {
  logInfo('验证代码质量...');
  
  try {
    // 运行 TypeScript 类型检查
    execSync('npm run type-check', { stdio: 'pipe' });
    logSuccess('TypeScript 类型检查通过');
    results.passed++;
  } catch (error) {
    logError('TypeScript 类型检查失败');
    results.failed++;
    results.errors.push('TypeScript 类型检查失败');
  }

  try {
    // 运行 ESLint 检查
    execSync('npm run lint', { stdio: 'pipe' });
    logSuccess('ESLint 检查通过');
    results.passed++;
  } catch (error) {
    logError('ESLint 检查失败');
    results.failed++;
    results.errors.push('ESLint 检查失败');
  }

  try {
    // 运行 Prettier 检查
    execSync('npm run format:check', { stdio: 'pipe' });
    logSuccess('Prettier 格式检查通过');
    results.passed++;
  } catch (error) {
    logWarning('代码格式不符合 Prettier 规范');
    results.warnings++;
  }
}

/**
 * 验证依赖项
 */
function validateDependencies() {
  logInfo('验证依赖项...');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    // 检查关键依赖
    const requiredDeps = [
      'next',
      'react',
      'typescript',
      '@prisma/client',
      'zod',
      'jsonwebtoken',
      'bcryptjs',
    ];

    const missingDeps = requiredDeps.filter(dep => 
      !packageJson.dependencies[dep] && !packageJson.devDependencies[dep]
    );

    if (missingDeps.length === 0) {
      logSuccess('所有必需依赖项已安装');
      results.passed++;
    } else {
      logError(`缺少依赖项: ${missingDeps.join(', ')}`);
      results.failed++;
      results.errors.push(`缺少依赖项: ${missingDeps.join(', ')}`);
    }

    // 检查安全漏洞
    try {
      execSync('npm audit --audit-level=high', { stdio: 'pipe' });
      logSuccess('依赖项安全检查通过');
      results.passed++;
    } catch (error) {
      logWarning('发现依赖项安全漏洞，建议运行 npm audit fix');
      results.warnings++;
    }

  } catch (error) {
    logError('无法读取 package.json');
    results.failed++;
    results.errors.push('无法读取 package.json');
  }
}

/**
 * 验证Git配置
 */
function validateGitConfiguration() {
  logInfo('验证Git配置...');
  
  validateFileExists('.gitignore', 'Git忽略文件');
  
  // 检查是否有未提交的更改
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim()) {
      logWarning('存在未提交的更改');
      results.warnings++;
    } else {
      logSuccess('Git工作目录干净');
      results.passed++;
    }
  } catch (error) {
    logWarning('无法检查Git状态（可能不是Git仓库）');
    results.warnings++;
  }
}

/**
 * 验证文档
 */
function validateDocumentation() {
  logInfo('验证文档...');
  
  const docFiles = [
    { path: 'README.md', desc: '项目说明文档' },
    { path: 'docs/项目总体设计与开发方案.md', desc: '设计方案文档' },
  ];

  docFiles.forEach(({ path: filePath, desc }) => {
    if (fs.existsSync(filePath)) {
      logSuccess(`${desc}存在`);
      results.passed++;
    } else {
      logWarning(`${desc}缺失: ${filePath}`);
      results.warnings++;
    }
  });
}

/**
 * 验证测试配置
 */
function validateTestConfiguration() {
  logInfo('验证测试配置...');
  
  const testFiles = [
    { path: 'jest.config.js', desc: 'Jest配置' },
    { path: 'jest.setup.js', desc: 'Jest设置' },
    { path: 'playwright.config.ts', desc: 'Playwright配置' },
  ];

  testFiles.forEach(({ path: filePath, desc }) => {
    validateFileExists(filePath, desc);
  });

  // 检查测试目录
  if (fs.existsSync('__tests__') || fs.existsSync('e2e')) {
    logSuccess('测试目录存在');
    results.passed++;
  } else {
    logWarning('建议创建测试目录');
    results.warnings++;
  }
}

/**
 * 验证安全配置
 */
function validateSecurityConfiguration() {
  logInfo('验证安全配置...');
  
  // 检查是否有敏感文件被意外提交
  const sensitiveFiles = [
    '.env',
    '.env.local',
    '.env.production',
    'private.key',
    'certificate.crt',
  ];

  const foundSensitiveFiles = sensitiveFiles.filter(file => fs.existsSync(file));
  
  if (foundSensitiveFiles.length > 0) {
    logWarning(`发现敏感文件，请确保已添加到 .gitignore: ${foundSensitiveFiles.join(', ')}`);
    results.warnings++;
  } else {
    logSuccess('未发现敏感文件');
    results.passed++;
  }

  // 检查 .gitignore 是否包含敏感文件模式
  if (fs.existsSync('.gitignore')) {
    const gitignore = fs.readFileSync('.gitignore', 'utf8');
    const requiredPatterns = ['.env*', 'node_modules/', '*.log'];
    const missingPatterns = requiredPatterns.filter(pattern => !gitignore.includes(pattern));
    
    if (missingPatterns.length === 0) {
      logSuccess('.gitignore 配置完整');
      results.passed++;
    } else {
      logWarning(`建议在 .gitignore 中添加: ${missingPatterns.join(', ')}`);
      results.warnings++;
    }
  }
}

/**
 * 生成验证报告
 */
function generateReport() {
  log('\n' + '='.repeat(60), 'cyan');
  log('项目验证报告', 'cyan');
  log('='.repeat(60), 'cyan');
  
  log(`\n通过: ${results.passed}`, 'green');
  log(`失败: ${results.failed}`, 'red');
  log(`警告: ${results.warnings}`, 'yellow');
  
  if (results.errors.length > 0) {
    log('\n错误详情:', 'red');
    results.errors.forEach(error => log(`  - ${error}`, 'red'));
  }
  
  if (results.warnings.length > 0) {
    log('\n警告详情:', 'yellow');
    results.warnings.forEach(warning => log(`  - ${warning}`, 'yellow'));
  }
  
  const total = results.passed + results.failed;
  const score = total > 0 ? Math.round((results.passed / total) * 100) : 0;
  
  log(`\n项目健康度: ${score}%`, score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red');
  
  if (results.failed === 0) {
    log('\n🎉 项目验证通过！', 'green');
    return 0;
  } else {
    log('\n💥 项目验证失败，请修复上述问题', 'red');
    return 1;
  }
}

/**
 * 主函数
 */
function main() {
  log('开始项目验证...', 'cyan');
  log('='.repeat(60), 'cyan');
  
  validateDirectoryStructure();
  validateConfigFiles();
  validateEnvironmentVariables();
  validateCoreFiles();
  validateCodeQuality();
  validateDependencies();
  validateGitConfiguration();
  validateDocumentation();
  validateTestConfiguration();
  validateSecurityConfiguration();
  
  const exitCode = generateReport();
  process.exit(exitCode);
}

// 运行验证
if (require.main === module) {
  main();
}

module.exports = {
  validateFileExists,
  validateDirectoryStructure,
  validateConfigFiles,
  validateEnvironmentVariables,
  validateCoreFiles,
  validateCodeQuality,
  validateDependencies,
  validateGitConfiguration,
  validateDocumentation,
  validateTestConfiguration,
  validateSecurityConfiguration,
  generateReport,
}; 