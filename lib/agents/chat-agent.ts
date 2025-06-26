/**
 * 对话智能体 - 上下文恢复和API容错实现
 * 提供上下文恢复、API调用容错、模型切换等功能
 */

import {
  AgentError,
  ChatContextLost,
  ChatAPIError,
  ChatRateLimit,
  ChatModelUnavailable,
  ChatServiceUnavailable,
  ChatContext,
  ChatResponse,
  delay,
  calculateBackoffDelay
} from '../errors/agent-errors';

// 聊天模型配置接口
interface ChatModel {
  id: string;
  name: string;
  provider: string;
  maxTokens: number;
  rateLimit: number; // 每分钟请求数
  priority: number; // 优先级，数字越小优先级越高
  isAvailable: boolean;
}

// 缓存接口
interface CacheInterface {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
}

// 数据库接口
interface DatabaseInterface {
  getChatContext(chatId: string): Promise<ChatContext | null>;
  saveChatContext(context: ChatContext): Promise<void>;
  getChatHistory(chatId: string, limit?: number): Promise<any[]>;
}

// 内存缓存实现
class MemoryCache implements CacheInterface {
  private cache = new Map<string, { value: any; expiry: number }>();

  async get(key: string): Promise<any> {
    const item = this.cache.get(key);
    if (!item) {return null;}
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  async set(key: string, value: any, ttl: number = 3600000): Promise<void> {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }
}

// 模拟数据库实现
class MockDatabase implements DatabaseInterface {
  private contexts = new Map<string, ChatContext>();
  private histories = new Map<string, any[]>();

  async getChatContext(chatId: string): Promise<ChatContext | null> {
    return this.contexts.get(chatId) || null;
  }

  async saveChatContext(context: ChatContext): Promise<void> {
    this.contexts.set(context.chatId, context);
  }

  async getChatHistory(chatId: string, limit: number = 50): Promise<any[]> {
    const history = this.histories.get(chatId) || [];
    return history.slice(-limit);
  }
}

// 聊天上下文管理器
class ChatContextManager {
  private cache: CacheInterface;
  private database: DatabaseInterface;
  private contextTTL = 3600000; // 1小时

  constructor(cache?: CacheInterface, database?: DatabaseInterface) {
    this.cache = cache || new MemoryCache();
    this.database = database || new MockDatabase();
  }

  /**
   * 恢复聊天上下文
   */
  async recoverContext(chatId: string): Promise<ChatContext> {
    try {
      // 尝试从缓存恢复
      const cachedContext = await this.cache.get(`chat_context_${chatId}`);
      if (cachedContext) {
        console.log('从缓存恢复上下文:', chatId);
        return cachedContext;
      }

      // 从数据库恢复
      const dbContext = await this.database.getChatContext(chatId);
      if (dbContext) {
        console.log('从数据库恢复上下文:', chatId);
        await this.cache.set(`chat_context_${chatId}`, dbContext, this.contextTTL);
        return dbContext;
      }

      // 创建新上下文
      console.log('创建新的聊天上下文:', chatId);
      return this.createNewContext(chatId);
    } catch (error) {
      console.error('上下文恢复失败:', error);
      // 上下文恢复失败，创建临时上下文
      return this.createTemporaryContext(chatId);
    }
  }

  /**
   * 保存聊天上下文
   */
  async saveContext(context: ChatContext): Promise<void> {
    try {
      // 保存到缓存
      await this.cache.set(`chat_context_${context.chatId}`, context, this.contextTTL);
      
      // 保存到数据库
      if (!context.isTemporary) {
        await this.database.saveChatContext(context);
      }
    } catch (error) {
      console.error('保存上下文失败:', error);
      throw new ChatContextLost(
        '无法保存聊天上下文',
        { chatId: context.chatId, error: error instanceof Error ? error.message : '未知错误' }
      );
    }
  }

  /**
   * 创建新上下文
   */
  private createNewContext(chatId: string): ChatContext {
    return {
      chatId,
      messages: [],
      isTemporary: false
    };
  }

  /**
   * 创建临时上下文
   */
  private createTemporaryContext(chatId: string): ChatContext {
    return {
      chatId,
      messages: [],
      isTemporary: true,
      warningMessage: '对话上下文已重置，之前的对话记录可能丢失'
    };
  }

  /**
   * 清理过期上下文
   */
  async cleanupExpiredContexts(): Promise<void> {
    // 这里可以实现清理逻辑
    console.log('清理过期上下文');
  }
}

// 聊天模型管理器
class ChatModelManager {
  private models: ChatModel[] = [
    {
      id: 'gpt-4',
      name: 'GPT-4',
      provider: 'openai',
      maxTokens: 8192,
      rateLimit: 60,
      priority: 1,
      isAvailable: true
    },
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      provider: 'openai',
      maxTokens: 4096,
      rateLimit: 120,
      priority: 2,
      isAvailable: true
    },
    {
      id: 'claude-3',
      name: 'Claude 3',
      provider: 'anthropic',
      maxTokens: 8192,
      rateLimit: 50,
      priority: 3,
      isAvailable: true
    }
  ];

