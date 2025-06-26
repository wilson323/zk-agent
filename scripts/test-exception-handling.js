/**
 * @file Exception Handling Test Script
 * @description 全面测试API路由的异常处理机制，确保异常率为0%
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const https = require('https');
const { URL } = require('url');

// 测试配置
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  timeout: 30000,
  retries: 3,
  concurrency: 5,
  testDuration: 60000, // 1分钟压力测试
};

/**
 * 使用Node.js内置模块发送HTTP请求
 */
function makeHttpRequest(config) {
  return new Promise((resolve, reject) => {
    const url = new URL(config.url);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: config.method.toUpperCase(),
      headers: config.headers || {},
      timeout: config.timeout || 30000
    };
    
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsedData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    // 发送请求体
    if (config.data) {
      const body = typeof config.data === 'string' ? config.data : JSON.stringify(config.data);
      req.write(body);
    }
    
    req.end();
  });
}

// 测试统计
const testStats = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: [],
  performance: [],
  coverage: {
    routes: 0,
    errorTypes: 0,
    statusCodes: new Set()
  }
};

/**
 * 测试用例定义
 */
const testCases = [
  // 1. 基础功能测试
  {
    name: 'Valid Request Test',
    type: 'functional',
    tests: [
      { method: 'GET', path: '/api/health', expectedStatus: 200 },
      { method: 'GET', path: '/api/agents', expectedStatus: 200 },
      { method: 'GET', path: '/api/chat/sessions', expectedStatus: 200 }
    ]
  },
  
  // 2. 错误处理测试
  {
    name: 'Error Handling Test',
    type: 'error',
    tests: [
      { method: 'GET', path: '/api/nonexistent', expectedStatus: 404 },
      { method: 'POST', path: '/api/agents', body: {}, expectedStatus: 400 },
      { method: 'POST', path: '/api/chat/sessions', body: { invalid: 'data' }, expectedStatus: 400 },
      { method: 'GET', path: '/api/agents/invalid-id', expectedStatus: 404 },
      { method: 'DELETE', path: '/api/agents/nonexistent', expectedStatus: 404 }
    ]
  },
  
  // 3. 认证测试
  {
    name: 'Authentication Test',
    type: 'auth',
    tests: [
      { method: 'POST', path: '/api/admin/agents', expectedStatus: 401 },
      { method: 'DELETE', path: '/api/admin/users/123', expectedStatus: 401 },
      { method: 'GET', path: '/api/admin/stats', expectedStatus: 401 }
    ]
  },
  
  // 4. 输入验证测试
  {
    name: 'Input Validation Test',
    type: 'validation',
    tests: [
      { method: 'POST', path: '/api/agents', body: { name: '' }, expectedStatus: 400 },
      { method: 'POST', path: '/api/chat/sessions', body: { agentId: 'invalid' }, expectedStatus: 400 },
      { method: 'PUT', path: '/api/agents/123', body: { name: 'a'.repeat(1000) }, expectedStatus: 400 },
      { method: 'POST', path: '/api/chat/messages', body: { content: null }, expectedStatus: 400 }
    ]
  },
  
  // 5. 边界条件测试
  {
    name: 'Edge Cases Test',
    type: 'edge',
    tests: [
      { method: 'GET', path: '/api/agents?limit=0', expectedStatus: 400 },
      { method: 'GET', path: '/api/agents?limit=1000', expectedStatus: 400 },
      { method: 'GET', path: '/api/chat/sessions?page=-1', expectedStatus: 400 },
      { method: 'POST', path: '/api/chat/messages', body: { content: 'x'.repeat(100000) }, expectedStatus: 400 }
    ]
  },
  
  // 6. 并发测试
  {
    name: 'Concurrency Test',
    type: 'concurrency',
    tests: [
      { method: 'GET', path: '/api/health', concurrent: 10 },
      { method: 'GET', path: '/api/agents', concurrent: 5 },
      { method: 'POST', path: '/api/chat/sessions', body: { agentId: 'test' }, concurrent: 3 }
    ]
  },
  
  // 7. 超时测试
  {
    name: 'Timeout Test',
    type: 'timeout',
    tests: [
      { method: 'POST', path: '/api/agents/process', body: { delay: 65000 }, expectedStatus: 408 },
      { method: 'GET', path: '/api/chat/export?format=large', timeout: 1000, expectedStatus: 408 }
    ]
  },
  
  // 8. 恶意请求测试
  {
    name: 'Malicious Request Test',
    type: 'security',
    tests: [
      { method: 'POST', path: '/api/agents', body: { name: '<script>alert(1)</script>' }, expectedStatus: 400 },
      { method: 'GET', path: '/api/agents?id=1; DROP TABLE users;', expectedStatus: 400 },
      { method: 'POST', path: '/api/chat/messages', body: { content: '{{constructor.constructor("return process")()}}' }, expectedStatus: 400 }
    ]
  }
];

