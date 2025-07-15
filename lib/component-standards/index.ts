/**
 * 组件标准库入口文件
 * 统一导出所有组件标准化工具和模式
 * 
 * 基于以下标准和最佳实践:
 * - React 18+ 最佳实践
 * - WAI-ARIA 可访问性标准
 * - WCAG 2.1 AA 级别
 * - 现代 CSS 和设计系统
 * - TypeScript 严格模式
 * - 性能优化最佳实践
 */

// =============================================================================
// 核心模块导出
// =============================================================================

// 组件工厂模式
export * from './component-factory';
export { componentFactory } from './component-factory';

// 设计令牌系统
export * from './design-tokens';
export { designTokens } from './design-tokens';

// 组件模式库
export * from './component-patterns';
export { componentPatterns } from './component-patterns';

// 验证模式
export * from './validation-schemas';
export { validationSchemas } from './validation-schemas';

// 可访问性辅助工具
export * from './accessibility-helpers';
export { accessibilityHelpers } from './accessibility-helpers';

// 性能优化工具
export * from './performance-optimizers-types';
export { performanceOptimizers } from './performance-optimizers.tsx';

// =============================================================================
// 统一接口
// =============================================================================

import { componentFactory } from './component-factory';
import { designTokens } from './design-tokens';
import { componentPatterns } from './component-patterns';
import { validationSchemas } from './validation-schemas';
import { accessibilityHelpers } from './accessibility-helpers';
import { performanceOptimizers } from './performance-optimizers';

/**
 * 组件标准库统一接口
 * 提供一站式访问所有组件标准化工具
 */
export const componentStandards = {
  // 工厂模式
  factory: componentFactory,
  
  // 设计系统
  tokens: designTokens,
  
  // 组件模式
  patterns: componentPatterns,
  
  // 验证工具
  validation: validationSchemas,
  
  // 可访问性
  accessibility: accessibilityHelpers,
  
  // 性能优化
  performance: performanceOptimizers
} as const;

// =============================================================================
// 类型导出
// =============================================================================

export type {
  // 组件工厂类型
  ComponentVariantConfig,
  ComponentFactoryOptions,
  ResponsiveVariantConfig,
  ThemeAwareConfig,
  PerformanceConfig,
  AccessibilityConfig
} from './component-factory';

export type {
  // 设计令牌类型
  ColorTokens,
  SpacingTokens,
  TypographyTokens,
  BorderRadiusTokens,
  ShadowTokens,
  AnimationTokens,
  BreakpointTokens,
  ZIndexTokens,
  ComponentSizeTokens
} from './design-tokens';

export type {
  // 验证模式类型
  BaseVariantSchema,
  AccessibilityPropsSchema,
  CommonComponentProps,
  ButtonPropsSchema,
  InputPropsSchema,
  CardPropsSchema,
  DialogPropsSchema,
  TablePropsSchema
} from './validation-schemas';

export type {
  // 可访问性类型
  FocusOptions,
  KeyboardNavigationConfig,
  AnnouncementOptions,
  ContrastResult,
  AccessibilityHelpers
} from './accessibility-helpers';

export type {
  // 性能优化类型
  LazyLoadOptions,
  VirtualizationConfig,
  DebounceOptions,
  ThrottleOptions,
  MemoryMonitorConfig,
  PerformanceMetrics,
  PerformanceOptimizers
} from './performance-optimizers.tsx';

// =============================================================================
// 版本信息
// =============================================================================

export const COMPONENT_STANDARDS_VERSION = '1.0.0';

// =============================================================================
// 初始化函数
// =============================================================================

/**
 * 初始化组件标准库
 * 设置全局配置和默认值
 */
export function initializeComponentStandards(config?: {
  theme?: 'light' | 'dark' | 'auto';
  accessibility?: {
    enableValidation?: boolean;
    enableAnnouncements?: boolean;
  };
  performance?: {
    enableMonitoring?: boolean;
    enableOptimizations?: boolean;
  };
  development?: {
    enableWarnings?: boolean;
    enableMetrics?: boolean;
  };
}) {
  const defaultConfig = {
    theme: 'auto' as const,
    accessibility: {
      enableValidation: process.env.NODE_ENV === 'development',
      enableAnnouncements: true
    },
    performance: {
      enableMonitoring: process.env.NODE_ENV === 'development',
      enableOptimizations: true
    },
    development: {
      enableWarnings: process.env.NODE_ENV === 'development',
      enableMetrics: process.env.NODE_ENV === 'development'
    }
  };
  
  const finalConfig = {
    ...defaultConfig,
    ...config,
    accessibility: {
      ...defaultConfig.accessibility,
      ...config?.accessibility
    },
    performance: {
      ...defaultConfig.performance,
      ...config?.performance
    },
    development: {
      ...defaultConfig.development,
      ...config?.development
    }
  };
  
  // 设置全局配置
  if (typeof window !== 'undefined') {
    (window as any).__COMPONENT_STANDARDS_CONFIG__ = finalConfig;
  }
  
  // 开发环境提示
  if (finalConfig.development.enableWarnings) {

  }
  
  return finalConfig;
}

/**
 * 获取当前配置
 */
export function getComponentStandardsConfig() {
  if (typeof window !== 'undefined') {
    return (window as any).__COMPONENT_STANDARDS_CONFIG__ || null;
  }
  return null;
}

// =============================================================================
// 默认导出
// =============================================================================

export default componentStandards;