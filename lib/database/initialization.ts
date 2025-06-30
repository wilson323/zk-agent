/**
 * @file 数据库初始化服务
 * @description 负责在应用启动时初始化数据库连接和性能优化系统
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

import { databaseMonitor, DatabasePerformanceUtils } from './index'
import { enhancedDb } from './enhanced-connection'
import { checkDatabaseConnection, getDatabasePerformanceOverview } from './connection'
import { EventEmitter } from 'events'

/**
 * 数据库初始化状态
 */
export enum InitializationStatus {
  PENDING = 'pending',
  INITIALIZING = 'initializing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * 数据库初始化事件
 */
export interface DatabaseInitializationEvents {
  'status-change': (status: InitializationStatus) => void
  'progress': (step: string, progress: number) => void
  'error': (error: Error) => void
  'completed': () => void
}

/**
 * 数据库初始化管理器
 * 
 * 该类负责管理数据库系统的完整初始化流程，包括：
 * - 数据库连接建立
 * - 性能监控系统启动
 * - 优化组件初始化
 * - 健康检查执行
 * 
 * 使用场景：
 * - 应用程序启动时的数据库初始化
 * - 数据库重连后的系统重新初始化
 * - 开发环境的数据库系统重置
 */
class DatabaseInitializationManager extends EventEmitter {
  private status: InitializationStatus = InitializationStatus.PENDING
  private initializationPromise: Promise<void> | null = null
  private retryCount = 0
  private readonly maxRetries = 3
  private readonly retryDelay = 5000 // 5秒

  /**
   * 获取当前初始化状态
   * @returns {InitializationStatus} 当前状态
   */
  getStatus(): InitializationStatus {
    return this.status
  }

  /**
   * 检查是否已完成初始化
   * @returns {boolean} 是否已完成
   */
  isInitialized(): boolean {
    return this.status === InitializationStatus.COMPLETED
  }

  /**
   * 执行数据库系统初始化
   * @param {boolean} force - 是否强制重新初始化
   * @returns {Promise<void>}
   */
  async initialize(force: boolean = false): Promise<void> {
    // 如果已经在初始化中且不是强制初始化，返回现有的Promise
    if (this.initializationPromise && !force) {
      return this.initializationPromise
    }

    // 如果已经完成且不是强制初始化，直接返回
    if (this.status === InitializationStatus.COMPLETED && !force) {
      return
    }

    this.initializationPromise = this.performInitialization()
    return this.initializationPromise
  }

  /**
   * 执行实际的初始化流程
   * @returns {Promise<void>}
   */
  private async performInitialization(): Promise<void> {
    try {
      this.updateStatus(InitializationStatus.INITIALIZING)
      this.emitProgress('开始数据库初始化', 0)

      // 步骤1: 建立数据库连接
      await this.initializeConnection()
      this.emitProgress('数据库连接已建立', 25)

      // 步骤2: 启动性能监控
      await this.initializeMonitoring()
      this.emitProgress('性能监控系统已启动', 50)

      // 步骤3: 初始化优化组件
      await this.initializeOptimization()
      this.emitProgress('性能优化组件已初始化', 75)

      // 步骤4: 执行健康检查
      await this.performHealthCheck()
      this.emitProgress('健康检查完成', 100)

      this.updateStatus(InitializationStatus.COMPLETED)
      this.emit('completed')
      this.retryCount = 0

      console.log('数据库系统初始化完成')
    } catch (error) {
      console.error('数据库初始化失败:', error)
      this.emit('error', error as Error)
      
      if (this.retryCount < this.maxRetries) {
        this.retryCount++
        console.log(`正在重试数据库初始化 (${this.retryCount}/${this.maxRetries})...`)
        
        await new Promise(resolve => setTimeout(resolve, this.retryDelay))
        return this.performInitialization()
      } else {
        this.updateStatus(InitializationStatus.FAILED)
        throw error
      }
    }
  }

