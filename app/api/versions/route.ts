/**
 * @file versions\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs, CommonValidations } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { versionManager } from "@/lib/versioning/version-manager"

export const GET = createApiRoute(
  RouteConfigs.publicGet(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const { searchParams } = new URL(req.url)
      const contentId = validatedQuery?.contentId
      const contentType = validatedQuery?.contentType
      const versionId = validatedQuery?.versionId
    
      if (versionId) {
        // 获取特定版本
        const version = await versionManager.getVersion(versionId)
        if (!version) {
          return ApiResponseWrapper.error(
            "Version not found",
            { status: 404 }
          )
        }
        return ApiResponseWrapper.success({
          success: true,
          version,
        })
      }
    
      if (!contentId || !contentType) {
        return ApiResponseWrapper.error(
          "Missing required parameters: contentId, contentType",
          { status: 400 }
        )
      }
    
      const versions = await versionManager.getVersions(contentId, contentType)
      return ApiResponseWrapper.success({
        success: true,
        versions,
      })
    } catch (error) {
      return ApiResponseWrapper.error(
        "Internal server error",
        { status: 500 }
      )
    }
  }
);

export const POST = createApiRoute(
  RouteConfigs.protectedPost(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const body = await req.json()
      const { contentId, contentType, content, description, tags } = body
    
      if (!contentId || !contentType || !content) {
        return ApiResponseWrapper.error(
          "Missing required parameters: contentId, contentType, content",
          { status: 400 }
        )
      }
    
      const version = await versionManager.createVersion(contentId, contentType, content, description, tags)
    
      return ApiResponseWrapper.success({
        success: true,
        version,
      })
    } catch (error) {
      return ApiResponseWrapper.error(
        "Internal server error",
        { status: 500 }
      )
    }
  }
);

export const PUT = createApiRoute(
  RouteConfigs.protectedPut(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const body = await req.json()
      const { versionId, description, tags } = body
    
      if (!versionId) {
        return ApiResponseWrapper.error(
          "Missing required parameter: versionId",
          { status: 400 }
        )
      }
    
      const updatedVersion = await versionManager.updateVersion(versionId, { description, tags })
    
      return ApiResponseWrapper.success({
        success: true,
        version: updatedVersion,
      })
    } catch (error) {
      return ApiResponseWrapper.error(
        "Internal server error",
        { status: 500 }
      )
    }
  }
);

export const DELETE = createApiRoute(
  { method: 'DELETE', requireAuth: true, timeout: 60000 },
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const { searchParams } = new URL(req.url)
      const versionId = validatedQuery?.versionId
    
      if (!versionId) {
        return ApiResponseWrapper.error(
          "Missing required parameter: versionId",
          { status: 400 }
        )
      }
    
      await versionManager.deleteVersion(versionId)
    
      return ApiResponseWrapper.success({
        success: true,
        message: "版本已删除",
      })
    } catch (error) {
      return ApiResponseWrapper.error(
        "Internal server error",
        { status: 500 }
      )
    }
  }
);

