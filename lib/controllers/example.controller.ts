/**
 * @file 示例控制器
 * @description 展示如何在控制器中使用依赖注入
 * @author ZK-Agent Team
 * @date 2024-12-20
 */

import { injectable, inject, TYPES } from '../di/container';
import { PrismaClient } from '@prisma/client';
import { ILogger } from '../interfaces/logger.interface';
import { IExampleService } from '../services/example-service';

/**
 * 示例控制器接口
 */
export interface IExampleController {
  /**
   * 获取示例数据
   * @returns 示例数据
   */
  getData(): Promise<any>;

  /**
   * 创建示例数据
   * @param data 要创建的数据
   * @returns 创建的数据
   */
  createData(data: any): Promise<any>;
}

/**
 * 示例控制器
 * 
 * 使用依赖注入装饰器自动注入依赖
 */
@injectable(TYPES.ExampleController)
export class ExampleController implements IExampleController {
  /**
   * 构造函数
   * @param prisma Prisma客户端
   * @param logger 日志服务
   * @param exampleService 示例服务
   */
  constructor(
    @inject(TYPES.PrismaClient) private prisma: PrismaClient,
    @inject(TYPES.Logger) private logger: ILogger,
    @inject(TYPES.ExampleService) private exampleService: IExampleService
  ) {}

  /**
   * 获取示例数据
   * @returns 示例数据
   */
  async getData(): Promise<any> {
    try {
      this.logger.info('ExampleController: 获取示例数据');
      return await this.exampleService.getExampleData();
    } catch (error) {
      this.logger.error('ExampleController: 获取示例数据失败', error);
      throw error;
    }
  }

  /**
   * 创建示例数据
   * @param data 要创建的数据
   * @returns 创建的数据
   */
  async createData(data: any): Promise<any> {
    try {
      this.logger.info('ExampleController: 创建示例数据', { data });
      return await this.exampleService.createExampleData(data);
    } catch (error) {
      this.logger.error('ExampleController: 创建示例数据失败', error);
      throw error;
    }
  }
}
