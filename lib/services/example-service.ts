/**
 * @file 示例服务
 * @description 展示如何使用依赖注入系统
 * @author ZK-Agent Team
 * @date 2024-12-20
 */

import { injectable, inject, TYPES } from '../di/container';
import { PrismaClient } from '@prisma/client';
import { ILogger } from '../interfaces/logger.interface';

/**
 * 示例服务接口
 */
export interface IExampleService {
  performTask(taskId: string): Promise<string>;
  getStatus(): string;
}

/**
 * 示例服务实现
 */
@injectable()
export class ExampleService implements IExampleService {
  constructor(
    @inject(TYPES.PrismaClient) private prisma: PrismaClient,
    @inject(TYPES.Logger) private logger: ILogger
  ) {}

  /**
   * 执行任务
   * @param taskId 任务ID
   * @returns 任务结果
   */
  async performTask(taskId: string): Promise<string> {
    this.logger.info(`执行任务: ${taskId}`);
    
    // 这里可以使用注入的 PrismaClient 进行数据库操作
    // 例如: const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    
    return `任务 ${taskId} 已完成`;
  }

  /**
   * 获取服务状态
   * @returns 服务状态
   */
  getStatus(): string {
    return '服务运行正常';
  }
}
