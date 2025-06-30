/**
 * @file fastgpt\[...path]\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { ErrorCode } from '@/types/core';

export const GET = createApiRoute(
  RouteConfigs.protectedGet(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const FASTGPT_API_URL = process.env.FASTGPT_API_URL;
      const FASTGPT_API_KEY = process.env.FASTGPT_API_KEY;

      if (!FASTGPT_API_URL || !FASTGPT_API_KEY) {
        return ApiResponseWrapper.error(ErrorCode.CONFIGURATION_ERROR, 'FastGPT configuration missing', null);
      }

      const path = (params?.path as string[])?.join('/') || '';
      const url = new URL(req.url);
      const queryString = url.search;

      const response = await fetch(`${FASTGPT_API_URL}/${path}${queryString}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${FASTGPT_API_KEY}`,
        },
      });

      const data = await response.json();
      return ApiResponseWrapper.success(data);
    } catch (error) {
      console.error('GET /api/fastgpt error:', error);
      return ApiResponseWrapper.error(ErrorCode.INTERNAL_SERVER_ERROR, 'Internal server error', null);
    }
  }
);

export const POST = createApiRoute(
  RouteConfigs.protectedPost(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const FASTGPT_API_URL = process.env.FASTGPT_API_URL;
      const FASTGPT_API_KEY = process.env.FASTGPT_API_KEY;

      if (!FASTGPT_API_URL || !FASTGPT_API_KEY) {
        return ApiResponseWrapper.error(ErrorCode.CONFIGURATION_ERROR, 'FastGPT configuration missing', null);
      }

      const path = (params?.path as string[])?.join('/') || '';

      const response = await fetch(`${FASTGPT_API_URL}/${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${FASTGPT_API_KEY}`,
        },
        body: JSON.stringify(validatedBody),
      });

      const data = await response.json();
      return ApiResponseWrapper.success(data);
    } catch (error) {
      console.error('POST /api/fastgpt error:', error);
      return ApiResponseWrapper.error(ErrorCode.INTERNAL_SERVER_ERROR, 'Internal server error', null);
    }
  }
);

export const DELETE = createApiRoute(
  RouteConfigs.protectedDelete(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const FASTGPT_API_URL = process.env.FASTGPT_API_URL;
      const FASTGPT_API_KEY = process.env.FASTGPT_API_KEY;

      if (!FASTGPT_API_URL || !FASTGPT_API_KEY) {
        return ApiResponseWrapper.error(ErrorCode.CONFIGURATION_ERROR, 'FastGPT configuration missing', null);
      }

      const path = (params?.path as string[])?.join('/') || '';
      const url = new URL(req.url);
      const queryString = url.search;

      const response = await fetch(`${FASTGPT_API_URL}/${path}${queryString}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${FASTGPT_API_KEY}`,
        },
      });

      const data = await response.json();
      return ApiResponseWrapper.success(data);
    } catch (error) {
      console.error('DELETE /api/fastgpt error:', error);
      return ApiResponseWrapper.error(ErrorCode.INTERNAL_SERVER_ERROR, 'Internal server error', null);
    }
  }
);

