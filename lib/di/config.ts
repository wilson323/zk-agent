/**
 * @file 依赖注入配置
 * @description 配置依赖注入容器，注册服务
 * @author ZK-Agent Team
 * @date 2024-12-20
 */

import { PrismaClient } from '@prisma/client';
import { container, TYPES } from './container';
import { AgentService } from '../services/agent-service';
import { AgUIAgentManager } from '../ag-ui/protocol/agent-manager';
import { UnifiedConfigManager } from '../config/core/manager';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();
import { enhancedDb } from '../database/enhanced-connection';


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
  container.registerSingleton(TYPES.PrismaClient, () => enhancedDb.getClient());
  container.registerSingleton(TYPES.Logger, () => new Logger());
  container.registerSingleton(TYPES.Config, () => new UnifiedConfigManager());

  // 注册业务服务
  container.registerSingleton(TYPES.AgentService, container => {
    return new AgentService();
  });

  container.registerSingleton(TYPES.AgentManager, container => {
    return new AgUIAgentManager();
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
