// @ts-nocheck

/**
 * @file Lazy Loading Configuration
 * @description 组件懒加载配置
 */

export const LAZY_LOADING_CONFIG = {
  // 智能体卡片懒加载
  agentCard: {
    threshold: 0.1,
    rootMargin: '50px',
    enablePreload: true,
    preloadDelay: 1000,
  },
  // 图片懒加载
  images: {
    threshold: 0.1,
    rootMargin: '100px',
    enableWebP: true,
    enableAVIF: true,
  },
  // 路由懒加载
  routes: {
    preloadDelay: 2000,
    enablePrefetch: true,
  },
};

export const PERFORMANCE_THRESHOLDS = {
  pageLoadTime: 2000,
  searchResponseTime: 500,
  bundleSize: 512000,
  chunkSize: 256000,
};
