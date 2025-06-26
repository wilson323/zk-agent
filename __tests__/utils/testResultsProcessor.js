/**
 * @file testResultsProcessor.js
 * @description Jest测试结果处理器
 * @author ZK-Agent Team
 * @date 2025-05-25
 */

const fs = require('fs');
const path = require('path');

/**
 * 处理Jest测试结果
 * @param {Object} results - Jest测试结果对象
 * @returns {Object} 处理后的结果
 */
function processResults(results) {
  const outputDir = path.join(process.cwd(), 'test-reports');
  
  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // 生成详细的测试结果报告
  const detailedReport = {
    timestamp: new Date().toISOString(),
    summary: {
      numTotalTests: results.numTotalTests,
      numPassedTests: results.numPassedTests,
      numFailedTests: results.numFailedTests,
      numPendingTests: results.numPendingTests,
      numRuntimeErrorTestSuites: results.numRuntimeErrorTestSuites,
      numTotalTestSuites: results.numTotalTestSuites,
      numPassedTestSuites: results.numPassedTestSuites,
      numFailedTestSuites: results.numFailedTestSuites,
      numPendingTestSuites: results.numPendingTestSuites,
      success: results.success,
      startTime: results.startTime,
      testResults: results.testResults.map(testResult => ({
        testFilePath: path.relative(process.cwd(), testResult.testFilePath),
        numFailingTests: testResult.numFailingTests,
        numPassingTests: testResult.numPassingTests,
        numPendingTests: testResult.numPendingTests,
        perfStats: testResult.perfStats,
        testResults: testResult.testResults.map(test => ({
          title: test.title,
          status: test.status,
          duration: test.duration,
          failureMessage: test.failureMessage,
          ancestorTitles: test.ancestorTitles
        }))
      }))
    }
  };
  
  // 写入详细报告
  const reportPath = path.join(outputDir, 'jest-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(detailedReport, null, 2));
  
  // 生成简化的摘要
  const summary = {
    timestamp: new Date().toISOString(),
    total: results.numTotalTests,
    passed: results.numPassedTests,
    failed: results.numFailedTests,
    skipped: results.numPendingTests,
    success: results.success,
    successRate: results.numTotalTests > 0 
      ? ((results.numPassedTests / results.numTotalTests) * 100).toFixed(1)
      : 0,
    failedTests: results.testResults
      .filter(suite => suite.numFailingTests > 0)
      .map(suite => ({
        file: path.relative(process.cwd(), suite.testFilePath),
        failures: suite.testResults
          .filter(test => test.status === 'failed')
          .map(test => ({
            name: test.title,
            message: test.failureMessage ? test.failureMessage.split('\n')[0] : 'Unknown error'
          }))
      }))
  };
  
  const summaryPath = path.join(outputDir, 'test-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  
  console.log(`\n📊 测试结果已保存:`);
  console.log(`   详细报告: ${reportPath}`);
  console.log(`   测试摘要: ${summaryPath}`);
  
  return results;
}

module.exports = processResults; 