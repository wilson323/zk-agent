/**
 * Performance Optimizers Types
 * 性能优化工具类型定义
 * 
 * 这个文件包含了性能优化工具的所有类型定义，
 * 用于在TypeScript文件中导入，避免直接导入TSX文件的问题。
 */

// =============================================================================
// 懒加载配置
// =============================================================================

/**
 * 懒加载选项配置
 */
export interface LazyLoadOptions {
  /** 根元素边距 */
  rootMargin?: string;
  /** 触发阈值 */
  threshold?: number | number[];
  /** 是否只触发一次 */
  triggerOnce?: boolean;
  /** 占位符组件 */
  placeholder?: React.ComponentType;
  /** 错误回调 */
  onError?: (error: Error) => void;
  /** 加载完成回调 */
  onLoad?: () => void;
}

// =============================================================================
// 虚拟化配置
// =============================================================================

/**
 * 虚拟化配置
 */
export interface VirtualizationConfig {
  /** 容器高度 */
  containerHeight: number;
  /** 项目高度（固定）或高度计算函数 */
  itemHeight: number | ((index: number, item: any) => number);
  /** 缓冲区大小 */
  bufferSize?: number;
  /** 滚动节流延迟 */
  scrollThrottle?: number;
  /** 是否启用动态高度 */
  dynamicHeight?: boolean;
}

// =============================================================================
// 防抖和节流配置
// =============================================================================

/**
 * 防抖选项
 */
export interface DebounceOptions {
  /** 延迟时间（毫秒） */
  delay: number;
  /** 是否立即执行 */
  immediate?: boolean;
  /** 最大等待时间 */
  maxWait?: number;
}

/**
 * 节流选项
 */
export interface ThrottleOptions {
  /** 延迟时间（毫秒） */
  delay: number;
  /** 是否在开始时执行 */
  leading?: boolean;
  /** 是否在结束时执行 */
  trailing?: boolean;
}

// =============================================================================
// 内存监控配置
// =============================================================================

/**
 * 内存监控配置
 */
export interface MemoryMonitorConfig {
  /** 监控间隔（毫秒） */
  interval?: number;
  /** 内存使用阈值（MB） */
  threshold?: number;
  /** 警告回调 */
  onWarning?: (usage: number) => void;
  /** 错误回调 */
  onError?: (usage: number) => void;
}

// =============================================================================
// 性能指标
// =============================================================================

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  /** 首次内容绘制时间 */
  fcp?: number;
  /** 最大内容绘制时间 */
  lcp?: number;
  /** 首次输入延迟 */
  fid?: number;
  /** 累积布局偏移 */
  cls?: number;
  /** 首次字节时间 */
  ttfb?: number;
  /** 内存使用量 */
  memoryUsage?: number;
  /** 渲染时间 */
  renderTime?: number;
}

// =============================================================================
// 性能优化工具类型
// =============================================================================

/**
 * 性能优化工具集合类型
 */
export interface PerformanceOptimizers {
  // 懒加载
  LazyLoad: React.ComponentType<any>;
  useLazyLoad: (options?: LazyLoadOptions) => {
    ref: React.RefObject<HTMLElement>;
    isVisible: boolean;
    isLoaded: boolean;
  };
  
  // 虚拟化
  VirtualList: React.ComponentType<any>;
  useVirtualization: (config: VirtualizationConfig) => any;
  
  // 防抖节流
  useDebounce: <T extends (...args: any[]) => any>(callback: T, options: DebounceOptions) => T;
  useThrottle: <T extends (...args: any[]) => any>(callback: T, options: ThrottleOptions) => T;
  
  // 内存监控
  useMemoryMonitor: (config?: MemoryMonitorConfig) => {
    usage: number;
    isHigh: boolean;
    cleanup: () => void;
  };
  
  // 性能监控
  usePerformanceMonitor: () => {
    metrics: PerformanceMetrics;
    startMeasure: (name: string) => void;
    endMeasure: (name: string) => number;
  };
  
  // 组件大小监控
  useComponentSizeMonitor: (ref: React.RefObject<HTMLElement>) => {
    width: number;
    height: number;
  };
  
  // 批量更新
  useBatchedUpdates: () => {
    batchUpdate: (callback: () => void) => void;
    flushUpdates: () => void;
  };
  
  // 批量DOM操作
  BatchedDOMOperations: {
    batch: (operations: (() => void)[]) => void;
    flush: () => void;
  };
  
  getBatchedDOMOperations: () => {
    batch: (operations: (() => void)[]) => void;
    flush: () => void;
  };
}