/**
 * @file cad\statistics\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs, CommonValidations } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { ErrorCode } from '@/types/core';

export const GET = createApiRoute(
  RouteConfigs.publicGet(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const { searchParams } = new URL(req.url)
      const userId = validatedQuery?.userId
      const timeRange = validatedQuery?.timeRange || "30d" // 30d, 7d, 1d
  
      if (!userId) {
        return ApiResponseWrapper.error(ErrorCode.VALIDATION_ERROR, "缺少用户ID", null)
      }
    
        // 模拟获取CAD分析统计数据
        const statistics = {
          totalAnalyses: 25,
          totalFiles: 23,
          totalDevicesDetected: 156,
          totalRisksFound: 42,
          averageAnalysisTime: "3.2秒",
    
          // 按时间范围的分析数量
          analysesByDate: [
            { date: "2024-01-20", count: 3 },
            { date: "2024-01-19", count: 2 },
            { date: "2024-01-18", count: 4 },
            { date: "2024-01-17", count: 1 },
            { date: "2024-01-16", count: 2 },
          ],
    
          // 文件类型分布
          fileTypeDistribution: {
            dwg: 12,
            dxf: 8,
            step: 2,
            iges: 1,
          },
    
          // 风险严重程度分布
          riskSeverityDistribution: {
            critical: 3,
            high: 8,
            medium: 18,
            low: 13,
          },
    
          // 设备类型分布
          deviceTypeDistribution: {
            surveillance_camera: 45,
            access_control: 28,
            alarm_system: 15,
            smart_lock: 12,
            sensor: 56,
          },
    
          // 合规性得分趋势
          complianceScoreTrend: [
            { date: "2024-01-16", score: 82 },
            { date: "2024-01-17", score: 85 },
            { date: "2024-01-18", score: 88 },
            { date: "2024-01-19", score: 87 },
            { date: "2024-01-20", score: 90 },
          ],
    
          // 最常见的风险类型
          topRiskCategories: [
            { category: "监控盲区", count: 12 },
            { category: "设备老化", count: 8 },
            { category: "线路安全", count: 6 },
            { category: "合规性问题", count: 4 },
          ],
        }
    
        return ApiResponseWrapper.success({
          success: true,
          statistics,
          timeRange,
          generatedAt: new Date().toISOString(),
        })
      } catch (error) {
        console.error('获取统计数据失败:', error)
        return ApiResponseWrapper.error(
          "获取统计数据失败",
          { status: 500 }
        )
      }
    }
  )

