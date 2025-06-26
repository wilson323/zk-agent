/**
 * @file shared\[shareId]\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs, CommonValidations } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { enhancedShareManager } from "@/lib/sharing/enhanced-share-manager"

export const GET = createApiRoute(
  RouteConfigs.publicGet(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const { shareId } = params as { shareId: string }
      const password = validatedQuery?.password as string
      
      // Get client info
      const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
      const userAgent = req.headers.get("user-agent") || "unknown"
      const referrer = req.headers.get("referer")
      const country = req.headers.get("cf-ipcountry") // Cloudflare country header
      
      const accessInfo = {
        ip,
        userAgent,
        referrer: referrer || undefined,
        country: country || undefined,
        password: password || undefined,
      }
      
      const result = await enhancedShareManager.accessSharedContent(shareId, accessInfo)
      
      if (!result) {
        return ApiResponseWrapper.error(
          { message: 'Shared content not found' },
          { status: 404 }
        )
      }
      
      return ApiResponseWrapper.success(result)
    } catch (error: any) {
      if (error.message.includes("password")) {
        return ApiResponseWrapper.error(
          { message: 'Invalid password' },
          { status: 401 }
        )
      }
      if (error.message.includes("maximum views")) {
        return ApiResponseWrapper.error(
          { message: 'Maximum views exceeded' },
          { status: 410 }
        )
      }
      return ApiResponseWrapper.error(
        { message: 'Failed to access shared content' },
        { status: 500 }
      )
    }
  }
);

export const POST = createApiRoute(
  RouteConfigs.protectedPost(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const { shareId } = params as { shareId: string }
      const body = await req.json()
      const { action, userId } = body
      
      if (action === "analytics" && userId) {
        const analytics = await enhancedShareManager.getShareAnalytics(shareId, userId)
        return ApiResponseWrapper.success(analytics)
      }
      
      return ApiResponseWrapper.error(
        { message: 'Invalid action or missing userId' },
        { status: 400 }
      )
    } catch (error) {
      return ApiResponseWrapper.error(
        { message: 'Failed to process request' },
        { status: 500 }
      )
    }
  }
);

