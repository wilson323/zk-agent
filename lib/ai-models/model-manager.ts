/**
 * AI模型管理器
 * 负责模型的增删改查和调用
 */

import { AIModelAdapter } from "./model-adapter"
import type { AIModelConfig, ModelCallResult, ModelMetrics } from "@/types/ai-models"
import { AgUICoreAdapter } from "@/lib/ag-ui/core-adapter"
import * as client from 'prom-client'

// Prometheus Metrics for AI Models
const aiModelTotalCalls = new client.Gauge({
  name: 'ai_model_total_calls',
  help: 'Total number of calls to AI models',
  labelNames: ['model_id', 'provider', 'type']
})

const aiModelSuccessRate = new client.Gauge({
  name: 'ai_model_success_rate',
  help: 'Success rate of AI model calls',
  labelNames: ['model_id', 'provider', 'type']
})

const aiModelAverageLatency = new client.Gauge({
  name: 'ai_model_average_latency_ms',
  help: 'Average latency of AI model calls in milliseconds',
  labelNames: ['model_id', 'provider', 'type']
})

const aiModelTotalCost = new client.Gauge({
  name: 'ai_model_total_cost',
  help: 'Total estimated cost of AI model calls',
  labelNames: ['model_id', 'provider', 'type']
})

export class AIModelManager {
  private models: Map<string, AIModelConfig> = new Map()
  private adapters: Map<string, AIModelAdapter> = new Map()
  private metrics: Map<string, ModelMetrics> = new Map()
  private agUiAdapter: AgUICoreAdapter

  constructor(agUiAdapter: AgUICoreAdapter) {
    this.agUiAdapter = agUiAdapter
    this.loadModelsFromStorage()
  }

