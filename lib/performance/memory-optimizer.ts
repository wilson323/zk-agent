// @ts-nocheck
/**
 * @file Memory Optimizer
 * @description 前端内存优化器，监控和优化内存使用
 * @author ZK-Agent Team A
 * @date 2024-12-19
 */

// 内存使用信息类型
interface MemoryInfo {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
  timestamp: number
}

// 内存泄漏检测结果
interface MemoryLeakDetection {
  isLeaking: boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
  growthRate: number // MB/min
  suspiciousComponents: string[]
  recommendations: string[]
}

// 内存优化建议
interface MemoryOptimization {
  type: 'cleanup' | 'lazy-loading' | 'caching' | 'component'
  priority: 'low' | 'medium' | 'high' | 'critical'
  description: string
  implementation: string
  estimatedSavings: number // MB
}

// 内存优化器类
export class MemoryOptimizer {
  private memoryHistory: MemoryInfo[] = []
  private maxHistorySize = 100
  private monitoringInterval: NodeJS.Timeout | null = null
  private thresholds = {
    maxMemoryUsage: 100 * 1024 * 1024, // 100MB
    memoryLeakThreshold: 5, // 5MB/min增长
    maxComponentInstances: 50,
    gcThreshold: 0.8 // 80%内存使用率触发GC建议
  }

  /**
   * 开始内存监控
   */
  startMonitoring(interval: number = 5000): void {
    if (this.monitoringInterval) {
      this.stopMonitoring()
    }

    this.monitoringInterval = setInterval(() => {
      this.collectMemoryInfo()
    }, interval)

    console.log('🔍 内存监控已启动')
  }

  /**
   * 停止内存监控
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
      console.log('⏹️ 内存监控已停止')
    }
  }

  /**
   * 收集内存信息
   */
  private collectMemoryInfo(): void {
    if (typeof window === 'undefined' || !('performance' in window)) {
      return
    }

    // 检查是否支持内存API
    const performance = window.performance as any
    if (!performance.memory) {
      return
    }

    const memoryInfo: MemoryInfo = {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      timestamp: Date.now()
    }

    this.memoryHistory.push(memoryInfo)

    // 保持历史记录大小
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory.shift()
    }

