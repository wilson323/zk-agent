/**
 * @file example.controller.ts
 * @description 示例控制器实现
 * @author ZK-Agent Team
 * @date 2025-01-27
 */

import { NextRequest, NextResponse } from 'next/server';
import { injectable } from '../di/container';
import { IExampleService, ExampleService } from '../services/example-service';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();
import { ErrorCode } from '@/types/core';
import { ApiResponseWrapper } from '@/lib/middleware/api-route-wrapper';

/**
 * 示例控制器接口
 */
export interface IExampleController {
  /**
   * 处理GET请求
   * @param request NextRequest对象
   * @returns Promise<NextResponse> 响应结果
   */
  handleGet(request: NextRequest): Promise<NextResponse>;

  /**
   * 处理POST请求
   * @param request NextRequest对象
   * @returns Promise<NextResponse> 响应结果
   */
  handlePost(request: NextRequest): Promise<NextResponse>;
}

/**
 * 示例控制器实现
 */
@injectable
export class ExampleController implements IExampleController {
  private exampleService: IExampleService;
  private logger: ILogger;

  constructor() {
    this.exampleService = new ExampleService();
    this.logger = logger;
  }

  /**
   * 处理GET请求
   * @param request NextRequest对象
   * @returns Promise<NextResponse> 响应结果
   */
  async handleGet(request: NextRequest): Promise<NextResponse> {
    try {
      this.logger.info('处理示例GET请求');

      const data = await this.exampleService.getExampleData();

      return ApiResponseWrapper.success(data);
    } catch (error) {
      this.logger.error('处理GET请求失败:', error);
      return ApiResponseWrapper.error(
        ErrorCode.INTERNAL_SERVER_ERROR,
        '获取数据失败'
      );
    }
  }

  /**
   * 处理POST请求
   * @param request NextRequest对象
   * @returns Promise<NextResponse> 响应结果
   */
  async handlePost(request: NextRequest): Promise<NextResponse> {
    try {
      this.logger.info('处理示例POST请求');

      const body = await request.json();
      const result = await this.exampleService.processExample(body);

      return ApiResponseWrapper.success(result);
    } catch (error) {
      this.logger.error('处理POST请求失败:', error);
      return ApiResponseWrapper.error(
        ErrorCode.INTERNAL_SERVER_ERROR,
        '处理请求失败'
      );
    }
  }
}

// 导出控制器实例
export const exampleController = new ExampleController();