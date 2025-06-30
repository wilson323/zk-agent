/**
 * @file poster\config\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { PosterConfigManager } from '@/lib/database/poster-config';

// Mock database functions for demonstration
const PosterDatabase = {
  async getStyles() {
    return [
      { id: 1, name: 'Modern', description: 'Clean and modern design' },
      { id: 2, name: 'Vintage', description: 'Retro and vintage style' },
      { id: 3, name: 'Minimalist', description: 'Simple and clean' }
    ];
  },
  
  async getSizes() {
    return [
      { id: 1, name: 'A4', width: 210, height: 297, unit: 'mm' },
      { id: 2, name: 'Letter', width: 8.5, height: 11, unit: 'inch' },
      { id: 3, name: 'Square', width: 1080, height: 1080, unit: 'px' }
    ];
  },
  
  async getColorPalettes() {
    return [
      { id: 1, name: 'Ocean', colors: ['#0077be', '#00a8cc', '#40e0d0'] },
      { id: 2, name: 'Sunset', colors: ['#ff6b35', '#f7931e', '#ffd23f'] },
      { id: 3, name: 'Forest', colors: ['#2d5016', '#4a7c59', '#6b8e23'] }
    ];
  },
  
  async getTemplates(filters: any) {
    return [
      { id: 1, name: 'Business Card', category: 'business', industry: 'corporate' },
      { id: 2, name: 'Event Poster', category: 'event', industry: 'entertainment' },
      { id: 3, name: 'Product Flyer', category: 'marketing', industry: 'retail' }
    ].filter(template => {
      if (filters.category && template.category !== filters.category) return false;
      if (filters.industry && template.industry !== filters.industry) return false;
      return true;
    });
  }
};

export const GET = createApiRoute(
  RouteConfigs.publicGet(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const type = _validatedQuery?.type as string;
      
      switch (type) {
        case "styles":
          const styles = await PosterDatabase.getStyles();
          return ApiResponseWrapper.success({
            success: true,
            data: styles,
          });
        
        case "sizes":
          const sizes = await PosterDatabase.getSizes();
          return ApiResponseWrapper.success({
            success: true,
            data: sizes,
          });
        
        case "palettes":
          const palettes = await PosterDatabase.getColorPalettes();
          return ApiResponseWrapper.success({
            success: true,
            data: palettes,
          });
        
        case "templates":
          const category = _validatedQuery?.category as string;
          const industry = _validatedQuery?.industry as string;
          const productType = _validatedQuery?.productType as string;
          
          const templates = await PosterDatabase.getTemplates({
            category: category || undefined,
            industry: industry || undefined,
            productType: productType || undefined,
          });
          
          return ApiResponseWrapper.success({
            success: true,
            data: templates,
          });
        
        case "all": {
          const [allStyles, allSizes, allPalettes] = await Promise.all([
            PosterDatabase.getStyles(),
            PosterDatabase.getSizes(),
            PosterDatabase.getColorPalettes(),
          ]);
          
          return ApiResponseWrapper.success({
            success: true,
            data: {
              styles: allStyles,
              sizes: allSizes,
              palettes: allPalettes,
            },
          });
        }
        
        default:
          return ApiResponseWrapper.error(
            'Invalid config type. Use: styles, sizes, palettes, templates, or all',
            400
          );
      }
    } catch (error) {
      console.error('Error getting poster config:', error);
      return ApiResponseWrapper.error('Failed to get poster config', 500);
    }
  }
);

