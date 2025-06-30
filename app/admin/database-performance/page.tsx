/**
 * @file 数据库性能监控页面
 * @description 管理员数据库性能监控和优化管理界面
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  Activity, 
  Database, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Settings,
  Zap
} from 'lucide-react'
import { useDatabaseInitialization } from '@/components/database/database-initializer'

/**
 * 数据库性能状态接口
 */
interface DatabasePerformanceState {
  overview: {
    monitoring: {
      enabled: boolean
      status: 'active' | 'inactive' | 'error'
      uptime: number
    }
    optimization: {
      enabled: boolean
      componentsActive: number
      totalComponents: number
      lastOptimization: string | null
    }
    health: {
      score: number
      status: 'excellent' | 'good' | 'fair' | 'poor'
      issues: string[]
    }
  }
  metrics: {
    connectionPool: {
      active: number
      idle: number
      total: number
      utilization: number
    }
    performance: {
      avgQueryTime: number
      slowQueries: number
      totalQueries: number
      cacheHitRate: number
    }
    resources: {
      cpuUsage: number
      memoryUsage: number
      diskUsage: number
    }
  }
  recommendations: Array<{
    type: 'performance' | 'security' | 'maintenance'
    priority: 'high' | 'medium' | 'low'
    title: string
    description: string
    action?: string
  }>
}

/**
 * 数据库性能监控页面组件
 */
