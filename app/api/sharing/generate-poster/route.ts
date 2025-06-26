/**
 * @file sharing\generate-poster\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs, CommonValidations } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { createCanvas, loadImage } from "canvas"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { v4 as uuidv4 } from "uuid"

export const POST = createApiRoute(
  RouteConfigs.protectedPost(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const { type, title, description, imageUrl, watermark, quality } = await req.json()
    
      if (!title) {
        return ApiResponseWrapper.error(
          "Missing required parameter: title",
          { status: 400 }
        )
      }
    
        // 创建画布
        const canvas = createCanvas(800, 600)
        const ctx = canvas.getContext("2d")
    
        // 设置背景
        const gradient = ctx.createLinearGradient(0, 0, 800, 600)
        gradient.addColorStop(0, "#6cb33f")
        gradient.addColorStop(1, "#4a9d2a")
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, 800, 600)
    
        // 添加主要内容
        if (imageUrl) {
          try {
            const image = await loadImage(imageUrl)
            const aspectRatio = image.width / image.height
            const maxWidth = 600
            const maxHeight = 400
    
            let drawWidth = maxWidth
            let drawHeight = maxWidth / aspectRatio
    
            if (drawHeight > maxHeight) {
              drawHeight = maxHeight
              drawWidth = maxHeight * aspectRatio
            }
    
            const x = (800 - drawWidth) / 2
            const y = 50
            
            ctx.drawImage(image, x, y, drawWidth, drawHeight)
          } catch (error) {
            console.error('Failed to load image:', error)
          }
        }
    
        // 添加标题
        ctx.fillStyle = "#ffffff"
        ctx.font = "bold 32px Arial"
        ctx.textAlign = "center"
        ctx.fillText(title, 400, 500)
    
        // 添加描述
        if (description) {
          ctx.font = "18px Arial"
          ctx.fillText(description, 400, 530)
        }
    
        // 添加水印
        if (watermark) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.3)"
          ctx.font = "14px Arial"
          ctx.textAlign = "right"
          ctx.fillText("AI多智能体宇宙平台", 780, 580)
        }
    
        // 生成图片
        const shareId = uuidv4()
        const fileName = `share-${shareId}.png`
        const uploadsDir = join(process.cwd(), "public", "uploads", "shares")
    
        try {
          await mkdir(uploadsDir, { recursive: true })
        } catch (error) {
          // Directory might already exist
        }
    
        const filePath = join(uploadsDir, fileName)
        const buffer = canvas.toBuffer("image/png")
        await writeFile(filePath, buffer)
    
        const imageUrl_result = `/uploads/shares/${fileName}`
        const downloadUrl = `/api/sharing/${shareId}/download`
    
        return ApiResponseWrapper.success({
          success: true,
          shareId,
          imageUrl: imageUrl_result,
          downloadUrl,
        })
    } catch (error) {
      return ApiResponseWrapper.error(
        "Internal server error",
        { status: 500 }
      )
    }
  }
);

