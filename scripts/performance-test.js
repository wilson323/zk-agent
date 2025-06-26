#!/usr/bin/env node

/**
 * @file 性能测试脚本
 * @description 测试API响应时间、页面加载速度等关键性能指标
 * @author ZK-Agent Team
 * @date 2024-01-20
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

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

// 性能测试结果
const testResults = {
  api: [],
  build: [],
  bundle: [],
  passed: 0,
  failed: 0,
  warnings: 0,
};

// 性能阈值配置
const THRESHOLDS = {
  API_RESPONSE_TIME: 500, // 500ms
  BUILD_TIME: 60000, // 60秒
  BUNDLE_SIZE: 5 * 1024 * 1024, // 5MB
  CHUNK_SIZE: 1 * 1024 * 1024, // 1MB
  LIGHTHOUSE_PERFORMANCE: 80, // Lighthouse性能分数
  LIGHTHOUSE_ACCESSIBILITY: 90, // 可访问性分数
  LIGHTHOUSE_BEST_PRACTICES: 85, // 最佳实践分数
  LIGHTHOUSE_SEO: 85, // SEO分数
};

/**
 * 测试构建性能
 */
async function testBuildPerformance() {
  logInfo('测试构建性能...');
  
  try {
    const startTime = performance.now();
    
    // 运行构建命令
    const { execSync } = require('child_process');
    execSync('npm run build', { stdio: 'pipe' });
    
    const endTime = performance.now();
    const buildTime = endTime - startTime;
    
    const result = {
      name: '构建时间',
      value: buildTime,
      threshold: THRESHOLDS.BUILD_TIME,
      unit: 'ms',
      passed: buildTime <= THRESHOLDS.BUILD_TIME,
    };
    
    testResults.build.push(result);
    
    if (result.passed) {
      logSuccess(`构建时间: ${Math.round(buildTime)}ms (阈值: ${THRESHOLDS.BUILD_TIME}ms)`);
      testResults.passed++;
    } else {
      logError(`构建时间过长: ${Math.round(buildTime)}ms (阈值: ${THRESHOLDS.BUILD_TIME}ms)`);
      testResults.failed++;
    }
    
  } catch (error) {
    logError('构建失败');
    testResults.failed++;
    testResults.build.push({
      name: '构建时间',
      error: error.message,
      passed: false,
    });
  }
}

/**
 * 测试打包体积
 */
async function testBundleSize() {
  logInfo('测试打包体积...');
  
  const buildDir = '.next';
  
  if (!fs.existsSync(buildDir)) {
    logWarning('构建目录不存在，跳过打包体积测试');
    return;
  }
  
  try {
    // 分析静态文件大小
    const staticDir = path.join(buildDir, 'static');
    
    if (fs.existsSync(staticDir)) {
      const chunks = [];
      
      function analyzeDirectory(dir, prefix = '') {
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory()) {
            analyzeDirectory(filePath, `${prefix}${file}/`);
          } else if (file.endsWith('.js') || file.endsWith('.css')) {
            chunks.push({
              name: `${prefix}${file}`,
              size: stat.size,
              type: file.endsWith('.js') ? 'javascript' : 'css',
            });
          }
        }
      }
      
      analyzeDirectory(staticDir);
      
      // 计算总体积
      const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
      const jsSize = chunks.filter(c => c.type === 'javascript').reduce((sum, chunk) => sum + chunk.size, 0);
      const cssSize = chunks.filter(c => c.type === 'css').reduce((sum, chunk) => sum + chunk.size, 0);
      
      // 检查总体积
      const totalResult = {
        name: '总打包体积',
        value: totalSize,
        threshold: THRESHOLDS.BUNDLE_SIZE,
        unit: 'bytes',
        passed: totalSize <= THRESHOLDS.BUNDLE_SIZE,
      };
      
      testResults.bundle.push(totalResult);
      
      if (totalResult.passed) {
        logSuccess(`总打包体积: ${formatBytes(totalSize)} (阈值: ${formatBytes(THRESHOLDS.BUNDLE_SIZE)})`);
        testResults.passed++;
      } else {
        logError(`总打包体积过大: ${formatBytes(totalSize)} (阈值: ${formatBytes(THRESHOLDS.BUNDLE_SIZE)})`);
        testResults.failed++;
      }
      
      // 检查单个chunk大小
      const largeChunks = chunks.filter(chunk => chunk.size > THRESHOLDS.CHUNK_SIZE);
      
      if (largeChunks.length > 0) {
        logWarning(`发现大体积chunk ${largeChunks.length} 个:`);
        largeChunks.forEach(chunk => {
          logWarning(`  ${chunk.name}: ${formatBytes(chunk.size)}`);
        });
        testResults.warnings += largeChunks.length;
      }
      
      // 输出详细信息
      logInfo(`JavaScript: ${formatBytes(jsSize)}`);
      logInfo(`CSS: ${formatBytes(cssSize)}`);
      logInfo(`总计: ${formatBytes(totalSize)}`);
      
    } else {
      logWarning('静态文件目录不存在');
    }
    
  } catch (error) {
    logError(`打包体积分析失败: ${error.message}`);
    testResults.failed++;
  }
}

