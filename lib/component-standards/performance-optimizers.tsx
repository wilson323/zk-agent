/**
 * 性能优化工具库
 * 基于 React 18+ 和现代前端性能优化最佳实践
 */

import * as React from 'react';
import { type ClassValue } from 'clsx';

// =============================================================================
// 类型定义
// =============================================================================

/**
 * 懒加载配置
 */
interface LazyLoadOptions {
  threshold?: number;
  rootMargin?: string;
  fallback?: React.ComponentType;
  retryCount?: number;
  retryDelay?: number;
}

/**
 * 虚拟化配置
 */
interface VirtualizationConfig {
  itemHeight: number | ((index: number) => number);
  containerHeight: number;
  overscan?: number;
  scrollingDelay?: number;
  estimatedItemSize?: number;
}

/**
 * 防抖配置
 */
interface DebounceOptions {
  delay: number;
  immediate?: boolean;
  maxWait?: number;
}

/**
 * 节流配置
 */
interface ThrottleOptions {
  delay: number;
  leading?: boolean;
  trailing?: boolean;
}

/**
 * 内存监控配置
 */
interface MemoryMonitorConfig {
  threshold?: number; // MB
  interval?: number; // ms
  onThresholdExceeded?: (usage: number) => void;
}

/**
 * 性能指标
 */
interface PerformanceMetrics {
  renderTime: number;
  componentCount: number;
  memoryUsage?: number;
  bundleSize?: number;
}

// =============================================================================
// React 组件优化
// =============================================================================

/**
 * 创建优化的 memo 组件
 * 基于 React.memo 和自定义比较函数
 */
export function createOptimizedMemo<P extends Record<string, any>>(
  Component: React.ComponentType<P>,
  propsAreEqual?: (prevProps: P, nextProps: P) => boolean
): React.MemoExoticComponent<React.ComponentType<P>> {
  const defaultCompare = (prevProps: P, nextProps: P): boolean => {
    const prevKeys = Object.keys(prevProps);
    const nextKeys = Object.keys(nextProps);
    
    if (prevKeys.length !== nextKeys.length) {
      return false;
    }
    
    for (const key of prevKeys) {
      if (prevProps[key] !== nextProps[key]) {
        // 深度比较对象和数组
        if (typeof prevProps[key] === 'object' && typeof nextProps[key] === 'object') {
          if (!shallowEqual(prevProps[key], nextProps[key])) {
            return false;
          }
        } else {
          return false;
        }
      }
    }
    
    return true;
  };
  
  return React.memo(Component, propsAreEqual || defaultCompare);
}

/**
 * 浅比较工具函数
 */
function shallowEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) {return true;}
  
  if (obj1 == null || obj2 == null) {return false;}
  
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) {return false;}
    for (let i = 0; i < obj1.length; i++) {
      if (obj1[i] !== obj2[i]) {return false;}
    }
    return true;
  }
  
  if (typeof obj1 === 'object' && typeof obj2 === 'object') {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) {return false;}
    
    for (const key of keys1) {
      if (obj1[key] !== obj2[key]) {return false;}
    }
    return true;
  }
  
  return false;
}

/**
 * React Hook: 稳定的回调函数
 * 基于 useCallback 和依赖项优化
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  const callbackRef = React.useRef(callback);
  const stableDeps = useStableDeps(deps);
  
  React.useEffect(() => {
    callbackRef.current = callback;
  });
  
  return React.useCallback(
    ((...args: any[]) => callbackRef.current(...args)) as T,
    stableDeps
  );
}

/**
 * React Hook: 稳定的依赖项
 */
function useStableDeps(deps: React.DependencyList): React.DependencyList {
  const stableDepsRef = React.useRef<React.DependencyList>(deps);
  
  const hasChanged = deps.some((dep, index) => {
    return dep !== stableDepsRef.current[index];
  });
  
  if (hasChanged) {
    stableDepsRef.current = deps;
  }
  
  return stableDepsRef.current;
}

/**
 * React Hook: 优化的状态更新
 * 基于 useState 和批量更新
 */
export function useOptimizedState<T>(
  initialState: T | (() => T)
): [T, (newState: T | ((prevState: T) => T)) => void] {
  const [state, setState] = React.useState(initialState);
  const pendingUpdatesRef = React.useRef<Array<(prevState: T) => T>>([]);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  const optimizedSetState = React.useCallback(
    (newState: T | ((prevState: T) => T)) => {
      if (typeof newState === 'function') {
        pendingUpdatesRef.current.push(newState as (prevState: T) => T);
      } else {
        pendingUpdatesRef.current.push(() => newState);
      }
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        setState(prevState => {
          let newState = prevState;
          for (const update of pendingUpdatesRef.current) {
            newState = update(newState);
          }
          pendingUpdatesRef.current = [];
          return newState;
        });
      }, 0);
    },
    []
  );
  
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return [state, optimizedSetState];
}

