/**
 * @file fastgpt\chat\route.ts
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
      const body = await req.json();
      const { messages, stream, detail, chatId, responseChatItemId, variables, baseUrl, useProxy } = body;
    
        // Use server-side environment variable for API key
        const apiKey = process.env.FASTGPT_API_KEY
    
        // Use server-side or provided API URL
        const apiUrl = process.env.FASTGPT_API_URL || baseUrl || "https://zktecoaihub.com"
    
        // Determine the actual API endpoint
        const endpoint = useProxy
          ? `/api/proxy?url=${encodeURIComponent(apiUrl.replace(/^https?:\/\//, ""))}/api/v1/chat/completions`
          : `${apiUrl}/api/v1/chat/completions`
    
        // Prepare the request to the FastGPT API
        const fastGPTRequest = {
          messages,
          stream: stream || false,
          detail: detail || false,
          ...(chatId && { chatId }),
          ...(responseChatItemId && { responseChatItemId }),
          ...(variables && { variables }),
        }
    
        // Make the request to the FastGPT API
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(fastGPTRequest),
        })
    
        // Handle streaming response
        if (stream) {
          // Return the stream directly
          const readableStream = new ReadableStream({
            async start(controller) {
              const reader = response.body?.getReader()
              if (!reader) {
                controller.close()
                return
              }
    
              
                while (true) {
                  const { done, value } = await reader.read()
                  if (done) {
                    controller.close()
                    break
                  }
                  controller.enqueue(value)
                }
              
            },
          })
    
          return new Response(readableStream, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
            },
          })
        }
    
        // Handle non-streaming response
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }))
          return ApiResponseWrapper.success(errorData, { status: response.status })
        }
    
        const data = await response.json();
        return ApiResponseWrapper.success(data);
    } catch (error) {
      console.error('FastGPT chat error:', error);
      return ApiResponseWrapper.error(
        'Internal server error',
        500
      );
    }
  }
);

