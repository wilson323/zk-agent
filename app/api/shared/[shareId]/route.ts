/**
 * @file shared\[shareId]\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { enhancedShareManager } from "@/lib/sharing/enhanced-share-manager";

export const GET = createApiRoute(
  RouteConfigs.publicGet(),
  async (req: NextRequest, { validatedBody, validatedQuery, user, requestId, params }) => {
    try {
      const { shareId } = params;
      
      if (!shareId) {
        return ApiResponseWrapper.error(
          "Missing shareId parameter",
          { status: 400 }
        );
      }
      
      // Get shared content
      const sharedContent = await enhancedShareManager.getSharedContent(shareId);
      
      if (!sharedContent) {
        return ApiResponseWrapper.error(
          "Shared content not found",
          { status: 404 }
        );
      }
      
      return ApiResponseWrapper.success({
        shareId,
        content: sharedContent,
        accessedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error accessing shared content:', error);
      return ApiResponseWrapper.error(
        "Internal server error",
        { status: 500 }
      );
    }
  }
);