// =============================================================================
// 懒加载和代码分割
// =============================================================================

/**
 * 创建懒加载组件
 * 基于 React.lazy 和 Suspense
 */
export function createLazyComponent<P extends Record<string, any>>(
  importFn: () => Promise<{ default: React.ComponentType<P> }>,
  options: LazyLoadOptions = {}
): React.LazyExoticComponent<React.ComponentType<P>> {
  const {
    fallback: Fallback,
    retryCount = 3,
    retryDelay = 1000
  } = options;
  
  let retries = 0;
  
  const retryImport = async (): Promise<{ default: React.ComponentType<P> }> => {
    try {
      return await importFn();
    } catch (error) {
      if (retries < retryCount) {
        retries++;
        await new Promise(resolve => setTimeout(resolve, retryDelay * retries));
        return retryImport();
      }
      throw error;
    }
  };
  
  return React.lazy(retryImport);
}

/**
 * React Hook: 图片懒加载
 * 基于 Intersection Observer API
 */
export function useImageLazyLoad(
  options: LazyLoadOptions = {}
) {
  const {
    threshold = 0.1,
    rootMargin = '50px'
  } = options;
  
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isInView, setIsInView] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);
  
  React.useEffect(() => {
    const img = imgRef.current;
    if (!img) {return;}
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(img);
        }
      },
      { threshold, rootMargin }
    );
    
    observer.observe(img);
    
    return () => {
      observer.unobserve(img);
    };
  }, [threshold, rootMargin]);
  
  const handleLoad = React.useCallback(() => {
    setIsLoaded(true);
  }, []);
  
  return {
    imgRef,
    isLoaded,
    isInView,
    handleLoad
  };
}

/**
 * React Hook: 内容懒加载
 */
export function useContentLazyLoad<T extends HTMLElement>(
  options: LazyLoadOptions = {}
) {
  const {
    threshold = 0.1,
    rootMargin = '50px'
  } = options;
  
  const [isInView, setIsInView] = React.useState(false);
  const elementRef = React.useRef<T>(null);
  
  React.useEffect(() => {
    const element = elementRef.current;
    if (!element) {return;}
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold, rootMargin }
    );
    
    observer.observe(element);
    
    return () => {
      observer.unobserve(element);
    };
  }, [threshold, rootMargin]);
  
  return { elementRef, isInView };
}

// =============================================================================
// 虚拟化和大列表优化
// =============================================================================

/**
 * React Hook: 虚拟化列表
 * 基于窗口化技术优化大列表渲染
 */
export function useVirtualization<T>(
  items: T[],
  config: VirtualizationConfig
) {
  const {
    itemHeight,
    containerHeight,
    overscan = 5,
    scrollingDelay = 150
  } = config;
  
  const [scrollTop, setScrollTop] = React.useState(0);
  const [isScrolling, setIsScrolling] = React.useState(false);
  const scrollTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  // 计算可见范围
  const getItemHeight = React.useCallback(
    (index: number): number => {
      return typeof itemHeight === 'function' ? itemHeight(index) : itemHeight;
    },
    [itemHeight]
  );
  
  const getItemOffset = React.useCallback(
    (index: number): number => {
      if (typeof itemHeight === 'number') {
        return index * itemHeight;
      }
      
      let offset = 0;
      for (let i = 0; i < index; i++) {
        offset += getItemHeight(i);
      }
      return offset;
    },
    [getItemHeight, itemHeight]
  );
  
  const visibleRange = React.useMemo(() => {
    const startIndex = Math.floor(scrollTop / (typeof itemHeight === 'number' ? itemHeight : 50));
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / (typeof itemHeight === 'number' ? itemHeight : 50))
    );
    
    return {
      start: Math.max(0, startIndex - overscan),
      end: Math.min(items.length - 1, endIndex + overscan)
    };
  }, [scrollTop, containerHeight, itemHeight, items.length, overscan]);
  
  // 可见项目
  const visibleItems = React.useMemo(() => {
    const result = [];
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      result.push({
        index: i,
        item: items[i],
        offset: getItemOffset(i),
        height: getItemHeight(i)
      });
    }
    return result;
  }, [visibleRange, items, getItemOffset, getItemHeight]);
  
  // 总高度
  const totalHeight = React.useMemo(() => {
    if (typeof itemHeight === 'number') {
      return items.length * itemHeight;
    }
    
    let height = 0;
    for (let i = 0; i < items.length; i++) {
      height += getItemHeight(i);
    }
    return height;
  }, [items.length, itemHeight, getItemHeight]);
  
  // 滚动处理
  const handleScroll = React.useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const newScrollTop = event.currentTarget.scrollTop;
      setScrollTop(newScrollTop);
      setIsScrolling(true);
      
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, scrollingDelay);
    },
    [scrollingDelay]
  );
  
  React.useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);
  
  return {
    visibleItems,
    totalHeight,
    isScrolling,
    handleScroll,
    scrollTop
  };
}

