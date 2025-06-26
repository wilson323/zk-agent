// @ts-nocheck

/**
 * @file Redis Cache Strategy
 * @description Redis缓存策略配置
 */

export const REDIS_CACHE_STRATEGY = {
  // 智能体数据缓存
  agents: {
    ttl: 30 * 60, // 30分钟
    tags: ['agents', 'public'],
    compress: true,
    keyPattern: 'agents:*',
  },
  // 用户会话缓存
  sessions: {
    ttl: 24 * 60 * 60, // 24小时
    tags: ['sessions', 'auth'],
    compress: false,
    keyPattern: 'sessions:*',
  },
  // API响应缓存
  apiResponses: {
    ttl: 5 * 60, // 5分钟
    tags: ['api', 'responses'],
    compress: true,
    keyPattern: 'api:*',
  },
  // 搜索结果缓存
  searchResults: {
    ttl: 10 * 60, // 10分钟
    tags: ['search', 'results'],
    compress: true,
    keyPattern: 'search:*',
  },
};

export const CACHE_PERFORMANCE_CONFIG = {
  targetHitRate: 0.9,
  maxMemoryUsage: 512 * 1024 * 1024, // 512MB
  evictionPolicy: 'allkeys-lru',
  monitoring: {
    enabled: true,
    interval: 60000, // 1分钟
    alertThreshold: 0.8, // 80%内存使用率告警
  },
};
