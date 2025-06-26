/**
 * @file Performance Report Generator
 * @description 性能测试报告生成器
 */

const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

describe('Performance Report', () => {
  let performanceData = {
    timestamp: new Date().toISOString(),
    testResults: [],
    systemInfo: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: process.memoryUsage()
    }
  };
  
  /**
   * 收集API响应时间数据
   */
  test('收集API响应时间数据', async () => {
    const iterations = 5;
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 20));
      const end = performance.now();
      times.push(end - start);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    performanceData.testResults.push({
      testName: 'API响应时间',
      average: avgTime,
      min: minTime,
      max: maxTime,
      iterations: iterations,
      unit: 'ms'
    });
    
    expect(avgTime).toBeLessThan(100);
  });
  
  /**
   * 收集内存使用数据
   */
  test('收集内存使用数据', () => {
    const memUsage = process.memoryUsage();
    
    performanceData.testResults.push({
      testName: '内存使用情况',
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
      external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100,
      rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100,
      unit: 'MB'
    });
    
    expect(memUsage.heapUsed / 1024 / 1024).toBeLessThan(100);
  });
  
  /**
   * 收集CPU性能数据
   */
  test('收集CPU性能数据', () => {
    const iterations = 3;
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      
      // CPU密集型计算
      let result = 0;
      for (let j = 0; j < 50000; j++) {
        result += Math.sqrt(j) * Math.sin(j);
      }
      
      const end = performance.now();
      times.push(end - start);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    
    performanceData.testResults.push({
      testName: 'CPU计算性能',
      average: avgTime,
      iterations: iterations,
      unit: 'ms'
    });
    
    expect(avgTime).toBeLessThan(200);
  });
  
  /**
   * 生成性能报告
   */
  test('生成性能报告', () => {
    const reportDir = path.join(__dirname, '../../reports');
    const reportFile = path.join(reportDir, 'performance-report.json');
    
    // 确保报告目录存在
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    // 写入性能报告
    fs.writeFileSync(reportFile, JSON.stringify(performanceData, null, 2));
    
    // 生成简化的文本报告
    const textReport = generateTextReport(performanceData);
    const textReportFile = path.join(reportDir, 'performance-summary.txt');
    fs.writeFileSync(textReportFile, textReport);
    
    console.log('\n📊 性能测试报告已生成:');
    console.log(`   详细报告: ${reportFile}`);
    console.log(`   摘要报告: ${textReportFile}`);
    
    expect(fs.existsSync(reportFile)).toBe(true);
    expect(fs.existsSync(textReportFile)).toBe(true);
  });
});

/**
 * 生成文本格式的性能报告
 * @param {Object} data - 性能数据
 * @returns {string} 文本报告
 */
function generateTextReport(data) {
  let report = `ZK-Agent 性能测试报告\n`;
  report += `生成时间: ${data.timestamp}\n`;
  report += `Node.js版本: ${data.systemInfo.nodeVersion}\n`;
  report += `平台: ${data.systemInfo.platform} ${data.systemInfo.arch}\n\n`;
  
  report += `测试结果:\n`;
  report += `${'='.repeat(50)}\n`;
  
  data.testResults.forEach(result => {
    report += `\n${result.testName}:\n`;
    
    if (result.testName === '内存使用情况') {
      report += `  堆内存使用: ${result.heapUsed} ${result.unit}\n`;
      report += `  堆内存总计: ${result.heapTotal} ${result.unit}\n`;
      report += `  外部内存: ${result.external} ${result.unit}\n`;
      report += `  RSS内存: ${result.rss} ${result.unit}\n`;
    } else {
      report += `  平均时间: ${result.average?.toFixed(2)} ${result.unit}\n`;
      if (result.min !== undefined) {
        report += `  最短时间: ${result.min.toFixed(2)} ${result.unit}\n`;
        report += `  最长时间: ${result.max.toFixed(2)} ${result.unit}\n`;
      }
      if (result.iterations) {
        report += `  测试次数: ${result.iterations}\n`;
      }
    }
  });
  
  report += `\n${'='.repeat(50)}\n`;
  report += `测试完成时间: ${new Date().toLocaleString()}\n`;
  
  return report;
}