/**
 * 统一的缓存类型定义
 * 整合所有缓存管理器的重复接口定义
 */

// 导入统一的缓存枚举定义
import { CachePriority, CacheStrategy, CacheLayer } from '@/lib/types/enums';

// 重新导出以保持向后兼容性
export { CachePriority, CacheStrategy, CacheLayer };

// 统一的缓存项接口
export interface CacheItem<T = any> {
  readonly key: string;
  readonly value: T;
  readonly ttl?: number;
  readonly expiry?: number;
  readonly createdAt: number;
  readonly lastAccessed: number;
  readonly accessCount: number;
  readonly hits?: number;
  readonly size: number;
  readonly tags?: string[];
  readonly priority?: CachePriority;
  readonly compressed?: boolean;
}

// 统一的缓存配置接口
export interface CacheConfig {
  // 基础配置
  readonly maxSize?: number;           // 最大缓存大小（字节）
  readonly maxMemorySize?: number;     // 最大内存大小（字节）
  readonly maxItems?: number;          // 最大缓存项数
  readonly maxMemoryItems?: number;    // 最大内存项数
  readonly defaultTTL: number;         // 默认TTL（毫秒）
  readonly ttl?: number;               // 兼容字段
  
  // 策略配置
  readonly strategy?: CacheStrategy;
  readonly evictionPolicy?: CacheStrategy;
  
  // 功能开关
  readonly enableCompression?: boolean;
  readonly compressionEnabled?: boolean;
  readonly compressionThreshold?: number;
  readonly enableSerialization?: boolean;
  readonly enableMetrics?: boolean;
  readonly metricsEnabled?: boolean;
  readonly enableRedis?: boolean;
  readonly persistenceEnabled?: boolean;
  
  // 时间配置
  readonly checkPeriod?: number;       // 检查周期（毫秒）
  readonly cleanupInterval?: number;   // 清理间隔（毫秒）
  
  // Redis 配置
  readonly redisUrl?: string;
  
  // 预加载配置
  readonly preloadKeys?: string[];
}

// 统一的缓存选项接口
export interface CacheOptions {
  readonly ttl?: number;
  readonly tags?: string[];
  readonly compress?: boolean;
  readonly priority?: CachePriority;
  readonly layer?: CacheLayer;
  readonly skipMemory?: boolean;
  readonly skipRedis?: boolean;
}

// 统一的缓存统计接口
export interface CacheStats {
  // 基础统计
  readonly hits: number;
  readonly misses: number;
  readonly sets?: number;
  readonly deletes?: number;
  readonly evictions: number;
  readonly hitRate: number;
  
  // 分层统计
  readonly memoryHits?: number;
  readonly memoryMisses?: number;
  readonly redisHits?: number;
  readonly redisMisses?: number;
  readonly totalHits?: number;
  readonly totalMisses?: number;
  
  // 大小统计
  readonly size: number;
  readonly maxSize?: number;
  readonly memoryUsage?: number;
  readonly memoryItems?: number;
  readonly itemCount?: number;
  
  // 性能统计
  readonly averageResponseTime?: number;
  readonly compressionRatio?: number;
  
  // 连接状态
  readonly redisConnected?: boolean;
}

// 统一的缓存指标接口
export interface CacheMetrics {
  readonly operation?: string;
  readonly key?: string;
  readonly layer?: CacheLayer;
  readonly hit?: boolean;
  readonly duration?: number;
  readonly size?: number;
  readonly timestamp: number;
  readonly type?: 'hit' | 'miss' | 'set' | 'delete' | 'evict' | 'clear';
  readonly metadata?: any;
}

// 缓存事件接口
export interface CacheEvent {
  type: 'hit' | 'miss' | 'set' | 'delete' | 'evict' | 'clear';
  key: string;
  timestamp: number;
  layer?: CacheLayer;
  metadata?: any;
}

// 缓存管理器基础接口
export interface ICacheManager<T = any> {
  // 基础操作
  get(key: string, options?: CacheOptions): Promise<T | null>;
  set(key: string, value: T, options?: CacheOptions): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  
  // 批量操作
  mget(keys: string[]): Promise<(T | null)[]>;
  mset(items: Array<{ key: string; value: T; options?: CacheOptions }>): Promise<void>;
  mdelete(keys: string[]): Promise<number>;
  
  // 标签操作
  getByTag(tag: string): Promise<T[]>;
  deleteByTag(tag: string): Promise<number>;
  
  // 统计和监控
  getStats(): CacheStats;
  getMetrics(): CacheMetrics[];
  resetStats(): void;
  
  // 生命周期
  start?(): Promise<void>;
  stop?(): Promise<void>;
  isHealthy?(): boolean;
}

// 缓存工厂接口
export interface ICacheFactory {
  create<T = any>(config: CacheConfig): ICacheManager<T>;
  createMemoryCache<T = any>(config: Partial<CacheConfig>): ICacheManager<T>;
  createRedisCache<T = any>(config: Partial<CacheConfig>): ICacheManager<T>;
  createHybridCache<T = any>(config: Partial<CacheConfig>): ICacheManager<T>;
}