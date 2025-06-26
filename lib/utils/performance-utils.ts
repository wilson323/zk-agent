// @ts-nocheck
/**
 * @file lib/utils/performance-utils.ts
 * @description 性能工具类 - 用于测试中的性能测量
 * @author B团队性能架构师
 * @lastUpdate 2024-12-19
 */

export class PerformanceUtils {
  /**
   * 测量函数执行时间
   */
  static async measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const startTime = Date.now();
    const result = await fn();
    const duration = Date.now() - startTime;
    return { result, duration };
  }

  /**
   * 测量同步函数执行时间
   */
  static measureTimeSync<T>(fn: () => T): { result: T; duration: number } {
    const startTime = Date.now();
    const result = fn();
    const duration = Date.now() - startTime;
    return { result, duration };
  }

  /**
   * 获取内存使用情况
   */
  static getMemoryUsage(): NodeJS.MemoryUsage {
    return process.memoryUsage();
  }

  /**
   * 获取CPU使用情况
   */
  static async getCPUUsage(duration: number = 100): Promise<number> {
    const startUsage = process.cpuUsage();
    await new Promise(resolve => setTimeout(resolve, duration));
    const endUsage = process.cpuUsage(startUsage);
    
    const totalUsage = endUsage.user + endUsage.system;
    return (totalUsage / (duration * 1000)) * 100; // 转换为百分比
  }

  /**
   * 创建性能基准测试
   */
  static async benchmark<T>(
    name: string,
    fn: () => Promise<T>,
    iterations: number = 100
  ): Promise<{
    name: string;
    iterations: number;
    totalTime: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
    results: T[];
  }> {
    const results: T[] = [];
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const { result, duration } = await this.measureTime(fn);
      results.push(result);
      times.push(duration);
    }

    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    return {
      name,
      iterations,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      results,
    };
  }
}

// 导出便捷方法
export const measureTime = PerformanceUtils.measureTime;
export const measureTimeSync = PerformanceUtils.measureTimeSync;
export const getMemoryUsage = PerformanceUtils.getMemoryUsage;
export const getCPUUsage = PerformanceUtils.getCPUUsage;
export const benchmark = PerformanceUtils.benchmark;

// 全局性能工具
declare global {
  const _performanceUtils: typeof PerformanceUtils;
}

globalThis._performanceUtils = PerformanceUtils;