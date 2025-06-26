// @ts-nocheck
/**
 * @file lib/database/index.ts
 * @description 数据库连接管理和Prisma客户端初始化
 * @author zk-agent开发团队
 * @lastUpdate 2024-12-19
 * @updateLog
 *   - 2024-12-19 初始创建数据库连接服务
 */

import { PrismaClient } from '@prisma/client';

// 全局Prisma客户端类型声明
declare global {
  var __prisma: PrismaClient | undefined;
}

// 创建Prisma客户端实例
class DatabaseService {
  private static instance: PrismaClient;

  static getInstance(): PrismaClient {
    if (!DatabaseService.instance) {
      DatabaseService.instance = globalThis.__prisma ?? new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        errorFormat: 'pretty',
      });

      if (process.env.NODE_ENV !== 'production') {
        globalThis.__prisma = DatabaseService.instance;
      }
    }

    return DatabaseService.instance;
  }

  static async connect(): Promise<void> {
    try {
      await DatabaseService.getInstance().$connect();
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  static async disconnect(): Promise<void> {
    try {
      await DatabaseService.getInstance().$disconnect();
      console.log('✅ Database disconnected successfully');
    } catch (error) {
      console.error('❌ Database disconnection failed:', error);
      throw error;
    }
  }

  static async healthCheck(): Promise<boolean> {
    try {
      await DatabaseService.getInstance().$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('❌ Database health check failed:', error);
      return false;
    }
  }

  static async runTransaction<T>(
    callback: (prisma: PrismaClient) => Promise<T>
  ): Promise<T> {
    const prisma = DatabaseService.getInstance();
    return await prisma.$transaction(callback);
  }
}

// 导出Prisma客户端实例
export const prisma = DatabaseService.getInstance();

// 导出数据库服务
export { DatabaseService };

// 清理函数（在应用关闭时调用）
export const cleanup = async () => {
  await DatabaseService.disconnect();
};

// 进程退出时自动清理
if (typeof process !== 'undefined') {
  process.on('beforeExit', cleanup);
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
} 