  private currentModelId = 'gpt-4';
  private rateLimitTracker = new Map<string, number[]>();

  /**
   * 获取当前模型
   */
  getCurrentModel(): ChatModel {
    const currentModel = this.models.find(m => m.id === this.currentModelId) || this.models[0];
    if (!currentModel) {
      throw new Error('没有可用的聊天模型');
    }
    return currentModel;
  }

  /**
   * 切换到备用模型
   */
  switchToFallbackModel(): ChatModel {
    const availableModels = this.models
      .filter(m => m.isAvailable && m.id !== this.currentModelId)
      .sort((a, b) => a.priority - b.priority);

    if (availableModels.length === 0) {
      throw new ChatModelUnavailable(
        '没有可用的备用模型',
        { currentModel: this.currentModelId }
      );
    }

    const fallbackModel = availableModels[0];
    if (!fallbackModel) {
      throw new ChatServiceUnavailable('没有可用的备用模型', new Error('没有可用的备用模型'));
    }
    console.log(`切换到备用模型: ${fallbackModel.name}`);
    this.currentModelId = fallbackModel.id;
    
    return fallbackModel;
  }

  /**
   * 检查速率限制
   */
  checkRateLimit(modelId: string): boolean {
    const now = Date.now();
    const model = this.models.find(m => m.id === modelId);
    if (!model) {return false;}

    const requests = this.rateLimitTracker.get(modelId) || [];
    const recentRequests = requests.filter(time => now - time < 60000); // 最近1分钟

    return recentRequests.length < model.rateLimit;
  }

  /**
   * 记录请求
   */
  recordRequest(modelId: string): void {
    const now = Date.now();
    const requests = this.rateLimitTracker.get(modelId) || [];
    requests.push(now);
    
    // 清理1分钟前的记录
    const recentRequests = requests.filter(time => now - time < 60000);
    this.rateLimitTracker.set(modelId, recentRequests);
  }

  /**
   * 设置模型可用性
   */
  setModelAvailability(modelId: string, isAvailable: boolean): void {
    const model = this.models.find(m => m.id === modelId);
    if (model) {
      model.isAvailable = isAvailable;
    }
  }
}

// API调用处理器
class ChatAPIHandler {
  private modelManager: ChatModelManager;
  private maxRetries = 3;

  constructor(modelManager: ChatModelManager) {
    this.modelManager = modelManager;
  }

  /**
   * 发送消息
   */
  async sendMessage(message: string, context: ChatContext): Promise<ChatResponse> {
    let lastError: Error = new Error('未知错误');
    let currentModel = this.modelManager.getCurrentModel();

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // 检查速率限制
        if (!this.modelManager.checkRateLimit(currentModel.id)) {
          throw new ChatRateLimit(
            `模型 ${currentModel.name} 达到速率限制`,
            { modelId: currentModel.id, attempt }
          );
        }

        // 记录请求
        this.modelManager.recordRequest(currentModel.id);

        // 调用API
        const response = await this.callChatAPI(message, context, currentModel);
        
        console.log(`消息发送成功 (模型: ${currentModel.name}, 尝试: ${attempt})`);
        return response;
      } catch (error) {
        lastError = error as Error;
        console.warn(`消息发送失败 (尝试 ${attempt}/${this.maxRetries}):`, error);

        if (error instanceof ChatRateLimit) {
          // 指数退避
          const delayTime = calculateBackoffDelay(attempt);
          console.log(`速率限制，等待 ${delayTime}ms`);
          await delay(delayTime);
        } else if (error instanceof ChatModelUnavailable) {
          // 切换到备用模型
          try {
            currentModel = this.modelManager.switchToFallbackModel();
            console.log(`切换到备用模型: ${currentModel.name}`);
          } catch (switchError) {
            throw new ChatServiceUnavailable(
              '所有聊天模型都不可用',
              switchError instanceof Error ? switchError : undefined
            );
          }
        } else if (error instanceof ChatAPIError) {
          // API错误，直接重试
          await delay(1000);
        } else {
          // 其他错误，不重试
          throw error;
        }
      }
    }

    throw new ChatServiceUnavailable(
      `对话服务暂时不可用，已重试${this.maxRetries}次`,
      lastError,
      { attempts: this.maxRetries, model: currentModel.id }
    );
  }

  /**
   * 调用聊天API
   */
  private async callChatAPI(
    message: string,
    context: ChatContext,
    model: ChatModel
  ): Promise<ChatResponse> {
    try {
      // 模拟API调用
      await this.simulateAPICall(model);
      
      // 模拟可能的失败
      const failureRate = this.getFailureRate(model);
      if (Math.random() < failureRate) {
        throw new Error('API调用失败');
      }

      // 构造响应
      const responseMessage = this.generateResponse(message, model);
      
      // 更新上下文
      const updatedContext = {
        ...context,
        messages: [
          ...context.messages,
          { role: 'user', content: message, timestamp: new Date() },
          { role: 'assistant', content: responseMessage, timestamp: new Date() }
        ]
      };

      return {
        message: responseMessage,
        context: updatedContext,
        metadata: {
          model: model.name,
          tokens: Math.floor(Math.random() * 1000) + 100,
          processingTime: Math.floor(Math.random() * 2000) + 500
        }
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('rate limit')) {
        throw new ChatRateLimit(
          `模型 ${model.name} 速率限制`,
          { modelId: model.id }
        );
      } else if (error instanceof Error && error.message.includes('unavailable')) {
        throw new ChatModelUnavailable(
          `模型 ${model.name} 不可用`,
          { modelId: model.id }
        );
      } else {
        throw new ChatAPIError(
          `API调用失败: ${error instanceof Error ? error.message : '未知错误'}`,
          { modelId: model.id, message }
        );
      }
    }
  }

  /**
   * 模拟API调用延迟
   */
  private async simulateAPICall(model: ChatModel): Promise<void> {
    const baseDelay = 500;
    const modelDelay = {
      'gpt-4': 1000,
      'gpt-3.5-turbo': 500,
      'claude-3': 800
    };
    
    const delay = modelDelay[model.id as keyof typeof modelDelay] || baseDelay;
    await new Promise(resolve => setTimeout(resolve, delay + Math.random() * 500));
  }

  /**
   * 获取模型失败率
   */
  private getFailureRate(model: ChatModel): number {
    const failureRates = {
      'gpt-4': 0.1,
      'gpt-3.5-turbo': 0.15,
      'claude-3': 0.12
    };
    
    return failureRates[model.id as keyof typeof failureRates] || 0.2;
  }

  /**
   * 生成响应消息
   */
  private generateResponse(message: string, model: ChatModel): string {
    const responses = [
      `我理解您的问题："${message}"。让我为您提供详细的回答...`,
      `基于您的询问，我认为...`,
      `这是一个很好的问题。根据我的分析...`,
      `让我帮您解决这个问题...`
    ];
    
    const baseResponse = responses[Math.floor(Math.random() * responses.length)];
    return `${baseResponse} (由 ${model.name} 生成)`;
  }
}

