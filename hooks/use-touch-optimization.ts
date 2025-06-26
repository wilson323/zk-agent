// @ts-nocheck
/**
 * @file Touch Optimization Hook
 * @description 移动端触摸优化Hook，触摸反馈增强、防止意外点击、保持所有现有交互效果
 * @author ZK-Agent Team A
 * @date 2024-12-19
 */

"use client"

import { useRef, useCallback, useEffect } from 'react'
import { useResponsive } from './use-responsive'

interface TouchPoint {
  x: number
  y: number
  timestamp: number
  identifier: number
}

interface TouchOptimizationOptions {
  enableHapticFeedback?: boolean
  preventAccidentalTaps?: boolean
  tapDelay?: number
  longPressDelay?: number
  swipeThreshold?: number
  enableRippleEffect?: boolean
  enableTouchHighlight?: boolean
}

interface TouchOptimizationReturn {
  touchProps: {
    onTouchStart: (_e: TouchEvent) => void
    onTouchMove: (_e: TouchEvent) => void
    onTouchEnd: (_e: TouchEvent) => void
    onTouchCancel: (_e: TouchEvent) => void
  }
  isPressed: boolean
  isSwiping: boolean
  touchPosition: { x: number; y: number } | null
}

export const useTouchOptimization = (
  options: TouchOptimizationOptions = {}
): TouchOptimizationReturn => {
  const {
    enableHapticFeedback = true,
    preventAccidentalTaps = true,
    tapDelay = 50,
    longPressDelay = 500,
    swipeThreshold = 50,
    enableRippleEffect: _enableRippleEffect = true,
    enableTouchHighlight = true
  } = options

  const { isMobile, isTablet } = useResponsive()
  const isTouchDevice = isMobile || isTablet

  const touchStartRef = useRef<TouchPoint | null>(null)
  const touchMoveRef = useRef<TouchPoint[]>([])
  const isPressedRef = useRef(false)
  const isSwipingRef = useRef(false)
  const touchPositionRef = useRef<{ x: number; y: number } | null>(null)
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 触觉反馈
  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!enableHapticFeedback || !isTouchDevice) {return}

    try {
      // 使用Vibration API提供触觉反馈
      if ('vibrate' in navigator) {
        const patterns = {
          light: [10],
          medium: [20],
          heavy: [30]
        }
        navigator.vibrate(patterns[type])
      }

      // 使用Web Haptics API (实验性)
      // @ts-ignore - Haptics API是实验性的
      if ('vibrate' in navigator && navigator.vibrate) {
        const intensities = {
          light: 0.3,
          medium: 0.6,
          heavy: 1.0
        }
        // @ts-ignore
        navigator.vibrate?.({ duration: 50, intensity: intensities[type] })
      }
    } catch (_error) {
      // 静默处理错误，不影响用户体验
      // Haptic feedback not supported - silently ignore
    }
  }, [enableHapticFeedback, isTouchDevice])

  // 计算两点距离
  const getDistance = useCallback((point1: TouchPoint, point2: TouchPoint): number => {
    const dx = point2.x - point1.x
    const dy = point2.y - point1.y
    return Math.sqrt(dx * dx + dy * dy)
  }, [])

  // 检测是否为意外点击
  const isAccidentalTap = useCallback((startPoint: TouchPoint, endPoint: TouchPoint): boolean => {
    if (!preventAccidentalTaps) {return false}

    const distance = getDistance(startPoint, endPoint)
    const duration = endPoint.timestamp - startPoint.timestamp

    // 如果移动距离过大或时间过短，认为是意外点击
    return distance > 20 || duration < 100
  }, [preventAccidentalTaps, getDistance])

  // 触摸开始处理
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!isTouchDevice) {return}

    const touch = e.touches[0]
    if (!touch) {return}

    const touchPoint: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
      identifier: touch.identifier
    }

    touchStartRef.current = touchPoint
    touchMoveRef.current = [touchPoint]
    isPressedRef.current = true
    isSwipingRef.current = false
    touchPositionRef.current = { x: touch.clientX, y: touch.clientY }

    // 轻触觉反馈
    triggerHapticFeedback('light')

    // 设置长按检测
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
    }

    longPressTimeoutRef.current = setTimeout(() => {
      if (isPressedRef.current && touchStartRef.current) {
        // 长按触觉反馈
        triggerHapticFeedback('medium')
        
        // 触发长按事件
        const longPressEvent = new CustomEvent('longpress', {
          detail: { 
            x: touchStartRef.current.x, 
            y: touchStartRef.current.y 
          }
        })
        e.target?.dispatchEvent(longPressEvent)
      }
    }, longPressDelay)

    // 添加触摸高亮效果
    if (enableTouchHighlight && e.target instanceof HTMLElement) {
      e.target.style.setProperty('--touch-highlight', '1')
      e.target.classList.add('touch-active')
    }

  }, [isTouchDevice, triggerHapticFeedback, longPressDelay, enableTouchHighlight])

  // 触摸移动处理
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isTouchDevice || !touchStartRef.current) {return}

    const touch = e.touches[0]
    if (!touch || touch.identifier !== touchStartRef.current.identifier) {return}

    const touchPoint: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
      identifier: touch.identifier
    }

    touchMoveRef.current.push(touchPoint)
    touchPositionRef.current = { x: touch.clientX, y: touch.clientY }

    // 检测滑动
    const distance = getDistance(touchStartRef.current, touchPoint)
    if (distance > swipeThreshold && !isSwipingRef.current) {
      isSwipingRef.current = true
      
      // 取消长按检测
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current)
        longPressTimeoutRef.current = null
      }

      // 滑动触觉反馈
      triggerHapticFeedback('light')
    }

    // 如果开始滑动，阻止默认行为（如页面滚动）
    if (isSwipingRef.current) {
      e.preventDefault()
    }

  }, [isTouchDevice, getDistance, swipeThreshold, triggerHapticFeedback])

  // 触摸结束处理
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!isTouchDevice || !touchStartRef.current) {return}

    const touch = e.changedTouches[0]
    if (!touch || touch.identifier !== touchStartRef.current.identifier) {return}

    const touchPoint: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
      identifier: touch.identifier
    }

    // 清理定时器
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
      longPressTimeoutRef.current = null
    }

    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current)
      tapTimeoutRef.current = null
    }

    // 移除触摸高亮效果
    if (enableTouchHighlight && e.target instanceof HTMLElement) {
      e.target.style.removeProperty('--touch-highlight')
      e.target.classList.remove('touch-active')
    }

    // 检测点击类型
    const isAccidental = isAccidentalTap(touchStartRef.current, touchPoint)
    const wasSwipe = isSwipingRef.current

    if (!isAccidental && !wasSwipe) {
      // 正常点击 - 延迟执行以防止意外点击
      tapTimeoutRef.current = setTimeout(() => {
        triggerHapticFeedback('medium')
        
        // 触发优化后的点击事件
        const optimizedClickEvent = new CustomEvent('optimizedclick', {
          detail: { 
            x: touchPoint.x, 
            y: touchPoint.y,
            duration: touchPoint.timestamp - touchStartRef.current!.timestamp
          }
        })
        e.target?.dispatchEvent(optimizedClickEvent)
      }, tapDelay)
    }

    // 重置状态
    isPressedRef.current = false
    isSwipingRef.current = false
    touchPositionRef.current = null
    touchStartRef.current = null
    touchMoveRef.current = []

  }, [isTouchDevice, isAccidentalTap, triggerHapticFeedback, tapDelay, enableTouchHighlight])

  // 触摸取消处理
  const handleTouchCancel = useCallback((e: TouchEvent) => {
    // 清理所有状态和定时器
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
      longPressTimeoutRef.current = null
    }

    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current)
      tapTimeoutRef.current = null
    }

    // 移除触摸高亮效果
    if (enableTouchHighlight && e.target instanceof HTMLElement) {
      e.target.style.removeProperty('--touch-highlight')
      e.target.classList.remove('touch-active')
    }

    isPressedRef.current = false
    isSwipingRef.current = false
    touchPositionRef.current = null
    touchStartRef.current = null
    touchMoveRef.current = []
  }, [enableTouchHighlight])

  // 清理副作用
  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current)
      }
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current)
      }
    }
  }, [])

  return {
    touchProps: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel
    },
    isPressed: isPressedRef.current,
    isSwiping: isSwipingRef.current,
    touchPosition: touchPositionRef.current
  }
}

