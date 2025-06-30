/**
 * @file sharing\[shareId]\download\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { readFile } from "fs/promises";
import { join } from "path";

export const GET = createApiRoute(
  RouteConfigs.publicGet(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const { shareId } = params;
      const { searchParams } = new URL(req.url);
      const format = searchParams.get('format') || "png";
    
      if (!shareId) {
        return ApiResponseWrapper.error(
          "Missing shareId parameter",
          { status: 400 }
        );
      }
    
      const fileName = `share-${shareId}.png`;
      const filePath = join(process.cwd(), "public", "uploads", "shares", fileName);
    
      const fileBuffer = await readFile(filePath);
    
      const headers = new Headers();
      headers.set("Content-Type", `image/${format}`);
      headers.set("Content-Disposition", `attachment; filename="share-${shareId}.${format}"`);
    
      return new NextResponse(fileBuffer, { headers });
    } catch (error) {
      return ApiResponseWrapper.error(
        "File not found or access error",
        { status: 404 }
      );
    }
  }
);

