/**
 * @file fastgpt\chat\route.ts
 * @description FastGPT chat API route with streaming support
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { ErrorCode } from '@/types/core';

export const POST = createApiRoute(
  RouteConfigs.protectedPost(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }): Promise<NextResponse> => {
    try {
      const body = await req.json();
      const { messages, stream, detail, chatId, responseChatItemId, variables, baseUrl, useProxy } = body;
    
      // Use server-side environment variable for API key
      const apiKey = process.env.FASTGPT_API_KEY;
      if (!apiKey) {
        return ApiResponseWrapper.error(
          ErrorCode.EXTERNAL_SERVICE_ERROR,
          'FastGPT API key not configured',
          null,
          500
        );
      }

      // Use server-side or provided API URL
      const apiUrl = process.env.FASTGPT_API_URL || baseUrl || "https://zktecoaihub.com";
    
      // Determine the actual API endpoint
      const endpoint = useProxy
        ? `/api/proxy?url=${encodeURIComponent(apiUrl.replace(/^https?:\/\//, ""))}/api/v1/chat/completions`
        : `${apiUrl}/api/v1/chat/completions`;
    
      // Prepare the request to the FastGPT API
      const fastGPTRequest = {
        messages,
        stream: stream || false,
        detail: detail || false,
        ...(chatId && { chatId }),
        ...(responseChatItemId && { responseChatItemId }),
        ...(variables && { variables }),
      };
    
      // Make the request to the FastGPT API
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(fastGPTRequest),
      });
    
      // Handle streaming response
      if (stream) {
        // Return the stream directly
        const readableStream = new ReadableStream({
          async start(controller) {
            const reader = response.body?.getReader();
            if (!reader) {
              controller.close();
              return;
            }
    
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) {
                  controller.close();
                  break;
                }
                controller.enqueue(value);
              }
            } catch (error) {
              console.error('Stream reading error:', error);
              controller.close();
            }
          },
        });
    
        return new NextResponse(readableStream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }
    
      // Handle non-streaming response
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
        return ApiResponseWrapper.error(
          ErrorCode.EXTERNAL_SERVICE_ERROR,
          errorData.error?.message || 'FastGPT API error',
          null,
          response.status
        );
      }
    
      const data = await response.json();
      return ApiResponseWrapper.success(data);
    } catch (error) {
      console.error('FastGPT chat error:', error);
      return ApiResponseWrapper.error(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Internal server error',
        null,
        500
      );
    }
  }
);