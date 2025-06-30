/**
 * @file sharing\generate-poster\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { PosterExportSystem } from '@/lib/poster/export-system';
import { v4 as uuidv4 } from 'uuid';
import { join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { createCanvas, loadImage } from 'canvas';

export const POST = createApiRoute(
  RouteConfigs.protectedPost(),
  async (req: NextRequest, { validatedBody, validatedQuery, user, requestId }) => {
    try {
      const { title, imageUrl, content } = _validatedBody;
    
      if (!title) {
        return ApiResponseWrapper.error(
          "Missing required parameter: title",
          { status: 400 }
        );
      }
    
      // 创建画布
      const canvas = createCanvas(800, 600);
      const ctx = canvas.getContext("2d");
    
      // 设置背景
      const gradient = ctx.createLinearGradient(0, 0, 800, 600);
      gradient.addColorStop(0, "#6cb33f");
      gradient.addColorStop(1, "#4a9d2a");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 600);
    
      // 添加主要内容
      if (imageUrl) {
        try {
          const image = await loadImage(imageUrl);
          const aspectRatio = image.width / image.height;
          const maxWidth = 600;
          const maxHeight = 400;
    
          let drawWidth = maxWidth;
          let drawHeight = maxWidth / aspectRatio;
    
          if (drawHeight > maxHeight) {
            drawHeight = maxHeight;
            drawWidth = maxHeight * aspectRatio;
          }
    
          const x = (800 - drawWidth) / 2;
          const y = 50;
          
          ctx.drawImage(image, x, y, drawWidth, drawHeight);
        } catch (error) {
          console.error('Failed to load image:', error);
        }
      }
    
      // 添加标题
      ctx.fillStyle = "white";
      ctx.font = "bold 32px Arial";
      ctx.textAlign = "center";
      ctx.fillText(title, 400, 520);
    
      // 添加内容描述
      if (content) {
        ctx.font = "18px Arial";
        ctx.fillText(content.substring(0, 100) + (content.length > 100 ? '...' : ''), 400, 560);
      }
    
      // 生成图片
      const shareId = uuidv4();
      const fileName = `share-${shareId}.png`;
      const uploadsDir = join(process.cwd(), "public", "uploads", "shares");
    
      try {
        await mkdir(uploadsDir, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }
    
      const filePath = join(uploadsDir, fileName);
      const buffer = canvas.toBuffer("image/png");
      await writeFile(filePath, buffer);
    
      const imageUrl_result = `/uploads/shares/${fileName}`;
      const downloadUrl = `/api/sharing/${shareId}/download`;
    
      return ApiResponseWrapper.success({
        success: true,
        shareId,
        imageUrl: imageUrl_result,
        downloadUrl,
      });
    } catch (error) {
      console.error('Error generating poster:', error);
      return ApiResponseWrapper.error(
        "Internal server error",
        { status: 500 }
      );
    }
  }
);

