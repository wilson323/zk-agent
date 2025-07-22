/**
 * @file example-service.ts
 * @description 示例服务实现
 * @author ZK-Agent Team
 * @date 2025-01-27
 */

import { injectable } from '../di/container';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();

const logger = getLogger();

/**
 * 示例服务接口
 */
export interface IExampleService {
  /**
   * 获取示例数据
   * @returns Promise<any> 示例数据
   */
  getExampleData(): Promise<any>;

  /**
   * 处理示例请求
   * @param data 输入数据
   * @returns Promise<any> 处理结果
   */
  processExample(data: any): Promise<any>;
}

/**
 * 示例服务实现
 */
@injectable
export class ExampleService implements IExampleService {
  /**
   * 获取示例数据
   * @returns Promise<any> 示例数据
   */
  async getExampleData(): Promise<any> {
    try {
      logger.info('获取示例数据');

      // 模拟异步操作
      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        id: '1',
        name: 'Example Data',
        timestamp: new Date().toISOString(),
        status: 'active'
      };
    } catch (error) {
      logger.error('获取示例数据失败:', error);
      throw error;
    }
  }

  /**
   * 处理示例请求
   * @param data 输入数据
   * @returns Promise<any> 处理结果
   */
  async processExample(data: any): Promise<any> {
    try {
      logger.info('处理示例请求:', data);

      // 模拟数据处理
      const processedData = {
        ...data,
        processed: true,
        processedAt: new Date().toISOString()
      };

      return {
        success: true,
        data: processedData,
        message: '处理成功'
      };
    } catch (error) {
      logger.error('处理示例请求失败:', error);
      throw error;
    }
  }
}

// 导出服务实例
export const exampleService = new ExampleService();