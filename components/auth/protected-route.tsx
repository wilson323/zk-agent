// @ts-nocheck
"use client"

import { useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Shield } from "lucide-react"

interface ProtectedRouteProps {
  children: ReactNode
  requireAuth?: boolean
  requireAdmin?: boolean
  fallbackPath?: string
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  requireAdmin = false,
  fallbackPath = "/auth/login",
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) {return}

    if (requireAuth && !user) {
      router.push(fallbackPath)
      return
    }

    if (requireAdmin && user?.role !== "admin") {
      router.push("/")
      return
    }
  }, [user, isLoading, requireAuth, requireAdmin, router, fallbackPath])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-12 w-12 animate-spin text-[#6cb33f] mb-4" />
            <p className="text-center text-gray-600 dark:text-gray-400">验证身份中...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (requireAuth && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Shield className="h-12 w-12 text-red-500 mb-4" />
            <p className="text-center text-gray-600 dark:text-gray-400">需要登录才能访问此页面</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (requireAdmin && user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Shield className="h-12 w-12 text-red-500 mb-4" />
            <p className="text-center text-gray-600 dark:text-gray-400">需要管理员权限才能访问此页面</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
