/**
 * @file 依赖注入配置
 * @description 配置依赖注入容器，注册服务
 * @author ZK-Agent Team
 * @date 2024-12-20
 */

import { PrismaClient } from '@prisma/client';
import { container, TYPES } from './container';
import { AgentService } from '../services/agent.service';
import { AgentManager } from '../services/agent-manager.service';
import { Config } from '../config';
import { Logger } from '../logger';
import { ExampleService } from '../services/example-service';
import { ExampleController } from '../controllers/example.controller';

/**
 * 配置依赖注入容器
 * 注册所有服务
 */
export function configureServices(): void {
  // 检查是否已经配置过
  if (container.isRegistered(TYPES.Logger)) {
    return;
  }

  // 注册基础服务
  container.registerSingleton(TYPES.PrismaClient, () => enhancedDb.prisma);
  container.registerSingleton(TYPES.Logger, () => new Logger());
  container.registerSingleton(TYPES.Config, () => new Config());

  // 注册业务服务
  container.registerSingleton(TYPES.AgentService, (container) => {
    const prisma = container.resolve<PrismaClient>(TYPES.PrismaClient);
    const logger = container.resolve<Logger>(TYPES.Logger);
    return new AgentService(prisma, logger);
  });

  container.registerSingleton(TYPES.AgentManager, (container) => {
    const agentService = container.resolve<AgentService>(TYPES.AgentService);
    const logger = container.resolve<Logger>(TYPES.Logger);
    return new AgentManager(agentService, logger);
  });

  // 注册示例服务
  container.registerSingleton(TYPES.ExampleService, (container) => {
    const prisma = container.resolve<PrismaClient>(TYPES.PrismaClient);
    const logger = container.resolve<Logger>(TYPES.Logger);
    return new ExampleService(prisma, logger);
  });

  // 注册示例控制器
  container.registerSingleton(TYPES.ExampleController, (container) => {
    const prisma = container.resolve<PrismaClient>(TYPES.PrismaClient);
    const logger = container.resolve<Logger>(TYPES.Logger);
    const exampleService = container.resolve<ExampleService>(TYPES.ExampleService);
    return new ExampleController(prisma, logger, exampleService);
  });
}

/**
 * 在服务器端初始化依赖注入容器
 * 在应用入口点调用此函数
 */
export function initializeServerContainer(): void {
  // 仅在服务器端初始化
  if (typeof window === 'undefined') {
    configureServices();
  }
}
