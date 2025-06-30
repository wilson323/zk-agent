/**
 * @file ag-ui\chat\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { ErrorCode } from '@/types/core';
import { ChatRequest, AgUiEvent } from '@/types/fastgpt';
import { fetchEventSource } from "@microsoft/fetch-event-source"

export const POST = createApiRoute(
  RouteConfigs.protectedPost(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const body: ChatRequest = await req.json();
      const { 
        appId, 
        chatId, 
        messages, 
        system: systemPrompt, 
        variables,
        tools, 
        context 
      } = body;
    
      // 验证必要参数
      if (!appId || !messages) {
        return ApiResponseWrapper.error(ErrorCode.VALIDATION_ERROR, 'Missing required parameters: appId and messages', null, 400)
      }
    
      // 获取环境变量
      const apiUrl = process.env.FASTGPT_API_URL || "/api/proxy/fastgpt"
      const apiKey = process.env.FASTGPT_API_KEY
    
      if (!apiKey) {
        return ApiResponseWrapper.error(ErrorCode.INTERNAL_SERVER_ERROR, 'FastGPT API key not configured', null, 500)
      }
    
        // 创建响应流
        const stream = new TransformStream()
        const writer = stream.writable.getWriter()
        const encoder = new TextEncoder()
    
        // 生成唯一ID
        const threadId = `thread-${Date.now()}`
        const runId = `run-${Date.now()}`
        const messageId = `msg-${Date.now()}`
    
        // 发送运行开始事件
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "RUN_STARTED",
              threadId,
              runId,
              timestamp: Date.now(),
            })}\n\n`,
          ),
        )
    
        // 发送消息开始事件
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "TEXT_MESSAGE_START",
              messageId,
              role: "assistant",
              timestamp: Date.now(),
            })}\n\n`,
          ),
        )
    
        // 调用FastGPT API
        fetchEventSource(`${apiUrl}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            appId,
            chatId,
            messages,
            stream: true,
            detail: true,
            system: systemPrompt,
            variables,
          }),
          async onmessage(event) {
            try {
              if (event.data === "[DONE]") {return}
    
              const data = JSON.parse(event.data)
    
              // 转换为AG-UI事件并写入流
              if (data.choices && data.choices[0].delta) {
                const delta = data.choices[0].delta
    
                // 处理文本内容
                if (delta.content) {
                  await writer.write(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        type: "TEXT_MESSAGE_CONTENT",
                        messageId,
                        delta: delta.content,
                        timestamp: Date.now(),
                      })}\n\n`,
                    ),
                  )
                }
    
                // 处理工具调用
                if (delta.tool_calls && delta.tool_calls.length > 0) {
                  const toolCall = delta.tool_calls[0]
                  const toolCallId = `tool-${toolCall.index}-${runId}`
    
                  // 工具调用开始
                  if (toolCall.function && toolCall.function.name) {
                    await writer.write(
                      encoder.encode(
                        `data: ${JSON.stringify({
                          type: "TOOL_CALL_START",
                          toolCallId,
                          toolCallName: toolCall.function.name,
                          parentMessageId: messageId,
                          timestamp: Date.now(),
                        })}\n\n`,
                      ),
                    )
                  }
    
                  // 工具调用参数
                  if (toolCall.function && toolCall.function.arguments) {
                    await writer.write(
                      encoder.encode(
                        `data: ${JSON.stringify({
                          type: "TOOL_CALL_ARGS",
                          toolCallId,
                          delta: toolCall.function.arguments,
                          timestamp: Date.now(),
                        })}\n\n`,
                      ),
                    )
                  }
    
                  // 工具调用结束
                  await writer.write(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        type: "TOOL_CALL_END",
                        toolCallId,
                        timestamp: Date.now(),
                      })}\n\n`,
                    ),
                  )
                }
              }
    
              // 同时写入原始数据，保持兼容性
              await writer.write(encoder.encode(`data: ${event.data}\n\n`))
            } catch (error) {
              console.error('Error processing message:', error)
            }
          },
          async onclose() {
            // 发送消息结束和运行结束事件
            await writer.write(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "TEXT_MESSAGE_END",
                  messageId,
                  timestamp: Date.now(),
                })}\n\n`,
              ),
            )
    
            await writer.write(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "RUN_FINISHED",
                  threadId,
                  runId,
                  timestamp: Date.now(),
                })}\n\n`,
              ),
            )
    
            await writer.close()
          },
          onerror(error) {
            console.error('EventSource error:', error)
            writer
              .write(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "RUN_ERROR",
                    message: error.message || "Unknown error",
                    code: 500,
                    timestamp: Date.now(),
                  })}\n\n`,
                ),
              )
              .catch(console.error)
          },
        }).catch(async (error) => {
          console.error('FastGPT API error:', error)
          await writer.write(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "RUN_ERROR",
                message: error.message || "Failed to connect to FastGPT API",
                code: 500,
                timestamp: Date.now(),
              })}\n\n`,
            ),
          )
          await writer.close()
        })
    
      // 返回流式响应
      return new NextResponse(stream.readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      })
    } catch (error) {
      return ApiResponseWrapper.error(ErrorCode.INTERNAL_SERVER_ERROR, 'Internal server error', null, 500)
    }
  }
);

