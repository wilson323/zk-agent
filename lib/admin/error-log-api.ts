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

interface FetchLogsResponse {
  logs: ErrorLog[]
  stats: ErrorStats
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export const fetchErrorLogs = async (searchTerm: string, levelFilter: string, statusFilter: string): Promise<ApiResponse<FetchLogsResponse>> => {
  try {
    const params = new URLSearchParams({
      search: searchTerm,
      level: levelFilter,
      status: statusFilter,
      limit: "50",
    })

    const response = await fetch(`/api/admin/error-logs?${params}`)
    if (response.ok) {
      const data = await response.json()
      return { success: true, data }
    } else {
      const errorData = await response.json()
      return { success: false, error: errorData.message || "获取错误日志失败" }
    }
  } catch (error: any) {
    console.error("获取错误日志失败:", error)
    return { success: false, error: error.message || "网络错误，请稍后重试" }
  }
}

export const markErrorAsResolved = async (logId: string): Promise<ApiResponse<boolean>> => {
  try {
    const response = await fetch(`/api/admin/error-logs/${logId}/resolve`, {
      method: "PATCH",
    })
    if (response.ok) {
      return { success: true, data: true }
    } else {
      const errorData = await response.json()
      return { success: false, error: errorData.message || "标记错误为已解决失败" }
    }
  } catch (error: any) {
    console.error("标记错误为已解决失败:", error)
    return { success: false, error: error.message || "网络错误，请稍后重试" }
  }
}

export const deleteErrorLog = async (logId: string): Promise<ApiResponse<boolean>> => {
  try {
    const response = await fetch(`/api/admin/error-logs/${logId}`, {
      method: "DELETE",
    })
    if (response.ok) {
      return { success: true, data: true }
    } else {
      const errorData = await response.json()
      return { success: false, error: errorData.message || "删除错误日志失败" }
    }
  } catch (error: any) {
    console.error("删除错误日志失败:", error)
    return { success: false, error: error.message || "网络错误，请稍后重试" }
  }
}

export const exportErrorLogs = async (searchTerm: string, levelFilter: string, statusFilter: string): Promise<ApiResponse<string>> => {
  try {
    const params = new URLSearchParams({
      search: searchTerm,
      level: levelFilter,
      status: statusFilter,
      format: "csv",
    })

    const response = await fetch(`/api/admin/error-logs/export?${params}`)
    if (response.ok) {
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `error-logs-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      return { success: true, data: "导出成功" }
    } else {
      const errorData = await response.json()
      return { success: false, error: errorData.message || "导出错误日志失败" }
    }
  } catch (error: any) {
    console.error("导出错误日志失败:", error)
    return { success: false, error: error.message || "网络错误，请稍后重试" }
  }
}
