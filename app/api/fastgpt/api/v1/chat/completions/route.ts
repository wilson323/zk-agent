/**
 * @file fastgpt\api\v1\chat\completions\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { ErrorCode } from '@/types/core';

export const POST = createApiRoute(
  RouteConfigs.protectedPost(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const FASTGPT_API_URL = process.env.FASTGPT_API_URL;
      const FASTGPT_API_KEY = process.env.FASTGPT_API_KEY;
      
      if (!FASTGPT_API_URL || !FASTGPT_API_KEY) {
        return ApiResponseWrapper.error(ErrorCode.CONFIGURATION_ERROR, 'FastGPT配置缺失', null);
      }
      
      const response = await fetch(`${FASTGPT_API_URL}/api/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${FASTGPT_API_KEY}`,
        },
        body: JSON.stringify(validatedBody),
      });
  
      // For streaming responses, we need to return the response as is
      if (validatedBody.stream) {
        // Create a new readable stream
        const stream = new ReadableStream({
          async start(controller) {
            // Get the response body as a reader
            const reader = response.body?.getReader();
            if (!reader) {
              controller.close();
              return;
            }
  
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) {
                  break;
                }
                // Push the chunk to the new stream
                controller.enqueue(value);
              }
            } finally {
              controller.close();
              reader.releaseLock();
            }
          },
        });
  
        // Return the stream with the appropriate headers
        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }
  
      // For non-streaming responses, return the JSON
      const data = await response.json();
      return ApiResponseWrapper.success(data);
    } catch (error) {
      console.error('FastGPT API error:', error);
      return ApiResponseWrapper.error(ErrorCode.INTERNAL_SERVER_ERROR, 'FastGPT API调用失败', null);
    }
  }
);

