/**
 * @file 依赖注入容器
 * @description 实现依赖注入模式，提高代码的可测试性和可维护性
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

import 'reflect-metadata';
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
  Config: Symbol.for('Config'),
  ExampleService: Symbol.for('ExampleService'),
  ExampleController: Symbol.for('ExampleController')
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