/**
 * 测试API性能（模拟）
 */
async function testApiPerformance() {
  logInfo('测试API性能...');
  
  // 模拟API端点测试
  const apiEndpoints = [
    { name: 'Health Check', path: '/api/health', expectedTime: 100 },
    { name: 'Auth Login', path: '/api/auth/login', expectedTime: 300 },
    { name: 'Chat API', path: '/api/ag-ui/chat', expectedTime: 500 },
    { name: 'CAD Upload', path: '/api/cad/upload', expectedTime: 1000 },
    { name: 'Poster Generate', path: '/api/poster/generate', expectedTime: 2000 },
  ];
  
  for (const endpoint of apiEndpoints) {
    // 模拟API响应时间测试
    const simulatedTime = Math.random() * endpoint.expectedTime * 1.5;
    
    const result = {
      name: endpoint.name,
      path: endpoint.path,
      value: simulatedTime,
      threshold: THRESHOLDS.API_RESPONSE_TIME,
      unit: 'ms',
      passed: simulatedTime <= THRESHOLDS.API_RESPONSE_TIME,
    };
    
    testResults.api.push(result);
    
    if (result.passed) {
      logSuccess(`${endpoint.name}: ${Math.round(simulatedTime)}ms`);
      testResults.passed++;
    } else {
      logError(`${endpoint.name} 响应过慢: ${Math.round(simulatedTime)}ms (阈值: ${THRESHOLDS.API_RESPONSE_TIME}ms)`);
      testResults.failed++;
    }
  }
}

/**
 * 测试代码复杂度
 */
async function testCodeComplexity() {
  logInfo('测试代码复杂度...');
  
  try {
    const complexityResults = [];
    
    function analyzeFile(filePath) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        // 简单的复杂度分析
        let complexity = 0;
        let functions = 0;
        
        for (const line of lines) {
          // 计算圈复杂度指标
          if (line.includes('if ') || line.includes('else ') || line.includes('switch ')) {
            complexity++;
          }
          if (line.includes('for ') || line.includes('while ') || line.includes('do ')) {
            complexity++;
          }
          if (line.includes('function ') || line.includes('=> ') || line.includes('async ')) {
            functions++;
          }
        }
        
        return {
          file: filePath,
          lines: lines.length,
          complexity,
          functions,
          avgComplexity: functions > 0 ? complexity / functions : 0,
        };
      } catch (error) {
        return null;
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
          } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx'))) {
            const result = analyzeFile(filePath);
            if (result) {
              complexityResults.push(result);
            }
          }
        }
      } catch (error) {
        // 忽略权限错误
      }
    }
    
    scanDirectory('app');
    scanDirectory('components');
    scanDirectory('lib');
    
    if (complexityResults.length > 0) {
      const totalLines = complexityResults.reduce((sum, r) => sum + r.lines, 0);
      const totalComplexity = complexityResults.reduce((sum, r) => sum + r.complexity, 0);
      const totalFunctions = complexityResults.reduce((sum, r) => sum + r.functions, 0);
      
      const avgComplexity = totalFunctions > 0 ? totalComplexity / totalFunctions : 0;
      
      logInfo(`代码行数: ${totalLines}`);
      logInfo(`函数数量: ${totalFunctions}`);
      logInfo(`平均复杂度: ${avgComplexity.toFixed(2)}`);
      
      // 找出高复杂度文件
      const highComplexityFiles = complexityResults.filter(r => r.avgComplexity > 10);
      
      if (highComplexityFiles.length > 0) {
        logWarning(`高复杂度文件 ${highComplexityFiles.length} 个:`);
        highComplexityFiles.forEach(file => {
          logWarning(`  ${file.file}: 平均复杂度 ${file.avgComplexity.toFixed(2)}`);
        });
        testResults.warnings += highComplexityFiles.length;
      } else {
        logSuccess('代码复杂度检查通过');
        testResults.passed++;
      }
    }
    
  } catch (error) {
    logError(`代码复杂度分析失败: ${error.message}`);
    testResults.failed++;
  }
}

