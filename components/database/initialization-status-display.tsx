import type React from "react"
import { InitializationStatus } from "@/lib/database/initialization"

interface InitializationStatusDisplayProps {
  status: InitializationStatus
  progress: { step: string; percentage: number }
  error: Error | null
}

export function InitializationStatusDisplay({
  status,
  progress,
  error,
}: InitializationStatusDisplayProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      {status !== InitializationStatus.COMPLETED && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border p-4 min-w-[300px]">
          <div className="flex items-center space-x-3">
            {/* 状态图标 */}
            <div className="flex-shrink-0">
              {status === InitializationStatus.PENDING && (
                <div className="w-4 h-4 bg-gray-400 rounded-full animate-pulse" />
              )}
              {status === InitializationStatus.INITIALIZING && (
                <div className="w-4 h-4 bg-blue-500 rounded-full animate-spin border-2 border-white border-t-transparent" />
              )}
              {status === InitializationStatus.FAILED && (
                <div className="w-4 h-4 bg-red-500 rounded-full" />
              )}
            </div>

            {/* 状态信息 */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {status === InitializationStatus.PENDING && '准备初始化数据库...'}
                {status === InitializationStatus.INITIALIZING && '正在初始化数据库系统'}
                {status === InitializationStatus.FAILED && '数据库初始化失败'}
              </div>
              
              {status === InitializationStatus.INITIALIZING && (
                <div className="mt-1">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {progress.step}
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div 
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                </div>
              )}
              
              {error && (
                <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {error.message}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
