// @ts-nocheck
import type { AgUIPlugin, ProtocolExtension, AgUIEvent } from "./complete-types"

/**
 * AG-UI插件系统
 * 支持动态加载和管理插件
 */
export class AgUIPluginSystem {
  private plugins: Map<string, AgUIPlugin> = new Map()
  private extensions: Map<string, ProtocolExtension> = new Map()
  private eventHandlers: Map<string, Set<Function>> = new Map()

  /**
   * 注册插件
   */
  async registerPlugin(plugin: AgUIPlugin): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin ${plugin.name} already registered`)
    }

    // 检查依赖
    if (plugin.dependencies) {
      for (const dep of plugin.dependencies) {
        if (!this.plugins.has(dep)) {
          throw new Error(`Plugin dependency ${dep} not found`)
        }
      }
    }

    // 安装插件
    await plugin.install()

    // 注册插件
    this.plugins.set(plugin.name, plugin)

    // 激活插件
    await plugin.activate()

    console.info(`Plugin ${plugin.name} v${plugin.version} registered and activated`)
  }

  /**
   * 注销插件
   */
  async unregisterPlugin(name: string): Promise<boolean> {
    const plugin = this.plugins.get(name)
    if (!plugin) {
      return false
    }

    // 检查是否有其他插件依赖此插件
    for (const [, otherPlugin] of this.plugins) {
      if (otherPlugin.dependencies?.includes(name)) {
        throw new Error(`Cannot unregister plugin ${name}: it is required by ${otherPlugin.name}`)
      }
    }

    // 停用插件
    await plugin.deactivate()

    // 卸载插件
    await plugin.uninstall()

    // 移除插件
    this.plugins.delete(name)

    console.info(`Plugin ${name} unregistered`)
    return true
  }

  /**
   * 注册协议扩展
   */
  async registerExtension(extension: ProtocolExtension): Promise<void> {
    if (this.extensions.has(extension.name)) {
      throw new Error(`Extension ${extension.name} already registered`)
    }

    // 初始化扩展
    await extension.initialize()

    // 注册扩展
    this.extensions.set(extension.name, extension)

    console.info(`Protocol extension ${extension.name} v${extension.version} registered`)
  }

  /**
   * 注销协议扩展
   */
  async unregisterExtension(name: string): Promise<boolean> {
    const extension = this.extensions.get(name)
    if (!extension) {
      return false
    }

    // 清理扩展
    await extension.dispose()

    // 移除扩展
    this.extensions.delete(name)

    console.info(`Protocol extension ${name} unregistered`)
    return true
  }

  /**
   * 获取插件列表
   */
  getPlugins(): AgUIPlugin[] {
    return Array.from(this.plugins.values())
  }

  /**
   * 获取扩展列表
   */
  getExtensions(): ProtocolExtension[] {
    return Array.from(this.extensions.values())
  }

  /**
   * 发送事件到所有插件
   */
  emitEvent(event: AgUIEvent): void {
    const handlers = this.eventHandlers.get(event.type)
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event)
        } catch (error) {
          console.error(`Error in event handler for ${event.type}:`, error)
        }
      }
    }
  }

  /**
   * 注册事件处理器
   */
  onEvent(eventType: string, handler: Function): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set())
    }
    this.eventHandlers.get(eventType)!.add(handler)
  }

  /**
   * 移除事件处理器
   */
  offEvent(eventType: string, handler: Function): void {
    const handlers = this.eventHandlers.get(eventType)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  /**
   * 清理所有插件和扩展
   */
  async dispose(): Promise<void> {
    // 停用所有插件
    for (const plugin of this.plugins.values()) {
      try {
        await plugin.deactivate()
        await plugin.uninstall()
      } catch (error) {
        console.error(`Error disposing plugin ${plugin.name}:`, error)
      }
    }

    // 清理所有扩展
    for (const extension of this.extensions.values()) {
      try {
        await extension.dispose()
      } catch (error) {
        console.error(`Error disposing extension ${extension.name}:`, error)
      }
    }

    // 清理事件处理器
    this.eventHandlers.clear()
    this.plugins.clear()
    this.extensions.clear()
  }
}

/**
 * 内置插件：调试工具
 */
export class DebugPlugin implements AgUIPlugin {
  name = "debug"
  version = "1.0.0"
  description = "AG-UI调试工具插件"

  private debugWindow: Window | null = null

  async install(): Promise<void> {
    console.info("Installing debug plugin...")
  }

  async uninstall(): Promise<void> {
    if (this.debugWindow) {
      this.debugWindow.close()
    }
    console.info("Uninstalling debug plugin...")
  }

  async activate(): Promise<void> {
    // 添加调试快捷键
    document.addEventListener("keydown", this.handleKeyDown.bind(this))
    console.info("Debug plugin activated")
  }

  async deactivate(): Promise<void> {
    document.removeEventListener("keydown", this.handleKeyDown.bind(this))
    if (this.debugWindow) {
      this.debugWindow.close()
    }
    console.info("Debug plugin deactivated")
  }

  private handleKeyDown(event: KeyboardEvent): void {
    // Ctrl+Shift+D 打开调试窗口
    if (event.ctrlKey && event.shiftKey && event.key === "D") {
      this.openDebugWindow()
    }
  }

  private openDebugWindow(): void {
    if (this.debugWindow && !this.debugWindow.closed) {
      this.debugWindow.focus()
      return
    }

    this.debugWindow = window.open("/debug/ag-ui", "ag-ui-debug", "width=800,height=600,scrollbars=yes,resizable=yes")
  }
}

/**
 * 内置插件：性能监控
 */
export class PerformancePlugin implements AgUIPlugin {
  name = "performance"
  version = "1.0.0"
  description = "AG-UI性能监控插件"

  private metrics: Map<string, any> = new Map()
  private observer: PerformanceObserver | null = null

  async install(): Promise<void> {
    console.info("Installing performance plugin...")
  }

  async uninstall(): Promise<void> {
    if (this.observer) {
      this.observer.disconnect()
    }
    console.info("Uninstalling performance plugin...")
  }

  async activate(): Promise<void> {
    // 监控性能指标
    if (typeof PerformanceObserver !== "undefined") {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric(entry.name, {
            duration: entry.duration,
            startTime: entry.startTime,
            type: entry.entryType,
          })
        }
      })

      this.observer.observe({ entryTypes: ["measure", "navigation", "resource"] })
    }

    console.info("Performance plugin activated")
  }

  async deactivate(): Promise<void> {
    if (this.observer) {
      this.observer.disconnect()
    }
    console.info("Performance plugin deactivated")
  }

  private recordMetric(name: string, data: any): void {
    this.metrics.set(name, data)
  }

  getMetrics(): Record<string, any> {
    const result: Record<string, any> = {}
    for (const [key, value] of this.metrics.entries()) {
      result[key] = value
    }
    return result
  }
}

/**
 * 内置扩展：多媒体支持
 */
export class MultimediaExtension implements ProtocolExtension {
  name = "multimedia"
  version = "1.0.0"
  eventTypes = ["image-message", "audio-message", "video-message", "file-message"]
  messageTypes = ["image", "audio", "video", "file"]
  toolTypes = ["image-processor", "audio-processor", "video-processor"]

  async initialize(): Promise<void> {
    console.info("Initializing multimedia extension...")
  }

  async dispose(): Promise<void> {
    console.info("Disposing multimedia extension...")
  }
}

/**
 * 内置扩展：协作支持
 */
export class CollaborationExtension implements ProtocolExtension {
  name = "collaboration"
  version = "1.0.0"
  eventTypes = ["collaboration-join", "collaboration-leave", "collaboration-cursor", "collaboration-edit"]
  messageTypes = ["collaboration"]
  toolTypes = ["collaboration-tool"]

  async initialize(): Promise<void> {
    console.info("Initializing collaboration extension...")
  }

  async dispose(): Promise<void> {
    console.info("Disposing collaboration extension...")
  }
}
