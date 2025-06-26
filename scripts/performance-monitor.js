/**
 * @file Performance Monitor
 * @description 性能监控脚本，用于持续监控优化效果
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 性能监控配置
 */
const MONITOR_CONFIG = {
  // 监控间隔（毫秒）
  interval: 30000, // 30秒
  // 性能阈值
  thresholds: {
    pageLoadTime: 2000, // 2秒
    apiResponseTime: 200, // 200ms
    memoryUsage: 512 * 1024 * 1024, // 512MB
    cpuUsage: 80, // 80%
  },
  // 报告配置
  reporting: {
    enabled: true,
    interval: 300000, // 5分钟生成一次报告
    retentionDays: 7, // 保留7天的数据
  }
};

/**
 * 收集系统性能指标
 */
function collectSystemMetrics() {
  const metrics = {
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    uptime: process.uptime(),
  };
  
  return metrics;
}

/**
 * 检查API响应时间
 */
function checkApiResponseTime() {
  const startTime = Date.now();
  
  try {
    // 模拟API调用（实际应用中应该调用真实的API）
    const response = {
      status: 'ok',
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };
    
    return response;
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 生成性能报告
 */
function generatePerformanceReport(metrics) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalChecks: metrics.length,
      avgResponseTime: metrics.reduce((sum, m) => sum + (m.api?.responseTime || 0), 0) / metrics.length,
      memoryUsage: metrics[metrics.length - 1]?.system?.memory || {},
      cpuUsage: metrics[metrics.length - 1]?.system?.cpu || {},
    },
    metrics: metrics,
    recommendations: generateRecommendations(metrics)
  };
  
  // 确保reports目录存在
  const reportsDir = path.join(__dirname, '../reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  // 保存报告
  const reportPath = path.join(reportsDir, `performance-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`📊 性能报告已生成: ${reportPath}`);
  return report;
}

/**
 * 生成优化建议
 */
function generateRecommendations(metrics) {
  const recommendations = [];
  
  const avgResponseTime = metrics.reduce((sum, m) => sum + (m.api?.responseTime || 0), 0) / metrics.length;
  
  if (avgResponseTime > MONITOR_CONFIG.thresholds.apiResponseTime) {
    recommendations.push({
      type: 'performance',
      priority: 'high',
      message: `API响应时间过高 (${avgResponseTime.toFixed(2)}ms > ${MONITOR_CONFIG.thresholds.apiResponseTime}ms)`,
      suggestion: '考虑优化数据库查询、增加缓存或使用CDN'
    });
  }
  
  const latestMemory = metrics[metrics.length - 1]?.system?.memory;
  if (latestMemory && latestMemory.heapUsed > MONITOR_CONFIG.thresholds.memoryUsage) {
    recommendations.push({
      type: 'memory',
      priority: 'medium',
      message: `内存使用过高 (${(latestMemory.heapUsed / 1024 / 1024).toFixed(2)}MB)`,
      suggestion: '检查内存泄漏，优化数据结构，考虑增加服务器内存'
    });
  }
  
  return recommendations;
}

/**
 * 主监控循环
 */
function startMonitoring() {
  console.log('🚀 开始性能监控...');
  console.log(`监控间隔: ${MONITOR_CONFIG.interval / 1000}秒`);
  console.log(`报告间隔: ${MONITOR_CONFIG.reporting.interval / 1000}秒`);
  
  const metrics = [];
  let lastReportTime = Date.now();
  
  const monitorInterval = setInterval(() => {
    try {
      // 收集指标
      const systemMetrics = collectSystemMetrics();
      const apiMetrics = checkApiResponseTime();
      
      const currentMetrics = {
        timestamp: new Date().toISOString(),
        system: systemMetrics,
        api: apiMetrics
      };
      
      metrics.push(currentMetrics);
      
      // 输出当前状态
      console.log(`\n⏰ ${currentMetrics.timestamp}`);
      console.log(`📊 内存使用: ${(systemMetrics.memory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`🚀 API响应: ${apiMetrics.responseTime}ms`);
      
      // 检查是否需要生成报告
      if (Date.now() - lastReportTime >= MONITOR_CONFIG.reporting.interval) {
        generatePerformanceReport(metrics.slice(-10)); // 只保留最近10条记录
        lastReportTime = Date.now();
      }
      
      // 清理旧数据
      if (metrics.length > 100) {
        metrics.splice(0, metrics.length - 100);
      }
      
    } catch (error) {
      console.error('❌ 监控过程中出现错误:', error.message);
    }
  }, MONITOR_CONFIG.interval);
  
  // 优雅退出处理
  process.on('SIGINT', () => {
    console.log('\n🛑 停止性能监控...');
    clearInterval(monitorInterval);
    
    if (metrics.length > 0) {
      generatePerformanceReport(metrics);
    }
    
    process.exit(0);
  });
}

/**
 * 显示当前性能状态
 */
function showCurrentStatus() {
  console.log('📊 当前性能状态:');
  
  const systemMetrics = collectSystemMetrics();
  const apiMetrics = checkApiResponseTime();
  
  console.log(`\n🖥️  系统指标:`);
  console.log(`   内存使用: ${(systemMetrics.memory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  console.log(`   运行时间: ${(systemMetrics.uptime / 60).toFixed(2)}分钟`);
  
  console.log(`\n🌐 API指标:`);
  console.log(`   响应时间: ${apiMetrics.responseTime}ms`);
  console.log(`   状态: ${apiMetrics.status}`);
  
  // 性能评估
  const issues = [];
  if (apiMetrics.responseTime > MONITOR_CONFIG.thresholds.apiResponseTime) {
    issues.push(`API响应时间过高 (${apiMetrics.responseTime}ms)`);
  }
  if (systemMetrics.memory.heapUsed > MONITOR_CONFIG.thresholds.memoryUsage) {
    issues.push(`内存使用过高 (${(systemMetrics.memory.heapUsed / 1024 / 1024).toFixed(2)}MB)`);
  }
  
  if (issues.length > 0) {
    console.log(`\n⚠️  发现问题:`);
    issues.forEach(issue => console.log(`   - ${issue}`));
  } else {
    console.log(`\n✅ 性能状态良好`);
  }
}

// 命令行参数处理
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--status')) {
    showCurrentStatus();
  } else if (args.includes('--start')) {
    startMonitoring();
  } else {
    console.log('🔧 ZK-Agent 性能监控工具');
    console.log('\n使用方法:');
    console.log('  node performance-monitor.js --status   # 显示当前状态');
    console.log('  node performance-monitor.js --start    # 开始持续监控');
    console.log('\n按 Ctrl+C 停止监控');
  }
}

module.exports = {
  startMonitoring,
  showCurrentStatus,
  generatePerformanceReport,
  MONITOR_CONFIG
};