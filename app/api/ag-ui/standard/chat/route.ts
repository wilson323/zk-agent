/**
 * @file ag-ui\standard\chat\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs, CommonValidations } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { AgUIRuntime } from "@/lib/ag-ui/protocol/runtime"
import { AgUIAgentManager } from "@/lib/ag-ui/protocol/agent-manager"

export const POST = createApiRoute(
  RouteConfigs.protectedPost(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const body = await req.json()
      const { threadId, runId, appId, apiKey, messages, tools, state, config } = body
    
      // 验证必需参数
      if (!threadId || !runId || !appId || !messages) {
        return ApiResponseWrapper.error(
          "Missing required parameters: threadId, runId, appId, messages",
          { status: 400 }
        )
      }
    
        // 创建智能体管理器
        const agentManager = new AgUIAgentManager()
    
        // 从FastGPT创建智能体定义
        const agent = await agentManager.createAgentFromFastGPT(appId, apiKey)
    
        // 创建运行时
        const runtime = new AgUIRuntime({
          threadId,
          debug: process.env.NODE_ENV === "development",
          apiEndpoint: "/api/fastgpt/chat",
        })
    
        // 设置智能体
        runtime.setAgent(agent)
    
        // 创建可读流用于SSE
        const stream = new ReadableStream({
          start(controller) {
            // 订阅事件流
            const subscription = runtime.getEventStream().subscribe({
              next: (event) => {
                // 发送AG-UI事件
                const data = `data: ${JSON.stringify(event)}\n\n`
                controller.enqueue(new TextEncoder().encode(data))
              },
              error: (error) => {
                console.error('Runtime error:', error)
                const errorEvent = {
                  type: "run-error",
                  threadId,
                  runId,
                  error: {
                    message: error.message,
                    details: error,
                  },
                  timestamp: Date.now(),
                }
                const data = `data: ${JSON.stringify(errorEvent)}\n\n`
                controller.enqueue(new TextEncoder().encode(data))
                controller.close()
              },
              complete: () => {
                controller.close()
              },
            })
    
            // 执行运行
            runtime
              .run(
                {
                  threadId,
                  runId,
                  messages,
                  tools: tools || agent.tools,
                  state: state || {},
                },
                config,
              )
              .catch((error) => {
                console.error('Runtime execution error:', error)
                const errorEvent = {
                  type: "run-error",
                  threadId,
                  runId,
                  error: {
                    message: error.message,
                    details: error,
                  },
                  timestamp: Date.now(),
                }
                const data = `data: ${JSON.stringify(errorEvent)}\n\n`
                controller.enqueue(new TextEncoder().encode(data))
                controller.close()
              })
    
            // 清理函数
            return () => {
              subscription.unsubscribe()
              runtime.dispose()
            }
          },
        })
    
        // 返回SSE响应
        return new NextResponse(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        })
    } catch (error) {
      return ApiResponseWrapper.error(
        "Internal server error",
        { status: 500 }
      )
    }
  }
);

