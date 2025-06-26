/**
 * @file admin\ip-stats\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs, CommonValidations } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { verifyAdminAuth } from "@/lib/auth/middleware"

export const GET = createApiRoute(
  RouteConfigs.protectedGet(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      // 验证管理员权限
      const authResult = await verifyAdminAuth(req);
      if (!authResult.success) {
        return ApiResponseWrapper.error('权限不足', 403);
      }
    
      const url = new URL(req.url);
      const timeRange = validatedQuery?.range || "24h";
      const province = validatedQuery?.province || "all";
    
        // 模拟IP统计数据
        const mockLocations = [
          {
            province: "北京",
            city: "北京市",
            count: 1250,
            percentage: 15.2,
            coordinates: [116.4074, 39.9042],
            trend: "up",
          },
          { province: "上海", city: "上海市", count: 980, percentage: 11.9, coordinates: [121.4737, 31.2304], trend: "up" },
          {
            province: "广东",
            city: "深圳市",
            count: 856,
            percentage: 10.4,
            coordinates: [114.0579, 22.5431],
            trend: "stable",
          },
          { province: "广东", city: "广州市", count: 742, percentage: 9.0, coordinates: [113.2644, 23.1291], trend: "up" },
          {
            province: "浙江",
            city: "杭州市",
            count: 623,
            percentage: 7.6,
            coordinates: [120.1551, 30.2741],
            trend: "down",
          },
          {
            province: "江苏",
            city: "南京市",
            count: 534,
            percentage: 6.5,
            coordinates: [118.7969, 32.0603],
            trend: "stable",
          },
          { province: "四川", city: "成都市", count: 445, percentage: 5.4, coordinates: [104.0665, 30.5723], trend: "up" },
          {
            province: "湖北",
            city: "武汉市",
            count: 387,
            percentage: 4.7,
            coordinates: [114.3054, 30.5931],
            trend: "stable",
          },
          {
            province: "陕西",
            city: "西安市",
            count: 298,
            percentage: 3.6,
            coordinates: [108.9398, 34.3416],
            trend: "down",
          },
          { province: "山东", city: "青岛市", count: 267, percentage: 3.2, coordinates: [120.3826, 36.0671], trend: "up" },
          {
            province: "福建",
            city: "厦门市",
            count: 234,
            percentage: 2.8,
            coordinates: [118.1689, 24.4797],
            trend: "stable",
          },
          { province: "重庆", city: "重庆市", count: 198, percentage: 2.4, coordinates: [106.5516, 29.563], trend: "up" },
          {
            province: "天津",
            city: "天津市",
            count: 176,
            percentage: 2.1,
            coordinates: [117.1901, 39.1235],
            trend: "down",
          },
          {
            province: "辽宁",
            city: "大连市",
            count: 145,
            percentage: 1.8,
            coordinates: [121.6147, 38.914],
            trend: "stable",
          },
          { province: "河南", city: "郑州市", count: 123, percentage: 1.5, coordinates: [113.6254, 34.7466], trend: "up" },
        ] as const
    
        // 根据省份筛选
        const filteredLocations =
          province === "all" ? mockLocations : mockLocations.filter((loc) => loc.province === province)
    
        const totalIPs = filteredLocations.reduce((sum, loc) => sum + loc.count, 0)
        const uniqueIPs = Math.floor(totalIPs * 0.75) // 假设75%是独立IP
    
        const ipStats = {
          totalIPs,
          uniqueIPs,
          topLocations: filteredLocations,
          lastUpdate: new Date().toISOString(),
        }
    
      return ApiResponseWrapper.success(ipStats);
    } catch (error) {
      return ApiResponseWrapper.error('获取IP统计失败', 500);
    }
  }
);

