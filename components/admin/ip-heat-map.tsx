// @ts-nocheck
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin, Users, TrendingUp, RefreshCw, Globe } from "lucide-react"
import { motion } from "framer-motion"

interface IPLocation {
  province: string
  city: string
  count: number
  percentage: number
  coordinates: [number, number]
  trend: "up" | "down" | "stable"
}

interface IPStats {
  totalIPs: number
  uniqueIPs: number
  topLocations: IPLocation[]
  lastUpdate: string
}

export function IPHeatMap() {
  const [ipStats, setIPStats] = useState<IPStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('24h')
  const [selectedProvince, setSelectedProvince] = useState<string>('all')

  const fetchIPStats = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/admin/ip-stats?range=${timeRange}&province=${selectedProvince}`)
      if (response.ok) {
        const data = await response.json()
        setIPStats(data)
      }
    } catch (error) {
      console.error('获取IP统计失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchIPStats()
  }, [timeRange, selectedProvince])

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-3 h-3 text-green-600" />
      case 'down':
        return <TrendingUp className="w-3 h-3 text-red-600 rotate-180" />
      default:
        return <div className="w-3 h-3 bg-gray-400 rounded-full" />
    }
  }

  const getHeatColor = (percentage: number) => {
    if (percentage > 20) {return 'bg-red-500'}
    if (percentage > 10) {return 'bg-orange-500'}
    if (percentage > 5) {return 'bg-yellow-500'}
    if (percentage > 1) {return 'bg-green-500'}
    return 'bg-blue-500'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-[#6cb33f]" />
                全国IP热点地图
              </CardTitle>
              <CardDescription>
                实时用户地理分布统计和热点分析
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">最近1小时</SelectItem>
                  <SelectItem value="24h">最近24小时</SelectItem>
                  <SelectItem value="7d">最近7天</SelectItem>
                  <SelectItem value="30d">最近30天</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={fetchIPStats}
                disabled={isLoading}
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                刷新
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-6 w-6 animate-spin text-[#6cb33f]" />
                <span>加载IP统计数据...</span>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 统计概览 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">总访问IP</span>
                    </div>
                    <div className="text-2xl font-bold mt-1">
                      {ipStats?.totalIPs?.toLocaleString() || 0}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">独立IP</span>
                    </div>
                    <div className="text-2xl font-bold mt-1">
                      {ipStats?.uniqueIPs?.toLocaleString() || 0}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium">覆盖地区</span>
                    </div>
                    <div className="text-2xl font-bold mt-1">
                      {ipStats?.topLocations?.length || 0}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 地区排行榜 */}
              <div>
                <h3 className="text-lg font-semibold mb-4">热点地区排行</h3>
                <div className="space-y-2">
                  {ipStats?.topLocations?.slice(0, 10).map((location, index) => (
                    <motion.div
                      key={`${location.province}-${location.city}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-[#6cb33f] text-white rounded-full text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">
                            {location.province} {location.city}
                          </div>
                          <div className="text-sm text-gray-500">
                            {location.count.toLocaleString()} 次访问
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="font-medium">
                            {location.percentage.toFixed(1)}%
                          </div>
                          <div className="flex items-center gap-1">
                            {getTrendIcon(location.trend)}
                            <span className="text-xs text-gray-500">
                              {location.trend === 'up' ? '上升' : location.trend === 'down' ? '下降' : '稳定'}
                            </span>
                          </div>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${getHeatColor(location.percentage)}`} />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* 中国地图可视化区域 */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                <div className="text-center">
                  <MapPin className="h-12 w-12 text-[#6cb33f] mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">中国地图热力图</h3>
                  <p className="text-gray-500 mb-4">
                    地图可视化功能正在开发中，将支持实时热力图展示
                  </p>
                  <div className="flex justify-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full" />
                      <span>高热度 (&gt;20%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full" />
                      <span>中高热度 (&gt;10-20%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                      <span>中等热度 (&gt;5-10%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full" />
                      <span>低热度 (1-5%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full" />
                      <span>极低热度 (&lt;1%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 更新时间 */}
              <div className="text-center text-sm text-gray-500">
                最后更新: {ipStats?.lastUpdate ? new Date(ipStats.lastUpdate).toLocaleString() : '未知'}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
