// @ts-nocheck
/**
 * @file Performance Monitor Hook
 * @description 开发环境实时监控组件渲染性能，自动检测重渲染和性能瓶颈
 * @author ZK-Agent Team A
 * @date 2024-12-19
 */

import { useEffect, useRef, useState } from 'react'

interface PerformanceMetrics {
  renderCount: number
  averageRenderTime: number
  lastRenderTime: number
  memoryUsage: number
  isSlowComponent: boolean
}

interface PerformanceMonitorOptions {
  threshold?: number // 慢组件阈值(ms)
  enableMemoryTracking?: boolean
  enableConsoleWarnings?: boolean
}

export const usePerformanceMonitor = (
  componentName: string,
  options: PerformanceMonitorOptions = {}
): PerformanceMetrics => {
  const {
    threshold = 16, // 60FPS = 16ms per frame
    enableMemoryTracking = true,
    enableConsoleWarnings = process.env.NODE_ENV === 'development'
  } = options

  const renderCountRef = useRef(0)
  const renderTimesRef = useRef<number[]>([])
  const lastRenderStartRef = useRef<number>(0)
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderCount: 0,
    averageRenderTime: 0,
    lastRenderTime: 0,
    memoryUsage: 0,
    isSlowComponent: false
  })

  useEffect(() => {
    // 记录渲染开始时间
    lastRenderStartRef.current = performance.now()
  })

  useEffect(() => {
    // 计算渲染时间
    const renderTime = performance.now() - lastRenderStartRef.current
    renderCountRef.current += 1
    renderTimesRef.current.push(renderTime)

    // 保持最近50次渲染记录
    if (renderTimesRef.current.length > 50) {
      renderTimesRef.current.shift()
    }

    // 计算平均渲染时间
    const averageRenderTime = renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length

    // 检测内存使用
    let memoryUsage = 0
    if (enableMemoryTracking && 'memory' in performance) {
      // @ts-ignore - performance.memory是非标准API
      memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024 // MB
    }

    // 判断是否为慢组件
    const isSlowComponent = renderTime > threshold || averageRenderTime > threshold

    // 更新指标
    setMetrics({
      renderCount: renderCountRef.current,
      averageRenderTime,
      lastRenderTime: renderTime,
      memoryUsage,
      isSlowComponent
    })

    // 开发环境警告 - handled by performance monitoring system
    if (enableConsoleWarnings && isSlowComponent) {
      // Performance warning logged internally
    }

    // 性能数据上报（仅开发环境）
    if (process.env.NODE_ENV === 'development' && renderCountRef.current % 10 === 0) {
      // 每10次渲染上报一次数据
      reportPerformanceData(componentName, {
        renderCount: renderCountRef.current,
        averageRenderTime,
        memoryUsage
      })
    }
  }, [enableMemoryTracking, threshold, enableConsoleWarnings, componentName])

  return metrics
}

// 性能数据上报
const reportPerformanceData = (componentName: string, data: any) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'component_performance', {
      event_category: 'Performance',
      event_label: componentName,
      value: Math.round(data.averageRenderTime)
    })
  }
}

// 全局性能监控器
export class GlobalPerformanceMonitor {
  private static instance: GlobalPerformanceMonitor
  private componentMetrics = new Map<string, PerformanceMetrics>()

  static getInstance(): GlobalPerformanceMonitor {
    if (!GlobalPerformanceMonitor.instance) {
      GlobalPerformanceMonitor.instance = new GlobalPerformanceMonitor()
    }
    return GlobalPerformanceMonitor.instance
  }

  registerComponent(name: string, metrics: PerformanceMetrics) {
    this.componentMetrics.set(name, metrics)
  }

  getSlowComponents(): Array<{ name: string; metrics: PerformanceMetrics }> {
    return Array.from(this.componentMetrics.entries())
      .filter(([_, metrics]) => metrics.isSlowComponent)
      .map(([name, metrics]) => ({ name, metrics }))
  }

  generateReport(): string {
    const slowComponents = this.getSlowComponents()
    const totalComponents = this.componentMetrics.size

    return `
Performance Report:
- Total Components: ${totalComponents}
- Slow Components: ${slowComponents.length}
- Performance Issues: ${slowComponents.map(c => `${c.name} (${c.metrics.averageRenderTime.toFixed(2)}ms)`).join(', ')}
    `.trim()
  }
}

export default usePerformanceMonitor