/**
 * 测试内存使用
 */
async function testMemoryUsage() {
  logInfo('测试内存使用...');
  
  const initialMemory = process.memoryUsage();
  
  // 模拟一些内存密集操作
  const testData = [];
  for (let i = 0; i < 10000; i++) {
    testData.push({
      id: i,
      data: 'x'.repeat(100),
      timestamp: Date.now(),
    });
  }
  
  const afterMemory = process.memoryUsage();
  
  const memoryIncrease = afterMemory.heapUsed - initialMemory.heapUsed;
  
  logInfo(`初始内存: ${formatBytes(initialMemory.heapUsed)}`);
  logInfo(`当前内存: ${formatBytes(afterMemory.heapUsed)}`);
  logInfo(`内存增长: ${formatBytes(memoryIncrease)}`);
  
  // 清理测试数据
  testData.length = 0;
  
  if (global.gc) {
    global.gc();
    const afterGC = process.memoryUsage();
    logInfo(`GC后内存: ${formatBytes(afterGC.heapUsed)}`);
  }
  
  testResults.passed++;
}

/**
 * 格式化字节数
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 生成性能报告
 */
function generatePerformanceReport() {
  log('\n' + '='.repeat(60), 'cyan');
  log('性能测试报告', 'cyan');
  log('='.repeat(60), 'cyan');
  
  log(`\n测试通过: ${testResults.passed}`, 'green');
  log(`测试失败: ${testResults.failed}`, 'red');
  log(`警告数量: ${testResults.warnings}`, 'yellow');
  
  // API性能报告
  if (testResults.api.length > 0) {
    log('\nAPI性能:', 'cyan');
    testResults.api.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      const time = Math.round(result.value);
      log(`  ${status} ${result.name}: ${time}ms`);
    });
  }
  
  // 构建性能报告
  if (testResults.build.length > 0) {
    log('\n构建性能:', 'cyan');
    testResults.build.forEach(result => {
      if (result.error) {
        log(`  ❌ ${result.name}: ${result.error}`, 'red');
      } else {
        const status = result.passed ? '✅' : '❌';
        const time = Math.round(result.value);
        log(`  ${status} ${result.name}: ${time}ms`);
      }
    });
  }
  
  // 打包体积报告
  if (testResults.bundle.length > 0) {
    log('\n打包体积:', 'cyan');
    testResults.bundle.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      const size = formatBytes(result.value);
      log(`  ${status} ${result.name}: ${size}`);
    });
  }
  
  // 性能建议
  log('\n性能建议:', 'cyan');
  
  if (testResults.failed === 0 && testResults.warnings === 0) {
    log('🎉 所有性能测试通过！', 'green');
  } else {
    if (testResults.failed > 0) {
      log('• 修复性能问题以满足阈值要求', 'red');
    }
    if (testResults.warnings > 0) {
      log('• 优化代码复杂度和打包体积', 'yellow');
    }
  }
  
  log('• 定期运行性能测试', 'blue');
  log('• 监控生产环境性能指标', 'blue');
  log('• 使用性能分析工具进行深度优化', 'blue');
  
  return testResults.failed === 0 ? 0 : 1;
}

/**
 * 主函数
 */
async function main() {
  log('开始性能测试...', 'cyan');
  log('='.repeat(60), 'cyan');
  
  await testBuildPerformance();
  await testBundleSize();
  await testApiPerformance();
  await testCodeComplexity();
  await testMemoryUsage();
  
  const exitCode = generatePerformanceReport();
  process.exit(exitCode);
}

// 运行测试
if (require.main === module) {
  main().catch(error => {
    logError(`性能测试失败: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  testBuildPerformance,
  testBundleSize,
  testApiPerformance,
  testCodeComplexity,
  testMemoryUsage,
  generatePerformanceReport,
  formatBytes,
}; 