/**
 * 执行单个测试
 */
async function executeTest(test, baseUrl = TEST_CONFIG.baseUrl) {
  const startTime = Date.now();
  
  try {
    const config = {
      method: test.method,
      url: `${baseUrl}${test.path}`,
      timeout: test.timeout || TEST_CONFIG.timeout,
      validateStatus: () => true // 不抛出状态码错误
    };
    
    if (test.body) {
      config.data = test.body;
      config.headers = { 'Content-Type': 'application/json' };
    }
    
    if (test.headers) {
      config.headers = { ...config.headers, ...test.headers };
    }
    
    const response = await makeHttpRequest(config);
    const duration = Date.now() - startTime;
    
    // 记录性能数据
    testStats.performance.push({
      path: test.path,
      method: test.method,
      duration,
      status: response.status
    });
    
    // 记录状态码
    testStats.coverage.statusCodes.add(response.status);
    
    // 验证响应
    const result = {
      test: `${test.method} ${test.path}`,
      expected: test.expectedStatus,
      actual: response.status,
      duration,
      passed: false,
      error: null,
      response: {
        status: response.status,
        headers: response.headers,
        data: response.data
      }
    };
    
    // 检查状态码
    if (test.expectedStatus && response.status !== test.expectedStatus) {
      result.error = `Expected status ${test.expectedStatus}, got ${response.status}`;
    } else {
      result.passed = true;
    }
    
    // 检查响应格式
    if (response.status >= 400) {
      if (!response.data || typeof response.data !== 'object') {
        result.error = 'Error response should be JSON object';
        result.passed = false;
      } else if (!response.data.error) {
        result.error = 'Error response should contain error field';
        result.passed = false;
      }
    }
    
    // 检查响应时间
    if (duration > 5000) {
      result.warning = `Slow response: ${duration}ms`;
    }
    
    return result;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    return {
      test: `${test.method} ${test.path}`,
      expected: test.expectedStatus,
      actual: 'ERROR',
      duration,
      passed: false,
      error: error.message,
      response: null
    };
  }
}

/**
 * 执行并发测试
 */
async function executeConcurrentTest(test, baseUrl = TEST_CONFIG.baseUrl) {
  const concurrency = test.concurrent || 1;
  const promises = [];
  
  for (let i = 0; i < concurrency; i++) {
    promises.push(executeTest({ ...test, concurrent: undefined }, baseUrl));
  }
  
  const results = await Promise.all(promises);
  
  return {
    test: `${test.method} ${test.path} (${concurrency}x)`,
    results,
    passed: results.every(r => r.passed),
    concurrency,
    avgDuration: results.reduce((sum, r) => sum + r.duration, 0) / results.length,
    maxDuration: Math.max(...results.map(r => r.duration)),
    minDuration: Math.min(...results.map(r => r.duration))
  };
}

/**
 * 压力测试
 */
