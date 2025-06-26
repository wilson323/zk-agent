/**
 * @file admin\error-logs\export\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { verifyAdminAuth } from '../../../../../lib/auth/middleware';
import { DatabaseService } from '../../../../../lib/database';
import { ErrorCode } from '../../../../../types/core';
import logger from '../../../../../lib/utils/logger';

export const GET = createApiRoute(
  RouteConfigs.protectedGet(),
  async (req: NextRequest, { validatedQuery }) => {
    // 验证管理员权限
    const authResult = await verifyAdminAuth(req);
    if (!authResult.success) {
      return ApiResponseWrapper.error(
        ErrorCode.AUTHORIZATION_ERROR,
        'Unauthorized access',
        null,
        403
      );
    }

    // 验证格式参数
    const format = validatedQuery?.format || 'csv';
    const allowedFormats = ['csv'];
    if (!allowedFormats.includes(format)) {
      return ApiResponseWrapper.error(ErrorCode.VALIDATION_ERROR, 'Invalid format', null, 400);
    }

    // 生成安全的文件名
    const timestamp = new Date().toISOString();
    const datePart = timestamp.split('T')[0]?.replace(/[^\w-]/g, '') || 'unknown';
    const filename = `error-logs-${datePart}.csv`;

    try {
      // 从数据库获取错误日志
      const prisma = DatabaseService.getInstance();
      const errorLogs = await prisma.errorLog.findMany({
        orderBy: {
          createdAt: 'desc',
        },
        take: 1000, // 限制导出数量，避免内存问题
      });

      // 生成CSV数据
      const csvData = errorLogs
        .map(log => {
          return [
            log.id,
            log.createdAt.toISOString(),
            log.level,
            `"${log.message.replace(/"/g, '""')}"`, // 转义CSV中的引号
            log.userId || '',
            log.resolved ? 'true' : 'false',
            log.stack ? `"${log.stack.replace(/"/g, '""')}"` : '',
            log.metadata ? `"${JSON.stringify(log.metadata).replace(/"/g, '""')}"` : '',
          ].join(',');
        })
        .join('\n');

      const csvHeader = 'ID,Timestamp,Level,Message,User ID,Resolved,Stack Trace,Metadata\n';
      const fullCsvData = csvHeader + csvData;

      return new NextResponse(fullCsvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } catch (error) {
      logger.error('Error exporting error logs:', error);
      return ApiResponseWrapper.error(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to export error logs',
        error,
        500
      );
    }
  }
);
