/**
 * @file Component Patterns
 * @description 组件模式库，定义常用的组件组合、布局模式和交互模式
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { designTokens } from './design-tokens'

// 通用模式接口
export interface PatternProps {
  className?: string
  children?: React.ReactNode
  'data-testid'?: string
}

// 加载状态模式
export interface LoadingPatternProps extends PatternProps {
  isLoading: boolean
  loadingText?: string
  skeleton?: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * 加载状态模式组件
 * 统一处理加载状态的显示
 */
export const LoadingPattern: React.FC<LoadingPatternProps> = ({
  isLoading,
  loadingText = '加载中...',
  skeleton,
  fallback,
  children,
  className,
  'data-testid': testId,
}) => {
  if (isLoading) {
    return (
      <div 
        className={cn('flex items-center justify-center p-4', className)}
        data-testid={testId}
      >
        {skeleton || fallback || (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
            <span className="text-sm text-muted-foreground">{loadingText}</span>
          </div>
        )}
      </div>
    )
  }
  
  return <>{children}</>
}

// 错误边界模式
export interface ErrorBoundaryPatternProps extends PatternProps {
  error?: Error | null
  onRetry?: () => void
  fallback?: React.ReactNode
}

/**
 * 错误边界模式组件
 * 统一处理错误状态的显示
 */
export const ErrorBoundaryPattern: React.FC<ErrorBoundaryPatternProps> = ({
  error,
  onRetry,
  fallback,
  children,
  className,
  'data-testid': testId,
}) => {
  if (error) {
    return (
      <div 
        className={cn(
          'flex flex-col items-center justify-center p-6 text-center',
          'border border-destructive/20 rounded-lg bg-destructive/5',
          className
        )}
        data-testid={testId}
      >
        {fallback || (
          <>
            <div className="text-destructive mb-2">⚠️ 出现错误</div>
            <p className="text-sm text-muted-foreground mb-4">
              {error.message || '未知错误'}
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                重试
              </button>
            )}
          </>
        )}
      </div>
    )
  }
  
  return <>{children}</>
}

// 空状态模式
export interface EmptyStatePatternProps extends PatternProps {
  isEmpty: boolean
  title?: string
  description?: string
  action?: React.ReactNode
  illustration?: React.ReactNode
}

/**
 * 空状态模式组件
 * 统一处理空状态的显示
 */
export const EmptyStatePattern: React.FC<EmptyStatePatternProps> = ({
  isEmpty,
  title = '暂无数据',
  description,
  action,
  illustration,
  children,
  className,
  'data-testid': testId,
}) => {
  if (isEmpty) {
    return (
      <div 
        className={cn(
          'flex flex-col items-center justify-center p-8 text-center',
          className
        )}
        data-testid={testId}
      >
        {illustration || (
          <div className="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
            <span className="text-2xl text-muted-foreground">📭</span>
          </div>
        )}
        <h3 className="text-lg font-medium mb-2">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            {description}
          </p>
        )}
        {action}
      </div>
    )
  }
  
  return <>{children}</>
}

// 表单字段模式
export interface FormFieldPatternProps extends PatternProps {
  label: string
  error?: string
  required?: boolean
  description?: string
  children: React.ReactElement
}

/**
 * 表单字段模式组件
 * 统一表单字段的布局和样式
 */
