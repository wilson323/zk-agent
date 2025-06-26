#!/usr/bin/env node

/**
 * @file production-delivery-validator.js
 * @description ZK-Agent 生产交付验证脚本
 * @author ZK-Agent Team
 * @date 2025-05-25
 * @version 1.0.0
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync, spawn } = require('child_process');
const os = require('os');

// 验证结果存储
const validationResults = {
  timestamp: new Date().toISOString(),
  phase: '',
  totalChecks: 0,
  passedChecks: 0,
  failedChecks: 0,
  results: [],
  summary: {},
  errors: []
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * 日志输出函数
 */
function log(message, color = 'reset') {
  const timestamp = new Date().toISOString();
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
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

/**
 * 执行命令并返回结果
 */
async function executeCommand(command, options = {}) {
  try {
    const result = execSync(command, {
      encoding: 'utf8',
      timeout: options.timeout || 30000,
      ...options
    });
    return { success: true, output: result.trim() };
  } catch (error) {
    return { 
      success: false, 
      error: error.message, 
      output: error.stdout || error.stderr || '' 
    };
  }
}

/**
 * 测量执行时间
 */
async function measureExecutionTime(fn) {
  const start = Date.now();
  const result = await fn();
  const end = Date.now();
  return { ...result, executionTime: end - start };
}

/**
 * 验证测试覆盖率
 */
async function validateTestCoverage() {
  logInfo('验证测试覆盖率...');
  
  const checks = [
    {
      name: '单元测试覆盖率 ≥ 80%',
      command: 'npm run test:simple:coverage',
      validator: (output) => {
        const match = output.match(/All files\s+\|\s+(\d+\.?\d*)/);
        if (match) {
          const coverage = parseFloat(match[1]);
          return coverage >= 80;
        }
        return false;
      }
    },
    {
      name: '测试执行时间 ≤ 5分钟',
      command: 'npm run test:simple',
      validator: (output, executionTime) => {
        return executionTime <= 300000; // 5分钟 = 300000ms
      }
    },
    {
      name: '测试文件命名规范检查',
      command: 'find __tests__ -name "*.js" | grep -v "\\.test\\.js$" | grep -v "\\.spec\\.js$"',
      validator: (output) => {
        return output.trim() === ''; // 无输出表示所有文件都符合规范
      }
    }
  ];

  const results = [];
  
  for (const check of checks) {
    try {
      logInfo(`执行检查: ${check.name}`);
      
      const result = await measureExecutionTime(async () => {
        return await executeCommand(check.command);
      });
      
      const passed = check.validator(result.output, result.executionTime);
      
      results.push({
        name: check.name,
        passed,
        output: result.output,
        executionTime: result.executionTime,
        error: result.error
      });
      
      if (passed) {
        logSuccess(`${check.name} - 通过`);
      } else {
        logError(`${check.name} - 失败`);
      }
      
    } catch (error) {
      logError(`${check.name} - 执行错误: ${error.message}`);
      results.push({
        name: check.name,
        passed: false,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * 验证数据库配置
 */
async function validateDatabaseConfiguration() {
  logInfo('验证数据库配置...');
  
  const checks = [
    {
      name: '生产数据库与测试数据库隔离',
      validator: async () => {
        try {
          // 检查生产环境配置
          const prodResult = await executeCommand(
            'NODE_ENV=production node -e "console.log(require(\'./config/database.config\').getDatabaseConfig().database)"'
          );
          
          // 检查测试环境配置
          const testResult = await executeCommand(
            'NODE_ENV=test node -e "console.log(require(\'./config/database.config\').getDatabaseConfig().database)"'
          );
          
          if (prodResult.success && testResult.success) {
            const prodDb = prodResult.output.trim();
            const testDb = testResult.output.trim();
            return prodDb !== testDb && prodDb === 'zkagent1' && testDb === 'zkagent2';
          }
          
          return false;
        } catch (error) {
          return false;
        }
      }
    },
    {
      name: '数据库连接测试',
      validator: async () => {
        const result = await executeCommand('npm run test:simple -- --testNamePattern="数据库配置测试"');
        return result.success && !result.output.includes('failed');
      }
    }
  ];

  const results = [];
  
  for (const check of checks) {
    try {
      logInfo(`执行检查: ${check.name}`);
      
      const passed = await check.validator();
      
      results.push({
        name: check.name,
        passed
      });
      
      if (passed) {
        logSuccess(`${check.name} - 通过`);
      } else {
        logError(`${check.name} - 失败`);
      }
      
    } catch (error) {
      logError(`${check.name} - 执行错误: ${error.message}`);
      results.push({
        name: check.name,
        passed: false,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * 验证代码质量
 */
async function validateCodeQuality() {
  logInfo('验证代码质量...');
  
  const checks = [
    {
      name: 'ESLint代码检查',
      command: 'npm run lint',
      validator: (output) => !output.includes('error') && !output.includes('✖')
    },
    {
      name: 'TypeScript类型检查',
      command: 'npm run type-check',
      validator: (output) => !output.includes('error')
    },
    {
      name: '代码格式检查',
      command: 'npm run format:check',
      validator: (output) => !output.includes('Code style issues found')
    }
  ];

  const results = [];
  
  for (const check of checks) {
    try {
      logInfo(`执行检查: ${check.name}`);
      
      const result = await executeCommand(check.command);
      const passed = check.validator(result.output);
      
      results.push({
        name: check.name,
        passed,
        output: result.output,
        error: result.error
      });
      
      if (passed) {
        logSuccess(`${check.name} - 通过`);
      } else {
        logError(`${check.name} - 失败`);
        if (result.output) {
          console.log(result.output);
        }
      }
      
    } catch (error) {
      logError(`${check.name} - 执行错误: ${error.message}`);
      results.push({
        name: check.name,
        passed: false,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * 验证安全配置
 */
async function validateSecurityConfiguration() {
  logInfo('验证安全配置...');
  
  const checks = [
    {
      name: '依赖安全审计',
      command: 'npm audit --audit-level high',
      validator: (output) => !output.includes('high') && !output.includes('critical')
    },
    {
      name: '环境变量安全检查',
      validator: async () => {
        try {
          // 检查是否存在敏感信息泄露
          const result = await executeCommand('grep -r "password\\|secret\\|key" . --exclude-dir=node_modules --exclude-dir=.git --include="*.js" --include="*.ts" | grep -v "test" | grep -v "example"');
          return result.output.trim() === '';
        } catch (error) {
          return true; // grep没有找到匹配项时会返回错误，这是好的
        }
      }
    }
  ];

  const results = [];
  
  for (const check of checks) {
    try {
      logInfo(`执行检查: ${check.name}`);
      
      let passed;
      if (check.command) {
        const result = await executeCommand(check.command);
        passed = check.validator(result.output);
      } else {
        passed = await check.validator();
      }
      
      results.push({
        name: check.name,
        passed
      });
      
      if (passed) {
        logSuccess(`${check.name} - 通过`);
      } else {
        logError(`${check.name} - 失败`);
      }
      
    } catch (error) {
      logError(`${check.name} - 执行错误: ${error.message}`);
      results.push({
        name: check.name,
        passed: false,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * 验证项目结构
 */
async function validateProjectStructure() {
  logInfo('验证项目结构...');
  
  const requiredDirectories = [
    'config',
    '__tests__/setup',
    '__tests__/config',
    '__tests__/core',
    'lib',
    'components',
    'app',
    'docs/testing'
  ];
  
  const requiredFiles = [
    'config/jest.simple.config.js',
    'config/database.config.js',
    '__tests__/setup/simple.setup.js',
    'package.json',
    'next.config.mjs',
    'tsconfig.json'
  ];

  const results = [];
  
  // 检查目录
  for (const dir of requiredDirectories) {
    try {
      await fs.access(dir);
      results.push({
        name: `目录存在: ${dir}`,
        passed: true
      });
      logSuccess(`目录存在: ${dir}`);
    } catch (error) {
      results.push({
        name: `目录存在: ${dir}`,
        passed: false,
        error: `目录不存在: ${dir}`
      });
      logError(`目录不存在: ${dir}`);
    }
  }
  
  // 检查文件
  for (const file of requiredFiles) {
    try {
      await fs.access(file);
      results.push({
        name: `文件存在: ${file}`,
        passed: true
      });
      logSuccess(`文件存在: ${file}`);
    } catch (error) {
      results.push({
        name: `文件存在: ${file}`,
        passed: false,
        error: `文件不存在: ${file}`
      });
      logError(`文件不存在: ${file}`);
    }
  }
  
  return results;
}

/**
 * 生成验证报告
 */
async function generateValidationReport() {
  const reportPath = path.join('test-reports', 'production-delivery-validation.json');
  const summaryPath = path.join('test-reports', 'validation-summary.md');
  
  // 确保报告目录存在
  await fs.mkdir('test-reports', { recursive: true });
  
  // 生成JSON报告
  await fs.writeFile(reportPath, JSON.stringify(validationResults, null, 2));
  
  // 生成Markdown摘要
  const summary = generateMarkdownSummary();
  await fs.writeFile(summaryPath, summary);
  
  logInfo(`验证报告已生成: ${reportPath}`);
  logInfo(`验证摘要已生成: ${summaryPath}`);
}

/**
 * 生成Markdown摘要
 */
function generateMarkdownSummary() {
  const { totalChecks, passedChecks, failedChecks, timestamp, phase } = validationResults;
  const successRate = totalChecks > 0 ? ((passedChecks / totalChecks) * 100).toFixed(2) : 0;
  
  let summary = `# ZK-Agent 生产交付验证报告

## 验证概要

- **验证时间**: ${timestamp}
- **验证阶段**: ${phase}
- **总检查项**: ${totalChecks}
- **通过检查**: ${passedChecks}
- **失败检查**: ${failedChecks}
- **成功率**: ${successRate}%

## 验证状态

${successRate >= 95 ? '🟢 **验证通过** - 项目满足生产交付标准' : '🔴 **验证失败** - 项目需要修复问题后重新验证'}

## 详细结果

`;

  // 按类别组织结果
  const categories = {};
  validationResults.results.forEach(result => {
    const category = result.category || '其他';
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(result);
  });

  Object.keys(categories).forEach(category => {
    summary += `### ${category}\n\n`;
    categories[category].forEach(result => {
      const status = result.passed ? '✅' : '❌';
      summary += `- ${status} ${result.name}\n`;
      if (!result.passed && result.error) {
        summary += `  - 错误: ${result.error}\n`;
      }
    });
    summary += '\n';
  });

  if (validationResults.errors.length > 0) {
    summary += `## 错误日志\n\n`;
    validationResults.errors.forEach(error => {
      summary += `- ${error}\n`;
    });
  }

  summary += `
## 建议

${successRate >= 95 ? 
  '项目已满足生产交付标准，可以进入下一阶段。' : 
  '请修复上述失败的检查项，然后重新运行验证。'
}

---

*报告生成时间: ${new Date().toISOString()}*
*验证脚本版本: 1.0.0*
`;

  return summary;
}

/**
 * 主验证流程
 */
async function runValidation(phase = 'phase1') {
  logInfo(`开始执行 ZK-Agent 生产交付验证 - ${phase}`);
  
  validationResults.phase = phase;
  
  try {
    // 阶段一：基础设施验证
    if (phase === 'phase1' || phase === 'all') {
      logInfo('='.repeat(50));
      logInfo('阶段一：基础设施完善与测试框架建设');
      logInfo('='.repeat(50));
      
      // 项目结构验证
      const structureResults = await validateProjectStructure();
      validationResults.results.push(...structureResults.map(r => ({...r, category: '项目结构'})));
      
      // 测试覆盖率验证
      const coverageResults = await validateTestCoverage();
      validationResults.results.push(...coverageResults.map(r => ({...r, category: '测试覆盖率'})));
      
      // 数据库配置验证
      const dbResults = await validateDatabaseConfiguration();
      validationResults.results.push(...dbResults.map(r => ({...r, category: '数据库配置'})));
      
      // 代码质量验证
      const qualityResults = await validateCodeQuality();
      validationResults.results.push(...qualityResults.map(r => ({...r, category: '代码质量'})));
      
      // 安全配置验证
      const securityResults = await validateSecurityConfiguration();
      validationResults.results.push(...securityResults.map(r => ({...r, category: '安全配置'})));
    }
    
    // 计算总体结果
    validationResults.totalChecks = validationResults.results.length;
    validationResults.passedChecks = validationResults.results.filter(r => r.passed).length;
    validationResults.failedChecks = validationResults.totalChecks - validationResults.passedChecks;
    
    // 生成报告
    await generateValidationReport();
    
    // 输出总结
    logInfo('='.repeat(50));
    logInfo('验证完成');
    logInfo('='.repeat(50));
    
    const successRate = (validationResults.passedChecks / validationResults.totalChecks * 100).toFixed(2);
    
    if (successRate >= 95) {
      logSuccess(`验证通过！成功率: ${successRate}% (${validationResults.passedChecks}/${validationResults.totalChecks})`);
      process.exit(0);
    } else {
      logError(`验证失败！成功率: ${successRate}% (${validationResults.passedChecks}/${validationResults.totalChecks})`);
      logWarning('请修复失败的检查项后重新运行验证');
      process.exit(1);
    }
    
  } catch (error) {
    logError(`验证过程中发生错误: ${error.message}`);
    validationResults.errors.push(error.message);
    await generateValidationReport();
    process.exit(1);
  }
}

// 命令行参数处理
const args = process.argv.slice(2);
const phase = args[0] || 'phase1';

// 支持的阶段
const supportedPhases = ['phase1', 'phase2', 'phase3', 'phase4', 'phase5', 'phase6', 'all'];

if (!supportedPhases.includes(phase)) {
  logError(`不支持的验证阶段: ${phase}`);
  logInfo(`支持的阶段: ${supportedPhases.join(', ')}`);
  process.exit(1);
}

// 运行验证
runValidation(phase).catch(error => {
  logError(`验证失败: ${error.message}`);
  process.exit(1);
});

module.exports = {
  runValidation,
  validateTestCoverage,
  validateDatabaseConfiguration,
  validateCodeQuality,
  validateSecurityConfiguration,
  validateProjectStructure
}; 