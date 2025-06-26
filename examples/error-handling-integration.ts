/**
 * 智能体错误处理集成示例
 * 展示如何使用所有错误处理组件
 */

import { CADAnalysisAgent } from '../lib/agents/cad-analysis-agent';
import { PosterGenerationAgent } from '../lib/agents/poster-generation-agent';
import { ChatAgent } from '../lib/agents/chat-agent';
import { EventBus } from '../lib/communication/event-bus';
import { ErrorMonitor } from '../lib/monitoring/error-monitor';
import {
  AgentError,
  AgentErrorType,
  ErrorSeverity,
  CADParseError,
  AgentEvent,
  generateId
} from '../lib/errors/agent-errors';

// 智能体管理器
class AgentManager {
  private cadAgent: CADAnalysisAgent;
  private posterAgent: PosterGenerationAgent;
  private chatAgent: ChatAgent;
  private eventBus: EventBus;
  private errorMonitor: ErrorMonitor;

  constructor() {
    this.cadAgent = new CADAnalysisAgent();
    this.posterAgent = new PosterGenerationAgent();
    this.chatAgent = new ChatAgent();
    this.eventBus = new EventBus();
    this.errorMonitor = new ErrorMonitor();

    this.setupErrorHandling();
    this.setupEventHandlers();
    this.startMonitoring();
  }

  /**
   * 设置错误处理
   */
  private setupErrorHandling(): void {
    // 全局错误处理器
    process.on('uncaughtException', (error) => {
      console.error('未捕获的异常:', error);
      this.handleGlobalError(error);
    });

    process.on('unhandledRejection', (reason, _promise) => {
      console.error('未处理的Promise拒绝:', reason);
      this.handleGlobalError(reason as Error);
    });
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    // CAD分析请求处理
    this.eventBus.subscribe(
      'cad_analysis_request',
      'cad-agent',
      async (event: AgentEvent) => {
        try {
          const result = await this.cadAgent.analyzeCADFile(
            event.data['filePath']
          );
          
          // 发送成功响应
          await this.eventBus.publish({
            id: generateId(),
            type: `response_${event.id}`,
            source: 'cad-agent',
            sourceAgentId: 'cad-agent',
            targetAgentId: event.sourceAgentId,
            data: { success: true, result },
            timestamp: new Date()
          });
        } catch (error) {
          await this.handleAgentError(error as AgentError, 'cad-agent', event);
        }
      },
      10 // 高优先级
    );

    // 海报生成请求处理
    this.eventBus.subscribe(
      'poster_generation_request',
      'poster-agent',
      async (event: AgentEvent) => {
        try {
          const result = await this.posterAgent.generatePoster(
            event.data['config']
          );
          
          // 发送成功响应
          await this.eventBus.publish({
            id: generateId(),
            type: `response_${event.id}`,
            source: 'poster-agent',
            sourceAgentId: 'poster-agent',
            targetAgentId: event.sourceAgentId,
            data: { success: true, result },
            timestamp: new Date()
          });
        } catch (error) {
          await this.handleAgentError(error as AgentError, 'poster-agent', event);
        }
      },
      10 // 高优先级
    );

    // 聊天请求处理
    this.eventBus.subscribe(
      'chat_request',
      'chat-agent',
      async (event: AgentEvent) => {
        try {
          const result = await this.chatAgent.sendMessage(
            event.data['chatId'],
            event.data['message']
          );
          
          // 发送成功响应
          await this.eventBus.publish({
            id: generateId(),
            type: `response_${event.id}`,
            source: 'chat-agent',
            sourceAgentId: 'chat-agent',
            targetAgentId: event.sourceAgentId,
            data: { success: true, result },
            timestamp: new Date()
          });
        } catch (error) {
          await this.handleAgentError(error as AgentError, 'chat-agent', event);
        }
      },
      10 // 高优先级
    );
  }

  /**
   * 处理智能体错误
   */
  private async handleAgentError(
    error: AgentError,
    agentId: string,
    originalEvent: AgentEvent
  ): Promise<void> {
    // 报告错误到监控系统
    const errorId = this.errorMonitor.reportError(error, {
      agentId,
      eventId: originalEvent.id,
      eventType: originalEvent.type
    });

    // 发送错误响应
    await this.eventBus.publish({
      id: generateId(),
      type: `response_${originalEvent.id}`,
      source: agentId,
      sourceAgentId: agentId,
      targetAgentId: originalEvent.sourceAgentId,
      data: {
        success: false,
        error: {
          type: error.type,
          message: error.message,
          severity: error.severity,
          errorId
        }
      },
      timestamp: new Date()
    });

    // 获取恢复建议
    const recommendations = this.errorMonitor.getRecoveryRecommendations(errorId);
    
    // 尝试自动恢复
    await this.attemptAutoRecovery(error, agentId, recommendations);
  }