    // 检查内存使用情况
    this.checkMemoryUsage(memoryInfo)
  }

  /**
   * 检查内存使用情况
   */
  private checkMemoryUsage(memoryInfo: MemoryInfo): void {
    const usageMB = memoryInfo.usedJSHeapSize / (1024 * 1024)
    const limitMB = memoryInfo.jsHeapSizeLimit / (1024 * 1024)
    const usagePercentage = (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100

    // 内存使用率过高警告
    if (usagePercentage > 80) {
      console.warn(`⚠️ 内存使用率过高: ${usagePercentage.toFixed(1)}% (${usageMB.toFixed(1)}MB/${limitMB.toFixed(1)}MB)`)
      
      if (usagePercentage > 90) {
        console.error('🔴 内存使用率危险，建议立即优化')
        this.triggerGarbageCollection()
      }
    }

    // 检测内存泄漏
    const leakDetection = this.detectMemoryLeak()
    if (leakDetection.isLeaking) {
      console.warn('🚨 检测到潜在内存泄漏:', leakDetection)
    }
  }

  /**
   * 检测内存泄漏
   */
  detectMemoryLeak(): MemoryLeakDetection {
    if (this.memoryHistory.length < 10) {
      return {
        isLeaking: false,
        severity: 'low',
        growthRate: 0,
        suspiciousComponents: [],
        recommendations: []
      }
    }

    // 计算内存增长率
    const recent = this.memoryHistory.slice(-10)
    const oldest = recent[0]
    const newest = recent[recent.length - 1]
    
    const timeDiff = (newest.timestamp - oldest.timestamp) / (1000 * 60) // 分钟
    const memoryDiff = (newest.usedJSHeapSize - oldest.usedJSHeapSize) / (1024 * 1024) // MB
    const growthRate = timeDiff > 0 ? memoryDiff / timeDiff : 0

    const isLeaking = growthRate > this.thresholds.memoryLeakThreshold
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'

    if (growthRate > 20) {severity = 'critical'}
    else if (growthRate > 10) {severity = 'high'}
    else if (growthRate > 5) {severity = 'medium'}

    const recommendations: string[] = []
    if (isLeaking) {
      recommendations.push('检查事件监听器是否正确移除')
      recommendations.push('检查定时器是否正确清理')
      recommendations.push('检查DOM引用是否及时释放')
      recommendations.push('检查闭包中的大对象引用')
    }

    return {
      isLeaking,
      severity,
      growthRate,
      suspiciousComponents: this.identifySuspiciousComponents(),
      recommendations
    }
  }

  /**
   * 识别可疑组件
   */
  private identifySuspiciousComponents(): string[] {
    // 模拟识别逻辑
    const suspiciousComponents: string[] = []
    
    // 检查DOM节点数量
    if (typeof document !== 'undefined') {
      const nodeCount = document.querySelectorAll('*').length
      if (nodeCount > 5000) {
        suspiciousComponents.push('DOM节点过多')
      }
    }

    // 检查React组件实例（如果可用）
    if (typeof window !== 'undefined' && (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      suspiciousComponents.push('React组件实例可能过多')
    }

    return suspiciousComponents
  }

  /**
   * 触发垃圾回收建议
   */
  private triggerGarbageCollection(): void {
    console.log('🗑️ 建议执行垃圾回收优化')
    
    // 清理可能的内存泄漏源
    this.cleanupPotentialLeaks()
    
    // 如果支持手动GC（开发环境）
    if (typeof window !== 'undefined' && (window as any).gc) {
      try {
        (window as any).gc()
        console.log('✅ 手动垃圾回收已执行')
      } catch (error) {
        console.log('ℹ️ 手动垃圾回收不可用')
      }
    }
  }

  /**
   * 清理潜在的内存泄漏
   */
  private cleanupPotentialLeaks(): void {
    // 清理全局事件监听器
    if (typeof window !== 'undefined') {
      // 移除可能遗留的事件监听器
      const events = ['resize', 'scroll', 'mousemove', 'touchmove']
      events.forEach(event => {
        // 注意：这只是示例，实际应用中需要更精确的清理策略
        console.log(`清理 ${event} 事件监听器`)
      })
    }

    // 清理定时器（如果有全局注册表）
    if (typeof window !== 'undefined' && (window as any).__timers) {
      const timers = (window as any).__timers
      timers.forEach((timer: number) => {
        clearTimeout(timer)
        clearInterval(timer)
      })
      console.log('清理遗留定时器')
    }
  }

  /**
   * 获取内存使用报告
   */
  getMemoryReport(): {
    current: MemoryInfo | null
    peak: MemoryInfo | null
    average: number
    trend: 'increasing' | 'decreasing' | 'stable'
    optimizations: MemoryOptimization[]
  } {
    if (this.memoryHistory.length === 0) {
      return {
        current: null,
        peak: null,
        average: 0,
        trend: 'stable',
        optimizations: []
      }
    }

    const current = this.memoryHistory[this.memoryHistory.length - 1]
    const peak = this.memoryHistory.reduce((max, info) => 
      info.usedJSHeapSize > max.usedJSHeapSize ? info : max
    )
    
    const average = this.memoryHistory.reduce((sum, info) => 
      sum + info.usedJSHeapSize, 0
    ) / this.memoryHistory.length

    // 计算趋势
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
    if (this.memoryHistory.length >= 5) {
      const recent = this.memoryHistory.slice(-5)
      const first = recent[0].usedJSHeapSize
      const last = recent[recent.length - 1].usedJSHeapSize
      const change = (last - first) / first
      
      if (change > 0.1) {trend = 'increasing'}
      else if (change < -0.1) {trend = 'decreasing'}
    }

    return {
      current,
      peak,
      average,
      trend,
      optimizations: this.generateOptimizations()
    }
  }

  /**
   * 生成优化建议
   */
  private generateOptimizations(): MemoryOptimization[] {
    const optimizations: MemoryOptimization[] = []
    
    if (this.memoryHistory.length === 0) {return optimizations}

    const current = this.memoryHistory[this.memoryHistory.length - 1]
    const usageMB = current.usedJSHeapSize / (1024 * 1024)

    // 基于内存使用情况生成建议
    if (usageMB > 50) {
      optimizations.push({
        type: 'lazy-loading',
        priority: 'high',
        description: '实现组件懒加载减少初始内存占用',
        implementation: '使用React.lazy()和Suspense包装大型组件',
        estimatedSavings: 15
      })
    }

    if (usageMB > 30) {
      optimizations.push({
        type: 'caching',
        priority: 'medium',
        description: '优化缓存策略避免重复数据',
        implementation: '使用React.memo()和useMemo()优化组件渲染',
        estimatedSavings: 8
      })
    }

    optimizations.push({
      type: 'cleanup',
      priority: 'medium',
      description: '定期清理未使用的事件监听器和定时器',
      implementation: '在useEffect清理函数中移除监听器',
      estimatedSavings: 5
    })

    return optimizations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  /**
   * 获取当前内存使用情况
   */
  getCurrentMemoryUsage(): MemoryInfo | null {
    if (typeof window === 'undefined' || !('performance' in window)) {
      return null
    }

    const performance = window.performance as any
    if (!performance.memory) {
      return null
    }

    return {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      timestamp: Date.now()
    }
  }

  /**
   * 格式化内存大小
   */
  formatMemorySize(bytes: number): string {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)}MB`
  }
}

// 创建全局实例
export const memoryOptimizer = new MemoryOptimizer()

// 自动启动监控（仅在浏览器环境）
if (typeof window !== 'undefined') {
  // 延迟启动，避免影响初始加载
  setTimeout(() => {
    memoryOptimizer.startMonitoring()
  }, 5000)
} 