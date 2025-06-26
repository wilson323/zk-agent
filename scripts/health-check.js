const http = require('http');
const { performance } = require('perf_hooks');

// 健康检查配置
const HEALTH_CHECK_CONFIG = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  timeout: 10000, // 10秒超时
  retries: 3,     // 重试3次
  interval: 1000  // 重试间隔1秒
};

class HealthChecker {
  constructor() {
    this.results = [];
  }

  // 发送HTTP请求
  async makeRequest(path, method = 'GET', data = null, timeout = HEALTH_CHECK_CONFIG.timeout) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, HEALTH_CHECK_CONFIG.baseUrl);
      const startTime = performance.now();
      
      const options = {
        hostname: url.hostname,
        port: url.port || 3000,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Health-Check-Agent'
        },
        timeout: timeout
      };

      const req = http.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          const endTime = performance.now();
          const responseTime = endTime - startTime;
          
          resolve({
            statusCode: res.statusCode,
            data: responseData,
            headers: res.headers,
            responseTime: responseTime
          });
        });
      });

      req.on('error', (error) => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        reject({
          error: error.message,
          responseTime: responseTime
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject({
          error: 'Request timeout',
          responseTime: timeout
        });
      });

      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  // 检查单个端点
  async checkEndpoint(name, path, expectedStatus = 200, maxResponseTime = 2000) {
    const result = {
      name: name,
      path: path,
      status: 'unknown',
      statusCode: null,
      responseTime: null,
      error: null,
      timestamp: new Date().toISOString()
    };

    let attempt = 0;
    while (attempt < HEALTH_CHECK_CONFIG.retries) {
      try {
        const response = await this.makeRequest(path);
        
        result.statusCode = response.statusCode;
        result.responseTime = Math.round(response.responseTime);
        
        // 检查状态码
        if (response.statusCode === expectedStatus) {
          // 检查响应时间
          if (response.responseTime <= maxResponseTime) {
            result.status = 'healthy';
          } else {
            result.status = 'slow';
            result.error = `Response time ${result.responseTime}ms exceeds limit ${maxResponseTime}ms`;
          }
        } else {
          result.status = 'unhealthy';
          result.error = `Expected status ${expectedStatus}, got ${response.statusCode}`;
        }
        
        break; // 成功获取响应，退出重试循环
        
      } catch (error) {
        attempt++;
        result.error = error.error || error.message;
        result.responseTime = Math.round(error.responseTime || 0);
        
        if (attempt < HEALTH_CHECK_CONFIG.retries) {
          console.log(`Retrying ${name} (attempt ${attempt + 1}/${HEALTH_CHECK_CONFIG.retries})...`);
          await new Promise(resolve => setTimeout(resolve, HEALTH_CHECK_CONFIG.interval));
        } else {
          result.status = 'failed';
        }
      }
    }

    this.results.push(result);
    return result;
  }

  // 检查数据库连接
  async checkDatabase() {
    return await this.checkEndpoint(
      'Database Health',
      '/api/db/health',
      200,
      1000
    );
  }

  // 检查Redis连接
  async checkRedis() {
    return await this.checkEndpoint(
      'Redis Health',
      '/api/health/redis',
      200,
      500
    );
  }

  // 检查FastGPT连接
  async checkFastGPT() {
    return await this.checkEndpoint(
      'FastGPT Health',
      '/api/fastgpt/health',
      200,
      2000
    );
  }

  // 检查核心API端点
  async checkCoreAPIs() {
    const endpoints = [
      { name: 'Health Check', path: '/api/health', maxTime: 500 },
      { name: 'Auth API', path: '/api/auth/status', maxTime: 1000 },
      { name: 'Agents API', path: '/api/agents', maxTime: 1000 },
      { name: 'CAD API', path: '/api/cad/templates', maxTime: 1000 },
      { name: 'Poster API', path: '/api/poster/templates', maxTime: 1000 }
    ];

    const results = [];
    for (const endpoint of endpoints) {
      const result = await this.checkEndpoint(
        endpoint.name,
        endpoint.path,
        200,
        endpoint.maxTime
      );
      results.push(result);
    }
    
    return results;
  }

  // 检查系统资源
  async checkSystemResources() {
    try {
      const response = await this.makeRequest('/api/health/system');
      
      if (response.statusCode === 200) {
        const systemData = JSON.parse(response.data);
        
        const result = {
          name: 'System Resources',
          path: '/api/health/system',
          status: 'healthy',
          statusCode: 200,
          responseTime: Math.round(response.responseTime),
          error: null,
          timestamp: new Date().toISOString(),
          details: systemData
        };

        // 检查资源使用情况
        if (systemData.memory && systemData.memory.usage > 90) {
          result.status = 'warning';
          result.error = `High memory usage: ${systemData.memory.usage}%`;
        }
        
        if (systemData.cpu && systemData.cpu.usage > 80) {
          result.status = 'warning';
          result.error = (result.error ? result.error + '; ' : '') + `High CPU usage: ${systemData.cpu.usage}%`;
        }

        this.results.push(result);
        return result;
      } else {
        return await this.checkEndpoint('System Resources', '/api/health/system');
      }
    } catch (error) {
      return await this.checkEndpoint('System Resources', '/api/health/system');
    }
  }

  // 运行完整健康检查
  async runFullCheck() {
    console.log('🏥 Starting comprehensive health check...');
    console.log(`Target: ${HEALTH_CHECK_CONFIG.baseUrl}`);
    console.log('='.repeat(50));

    const startTime = performance.now();

    // 1. 基础健康检查
    console.log('1. Checking basic health endpoint...');
    await this.checkEndpoint('Basic Health', '/api/health', 200, 500);

    // 2. 数据库连接检查
    console.log('2. Checking database connection...');
    await this.checkDatabase();

    // 3. Redis连接检查
    console.log('3. Checking Redis connection...');
    await this.checkRedis();

    // 4. FastGPT连接检查
    console.log('4. Checking FastGPT connection...');
    await this.checkFastGPT();

    // 5. 核心API检查
    console.log('5. Checking core APIs...');
    await this.checkCoreAPIs();

    // 6. 系统资源检查
    console.log('6. Checking system resources...');
    await this.checkSystemResources();

    const endTime = performance.now();
    const totalTime = Math.round(endTime - startTime);

    // 生成报告
    const report = this.generateReport(totalTime);
    this.printReport(report);

    return report;
  }

  // 生成健康检查报告
  generateReport(totalTime) {
    const healthyCount = this.results.filter(r => r.status === 'healthy').length;
    const warningCount = this.results.filter(r => r.status === 'warning' || r.status === 'slow').length;
    const unhealthyCount = this.results.filter(r => r.status === 'unhealthy' || r.status === 'failed').length;
    
    const overallStatus = unhealthyCount > 0 ? 'unhealthy' : 
                         warningCount > 0 ? 'warning' : 'healthy';

    return {
      timestamp: new Date().toISOString(),
      totalTime: totalTime,
      overallStatus: overallStatus,
      summary: {
        total: this.results.length,
        healthy: healthyCount,
        warning: warningCount,
        unhealthy: unhealthyCount
      },
      results: this.results,
      recommendations: this.generateRecommendations()
    };
  }

  // 生成改进建议
  generateRecommendations() {
    const recommendations = [];
    
    const slowEndpoints = this.results.filter(r => r.status === 'slow');
    if (slowEndpoints.length > 0) {
      recommendations.push('Consider optimizing slow endpoints: ' + 
        slowEndpoints.map(r => r.name).join(', '));
    }

    const failedEndpoints = this.results.filter(r => r.status === 'failed' || r.status === 'unhealthy');
    if (failedEndpoints.length > 0) {
      recommendations.push('Fix failed endpoints: ' + 
        failedEndpoints.map(r => r.name).join(', '));
    }

    const avgResponseTime = this.results
      .filter(r => r.responseTime)
      .reduce((sum, r) => sum + r.responseTime, 0) / this.results.length;
    
    if (avgResponseTime > 1000) {
      recommendations.push('Overall response time is high, consider performance optimization');
    }

    return recommendations;
  }

  // 打印健康检查报告
  printReport(report) {
    console.log('\n📊 Health Check Report:');
    console.log('='.repeat(50));
    console.log(`Overall Status: ${this.getStatusIcon(report.overallStatus)} ${report.overallStatus.toUpperCase()}`);
    console.log(`Total Time: ${report.totalTime}ms`);
    console.log(`Checks: ${report.summary.total} total, ${report.summary.healthy} healthy, ${report.summary.warning} warning, ${report.summary.unhealthy} unhealthy`);
    
    console.log('\nDetailed Results:');
    console.log('-'.repeat(50));
    
    this.results.forEach(result => {
      const icon = this.getStatusIcon(result.status);
      const time = result.responseTime ? `${result.responseTime}ms` : 'N/A';
      console.log(`${icon} ${result.name.padEnd(20)} ${result.statusCode || 'N/A'} ${time}`);
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      console.log('-'.repeat(50));
      report.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }

    console.log('\n' + '='.repeat(50));
    
    // 保存报告
    const fs = require('fs');
    try {
      fs.mkdirSync('./test-reports', { recursive: true });
      fs.writeFileSync('./test-reports/health-check-report.json', JSON.stringify(report, null, 2));
      console.log('📄 Detailed report saved to: ./test-reports/health-check-report.json');
    } catch (error) {
      console.error('Failed to save report:', error.message);
    }
  }

  // 获取状态图标
  getStatusIcon(status) {
    switch (status) {
      case 'healthy': return '✅';
      case 'warning':
      case 'slow': return '⚠️';
      case 'unhealthy':
      case 'failed': return '❌';
      default: return '❓';
    }
  }
}

// 运行健康检查
if (require.main === module) {
  const checker = new HealthChecker();
  checker.runFullCheck()
    .then(report => {
      const exitCode = report.overallStatus === 'healthy' ? 0 : 1;
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('Health check failed:', error);
      process.exit(1);
    });
}

module.exports = HealthChecker; 