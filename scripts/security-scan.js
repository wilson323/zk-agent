#!/usr/bin/env node

/**
 * @file 安全扫描脚本
 * @description 检查项目安全漏洞、依赖项安全、配置安全等
 * @author ZK-Agent Team
 * @date 2024-01-20
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

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

// 扫描结果
const scanResults = {
  vulnerabilities: [],
  warnings: [],
  passed: 0,
  failed: 0,
  critical: 0,
  high: 0,
  medium: 0,
  low: 0,
};

/**
 * 检查敏感文件
 */
function checkSensitiveFiles() {
  logInfo('检查敏感文件...');
  
  const sensitivePatterns = [
    /\.env$/,
    /\.env\.local$/,
    /\.env\.production$/,
    /\.env\.development$/,
    /private\.key$/,
    /\.pem$/,
    /\.p12$/,
    /\.pfx$/,
    /id_rsa$/,
    /id_dsa$/,
    /\.ssh\/.*$/,
    /config\/database\.yml$/,
    /config\/secrets\.yml$/,
    /\.aws\/credentials$/,
    /\.docker\/config\.json$/,
  ];

  const sensitiveFiles = [];
  
  function scanDirectory(dir) {
    try {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          scanDirectory(filePath);
        } else if (stat.isFile()) {
          const relativePath = path.relative(process.cwd(), filePath);
          
          for (const pattern of sensitivePatterns) {
            if (pattern.test(relativePath)) {
              sensitiveFiles.push(relativePath);
              break;
            }
          }
        }
      }
    } catch (error) {
      // 忽略权限错误
    }
  }

  scanDirectory(process.cwd());

  if (sensitiveFiles.length > 0) {
    logWarning(`发现敏感文件: ${sensitiveFiles.join(', ')}`);
    scanResults.warnings.push(`敏感文件: ${sensitiveFiles.join(', ')}`);
    scanResults.medium += sensitiveFiles.length;
  } else {
    logSuccess('未发现敏感文件');
    scanResults.passed++;
  }
}

/**
 * 检查硬编码密钥
 */
function checkHardcodedSecrets() {
  logInfo('检查硬编码密钥...');
  
  const secretPatterns = [
    /password\s*=\s*['"][^'"]{8,}['"]/gi,
    /api[_-]?key\s*=\s*['"][^'"]{16,}['"]/gi,
    /secret[_-]?key\s*=\s*['"][^'"]{16,}['"]/gi,
    /access[_-]?token\s*=\s*['"][^'"]{16,}['"]/gi,
    /private[_-]?key\s*=\s*['"][^'"]{32,}['"]/gi,
    /jwt[_-]?secret\s*=\s*['"][^'"]{16,}['"]/gi,
    /database[_-]?url\s*=\s*['"].*:\/\/.*:.*@.*['"]/gi,
    /mongodb\+srv:\/\/.*:.*@/gi,
    /postgres:\/\/.*:.*@/gi,
    /mysql:\/\/.*:.*@/gi,
    /redis:\/\/.*:.*@/gi,
  ];

  const excludePatterns = [
    /\.env\.example$/,
    /\.env\.template$/,
    /README\.md$/,
    /\.md$/,
    /package\.json$/,
    /package-lock\.json$/,
    /yarn\.lock$/,
    /pnpm-lock\.yaml$/,
  ];

  const foundSecrets = [];

  function scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        for (const pattern of secretPatterns) {
          const matches = line.match(pattern);
          if (matches) {
            foundSecrets.push({
              file: filePath,
              line: index + 1,
              content: line.trim(),
              type: 'hardcoded_secret',
            });
          }
        }
      });
    } catch (error) {
      // 忽略读取错误
    }
  }

  function scanDirectory(dir) {
    try {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          scanDirectory(filePath);
        } else if (stat.isFile()) {
          const relativePath = path.relative(process.cwd(), filePath);
          
          // 跳过排除的文件
          const shouldExclude = excludePatterns.some(pattern => pattern.test(relativePath));
          if (!shouldExclude && (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.tsx'))) {
            scanFile(filePath);
          }
        }
      }
    } catch (error) {
      // 忽略权限错误
    }
  }

  scanDirectory(process.cwd());

  if (foundSecrets.length > 0) {
    logError(`发现硬编码密钥 ${foundSecrets.length} 个`);
    foundSecrets.forEach(secret => {
      logError(`  ${secret.file}:${secret.line} - ${secret.content}`);
    });
    scanResults.vulnerabilities.push(...foundSecrets);
    scanResults.failed++;
    scanResults.high += foundSecrets.length;
  } else {
    logSuccess('未发现硬编码密钥');
    scanResults.passed++;
  }
}

