/**
 * @file cad\history\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs, CommonValidations } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { ErrorCode } from '@/types/core';
import type { CADAnalysisHistory } from "@/types/cad"

export const GET = createApiRoute(
  RouteConfigs.publicGet(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const { searchParams } = new URL(req.url)
      const userId = validatedQuery?.userId
      const limit = Number.parseInt(validatedQuery?.limit || "20")
      const query = validatedQuery?.query
  
      if (!userId) {
        return ApiResponseWrapper.error(ErrorCode.VALIDATION_ERROR, "缺少用户ID", null)
      }
    
        // 模拟获取用户CAD分析历史
        const mockHistory: CADAnalysisHistory[] = [
          {
            id: "history_1",
            fileId: "file_1",
            fileName: "办公楼安防设计图.dwg",
            fileType: "dwg",
            fileSize: 2048000,
            analysisResult: {
              fileId: "file_1",
              userId: userId,
              structure: [],
              devices: [],
              risks: [],
              summary: {
                totalDevices: 15,
                totalRisks: 3,
                risksBySeverity: { critical: 0, high: 1, medium: 2, low: 0 },
                complianceScore: 88,
                recommendations: ["增加应急出口标识", "完善消防设备"],
              },
              statistics: {
                analysisTime: "3.2秒",
                fileSize: 2048000,
                processingSteps: 5,
                accuracy: "96%",
              },
              recommendations: [],
              reportUrl: "/reports/analysis_file_1.pdf",
              createdAt: new Date("2024-01-20T10:30:00Z"),
            },
            createdAt: new Date("2024-01-20T10:30:00Z"),
            updatedAt: new Date("2024-01-20T10:30:00Z"),
            tags: ["办公楼", "安防设计"],
            notes: "主要分析监控布局和门禁系统",
            isBookmarked: true,
            sharedWith: ["team@company.com"],
          },
          {
            id: "history_2",
            fileId: "file_2",
            fileName: "工厂监控布局图.dxf",
            fileType: "dxf",
            fileSize: 1536000,
            analysisResult: {
              fileId: "file_2",
              userId: userId,
              structure: [],
              devices: [],
              risks: [],
              summary: {
                totalDevices: 28,
                totalRisks: 5,
                risksBySeverity: { critical: 1, high: 2, medium: 2, low: 0 },
                complianceScore: 75,
                recommendations: ["增加周界防护", "升级监控设备"],
              },
              statistics: {
                analysisTime: "4.1秒",
                fileSize: 1536000,
                processingSteps: 6,
                accuracy: "94%",
              },
              recommendations: [],
              reportUrl: "/reports/analysis_file_2.pdf",
              createdAt: new Date("2024-01-18T14:15:00Z"),
            },
            createdAt: new Date("2024-01-18T14:15:00Z"),
            updatedAt: new Date("2024-01-18T14:15:00Z"),
            tags: ["工厂", "周界防护"],
            notes: "重点关注生产区域安全",
            isBookmarked: false,
            sharedWith: [],
          },
        ]
    
        // 如果有搜索查询，过滤结果
        let filteredHistory = mockHistory
        if (query) {
          filteredHistory = mockHistory.filter(
            (item) =>
              item.fileName.toLowerCase().includes(query.toLowerCase()) ||
              item.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase())) ||
              item.notes.toLowerCase().includes(query.toLowerCase()),
          )
        }
    
        // 应用限制
        const limitedHistory = filteredHistory.slice(0, limit)
    
        return ApiResponseWrapper.success({
          success: true,
          history: limitedHistory,
          total: filteredHistory.length,
          hasMore: filteredHistory.length > limit,
        })
      } catch (error) {
        console.error('获取历史记录失败:', error)
        return ApiResponseWrapper.error(
          "获取历史记录失败",
          { status: 500 }
        )
      }
    }
  )

export const DELETE = createApiRoute(
  { method: 'DELETE', requireAuth: true, timeout: 60000 },
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const { searchParams } = new URL(req.url)
      const analysisId = validatedQuery?.analysisId
      const userId = validatedQuery?.userId
    
      if (!analysisId || !userId) {
        return ApiResponseWrapper.error(ErrorCode.VALIDATION_ERROR, "缺少必要参数", null)
      }
    
      // 模拟删除分析结果
      // 在实际实现中，这里会删除数据库中的记录和相关文件
      console.log(`删除用户 ${userId} 的分析结果 ${analysisId}`)
    
      return ApiResponseWrapper.success({
        success: true,
        message: "删除成功",
      })
    } catch (error) {
      console.error('删除分析结果失败:', error)
      return ApiResponseWrapper.error(
        "删除失败",
        { status: 500 }
      )
    }
  }
)

