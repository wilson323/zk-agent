const http = require('http');
const { performance } = require('perf_hooks');

// 内存监控配置
const MEMORY_TEST_CONFIG = {
  duration: 5 * 60 * 1000, // 5分钟测试
  interval: 10 * 1000, // 每10秒检查一次
  maxMemoryMB: 512, // 最大内存限制512MB
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
};

class MemoryTester {
  constructor() {
    this.startTime = Date.now();
    this.memorySnapshots = [];
    this.requestCount = 0;
    this.errors = [];
  }

  // 获取内存使用情况
  getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      timestamp: Date.now(),
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024), // MB
      arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024), // MB
    };
  }

  // 发送HTTP请求
  async makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, MEMORY_TEST_CONFIG.baseUrl);
      const options = {
        hostname: url.hostname,
        port: url.port || 3000,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Memory-Test-Agent',
        },
      };

      const req = http.request(options, res => {
        let responseData = '';

        res.on('data', chunk => {
          responseData += chunk;
        });

        res.on('end', () => {
          this.requestCount++;
          resolve({
            statusCode: res.statusCode,
            data: responseData,
            headers: res.headers,
          });
        });
      });

      req.on('error', error => {
        this.errors.push({
          timestamp: Date.now(),
          error: error.message,
          path: path,
        });
        reject(error);
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  // 模拟用户行为
  async simulateUserBehavior() {
    const scenarios = [
      () => this.makeRequest('/api/health'),
      () => this.makeRequest('/api/agents'),
      () => this.makeRequest('/api/cad/templates'),
      () => this.makeRequest('/api/poster/templates'),
      () =>
        this.makeRequest('/api/chat/sessions', 'POST', {
          agentId: 'test-agent',
          title: 'Memory Test Session',
        }),
      () =>
        this.makeRequest('/api/chat/messages', 'POST', {
          message: 'Memory test message ' + Math.random(),
          sessionId: 'test-session-' + Math.random(),
        }),
    ];

    // 随机执行场景
    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

    try {
      await scenario();
    } catch (error) {
      // 错误已在makeRequest中记录
    }
  }

  // 检查内存泄漏
  checkMemoryLeak() {
    if (this.memorySnapshots.length < 2) return false;

    const recent = this.memorySnapshots.slice(-5); // 最近5次快照
    const initial = this.memorySnapshots.slice(0, 5); // 初始5次快照

    const recentAvg = recent.reduce((sum, snap) => sum + snap.heapUsed, 0) / recent.length;
    const initialAvg = initial.reduce((sum, snap) => sum + snap.heapUsed, 0) / initial.length;

    // 如果内存使用增长超过50%，认为可能存在内存泄漏
    const growthRate = (recentAvg - initialAvg) / initialAvg;
    return growthRate > 0.5;
  }

  // 生成报告
  generateReport() {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    const finalMemory = this.getMemoryUsage();
    const initialMemory = this.memorySnapshots[0] || finalMemory;

    const report = {
      summary: {
        duration: Math.round(duration / 1000), // 秒
        totalRequests: this.requestCount,
        totalErrors: this.errors.length,
        errorRate: this.errors.length / this.requestCount,
        requestsPerSecond: this.requestCount / (duration / 1000),
      },
      memory: {
        initial: initialMemory,
        final: finalMemory,
        peak: this.memorySnapshots.reduce(
          (max, snap) => (snap.heapUsed > max.heapUsed ? snap : max),
          initialMemory
        ),
        growth: {
          rss: finalMemory.rss - initialMemory.rss,
          heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
          heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
        },
      },
      analysis: {
        memoryLeakDetected: this.checkMemoryLeak(),
        memoryLimitExceeded: finalMemory.heapUsed > MEMORY_TEST_CONFIG.maxMemoryMB,
        averageMemoryGrowthPerRequest:
          this.memorySnapshots.length > 1
            ? (finalMemory.heapUsed - initialMemory.heapUsed) / this.requestCount
            : 0,
      },
      snapshots: this.memorySnapshots,
      errors: this.errors.slice(0, 10), // 只显示前10个错误
    };

    return report;
  }

  // 运行内存测试
  async run() {
    console.log('🧠 Starting memory leak test...');
    console.log(`Duration: ${MEMORY_TEST_CONFIG.duration / 1000}s`);
    console.log(`Target: ${MEMORY_TEST_CONFIG.baseUrl}`);
    console.log(`Memory limit: ${MEMORY_TEST_CONFIG.maxMemoryMB}MB`);

    // 初始内存快照
    this.memorySnapshots.push(this.getMemoryUsage());

    // 定期内存监控
    const memoryMonitor = setInterval(() => {
      const usage = this.getMemoryUsage();
      this.memorySnapshots.push(usage);

      console.log(
        `Memory: ${usage.heapUsed}MB (RSS: ${usage.rss}MB) | Requests: ${this.requestCount} | Errors: ${this.errors.length}`
      );

      // 检查内存限制
      if (usage.heapUsed > MEMORY_TEST_CONFIG.maxMemoryMB) {
        console.warn(
          `⚠️  Memory limit exceeded: ${usage.heapUsed}MB > ${MEMORY_TEST_CONFIG.maxMemoryMB}MB`
        );
      }
    }, MEMORY_TEST_CONFIG.interval);

    // 持续发送请求
    const requestInterval = setInterval(async () => {
      // 并发发送多个请求
      const promises = Array(5)
        .fill()
        .map(() => this.simulateUserBehavior());
      await Promise.allSettled(promises);
    }, 1000); // 每秒发送请求

    // 等待测试完成
    await new Promise(resolve => setTimeout(resolve, MEMORY_TEST_CONFIG.duration));

    // 清理定时器
    clearInterval(memoryMonitor);
    clearInterval(requestInterval);

    // 最终内存快照
    this.memorySnapshots.push(this.getMemoryUsage());

    // 生成并输出报告
    const report = this.generateReport();

    console.log('\n📊 Memory Test Report:');
    console.log('='.repeat(50));
    console.log(`Duration: ${report.summary.duration}s`);
    console.log(`Total Requests: ${report.summary.totalRequests}`);
    console.log(`Error Rate: ${(report.summary.errorRate * 100).toFixed(2)}%`);
    console.log(`Requests/sec: ${report.summary.requestsPerSecond.toFixed(2)}`);
    console.log('\nMemory Usage:');
    console.log(`Initial: ${report.memory.initial.heapUsed}MB`);
    console.log(`Final: ${report.memory.final.heapUsed}MB`);
    console.log(`Peak: ${report.memory.peak.heapUsed}MB`);
    console.log(`Growth: ${report.memory.growth.heapUsed}MB`);
    console.log('\nAnalysis:');
    console.log(`Memory Leak Detected: ${report.analysis.memoryLeakDetected ? '❌ YES' : '✅ NO'}`);
    console.log(
      `Memory Limit Exceeded: ${report.analysis.memoryLimitExceeded ? '❌ YES' : '✅ NO'}`
    );
    console.log(
      `Avg Growth/Request: ${report.analysis.averageMemoryGrowthPerRequest.toFixed(4)}MB`
    );

    // 保存详细报告
    const fs = require('fs');
    const reportPath = './test-reports/memory-test-report.json';

    try {
      fs.mkdirSync('./test-reports', { recursive: true });
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    } catch (error) {
      console.error('Failed to save report:', error.message);
    }

    // 返回测试结果
    const passed =
      !report.analysis.memoryLeakDetected &&
      !report.analysis.memoryLimitExceeded &&
      report.summary.errorRate < 0.05;

    console.log(
      `\n${passed ? '✅ PASSED' : '❌ FAILED'}: Memory test ${passed ? 'passed' : 'failed'}`
    );

    process.exit(passed ? 0 : 1);
  }
}

// 运行测试
if (require.main === module) {
  const tester = new MemoryTester();
  tester.run().catch(error => {
    console.error('Memory test failed:', error);
    process.exit(1);
  });
}

module.exports = MemoryTester;