  /**
   * 尝试自动恢复
   */
  private async attemptAutoRecovery(
    _error: AgentError,
    agentId: string,
    recommendations: any[]
  ): Promise<void> {
    const autoRecommendations = recommendations.filter(r => r.automated);
    
    for (const rec of autoRecommendations) {
      try {
        console.log(`尝试自动恢复: ${rec.description}`);
        
        switch (rec.action) {
          case 'switch_to_fallback_parser':
            if (agentId === 'cad-agent') {
              // CAD智能体已内置备用解析器逻辑
              console.log('CAD智能体将在下次请求时使用备用解析器');
            }
            break;
            
          case 'switch_to_backup_template':
            if (agentId === 'poster-agent') {
              // 海报智能体已内置备用模板逻辑
              console.log('海报智能体将在下次请求时使用备用模板');
            }
            break;
            
          case 'switch_to_backup_model':
            if (agentId === 'chat-agent') {
              // 聊天智能体已内置模型切换逻辑
              console.log('聊天智能体将在下次请求时使用备用模型');
            }
            break;
            
          case 'wait_for_resources':
            console.log(`等待资源释放: ${rec.estimatedTime}ms`);
            await new Promise(resolve => setTimeout(resolve, rec.estimatedTime));
            break;
            
          default:
            console.log(`未知的自动恢复操作: ${rec.action}`);
        }
        
        console.log(`自动恢复操作完成: ${rec.action}`);
      } catch (recoveryError) {
        console.error(`自动恢复失败 (${rec.action}):`, recoveryError);
      }
    }
  }

  /**
   * 处理全局错误
   */
  private handleGlobalError(error: Error): void {
    const agentError = new AgentError(
        AgentErrorType.SERVICE_UNAVAILABLE,
      `全局错误: ${error.message}`,
      ErrorSeverity.CRITICAL,
      'global-error-handler',
      { stack: error.stack }
    );

    this.errorMonitor.reportError(agentError, {
      source: 'global',
      timestamp: new Date()
    });
  }

  /**
   * 启动监控
   */
  private startMonitoring(): void {
    this.errorMonitor.startMonitoring(30000); // 30秒检查一次
    
    // 定期输出统计信息
    setInterval(() => {
      this.printStats();
    }, 300000); // 5分钟输出一次
  }

  /**
   * 输出统计信息
   */
  private printStats(): void {
    console.log('\n=== 系统状态报告 ===');
    
    // 错误统计
    const errorStats = this.errorMonitor.getErrorStats();
    console.log('错误统计:');
    console.log(`  总错误数: ${errorStats.total}`);
    console.log(`  最近1小时错误: ${errorStats.recentErrors}`);
    console.log(`  错误率: ${errorStats.errorRate} 错误/分钟`);
    
    // 活跃告警
    const activeAlerts = this.errorMonitor.getActiveAlerts();
    if (activeAlerts.length > 0) {
      console.log('\n活跃告警:');
      activeAlerts.forEach(alert => {
        console.log(`  - ${alert.message} (${alert.severity})`);
      });
    }
    
    // 事件总线统计
    const busStats = this.eventBus.getStats();
    console.log('\n事件总线统计:');
    console.log(`  活跃订阅: ${busStats['router'].activeSubscriptions}`);
    console.log(`  失败事件: ${busStats['router'].failedEventsCount}`);
    
    // 健康检查
    const health = this.errorMonitor.healthCheck();
    console.log(`\n系统健康状态: ${health['status']}`);
    
    console.log('========================\n');
  }

  /**
   * CAD分析示例
   */
  async demonstrateCADAnalysis(): Promise<void> {
    console.log('\n=== CAD分析示例 ===');
    
    try {
      // 发送CAD分析请求
      const event: AgentEvent = {
        id: generateId(),
        type: 'cad_analysis_request',
        source: 'demo-client',
        target: 'cad-agent',
        sourceAgentId: 'demo-client',
        targetAgentId: 'cad-agent',
        data: {
          filePath: '/path/to/test.dwg',
          options: { parseGeometry: true, extractMetadata: true }
        },
        timestamp: new Date()
      };
      
      await this.eventBus.publish(event);
      console.log('CAD分析请求已发送');
      
    } catch (error) {
      console.error('CAD分析示例失败:', error);
    }
  }

