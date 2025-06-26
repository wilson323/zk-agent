// @ts-nocheck
"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { User, LoginResponse, RegisterRequest } from "@/types/auth"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string, rememberMe?: boolean) => Promise<LoginResponse>
  register: (data: RegisterRequest) => Promise<LoginResponse>
  logout: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; error?: string }>
  refreshToken: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 检查本地存储的token并验证用户
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem("accessToken")
        if (token) {
          const response = await fetch("/api/auth/profile", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })

          if (response.ok) {
            const data = await response.json()
            if (data.success) {
              setUser(data.data)
            } else {
              // Token无效，清除本地存储
              localStorage.removeItem("accessToken")
              localStorage.removeItem("refreshToken")
            }
          }
        }
      } catch (error) {
        console.error("初始化认证失败:", error)
        localStorage.removeItem("accessToken")
        localStorage.removeItem("refreshToken")
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (email: string, password: string, rememberMe = false): Promise<LoginResponse> => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, rememberMe }),
      })

      const data: LoginResponse = await response.json()

      if (data.success && data.user && data.tokens) {
        setUser(data.user)
        localStorage.setItem("accessToken", data.tokens.accessToken)
        localStorage.setItem("refreshToken", data.tokens.refreshToken)

        // 如果选择记住我，设置更长的过期时间
        if (rememberMe) {
          const expiryDate = new Date()
          expiryDate.setDate(expiryDate.getDate() + 30) // 30天
          localStorage.setItem("tokenExpiry", expiryDate.toISOString())
        }
      }

      return data
    } catch (error) {
      console.error("登录失败:", error)
      return {
        success: false,
        error: "网络错误，请稍后重试",
      }
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (data: RegisterRequest): Promise<LoginResponse> => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      const result: LoginResponse = await response.json()

      if (result.success && result.user && result.tokens) {
        setUser(result.user)
        localStorage.setItem("accessToken", result.tokens.accessToken)
        localStorage.setItem("refreshToken", result.tokens.refreshToken)
      }

      return result
    } catch (error) {
      console.error("注册失败:", error)
      return {
        success: false,
        error: "网络错误，请稍后重试",
      }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async (): Promise<void> => {
    try {
      const token = localStorage.getItem("accessToken")
      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      }
    } catch (error) {
      console.error("登出失败:", error)
    } finally {
      setUser(null)
      localStorage.removeItem("accessToken")
      localStorage.removeItem("refreshToken")
      localStorage.removeItem("tokenExpiry")
    }
  }

  const updateProfile = async (data: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    try {
      const token = localStorage.getItem("accessToken")
      if (!token) {
        return { success: false, error: "未登录" }
      }

      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (result.success) {
        setUser(result.data)
      }

      return result
    } catch (error) {
      console.error("更新资料失败:", error)
      return { success: false, error: "网络错误，请稍后重试" }
    }
  }

  const refreshToken = async (): Promise<boolean> => {
    try {
      const refreshTokenValue = localStorage.getItem("refreshToken")
      if (!refreshTokenValue) {
        return false
      }

      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken: refreshTokenValue }),
      })

      const data = await response.json()

      if (data.success && data.tokens) {
        localStorage.setItem("accessToken", data.tokens.accessToken)
        localStorage.setItem("refreshToken", data.tokens.refreshToken)
        return true
      }

      return false
    } catch (error) {
      console.error("刷新token失败:", error)
      return false
    }
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateProfile,
    refreshToken,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