export default function DatabasePerformancePage() {
  const { isInitialized } = useDatabaseInitialization()
  const [performanceData, setPerformanceData] = useState<DatabasePerformanceState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  /**
   * 获取数据库性能数据
   */
  const fetchPerformanceData = async () => {
    try {
      setRefreshing(true)
      setError(null)

      // 模拟API调用 - 在实际应用中，这里应该调用真实的API
      const response = await fetch('/api/admin/database/performance')
      if (!response.ok) {
        throw new Error('获取性能数据失败')
      }

      const data = await response.json()
      setPerformanceData(data)
    } catch (err) {
      console.error('获取数据库性能数据失败:', err)
      setError(err instanceof Error ? err.message : '未知错误')
      
      // 设置模拟数据用于演示
      setPerformanceData({
        overview: {
          monitoring: {
            enabled: true,
            status: 'active',
            uptime: 86400000 // 24小时
          },
          optimization: {
            enabled: true,
            componentsActive: 4,
            totalComponents: 5,
            lastOptimization: new Date(Date.now() - 3600000).toISOString()
          },
          health: {
            score: 85,
            status: 'good',
            issues: ['连接池利用率较高', '存在慢查询']
          }
        },
        metrics: {
          connectionPool: {
            active: 8,
            idle: 2,
            total: 10,
            utilization: 80
          },
          performance: {
            avgQueryTime: 45,
            slowQueries: 3,
            totalQueries: 1250,
            cacheHitRate: 92
          },
          resources: {
            cpuUsage: 35,
            memoryUsage: 68,
            diskUsage: 45
          }
        },
        recommendations: [
          {
            type: 'performance',
            priority: 'high',
            title: '优化慢查询',
            description: '检测到3个慢查询，建议添加索引或优化查询语句',
            action: '查看详情'
          },
          {
            type: 'maintenance',
            priority: 'medium',
            title: '连接池调优',
            description: '连接池利用率较高，建议增加连接数或优化连接管理',
            action: '调整配置'
          }
        ]
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  /**
   * 触发数据库优化
   */
  const triggerOptimization = async () => {
    try {
      setRefreshing(true)
      
      const response = await fetch('/api/admin/database/optimize', {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('优化触发失败')
      }
      
      // 刷新数据
      await fetchPerformanceData()
    } catch (err) {
      console.error('触发优化失败:', err)
      setError(err instanceof Error ? err.message : '优化失败')
    }
  }

  // 初始化数据获取
  useEffect(() => {
    if (isInitialized) {
      fetchPerformanceData()
    }
  }, [isInitialized])

  // 定期刷新数据
  useEffect(() => {
    if (!isInitialized) return

    const interval = setInterval(() => {
      if (!refreshing) {
        fetchPerformanceData()
      }
    }, 30000) // 30秒刷新一次

    return () => clearInterval(interval)
  }, [isInitialized, refreshing])

  /**
   * 获取状态颜色
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600'
      case 'good': return 'text-blue-600'
      case 'fair': return 'text-yellow-600'
      case 'poor': return 'text-red-600'
      case 'active': return 'text-green-600'
      case 'inactive': return 'text-gray-600'
      case 'error': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  /**
   * 获取优先级颜色
   */
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'default'
    }
  }

  if (!isInitialized) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
            <h3 className="text-lg font-semibold mb-2">正在初始化数据库系统</h3>
            <p className="text-gray-600">请稍候，系统正在启动数据库性能监控...</p>
          </div>
        </div>
      </div>
    )
  }

  if (loading && !performanceData) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Database className="h-8 w-8 animate-pulse mx-auto mb-4 text-blue-500" />
            <h3 className="text-lg font-semibold mb-2">加载性能数据</h3>
            <p className="text-gray-600">正在获取数据库性能信息...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">数据库性能监控</h1>
          <p className="text-gray-600 mt-2">实时监控数据库性能指标和优化状态</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPerformanceData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button
            size="sm"
            onClick={triggerOptimization}
            disabled={refreshing}
          >
            <Zap className="h-4 w-4 mr-2" />
            触发优化
          </Button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>错误</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {performanceData && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="metrics">性能指标</TabsTrigger>
            <TabsTrigger value="recommendations">优化建议</TabsTrigger>
          </TabsList>

          {/* 概览标签页 */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 监控状态 */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">监控状态</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    {performanceData.overview.monitoring.status === 'active' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className={`font-semibold ${getStatusColor(performanceData.overview.monitoring.status)}`}>
                      {performanceData.overview.monitoring.enabled ? '已启用' : '已禁用'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    运行时间: {Math.floor(performanceData.overview.monitoring.uptime / 3600000)}小时
                  </p>
                </CardContent>
              </Card>

              {/* 优化状态 */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">优化组件</CardTitle>
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {performanceData.overview.optimization.componentsActive}/{performanceData.overview.optimization.totalComponents}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {performanceData.overview.optimization.lastOptimization 
                      ? `上次优化: ${new Date(performanceData.overview.optimization.lastOptimization).toLocaleString()}`
                      : '尚未执行优化'
                    }
                  </p>
                </CardContent>
              </Card>

              {/* 健康评分 */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">健康评分</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{performanceData.overview.health.score}/100</div>
                  <Progress value={performanceData.overview.health.score} className="mt-2" />
                  <Badge 
                    variant={performanceData.overview.health.status === 'excellent' ? 'default' : 'secondary'}
                    className="mt-2"
                  >
                    {performanceData.overview.health.status}
                  </Badge>
                </CardContent>
              </Card>
            </div>

            {/* 健康问题 */}
            {performanceData.overview.health.issues.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
                    检测到的问题
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {performanceData.overview.health.issues.map((issue, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 性能指标标签页 */}
          <TabsContent value="metrics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 连接池状态 */}
              <Card>
                <CardHeader>
                  <CardTitle>连接池状态</CardTitle>
                  <CardDescription>数据库连接池使用情况</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">活跃连接</span>
                    <span className="font-semibold">{performanceData.metrics.connectionPool.active}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">空闲连接</span>
                    <span className="font-semibold">{performanceData.metrics.connectionPool.idle}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">总连接数</span>
                    <span className="font-semibold">{performanceData.metrics.connectionPool.total}</span>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm">利用率</span>
                      <span className="font-semibold">{performanceData.metrics.connectionPool.utilization}%</span>
                    </div>
                    <Progress value={performanceData.metrics.connectionPool.utilization} />
                  </div>
                </CardContent>
              </Card>

              {/* 查询性能 */}
              <Card>
                <CardHeader>
                  <CardTitle>查询性能</CardTitle>
                  <CardDescription>数据库查询执行统计</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">平均查询时间</span>
                    <span className="font-semibold">{performanceData.metrics.performance.avgQueryTime}ms</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">慢查询数量</span>
                    <span className="font-semibold text-red-600">{performanceData.metrics.performance.slowQueries}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">总查询数</span>
                    <span className="font-semibold">{performanceData.metrics.performance.totalQueries}</span>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm">缓存命中率</span>
                      <span className="font-semibold">{performanceData.metrics.performance.cacheHitRate}%</span>
                    </div>
                    <Progress value={performanceData.metrics.performance.cacheHitRate} />
                  </div>
                </CardContent>
              </Card>

              {/* 资源使用 */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>资源使用情况</CardTitle>
                  <CardDescription>系统资源占用统计</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm">CPU使用率</span>
                        <span className="font-semibold">{performanceData.metrics.resources.cpuUsage}%</span>
                      </div>
                      <Progress value={performanceData.metrics.resources.cpuUsage} />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm">内存使用率</span>
                        <span className="font-semibold">{performanceData.metrics.resources.memoryUsage}%</span>
                      </div>
                      <Progress value={performanceData.metrics.resources.memoryUsage} />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm">磁盘使用率</span>
                        <span className="font-semibold">{performanceData.metrics.resources.diskUsage}%</span>
                      </div>
                      <Progress value={performanceData.metrics.resources.diskUsage} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 优化建议标签页 */}
          <TabsContent value="recommendations" className="space-y-6">
            <div className="space-y-4">
              {performanceData.recommendations.map((recommendation, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{recommendation.title}</CardTitle>
                      <Badge variant={getPriorityColor(recommendation.priority)}>
                        {recommendation.priority === 'high' ? '高优先级' : 
                         recommendation.priority === 'medium' ? '中优先级' : '低优先级'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">{recommendation.description}</p>
                    {recommendation.action && (
                      <Button variant="outline" size="sm">
                        {recommendation.action}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
