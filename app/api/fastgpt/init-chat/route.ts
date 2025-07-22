/**
 * @file fastgpt\init-chat\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { createApiRoute, RouteConfigs, ApiResponseWrapper } from '@/lib/middleware/api-route-wrapper';
import { ErrorCode } from '@/types/core';

export const POST = createApiRoute(RouteConfigs.protectedPost(), async (req, { validatedBody }) => {
  try {
    const { model, agent_id, knowledge_id, user: userParam, baseUrl, useProxy } = validatedBody || {};

    // Use server-side environment variable for API key
    const apiKey = process.env.FASTGPT_API_KEY;

    // Use server-side or provided API URL
    const apiUrl = process.env.FASTGPT_API_URL || baseUrl || 'https://zktecoaihub.com';

    // Determine the actual API endpoint
    const endpoint = useProxy
      ? `/api/proxy?url=${encodeURIComponent(apiUrl.replace(/^https?:\/\//, ''))}/api/v1/chat/init`
      : `${apiUrl}/api/v1/chat/init`;

    // Prepare the request to the FastGPT API
    const fastGPTRequest = {
      ...(model && { model }),
      ...(agent_id && { agent_id }),
      ...(knowledge_id && { knowledge_id }),
      ...(userParam && { user: userParam }),
    };

    // Make the request to the FastGPT API
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(fastGPTRequest),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: { message: response.statusText } }));
      return ApiResponseWrapper.error(
        errorData.error?.message || 'FastGPT API error',
        ErrorCode.EXTERNAL_SERVICE_ERROR
      );
    }

    const data = await response.json();
    return ApiResponseWrapper.success(data);
  } catch (error) {
    return ApiResponseWrapper.error(ErrorCode.INTERNAL_SERVER_ERROR, 'Internal server error');
  }
});
