/**
 * @file images\temp\[filename]\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import fs from "fs/promises"
import path from "path"
import os from "os"

export const GET = createApiRoute(
  RouteConfigs.publicGet(),
  async (_req: NextRequest, { validatedBody, validatedQuery, user, requestId, params }) => {
    try {
      const filename = params.filename as string
      
      // 安全检查：确保文件名不包含路径遍历
      if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
        return ApiResponseWrapper.error(
          { message: 'Invalid filename' },
          { status: 400 }
        )
      }
      
      const tempDir = path.join(os.tmpdir(), "zkteco-chat-images")
      const filePath = path.join(tempDir, filename)
      
      // 检查文件是否存在
      await fs.access(filePath)
      
      // 读取文件
      const fileBuffer = await fs.readFile(filePath)
      
      // 返回图片
      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=3600",
        },
      })
    } catch (error) {
      return ApiResponseWrapper.error(
        { message: 'File not found' },
        { status: 404 }
      )
    }
  }
);

