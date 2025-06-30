// @ts-nocheck
"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Progress } from "@/components/ui/progress"
import { formatTime } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

import type { ProgressStep } from "@/types/progress"

export interface ProgressVisualizerProps {
  steps: ProgressStep[]
  currentStep?: string
  overallProgress: number
  title?: string
  showEstimatedTime?: boolean
  showDetailedSteps?: boolean
  onStepClick?: (step: ProgressStep) => void
  className?: string
}

export function RealTimeProgressVisualizer({
  steps,
  currentStep,
  overallProgress,
  title = "处理进度",
  showEstimatedTime = true,
  showDetailedSteps = true,
  onStepClick,
  className,
}: ProgressVisualizerProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0)
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  // 动画化进度条
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(overallProgress)
    }, 100)
    return () => clearTimeout(timer)
  }, [overallProgress])

  // 计算预估剩余时间
  useEffect(() => {
    if (!showEstimatedTime) {return}

    const completedSteps = steps.filter((step) => step.status === "completed")
    const runningStep = steps.find((step) => step.status === "running")

    if (completedSteps.length > 0 && runningStep) {
      const avgDuration =
        completedSteps.reduce((sum, step) => {
          if (step.startTime && step.endTime) {
            return sum + (step.endTime.getTime() - step.startTime.getTime())
          }
          return sum
        }, 0) / completedSteps.length

      const remainingSteps = steps.filter((step) => step.status === "pending").length
      const currentStepProgress = runningStep.progress / 100
      const currentStepRemaining = (1 - currentStepProgress) * (runningStep.estimatedDuration || avgDuration)

      setEstimatedTimeRemaining(currentStepRemaining + remainingSteps * avgDuration)
    }
  }, [steps, showEstimatedTime])

  import { getStepIcon, getStepStatusColor } from "@/lib/progress/utils"

  // 使用统一的时间格式化函数

  const completedSteps = steps.filter((step) => step.status === "completed").length
  const totalSteps = steps.length
  const hasErrors = steps.some((step) => step.status === "error")

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={hasErrors ? "border-red-500/20 text-red-500" : ""}>
              {completedSteps}/{totalSteps} 完成
            </Badge>
            {estimatedTimeRemaining && estimatedTimeRemaining > 0 && (
              <Badge variant="outline" className="text-blue-500">
                预计剩余: {formatTime(estimatedTimeRemaining)}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 总体进度条 */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">总体进度</span>
            <span className="text-muted-foreground">{Math.round(animatedProgress)}%</span>
          </div>
          <div className="relative">
            <Progress value={animatedProgress} className="h-3" ref={progressRef} />
            <motion.div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary/20 to-primary/40 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${animatedProgress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* 详细步骤 */}
        {showDetailedSteps && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">详细步骤</h4>
            <div className="space-y-2">
              <AnimatePresence>
                {steps.map((step, index) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-all duration-200",
                      getStepStatusColor(step),
                      onStepClick && "cursor-pointer hover:shadow-sm",
                      currentStep === step.id && "ring-2 ring-primary/20",
                    )}
                    onClick={() => onStepClick?.(step)}
                  >
                    <div className="flex-shrink-0">{getStepIcon(step)}</div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium text-sm truncate">{step.name}</h5>
                        {step.status === "running" && (
                          <span className="text-xs text-muted-foreground">{Math.round(step.progress)}%</span>
                        )}
                      </div>

                      {step.description && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{step.description}</p>
                      )}

                      {step.status === "running" && (
                        <div className="mt-2">
                          <Progress value={step.progress} className="h-1" />
                        </div>
                      )}

                      {step.status === "completed" && step.startTime && step.endTime && (
                        <p className="text-xs text-muted-foreground mt-1">
                          耗时: {formatTime(step.endTime.getTime() - step.startTime.getTime())}
                        </p>
                      )}
                    </div>

                    <div className="flex-shrink-0">
                      <Badge variant="outline" className={cn("text-xs", getStepStatusColor(step))}>
                        {step.status === "pending" && "等待中"}
                        {step.status === "running" && "进行中"}
                        {step.status === "completed" && "已完成"}
                        {step.status === "error" && "错误"}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* 性能统计 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-lg font-bold text-green-500">{completedSteps}</div>
            <div className="text-xs text-muted-foreground">已完成</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-500">{steps.filter((s) => s.status === "running").length}</div>
            <div className="text-xs text-muted-foreground">进行中</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-500">{steps.filter((s) => s.status === "pending").length}</div>
            <div className="text-xs text-muted-foreground">等待中</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-500">{steps.filter((s) => s.status === "error").length}</div>
            <div className="text-xs text-muted-foreground">错误</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * 简化版进度可视化组件
 */
export function SimpleProgressVisualizer({
  progress,
  message,
  showPercentage = true,
  className,
}: {
  progress: number
  message?: string
  showPercentage?: boolean
  className?: string
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {message && (
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>{message}</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Progress value={progress} className="flex-1" />
        {showPercentage && <span className="text-sm font-medium min-w-[3rem] text-right">{Math.round(progress)}%</span>}
      </div>
    </div>
  )
}

/**
 * 环形进度可视化组件
 */
export function CircularProgressVisualizer({
  progress,
  size = 120,
  strokeWidth = 8,
  children,
  className,
}: {
  progress: number
  size?: number
  strokeWidth?: number
  children?: React.ReactNode
  className?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* 背景圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted-foreground/20"
        />
        {/* 进度圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="text-primary transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children || <span className="text-lg font-bold">{Math.round(progress)}%</span>}
      </div>
    </div>
  )
}