// 触摸手势识别Hook
export const useTouchGestures = (options: {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onPinch?: (_scale: number) => void
  onRotate?: (_angle: number) => void
  swipeThreshold?: number
}) => {
  const elementRef = useRef<HTMLElement>(null)
  const { isMobile, isTablet } = useResponsive()
  const isTouchDevice = isMobile || isTablet

  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onPinch: _onPinch,
    onRotate: _onRotate,
    swipeThreshold = 50
  } = options

  useEffect(() => {
    if (!isTouchDevice || !elementRef.current) {return}

    const element = elementRef.current
    let startTouch: Touch | null = null
    let _startTouches: TouchList | null = null

    const handleTouchStart = (e: TouchEvent) => {
      startTouch = e.touches[0]
      _startTouches = e.touches
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!startTouch) {return}

      const endTouch = e.changedTouches[0]
      const deltaX = endTouch.clientX - startTouch.clientX
      const deltaY = endTouch.clientY - startTouch.clientY

      // 检测滑动方向
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // 水平滑动
        if (Math.abs(deltaX) > swipeThreshold) {
          if (deltaX > 0) {
            onSwipeRight?.()
          } else {
            onSwipeLeft?.()
          }
        }
      } else {
        // 垂直滑动
        if (Math.abs(deltaY) > swipeThreshold) {
          if (deltaY > 0) {
            onSwipeDown?.()
          } else {
            onSwipeUp?.()
          }
        }
      }

      startTouch = null
      _startTouches = null
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isTouchDevice, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, swipeThreshold])

  return elementRef
}

export default useTouchOptimization
