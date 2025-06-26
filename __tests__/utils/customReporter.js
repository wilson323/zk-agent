/**
 * @file customReporter.js
 * @description 自定义Jest报告器 - 统一测试日志记录
 * @author ZK-Agent Team
 * @date 2025-05-25
 */

const fs = require('fs');
const path = require('path');

class CustomReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options;
    this._testResults = [];
    this._startTime = Date.now();
    
    // 确保输出目录存在
    const outputDir = path.dirname(this._options.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  onRunStart() {
    this._startTime = Date.now();
    console.log('\n🚀 ZK-Agent 自动化测试开始执行...\n');
    
    // 记录测试开始日志
    this._logToFile({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message: 'ZK-Agent 自动化测试开始执行',
      phase: 'TEST_START',
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage()
      }
    });
  }

  onTestResult(test, testResult) {
    const { testFilePath, testResults } = testResult;
    const relativePath = path.relative(process.cwd(), testFilePath);
    
    // 处理每个测试用例
    testResults.forEach(result => {
      const testLog = {
        timestamp: new Date().toISOString(),
        level: result.status === 'passed' ? 'SUCCESS' : 'ERROR',
        message: `${result.title} - ${result.status}`,
        phase: 'TEST_EXECUTION',
        file: relativePath,
        testName: result.title,
        status: result.status,
        duration: result.duration,
        failureMessage: result.failureMessage || null,
        ancestorTitles: result.ancestorTitles
      };
      
      this._testResults.push(testLog);
      this._logToFile(testLog);
      
      // 控制台输出
      const statusIcon = result.status === 'passed' ? '✅' : '❌';
      console.log(`${statusIcon} ${relativePath}: ${result.title}`);
      
      if (result.failureMessage) {
        console.log(`   💥 失败原因: ${result.failureMessage.split('\n')[0]}`);
      }
    });
  }

  onRunComplete(contexts, results) {
    const endTime = Date.now();
    const duration = endTime - this._startTime;
    
    // 生成测试摘要
    const summary = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message: '测试执行完成',
      phase: 'TEST_COMPLETE',
      summary: {
        totalTests: results.numTotalTests,
        passedTests: results.numPassedTests,
        failedTests: results.numFailedTests,
        skippedTests: results.numPendingTests,
        totalTime: duration,
        success: results.success,
        coverageThreshold: results.coverageMap ? 'ENABLED' : 'DISABLED'
      },
      performance: {
        averageTestTime: duration / results.numTotalTests,
        slowestTests: this._getSlowTests(),
        memoryUsage: process.memoryUsage()
      }
    };
    
    this._logToFile(summary);
    
    // 控制台输出摘要
    console.log('\n📊 测试执行摘要:');
    console.log(`   总测试数: ${results.numTotalTests}`);
    console.log(`   通过: ${results.numPassedTests} ✅`);
    console.log(`   失败: ${results.numFailedTests} ❌`);
    console.log(`   跳过: ${results.numPendingTests} ⏭️`);
    console.log(`   执行时间: ${(duration / 1000).toFixed(2)}s`);
    console.log(`   成功率: ${((results.numPassedTests / results.numTotalTests) * 100).toFixed(1)}%`);
    
    if (results.numFailedTests > 0) {
      console.log('\n❌ 失败的测试:');
      this._testResults
        .filter(test => test.status === 'failed')
        .forEach(test => {
          console.log(`   - ${test.file}: ${test.testName}`);
        });
    }
    
    // 生成最终报告文件
    this._generateFinalReport();
    
    console.log(`\n📄 详细日志已保存到: ${this._options.outputPath}`);
    console.log('🎯 测试执行完成!\n');
  }

  _getSlowTests() {
    return this._testResults
      .filter(test => test.duration > 1000)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5)
      .map(test => ({
        name: test.testName,
        file: test.file,
        duration: test.duration
      }));
  }

  _logToFile(logEntry) {
    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(this._options.outputPath, logLine);
  }

  _generateFinalReport() {
    const reportPath = this._options.outputPath.replace('.json', '-summary.json');
    
    const finalReport = {
      generatedAt: new Date().toISOString(),
      testSession: {
        startTime: new Date(this._startTime).toISOString(),
        endTime: new Date().toISOString(),
        duration: Date.now() - this._startTime
      },
      results: {
        total: this._testResults.length,
        passed: this._testResults.filter(t => t.status === 'passed').length,
        failed: this._testResults.filter(t => t.status === 'failed').length,
        skipped: this._testResults.filter(t => t.status === 'pending').length
      },
      failedTests: this._testResults
        .filter(t => t.status === 'failed')
        .map(t => ({
          file: t.file,
          testName: t.testName,
          failureMessage: t.failureMessage,
          duration: t.duration
        })),
      slowTests: this._getSlowTests(),
      coverage: {
        enabled: this._globalConfig.collectCoverage,
        threshold: this._globalConfig.coverageThreshold
      }
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(finalReport, null, 2));
  }
}

module.exports = CustomReporter; 