async function executeStressTest(baseUrl = TEST_CONFIG.baseUrl) {
  console.log('🔥 Starting stress test...');
  
  const startTime = Date.now();
  const endTime = startTime + TEST_CONFIG.testDuration;
  const results = [];
  
  while (Date.now() < endTime) {
    const promises = [];
    
    // 并发执行多个请求
    for (let i = 0; i < TEST_CONFIG.concurrency; i++) {
      const randomTest = {
        method: 'GET',
        path: '/api/health',
        expectedStatus: 200
      };
      promises.push(executeTest(randomTest, baseUrl));
    }
    
    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
    
    // 短暂延迟
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const totalDuration = Date.now() - startTime;
  const successCount = results.filter(r => r.passed).length;
  const errorCount = results.length - successCount;
  
  return {
    duration: totalDuration,
    totalRequests: results.length,
    successCount,
    errorCount,
    errorRate: (errorCount / results.length) * 100,
    avgResponseTime: results.reduce((sum, r) => sum + r.duration, 0) / results.length,
    requestsPerSecond: (results.length / totalDuration) * 1000
  };
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('🚀 Starting comprehensive exception handling tests...');
  console.log(`🎯 Target: 0% exception rate`);
  console.log(`🌐 Base URL: ${TEST_CONFIG.baseUrl}`);
  console.log('');
  
  const allResults = [];
  
  for (const testSuite of testCases) {
    console.log(`📋 Running ${testSuite.name}...`);
    
    for (const test of testSuite.tests) {
      testStats.total++;
      
      let result;
      if (test.concurrent) {
        result = await executeConcurrentTest(test);
      } else {
        result = await executeTest(test);
      }
      
      if (result.passed) {
        testStats.passed++;
        console.log(`  ✅ ${result.test}`);
      } else {
        testStats.failed++;
        console.log(`  ❌ ${result.test}: ${result.error}`);
        testStats.errors.push(result);
      }
      
      allResults.push(result);
    }
    
    console.log('');
  }
  
  // 执行压力测试
  console.log('🔥 Running stress test...');
  const stressResult = await executeStressTest();
  console.log(`  📊 ${stressResult.totalRequests} requests in ${stressResult.duration}ms`);
  console.log(`  📈 ${stressResult.requestsPerSecond.toFixed(2)} req/sec`);
  console.log(`  ⚡ ${stressResult.avgResponseTime.toFixed(2)}ms avg response time`);
  console.log(`  🎯 ${stressResult.errorRate.toFixed(2)}% error rate`);
  console.log('');
  
  // 生成测试报告
  const report = {
    timestamp: new Date().toISOString(),
    config: TEST_CONFIG,
    summary: {
      total: testStats.total,
      passed: testStats.passed,
      failed: testStats.failed,
      successRate: ((testStats.passed / testStats.total) * 100).toFixed(2),
      exceptionRate: ((testStats.failed / testStats.total) * 100).toFixed(2)
    },
    stress: stressResult,
    coverage: {
      routes: testStats.coverage.routes,
      errorTypes: testStats.coverage.errorTypes,
      statusCodes: Array.from(testStats.coverage.statusCodes).sort()
    },
    performance: {
      avgResponseTime: testStats.performance.reduce((sum, p) => sum + p.duration, 0) / testStats.performance.length,
      maxResponseTime: Math.max(...testStats.performance.map(p => p.duration)),
      minResponseTime: Math.min(...testStats.performance.map(p => p.duration))
    },
    errors: testStats.errors,
    results: allResults
  };
  
  // 保存报告
  const reportPath = path.join(__dirname, '../reports/exception-handling-test-report.json');
  const reportDir = path.dirname(reportPath);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // 输出总结
  console.log('📊 Test Summary:');
  console.log(`   Total tests: ${testStats.total}`);
  console.log(`   ✅ Passed: ${testStats.passed}`);
  console.log(`   ❌ Failed: ${testStats.failed}`);
  console.log(`   🎯 Success rate: ${report.summary.successRate}%`);
  console.log(`   ⚠️  Exception rate: ${report.summary.exceptionRate}%`);
  console.log('');
  
  if (testStats.failed > 0) {
    console.log('❌ Failed tests:');
    testStats.errors.forEach(error => {
      console.log(`   - ${error.test}: ${error.error}`);
    });
    console.log('');
  }
  
  console.log(`📄 Detailed report saved to: ${reportPath}`);
  
  // 检查是否达到目标
  const exceptionRate = parseFloat(report.summary.exceptionRate);
  if (exceptionRate === 0) {
    console.log('🎉 SUCCESS: Exception rate is 0%! Target achieved!');
    return true;
  } else {
    console.log(`⚠️  WARNING: Exception rate is ${exceptionRate}%. Target not achieved.`);
    return false;
  }
}

/**
 * 启动开发服务器
 */
function startDevServer() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting development server...');
    
    const server = spawn('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe'
    });
    
    let serverReady = false;
    
    server.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Ready') || output.includes('localhost:3000')) {
        if (!serverReady) {
          serverReady = true;
          console.log('✅ Development server is ready!');
          resolve(server);
        }
      }
    });
    
    server.stderr.on('data', (data) => {
      console.error('Server error:', data.toString());
    });
    
    server.on('error', (error) => {
      reject(error);
    });
    
    // 超时处理
    setTimeout(() => {
      if (!serverReady) {
        reject(new Error('Server startup timeout'));
      }
    }, 60000);
  });
}

/**
 * 主函数
 */
async function main() {
  let server = null;
  
  try {
    // 启动开发服务器
    server = await startDevServer();
    
    // 等待服务器完全启动
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 运行测试
    const success = await runAllTests();
    
    // 根据结果退出
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  } finally {
    // 关闭服务器
    if (server) {
      console.log('🛑 Stopping development server...');
      server.kill();
    }
  }
}

// 命令行接口
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'test':
      main();
      break;
    case 'stress':
      executeStressTest().then(result => {
        console.log('Stress test result:', result);
      });
      break;
    default:
      console.log('Usage:');
      console.log('  node test-exception-handling.js test   - Run all tests');
      console.log('  node test-exception-handling.js stress - Run stress test only');
      process.exit(1);
  }
}

module.exports = {
  runAllTests,
  executeStressTest,
  testStats
};