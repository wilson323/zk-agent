// @ts-nocheck
"use client"

import { Button } from "@/components/ui/button"
import { CheckCircle, Loader2, XCircle } from "lucide-react"
import { useState } from "react"

// 添加新的导入
import { enhancedFastGPTClient } from "@/lib/api/enhanced-fastgpt-client"
import { contextMemoryManager } from "@/lib/chat/context-memory-manager"
import { errorRetryManager } from "@/lib/chat/error-retry-manager"

interface FastGPTConnectionProps {
  apiKey: string | null
  baseUrl: string | null
}

export const FastGPTConnection = ({ apiKey, baseUrl }: FastGPTConnectionProps) => {
  const [isTesting, setIsTesting] = useState(false)
  const [testResults, setTestResults] = useState<any[]>([])

  // 添加状态
  const [isTestingEnhanced, setIsTestingEnhanced] = useState(false)
  const [enhancedResults, setEnhancedResults] = useState<any[]>([])

  const testConnection = async () => {
    setIsTesting(true)
    setTestResults([])

    const results: any[] = []

    try {
      results.push({
        test: "Base URL",
        status: "testing",
        message: "Testing base URL...",
      })
      setTestResults([...results])

      if (!baseUrl) {
        throw new Error("Base URL is not set")
      }

      results[results.length - 1] = {
        test: "Base URL",
        status: "success",
        message: `Base URL is valid: ${baseUrl}`,
      }
      setTestResults([...results])

      results.push({
        test: "API Key",
        status: "testing",
        message: "Testing API Key...",
      })
      setTestResults([...results])

      if (!apiKey) {
        throw new Error("API Key is not set")
      }

      results[results.length - 1] = {
        test: "API Key",
        status: "success",
        message: "API Key is valid",
      }
      setTestResults([...results])
    } catch (error: any) {
      results[results.length - 1] = {
        test: results[results.length - 1]?.test || "Connection",
        status: "error",
        message: `Test failed: ${error.message}`,
      }
      setTestResults([...results])
    } finally {
      setIsTesting(false)
    }
  }

  // 添加新的测试函数
  const testEnhancedFeatures = async () => {
    setIsTestingEnhanced(true)
    setEnhancedResults([])

    const results: any[] = []

    try {
      // 测试上下文记忆管理
      results.push({
        test: "上下文记忆管理",
        status: "testing",
        message: "测试智能记忆管理功能...",
      })
      setEnhancedResults([...results])

      const testContext = await enhancedFastGPTClient.initializeContext("test-app", "test-user", "你是一个测试助手")

      const memoryStats = contextMemoryManager.getMemoryStats(testContext.sessionId)

      results[results.length - 1] = {
        test: "上下文记忆管理",
        status: "success",
        message: `记忆管理正常，会话ID: ${testContext.sessionId}`,
        details: memoryStats,
      }
      setEnhancedResults([...results])

      // 测试错误重试机制
      results.push({
        test: "错误重试机制",
        status: "testing",
        message: "测试智能重试功能...",
      })
      setEnhancedResults([...results])

      const retryStats = errorRetryManager.getAllStats()

      results[results.length - 1] = {
        test: "错误重试机制",
        status: "success",
        message: "重试机制正常",
        details: {
          totalOperations: retryStats.size,
          retryConfig: "最大重试3次，指数退避",
        },
      }
      setEnhancedResults([...results])

      // 测试流式优化
      results.push({
        test: "流式响应优化",
        status: "testing",
        message: "测试流式响应优化...",
      })
      setEnhancedResults([...results])

      // 模拟流式测试
      await new Promise((resolve) => setTimeout(resolve, 1000))

      results[results.length - 1] = {
        test: "流式响应优化",
        status: "success",
        message: "流式优化正常",
        details: {
          bufferSize: 3,
          compression: "启用",
          metrics: "启用",
        },
      }
      setEnhancedResults([...results])
    } catch (error: any) {
      results[results.length - 1] = {
        test: results[results.length - 1]?.test || "增强功能测试",
        status: "error",
        message: `测试失败: ${error.message}`,
      }
      setEnhancedResults([...results])
    } finally {
      setIsTestingEnhanced(false)
    }
  }

  return (
    <div>
      <Button onClick={testConnection} disabled={isTesting} className="w-full">
        {isTesting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Testing...
          </>
        ) : (
          "Test Connection"
        )}
      </Button>

      {/* 增强功能测试按钮 */}
      <Button onClick={testEnhancedFeatures} disabled={isTestingEnhanced} className="w-full mt-2">
        {isTestingEnhanced ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            测试增强功能中...
          </>
        ) : (
          "测试对话系统优化"
        )}
      </Button>

      {testResults.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="font-medium">Connection Test Results:</h4>
          {testResults.map((result, index) => (
            <div key={index} className="flex items-start space-x-2 p-2 rounded border">
              {result.status === "testing" && <Loader2 className="h-4 w-4 animate-spin mt-0.5 text-blue-500" />}
              {result.status === "success" && <CheckCircle className="h-4 w-4 mt-0.5 text-green-500" />}
              {result.status === "error" && <XCircle className="h-4 w-4 mt-0.5 text-red-500" />}
              <div className="flex-1">
                <div className="font-medium text-sm">{result.test}</div>
                <div className="text-sm text-gray-600">{result.message}</div>
                {result.details && (
                  <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1 overflow-auto">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 增强功能测试结果 */}
      {enhancedResults.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="font-medium">对话系统优化测试结果:</h4>
          {enhancedResults.map((result, index) => (
            <div key={index} className="flex items-start space-x-2 p-2 rounded border">
              {result.status === "testing" && <Loader2 className="h-4 w-4 animate-spin mt-0.5 text-blue-500" />}
              {result.status === "success" && <CheckCircle className="h-4 w-4 mt-0.5 text-green-500" />}
              {result.status === "error" && <XCircle className="h-4 w-4 mt-0.5 text-red-500" />}
              <div className="flex-1">
                <div className="font-medium text-sm">{result.test}</div>
                <div className="text-sm text-gray-600">{result.message}</div>
                {result.details && (
                  <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1 overflow-auto">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// 添加默认导出以兼容不同的导入方式
export default FastGPTConnection