/**
 * 检查依赖项漏洞
 */
function checkDependencyVulnerabilities() {
  logInfo('检查依赖项漏洞...');
  
  try {
    // 运行 npm audit
    const auditResult = execSync('npm audit --json', { encoding: 'utf8' });
    const audit = JSON.parse(auditResult);
    
    if (audit.vulnerabilities && Object.keys(audit.vulnerabilities).length > 0) {
      const vulns = Object.values(audit.vulnerabilities);
      const critical = vulns.filter(v => v.severity === 'critical').length;
      const high = vulns.filter(v => v.severity === 'high').length;
      const moderate = vulns.filter(v => v.severity === 'moderate').length;
      const low = vulns.filter(v => v.severity === 'low').length;
      
      logWarning(`发现依赖项漏洞: 严重 ${critical}, 高危 ${high}, 中危 ${moderate}, 低危 ${low}`);
      
      scanResults.critical += critical;
      scanResults.high += high;
      scanResults.medium += moderate;
      scanResults.low += low;
      
      if (critical > 0 || high > 0) {
        scanResults.failed++;
        scanResults.vulnerabilities.push({
          type: 'dependency_vulnerability',
          severity: critical > 0 ? 'critical' : 'high',
          count: critical + high,
          details: audit.vulnerabilities,
        });
      } else {
        scanResults.warnings.push(`依赖项漏洞: 中危 ${moderate}, 低危 ${low}`);
      }
    } else {
      logSuccess('依赖项安全检查通过');
      scanResults.passed++;
    }
  } catch (error) {
    logWarning('无法运行依赖项安全检查');
    scanResults.warnings.push('依赖项安全检查失败');
  }
}

/**
 * 检查不安全的代码模式
 */
function checkUnsafeCodePatterns() {
  logInfo('检查不安全的代码模式...');
  
  const unsafePatterns = [
    {
      pattern: /eval\s*\(/gi,
      message: '使用了 eval() 函数',
      severity: 'high',
    },
    {
      pattern: /innerHTML\s*=/gi,
      message: '使用了 innerHTML 赋值',
      severity: 'medium',
    },
    {
      pattern: /document\.write\s*\(/gi,
      message: '使用了 document.write()',
      severity: 'medium',
    },
    {
      pattern: /dangerouslySetInnerHTML/gi,
      message: '使用了 dangerouslySetInnerHTML',
      severity: 'medium',
    },
    {
      pattern: /exec\s*\(/gi,
      message: '使用了 exec() 函数',
      severity: 'high',
    },
    {
      pattern: /setTimeout\s*\(\s*['"][^'"]*['"],/gi,
      message: '使用了字符串形式的 setTimeout',
      severity: 'medium',
    },
    {
      pattern: /setInterval\s*\(\s*['"][^'"]*['"],/gi,
      message: '使用了字符串形式的 setInterval',
      severity: 'medium',
    },
  ];

  const foundPatterns = [];

  function scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        for (const { pattern, message, severity } of unsafePatterns) {
          if (pattern.test(line)) {
            foundPatterns.push({
              file: filePath,
              line: index + 1,
              content: line.trim(),
              message,
              severity,
              type: 'unsafe_code_pattern',
            });
          }
        }
      });
    } catch (error) {
      // 忽略读取错误
    }
  }

  function scanDirectory(dir) {
    try {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          scanDirectory(filePath);
        } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.tsx'))) {
          scanFile(filePath);
        }
      }
    } catch (error) {
      // 忽略权限错误
    }
  }

  scanDirectory(process.cwd());

  if (foundPatterns.length > 0) {
    logWarning(`发现不安全的代码模式 ${foundPatterns.length} 个`);
    foundPatterns.forEach(pattern => {
      const color = pattern.severity === 'high' ? 'red' : 'yellow';
      log(`  ${pattern.file}:${pattern.line} - ${pattern.message}`, color);
    });
    
    scanResults.vulnerabilities.push(...foundPatterns);
    
    const highSeverity = foundPatterns.filter(p => p.severity === 'high').length;
    const mediumSeverity = foundPatterns.filter(p => p.severity === 'medium').length;
    
    scanResults.high += highSeverity;
    scanResults.medium += mediumSeverity;
    
    if (highSeverity > 0) {
      scanResults.failed++;
    } else {
      scanResults.warnings.push(`不安全代码模式: ${mediumSeverity} 个中危`);
    }
  } else {
    logSuccess('未发现不安全的代码模式');
    scanResults.passed++;
  }
}

/**
 * 检查配置安全
 */
