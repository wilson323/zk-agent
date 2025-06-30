// @ts-nocheck
"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useFastGPT } from "@/contexts/FastGPTContext"
import { loadApiConfig, saveApiConfig, testApiConnection } from "@/lib/admin/api-config-manager"

export function ApiConfig() {
  const { configureApi, isLoading, initializeDefaultAgent } = useFastGPT()
  const [apiUrl, setApiUrl] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [useProxy, setUseProxy] = useState(true) // 默认开启代理
  const [testStatus, setTestStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [testMessage, setTestMessage] = useState("")
  const [activeTab, setActiveTab] = useState("config")

  // 从本地存储加载配置
  useEffect(() => {
    const config = loadApiConfig()
    setApiUrl(config.baseUrl)
    setApiKey(config.apiKey)
    setUseProxy(config.useProxy)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTestStatus("loading")
    setTestMessage("正在测试API连接...")

    try {
      const configToSave = { baseUrl: apiUrl, apiKey, useProxy }
      await saveApiConfig(configToSave)

      const testResult = await testApiConnection(apiUrl, apiKey, useProxy)
      if (testResult.success) {
        setTestStatus("success")
        setTestMessage("API连接成功！配置已保存")
      } else {
        setTestStatus("error")
        setTestMessage(`API连接失败: ${testResult.message}，但配置已保存到本地存储`)
      }
    } catch (error: any) {
      setTestStatus("error")
      setTestMessage(`API连接失败: ${error.message || "未知错误"}，但配置已保存到本地存储`)
    }
  }

  const handleInitializeDefaultAgent = async () => {
    try {
      await initializeDefaultAgent()
    } catch (error) {
      console.error("手动初始化默认智能体失败:", error)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-green-700 dark:text-green-400">API 配置</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleInitializeDefaultAgent}
            disabled={isLoading}
            className="flex items-center gap-1"
          >
            <RefreshCw className="h-4 w-4" />
            初始化默认智能体
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="config">API 配置</TabsTrigger>
          <TabsTrigger value="info">默认智能体信息</TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>FastGPT API 配置</CardTitle>
              <CardDescription>配置您的FastGPT API密钥和端点，以便应用程序可以与FastGPT服务通信。</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="apiUrl" className="flex items-center gap-1">
                    <Globe className="h-4 w-4" />
                    API 端点 URL
                  </Label>
                  <Input
                    id="apiUrl"
                    placeholder="例如: https://zktecoaihub.com/api"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    required
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">FastGPT API的基础URL，通常以/api结尾</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiKey" className="flex items-center gap-1">
                    <Key className="h-4 w-4" />
                    API 密钥
                  </Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="您的FastGPT API密钥"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    required
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    用于验证API请求的密钥，格式通常为fastgpt-xxxxxxxx
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="useProxy" checked={useProxy} onCheckedChange={setUseProxy} />
                  <Label htmlFor="useProxy" className="flex items-center gap-1 cursor-pointer">
                    <Shield className="h-4 w-4" />
                    使用代理模式
                  </Label>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 pl-7">
                  如果遇到CORS或网络问题，启用代理模式可能会有所帮助（默认开启）
                </p>

                {testStatus === "success" && (
                  <StatusMessage type="success" message={testMessage} />
                )}

                {testStatus === "error" && (
                  <StatusMessage type="error" message={testMessage} />
                )}
              </CardContent>

              <CardFooter className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setApiUrl(DEFAULT_API_CONFIG.baseUrl)
                    setApiKey("")
                    setUseProxy(true) // 重置为默认开启代理
                    // 重置时也保存到本地存储
                    localStorage.setItem(
                      "ai_chat_api_config",
                      JSON.stringify({
                        baseUrl: DEFAULT_API_CONFIG.baseUrl,
                        apiKey: "",
                        useProxy: true, // 默认开启代理
                      }),
                    )
                  }}
                >
                  重置
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-[#6cb33f] hover:bg-green-600 transition-colors"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      测试中...
                    </>
                  ) : (
                    "测试并保存"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="info">
          <DefaultAgentInfo
            onInitializeDefaultAgent={handleInitializeDefaultAgent}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
