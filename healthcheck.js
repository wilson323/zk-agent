#!/usr/bin/env node

/**
 * ZK-Agent 健康检查脚本
 * 用于Docker容器健康状态监控
 */

const http = require('http');
const { execSync } = require('child_process');

// 配置
const config = {
  port: process.env.PORT || 3000,
  host: process.env.HOST || 'localhost',
  timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 5000,
  maxMemoryUsage: parseInt(process.env.MAX_MEMORY_USAGE) || 2 * 1024 * 1024 * 1024, // 2GB
  maxCpuUsage: parseInt(process.env.MAX_CPU_USAGE) || 80, // 80%
};

/**
 * 检查HTTP服务是否响应
 */
function checkHttpHealth() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: config.host,
      port: config.port,
      path: '/api/health',
      method: 'GET',
      timeout: config.timeout,
    };

    const req = http.request(options, (res) => {
      if (res.statusCode === 200) {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.status === 'ok') {
              resolve({ status: 'healthy', service: 'http' });
            } else {
              reject(new Error(`HTTP health check failed: ${response.message || 'Unknown error'}`));
            }
          } catch (error) {
            reject(new Error(`Invalid health check response: ${error.message}`));
          }
        });
      } else {
        reject(new Error(`HTTP health check failed with status: ${res.statusCode}`));
      }
    });

    req.on('error', (error) => {
      reject(new Error(`HTTP health check error: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('HTTP health check timeout'));
    });

    req.end();
  });
}

/**
 * 检查数据库连接
 */
function checkDatabaseHealth() {
  return new Promise((resolve, reject) => {
    try {
      // 这里应该使用实际的数据库连接检查
      // 暂时使用简单的检查
      const options = {
        hostname: config.host,
        port: config.port,
        path: '/api/health/database',
        method: 'GET',
        timeout: config.timeout,
      };

      const req = http.request(options, (res) => {
        if (res.statusCode === 200) {
          resolve({ status: 'healthy', service: 'database' });
        } else {
          reject(new Error(`Database health check failed with status: ${res.statusCode}`));
        }
      });

      req.on('error', (error) => {
        reject(new Error(`Database health check error: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Database health check timeout'));
      });

      req.end();
    } catch (error) {
      reject(new Error(`Database health check failed: ${error.message}`));
    }
  });
}

/**
 * 检查Redis连接
 */
function checkRedisHealth() {
  return new Promise((resolve, reject) => {
    try {
      const options = {
        hostname: config.host,
        port: config.port,
        path: '/api/health/redis',
        method: 'GET',
        timeout: config.timeout,
      };

      const req = http.request(options, (res) => {
        if (res.statusCode === 200) {
          resolve({ status: 'healthy', service: 'redis' });
        } else {
          reject(new Error(`Redis health check failed with status: ${res.statusCode}`));
        }
      });

      req.on('error', (error) => {
        reject(new Error(`Redis health check error: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Redis health check timeout'));
      });

      req.end();
    } catch (error) {
      reject(new Error(`Redis health check failed: ${error.message}`));
    }
  });
}

/**
 * 检查系统资源使用情况
 */
function checkSystemResources() {
  return new Promise((resolve, reject) => {
    try {
      // 检查内存使用
      const memUsage = process.memoryUsage();
      const totalMemory = memUsage.rss + memUsage.heapUsed + memUsage.external;
      
      if (totalMemory > config.maxMemoryUsage) {
        reject(new Error(`Memory usage too high: ${Math.round(totalMemory / 1024 / 1024)}MB`));
        return;
      }

      // 检查CPU使用（简化版本）
      const startUsage = process.cpuUsage();
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const cpuPercent = (endUsage.user + endUsage.system) / 1000000 * 100; // 转换为百分比
        
        if (cpuPercent > config.maxCpuUsage) {
          reject(new Error(`CPU usage too high: ${cpuPercent.toFixed(2)}%`));
          return;
        }

        resolve({
          status: 'healthy',
          service: 'system',
          memory: {
            used: Math.round(totalMemory / 1024 / 1024),
            limit: Math.round(config.maxMemoryUsage / 1024 / 1024),
            unit: 'MB'
          },
          cpu: {
            usage: cpuPercent.toFixed(2),
            limit: config.maxCpuUsage,
            unit: '%'
          }
        });
      }, 100);
    } catch (error) {
      reject(new Error(`System resource check failed: ${error.message}`));
    }
  });
}

/**
 * 检查磁盘空间
 */
function checkDiskSpace() {
  return new Promise((resolve, reject) => {
    try {
      // 检查上传目录磁盘空间
      const uploadDir = process.env.UPLOAD_DIR || '/app/uploads';
      const result = execSync(`df -h ${uploadDir} | tail -1 | awk '{print $5}' | sed 's/%//'`, { encoding: 'utf8' });
      const usagePercent = parseInt(result.trim());
      
      if (usagePercent > 90) {
        reject(new Error(`Disk usage too high: ${usagePercent}%`));
        return;
      }

      resolve({
        status: 'healthy',
        service: 'disk',
        usage: usagePercent,
        limit: 90,
        unit: '%'
      });
    } catch (error) {
      // 如果无法检查磁盘空间，不视为致命错误
      resolve({
        status: 'warning',
        service: 'disk',
        message: 'Unable to check disk space'
      });
    }
  });
}

/**
 * 主健康检查函数
 */
async function performHealthCheck() {
  const checks = [];
  const results = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {},
    errors: []
  };

  // 执行所有健康检查
  const healthChecks = [
    { name: 'http', check: checkHttpHealth },
    { name: 'database', check: checkDatabaseHealth },
    { name: 'redis', check: checkRedisHealth },
    { name: 'system', check: checkSystemResources },
    { name: 'disk', check: checkDiskSpace }
  ];

  for (const { name, check } of healthChecks) {
    try {
      const result = await check();
      results.checks[name] = result;
    } catch (error) {
      results.status = 'unhealthy';
      results.errors.push({
        service: name,
        error: error.message
      });
      results.checks[name] = {
        status: 'unhealthy',
        service: name,
        error: error.message
      };
    }
  }

  return results;
}

/**
 * 主函数
 */
async function main() {
  try {
    const results = await performHealthCheck();
    
    if (results.status === 'healthy') {
      console.log('✅ Health check passed');
      console.log(JSON.stringify(results, null, 2));
      process.exit(0);
    } else {
      console.error('❌ Health check failed');
      console.error(JSON.stringify(results, null, 2));
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Health check error:', error.message);
    process.exit(1);
  }
}

// 处理信号
process.on('SIGTERM', () => {
  console.log('Health check received SIGTERM');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Health check received SIGINT');
  process.exit(0);
});

// 运行健康检查
if (require.main === module) {
  main();
}

module.exports = {
  performHealthCheck,
  checkHttpHealth,
  checkDatabaseHealth,
  checkRedisHealth,
  checkSystemResources,
  checkDiskSpace
};