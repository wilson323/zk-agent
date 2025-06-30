// @ts-nocheck
/**
 * AI模型适配器
 * 统一不同厂商的API调用接口
 */

import { ModelProvider, ModelType, type AIModelConfig, type ModelCallResult } from "@/types/ai-models"
import { AgUICoreAdapter } from "@/lib/ag-ui/core-adapter"

export class AIModelAdapter {
  private config: AIModelConfig
  private agUiAdapter: AgUICoreAdapter

  constructor(config: AIModelConfig, agUiAdapter: AgUICoreAdapter) {
    this.config = config
    this.agUiAdapter = agUiAdapter
  }

  /**
   * 统一的模型调用接口
   */
  async call(appId: string, chatId: string, params: {
    messages?: any[]
    prompt?: string
    image?: string
    audio?: ArrayBuffer
    temperature?: number
    maxTokens?: number
    stream?: boolean
    [key: string]: any
  }): Promise<ModelCallResult> {
    const startTime = Date.now()

    try {
      // Use AgUICoreAdapter to handle the chat completion
      const resultObservable = await this.agUiAdapter.handleChatCompletion(
        appId,
        chatId,
        params.messages,
        params.systemPrompt,
        params.variables
      )

      // Convert Observable to a Promise for ModelCallResult
      const result = await new Promise<ModelCallResult>((resolve, reject) => {
        let fullContent = ""
        let finalUsage: any = {}
        let finalError: string | undefined
        let success = true

        resultObservable.subscribe({
          next: (event) => {
            if (event.type === "TEXT_MESSAGE_CONTENT") {
              fullContent += event.delta
            } else if (event.type === "RUN_FINISHED") {
              finalUsage = event.usage || {};
            } else if (event.type === "RUN_ERROR") {
              success = false;
              finalError = event.message;
            }
          },
          error: (err) => {
            success = false
            finalError = err.message
            reject(err)
          },
          complete: () => {
            resolve({
              success: success,
              data: fullContent,
              usage: finalUsage, // Placeholder for now
              latency: Date.now() - startTime,
              modelId: this.config.modelId,
              provider: this.config.provider,
              error: finalError,
            })
          },
        })
      })

      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        latency: Date.now() - startTime,
        modelId: this.config.modelId,
        provider: this.config.provider,
      }
    }
  }

  

  
}
