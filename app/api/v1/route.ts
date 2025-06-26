/**
 * @file v1\route.ts
 * @description API v1 route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs, CommonValidations } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';

export const GET = createApiRoute(
  RouteConfigs.publicGet(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      return ApiResponseWrapper.success({
        success: true,
        version: 'v1',
        message: 'API v1 is running',
        timestamp: new Date().toISOString(),
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
      
      return ApiResponseWrapper.success({
        success: true,
        message: 'POST request processed',
        data: body,
        timestamp: new Date().toISOString(),
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
      
      return ApiResponseWrapper.success({
        success: true,
        message: 'PUT request processed',
        data: body,
        timestamp: new Date().toISOString(),
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
      return ApiResponseWrapper.success({
        success: true,
        message: 'DELETE request processed',
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      return ApiResponseWrapper.error(
        "Internal server error",
        { status: 500 }
      )
    }
  }
);