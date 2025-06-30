/**
 * @file poster\templates\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { PosterConfigDB } from '@/lib/database/poster-config-db';

export const GET = createApiRoute(
  RouteConfigs.publicGet(),
  async (req: NextRequest, { validatedBody, validatedQuery, user, requestId }) => {
    try {
      const { category, tags, search, page = 1, pageSize = 20 } = _validatedQuery;
      
      // Get templates based on category
      let templates = await PosterConfigDB.getAllTemplates();
      
      // Filter by category if provided
      if (category) {
        templates = templates.filter(template => template.category === category);
      }
      
      // Filter by tags if provided
      if (tags) {
        const tagArray = tags.split(',').map((tag: string) => tag.trim());
        templates = templates.filter(template => 
          tagArray.some((tag: string) => template.tags?.includes(tag))
        );
      }
      
      // Filter by search term if provided
      if (search) {
        const searchTerm = search.toLowerCase();
        templates = templates.filter(template => 
          template.name.toLowerCase().includes(searchTerm) ||
          template.description?.toLowerCase().includes(searchTerm)
        );
      }
      
      // Pagination
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedTemplates = templates.slice(startIndex, endIndex);
      
      return ApiResponseWrapper.success({
        templates: paginatedTemplates,
        pagination: {
          page,
          pageSize,
          total: templates.length,
          totalPages: Math.ceil(templates.length / pageSize)
        }
      });
    } catch (error) {
      console.error('Error fetching templates:', error);
      return ApiResponseWrapper.error(
        "Internal server error",
        { status: 500 }
      );
    }
  }
);

export const POST = createApiRoute(
  RouteConfigs.publicPost(),
  async (req: NextRequest, { validatedBody, validatedQuery, user, requestId }) => {
    try {
      const { templateId, userId } = _validatedBody;
      
      if (!templateId) {
        return ApiResponseWrapper.error(
          "Missing templateId",
          { status: 400 }
        );
      }
      
      // Update template usage statistics
      await PosterConfigDB.updateTemplateUsage(templateId, userId);
      
      return ApiResponseWrapper.success({
        success: true,
        message: "Template usage updated"
      });
    } catch (error) {
      console.error('Error updating template usage:', error);
      return ApiResponseWrapper.error(
        "Internal server error",
        { status: 500 }
      );
    }
  }
);

