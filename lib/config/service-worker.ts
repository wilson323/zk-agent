// @ts-nocheck

/**
 * @file Service Worker Configuration
 * @description Service Worker缓存策略配置 - 第二阶段优化版本
 */

// 缓存策略枚举
export enum CacheStrategy {
  CACHE_FIRST = 'CacheFirst',
  NETWORK_FIRST = 'NetworkFirst',
  STALE_WHILE_REVALIDATE = 'StaleWhileRevalidate',
  NETWORK_ONLY = 'NetworkOnly',
  CACHE_ONLY = 'CacheOnly'
}

// 缓存配置接口 - 增强版
interface CacheConfig {
  pattern: RegExp;
  strategy: CacheStrategy;
  cacheName: string;
  maxEntries: number;
  maxAgeSeconds: number;
  networkTimeoutSeconds?: number;
  cacheableResponse?: {
    statuses: number[];
    headers?: Record<string, string>;
  };
  backgroundSync?: boolean;
  broadcastUpdate?: boolean;
  // 新增性能优化选项
  priority?: 'high' | 'normal' | 'low'; // 缓存优先级
  compression?: boolean; // 启用压缩
  prefetch?: boolean; // 预取资源
  warmupCache?: boolean; // 预热缓存
  adaptiveTimeout?: boolean; // 自适应超时
  intelligentPurge?: boolean; // 智能清理
  metrics?: {
    trackHitRate?: boolean;
    trackResponseTime?: boolean;
    trackBandwidthSaving?: boolean;
  };
  fallbackStrategy?: CacheStrategy; // 降级策略
  conditionalCaching?: {
    userAgent?: RegExp;
    connectionType?: string[];
    timeOfDay?: { start: number; end: number };
  };
}

