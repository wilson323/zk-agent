/**
 * @file ag-ui\standard\chat\route.ts
 * @description AG-UI standard chat API route
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { ErrorCode } from '@/types/core';

export const POST = createApiRoute(
  RouteConfigs.protectedPost(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const body = await req.json();
      const { threadId, runId, appId, apiKey, messages, tools, state, config } = body;
    
      // 验证必需参数
      if (!threadId || !runId || !appId || !messages) {
        return ApiResponseWrapper.error(ErrorCode.VALIDATION_ERROR, 'Missing required parameters: threadId, runId, appId, messages', null, 400);
      }

      // 模拟AG-UI智能体管理器
      const agentManager = {
        createAgentFromFastGPT: async (appId: string, apiKey: string) => {
          return {
            id: appId,
            tools: tools || [],
            config: config || {}
          };
        }
      };
    
      // 从FastGPT创建智能体定义
      const agent = await agentManager.createAgentFromFastGPT(appId, apiKey);
    
      // 模拟运行时
      const runtime = {
        setAgent: (agent: any) => {},
        getEventStream: () => ({
          subscribe: (callbacks: any) => {
            // 模拟事件流
            setTimeout(() => {
              callbacks.next({
                type: "run-start",
                threadId,
                runId,
                timestamp: Date.now()
              });
              
              callbacks.next({
                type: "message",
                threadId,
                runId,
                content: "Hello from AG-UI agent!",
                timestamp: Date.now()
              });
              
              callbacks.complete();
            }, 100);
            
            return {
              unsubscribe: () => {}
            };
          }
        }),
        run: async (params: any, config: any) => {
          return Promise.resolve();
        },
        dispose: () => {}
      };
    
      // 设置智能体
      runtime.setAgent(agent);
    
      // 创建可读流用于SSE
      const stream = new ReadableStream({
        start(controller) {
          // 订阅事件流
          const subscription = runtime.getEventStream().subscribe({
            next: (event: any) => {
              // 发送AG-UI事件
              const data = `data: ${JSON.stringify(event)}\n\n`;
              controller.enqueue(new TextEncoder().encode(data));
            },
            error: (error: any) => {
              console.error('Runtime error:', error);
              const errorEvent = {
                type: "run-error",
                threadId,
                runId,
                error: {
                  message: error.message,
                  details: error,
                },
                timestamp: Date.now(),
              };
              const data = `data: ${JSON.stringify(errorEvent)}\n\n`;
              controller.enqueue(new TextEncoder().encode(data));
              controller.close();
            },
            complete: () => {
              controller.close();
            },
          });
    
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
              console.error('Runtime execution error:', error);
              const errorEvent = {
                type: "run-error",
                threadId,
                runId,
                error: {
                  message: error.message,
                  details: error,
                },
                timestamp: Date.now(),
              };
              const data = `data: ${JSON.stringify(errorEvent)}\n\n`;
              controller.enqueue(new TextEncoder().encode(data));
              controller.close();
            });
    
          // 清理函数
          return () => {
            subscription.unsubscribe();
            runtime.dispose();
          };
        },
      });
    
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
      });
    } catch (error) {
      console.error('AG-UI chat error:', error);
      return ApiResponseWrapper.error(ErrorCode.INTERNAL_SERVER_ERROR, 'Internal server error', null, 500);
    }
  }
);

