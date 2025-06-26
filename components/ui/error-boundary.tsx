// @ts-nocheck
/**
 * @file Error Boundary Component
 * @description React错误边界组件，提供优雅的错误处理和用户体验
 * @author ZK-Agent Team A
 * @date 2024-12-19
 */

"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // 调用自定义错误处理函数
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // 错误上报
    this.reportError(error, errorInfo)
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // 发送错误信息到监控服务
    if (typeof window !== 'undefined') {
      // Google Analytics 错误跟踪
      if (window.gtag) {
        window.gtag('event', 'exception', {
          description: error.message,
          fatal: false
        })
      }

      // 自定义错误上报
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      }

      // 发送到错误监控服务
      fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorData)
      }).catch(err => {
        console.error('Failed to report error:', err)
      })
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  private handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }

  private handleReportBug = () => {
    const { error, errorInfo } = this.state
    const bugReport = {
      error: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack
    }
    
    const mailtoLink = `mailto:support@zk-agent.com?subject=Bug Report&body=${encodeURIComponent(
      `Bug Report:\n\nError: ${bugReport.error}\n\nStack: ${bugReport.stack}\n\nComponent Stack: ${bugReport.componentStack}`
    )}`
    
    if (typeof window !== 'undefined') {
      window.open(mailtoLink)
    }
  }

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback
      }

      // 默认错误UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                出现了一些问题
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                抱歉，页面遇到了意外错误。我们已经记录了这个问题，正在努力修复。
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* 错误详情（仅在开发环境显示） */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                    错误详情 (开发模式)
                  </h4>
                  <p className="text-xs text-red-700 dark:text-red-300 font-mono break-all">
                    {this.state.error.message}
                  </p>
                  {this.state.error.stack && (
                    <details className="mt-2">
                      <summary className="text-xs text-red-600 dark:text-red-400 cursor-pointer">
                        查看堆栈跟踪
                      </summary>
                      <pre className="text-xs text-red-700 dark:text-red-300 mt-2 whitespace-pre-wrap">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              )}
              
              {/* 操作按钮 */}
              <div className="flex flex-col space-y-2">
                <Button onClick={this.handleRetry} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  重试
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={this.handleGoHome} 
                  className="w-full"
                >
                  <Home className="h-4 w-4 mr-2" />
                  返回首页
                </Button>
                
                <Button 
                  variant="ghost" 
                  onClick={this.handleReportBug} 
                  className="w-full text-sm"
                >
                  <Bug className="h-4 w-4 mr-2" />
                  报告问题
                </Button>
              </div>
              
              {/* 帮助信息 */}
              <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  如果问题持续存在，请联系我们的技术支持团队
                </p>
                <a 
                  href="mailto:support@zk-agent.com"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  support@zk-agent.com
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

// 高阶组件版本
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Hook版本（用于函数组件）
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    // 手动触发错误边界
    throw error
  }
} 