/**
 * 虚拟化列表组件
 */
interface VirtualListProps<T> {
  items: T[];
  itemHeight: number | ((index: number) => number);
  containerHeight: number;
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  overscan?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className,
  style
}: VirtualListProps<T>) {
  const {
    visibleItems,
    totalHeight,
    handleScroll
  } = useVirtualization(items, {
    itemHeight,
    containerHeight,
    overscan
  });
  
  return (
    <div
      className={className}
      style={{
        height: containerHeight,
        overflow: 'auto',
        ...style
      }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ index, item, offset, height }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: offset,
              left: 0,
              right: 0,
              height
            }}
          >
            {renderItem(item, index, {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// 防抖和节流
// =============================================================================

import { debounce, throttle } from '../utils/performance-utils';

/**
 * React Hook: 防抖值
 */
export function useDebounce<T>(
  value: T,
  options: DebounceOptions
): T {
  const {
    delay,
    immediate = false,
    maxWait
  } = options;
  
  const [debouncedValue, setDebouncedValue] = React.useState(value);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const maxTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const lastCallTimeRef = React.useRef<number>(0);
  
  React.useEffect(() => {
    const now = Date.now();
    
    // 立即执行逻辑
    if (immediate && now - lastCallTimeRef.current > delay) {
      setDebouncedValue(value);
      lastCallTimeRef.current = now;
      return;
    }
    
    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // 设置新的定时器
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
      lastCallTimeRef.current = Date.now();
      
      if (maxTimeoutRef.current) {
        clearTimeout(maxTimeoutRef.current);
        maxTimeoutRef.current = null;
      }
    }, delay);
    
    // 最大等待时间逻辑
    if (maxWait && !maxTimeoutRef.current) {
      maxTimeoutRef.current = setTimeout(() => {
        setDebouncedValue(value);
        lastCallTimeRef.current = Date.now();
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }, maxWait);
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (maxTimeoutRef.current) {
        clearTimeout(maxTimeoutRef.current);
      }
    };
  }, [value, delay, immediate, maxWait]);
  
  return debouncedValue;
}

/**
 * React Hook: 防抖回调
 * @param callback 回调函数
 * @param delay 延迟时间
 * @param deps 依赖数组
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T {
  const callbackRef = React.useRef(callback);

  // 更新回调引用
  React.useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // 创建防抖函数
  const debouncedCallback = React.useMemo(() => {
    return debounce((...args: Parameters<T>) => {
      callbackRef.current(...args);
    }, delay) as T;
  }, [delay, ...deps]);

  return debouncedCallback;
}

/**
 * React Hook: 节流回调
 * @param callback 回调函数
 * @param delay 延迟时间
 * @param options 节流配置选项
 * @param deps 依赖数组
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  options: { leading?: boolean; trailing?: boolean } = {},
  deps: React.DependencyList = []
): T {
  const callbackRef = React.useRef(callback);
  
  // 更新回调引用
  React.useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  // 创建节流函数
  const throttledCallback = React.useMemo(() => {
    return throttle((...args: Parameters<T>) => {
      callbackRef.current(...args);
    }, delay, options) as T;
  }, [delay, options.leading, options.trailing, ...deps]);
  
  return throttledCallback;
}

// =============================================================================
// 内存和性能监控
// =============================================================================

/**
 * React Hook: 内存使用监控
 */
export function useMemoryMonitor(
  config: MemoryMonitorConfig = {}
) {
  const {
    threshold = 100, // 100MB
    interval = 5000, // 5秒
    onThresholdExceeded
  } = config;
  
  const [memoryUsage, setMemoryUsage] = React.useState<number>(0);
  const [isSupported, setIsSupported] = React.useState(false);
  
  React.useEffect(() => {
    // 检查浏览器支持
    const supported = 'memory' in performance;
    setIsSupported(supported);
    
    if (!supported) {return;}
    
    const checkMemory = () => {
      const memory = (performance as any).memory;
      if (memory) {
        const usedMB = memory.usedJSHeapSize / 1024 / 1024;
        setMemoryUsage(usedMB);
        
        if (usedMB > threshold && onThresholdExceeded) {
          onThresholdExceeded(usedMB);
        }
      }
    };
    
    checkMemory();
    const intervalId = setInterval(checkMemory, interval);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [threshold, interval, onThresholdExceeded]);
  
  return {
    memoryUsage,
    isSupported,
    threshold
  };
}

/**
 * React Hook: 渲染性能监控
 */
export function useRenderPerformance(
  componentName: string = 'Component'
) {
  const renderCountRef = React.useRef(0);
  const renderTimesRef = React.useRef<number[]>([]);
  const [metrics, setMetrics] = React.useState<PerformanceMetrics>({
    renderTime: 0,
    componentCount: 0
  });
  
  React.useEffect(() => {
    const startTime = performance.now();
    renderCountRef.current++;
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      renderTimesRef.current.push(renderTime);
      
      // 保持最近 100 次渲染记录
      if (renderTimesRef.current.length > 100) {
        renderTimesRef.current = renderTimesRef.current.slice(-100);
      }
      
      const avgRenderTime = renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length;
      
      setMetrics({
        renderTime: avgRenderTime,
        componentCount: renderCountRef.current
      });
      
      // 开发环境下的性能警告
      if (process.env.NODE_ENV === 'development') {
        if (renderTime > 16) { // 超过一帧时间
          console.warn(
            `${componentName} 渲染时间过长: ${renderTime.toFixed(2)}ms`
          );
        }
        
        if (renderCountRef.current > 100 && avgRenderTime > 10) {
          console.warn(
            `${componentName} 平均渲染时间: ${avgRenderTime.toFixed(2)}ms (${renderCountRef.current} 次渲染)`
          );
        }
      }
    };
  });
  
  const resetMetrics = React.useCallback(() => {
    renderCountRef.current = 0;
    renderTimesRef.current = [];
    setMetrics({
      renderTime: 0,
      componentCount: 0
    });
  }, []);
  
  return {
    metrics,
    resetMetrics
  };
}

/**
 * React Hook: 组件大小监控
 */
export function useComponentSizeMonitor() {
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  const elementRef = React.useRef<HTMLElement>(null);
  
  React.useEffect(() => {
    const element = elementRef.current;
    if (!element) {return;}
    
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });
    
    resizeObserver.observe(element);
    
    return () => {
      resizeObserver.unobserve(element);
    };
  }, []);
  
  return {
    elementRef,
    size
  };
}

