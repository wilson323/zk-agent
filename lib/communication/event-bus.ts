/**
 * 智能体间通信 - 事件总线容错机制
 * 提供事件路由、失败处理、服务熔断等功能
 */

import {
  CommunicationError,
  ServiceUnavailable,
  CircuitBreakerState,
  AgentEvent,
  AgentRequest,
  AgentResponse,
  delay,
  generateId
} from '../errors/agent-errors';

// 事件监听器接口
interface EventListener {
  (event: AgentEvent): Promise<void> | void;
}

// 事件订阅信息
interface EventSubscription {
  id: string;
  eventType: string;
  agentId: string;
  listener: EventListener;
  priority: number;
  isActive: boolean;
}

// 失败事件记录
interface FailedEvent {
  id: string;
  event: AgentEvent;
  targetAgentId: string;
  error: Error;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

// 服务熔断器配置
interface CircuitBreakerConfig {
  failureThreshold: number; // 失败阈值
  recoveryTimeout: number; // 恢复超时时间（毫秒）
  halfOpenMaxCalls: number; // 半开状态最大调用次数
  monitoringPeriod: number; // 监控周期（毫秒）
}

// 服务熔断器
class ServiceCircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private halfOpenCalls = 0;
  private config: CircuitBreakerConfig;
  private serviceName: string;

  constructor(serviceName: string, config?: Partial<CircuitBreakerConfig>) {
    this.serviceName = serviceName;
    this.config = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1分钟
      halfOpenMaxCalls: 3,
      monitoringPeriod: 10000, // 10秒
      ...config
    };
  }

  /**
   * 执行操作（带熔断保护）
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.halfOpenCalls = 0;
        console.log(`熔断器 ${this.serviceName} 进入半开状态`);
      } else {
        throw new ServiceUnavailable(
          `服务 ${this.serviceName} 熔断器开启，服务不可用`,
          { 
            serviceName: this.serviceName,
            state: this.state,
            failureCount: this.failureCount
          }
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * 成功回调
   */
  private onSuccess(): void {
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.halfOpenCalls++;
      if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        this.reset();
      }
    } else {
      this.failureCount = 0;
    }
  }

  /**
   * 失败回调
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.OPEN;
      console.log(`熔断器 ${this.serviceName} 重新开启`);
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
      console.log(`熔断器 ${this.serviceName} 开启，失败次数: ${this.failureCount}`);
    }
  }

  /**
   * 重置熔断器
   */
  private reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.halfOpenCalls = 0;
    console.log(`熔断器 ${this.serviceName} 重置为关闭状态`);
  }

  /**
   * 是否应该尝试重置
   */
  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.config.recoveryTimeout;
  }

  /**
   * 获取熔断器状态
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * 获取统计信息
   */
  getStats(): Record<string, any> {
    return {
      serviceName: this.serviceName,
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      halfOpenCalls: this.halfOpenCalls,
      config: this.config
    };
  }
}

// 事件路由器
class EventRouter {
  private subscriptions = new Map<string, EventSubscription[]>();
  private circuitBreakers = new Map<string, ServiceCircuitBreaker>();
  private failedEvents: FailedEvent[] = [];
  private maxFailedEvents = 1000;

  /**
   * 订阅事件
   */
  subscribe(
    eventType: string,
    agentId: string,
    listener: EventListener,
    priority: number = 0
  ): string {
    const subscription: EventSubscription = {
      id: generateId(),
      eventType,
      agentId,
      listener,
      priority,
      isActive: true
    };

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }

    const subs = this.subscriptions.get(eventType)!;
    subs.push(subscription);
    
    // 按优先级排序
    subs.sort((a, b) => b.priority - a.priority);