export const FormFieldPattern: React.FC<FormFieldPatternProps> = ({
  label,
  error,
  required,
  description,
  children,
  className,
  'data-testid': testId,
}) => {
  const fieldId = React.useId()
  
  return (
    <div className={cn('space-y-2', className)} data-testid={testId}>
      <label 
        htmlFor={fieldId}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      
      {React.cloneElement(children, {
        id: fieldId,
        'aria-describedby': description ? `${fieldId}-description` : undefined,
        'aria-invalid': !!error,
      })}
      
      {description && (
        <p 
          id={`${fieldId}-description`}
          className="text-sm text-muted-foreground"
        >
          {description}
        </p>
      )}
      
      {error && (
        <p className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

// 卡片容器模式
export interface CardContainerPatternProps extends PatternProps {
  title?: string
  description?: string
  actions?: React.ReactNode
  footer?: React.ReactNode
  variant?: 'default' | 'outlined' | 'elevated'
}

/**
 * 卡片容器模式组件
 * 统一卡片布局和样式
 */
export const CardContainerPattern: React.FC<CardContainerPatternProps> = ({
  title,
  description,
  actions,
  footer,
  variant = 'default',
  children,
  className,
  'data-testid': testId,
}) => {
  const variantClasses = {
    default: 'bg-card border border-border',
    outlined: 'border-2 border-border bg-transparent',
    elevated: 'bg-card shadow-lg border-0',
  }
  
  return (
    <div 
      className={cn(
        'rounded-lg overflow-hidden',
        variantClasses[variant],
        className
      )}
      data-testid={testId}
    >
      {(title || description || actions) && (
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              {title && (
                <h3 className="text-lg font-semibold leading-none tracking-tight">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-sm text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex items-center space-x-2">
                {actions}
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="p-6 pt-0">
        {children}
      </div>
      
      {footer && (
        <div className="p-6 pt-0 border-t border-border">
          {footer}
        </div>
      )}
    </div>
  )
}

// 列表项模式
export interface ListItemPatternProps extends PatternProps {
  avatar?: React.ReactNode
  title: string
  subtitle?: string
  description?: string
  actions?: React.ReactNode
  onClick?: () => void
  selected?: boolean
}

/**
 * 列表项模式组件
 * 统一列表项的布局和交互
 */
export const ListItemPattern: React.FC<ListItemPatternProps> = ({
  avatar,
  title,
  subtitle,
  description,
  actions,
  onClick,
  selected,
  className,
  'data-testid': testId,
}) => {
  return (
    <div 
      className={cn(
        'flex items-center space-x-4 p-4 rounded-lg transition-colors',
        onClick && 'cursor-pointer hover:bg-accent',
        selected && 'bg-accent',
        className
      )}
      onClick={onClick}
      data-testid={testId}
    >
      {avatar && (
        <div className="flex-shrink-0">
          {avatar}
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium truncate">{title}</h4>
          {subtitle && (
            <span className="text-xs text-muted-foreground ml-2">
              {subtitle}
            </span>
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground truncate mt-1">
            {description}
          </p>
        )}
      </div>
      
      {actions && (
        <div className="flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
}

// 搜索模式
export interface SearchPatternProps extends PatternProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onSearch?: (value: string) => void
  suggestions?: string[]
  loading?: boolean
}

/**
 * 搜索模式组件
 * 统一搜索功能的实现
 */
export const SearchPattern: React.FC<SearchPatternProps> = ({
  value,
  onChange,
  placeholder = '搜索...',
  onSearch,
  suggestions = [],
  loading,
  className,
  'data-testid': testId,
}) => {
  const [showSuggestions, setShowSuggestions] = React.useState(false)
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch?.(value)
    setShowSuggestions(false)
  }
  
  return (
    <div className={cn('relative', className)} data-testid={testId}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <input
            type="text"
            value={value}
            onChange={(e) => {
              onChange(e.target.value)
              setShowSuggestions(true)
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={placeholder}
            className="w-full px-4 py-2 pr-10 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
            ) : (
              <span>🔍</span>
            )}
          </button>
        </div>
      </form>
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              className="w-full px-4 py-2 text-left hover:bg-accent transition-colors"
              onClick={() => {
                onChange(suggestion)
                onSearch?.(suggestion)
                setShowSuggestions(false)
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// 分页模式
export interface PaginationPatternProps extends PatternProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  showInfo?: boolean
  totalItems?: number
  itemsPerPage?: number
}

/**
 * 分页模式组件
 * 统一分页功能的实现
 */
export const PaginationPattern: React.FC<PaginationPatternProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  showInfo = true,
  totalItems,
  itemsPerPage,
  className,
  'data-testid': testId,
}) => {
  const getVisiblePages = () => {
    const delta = 2
    const range = []
    const rangeWithDots = []
    
    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i)
    }
    
    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...')
    } else {
      rangeWithDots.push(1)
    }
    
    rangeWithDots.push(...range)
    
    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages)
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages)
    }
    
    return rangeWithDots
  }
  
  return (
    <div 
      className={cn('flex items-center justify-between', className)}
      data-testid={testId}
    >
      {showInfo && totalItems && itemsPerPage && (
        <div className="text-sm text-muted-foreground">
          显示 {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} - {Math.min(currentPage * itemsPerPage, totalItems)} 项，共 {totalItems} 项
        </div>
      )}
      
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="px-3 py-1 border border-input rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent"
        >
          上一页
        </button>
        
        {getVisiblePages().map((page, index) => (
          <button
            key={index}
            onClick={() => typeof page === 'number' && onPageChange(page)}
            disabled={page === '...'}
            className={cn(
              'px-3 py-1 border border-input rounded-md',
              page === currentPage
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent',
              page === '...' && 'cursor-default'
            )}
          >
            {page}
          </button>
        ))}
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-3 py-1 border border-input rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent"
        >
          下一页
        </button>
      </div>
    </div>
  )
}

// 导出所有模式
export const componentPatterns = {
  LoadingPattern,
  ErrorBoundaryPattern,
  EmptyStatePattern,
  FormFieldPattern,
  CardContainerPattern,
  ListItemPattern,
  SearchPattern,
  PaginationPattern,
} as const