/**
 * @file api/metrics/performance/route.ts
 * @description 性能指标收集 API 端点
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

import { createApiRoute } from '@/lib/middleware/api-route';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();

/**
 * 接收性能指标数据
 */
export const POST = createApiRoute(RouteConfigs.protectedPost(), async (req, { requestId, validatedBody }) => {
  try {
    const { metrics, timestamp, userAgent, url } = validatedBody || {};
    
    // 验证必要字段
    if (!metrics || !timestamp) {
      return ApiResponseWrapper.error(
        ErrorCode.VALIDATION_REQUIRED_FIELD,
        'Missing required fields: metrics, timestamp',
        null,
        400
      );
    }

    // 记录性能指标
    logger.info('Performance metrics received', {
      requestId,
      url,
      userAgent,
      timestamp,
      metricsCount: Object.keys(metrics).length,
      // 记录关键性能指标
      ...(metrics.navigation && {
        loadTime: metrics.navigation.loadEventEnd - metrics.navigation.navigationStart,
        domContentLoaded: metrics.navigation.domContentLoadedEventEnd - metrics.navigation.navigationStart,
        firstPaint: metrics.paint?.['first-paint'],
        firstContentfulPaint: metrics.paint?.['first-contentful-paint']
      })
    });

    // 这里可以添加将指标存储到数据库或发送到监控服务的逻辑
    // 目前只是记录日志
    
    return ApiResponseWrapper.success({
      message: 'Performance metrics recorded successfully',
      requestId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to process performance metrics', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return ApiResponseWrapper.error(
      ErrorCode.INTERNAL_SERVER_ERROR,
      `Failed to process performance metrics: ${error instanceof Error ? error.message : 'Unknown error'}`,
      null,
      500
    );
  }
});