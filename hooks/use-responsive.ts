// @ts-nocheck
/**
 * @file Responsive Hook
 * @description 智能断点检测、设备类型识别、实时响应窗口变化
 * @author ZK-Agent Team A
 * @date 2024-12-19
 */

"use client"

import { useState, useEffect, useCallback } from 'react'

// 断点定义 - 基于Tailwind CSS标准
const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

type Breakpoint = keyof typeof BREAKPOINTS
type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'tv'
type Orientation = 'portrait' | 'landscape'

interface ResponsiveState {
  width: number
  height: number
  breakpoint: Breakpoint
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isTV: boolean
  deviceType: DeviceType
  orientation: Orientation
  pixelRatio: number
  isOnline: boolean
  connectionType: string
  isReducedMotion: boolean
  isDarkMode: boolean
}

interface UseResponsiveOptions {
  debounceMs?: number
  enableNetworkDetection?: boolean
  enableMotionDetection?: boolean
  enableThemeDetection?: boolean
}

export const useResponsive = (options: UseResponsiveOptions = {}): ResponsiveState => {
  const {
    debounceMs = 150,
    enableNetworkDetection = true,
    enableMotionDetection = true,
    enableThemeDetection = true
  } = options

  const [state, setState] = useState<ResponsiveState>(() => {
    if (typeof window === 'undefined') {
      // SSR默认值
      return {
        width: 1024,
        height: 768,
        breakpoint: 'lg' as Breakpoint,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isTV: false,
        deviceType: 'desktop' as DeviceType,
        orientation: 'landscape' as Orientation,
        pixelRatio: 1,
        isOnline: true,
        connectionType: 'unknown',
        isReducedMotion: false,
        isDarkMode: false
      }
    }

    return getResponsiveState()
  })

  // 获取当前响应式状态
  const getResponsiveState = useCallback((): ResponsiveState => {
    if (typeof window === 'undefined') {
      return state
    }

    const width = window.innerWidth
    const height = window.innerHeight
    const pixelRatio = window.devicePixelRatio || 1

    // 确定断点
    let breakpoint: Breakpoint = 'sm'
    if (width >= BREAKPOINTS['2xl']) {breakpoint = '2xl'}
    else if (width >= BREAKPOINTS.xl) {breakpoint = 'xl'}
    else if (width >= BREAKPOINTS.lg) {breakpoint = 'lg'}
    else if (width >= BREAKPOINTS.md) {breakpoint = 'md'}
    else if (width >= BREAKPOINTS.sm) {breakpoint = 'sm'}

    // 确定设备类型
    const isMobile = width < BREAKPOINTS.md
    const isTablet = width >= BREAKPOINTS.md && width < BREAKPOINTS.lg
    const isDesktop = width >= BREAKPOINTS.lg && width < BREAKPOINTS['2xl']
    const isTV = width >= BREAKPOINTS['2xl']

    let deviceType: DeviceType = 'desktop'
    if (isMobile) {deviceType = 'mobile'}
    else if (isTablet) {deviceType = 'tablet'}
    else if (isTV) {deviceType = 'tv'}

    // 确定方向
    const orientation: Orientation = width > height ? 'landscape' : 'portrait'

    // 网络状态检测
    let isOnline = true
    let connectionType = 'unknown'
    if (enableNetworkDetection && 'navigator' in window) {
      isOnline = navigator.onLine
      // @ts-ignore - connection API是实验性的
      if ('connection' in navigator) {
        // @ts-ignore
        connectionType = navigator.connection?.effectiveType || 'unknown'
      }
    }

    // 动画偏好检测
    let isReducedMotion = false
    if (enableMotionDetection && 'matchMedia' in window) {
      isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }

    // 主题偏好检测
    let isDarkMode = false
    if (enableThemeDetection && 'matchMedia' in window) {
      isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
    }

    return {
      width,
      height,
      breakpoint,
      isMobile,
      isTablet,
      isDesktop,
      isTV,
      deviceType,
      orientation,
      pixelRatio,
      isOnline,
      connectionType,
      isReducedMotion,
      isDarkMode
    }
  }, [enableNetworkDetection, enableMotionDetection, enableThemeDetection, state])

  // 防抖更新函数
  const debouncedUpdate = useCallback(() => {
    setState(getResponsiveState())
  }, [getResponsiveState])

  useEffect(() => {
    if (typeof window === 'undefined') {return}

    // 初始化状态
    setState(getResponsiveState())

    // 窗口大小变化监听
    const handleResize = debounce(() => {
      debouncedUpdate()
    }, debounceMs)

    // 网络状态变化监听
    const handleOnline = () => {
      if (enableNetworkDetection) {
        setState(prev => ({ ...prev, isOnline: true }))
      }
    }

    const handleOffline = () => {
      if (enableNetworkDetection) {
        setState(prev => ({ ...prev, isOnline: false }))
      }
    }

    // 主题变化监听
    const handleThemeChange = (e: MediaQueryListEvent) => {
      if (enableThemeDetection) {
        setState(prev => ({ ...prev, isDarkMode: e.matches }))
      }
    }

    // 动画偏好变化监听
    const handleMotionChange = (e: MediaQueryListEvent) => {
      if (enableMotionDetection) {
        setState(prev => ({ ...prev, isReducedMotion: e.matches }))
      }
    }

    // 添加事件监听器
    window.addEventListener('resize', handleResize, { passive: true })
    window.addEventListener('orientationchange', handleResize, { passive: true })

    if (enableNetworkDetection) {
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
    }

    let themeMediaQuery: MediaQueryList | null = null
    let motionMediaQuery: MediaQueryList | null = null

    if (enableThemeDetection && 'matchMedia' in window) {
      themeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      themeMediaQuery.addEventListener('change', handleThemeChange)
    }

    if (enableMotionDetection && 'matchMedia' in window) {
      motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      motionMediaQuery.addEventListener('change', handleMotionChange)
    }

    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)

      if (enableNetworkDetection) {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }

      if (themeMediaQuery) {
        themeMediaQuery.removeEventListener('change', handleThemeChange)
      }

      if (motionMediaQuery) {
        motionMediaQuery.removeEventListener('change', handleMotionChange)
      }
    }
  }, [debouncedUpdate, enableNetworkDetection, enableMotionDetection, enableThemeDetection, getResponsiveState, debounceMs])

  return state
}

// 防抖函数
function debounce<T extends (..._args: any[]) => any>(
  func: T,
  wait: number
): (..._args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (..._args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(() => {
      func(..._args)
    }, wait)
  }
}

// 断点匹配Hook
export const useBreakpoint = (breakpoint: Breakpoint): boolean => {
  const { width } = useResponsive()
  return width >= BREAKPOINTS[breakpoint]
}

// 设备类型检测Hook
export const useDeviceType = (): DeviceType => {
  const { deviceType } = useResponsive()
  return deviceType
}

// 方向检测Hook
export const useOrientation = (): Orientation => {
  const { orientation } = useResponsive()
  return orientation
}

// 网络状态Hook
export const useNetworkStatus = () => {
  const { isOnline, connectionType } = useResponsive({ enableNetworkDetection: true })
  return { isOnline, connectionType }
}

// 用户偏好Hook
export const useUserPreferences = () => {
  const { isReducedMotion, isDarkMode } = useResponsive({
    enableMotionDetection: true,
    enableThemeDetection: true
  })
  return { isReducedMotion, isDarkMode }
}

export default useResponsive