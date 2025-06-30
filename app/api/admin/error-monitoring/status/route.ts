/**
 * @file admin\error-monitoring\status\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { ErrorCode } from '@/types/core';
import { errorMonitor } from '@/lib/monitoring/error-monitor';
import { errorTracker } from '@/lib/monitoring/error-tracker';
import { getErrorMonitoringConfig } from '@/lib/config/error-monitoring-config';

/**
 * 获取错误监控系统状态
 */
async function getErrorMonitoringStatus() {
  try {
    // 获取错误统计
    const errorStats = errorMonitor.getErrorStats();
    
    // 获取活跃告警
    const activeAlerts = errorMonitor.getActiveAlerts();
    
    // 获取最近错误
    const recentErrors = errorMonitor.getRecentErrors(10);
    
    // 获取健康检查结果
    const healthCheck = errorMonitor.healthCheck();
    
    // 获取配置信息
    const config = getErrorMonitoringConfig();
    
    // 获取错误追踪器状态
    const trackerStats = errorTracker.getStats();
    
    return {
      status: 'success',
      data: {
        monitoring: {
          isActive: true,
          config: {
            interval: config.monitoringInterval,
            errorRateThreshold: config.alertThresholds.errorRate,
            criticalErrorThreshold: config.alertThresholds.criticalErrorCount,
            autoRecoveryEnabled: config.autoRecovery.enabled,
            notificationsEnabled: config.notifications.enabled
          }
        },
        errorStats: {
          total: errorStats.total,
          recentErrors: errorStats.recentErrors,
          errorRate: errorStats.errorRate,
          byType: errorStats.byType,
          bySeverity: errorStats.bySeverity
        },
        alerts: {
          active: activeAlerts.length,
          list: activeAlerts.map(alert => ({
            id: alert.id,
            message: alert.message,
            severity: alert.severity,
            timestamp: alert.timestamp,
            resolved: alert.resolved
          }))
        },
        recentErrors: recentErrors.map(error => ({
          id: error.id,
          message: error.message,
          type: error.type,
          severity: error.severity,
          timestamp: error.timestamp,
          resolved: error.resolved
        })),
        healthCheck: {
          status: healthCheck.status,
          score: healthCheck.score,
          issues: healthCheck.issues
        },
        tracker: {
          totalTracked: trackerStats.totalErrors || 0,
          recentActivity: trackerStats.recentActivity || 0,
          isActive: trackerStats.isActive || false
        },
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Failed to get error monitoring status:', error);
    throw new Error('Failed to retrieve monitoring status');
  }
}

/**
 * GET /api/admin/error-monitoring/status
 * 获取错误监控系统状态
 */
export const GET = createApiRoute(
  RouteConfigs.protectedGet(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const result = await getErrorMonitoringStatus();
      
      return ApiResponseWrapper.success(result.data, {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
    } catch (error) {
      console.error('Error getting monitoring status:', error);
      return ApiResponseWrapper.error(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to retrieve monitoring status',
        null
      );
    }
  }
);

/**
 * POST /api/admin/error-monitoring/status
 * 重启错误监控系统
 */
export const POST = createApiRoute(
  RouteConfigs.protectedPost(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const body = await req.json();
      const { action } = body;
      
      if (action === 'restart') {
        // 停止监控
        errorMonitor.stopMonitoring();
        
        // 重新启动监控
        const config = getErrorMonitoringConfig();
        errorMonitor.startMonitoring(config.monitoringInterval);
        
        return ApiResponseWrapper.success({
          message: 'Error monitoring system restarted successfully',
          timestamp: new Date().toISOString()
        });
      } else if (action === 'stop') {
        // 停止监控
        errorMonitor.stopMonitoring();
        
        return ApiResponseWrapper.success({
          message: 'Error monitoring system stopped',
          timestamp: new Date().toISOString()
        });
      } else if (action === 'start') {
        // 启动监控
        const config = getErrorMonitoringConfig();
        errorMonitor.startMonitoring(config.monitoringInterval);
        
        return ApiResponseWrapper.success({
          message: 'Error monitoring system started',
          timestamp: new Date().toISOString()
        });
      } else {
        return ApiResponseWrapper.error(
          ErrorCode.VALIDATION_ERROR,
          'Invalid action. Use: start, stop, or restart',
          null
        );
      }
    } catch (error) {
      console.error('Failed to control error monitoring:', error);
      return ApiResponseWrapper.error(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to control monitoring system',
        null
      );
    }
  }
);