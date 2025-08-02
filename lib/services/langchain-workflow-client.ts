/**
 * LangChain工作流客户端服务
 * 
 * 提供与后端LangChain工作流服务的接口，替代自定义工作流引擎
 */

import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();

// 类型定义
export interface LangChainWorkflowConfig {
  name: string;
  description: string;
  type: 'sequential' | 'parallel' | 'conditional' | 'agent_based';
  agents: Array<{
    role: string;
    capabilities: string[];
  }>;
  tools: string[];
  max_iterations?: number;
  temperature?: number;
  model_name?: string;
  timeout?: number;
  enable_memory?: boolean;
  enable_callbacks?: boolean;
}

export interface WorkflowExecutionResult {
  workflow_id: string;
  execution_id: string;
  status: 'running' | 'completed' | 'failed';
  result: Record<string, any>;
  metrics: Record<string, any>;
  logs: string[];
  errors: string[];
  created_at: string;
  completed_at?: string;
}

export interface CreateWorkflowRequest {
  description: string;
  name?: string;
  config?: Record<string, any>;
}

export interface ExecuteWorkflowRequest {
  workflow_id: string;
  inputs: Record<string, any>;
  context?: Record<string, any>;
}

export interface WorkflowResponse {
  success: boolean;
  workflow_id?: string;
  execution_id?: string;
  result?: Record<string, any>;
  message?: string;
  metrics?: Record<string, any>;
}

/**
 * LangChain工作流客户端
 */
export class LangChainWorkflowClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string = '/api/multi-agent/workflows', apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * 创建工作流
   */
  async createWorkflow(config: LangChainWorkflowConfig): Promise<string> {
    try {
      const response = await this.makeRequest('/create', {
        method: 'POST',
        body: JSON.stringify({
          description: config.description,
          name: config.name,
          config: {
            type: config.type,
            agents: config.agents,
            tools: config.tools,
            max_iterations: config.max_iterations,
            temperature: config.temperature,
            model_name: config.model_name,
            timeout: config.timeout,
            enable_memory: config.enable_memory,
            enable_callbacks: config.enable_callbacks
          }
        }),
      });

      const data: WorkflowResponse = await response.json();

      if (!data.success) {
        throw new Error(data.message || '创建工作流失败');
      }

      logger.info(`LangChain工作流创建成功: ${data.workflow_id}`);
      return data.workflow_id!;
    } catch (error) {
      logger.error('创建LangChain工作流失败:', error);
      throw error;
    }
  }

  /**
   * 从自然语言描述创建工作流
   */
  async createWorkflowFromDescription(description: string, name?: string): Promise<string> {
    try {
      const response = await this.makeRequest('/create-from-description', {
        method: 'POST',
        body: JSON.stringify({
          description,
          name,
        }),
      });

      const data: WorkflowResponse = await response.json();

      if (!data.success) {
        throw new Error(data.message || '创建工作流失败');
      }

      logger.info(`LangChain工作流创建成功: ${data.workflow_id}`);
      return data.workflow_id!;
    } catch (error) {
      logger.error('创建LangChain工作流失败:', error);
      throw error;
    }
  }

  /**
   * 执行工作流
   */
  async executeWorkflow(
    workflowId: string,
    inputs: Record<string, any>,
    context?: Record<string, any>
  ): Promise<WorkflowExecutionResult> {
    try {
      const response = await this.makeRequest(`/${workflowId}/execute`, {
        method: 'POST',
        body: JSON.stringify({
          inputs,
          context,
        }),
      });

      const data: WorkflowResponse = await response.json();

      if (!data.success) {
        throw new Error(data.message || '执行工作流失败');
      }

      logger.info(`LangChain工作流执行成功: ${data.execution_id}`);
      return data.result as WorkflowExecutionResult;
    } catch (error) {
      logger.error('执行LangChain工作流失败:', error);
      throw error;
    }
  }

  /**
   * 获取工作流执行状态
   */
  async getWorkflowStatus(executionId: string): Promise<WorkflowExecutionResult | null> {
    try {
      const response = await this.makeRequest(`/status/${executionId}`);

      if (response.status === 404) {
        return null;
      }

      const data: WorkflowResponse = await response.json();
      return data.result as WorkflowExecutionResult;
    } catch (error) {
      logger.error('获取工作流状态失败:', error);
      throw error;
    }
  }

  /**
   * 列出所有工作流
   */
  async listWorkflows(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    type: string;
    agents_count: number;
  }>> {
    try {
      const response = await this.makeRequest('/list');
      const data: WorkflowResponse = await response.json();

      if (!data.success) {
        throw new Error(data.message || '获取工作流列表失败');
      }

      return data.result as any[];
    } catch (error) {
      logger.error('获取工作流列表失败:', error);
      throw error;
    }
  }

  /**
   * 删除工作流
   */
  async deleteWorkflow(workflowId: string): Promise<boolean> {
    try {
      const response = await this.makeRequest(`/${workflowId}`, {
        method: 'DELETE',
      });

      const data: WorkflowResponse = await response.json();
      return data.success;
    } catch (error) {
      logger.error('删除工作流失败:', error);
      throw error;
    }
  }

  /**
   * 解析自然语言工作流（仅解析，不创建）
   */
  async parseWorkflowDescription(description: string): Promise<LangChainWorkflowConfig> {
    try {
      const response = await this.makeRequest('/parse', {
        method: 'POST',
        body: JSON.stringify({ description }),
      });

      const data: WorkflowResponse = await response.json();

      if (!data.success) {
        throw new Error(data.message || '解析工作流描述失败');
      }

      return data.result as LangChainWorkflowConfig;
    } catch (error) {
      logger.error('解析工作流描述失败:', error);
      throw error;
    }
  }

  /**
   * 发起HTTP请求的通用方法
   */
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response;
  }
}

/**
 * 默认的LangChain工作流客户端实例
 */
export const langchainWorkflowClient = new LangChainWorkflowClient();

/**
 * 便捷函数：从自然语言创建并执行工作流
 */
export async function createAndExecuteWorkflow(
  description: string,
  inputs: Record<string, any>,
  name?: string
): Promise<WorkflowExecutionResult> {
  const workflowId = await langchainWorkflowClient.createWorkflowFromDescription(description, name);
  return await langchainWorkflowClient.executeWorkflow(workflowId, inputs);
}

/**
 * 便捷函数：等待工作流执行完成
 */
export async function waitForWorkflowCompletion(
  executionId: string,
  maxWaitTime: number = 300000, // 5分钟
  pollInterval: number = 2000 // 2秒
): Promise<WorkflowExecutionResult> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    const status = await langchainWorkflowClient.getWorkflowStatus(executionId);

    if (!status) {
      throw new Error(`工作流执行记录不存在: ${executionId}`);
    }

    if (status.status === 'completed' || status.status === 'failed') {
      return status;
    }

    // 等待下次轮询
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error(`工作流执行超时: ${executionId}`);
}

export default LangChainWorkflowClient;