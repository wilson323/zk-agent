/**
 * @file 依赖注入示例应用
 * @description 展示如何使用改进后的依赖注入系统
 * @author ZK-Agent Team
 * @date 2024-12-20
 */

import { container, TYPES, injectable, inject } from '../di/container';
import { IExampleService, ExampleService } from '../services/example-service';
import { ILogger } from '../interfaces/logger.interface';

// 注册示例服务到容器
container.registerSingleton(TYPES.ExampleService, () => {
  // 自动解析依赖
  return new ExampleService(
    container.resolve(TYPES.PrismaClient),
    container.resolve(TYPES.Logger)
  );
});

/**
 * 示例应用接口
 */
export interface IExampleApp {
  run(): Promise<void>;
}

/**
 * 示例应用实现
 * 使用装饰器自动注入依赖
 */
@injectable()
export class ExampleApp implements IExampleApp {
  constructor(
    @inject(TYPES.ExampleService) private exampleService: IExampleService,
    @inject(TYPES.Logger) private logger: ILogger
  ) {}

  /**
   * 运行应用
   */
  async run(): Promise<void> {
    this.logger.info('示例应用启动');
    
    try {
      // 调用示例服务
      const result = await this.exampleService.performTask('example-task');
      this.logger.info(`任务执行结果: ${result}`);
      
      // 获取服务状态
      const status = this.exampleService.getStatus();
      this.logger.info(`服务状态: ${status}`);
      
      this.logger.info('示例应用执行完成');
    } catch (error) {
      this.logger.error('示例应用执行失败', error);
      throw error;
    }
  }
}

/**
 * 运行示例应用
 */
export async function runExample(): Promise<void> {
  try {
    // 方法1: 使用装饰器自动注入依赖
    const app = new ExampleApp(
      container.resolve(TYPES.ExampleService),
      container.resolve(TYPES.Logger)
    );
    await app.run();
    
    // 方法2: 手动从容器获取服务
    const logger = container.resolve<ILogger>(TYPES.Logger);
    const exampleService = container.resolve<IExampleService>(TYPES.ExampleService);
    
    logger.info('直接使用容器获取服务');
    const result = await exampleService.performTask('direct-task');
    logger.info(`直接调用结果: ${result}`);
  } catch (error) {
    console.error('示例运行失败:', error);
  }
}

// 仅在服务端运行
if (typeof window === 'undefined') {
  // 运行示例
  // runExample().catch(console.error);
}