    console.log(`智能体 ${agentId} 订阅事件 ${eventType}`);
    return subscription.id;
  }

  /**
   * 取消订阅
   */
  unsubscribe(subscriptionId: string): boolean {
    for (const [, subs] of Array.from(this.subscriptions.entries())) {
      const index = subs.findIndex((sub: any) => sub.id === subscriptionId);
      if (index !== -1) {
        subs.splice(index, 1);
        console.log(`取消订阅: ${subscriptionId}`);
        return true;
      }
    }
    return false;
  }

  /**
   * 发布事件
   */
  async publish(event: AgentEvent): Promise<void> {
    const subscriptions = this.subscriptions.get(event.type) || [];
    const activeSubscriptions = subscriptions.filter(sub => sub.isActive);

    if (activeSubscriptions.length === 0) {
      console.warn(`没有智能体订阅事件类型: ${event.type}`);
      return;
    }

    console.log(`发布事件 ${event.type} 给 ${activeSubscriptions.length} 个订阅者`);

    // 并行发送给所有订阅者
    const promises = activeSubscriptions.map(sub => 
      this.deliverEventToSubscriber(event, sub)
    );

    await Promise.allSettled(promises);
  }

  /**
   * 向订阅者投递事件
   */
  private async deliverEventToSubscriber(
    event: AgentEvent,
    subscription: EventSubscription
  ): Promise<void> {
    const circuitBreaker = this.getOrCreateCircuitBreaker(subscription.agentId);

    try {
      await circuitBreaker.execute(async () => {
        await subscription.listener(event);
      });
      
      console.log(`事件 ${event.id} 成功投递给智能体 ${subscription.agentId}`);
    } catch (error) {
      console.error(`事件投递失败 (智能体: ${subscription.agentId}):`, error);
      
      // 记录失败事件
      this.recordFailedEvent(event, subscription.agentId, error as Error);
      
      // 如果是严重错误，暂时禁用订阅
      if (error instanceof ServiceUnavailable) {
        subscription.isActive = false;
        console.warn(`暂时禁用智能体 ${subscription.agentId} 的订阅`);
        
        // 5分钟后重新启用
        setTimeout(() => {
          subscription.isActive = true;
          console.log(`重新启用智能体 ${subscription.agentId} 的订阅`);
        }, 300000);
      }
    }
  }

  /**
   * 获取或创建熔断器
   */
  private getOrCreateCircuitBreaker(agentId: string): ServiceCircuitBreaker {
    if (!this.circuitBreakers.has(agentId)) {
      this.circuitBreakers.set(
        agentId,
        new ServiceCircuitBreaker(`Agent-${agentId}`, {
          failureThreshold: 3,
          recoveryTimeout: 30000, // 30秒
          halfOpenMaxCalls: 2
        })
      );
    }
    return this.circuitBreakers.get(agentId)!;
  }

  /**
   * 记录失败事件
   */
  private recordFailedEvent(
    event: AgentEvent,
    targetAgentId: string,
    error: Error
  ): void {
    const failedEvent: FailedEvent = {
      id: generateId(),
      event,
      targetAgentId,
      error,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: 3
    };

    this.failedEvents.push(failedEvent);
    
    // 限制失败事件数量
    if (this.failedEvents.length > this.maxFailedEvents) {
      this.failedEvents = this.failedEvents.slice(-this.maxFailedEvents);
    }
  }

  /**
   * 重试失败事件
   */
  async retryFailedEvents(): Promise<void> {
    const retryableEvents = this.failedEvents.filter(
      fe => fe.retryCount < fe.maxRetries && 
           Date.now() - fe.timestamp.getTime() > 60000 // 1分钟后重试
    );

    for (const failedEvent of retryableEvents) {
      try {
        const subscription = this.findSubscription(
          failedEvent.event.type,
          failedEvent.targetAgentId
        );

        if (subscription && subscription.isActive) {
          await this.deliverEventToSubscriber(failedEvent.event, subscription);
          
          // 重试成功，移除失败记录
          const index = this.failedEvents.indexOf(failedEvent);
          if (index !== -1) {
            this.failedEvents.splice(index, 1);
          }
          
          console.log(`失败事件重试成功: ${failedEvent.id}`);
        }
      } catch (error) {
        failedEvent.retryCount++;
        console.error(`失败事件重试失败 (${failedEvent.retryCount}/${failedEvent.maxRetries}):`, error);
        
        // 达到最大重试次数，移除记录
        if (failedEvent.retryCount >= failedEvent.maxRetries) {
          const index = this.failedEvents.indexOf(failedEvent);
          if (index !== -1) {
            this.failedEvents.splice(index, 1);
          }
        }
      }
    }
  }

  /**
   * 查找订阅
   */
  private findSubscription(
    eventType: string,
    agentId: string
  ): EventSubscription | undefined {
    const subscriptions = this.subscriptions.get(eventType) || [];
    return subscriptions.find(sub => sub.agentId === agentId);
  }

  /**
   * 获取统计信息
   */
  getStats(): Record<string, any> {
    const circuitBreakerStats = Array.from(this.circuitBreakers.entries()).map(
      ([agentId, cb]) => ({ agentId, ...cb.getStats() })
    );

    return {
      totalSubscriptions: Array.from(this.subscriptions.values())
        .reduce((sum, subs) => sum + subs.length, 0),
      activeSubscriptions: Array.from(this.subscriptions.values())
        .reduce((sum, subs) => sum + subs.filter(s => s.isActive).length, 0),
      failedEventsCount: this.failedEvents.length,
      circuitBreakers: circuitBreakerStats
    };
  }

  /**
   * 清理过期的失败事件
   */
  cleanupFailedEvents(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24小时
    
    this.failedEvents = this.failedEvents.filter(
      fe => now - fe.timestamp.getTime() < maxAge
    );
  }
}

// 直接通知机制
class DirectNotificationService {
  private agentEndpoints = new Map<string, string>();


  /**
   * 注册智能体端点
   */
  registerAgent(agentId: string, endpoint: string): void {
    this.agentEndpoints.set(agentId, endpoint);
    console.log(`注册智能体端点: ${agentId} -> ${endpoint}`);
  }

  /**
   * 直接通知智能体
   */
  async notifyAgent(agentId: string, event: AgentEvent): Promise<void> {
    const endpoint = this.agentEndpoints.get(agentId);
    if (!endpoint) {
      throw new CommunicationError(
        `智能体 ${agentId} 没有注册端点`,
        { agentId, eventId: event.id }
      );
    }

    try {
      // 模拟HTTP请求
      await this.sendHttpNotification(endpoint, event);
      console.log(`直接通知成功: ${agentId}`);
    } catch (error) {
      throw new CommunicationError(
        `直接通知失败: ${error instanceof Error ? error.message : '未知错误'}`,
        { agentId, endpoint, eventId: event.id }
      );
    }
  }

