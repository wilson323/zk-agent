/**
 * @file poster\config\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs, CommonValidations } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { PosterDatabase } from "@/lib/database/poster-db"

export const GET = createApiRoute(
  RouteConfigs.publicGet(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const type = validatedQuery?.type as string
      
      switch (type) {
        case "styles":
          const styles = await PosterDatabase.getStyles()
          return ApiResponseWrapper.success({
            success: true,
            data: styles,
          })
        
        case "sizes":
          const sizes = await PosterDatabase.getSizes()
          return ApiResponseWrapper.success({
            success: true,
            data: sizes,
          })
        
        case "palettes":
          const palettes = await PosterDatabase.getColorPalettes()
          return ApiResponseWrapper.success({
            success: true,
            data: palettes,
          })
        
        case "templates":
          const category = validatedQuery?.category as string
          const industry = validatedQuery?.industry as string
          const productType = validatedQuery?.productType as string
          
          const templates = await PosterDatabase.getTemplates({
            category: category || undefined,
            industry: industry || undefined,
            productType: productType || undefined,
          })
          
          return ApiResponseWrapper.success({
            success: true,
            data: templates,
          })
        
        case "all":
          const [allStyles, allSizes, allPalettes] = await Promise.all([
            PosterDatabase.getStyles(),
            PosterDatabase.getSizes(),
            PosterDatabase.getColorPalettes(),
          ])
          
          return ApiResponseWrapper.success({
            success: true,
            data: {
              styles: allStyles,
              sizes: allSizes,
              palettes: allPalettes,
            },
          })
        
        default:
          return ApiResponseWrapper.error(
            { message: "Invalid config type. Use: styles, sizes, palettes, templates, or all" },
            { status: 400 }
          )
      }
    } catch (error) {
      return ApiResponseWrapper.error(
        { message: 'Failed to get poster config' },
        { status: 500 }
      )
    }
  }
);

