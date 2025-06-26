// @ts-nocheck
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Activity,
  Wifi,
  WifiOff,
  Clock,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  RefreshCw,
} from "lucide-react"
import { enhancedFastGPTClient } from "@/lib/api/enhanced-fastgpt-client"
import { contextMemoryManager } from "@/lib/chat/context-memory-manager"
import { errorRetryManager } from "@/lib/chat/error-retry-manager"

interface SystemStatus {
  connection: {
    isConnected: boolean
    latency: number
    lastPing: Date | null
    errorCount: number
  }
  memory: {
    activeSessions: number
    totalMessages: number
    averageImportance: number
  }
  performance: {
    averageResponseTime: number
    successRate: number
    totalRequests: number
  }
  errors: {
    recentErrors: Array<{
      message: string
      timestamp: Date
      operation: string
    }>
    errorRate: number
  }
}

export function ChatSystemMonitor({
  isVisible = false,
  onClose,
}: {
  isVisible?: boolean
  onClose?: () => void
}) {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    connection: {
      isConnected: false,
      latency: 0,
      lastPing: null,
      errorCount: 0,
    },
    memory: {
      activeSessions: 0,
      totalMessages: 0,
      averageImportance: 0,
    },
    performance: {
      averageResponseTime: 0,
      successRate: 0,
      totalRequests: 0,
    },
    errors: {
      recentErrors: [],
      errorRate: 0,
    },
  })

  const [isRefreshing, setIsRefreshing] = useState(false)

  // 更新系统状态
  const updateSystemStatus = async () => {
    setIsRefreshing(true)

    try {
      // 获取连接状态
      const connectionStatus = await new Promise((resolve) => {
        const subscription = enhancedFastGPTClient.getConnectionStatus().subscribe((status) => {
          resolve(status)
          subscription.unsubscribe()
        })
      })

      // 获取活跃会话
      const activeSessions = enhancedFastGPTClient.getActiveSessions()

      // 计算记忆统计
      let totalMessages = 0
      let totalImportance = 0
      let sessionCount = 0

      activeSessions.forEach((sessionId) => {
        const stats = contextMemoryManager.getMemoryStats(sessionId)
        totalMessages += stats.totalMessages
        totalImportance += stats.averageImportance
        sessionCount++
      })

      const averageImportance = sessionCount > 0 ? totalImportance / sessionCount : 0

      // 获取重试统计
      const retryReport = errorRetryManager.exportRetryReport()

      // 模拟性能数据（实际项目中应该从真实监控系统获取）
      const performanceData = {
        averageResponseTime: 1200 + Math.random() * 800,
        successRate: 0.95 + Math.random() * 0.05,
        totalRequests: retryReport.summary.totalAttempts,
      }

      // 获取最近错误
      const recentErrors = Array.from(errorRetryManager.getAllStats().entries())
        .filter(([_, stats]) => stats.lastError)
        .map(([operation, stats]) => ({
          message: stats.lastError!.message,
          timestamp: new Date(),
          operation,
        }))
        .slice(0, 5)

      setSystemStatus({
        connection: connectionStatus as any,
        memory: {
          activeSessions: activeSessions.length,
          totalMessages,
          averageImportance,
        },
        performance: performanceData,
        errors: {
          recentErrors,
          errorRate: 1 - retryReport.summary.overallSuccessRate,
        },
      })
    } catch (error) {
      console.error("Failed to update system status:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // 定期更新状态
  useEffect(() => {
    if (isVisible) {
      updateSystemStatus()
      const interval = setInterval(updateSystemStatus, 5000)
      return () => clearInterval(interval)
    }
  }, [isVisible])

  if (!isVisible) {return null}

  const getStatusColor = (isHealthy: boolean) =>
    isHealthy ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"

  const getStatusIcon = (isHealthy: boolean) =>
    isHealthy ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6" />
              对话系统监控
            </h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={updateSystemStatus} disabled={isRefreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                刷新
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                关闭
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 连接状态 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {systemStatus.connection.isConnected ? (
                    <Wifi className="h-4 w-4 text-green-600" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-600" />
                  )}
                  连接状态
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">状态</span>
                    <Badge variant={systemStatus.connection.isConnected ? "default" : "destructive"}>
                      {systemStatus.connection.isConnected ? "已连接" : "断开"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">延迟</span>
                    <span className="text-sm font-medium">{systemStatus.connection.latency}ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">错误次数</span>
                    <span className="text-sm font-medium">{systemStatus.connection.errorCount}</span>
                  </div>
                  {systemStatus.connection.lastPing && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">最后检查</span>
                      <span className="text-sm font-medium">
                        {systemStatus.connection.lastPing.toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 记忆管理 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  记忆管理
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">活跃会话</span>
                    <span className="text-sm font-medium">{systemStatus.memory.activeSessions}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">总消息数</span>
                    <span className="text-sm font-medium">{systemStatus.memory.totalMessages}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">平均重要性</span>
                    <span className="text-sm font-medium">
                      {(systemStatus.memory.averageImportance * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span>记忆利用率</span>
                      <span>{(systemStatus.memory.averageImportance * 100).toFixed(0)}%</span>
                    </div>
                    <Progress value={systemStatus.memory.averageImportance * 100} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 性能指标 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  性能指标
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">平均响应时间</span>
                    <span className="text-sm font-medium">
                      {systemStatus.performance.averageResponseTime.toFixed(0)}ms
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">成功率</span>
                    <span className="text-sm font-medium">
                      {(systemStatus.performance.successRate * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">总请求数</span>
                    <span className="text-sm font-medium">{systemStatus.performance.totalRequests}</span>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span>系统健康度</span>
                      <span>{(systemStatus.performance.successRate * 100).toFixed(0)}%</span>
                    </div>
                    <Progress value={systemStatus.performance.successRate * 100} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 错误日志 */}
          <Card className="mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                最近错误
                {systemStatus.errors.recentErrors.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {systemStatus.errors.recentErrors.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {systemStatus.errors.recentErrors.length === 0 ? (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p>暂无错误记录</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {systemStatus.errors.recentErrors.map((error, index) => (
                    <div
                      key={index}
                      className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-red-800 dark:text-red-200">{error.operation}</p>
                          <p className="text-sm text-red-600 dark:text-red-300 mt-1">{error.message}</p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-red-500">
                          <Clock className="h-3 w-3" />
                          {error.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {systemStatus.errors.errorRate > 0 && (
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      错误率: {(systemStatus.errors.errorRate * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 系统建议 */}
          <Card className="mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">系统建议</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {!systemStatus.connection.isConnected && (
                  <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                    <XCircle className="h-4 w-4" />
                    检查网络连接和API配置
                  </div>
                )}

                {systemStatus.connection.latency > 2000 && (
                  <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                    <AlertTriangle className="h-4 w-4" />
                    网络延迟较高，建议检查网络状况
                  </div>
                )}

                {systemStatus.performance.successRate < 0.9 && (
                  <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                    <AlertTriangle className="h-4 w-4" />
                    成功率偏低，建议检查API服务状态
                  </div>
                )}

                {systemStatus.memory.activeSessions > 10 && (
                  <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                    <Activity className="h-4 w-4" />
                    活跃会话较多，建议定期清理过期会话
                  </div>
                )}

                {systemStatus.connection.isConnected &&
                  systemStatus.performance.successRate >= 0.9 &&
                  systemStatus.connection.latency <= 2000 && (
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                      <CheckCircle className="h-4 w-4" />
                      系统运行正常
                    </div>
                  )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
