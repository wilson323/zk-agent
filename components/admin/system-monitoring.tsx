// @ts-nocheck
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Activity,
  Server,
  Database,
  Users,
  MessageSquare,
  FileImage,
  Cpu,
  MemoryStick,
  HardDrive,
  RefreshCw,
  TrendingUp,
} from "lucide-react"
import { motion } from "framer-motion"

interface SystemMetrics {
  cpu: {
    usage: number
    cores: number
    temperature?: number
  }
  memory: {
    used: number
    total: number
    percentage: number
  }
  disk: {
    used: number
    total: number
    percentage: number
  }
  network: {
    inbound: number
    outbound: number
  }
  database: {
    connections: number
    maxConnections: number
    queryTime: number
  }
  agents: {
    conversation: { active: number; total: number }
    cadAnalyzer: { active: number; total: number }
    posterGenerator: { active: number; total: number }
  }
  users: {
    online: number
    total: number
    newToday: number
  }
}

export function SystemMonitoring() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const fetchMetrics = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/admin/metrics")
      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error("获取系统指标失败:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    // 每30秒自动刷新
    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (percentage: number) => {
    if (percentage < 50) {return "text-green-600"}
    if (percentage < 80) {return "text-yellow-600"}
    return "text-red-600"
  }

  const getStatusBadge = (percentage: number) => {
    if (percentage < 50)
      {return (
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          正常
        </Badge>
      )}
    if (percentage < 80)
      {return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          警告
        </Badge>
      )}
    return <Badge variant="destructive">危险</Badge>
  }

  if (isLoading && !metrics) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-6 w-6 animate-spin text-[#6cb33f]" />
            <span>加载系统监控数据...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-green-700 dark:text-green-400">系统监控</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">最后更新: {lastUpdate.toLocaleString()}</p>
        </div>
        <Button
          onClick={fetchMetrics}
          disabled={isLoading}
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </div>

      <Tabs defaultValue="system" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="system">系统资源</TabsTrigger>
          <TabsTrigger value="agents">智能体状态</TabsTrigger>
          <TabsTrigger value="users">用户统计</TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* CPU 监控 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CPU 使用率</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">{metrics?.cpu.usage || 0}%</div>
                <Progress value={metrics?.cpu.usage || 0} className="mb-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{metrics?.cpu.cores || 0} 核心</span>
                  {getStatusBadge(metrics?.cpu.usage || 0)}
                </div>
              </CardContent>
            </Card>

            {/* 内存监控 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">内存使用</CardTitle>
                <MemoryStick className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">{metrics?.memory.percentage || 0}%</div>
                <Progress value={metrics?.memory.percentage || 0} className="mb-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {((metrics?.memory.used || 0) / 1024 / 1024 / 1024).toFixed(1)}GB /{" "}
                    {((metrics?.memory.total || 0) / 1024 / 1024 / 1024).toFixed(1)}GB
                  </span>
                  {getStatusBadge(metrics?.memory.percentage || 0)}
                </div>
              </CardContent>
            </Card>

            {/* 磁盘监控 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">磁盘使用</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">{metrics?.disk.percentage || 0}%</div>
                <Progress value={metrics?.disk.percentage || 0} className="mb-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {((metrics?.disk.used || 0) / 1024 / 1024 / 1024).toFixed(1)}GB /{" "}
                    {((metrics?.disk.total || 0) / 1024 / 1024 / 1024).toFixed(1)}GB
                  </span>
                  {getStatusBadge(metrics?.disk.percentage || 0)}
                </div>
              </CardContent>
            </Card>

            {/* 数据库监控 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">数据库连接</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">{metrics?.database.connections || 0}</div>
                <Progress
                  value={((metrics?.database.connections || 0) / (metrics?.database.maxConnections || 100)) * 100}
                  className="mb-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>最大: {metrics?.database.maxConnections || 0}</span>
                  <span>查询时间: {metrics?.database.queryTime || 0}ms</span>
                </div>
              </CardContent>
            </Card>

            {/* 网络监控 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">网络流量</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>入站:</span>
                    <span className="font-mono">{((metrics?.network.inbound || 0) / 1024 / 1024).toFixed(2)} MB/s</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>出站:</span>
                    <span className="font-mono">
                      {((metrics?.network.outbound || 0) / 1024 / 1024).toFixed(2)} MB/s
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 系统状态 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">系统状态</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">服务运行正常</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">数据库连接正常</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">API 服务正常</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 对话智能体 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">对话智能体</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">{metrics?.agents.conversation.active || 0}</div>
                <p className="text-xs text-muted-foreground">
                  活跃 / 总计: {metrics?.agents.conversation.active || 0} / {metrics?.agents.conversation.total || 0}
                </p>
                <div className="mt-2">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    对话中
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* CAD解析智能体 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CAD解析智能体</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">{metrics?.agents.cadAnalyzer.active || 0}</div>
                <p className="text-xs text-muted-foreground">
                  活跃 / 总计: {metrics?.agents.cadAnalyzer.active || 0} / {metrics?.agents.cadAnalyzer.total || 0}
                </p>
                <div className="mt-2">
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                    解析中
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* 海报生成智能体 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">海报生成智能体</CardTitle>
                <FileImage className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">{metrics?.agents.posterGenerator.active || 0}</div>
                <p className="text-xs text-muted-foreground">
                  活跃 / 总计: {metrics?.agents.posterGenerator.active || 0} /{" "}
                  {metrics?.agents.posterGenerator.total || 0}
                </p>
                <div className="mt-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    生成中
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 在线用户 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">在线用户</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">{metrics?.users.online || 0}</div>
                <p className="text-xs text-muted-foreground">当前在线用户数</p>
                <div className="mt-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    活跃
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* 总用户数 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">总用户数</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">{metrics?.users.total || 0}</div>
                <p className="text-xs text-muted-foreground">注册用户总数</p>
              </CardContent>
            </Card>

            {/* 今日新增 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">今日新增</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">{metrics?.users.newToday || 0}</div>
                <p className="text-xs text-muted-foreground">今日新注册用户</p>
                <div className="mt-2">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    新用户
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
