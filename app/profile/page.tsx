// @ts-nocheck
"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { User, Shield, Activity, Settings, Camera, Save, Lock, LogOut, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

export default function ProfilePage() {
  const { user, updateProfile, logout, isLoading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    avatar: "",
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email,
        avatar: user.avatar || "",
      })
    }
  }, [user])

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth/login")
    }
  }, [user, isLoading, router])

  const handleSaveProfile = async () => {
    setIsSaving(true)
    try {
      const result = await updateProfile({
        name: formData.name,
        avatar: formData.avatar,
      })

      if (result.success) {
        toast({
          title: "资料更新成功",
          description: "您的个人资料已成功更新",
        })
        setIsEditing(false)
      } else {
        toast({
          title: "更新失败",
          description: result.error || "更新个人资料时出现错误",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "更新失败",
        description: "网络错误，请稍后重试",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "密码不匹配",
        description: "新密码和确认密码不一致",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "密码修改成功",
          description: "您的密码已成功修改",
        })
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        })
      } else {
        toast({
          title: "密码修改失败",
          description: result.error || "修改密码时出现错误",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "修改失败",
        description: "网络错误，请稍后重试",
        variant: "destructive",
      })
    }
  }

  const handleLogout = async () => {
    await logout()
    toast({
      title: "已退出登录",
      description: "您已成功退出登录",
    })
    router.push("/")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          <span>加载中...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          {/* 页面标题 */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-green-700 dark:text-green-400">个人资料</h1>
            <p className="text-gray-600 dark:text-gray-400">管理您的账户信息和偏好设置</p>
          </div>

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile">基本信息</TabsTrigger>
              <TabsTrigger value="security">安全设置</TabsTrigger>
              <TabsTrigger value="activity">活动记录</TabsTrigger>
            </TabsList>

            {/* 基本信息标签页 */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    基本信息
                  </CardTitle>
                  <CardDescription>管理您的个人资料和头像</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 头像部分 */}
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <Avatar className="w-24 h-24">
                        <AvatarImage src={formData.avatar || "/placeholder.svg"} alt={formData.name} />
                        <AvatarFallback className="text-2xl">{formData.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
                      >
                        <Camera className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">{user.name}</h3>
                      <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                        <Shield className="w-3 h-3" />
                        {user.role === "admin" ? "管理员" : "普通用户"}
                      </Badge>
                      <p className="text-sm text-gray-500">注册时间: {new Date(user.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* 表单部分 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">姓名</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                        disabled={!isEditing}
                        className="disabled:opacity-60"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">邮箱地址</Label>
                      <Input id="email" value={formData.email} disabled className="disabled:opacity-60" />
                      <p className="text-xs text-gray-500">邮箱地址不可修改</p>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="avatar">头像URL</Label>
                      <Input
                        id="avatar"
                        value={formData.avatar}
                        onChange={(e) => setFormData((prev) => ({ ...prev, avatar: e.target.value }))}
                        disabled={!isEditing}
                        placeholder="请输入头像图片URL"
                        className="disabled:opacity-60"
                      />
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-2">
                    {!isEditing ? (
                      <Button onClick={() => setIsEditing(true)} className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        编辑资料
                      </Button>
                    ) : (
                      <>
                        <Button onClick={handleSaveProfile} disabled={isSaving} className="flex items-center gap-2">
                          {isSaving ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          保存
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsEditing(false)
                            setFormData({
                              name: user.name || "",
                              email: user.email,
                              avatar: user.avatar || "",
                            })
                          }}
                        >
                          取消
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 安全设置标签页 */}
            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    修改密码
                  </CardTitle>
                  <CardDescription>定期修改密码以保护账户安全</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">当前密码</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="请输入当前密码"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">新密码</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="请输入新密码"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">确认新密码</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="请再次输入新密码"
                    />
                  </div>
                  <Button onClick={handleChangePassword} className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    修改密码
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <Trash2 className="w-5 h-5" />
                    危险操作
                  </CardTitle>
                  <CardDescription>这些操作不可逆，请谨慎操作</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    variant="outline"
                    onClick={handleLogout}
                    className="flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    退出登录
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 活动记录标签页 */}
            <TabsContent value="activity" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    最近活动
                  </CardTitle>
                  <CardDescription>查看您的账户活动记录</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">登录成功</p>
                        <p className="text-xs text-gray-500">今天 14:30</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">使用对话智能体</p>
                        <p className="text-xs text-gray-500">今天 10:15</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">生成海报</p>
                        <p className="text-xs text-gray-500">昨天 16:45</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  )
}