  /**
   * 海报生成示例
   */
  async demonstratePosterGeneration(): Promise<void> {
    console.log('\n=== 海报生成示例 ===');
    
    try {
      // 发送海报生成请求
      const event: AgentEvent = {
        id: generateId(),
        type: 'poster_generation_request',
        source: 'demo-client',
        sourceAgentId: 'demo-client',
        targetAgentId: 'poster-agent',
        data: {
          config: {
            title: '测试海报',
            template: 'modern',
            size: { width: 1920, height: 1080 },
            elements: [
              { type: 'text', content: '欢迎使用ZK-Agent', position: { x: 100, y: 100 } }
            ]
          }
        },
        timestamp: new Date()
      };
      
      await this.eventBus.publish(event);
      console.log('海报生成请求已发送');
      
    } catch (error) {
      console.error('海报生成示例失败:', error);
    }
  }

  /**
   * 聊天示例
   */
  async demonstrateChat(): Promise<void> {
    console.log('\n=== 聊天示例 ===');
    
    try {
      // 发送聊天请求
      const event: AgentEvent = {
        id: generateId(),
        type: 'chat_request',
        source: 'demo-client',
        target: 'chat-agent',
        sourceAgentId: 'demo-client',
        targetAgentId: 'chat-agent',
        data: {
          chatId: 'demo-chat-001',
          message: '你好，请介绍一下ZK-Agent平台的功能。'
        },
        timestamp: new Date()
      };
      
      await this.eventBus.publish(event);
      console.log('聊天请求已发送');
      
    } catch (error) {
      console.error('聊天示例失败:', error);
    }
  }

  /**
   * 错误恢复示例
   */
  async demonstrateErrorRecovery(): Promise<void> {
    console.log('\n=== 错误恢复示例 ===');
    
    try {
      // 模拟CAD分析错误
      const cadError = new CADParseError(
        '文件格式不支持',
        { filePath: '/path/to/unsupported.xyz' }
      );
      
      const errorId = this.errorMonitor.reportError(cadError, {
        agentId: 'cad-agent',
        operation: 'file_analysis'
      });
      
      console.log(`错误已报告，ID: ${errorId}`);
      
      // 获取恢复建议
      const recommendations = this.errorMonitor.getRecoveryRecommendations(errorId);
      console.log('恢复建议:');
      recommendations.forEach((rec, index) => {
        const hasAutoRecovery = rec.recommendations.some(advice => advice.autoRecovery);
        console.log(`  ${index + 1}. ${rec.description} (优先级: ${rec.priority}, ${hasAutoRecovery ? '自动' : '手动'})`);
      });
      
      // 标记错误为已解决
      setTimeout(() => {
        this.errorMonitor.markErrorResolved(errorId);
        console.log('错误已标记为解决');
      }, 5000);
      
    } catch (error) {
      console.error('错误恢复示例失败:', error);
    }
  }

  /**
   * 运行完整示例
   */
  async runDemo(): Promise<void> {
    console.log('启动ZK-Agent错误处理集成示例...');
    
    // 等待系统初始化
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 运行各种示例
    await this.demonstrateCADAnalysis();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await this.demonstratePosterGeneration();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await this.demonstrateChat();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await this.demonstrateErrorRecovery();
    
    // 等待处理完成
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 输出最终报告
    const report = this.errorMonitor.generateReport();
    console.log('\n=== 最终报告 ===');
    console.log(JSON.stringify(report, null, 2));
  }

  /**
   * 关闭系统
   */
  shutdown(): void {
    console.log('关闭系统...');
    this.errorMonitor.shutdown();
    this.eventBus.shutdown();
    console.log('系统已关闭');
  }
}

// 运行示例
if (require.main === module) {
  const manager = new AgentManager();
  
  // 运行演示
  manager.runDemo().then(() => {
    console.log('演示完成');
    
    // 10秒后关闭系统
    setTimeout(() => {
      manager.shutdown();
      process.exit(0);
    }, 10000);
  }).catch(error => {
    console.error('演示失败:', error);
    manager.shutdown();
    process.exit(1);
  });
  
  // 优雅关闭
  process.on('SIGINT', () => {
    console.log('\n收到中断信号，正在关闭...');
    manager.shutdown();
    process.exit(0);
  });
}

export { AgentManager };