// =============================================================================
// 批量操作优化
// =============================================================================

/**
 * React Hook: 批量状态更新
 */
export function useBatchedUpdates<T>() {
  const [state, setState] = React.useState<T[]>([]);
  const batchRef = React.useRef<T[]>([]);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  const addToBatch = React.useCallback((item: T) => {
    batchRef.current.push(item);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setState(prevState => [...prevState, ...batchRef.current]);
      batchRef.current = [];
    }, 0);
  }, []);
  
  const clearBatch = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    batchRef.current = [];
    setState([]);
  }, []);
  
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return {
    state,
    addToBatch,
    clearBatch
  };
}

/**
 * 批量 DOM 操作工具
 */
export class BatchedDOMOperations {
  private operations: Array<() => void> = [];
  private isScheduled = false;
  
  /**
   * 添加 DOM 操作到批次
   */
  add(operation: () => void): void {
    this.operations.push(operation);
    this.schedule();
  }
  
  /**
   * 调度批量执行
   */
  private schedule(): void {
    if (this.isScheduled) {return;}
    
    this.isScheduled = true;
    
    requestAnimationFrame(() => {
      this.flush();
    });
  }
  
  /**
   * 执行所有操作
   */
  private flush(): void {
    const operations = this.operations.slice();
    this.operations = [];
    this.isScheduled = false;
    
    for (const operation of operations) {
      operation();
    }
  }
  
  /**
   * 清除所有待执行操作
   */
  clear(): void {
    this.operations = [];
    this.isScheduled = false;
  }
}

// 全局批量 DOM 操作实例
let globalBatchedDOM: BatchedDOMOperations | null = null;

/**
 * 获取全局批量 DOM 操作实例
 */
export function getBatchedDOMOperations(): BatchedDOMOperations {
  if (!globalBatchedDOM) {
    globalBatchedDOM = new BatchedDOMOperations();
  }
  return globalBatchedDOM;
}

// =============================================================================
// 导出所有工具
// =============================================================================

export const performanceOptimizers = {
  // React 优化
  createOptimizedMemo,
  useStableCallback,
  useOptimizedState,
  
  // 懒加载
  createLazyComponent,
  useImageLazyLoad,
  useContentLazyLoad,
  
  // 虚拟化
  useVirtualization,
  VirtualList,
  
  // 防抖节流
  useDebounce,
  useDebouncedCallback,
  useThrottledCallback,
  
  // 性能监控
  useMemoryMonitor,
  useRenderPerformance,
  useComponentSizeMonitor,
  
  // 批量操作
  useBatchedUpdates,
  BatchedDOMOperations,
  getBatchedDOMOperations
} as const;

export type PerformanceOptimizers = typeof performanceOptimizers;