  /**
   * 添加模型配置
   */
  async addModel(config: Omit<AIModelConfig, "id" | "createdAt" | "updatedAt">): Promise<AIModelConfig> {
    const modelConfig: AIModelConfig = {
      ...config,
      id: `model_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // 验证模型配置
    await this.validateModelConfig(modelConfig)

    // 保存模型配置
    this.models.set(modelConfig.id, modelConfig)
    this.adapters.set(modelConfig.id, new AIModelAdapter(modelConfig))

    // 初始化指标
    this.metrics.set(modelConfig.id, {
      modelId: modelConfig.id,
      totalCalls: 0,
      successRate: 0,
      averageLatency: 0,
      totalCost: 0,
      errorCount: 0,
      lastUsed: "",
      dailyUsage: [],
    })

    // 保存到存储
    await this.saveModelsToStorage()

    return modelConfig
  }

  /**
   * 更新模型配置
   */
  async updateModel(id: string, updates: Partial<AIModelConfig>): Promise<AIModelConfig> {
    const existingModel = this.models.get(id)
    if (!existingModel) {
      throw new Error(`Model not found: ${id}`)
    }

    const updatedModel: AIModelConfig = {
      ...existingModel,
      ...updates,
      id, // 确保ID不被修改
      updatedAt: new Date().toISOString(),
    }

    // 验证更新后的配置
    await this.validateModelConfig(updatedModel)

    // 更新模型和适配器
    this.models.set(id, updatedModel)
    this.adapters.set(id, new AIModelAdapter(updatedModel))

    // 保存到存储
    await this.saveModelsToStorage()

    return updatedModel
  }

  /**
   * 删除模型
   */
  async deleteModel(id: string): Promise<void> {
    if (!this.models.has(id)) {
      throw new Error(`Model not found: ${id}`)
    }

    this.models.delete(id)
    this.adapters.delete(id)
    this.metrics.delete(id)

    await this.saveModelsToStorage()
  }

  /**
   * 获取模型配置
   */
  getModel(id: string): AIModelConfig | undefined {
    return this.models.get(id)
  }

  /**
   * 获取所有模型
   */
  getAllModels(): AIModelConfig[] {
    return Array.from(this.models.values())
  }

  /**
   * 根据类型获取模型
   */
  getModelsByType(type: string): AIModelConfig[] {
    return Array.from(this.models.values()).filter((model) => model.type === type)
  }

  /**
   * 调用模型
   */
  async callModel(modelId: string, params: any): Promise<ModelCallResult> {
    const adapter = this.adapters.get(modelId)
    if (!adapter) {
      throw new Error(`Model adapter not found: ${modelId}`)
    }

    const model = this.models.get(modelId)
    if (!model || !model.isActive) {
      throw new Error(`Model not active: ${modelId}`)
    }

    // 调用模型
    const result = await adapter.call(params)

    // 更新指标
    await this.updateMetrics(modelId, result)

    return result
  }

  /**
   * 测试模型连接
   */
  async testModel(modelId: string): Promise<{ success: boolean; error?: string; latency?: number }> {
    try {
      const testParams = {
        messages: [{ role: "user", content: "Hello, this is a test message." }],
        maxTokens: 10,
        temperature: 0.1,
      }

      const result = await this.callModel(modelId, "test_app_id", "test_chat_id", testParams)

      return {
        success: result.success,
        error: result.error,
        latency: result.latency,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  /**
   * 获取模型指标
   */
  getModelMetrics(modelId: string): ModelMetrics | undefined {
    return this.metrics.get(modelId)
  }

  /**
   * 获取所有模型指标
   */
  getAllMetrics(): ModelMetrics[] {
    return Array.from(this.metrics.values())
  }

  /**
   * 验证模型配置
   */
  private async validateModelConfig(config: AIModelConfig): Promise<void> {
    // 基本验证
    if (!config.name || !config.provider || !config.type || !config.modelId) {
      throw new Error("Missing required model configuration fields")
    }

    if (!config.apiKey && config.provider !== "local") {
      throw new Error("API key is required for external providers")
    }

    // 可选：测试API连接
    if (config.isActive) {
      try {
        const adapter = new AIModelAdapter(config)
        const testResult = await adapter.call({
          messages: [{ role: "user", content: "test" }],
          maxTokens: 1,
        })

        if (!testResult.success) {
          console.warn(`Model validation warning: ${testResult.error}`)
        }
      } catch (error) {
        console.warn(`Model validation failed: ${error}`)
        // 不抛出错误，允许保存配置但标记为非活跃
        config.isActive = false
      }
    }
  }

  /**
   * 更新模型指标
   */
  private async updateMetrics(modelId: string, result: ModelCallResult): Promise<void> {
    const metrics = this.metrics.get(modelId)
    if (!metrics) {return}

    // 更新基本指标
    metrics.totalCalls++
    metrics.lastUsed = new Date().toISOString()

    // Update Prometheus metrics
    const modelLabels = {
      model_id: modelId,
      provider: model?.provider || 'unknown',
      type: model?.type || 'unknown',
    };
    aiModelTotalCalls.set(modelLabels, metrics.totalCalls);
    aiModelSuccessRate.set(modelLabels, metrics.successRate);
    aiModelAverageLatency.set(modelLabels, metrics.averageLatency);
    aiModelTotalCost.set(modelLabels, metrics.totalCost);

    if (result.success) {
      // 更新成功率
      const successCount = metrics.totalCalls - metrics.errorCount
      metrics.successRate = successCount / metrics.totalCalls

      // 更新平均延迟
      if (result.latency) {
        metrics.averageLatency =
          (metrics.averageLatency * (metrics.totalCalls - 1) + result.latency) / metrics.totalCalls
      }

      // 更新成本
      if (result.usage?.totalTokens) {
        const model = this.models.get(modelId)
        if (model?.metadata?.pricing) {
          const cost =
            (result.usage.promptTokens || 0) * (model.metadata.pricing.inputTokenPrice || 0) +
            (result.usage.completionTokens || 0) * (model.metadata.pricing.outputTokenPrice || 0)
          metrics.totalCost += cost
        }
      }
    } else {
      metrics.errorCount++
      metrics.successRate = (metrics.totalCalls - metrics.errorCount) / metrics.totalCalls
    }

    // 更新每日使用量
    const today = new Date().toISOString().split("T")[0]
    let dailyUsage = metrics.dailyUsage.find((usage) => usage.date === today)

    if (!dailyUsage) {
      dailyUsage = { date: today, calls: 0, cost: 0 }
      metrics.dailyUsage.push(dailyUsage)
    }

    dailyUsage.calls++
    if (result.usage?.totalTokens && result.success) {
      const model = this.models.get(modelId)
      if (model?.metadata?.pricing) {
        const cost =
          (result.usage.promptTokens || 0) * (model.metadata.pricing.inputTokenPrice || 0) +
          (result.usage.completionTokens || 0) * (model.metadata.pricing.outputTokenPrice || 0)
        dailyUsage.cost += cost
      }
    }

    // 保持最近30天的数据
    metrics.dailyUsage = metrics.dailyUsage.slice(-30)

    // 保存指标
    await this.saveMetricsToStorage()
  }

  /**
   * 从存储加载模型配置
   */
  private async loadModelsFromStorage(): Promise<void> {
    try {
      const modelsData = localStorage.getItem("ai_models_config")
      if (modelsData) {
        const models: AIModelConfig[] = JSON.parse(modelsData)
        for (const model of models) {
          this.models.set(model.id, model)
          this.adapters.set(model.id, new AIModelAdapter(model, this.agUiAdapter))
        }
      }

      const metricsData = localStorage.getItem("ai_models_metrics")
      if (metricsData) {
        const metrics: ModelMetrics[] = JSON.parse(metricsData)
        for (const metric of metrics) {
          this.metrics.set(metric.modelId, metric)
        }
      }
    } catch (error) {
      console.error("Failed to load models from storage:", error)
    }
  }

  /**
   * 保存模型配置到存储
   */
  private async saveModelsToStorage(): Promise<void> {
    try {
      const models = Array.from(this.models.values())
      localStorage.setItem("ai_models_config", JSON.stringify(models))
    } catch (error) {
      console.error("Failed to save models to storage:", error)
    }
  }

  /**
   * 保存指标到存储
   */
  private async saveMetricsToStorage(): Promise<void> {
    try {
      const metrics = Array.from(this.metrics.values())
      localStorage.setItem("ai_models_metrics", JSON.stringify(metrics))
    } catch (error) {
      console.error("Failed to save metrics to storage:", error)
    }
  }
}

import { AgUICoreAdapter } from "@/lib/ag-ui/core-adapter"

// 创建全局实例
export const agUiAdapter = new AgUICoreAdapter()
export const aiModelManager = new AIModelManager(agUiAdapter)
