/**
 * @file admin\error-logs\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { verifyAdminAuth } from "@/lib/auth/middleware";
import { ErrorCode } from '@/types/core';

export const GET = createApiRoute(
  RouteConfigs.protectedGet(),
  async (req: NextRequest, { validatedQuery }) => {
    // 验证管理员权限
    const authResult = await verifyAdminAuth(req);
    if (!authResult.success) {
      return ApiResponseWrapper.error(ErrorCode.AUTHORIZATION_ERROR,
        '权限不足',
        null,
        403
      );
    }
    
      const _url = new URL(req.url);
      const search = validatedQuery?.['search'] || "";
      const level = validatedQuery?.['level'] || "all";
      const status = validatedQuery?.['status'] || "all";
      const limit = Number.parseInt(validatedQuery?.['limit'] || "50");
    
        // 模拟错误日志数据
        const mockLogs = [
          {
            id: "1",
            level: "ERROR" as const,
            message: "FastGPT API连接超时",
            stack: "Error: Connection timeout\n    at FastGPTClient.request (/app/lib/fastgpt.ts:45:12)",
            metadata: { endpoint: "/api/chat", timeout: 30000 },
            userId: "user_123",
            resolved: false,
            createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30分钟前
          },
          {
            id: "2",
            level: "WARN" as const,
            message: "用户上传文件大小超过限制",
            stack: null,
            metadata: { fileSize: 52428800, maxSize: 50331648, userId: "user_456" },
            userId: "user_456",
            resolved: true,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2小时前
          },
          {
            id: "3",
            level: "ERROR" as const,
            message: "CAD文件解析失败",
            stack: "Error: Unsupported file format\n    at CADParser.parse (/app/lib/cad-analyzer.ts:78:15)",
            metadata: { fileName: "drawing.dwg", fileType: "application/octet-stream" },
            userId: "user_789",
            resolved: false,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4小时前
          },
          {
            id: "4",
            level: "FATAL" as const,
            message: "数据库连接池耗尽",
            stack: "Error: Pool exhausted\n    at Pool.acquire (/app/lib/database.ts:23:8)",
            metadata: { activeConnections: 100, maxConnections: 100 },
            userId: null,
            resolved: true,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6小时前
          },
          {
            id: "5",
            level: "INFO" as const,
            message: "系统定时任务执行完成",
            stack: null,
            metadata: { taskName: "cleanup_temp_files", duration: 1250 },
            userId: null,
            resolved: true,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), // 8小时前
          },
        ]
    
        // 应用筛选条件
        let filteredLogs = mockLogs
    
        if (search) {
          filteredLogs = filteredLogs.filter((log) => log.message.toLowerCase().includes(search.toLowerCase()))
        }
    
        if (level !== "all") {
          filteredLogs = filteredLogs.filter((log) => log.level === level)
        }
    
        if (status !== "all") {
          const isResolved = status === "resolved"
          filteredLogs = filteredLogs.filter((log) => log.resolved === isResolved)
        }
    
        // 限制返回数量
        filteredLogs = filteredLogs.slice(0, limit)
    
        // 计算统计信息
        const stats = {
          total: mockLogs.length,
          byLevel: {
            INFO: mockLogs.filter((log) => log.level === "INFO").length,
            WARN: mockLogs.filter((log) => log.level === "WARN").length,
            ERROR: mockLogs.filter((log) => log.level === "ERROR").length,
            FATAL: mockLogs.filter((log) => log.level === "FATAL").length,
          },
          resolved: mockLogs.filter((log) => log.resolved).length,
          unresolved: mockLogs.filter((log) => !log.resolved).length,
          todayCount: mockLogs.filter((log) => {
            const today = new Date()
            const logDate = new Date(log.createdAt)
            return logDate.toDateString() === today.toDateString()
          }).length,
        }
    
    return ApiResponseWrapper.success({
      logs: filteredLogs,
      stats,
    });
  }
);

