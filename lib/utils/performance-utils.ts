/**
 * @file 性能优化工具函数库
 * @description 统一的防抖、节流、缓存等性能优化工具函数
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 防抖配置选项
 */
export interface DebounceOptions {
  /** 延迟时间(毫秒) */
  delay: number;
  /** 是否立即执行 */
  immediate?: boolean;
  /** 最大等待时间(毫秒) */
  maxWait?: number;
}

/**
 * 节流配置选项
 */
export interface ThrottleOptions {
  /** 延迟时间(毫秒) */
  delay: number;
  /** 是否在开始时执行 */
  leading?: boolean;
  /** 是否在结束时执行 */
  trailing?: boolean;
}

/**
 * 缓存配置选项
 */
export interface CacheOptions {
  /** 缓存过期时间(毫秒) */
  ttl?: number;
  /** 最大缓存数量 */
  maxSize?: number;
  /** 是否启用LRU策略 */
  lru?: boolean;
}

// ============================================================================
// 防抖函数
// ============================================================================

/**
 * 创建防抖函数
 * 
 * 防抖函数会延迟执行，如果在延迟期间再次调用，则重新计时。
 * 适用于搜索输入、窗口大小调整等场景。
 * 
 * @param func 要防抖的函数
 * @param wait 延迟时间(毫秒)
 * @param options 防抖配置选项
 * @returns 防抖后的函数
 * 
 * @example
 * ```typescript
 * const debouncedSearch = debounce((query: string) => {
 *   console.log('搜索:', query);
 * }, 300);
 * 
 * // 立即执行版本
 * const immediateDebounce = debounce(handleClick, 1000, { immediate: true });
 * ```
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: Omit<DebounceOptions, 'delay'> = {}
): (...args: Parameters<T>) => void {
  const { immediate = false, maxWait } = options;
  
  let timeout: NodeJS.Timeout | null = null;
  let maxTimeout: NodeJS.Timeout | null = null;
  let lastCallTime = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    
    // 立即执行逻辑
    if (immediate && now - lastCallTime > wait) {
      lastCallTime = now;
      func(...args);
      return;
    }
    
    // 清除之前的定时器
    if (timeout) {
      clearTimeout(timeout);
    }
    
    // 设置新的定时器
    timeout = setTimeout(() => {
      lastCallTime = Date.now();
      func(...args);
      
      if (maxTimeout) {
        clearTimeout(maxTimeout);
        maxTimeout = null;
      }
    }, wait);
    
    // 最大等待时间逻辑
    if (maxWait && !maxTimeout) {
      maxTimeout = setTimeout(() => {
        lastCallTime = Date.now();
        func(...args);
        
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
      }, maxWait);
    }
  };
}

// ============================================================================
// 节流函数
// ============================================================================

/**
 * 创建节流函数
 * 
 * 节流函数会限制函数的执行频率，在指定时间间隔内最多执行一次。
 * 适用于滚动事件、鼠标移动等高频事件。
 * 
 * @param func 要节流的函数
 * @param wait 时间间隔(毫秒)
 * @param options 节流配置选项
 * @returns 节流后的函数
 * 
 * @example
 * ```typescript
 * const throttledScroll = throttle((event: Event) => {
 *   console.log('滚动事件:', event);
 * }, 100);
 * 
 * // 只在结束时执行
 * const trailingThrottle = throttle(handleResize, 200, { 
 *   leading: false, 
 *   trailing: true 
 * });
 * ```
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: Omit<ThrottleOptions, 'delay'> = {}
): (...args: Parameters<T>) => void {
  const { leading = true, trailing = true } = options;
  
  let lastCallTime = 0;
  let timeout: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;
    
    lastArgs = args;
    
    // 首次调用或超过等待时间
    if (timeSinceLastCall >= wait) {
      if (leading) {
        lastCallTime = now;
        func(...args);
        return;
      } else {
        // 不立即执行，设置定时器
        if (timeout) {
          clearTimeout(timeout);
        }
        
        timeout = setTimeout(() => {
          lastCallTime = Date.now();
          if (lastArgs) {
            func(...lastArgs);
          }
        }, wait - timeSinceLastCall);
      }
    } else {
      // 在等待期间，设置尾随调用
      if (trailing) {
        if (timeout) {
          clearTimeout(timeout);
        }
        
        timeout = setTimeout(() => {
          lastCallTime = Date.now();
          if (lastArgs) {
            func(...lastArgs);
          }
        }, wait - timeSinceLastCall);
      }
    }
  };
}

// ============================================================================
// 性能测量工具类
// ============================================================================

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