  /**
   * 初始化数据库连接
   * @returns {Promise<void>}
   */
  private async initializeConnection(): Promise<void> {
    try {
      // 首先尝试增强连接管理器
      if (!enhancedDb.isConnected()) {
        await enhancedDb.connect()
      }

      // 验证连接状态
      const connectionStatus = await checkDatabaseConnection()
      if (!connectionStatus.connected) {
        throw new Error(`数据库连接失败: ${connectionStatus.message}`)
      }

      console.log('数据库连接初始化成功')
    } catch (error) {
      console.error('数据库连接初始化失败:', error)
      throw error
    }
  }

  /**
   * 初始化性能监控系统
   * @returns {Promise<void>}
   */
  private async initializeMonitoring(): Promise<void> {
    try {
      if (!databaseMonitor.getMonitoringStatus().isMonitoring) {
        await databaseMonitor.startMonitoring()
      }

      // 等待监控系统稳定
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (!databaseMonitor.getMonitoringStatus().isMonitoring) {
        throw new Error('性能监控系统启动失败')
      }

      console.log('数据库监控系统初始化成功')
    } catch (error) {
      console.error('监控系统初始化失败:', error)
      throw error
    }
  }

  /**
   * 初始化性能优化组件
   * @returns {Promise<void>}
   */
  private async initializeOptimization(): Promise<void> {
    try {
      // 验证优化组件状态（优化组件在监控启动时自动启动）
      const optimizationStatus = databaseMonitor.getOptimizationStatus()
      const activeComponents = Object.values(optimizationStatus).filter(Boolean).length
      
      if (activeComponents === 0) {
        console.warn('没有性能优化组件处于活跃状态')
      }

      console.log(`性能优化组件初始化成功 (${activeComponents} 个组件活跃)`)
    } catch (error) {
      console.error('性能优化组件初始化失败:', error)
      throw error
    }
  }

  /**
   * 执行健康检查
   * @returns {Promise<void>}
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const overview = await getDatabasePerformanceOverview()
      
      if (overview.health.status === 'poor') {
        console.warn('数据库健康状态较差:', overview.health.issues)
      }

      console.log(`数据库健康检查完成 - 评分: ${overview.health.score}, 状态: ${overview.health.status}`)
    } catch (error) {
      console.error('健康检查失败:', error)
      // 健康检查失败不应该阻止初始化完成
    }
  }

  /**
   * 更新初始化状态
   * @param {InitializationStatus} status - 新状态
   */
  private updateStatus(status: InitializationStatus): void {
    this.status = status
    this.emit('status-change', status)
  }

  /**
   * 发送进度事件
   * @param {string} step - 当前步骤描述
   * @param {number} progress - 进度百分比 (0-100)
   */
  private emitProgress(step: string, progress: number): void {
    this.emit('progress', step, progress)
  }

  /**
   * 优雅关闭数据库系统
   * @returns {Promise<void>}
   */
  async shutdown(): Promise<void> {
    try {
      console.log('开始关闭数据库系统...')

      // 停止性能优化组件
      if (databaseMonitor.getMonitoringStatus().isMonitoring) {
        await databaseMonitor.stopMonitoring()
      }

      // 关闭数据库连接
      if (enhancedDb.isConnected()) {
        await enhancedDb.gracefulShutdown()
      }

      this.updateStatus(InitializationStatus.PENDING)
      console.log('数据库系统已优雅关闭')
    } catch (error) {
      console.error('数据库系统关闭失败:', error)
      throw error
    }
  }
}

// 创建全局初始化管理器实例
export const databaseInitializer = new DatabaseInitializationManager()

/**
 * 初始化数据库系统的便捷函数
 * @param {boolean} force - 是否强制重新初始化
 * @returns {Promise<void>}
 */
export async function initializeDatabase(force: boolean = false): Promise<void> {
  return databaseInitializer.initialize(force)
}

/**
 * 检查数据库系统是否已初始化
 * @returns {boolean} 是否已初始化
 */
export function isDatabaseInitialized(): boolean {
  return databaseInitializer.isInitialized()
}

/**
 * 获取数据库初始化状态
 * @returns {InitializationStatus} 当前状态
 */
export function getDatabaseInitializationStatus(): InitializationStatus {
  return databaseInitializer.getStatus()
}

/**
 * 优雅关闭数据库系统
 * @returns {Promise<void>}
 */
export async function shutdownDatabase(): Promise<void> {
  return databaseInitializer.shutdown()
}
