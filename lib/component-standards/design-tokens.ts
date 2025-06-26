/**
 * @file Design Tokens
 * @description 设计令牌系统，统一管理颜色、间距、字体、阴影等设计元素
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

// 颜色系统
export const colors = {
  // 主色调
  primary: {
    50: '#f0f9e8',
    100: '#d0f0c0',
    200: '#b0e698',
    300: '#90dc70',
    400: '#70d248',
    500: '#6cb33f', // 默认主色
    600: '#5a9933',
    700: '#487f27',
    800: '#36661b',
    900: '#244c0f',
  },
  // 语义化颜色
  semantic: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  // 中性色
  neutral: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
} as const

// 间距系统
export const spacing = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
  32: '128px',
} as const

// 字体系统
export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'Consolas', 'monospace'],
  },
  fontSize: {
    xs: ['12px', { lineHeight: '16px' }],
    sm: ['14px', { lineHeight: '20px' }],
    base: ['16px', { lineHeight: '24px' }],
    lg: ['18px', { lineHeight: '28px' }],
    xl: ['20px', { lineHeight: '28px' }],
    '2xl': ['24px', { lineHeight: '32px' }],
    '3xl': ['30px', { lineHeight: '36px' }],
    '4xl': ['36px', { lineHeight: '40px' }],
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const

// 圆角系统
export const borderRadius = {
  none: '0px',
  sm: '2px',
  base: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  '2xl': '16px',
  '3xl': '24px',
  full: '9999px',
} as const

// 阴影系统
export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
} as const

// 动画系统
export const animations = {
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
  },
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const

// 断点系统
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const

// Z-index 系统
export const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
} as const

// 组件尺寸系统
export const componentSizes = {
  button: {
    sm: { height: '32px', padding: '0 12px', fontSize: '14px' },
    md: { height: '40px', padding: '0 16px', fontSize: '16px' },
    lg: { height: '48px', padding: '0 24px', fontSize: '18px' },
  },
  input: {
    sm: { height: '32px', padding: '0 12px', fontSize: '14px' },
    md: { height: '40px', padding: '0 16px', fontSize: '16px' },
    lg: { height: '48px', padding: '0 20px', fontSize: '18px' },
  },
  avatar: {
    xs: '24px',
    sm: '32px',
    md: '40px',
    lg: '48px',
    xl: '64px',
    '2xl': '80px',
  },
} as const

// 导出所有设计令牌
export const designTokens = {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  animations,
  breakpoints,
  zIndex,
  componentSizes,
} as const

// 类型定义
export type ColorToken = keyof typeof colors.primary
export type SpacingToken = keyof typeof spacing
export type FontSizeToken = keyof typeof typography.fontSize
export type ShadowToken = keyof typeof shadows
export type ComponentSize = 'sm' | 'md' | 'lg'