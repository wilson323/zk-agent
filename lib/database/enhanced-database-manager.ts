/**
 * @file lib/database/enhanced-database-manager.ts
 * @description 增强数据库管理器 - 统一代理
 * @author ZK-Agent Team
 * @lastUpdate 2024-12-27
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { Logger } from '../utils/logger';
import { enhancedDb, EnhancedDatabaseConnection, ConnectionState } from './enhanced-connection';
// import { databaseMonitor, DatabaseMonitor } from './monitoring'; // 移除循环依赖
import { IMonitoringService } from './unified-interfaces';
import { IMonitoringService as IMonitoringServiceLegacy } from './monitoring-interfaces';
import { getMonitoringService, getMonitoringServiceSync, isMonitoringInitialized } from './monitoring-registry';
import { ConnectionPoolAnalyzer } from './connection-pool-analyzer';
import { DynamicPoolAdjuster } from './dynamic-pool-adjuster';
import { QueryPerformanceOptimizer } from './query-performance-optimizer';
import { IntelligentCacheManager } from './intelligent-cache-manager';
import { CacheStrategyOptimizer } from './cache-strategy-optimizer';
import { PerformanceMonitorEnhancer } from './performance-monitor-enhancer';
import { PerformanceOptimizationCoordinator } from './performance-optimization-coordinator';

export class EnhancedDatabaseManager {
  private static instance: EnhancedDatabaseManager;
  private logger = new Logger('EnhancedDatabaseManager');

  private constructor() {
    this.logger.info('EnhancedDatabaseManager initialized as a proxy.');
  }

  public static getInstance(): EnhancedDatabaseManager {
    if (!EnhancedDatabaseManager.instance) {
      EnhancedDatabaseManager.instance = new EnhancedDatabaseManager();
    }
    return EnhancedDatabaseManager.instance;
  }

  get prisma(): PrismaClient {
    const client = enhancedDb.getClient();
    if (!client) {
      throw new Error('Database not connected or Prisma client not available.');
    }
    return client;
  }

  get db(): PrismaClient {
    return this.prisma;
  }

  async connect(): Promise<void> {
    await enhancedDb.connect();
  }

  async disconnect(): Promise<void> {
    await enhancedDb.disconnect();
  }

  isConnected(): boolean {
    return enhancedDb.isConnected();
  }

  async executeQuery<T>(queryFn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
    return await enhancedDb.executeQuery(queryFn);
  }

  async executeTransaction<T>(
    operations: (prisma: Prisma.TransactionClient) => Promise<T>,
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    }
  ): Promise<T> {
    return await this.prisma.$transaction(operations, options);
  }

  async healthCheck(): Promise<any> {
    if (isMonitoringInitialized()) {
      const monitoringService = getMonitoringService();
      if (monitoringService) {
        return await monitoringService.getHealthStatus();
      }
    }
    return { status: 'unknown', message: 'Monitoring service not available' };
  }

  get enhancedDb(): EnhancedDatabaseConnection {
    return enhancedDb;
  }

  async getDatabaseMonitor(): Promise<IMonitoringService | null> {
    return isMonitoringInitialized() ? await getMonitoringService() : null;
  }

  get databaseMonitorSync(): IMonitoringService | null {
    return isMonitoringInitialized() ? getMonitoringServiceSync() : null;
  }
  
  get performanceOptimizationCoordinator(): PerformanceOptimizationCoordinator {
    return new PerformanceOptimizationCoordinator();
  }

  get connectionPoolAnalyzer(): ConnectionPoolAnalyzer | null {
    const monitor = this.databaseMonitor;
    return monitor ? new ConnectionPoolAnalyzer(monitor) : null;
  }

  get dynamicPoolAdjuster(): DynamicPoolAdjuster {
    return new DynamicPoolAdjuster();
  }

  get queryPerformanceOptimizer(): QueryPerformanceOptimizer | null {
    const monitor = this.databaseMonitor;
    return monitor ? new QueryPerformanceOptimizer(monitor) : null;
  }

  get intelligentCacheManager(): IntelligentCacheManager {
    return new IntelligentCacheManager();
  }

  get cacheStrategyOptimizer(): CacheStrategyOptimizer {
    return new CacheStrategyOptimizer();
  }

  get performanceMonitorEnhancer(): PerformanceMonitorEnhancer | null {
    const monitor = this.databaseMonitor;
    return monitor ? new PerformanceMonitorEnhancer(monitor) : null;
  }
}

export const enhancedDatabaseManager = EnhancedDatabaseManager.getInstance();

export const db = enhancedDatabaseManager.db;
export const dbQuery = enhancedDatabaseManager.executeQuery.bind(enhancedDatabaseManager);
export const dbTransaction = enhancedDatabaseManager.executeTransaction.bind(enhancedDatabaseManager);