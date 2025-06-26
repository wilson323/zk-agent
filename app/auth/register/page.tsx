// @ts-nocheck
"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Sparkles, Shield } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"

export default function RegisterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { register, isLoading, user } = useAuth()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
    inviteCode: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)

  // 如果已登录，重定向到主页
  useEffect(() => {
    if (user) {
      router.push("/")
    }
  }, [user, router])

  // 密码强度检测
  useEffect(() => {
    const password = formData.password
    let strength = 0
    if (password.length >= 8) {strength++}
    if (/[A-Z]/.test(password)) {strength++}
    if (/[a-z]/.test(password)) {strength++}
    if (/[0-9]/.test(password)) {strength++}
    if (/[^A-Za-z0-9]/.test(password)) {strength++}
    setPasswordStrength(strength)
  }, [formData.password])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // 表单验证
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "密码不匹配",
        description: "请确保两次输入的密码相同",
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    if (!formData.agreeToTerms) {
      toast({
        title: "请同意服务条款",
        description: "您需要同意我们的服务条款才能注册",
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    if (passwordStrength < 3) {
      toast({
        title: "密码强度不足",
        description: "请使用更强的密码（至少包含大小写字母、数字）",
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    try {
      const result = await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        inviteCode: formData.inviteCode,
      })

      if (result.success) {
        toast({
          title: "注册成功",
          description: `欢迎加入AI多智能体宇宙平台，${result.user?.name}！`,
        })
        router.push("/")
      } else {
        toast({
          title: "注册失败",
          description: result.error || "注册过程中出现错误",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "注册失败",
        description: "网络错误，请稍后重试",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 1) {return "bg-red-500"}
    if (passwordStrength <= 2) {return "bg-yellow-500"}
    if (passwordStrength <= 3) {return "bg-blue-500"}
    return "bg-green-500"
  }

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 1) {return "弱"}
    if (passwordStrength <= 2) {return "一般"}
    if (passwordStrength <= 3) {return "良好"}
    return "强"
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      {/* 背景动效 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="backdrop-blur-md bg-white/80 dark:bg-gray-800/80 border-green-200 dark:border-green-900 shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center"
            >
              <Sparkles className="w-8 h-8 text-white" />
            </motion.div>
            <div>
              <CardTitle className="text-2xl font-bold text-green-700 dark:text-green-400">创建账户</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                加入AI多智能体宇宙平台，开启智能之旅
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 姓名输入 */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  姓名
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="请输入您的姓名"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className="pl-10 border-green-200 focus:border-green-400 focus:ring-green-400"
                    required
                  />
                </div>
              </div>

              {/* 邮箱输入 */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  邮箱地址
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="请输入您的邮箱"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="pl-10 border-green-200 focus:border-green-400 focus:ring-green-400"
                    required
                  />
                </div>
              </div>

              {/* 密码输入 */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  密码
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="请输入密码（至少8位）"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className="pl-10 pr-10 border-green-200 focus:border-green-400 focus:ring-green-400"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* 密码强度指示器 */}
                {formData.password && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                          style={{ width: `${(passwordStrength / 5) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500">强度: {getPasswordStrengthText()}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 确认密码输入 */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  确认密码
                </Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="请再次输入密码"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    className="pl-10 pr-10 border-green-200 focus:border-green-400 focus:ring-green-400"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-xs text-red-500">密码不匹配</p>
                )}
              </div>

              {/* 邀请码（可选） */}
              <div className="space-y-2">
                <Label htmlFor="inviteCode" className="text-sm font-medium">
                  邀请码 <span className="text-gray-400">(可选)</span>
                </Label>
                <Input
                  id="inviteCode"
                  type="text"
                  placeholder="如有邀请码请输入"
                  value={formData.inviteCode}
                  onChange={(e) => handleInputChange("inviteCode", e.target.value)}
                  className="border-green-200 focus:border-green-400 focus:ring-green-400"
                />
              </div>

              {/* 服务条款 */}
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onCheckedChange={(checked) => handleInputChange("agreeToTerms", checked as boolean)}
                  className="mt-1"
                />
                <Label htmlFor="agreeToTerms" className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  我已阅读并同意{" "}
                  <Link href="/terms" className="text-green-600 hover:text-green-700 dark:text-green-400">
                    服务条款
                  </Link>{" "}
                  和{" "}
                  <Link href="/privacy" className="text-green-600 hover:text-green-700 dark:text-green-400">
                    隐私政策
                  </Link>
                </Label>
              </div>

              {/* 注册按钮 */}
              <Button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                {isSubmitting || isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    注册中...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    创建账户
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </Button>

              {/* 分割线 */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-gray-800 px-2 text-gray-500">或</span>
                </div>
              </div>

              {/* 登录链接 */}
              <div className="text-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">已有账户？</span>
                <Link
                  href="/auth/login"
                  className="ml-1 text-sm text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 font-medium"
                >
                  立即登录
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
