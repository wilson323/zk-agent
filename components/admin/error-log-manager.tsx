// @ts-nocheck
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertTriangle,
  AlertCircle,
  Info,
  XCircle,
  Search,
  RefreshCw,
  Download,
  Trash2,
  CheckCircle,
} from "lucide-react"
import { fetchErrorLogs, markErrorAsResolved, deleteErrorLog, exportErrorLogs } from "@/lib/admin/error-log-api"

interface ErrorLog {
  id: string
  level: "INFO" | "WARN" | "ERROR" | "FATAL"
  message: string
  stack?: string
  metadata?: any
  userId?: string
  resolved: boolean
  createdAt: string
}

interface ErrorStats {
  total: number
  byLevel: Record<string, number>
  resolved: number
  unresolved: number
  todayCount: number
}

export function ErrorLogManager() {
  const [logs, setLogs] = useState<ErrorLog[]>([])
  const [stats, setStats] = useState<ErrorStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [levelFilter, setLevelFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null)

  const fetchLogs = async () => {
    setIsLoading(true)
    const result = await fetchErrorLogs(searchTerm, levelFilter, statusFilter)
    if (result.success && result.data) {
      setLogs(result.data.logs)
      setStats(result.data.stats)
    } else {
      // Handle error, maybe show a toast
    }
    setIsLoading(false)
  }

  const markAsResolved = async (logId: string) => {
    const result = await markErrorAsResolved(logId)
    if (result.success) {
      setLogs(logs.map((log) => (log.id === logId ? { ...log, resolved: true } : log)))
    } else {
      // Handle error
    }
  }

  const deleteLog = async (logId: string) => {
    const result = await deleteErrorLog(logId)
    if (result.success) {
      setLogs(logs.filter((log) => log.id !== logId))
      setSelectedLog(null)
    } else {
      // Handle error
    }
  }

  const exportLogs = async () => {
    const result = await exportErrorLogs(searchTerm, levelFilter, statusFilter)
    if (result.success) {
      // Toast success message if needed
    } else {
      // Toast error message
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [searchTerm, levelFilter, statusFilter, fetchLogs])

  import { getLevelIcon, getLevelBadge } from "@/lib/admin/error-log-utils"

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-green-700 dark:text-green-400">错误日志管理</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">系统错误监控和日志管理</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportLogs} variant="outline" size="sm" className="flex items-center gap-1">
            <Download className="h-4 w-4" />
            导出
          </Button>
          <Button
            onClick={fetchLogs}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* 统计概览 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <StatCard
            title="总错误数"
            icon={AlertCircle}
            value={stats.total.toLocaleString()}
          />
          <StatCard
            title="未解决"
            icon={XCircle}
            value={stats.unresolved.toLocaleString()}
            badgeColorClass="text-red-600"
          />
          <StatCard
            title="已解决"
            icon={CheckCircle}
            value={stats.resolved.toLocaleString()}
            badgeColorClass="text-green-600"
          />
          <StatCard
            title="今日新增"
            icon={AlertTriangle}
            value={stats.todayCount.toLocaleString()}
          />
          <StatCard
            title="解决率"
            icon={Info}
            value={`${stats.total > 0 ? ((stats.resolved / stats.total) * 100).toFixed(1) : 0}%`}
          />
        </div>
      )}

      {/* 筛选和搜索 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索错误消息..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="错误级别" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有级别</SelectItem>
                <SelectItem value="INFO">信息</SelectItem>
                <SelectItem value="WARN">警告</SelectItem>
                <SelectItem value="ERROR">错误</SelectItem>
                <SelectItem value="FATAL">严重</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有状态</SelectItem>
                <SelectItem value="resolved">已解决</SelectItem>
                <SelectItem value="unresolved">未解决</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 错误日志列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 日志列表 */}
        <Card>
          <CardHeader>
            <CardTitle>错误日志列表</CardTitle>
            <CardDescription>点击日志条目查看详细信息</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-6 w-6 animate-spin text-[#6cb33f]" />
                  <span>加载错误日志...</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {logs.map((log) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedLog?.id === log.id
                        ? "border-[#6cb33f] bg-green-50 dark:bg-green-900/20"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedLog(log)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2 flex-1">
                        {getLevelIcon(log.level)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getLevelBadge(log.level)}
                            {log.resolved && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                已解决
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium truncate">{log.message}</p>
                          <p className="text-xs text-gray-500">{new Date(log.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {logs.length === 0 && <div className="text-center py-8 text-gray-500">没有找到错误日志</div>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 日志详情 */}
        <Card>
          <CardHeader>
            <CardTitle>错误详情</CardTitle>
            <CardDescription>选择左侧日志条目查看详细信息</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedLog ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getLevelIcon(selectedLog.level)}
                    {getLevelBadge(selectedLog.level)}
                    {selectedLog.resolved && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        已解决
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!selectedLog.resolved && (
                      <Button
                        onClick={() => markAsResolved(selectedLog.id)}
                        size="sm"
                        className="bg-[#6cb33f] hover:bg-green-600"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        标记已解决
                      </Button>
                    )}
                    <Button onClick={() => deleteLog(selectedLog.id)} size="sm" variant="destructive">
                      <Trash2 className="h-4 w-4 mr-1" />
                      删除
                    </Button>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">错误消息</h4>
                  <p className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded">{selectedLog.message}</p>
                </div>

                {selectedLog.stack && (
                  <div>
                    <h4 className="font-medium mb-2">堆栈跟踪</h4>
                    <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-3 rounded overflow-x-auto">
                      {selectedLog.stack}
                    </pre>
                  </div>
                )}

                {selectedLog.metadata && (
                  <div>
                    <h4 className="font-medium mb-2">元数据</h4>
                    <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-3 rounded overflow-x-auto">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">用户ID:</span>
                    <span className="ml-2">{selectedLog.userId || "未知"}</span>
                  </div>
                  <div>
                    <span className="font-medium">创建时间:</span>
                    <span className="ml-2">{new Date(selectedLog.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">请选择一个错误日志查看详情</div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}
