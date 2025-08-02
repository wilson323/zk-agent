/**
 * @file fastgpt\test-connection\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { createApiRoute, ApiResponseWrapper, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ErrorCode } from '@/types/core';

export const POST = createApiRoute(RouteConfigs.protectedPost(), async (req, { validatedBody }) => {
  try {
    const { baseUrl, useProxy } = validatedBody;

    // Use server-side environment variable for API key
    const apiKey = process.env.FASTGPT_API_KEY;

    // Use server-side or provided API URL
    const apiUrl = process.env.FASTGPT_API_URL || baseUrl || 'https://zktecoaihub.com';

    // Determine the actual API endpoint for testing
    const endpoint = useProxy
      ? `/api/proxy?url=${encodeURIComponent(apiUrl.replace(/^https?:\/\//, ''))}/api/v1/models`
      : `${apiUrl}/api/v1/models`;

    if (!apiKey) {
      return ApiResponseWrapper.error(ErrorCode.EXTERNAL_SERVICE_ERROR, 'FastGPT API key not configured');
    }

    // Test the connection by making a simple request
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: { message: response.statusText } }));
      return ApiResponseWrapper.error(
        ErrorCode.EXTERNAL_SERVICE_ERROR,
        `Connection test failed: ${errorData.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    return ApiResponseWrapper.success({ success: true, data, useProxy });
  } catch (error) {
    return ApiResponseWrapper.error(ErrorCode.INTERNAL_SERVER_ERROR, 'Internal server error');
  }
});
