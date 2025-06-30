import type React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RefreshCw } from "lucide-react"
import { DEFAULT_AGENT } from "@/config/default-agent"

interface DefaultAgentInfoProps {
  onInitializeDefaultAgent: () => Promise<void>
  isLoading: boolean
}

export function DefaultAgentInfo({ onInitializeDefaultAgent, isLoading }: DefaultAgentInfoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>默认智能体信息</CardTitle>
        <CardDescription>系统将自动初始化以下默认智能体，您也可以手动触发初始化</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="font-medium">智能体名称</Label>
          <p className="text-gray-700 dark:text-gray-300">{DEFAULT_AGENT.name}</p>
        </div>

        <div className="space-y-2">
          <Label className="font-medium">描述</Label>
          <p className="text-gray-700 dark:text-gray-300 text-sm">{DEFAULT_AGENT.description}</p>
        </div>

        <div className="space-y-2">
          <Label className="font-medium">API 密钥</Label>
          <p className="text-gray-700 dark:text-gray-300">
            <span className="font-mono text-sm">
              fastgpt-cgGzHhtbpU872CbxzTyi4t2k6BnhO8DKZTdaz4ELH7Z2r6ItEGVThiBh9FsQ
            </span>
          </p>
        </div>

        <div className="space-y-2">
          <Label className="font-medium">API 端点</Label>
          <p className="text-gray-700 dark:text-gray-300">
            <span className="font-mono text-sm">https://zktecoaihub.com/api</span>
          </p>
        </div>

        <div className="space-y-2">
          <Label className="font-medium">功能</Label>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-full">
              文件上传（默认关闭）
            </span>
            <span className="px-2 py-1 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-full">
              语音转文字（默认关闭）
            </span>
            <span className="px-2 py-1 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-full">
              文字转语音（默认关闭）
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={onInitializeDefaultAgent}
          disabled={isLoading}
          className="w-full bg-[#6cb33f] hover:bg-green-600 transition-colors"
        >
          {isLoading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              初始化中...
            </>
          ) : (
            "初始化默认智能体"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