function checkConfigurationSecurity() {
  logInfo('检查配置安全...');
  
  const configChecks = [
    {
      file: 'next.config.mjs',
      check: (content) => {
        if (content.includes('experimental: { ssr: false }')) {
          return { severity: 'medium', message: '禁用了 SSR，可能影响安全性' };
        }
        return null;
      },
    },
    {
      file: '.eslintrc.json',
      check: (content) => {
        const config = JSON.parse(content);
        if (!config.plugins || !config.plugins.includes('security')) {
          return { severity: 'low', message: '未启用 ESLint 安全插件' };
        }
        return null;
      },
    },
    {
      file: 'package.json',
      check: (content) => {
        const pkg = JSON.parse(content);
        if (!pkg.scripts || !pkg.scripts['security:audit']) {
          return { severity: 'low', message: '缺少安全审计脚本' };
        }
        return null;
      },
    },
  ];

  const configIssues = [];

  for (const { file, check } of configChecks) {
    if (fs.existsSync(file)) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const issue = check(content);
        if (issue) {
          configIssues.push({
            file,
            ...issue,
            type: 'configuration_issue',
          });
        }
      } catch (error) {
        logWarning(`无法检查配置文件: ${file}`);
      }
    }
  }

  if (configIssues.length > 0) {
    logWarning(`发现配置安全问题 ${configIssues.length} 个`);
    configIssues.forEach(issue => {
      logWarning(`  ${issue.file} - ${issue.message}`);
    });
    
    scanResults.warnings.push(...configIssues);
    scanResults.low += configIssues.length;
  } else {
    logSuccess('配置安全检查通过');
    scanResults.passed++;
  }
}

/**
 * 生成安全报告
 */
function generateSecurityReport() {
  log('\n' + '='.repeat(60), 'cyan');
  log('安全扫描报告', 'cyan');
  log('='.repeat(60), 'cyan');
  
  log(`\n检查通过: ${scanResults.passed}`, 'green');
  log(`检查失败: ${scanResults.failed}`, 'red');
  log(`警告数量: ${scanResults.warnings.length}`, 'yellow');
  
  log('\n漏洞统计:', 'cyan');
  log(`严重: ${scanResults.critical}`, scanResults.critical > 0 ? 'red' : 'green');
  log(`高危: ${scanResults.high}`, scanResults.high > 0 ? 'red' : 'green');
  log(`中危: ${scanResults.medium}`, scanResults.medium > 0 ? 'yellow' : 'green');
  log(`低危: ${scanResults.low}`, scanResults.low > 0 ? 'yellow' : 'green');
  
  // 计算安全评分
  const totalIssues = scanResults.critical + scanResults.high + scanResults.medium + scanResults.low;
  const criticalWeight = scanResults.critical * 10;
  const highWeight = scanResults.high * 5;
  const mediumWeight = scanResults.medium * 2;
  const lowWeight = scanResults.low * 1;
  
  const totalWeight = criticalWeight + highWeight + mediumWeight + lowWeight;
  const maxScore = 100;
  const score = Math.max(0, maxScore - totalWeight);
  
  log(`\n安全评分: ${score}/100`, score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red');
  
  // 生成建议
  log('\n安全建议:', 'cyan');
  if (scanResults.critical > 0) {
    log('• 立即修复严重漏洞', 'red');
  }
  if (scanResults.high > 0) {
    log('• 优先修复高危漏洞', 'red');
  }
  if (scanResults.medium > 0) {
    log('• 计划修复中危漏洞', 'yellow');
  }
  if (scanResults.low > 0) {
    log('• 考虑修复低危问题', 'yellow');
  }
  
  if (totalIssues === 0) {
    log('🎉 恭喜！未发现安全问题', 'green');
    return 0;
  } else if (scanResults.critical === 0 && scanResults.high === 0) {
    log('✅ 未发现严重安全问题', 'green');
    return 0;
  } else {
    log('💥 发现严重安全问题，请立即修复', 'red');
    return 1;
  }
}

/**
 * 主函数
 */
function main() {
  log('开始安全扫描...', 'cyan');
  log('='.repeat(60), 'cyan');
  
  checkSensitiveFiles();
  checkHardcodedSecrets();
  checkDependencyVulnerabilities();
  checkUnsafeCodePatterns();
  checkConfigurationSecurity();
  
  const exitCode = generateSecurityReport();
  process.exit(exitCode);
}

// 运行扫描
if (require.main === module) {
  main();
}

module.exports = {
  checkSensitiveFiles,
  checkHardcodedSecrets,
  checkDependencyVulnerabilities,
  checkUnsafeCodePatterns,
  checkConfigurationSecurity,
  generateSecurityReport,
}; 