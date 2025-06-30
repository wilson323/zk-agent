// @ts-nocheck
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ThumbsUp, ThumbsDown, RefreshCw } from "lucide-react"
import { useFastGPT } from "@/contexts/FastGPTContext"
import { fetchFeedback } from "@/lib/admin/feedback-api"

export function UserFeedback() {
  const { applications, isLoading } = useFastGPT()
  const [filter, setFilter] = useState<string>("all")
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false)
  const [feedback, setFeedback] = useState<any[]>([])

  // 模拟获取反馈数据
  const loadFeedback = async () => {
    setIsLoadingFeedback(true)
    try {
      const result = await fetchFeedback(applications)
      if (result.success && result.data) {
        setFeedback(result.data)
      } else {
        // Handle error, maybe show a toast
      }
    } catch (error) {
      // console.error("获取反馈数据失败:", error)
    } finally {
      setIsLoadingFeedback(false)
    }
  }

  useEffect(() => {
    if (applications.length > 0) {
      loadFeedback()
    }
  }, [applications, loadFeedback])

  const filteredFeedback = filter === "all" ? feedback : feedback.filter((item) => item.appId === filter)

  if (isLoading || isLoadingFeedback) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">用户反馈</h2>
          <Skeleton className="h-10 w-40" />
        </div>

        {[1, 2, 3].map((i) => (
          <Card
            key={i}
            className="backdrop-blur-md bg-white/70 dark:bg-gray-800/70 border-green-200 dark:border-green-900"
          >
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-6 w-20" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-16 w-full rounded" />
                </div>
                <div>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-16 w-full rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">用户反馈</h2>
        <div className="flex items-center gap-4">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="按智能体筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有智能体</SelectItem>
              {applications.map((app) => (
                <SelectItem key={app.id} value={app.id}>
                  {app.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            onClick={loadFeedback}
            disabled={isLoadingFeedback}
            className="flex items-center text-[#6cb33f] hover:text-green-700"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoadingFeedback ? "animate-spin" : ""}`} />
            刷新
          </button>
        </div>
      </div>

      {filteredFeedback.length === 0 ? (
        <Card className="backdrop-blur-md bg-white/70 dark:bg-gray-800/70 border-green-200 dark:border-green-900">
          <CardContent className="flex items-center justify-center h-40">
            <p className="text-gray-500 dark:text-gray-400">没有可用的反馈数据</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredFeedback.map((item) => (
            <Card
              key={item.id}
              className="backdrop-blur-md bg-white/70 dark:bg-gray-800/70 border-green-200 dark:border-green-900"
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{item.appName}</CardTitle>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(item.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Badge className={item.type === "like" ? "bg-green-500" : "bg-red-500"}>
                    {item.type === "like" && <ThumbsUp className="h-3 w-3 mr-1" />}
                    {item.type === "dislike" && <ThumbsDown className="h-3 w-3 mr-1" />}
                    {item.type === "like" ? "点赞" : "点踩"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium">用户消息:</h4>
                    <p className="text-sm bg-gray-50 dark:bg-gray-700/50 p-2 rounded">{item.messageContent}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">AI 回复:</h4>
                    <p className="text-sm bg-green-50 dark:bg-green-900/20 p-2 rounded">{item.responseContent}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
