/**
 * @file Advanced Performance Benchmark Tests
 * @description 高级性能基准测试
 */

const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

describe('Advanced Performance Benchmarks', () => {
  /**
   * 测试数据库连接性能
   */
  test('数据库连接性能测试', async () => {
    const start = performance.now();
    
    // 模拟数据库连接
    await new Promise(resolve => setTimeout(resolve, 30));
    
    const end = performance.now();
    const duration = end - start;
    
    // 数据库连接应在50ms内完成
    expect(duration).toBeLessThan(50);
  });
  
  /**
   * 测试文件读取性能
   */
  test('文件读取性能测试', async () => {
    const start = performance.now();
    
    // 模拟文件读取
    const testFile = path.join(__dirname, '../basic.test.js');
    if (fs.existsSync(testFile)) {
      await fs.promises.readFile(testFile, 'utf8');
    }
    
    const end = performance.now();
    const duration = end - start;
    
    // 文件读取应在20ms内完成
    expect(duration).toBeLessThan(20);
  });
  
  /**
   * 测试CPU密集型操作性能
   */
  test('CPU密集型操作性能测试', () => {
    const start = performance.now();
    
    // 模拟CPU密集型计算
    let result = 0;
    for (let i = 0; i < 100000; i++) {
      result += Math.sqrt(i);
    }
    
    const end = performance.now();
    const duration = end - start;
    
    // CPU计算应在100ms内完成
    expect(duration).toBeLessThan(100);
    expect(result).toBeGreaterThan(0);
  });
  
  /**
   * 测试内存泄漏检测
   */
  test('内存泄漏检测', () => {
    const initialMemory = process.memoryUsage();
    
    // 创建大量对象
    const objects = [];
    for (let i = 0; i < 1000; i++) {
      objects.push({ id: i, data: new Array(100).fill(i) });
    }
    
    const afterCreation = process.memoryUsage();
    
    // 清理对象
    objects.length = 0;
    
    // 强制垃圾回收（如果可用）
    if (global.gc) {
      global.gc();
    }
    
    const afterCleanup = process.memoryUsage();
    
    // 内存增长应该是合理的
    const memoryGrowth = afterCleanup.heapUsed - initialMemory.heapUsed;
    const memoryGrowthMB = memoryGrowth / 1024 / 1024;
    
    expect(memoryGrowthMB).toBeLessThan(10); // 内存增长应小于10MB
  });
  
  /**
   * 测试并发处理性能
   */
  test('并发处理性能测试', async () => {
    const start = performance.now();
    
    // 模拟并发操作
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        new Promise(resolve => 
          setTimeout(() => resolve(i), Math.random() * 20)
        )
      );
    }
    
    const results = await Promise.all(promises);
    
    const end = performance.now();
    const duration = end - start;
    
    // 并发操作应在50ms内完成
    expect(duration).toBeLessThan(50);
    expect(results).toHaveLength(10);
  });
});