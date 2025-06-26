/**
 * @file 依赖注入容器
 * @description 实现依赖注入模式，提高代码的可测试性和可维护性
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

import { PrismaClient } from '@prisma/client'
import { AgentService } from '../services/agent-service'
import { AgUIAgentManager } from '../ag-ui/protocol/agent-manager'
import { IAgentManager, IAgentService } from '../interfaces/agent-manager.interface'

/**
 * 服务标识符
 */
export const TYPES = {
  PrismaClient: Symbol.for('PrismaClient'),
  AgentService: Symbol.for('AgentService'),
  AgentManager: Symbol.for('AgentManager'),
  Logger: Symbol.for('Logger'),
  Config: Symbol.for('Config')
} as const

/**
 * 服务生命周期
 */
export enum ServiceLifetime {
  Singleton = 'singleton',
  Transient = 'transient',
  Scoped = 'scoped'
}

/**
 * 服务描述符
 */
export interface ServiceDescriptor<T = any> {
  token: symbol
  factory: (container: Container) => T
  lifetime: ServiceLifetime
  instance?: T
}

/**
 * 依赖注入容器
 */
export class Container {
  private services = new Map<symbol, ServiceDescriptor>()
  private singletons = new Map<symbol, any>()

  /**
   * 注册服务
   */
  register<T>(
    token: symbol,
    factory: (container: Container) => T,
    lifetime: ServiceLifetime = ServiceLifetime.Singleton
  ): void {
    this.services.set(token, {
      token,
      factory,
      lifetime
    })
  }

  /**
   * 注册单例服务
   */
  registerSingleton<T>(
    token: symbol,
    factory: (container: Container) => T
  ): void {
    this.register(token, factory, ServiceLifetime.Singleton)
  }

  /**
   * 注册瞬态服务
   */
  registerTransient<T>(
    token: symbol,
    factory: (container: Container) => T
  ): void {
    this.register(token, factory, ServiceLifetime.Transient)
  }

  /**
   * 解析服务
   */
  resolve<T>(token: symbol): T {
    const descriptor = this.services.get(token)
    if (!descriptor) {
      throw new Error(`Service not registered: ${token.toString()}`)
    }

    switch (descriptor.lifetime) {
      case ServiceLifetime.Singleton:
        if (!this.singletons.has(token)) {
          this.singletons.set(token, descriptor.factory(this))
        }
        return this.singletons.get(token)

      case ServiceLifetime.Transient:
        return descriptor.factory(this)

      case ServiceLifetime.Scoped:
        // 简化实现，暂时按单例处理
        if (!this.singletons.has(token)) {
          this.singletons.set(token, descriptor.factory(this))
        }
        return this.singletons.get(token)

      default:
        throw new Error(`Unknown service lifetime: ${descriptor.lifetime}`)
    }
  }

  /**
   * 检查服务是否已注册
   */
  isRegistered(token: symbol): boolean {
    return this.services.has(token)
  }

  /**
   * 清理容器
   */
  dispose(): void {
    this.singletons.clear()
    this.services.clear()
  }
}

/**
 * 默认容器实例
 */
export const container = new Container()

/**
 * 配置默认服务
 */
export function configureServices(): void {
  // 注册数据库客户端
  container.registerSingleton(TYPES.PrismaClient, () => {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
    })
  })

  // 注册智能体服务
  container.registerSingleton(TYPES.AgentService, (container) => {
    const prisma = container.resolve<PrismaClient>(TYPES.PrismaClient)
    return new AgentService(prisma)
  })

  // 注册智能体管理器
  container.registerSingleton(TYPES.AgentManager, () => {
    return new AgUIAgentManager()
  })

  // 注册配置服务
  container.registerSingleton(TYPES.Config, () => {
    return {
      database: {
        url: process.env.DATABASE_URL || '',
        ssl: process.env.DATABASE_SSL === 'true'
      },
      fastgpt: {
        baseUrl: process.env.FASTGPT_BASE_URL || 'https://api.fastgpt.in',
        timeout: parseInt(process.env.FASTGPT_TIMEOUT || '30000')
      },
      jwt: {
        secret: process.env.JWT_SECRET || 'default-secret',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }
    }
  })

  // 注册日志服务
  container.registerSingleton(TYPES.Logger, () => {
    return {
      info: (message: string, meta?: any) => console.log(`[INFO] ${message}`, meta),
      warn: (message: string, meta?: any) => console.warn(`[WARN] ${message}`, meta),
      error: (message: string, meta?: any) => console.error(`[ERROR] ${message}`, meta),
      debug: (message: string, meta?: any) => {
        if (process.env.NODE_ENV === 'development') {
          console.debug(`[DEBUG] ${message}`, meta)
        }
      }
    }
  })
}

/**
 * 获取服务的便捷函数
 */
export function getService<T>(token: symbol): T {
  return container.resolve<T>(token)
}

/**
 * 装饰器：注入依赖
 */
export function inject(token: symbol) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    // 这里可以实现更复杂的装饰器逻辑
    // 暂时简化实现
  }
}

/**
 * 装饰器：标记为可注入的服务
 */
export function injectable(target: any) {
  // 标记类为可注入
  Reflect.defineMetadata('injectable', true, target)
  return target
}

// 初始化默认服务配置
if (typeof window === 'undefined') {
  // 仅在服务端初始化
  configureServices()
}