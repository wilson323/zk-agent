// @ts-nocheck
"use client"

import { useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"

export function SessionManager() {
  const { user, refreshToken, logout } = useAuth()
  const { toast } = useToast()

  // 检查token是否即将过期并自动刷新
  const checkAndRefreshToken = useCallback(async () => {
    const token = localStorage.getItem("accessToken")
    const tokenExpiry = localStorage.getItem("tokenExpiry")

    if (!token || !user) {return}

    // 如果设置了过期时间，检查是否即将过期
    if (tokenExpiry) {
      const expiryDate = new Date(tokenExpiry)
      const now = new Date()
      const timeUntilExpiry = expiryDate.getTime() - now.getTime()

      // 如果在5分钟内过期，尝试刷新token
      if (timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0) {
        const success = await refreshToken()
        if (!success) {
          toast({
            title: "会话即将过期",
            description: "请重新登录以继续使用",
            variant: "destructive",
          })
          setTimeout(() => logout(), 3000)
        }
      } else if (timeUntilExpiry <= 0) {
        // Token已过期
        toast({
          title: "会话已过期",
          description: "请重新登录",
          variant: "destructive",
        })
        logout()
      }
    }
  }, [user, refreshToken, logout, toast])

  // 监听页面可见性变化，当页面重新获得焦点时检查token
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkAndRefreshToken()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [checkAndRefreshToken])

  // 定期检查token状态
  useEffect(() => {
    if (!user) {return}

    const interval = setInterval(checkAndRefreshToken, 60000) // 每分钟检查一次
    return () => clearInterval(interval)
  }, [user, checkAndRefreshToken])

  // 监听网络状态变化
  useEffect(() => {
    const handleOnline = () => {
      if (user) {
        checkAndRefreshToken()
      }
    }

    window.addEventListener("online", handleOnline)
    return () => window.removeEventListener("online", handleOnline)
  }, [user, checkAndRefreshToken])

  return null // 这是一个无UI的管理组件
}
