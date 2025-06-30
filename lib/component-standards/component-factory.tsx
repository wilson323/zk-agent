/**
 * @file Component Factory
 * @description 组件工厂模式，提供统一的组件创建、配置和扩展方法
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { designTokens, type ComponentSize } from './design-tokens'

// 基础组件配置接口
export interface BaseComponentConfig {
  className?: string
  size?: ComponentSize
  variant?: string
  disabled?: boolean
  loading?: boolean
  'data-testid'?: string
}

// 组件变体配置
export interface ComponentVariants {
  [key: string]: {
    [variant: string]: string
  }
}

// 组件工厂选项
export interface ComponentFactoryOptions {
  baseClasses: string
  variants: ComponentVariants
  defaultVariants?: Record<string, string>
  compoundVariants?: Array<{
    conditions: Record<string, string | string[]>
    className: string
  }>
}

/**
 * 创建标准化组件的工厂函数
 * @param options 组件配置选项
 * @returns 组件变体函数和类型
 */
export function createComponentVariants(options: ComponentFactoryOptions) {
  const { baseClasses, variants, defaultVariants, compoundVariants } = options

  const componentVariants = cva(baseClasses, {
    variants,
    defaultVariants,
    compoundVariants,
  })

  return {
    variants: componentVariants,
    props: {} as VariantProps<typeof componentVariants>,
  }
}

/**
 * 创建带有一致性检查的组件包装器
 * @param Component 原始组件
 * @param config 组件配置
 * @returns 增强后的组件
 */
export function createStandardComponent<T extends React.ComponentType<any>>(
  Component: T,
  config: {
    displayName: string
    defaultProps?: Partial<React.ComponentProps<T>>
    validation?: (props: React.ComponentProps<T>) => boolean
    analytics?: {
      trackUsage?: boolean
      eventName?: string
    }
  }
) {
  const StandardComponent = React.forwardRef<
    React.ElementRef<T>,
    React.ComponentProps<T> & BaseComponentConfig
  >((props, ref) => {
    const { className, 'data-testid': testId, ...restProps } = props

    // 验证属性
    if (config.validation && !config.validation(props)) {
      console.warn(`Invalid props for ${config.displayName}:`, props)
    }

    // 分析跟踪
    React.useEffect(() => {
      if (config.analytics?.trackUsage) {
        // 这里可以集成分析工具
        console.debug(`Component used: ${config.displayName}`, {
          eventName: config.analytics.eventName,
          props: Object.keys(props),
        })
      }
    }, [])

    return (
      <Component
        ref={ref}
        className={cn(className)}
        data-testid={testId || config.displayName.toLowerCase()}
        {...config.defaultProps}
        {...restProps}
      />
    )
  })

  StandardComponent.displayName = config.displayName
  return StandardComponent
}

/**
 * 创建响应式组件变体
 * @param baseVariants 基础变体配置
 * @returns 响应式变体函数
 */
export function createResponsiveVariants(baseVariants: ComponentFactoryOptions) {
  const breakpoints = ['sm', 'md', 'lg', 'xl', '2xl'] as const
  
  const responsiveVariants: ComponentVariants = {}
  
  // 为每个断点创建变体
  Object.entries(baseVariants.variants).forEach(([variantName, variantValues]) => {
    responsiveVariants[variantName] = variantValues
    
    breakpoints.forEach(breakpoint => {
      const responsiveVariantName = `${variantName}-${breakpoint}`
      responsiveVariants[responsiveVariantName] = Object.fromEntries(
        Object.entries(variantValues).map(([key, value]) => [
          key,
          `${breakpoint}:${value.replace(/^([^\s]+)/, `$1`)}`
        ])
      )
    })
  })
  
  return createComponentVariants({
    ...baseVariants,
    variants: responsiveVariants,
  })
}

/**
 * 组件组合工具
 * @param components 要组合的组件数组
 * @returns 组合后的组件
 */
export function composeComponents<T extends React.ComponentType<any>[]>(
  ...components: T
): React.ComponentType<
  T extends [React.ComponentType<infer P>, ...any[]] ? P : never
> {
  return components.reduce(
    (AccumulatedComponent, CurrentComponent) => 
      React.forwardRef((props, ref) => (
        <AccumulatedComponent>
          <CurrentComponent ref={ref} {...props} />
        </AccumulatedComponent>
      ))
  ) as any
}

/**
 * 创建主题感知组件
 * @param Component 原始组件
 * @param themeVariants 主题变体映射
 * @returns 主题感知组件
 */
export function createThemeAwareComponent<T extends React.ComponentType<any>>(
  Component: T,
  themeVariants: {
    light: Partial<React.ComponentProps<T>>
    dark: Partial<React.ComponentProps<T>>
  }
) {
  return React.forwardRef<
    React.ElementRef<T>,
    React.ComponentProps<T> & { theme?: 'light' | 'dark' | 'auto' }
  >((props, ref) => {
    const { theme = 'auto', ...restProps } = props
    
    // 检测系统主题
    const [systemTheme, setSystemTheme] = React.useState<'light' | 'dark'>('light')
    
    React.useEffect(() => {
      if (theme === 'auto') {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        setSystemTheme(mediaQuery.matches ? 'dark' : 'light')
        
        const handleChange = (e: MediaQueryListEvent) => {
          setSystemTheme(e.matches ? 'dark' : 'light')
        }
        
        mediaQuery.addEventListener('change', handleChange)
        return () => mediaQuery.removeEventListener('change', handleChange)
      }
    }, [theme])
    
    const currentTheme = theme === 'auto' ? systemTheme : theme
    const themeProps = themeVariants[currentTheme] || {}
    
    return (
      <Component
        ref={ref}
        {...themeProps}
        {...restProps}
      />
    )
  })
}

/**
 * 组件性能优化包装器
 * @param Component 原始组件
 * @param options 优化选项
 * @returns 优化后的组件
 */
export function withPerformanceOptimization<T extends React.ComponentType<any>>(
  Component: T,
  options: {
    memo?: boolean
    lazy?: boolean
    preload?: boolean
  } = {}
) {
  let OptimizedComponent = Component
  
  // 应用 memo 优化
  if (options.memo) {
    OptimizedComponent = React.memo(OptimizedComponent) as T
  }
  
  // 应用懒加载
  if (options.lazy) {
    OptimizedComponent = React.lazy(() => 
      Promise.resolve({ default: OptimizedComponent })
    ) as T
  }
  
  return OptimizedComponent
}

/**
 * 创建可访问性增强组件
 * @param Component 原始组件
 * @param a11yConfig 可访问性配置
 * @returns 可访问性增强组件
 */
export function withAccessibility<T extends React.ComponentType<any>>(
  Component: T,
  a11yConfig: {
    role?: string
    ariaLabel?: string
    keyboardNavigation?: boolean
    focusManagement?: boolean
  }
) {
  return React.forwardRef<
    React.ElementRef<T>,
    React.ComponentProps<T>
  >((props, ref) => {
    const enhancedProps = {
      ...props,
      role: a11yConfig.role,
      'aria-label': a11yConfig.ariaLabel,
    }
    
    // 键盘导航支持
    const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
      if (a11yConfig.keyboardNavigation) {
        // 实现键盘导航逻辑
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          // 触发点击事件
          if (props.onClick) {
            props.onClick(e as any)
          }
        }
      }
      
      if (props.onKeyDown) {
        props.onKeyDown(e)
      }
    }, [props.onClick, props.onKeyDown])
    
    return (
      <Component
        ref={ref}
        {...enhancedProps}
        onKeyDown={handleKeyDown}
      />
    )
  })
}