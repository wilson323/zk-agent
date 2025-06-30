/**
 * @file lib/services/stats-service.ts
 * @description Statistics service for handling usage stats and analytics.
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { db } from '../database/enhanced-database-manager';
import { NextRequest } from 'next/server';

/**
 * Creates a usage stats record.
 *
 * @param {object} data - The usage stats data.
 * @returns {Promise<object>} The created usage stats record.
 */
export const createUsageStats = async ({
  userId,
  agentType,
  action,
  metadata = {},
  req,
}: {
  userId: string;
  agentType: string;
  action: string;
  metadata?: Record<string, any>;
  req?: NextRequest;
}) => {
  const enrichedMetadata = {
    ...metadata,
    userAgent: req?.headers.get('user-agent'),
    ip: req?.headers.get('x-forwarded-for') || req?.headers.get('x-real-ip'),
  };

  return db?.usageStats
    .create({
      data: {
        userId,
        agentType,
        action,
        metadata: enrichedMetadata,
      },
    })
    .catch((error) => {
      console.error(`Failed to log ${action}:`, error);
      return null;
    });
};

/**
 * Gets usage stats for a user.
 *
 * @param {string} userId - The user ID.
 * @returns {Promise<object>} The usage stats.
 */
export const getUserStats = async (userId: string) => {
  const stats = await db?.usageStats.groupBy({
    by: ['agentType'],
    where: { userId },
    _count: { id: true },
  });

  return stats;
};

/**
 * Gets usage stats summary.
 *
 * @param {object} options - The options for fetching stats.
 * @returns {Promise<object>} The stats summary.
 */
export const getStatsSummary = async ({
  startDate,
  endDate,
  agentType,
}: {
  startDate?: Date;
  endDate?: Date;
  agentType?: string;
}) => {
  const where = {
    ...(startDate && { createdAt: { gte: startDate } }),
    ...(endDate && { createdAt: { lte: endDate } }),
    ...(agentType && { agentType }),
  };

  const [totalCount, actionBreakdown, userBreakdown] = await Promise.all([
    db?.usageStats.count({ where }),
    db?.usageStats.groupBy({
      by: ['action'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),
    enhancedDb.prisma.usageStats.groupBy({
      by: ['userId'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
  ]);

  return {
    totalCount,
    actionBreakdown,
    topUsers: userBreakdown,
  };
};