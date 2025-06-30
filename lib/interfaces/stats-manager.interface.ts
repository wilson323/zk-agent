/**
 * @file 统计服务接口定义
 * @description 定义统计服务的标准接口，确保类型安全和一致性
 * @author ZK-Agent Team
 * @date 2025-06-29
 */

import { NextRequest } from 'next/server';

export interface IStatsService {
  createUsageStats(data: {
    userId: string;
    agentType: string;
    action: string;
    metadata?: Record<string, any>;
    req?: NextRequest;
  }): Promise<any>;
  getUserStats(userId: string): Promise<any>;
  getStatsSummary(options: {
    startDate?: Date;
    endDate?: Date;
    agentType?: string;
  }): Promise<any>;
}