  /**
   * 发送HTTP通知
   */
  private async sendHttpNotification(_endpoint: string, _event: AgentEvent): Promise<void> {
    // 模拟HTTP请求
    await delay(100 + Math.random() * 200);
    
    // 模拟可能的失败
    if (Math.random() < 0.1) {
      throw new Error('网络连接失败');
    }
  }

  /**
   * 批量通知
   */
  async notifyMultipleAgents(
    agentIds: string[],
    event: AgentEvent
  ): Promise<void> {
    const promises = agentIds.map(agentId => 
      this.notifyAgent(agentId, event).catch(error => {
        console.error(`批量通知失败 (${agentId}):`, error);
        return error;
      })
    );

    await Promise.allSettled(promises);
  }
}

// 事件总线主类
export class EventBus {
  private router: EventRouter;
  private directNotification: DirectNotificationService;
  private retryInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.router = new EventRouter();
    this.directNotification = new DirectNotificationService();
    
    // 启动失败事件重试机制
    this.startRetryMechanism();
  }

  /**
   * 订阅事件
   */
  subscribe(
    eventType: string,
    agentId: string,
    listener: EventListener,
    priority: number = 0
  ): string {
    return this.router.subscribe(eventType, agentId, listener, priority);
  }

  /**
   * 取消订阅
   */
  unsubscribe(subscriptionId: string): boolean {
    return this.router.unsubscribe(subscriptionId);
  }

  /**
   * 发布事件
   */
  async publish(event: AgentEvent): Promise<void> {
    try {
      await this.router.publish(event);
    } catch (error) {
      console.error('事件发布失败:', error);
      throw new CommunicationError(
        `事件发布失败: ${error instanceof Error ? error.message : '未知错误'}`,
        { eventId: event.id, eventType: event.type }
      );
    }
  }

  /**
   * 注册智能体端点（用于直接通知）
   */
  registerAgentEndpoint(agentId: string, endpoint: string): void {
    this.directNotification.registerAgent(agentId, endpoint);
  }

  /**
   * 直接通知智能体
   */
  async notifyAgent(agentId: string, event: AgentEvent): Promise<void> {
    try {
      await this.directNotification.notifyAgent(agentId, event);
    } catch (error) {
      console.warn('直接通知失败，尝试通过事件总线发送:', error);
      // 降级到事件总线
      await this.publish(event);
    }
  }

  /**
   * 发送请求并等待响应
   */
  async sendRequest(
    targetAgentId: string,
    request: AgentRequest,
    timeout: number = 30000
  ): Promise<AgentResponse> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new CommunicationError(
          `请求超时: ${timeout}ms`,
          { targetAgentId, requestId: request.id }
        ));
      }, timeout);

      // 订阅响应事件
      const subscriptionId = this.subscribe(
        `response_${request.id}`,
        'temp_requester',
        (event: AgentEvent) => {
          clearTimeout(timeoutId);
          this.unsubscribe(subscriptionId);
          
          if (event.data && event.data['success']) {
            resolve(event.data as AgentResponse);
          } else {
            reject(new CommunicationError(
              '请求处理失败',
              { targetAgentId, requestId: request.id, response: event.data }
            ));
          }
        }
      );

      // 发送请求事件
      const requestEvent: AgentEvent = {
        id: generateId(),
        type: `request_${targetAgentId}`,
        source: request.sourceAgentId || 'unknown',
        sourceAgentId: request.sourceAgentId,
        targetAgentId,
        data: request,
        timestamp: new Date()
      };

      this.publish(requestEvent).catch(error => {
        clearTimeout(timeoutId);
        this.unsubscribe(subscriptionId);
        reject(error);
      });
    });
  }

  /**
   * 启动重试机制
   */
  private startRetryMechanism(): void {
    this.retryInterval = setInterval(() => {
      this.router.retryFailedEvents();
      this.router.cleanupFailedEvents();
    }, 60000); // 每分钟检查一次
  }

  /**
   * 停止重试机制
   */
  stopRetryMechanism(): void {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): Record<string, any> {
    return {
      router: this.router.getStats(),
      retryMechanismActive: this.retryInterval !== null
    };
  }

  /**
   * 健康检查
   */
  healthCheck(): Record<string, any> {
    const stats = this.getStats();
    const isHealthy = stats['router'].activeSubscriptions > 0;
    
    return {
      status: isHealthy ? 'healthy' : 'warning',
      timestamp: new Date(),
      stats
    };
  }

  /**
   * 关闭事件总线
   */
  shutdown(): void {
    this.stopRetryMechanism();
    console.log('事件总线已关闭');
  }
}

// 导出默认实例
export const eventBus = new EventBus();

// 导出类型
export type {
  EventListener,
  EventSubscription,
  FailedEvent,
  CircuitBreakerConfig
};