export const SW_CONFIG = {
  // 缓存策略
  cacheStrategies: {
    // 静态资源 - Cache First (高性能优化版)
    static: {
      pattern: /\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ico|webp|avif)$/,
      strategy: CacheStrategy.CACHE_FIRST,
      cacheName: 'static-cache-v3',
      maxEntries: 200, // 增加缓存容量
      maxAgeSeconds: 30 * 24 * 60 * 60, // 30天
      cacheableResponse: {
        statuses: [0, 200, 206],
      },
      // 新增优化配置
      priority: 'high',
      compression: true,
      prefetch: true,
      warmupCache: true,
      intelligentPurge: true,
      metrics: {
        trackHitRate: true,
        trackResponseTime: true,
        trackBandwidthSaving: true,
      },
      fallbackStrategy: CacheStrategy.NETWORK_FIRST,
      conditionalCaching: {
        connectionType: ['4g', 'wifi'],
      },
    } as CacheConfig,
    
    // API请求 - 智能自适应缓存策略 (重点优化)
    api: {
      pattern: /\/api\//,
      strategy: CacheStrategy.NETWORK_FIRST,
      cacheName: 'api-cache-v3',
      maxEntries: 150, // 进一步增加缓存条目
      maxAgeSeconds: 15 * 60, // 延长到15分钟
      networkTimeoutSeconds: 3, // 3秒网络超时
      cacheableResponse: {
        statuses: [200, 201, 202, 204], // 只缓存成功响应
        headers: {
          'cache-control': 'public, max-age=900' // 15分钟缓存控制
        }
      },
      backgroundSync: true, // 启用后台同步
      broadcastUpdate: true, // 启用广播更新
      // 智能优化配置
      priority: 'normal',
      compression: true,
      adaptiveTimeout: true, // 自适应超时
      intelligentPurge: true,
      metrics: {
        trackHitRate: true,
        trackResponseTime: true,
        trackBandwidthSaving: true,
      },
      fallbackStrategy: CacheStrategy.STALE_WHILE_REVALIDATE,
      conditionalCaching: {
        connectionType: ['3g', '4g', 'wifi'],
        timeOfDay: { start: 9, end: 18 }, // 工作时间优化
      },
    } as CacheConfig,
    
    // 特殊API - 长期缓存 (新增)
    apiStatic: {
      pattern: /\/api\/(config|constants|metadata)\//,
      strategy: CacheStrategy.CACHE_FIRST,
      cacheName: 'api-static-cache-v2',
      maxEntries: 50,
      maxAgeSeconds: 60 * 60, // 1小时
      cacheableResponse: {
        statuses: [200],
      },
    } as CacheConfig,
    
    // 实时API - 仅网络 (新增)
    apiRealtime: {
      pattern: /\/api\/(chat|stream|websocket)\//,
      strategy: CacheStrategy.NETWORK_ONLY,
      cacheName: 'no-cache',
      maxEntries: 0,
      maxAgeSeconds: 0,
    } as CacheConfig,

    // 页面 - 智能预取缓存策略 (高级优化版)
    pages: {
      pattern: /\//,
      strategy: CacheStrategy.STALE_WHILE_REVALIDATE,
      cacheName: 'page-cache-v3',
      maxEntries: 50, // 大幅增加页面缓存
      maxAgeSeconds: 24 * 60 * 60, // 1天
      networkTimeoutSeconds: 5, // 5秒超时
      cacheableResponse: {
        statuses: [200],
      },
      broadcastUpdate: true,
      // 智能页面优化
      priority: 'normal',
      compression: true,
      prefetch: true, // 启用页面预取
      warmupCache: true,
      adaptiveTimeout: true,
      intelligentPurge: true,
      metrics: {
        trackHitRate: true,
        trackResponseTime: true,
        trackBandwidthSaving: true,
      },
      fallbackStrategy: CacheStrategy.NETWORK_FIRST,
      conditionalCaching: {
        userAgent: /Chrome|Firefox|Safari/,
        connectionType: ['wifi', '4g'],
        timeOfDay: { start: 6, end: 23 }, // 活跃时间优化
      },
    } as CacheConfig,
  },
  
  // 预缓存配置
  precache: {
    enabled: true,
    urls: [
      '/',
      '/chat',
      '/admin',
      '/api/health',
    ],
  },
  
  // 运行时配置
  runtime: {
    skipWaiting: true,
    clientsClaim: true,
    cleanupOutdatedCaches: true,
  },
  
  // 性能监控 - 增强版
  monitoring: {
    enabled: true,
    reportCacheHitRate: true,
    reportNetworkFailures: true,
    reportBandwidthSavings: true,
    reportResponseTimes: true,
    enableRealTimeMetrics: true,
    metricsEndpoint: '/api/sw-metrics',
  },
  
  // 智能预热配置
  intelligentWarmup: {
    enabled: true,
    strategies: {
      userBehaviorPrediction: true, // 基于用户行为预测
      popularContentPrefetch: true, // 热门内容预取
      timeBasedWarmup: true, // 基于时间的预热
      locationBasedPrefetch: true, // 基于位置的预取
    },
    warmupSchedule: {
      morning: { start: 7, end: 9, priority: 'high' },
      lunch: { start: 12, end: 14, priority: 'normal' },
      evening: { start: 18, end: 20, priority: 'high' },
    },
    maxWarmupRequests: 20,
    warmupInterval: 5 * 60 * 1000, // 5分钟
  },
  
  // 自适应优化
  adaptiveOptimization: {
    enabled: true,
    autoAdjustCacheSize: true,
    dynamicTimeoutAdjustment: true,
    intelligentStrategySelection: true,
    performanceBasedPriority: true,
    networkConditionAdaptation: true,
    userPatternLearning: true,
    optimizationInterval: 10 * 60 * 1000, // 10分钟
  },
  
  // 高级功能
  advancedFeatures: {
    enableServiceWorkerUpdate: true,
    enableBackgroundFetch: true,
    enablePushNotifications: false,
    enablePeriodicBackgroundSync: true,
    enableAdvancedCompression: true,
    enableImageOptimization: true,
    enableCriticalResourcePrioritization: true,
  },
};

// 导出缓存策略工厂函数
export const createCacheStrategy = (config: Partial<CacheConfig>) => {
  return {
    ...SW_CONFIG.cacheStrategies.static,
    ...config,
  } as CacheConfig;
};

// 导出性能优化工具
export const PerformanceOptimizer = {
  // 获取最优缓存策略
  getOptimalStrategy: (resourceType: string, networkCondition: string) => {
    if (networkCondition === 'slow') {
      return CacheStrategy.CACHE_FIRST;
    }
    if (resourceType === 'api') {
      return CacheStrategy.NETWORK_FIRST;
    }
    return CacheStrategy.STALE_WHILE_REVALIDATE;
  },
  
  // 动态调整缓存大小
  adjustCacheSize: (hitRate: number, currentSize: number) => {
    if (hitRate > 0.8) {
      return Math.min(currentSize * 1.2, 500);
    }
    if (hitRate < 0.5) {
      return Math.max(currentSize * 0.8, 50);
    }
    return currentSize;
  },
  
  // 智能清理策略
  intelligentPurge: (cacheEntries: any[], maxEntries: number) => {
    return cacheEntries
      .sort((a, b) => {
        // 综合考虑访问频率、最后访问时间和资源大小
        const scoreA = a.accessCount * 0.4 + (Date.now() - a.lastAccess) * 0.3 + a.size * 0.3;
        const scoreB = b.accessCount * 0.4 + (Date.now() - b.lastAccess) * 0.3 + b.size * 0.3;
        return scoreB - scoreA;
      })
      .slice(0, maxEntries);
  },
};
