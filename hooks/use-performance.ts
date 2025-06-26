// @ts-nocheck
/**
 * @file Performance Monitoring Hook
 * @description 性能监控Hook，用于监控页面性能指标和用户体验
 * @author ZK-Agent Team A
 * @date 2024-12-19
 */

"use client"

import { useEffect, useCallback, useRef } from 'react'

// 性能指标类型
interface PerformanceMetrics {
  // Core Web Vitals
  LCP?: number // Largest Contentful Paint
  FID?: number // First Input Delay
  CLS?: number // Cumulative Layout Shift
  FCP?: number // First Contentful Paint
  TTFB?: number // Time to First Byte
  
  // 自定义指标
  pageLoadTime?: number
  domContentLoaded?: number
  resourceLoadTime?: number
  memoryUsage?: number
}

// 性能监控配置
interface PerformanceConfig {
  enableWebVitals?: boolean
  enableResourceTiming?: boolean
  enableMemoryMonitoring?: boolean
  reportInterval?: number
  onMetric?: (_metric: string, _value: number, _rating: 'good' | 'needs-improvement' | 'poor') => void
}

// 性能评级标准
const PERFORMANCE_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 }
}

// 获取性能评级
const getPerformanceRating = (metric: string, value: number): 'good' | 'needs-improvement' | 'poor' => {
  const threshold = PERFORMANCE_THRESHOLDS[metric as keyof typeof PERFORMANCE_THRESHOLDS]
  if (!threshold) {return 'good'}
  
  if (value <= threshold.good) {return 'good'}
  if (value <= threshold.poor) {return 'needs-improvement'}
  return 'poor'
}

// 上报性能数据
const reportPerformance = (metrics: PerformanceMetrics) => {
  // 发送到分析服务
  if (typeof window !== 'undefined' && window.gtag) {
    Object.entries(metrics).forEach(([metric, value]) => {
      if (value !== undefined) {
        window.gtag('event', 'timing_complete', {
          name: metric,
          value: Math.round(value)
        })
      }
    })
  }

  // 发送到自定义监控服务
  fetch('/api/metrics/performance', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      metrics,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    })
  }).catch(_err => {
    // Performance metrics reporting failed - handled silently
  })
}

// 性能监控Hook
export const usePerformance = (config: PerformanceConfig = {}) => {
  const {
    enableWebVitals = true,
    enableResourceTiming = true,
    enableMemoryMonitoring = true,
    reportInterval = 30000, // 30秒
    onMetric
  } = config

  const metricsRef = useRef<PerformanceMetrics>({})
  const reportedRef = useRef(false)

  // 测量Core Web Vitals
  const measureWebVitals = useCallback(() => {
    if (!enableWebVitals || typeof window === 'undefined') {return}

    // 使用Web Vitals库或原生API
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1] as any
        const lcp = lastEntry.startTime
        
        metricsRef.current.LCP = lcp
        onMetric?.('LCP', lcp, getPerformanceRating('LCP', lcp))
      })
      
      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
      } catch (_e) {
        // LCP observation not supported - handled silently
      }

      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          const fid = entry.processingStart - entry.startTime
          metricsRef.current.FID = fid
          onMetric?.('FID', fid, getPerformanceRating('FID', fid))
        })
      })
      
      try {
        fidObserver.observe({ entryTypes: ['first-input'] })
      } catch (_e) {
        // FID observation not supported - handled silently
      }

      // Cumulative Layout Shift (CLS)
      let clsValue = 0
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
          }
        })
        
        metricsRef.current.CLS = clsValue
        onMetric?.('CLS', clsValue, getPerformanceRating('CLS', clsValue))
      })
      
      try {
        clsObserver.observe({ entryTypes: ['layout-shift'] })
      } catch (_e) {
        // CLS observation not supported - handled silently
      }
    }
  }, [enableWebVitals, onMetric])

  // 测量导航时间
  const measureNavigationTiming = useCallback(() => {
    if (typeof window === 'undefined') {return}

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (navigation) {
      const metrics = {
        FCP: navigation.responseStart - navigation.fetchStart,
        TTFB: navigation.responseStart - navigation.requestStart,
        pageLoadTime: navigation.loadEventEnd - navigation.fetchStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart
      }

      Object.assign(metricsRef.current, metrics)
      
      Object.entries(metrics).forEach(([metric, value]) => {
        onMetric?.(metric, value, getPerformanceRating(metric, value))
      })
    }
  }, [onMetric])

  // 测量资源加载时间
  const measureResourceTiming = useCallback(() => {
    if (!enableResourceTiming || typeof window === 'undefined') {return}

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    const totalResourceTime = resources.reduce((total, resource) => {
      return total + (resource.responseEnd - resource.startTime)
    }, 0)

    metricsRef.current.resourceLoadTime = totalResourceTime
    onMetric?.('resourceLoadTime', totalResourceTime, 'good')
  }, [enableResourceTiming, onMetric])

  // 监控内存使用
  const measureMemoryUsage = useCallback(() => {
    if (!enableMemoryMonitoring || typeof window === 'undefined') {return}

    // @ts-ignore - performance.memory是非标准API
    if (performance.memory) {
      // @ts-ignore
      const memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024 // MB
      metricsRef.current.memoryUsage = memoryUsage
      onMetric?.('memoryUsage', memoryUsage, memoryUsage > 50 ? 'poor' : 'good')
    }
  }, [enableMemoryMonitoring, onMetric])

  // 上报性能数据
  const reportMetrics = useCallback(() => {
    if (reportedRef.current) {return}
    
    const metrics = { ...metricsRef.current }
    if (Object.keys(metrics).length > 0) {
      reportPerformance(metrics)
      reportedRef.current = true
    }
  }, [])

  // 获取当前性能指标
  const getMetrics = useCallback((): PerformanceMetrics => {
    return { ...metricsRef.current }
  }, [])

  // 手动触发性能测量
  const measurePerformance = useCallback(() => {
    measureNavigationTiming()
    measureResourceTiming()
    measureMemoryUsage()
  }, [measureNavigationTiming, measureResourceTiming, measureMemoryUsage])

  useEffect(() => {
    if (typeof window === 'undefined') {return}

    // 页面加载完成后开始监控
    const startMonitoring = () => {
      measureWebVitals()
      measureNavigationTiming()
      measureResourceTiming()
      measureMemoryUsage()
    }

    if (document.readyState === 'complete') {
      startMonitoring()
    } else {
      window.addEventListener('load', startMonitoring)
    }

    // 定期上报性能数据
    const reportTimer = setInterval(reportMetrics, reportInterval)

    // 页面卸载时上报数据
    const handleBeforeUnload = () => {
      reportMetrics()
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)

    // 页面可见性变化时上报数据
    const handleVisibilityChange = () => {
      if (document.hidden) {
        reportMetrics()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('load', startMonitoring)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(reportTimer)
    }
  }, [measureWebVitals, measureNavigationTiming, measureResourceTiming, measureMemoryUsage, reportMetrics, reportInterval])

  return {
    metrics: metricsRef.current,
    getMetrics,
    measurePerformance,
    reportMetrics
  }
}

// 性能监控组件
export const PerformanceMonitor: React.FC<PerformanceConfig> = (props) => {
  usePerformance(props)
  return null
}

export default usePerformance