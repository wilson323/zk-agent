/**
 * @file fastgpt\test-connection\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs, CommonValidations } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';

export const POST = createApiRoute(
  RouteConfigs.protectedPost(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const body = await req.json()
      const { baseUrl, useProxy } = body
    
      // Use server-side environment variable for API key
      const apiKey = process.env.FASTGPT_API_KEY
    
      // Use server-side or provided API URL
      const apiUrl = process.env.FASTGPT_API_URL || baseUrl || "https://zktecoaihub.com"
    
      // Determine the actual API endpoint for testing
      const endpoint = useProxy
        ? `/api/proxy?url=${encodeURIComponent(apiUrl.replace(/^https?:\/\//, ""))}/api/v1/models`
        : `${apiUrl}/api/v1/models`
    
      // Make the request to test the connection
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })
    
      if (!response.ok) {
        // Try with root endpoint if models endpoint fails
        const rootEndpoint = useProxy
          ? `/api/proxy?url=${encodeURIComponent(apiUrl.replace(/^https?:\/\//, ""))}`
          : apiUrl
    
        const rootResponse = await fetch(rootEndpoint, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        })
    
        if (!rootResponse.ok) {
          const errorData = await rootResponse.json().catch(() => ({ error: { message: rootResponse.statusText } }))
          return ApiResponseWrapper.success({
            success: false,
            error: errorData.error || { message: rootResponse.statusText },
            status: rootResponse.status,
          })
        }
    
        const rootData = await rootResponse.json().catch(() => ({}))
        return ApiResponseWrapper.success({ success: true, data: rootData, useProxy })
      }
    
      const data = await response.json()
      return ApiResponseWrapper.success({ success: true, data, useProxy })
    } catch (error) {
      return ApiResponseWrapper.error('Internal server error', 500)
    }
  }
);

