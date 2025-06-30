/**
 * @file admin\error-monitoring\report\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { ErrorCode } from '@/types/core';
import { errorMonitor } from '@/lib/monitoring/error-monitor';

/**
 * 生成错误监控报告
 */
async function generateErrorMonitoringReport(timeRange?: string) {
  try {
    // 生成监控报告
    const report = await errorMonitor.generateReport();
    
    // 获取健康检查结果
    const healthCheck = errorMonitor.healthCheck();
    
    // 获取活跃告警
    const activeAlerts = errorMonitor.getActiveAlerts();
    
    // 计算时间范围
    const now = new Date();
    let startTime: Date;
    
    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '6h':
        startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 默认24小时
    }
    
    // 获取指定时间范围内的错误
    const recentErrors = errorMonitor.getRecentErrors(100)
      .filter(error => error.timestamp >= startTime);
    
    // 分析错误趋势
    const errorTrends = analyzeErrorTrends(recentErrors, startTime, now);
    
    // 生成建议
    const recommendations = generateRecommendations(report, healthCheck, activeAlerts);
    
    return {
      success: true,
      data: {
        timeRange,
        generatedAt: now.toISOString(),
        summary: {
          totalErrors: recentErrors.length,
          criticalErrors: recentErrors.filter(e => e.severity === 'critical').length,
          resolvedErrors: recentErrors.filter(e => e.resolved).length,
          activeAlerts: activeAlerts.length
        },
        healthCheck,
        recentErrors,
        errorTrends,
        activeAlerts,
        recommendations,
        report
      }
    };
  } catch (error) {
    console.error('Error generating monitoring report:', error);
    throw error;
  }
}

/**
 * 分析错误趋势
 */
function analyzeErrorTrends(errors: any[], startTime: Date, endTime: Date) {
  const hourlyBuckets = new Map();
  const errorTypes = new Map();
  
  errors.forEach(error => {
    const hour = new Date(error.timestamp).getHours();
    hourlyBuckets.set(hour, (hourlyBuckets.get(hour) || 0) + 1);
    errorTypes.set(error.type, (errorTypes.get(error.type) || 0) + 1);
  });
  
  return {
    hourlyDistribution: Object.fromEntries(hourlyBuckets),
    errorTypeDistribution: Object.fromEntries(errorTypes),
    timeRange: {
      start: startTime.toISOString(),
      end: endTime.toISOString()
    }
  };
}

/**
 * 生成建议
 */
function generateRecommendations(report: any, healthCheck: any, activeAlerts: any[]) {
  const recommendations = [];
  
  if (healthCheck.status !== 'healthy') {
    recommendations.push({
      type: 'critical',
      message: '系统健康状态异常，需要立即检查',
      action: '检查系统资源和服务状态'
    });
  }
  
  if (activeAlerts.length > 0) {
    recommendations.push({
      type: 'warning',
      message: `有 ${activeAlerts.length} 个活跃告警需要处理`,
      action: '查看告警详情并采取相应措施'
    });
  }
  
  if (report.errorRate > 0.05) {
    recommendations.push({
      type: 'warning',
      message: '错误率较高，建议优化系统稳定性',
      action: '分析高频错误并进行修复'
    });
  }
  
  return recommendations;
}

/**
 * 生成CSV格式报告
 */
function generateCSVReport(data: any): string {
  const headers = ['Timestamp', 'Error ID', 'Type', 'Severity', 'Message', 'Resolved'];
  const rows = data.recentErrors.map((error: any) => [
    error.timestamp,
    error.id,
    error.type,
    error.severity,
    `"${error.message.replace(/"/g, '""')}"`, // 转义CSV中的引号
    error.resolved ? 'Yes' : 'No'
  ]);
  
  return [headers.join(','), ...rows.map((row: any) => row.join(','))].join('\n');
}

/**
 * GET /api/admin/error-monitoring/report
 * 获取错误监控报告
 */
export const GET = createApiRoute(
  RouteConfigs.protectedGet(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const { searchParams } = new URL(req.url);
      const timeRange = searchParams.get('timeRange') || '24h';
      const format = searchParams.get('format') || 'json';
      
      const report = await generateErrorMonitoringReport(timeRange);
      
      if (format === 'csv') {
        // 生成CSV格式报告
        const csv = generateCSVReport(report.data);
        
        return new NextResponse(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="error-report-${timeRange}-${new Date().toISOString().slice(0, 10)}.csv"`
          }
        });
      }
      
      return ApiResponseWrapper.success(report.data);
    } catch (error) {
      console.error('Error generating monitoring report:', error);
      return ApiResponseWrapper.error(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to generate monitoring report',
        null
      );
    }
  }
);