// 对话智能体主类
export class ChatAgent {
  private contextManager: ChatContextManager;
  private modelManager: ChatModelManager;
  private apiHandler: ChatAPIHandler;

  constructor(
    cache?: CacheInterface,
    database?: DatabaseInterface
  ) {
    this.contextManager = new ChatContextManager(cache, database);
    this.modelManager = new ChatModelManager();
    this.apiHandler = new ChatAPIHandler(this.modelManager);
  }

  /**
   * 发送消息 - 主入口方法
   */
  async sendMessage(chatId: string, message: string): Promise<ChatResponse> {
    try {
      // 恢复或创建上下文
      const context = await this.contextManager.recoverContext(chatId);
      
      // 发送消息
      const response = await this.apiHandler.sendMessage(message, context);
      
      // 保存更新后的上下文
      await this.contextManager.saveContext(response.context);
      
      return response;
    } catch (error) {
      console.error('发送消息失败:', error);
      
      if (error instanceof AgentError) {
        throw error;
      }
      
      throw new ChatAPIError(
        `发送消息失败: ${error instanceof Error ? error.message : '未知错误'}`,
        { chatId, message }
      );
    }
  }

  /**
   * 获取聊天历史
   */
  async getChatHistory(chatId: string): Promise<any[]> {
    try {
      const context = await this.contextManager.recoverContext(chatId);
      return context.messages || [];
    } catch (error) {
      console.error('获取聊天历史失败:', error);
      return [];
    }
  }

  /**
   * 清除聊天上下文
   */
  async clearChatContext(chatId: string): Promise<void> {
    try {
      const newContext = {
        chatId,
        messages: [],
        isTemporary: false
      };
      
      await this.contextManager.saveContext(newContext);
    } catch (error) {
      console.error('清除聊天上下文失败:', error);
      throw new ChatContextLost(
        '无法清除聊天上下文',
        { chatId }
      );
    }
  }

  /**
   * 获取当前模型信息
   */
  getCurrentModelInfo(): ChatModel {
    return this.modelManager.getCurrentModel();
  }

  /**
   * 设置模型可用性
   */
  setModelAvailability(modelId: string, isAvailable: boolean): void {
    this.modelManager.setModelAvailability(modelId, isAvailable);
  }

  /**
   * 获取聊天统计信息
   */
  getChatStats(): Record<string, any> {
    return {
      currentModel: this.modelManager.getCurrentModel().name,
      maxRetries: this.apiHandler['maxRetries'],
      contextTTL: this.contextManager['contextTTL'],
      availableModels: this.modelManager['models'].filter(m => m.isAvailable).length
    };
  }
}

// 导出默认实例
export const chatAgent = new ChatAgent();