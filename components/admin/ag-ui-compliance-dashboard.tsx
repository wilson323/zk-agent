// @ts-nocheck
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Download } from "lucide-react"
import type { ComplianceAuditResult, ComplianceReport } from "@/lib/ag-ui/compliance/agent-compliance-audit"

/**
 * AG-UI协议合规性仪表盘
 * 显示所有智能体的协议遵循情况
 */
export function AgUIComplianceDashboard() {
  const [auditResult, setAuditResult] = useState<ComplianceAuditResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 执行审计
  const runAudit = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/ag-ui/compliance/audit", {
        method: "GET",
      })

      const result = await response.json()

      if (result.success) {
        setAuditResult(result.data)
      } else {
        setError(result.message || "审计失败")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "网络错误")
    } finally {
      setIsLoading(false)
    }
  }

  // 导出审计结果
  const exportResults = () => {
    if (!auditResult) {return}

    const dataStr = JSON.stringify(auditResult, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `ag-ui-compliance-audit-${new Date().toISOString().split("T")[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  // 初始加载
  useEffect(() => {
    runAudit()
  }, [])

  // 渲染合规性状态
  const renderComplianceStatus = (isCompliant: boolean, score: number) => {
    if (isCompliant && score >= 90) {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          优秀
        </Badge>
      )
    } else if (isCompliant && score >= 80) {
      return (
        <Badge className="bg-blue-100 text-blue-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          良好
        </Badge>
      )
    } else if (score >= 60) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800">
          <AlertTriangle className="w-3 h-3 mr-1" />
          需改进
        </Badge>
      )
    } else {
      return (
        <Badge className="bg-red-100 text-red-800">
          <XCircle className="w-3 h-3 mr-1" />
          不合规
        </Badge>
      )
    }
  }

  // 渲染智能体报告
  const renderAgentReport = (report: ComplianceReport) => {
    const agentNames: Record<string, string> = {
      conversation: "对话智能体",
      cad: "CAD解读智能体",
      poster: "海报设计智能体",
    }

    return (
      <Card key={report.agentId} className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{agentNames[report.agentId] || report.agentId}</CardTitle>
            {renderComplianceStatus(report.isCompliant, report.overallScore)}
          </div>
          <CardDescription>合规性评分: {report.overallScore}/100</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 总体进度 */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>总体合规性</span>
                <span>{report.overallScore}%</span>
              </div>
              <Progress value={report.overallScore} className="h-2" />
            </div>

            {/* 详细评分 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium mb-1">定义合规性</div>
                <div className="flex justify-between text-sm">
                  <span>评分: {report.definitionCompliance.score}/100</span>
                  <span className={report.definitionCompliance.isCompliant ? "text-green-600" : "text-red-600"}>
                    {report.definitionCompliance.isCompliant ? "✓" : "✗"}
                  </span>
                </div>
                <Progress value={report.definitionCompliance.score} className="h-1 mt-1" />
              </div>
              <div>
                <div className="text-sm font-medium mb-1">运行时合规性</div>
                <div className="flex justify-between text-sm">
                  <span>评分: {report.runtimeCompliance.score}/100</span>
                  <span className={report.runtimeCompliance.isCompliant ? "text-green-600" : "text-red-600"}>
                    {report.runtimeCompliance.isCompliant ? "✓" : "✗"}
                  </span>
                </div>
                <Progress value={report.runtimeCompliance.score} className="h-1 mt-1" />
              </div>
            </div>

            {/* 错误和警告 */}
            {(report.definitionCompliance.errors.length > 0 || report.runtimeCompliance.errors.length > 0) && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-1">发现错误:</div>
                  <ul className="list-disc list-inside text-sm">
                    {[...report.definitionCompliance.errors, ...report.runtimeCompliance.errors].map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {(report.definitionCompliance.warnings.length > 0 || report.runtimeCompliance.warnings.length > 0) && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-1">警告:</div>
                  <ul className="list-disc list-inside text-sm">
                    {[...report.definitionCompliance.warnings, ...report.runtimeCompliance.warnings].map(
                      (warning, index) => (
                        <li key={index}>{warning}</li>
                      ),
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* 建议 */}
            {report.recommendations.length > 0 && (
              <div>
                <div className="font-medium text-sm mb-2">改进建议:</div>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {report.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 头部操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AG-UI协议合规性</h2>
          <p className="text-muted-foreground">检查所有智能体是否遵循AG-UI协议标准</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runAudit} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "审计中..." : "重新审计"}
          </Button>
          {auditResult && (
            <Button variant="outline" onClick={exportResults}>
              <Download className="w-4 h-4 mr-2" />
              导出结果
            </Button>
          )}
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 审计结果 */}
      {auditResult && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">总览</TabsTrigger>
            <TabsTrigger value="agents">智能体详情</TabsTrigger>
            <TabsTrigger value="recommendations">建议</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* 总体统计 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">总智能体数</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{auditResult.totalAgents}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">合规智能体</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{auditResult.compliantAgents}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">总体评分</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{auditResult.overallScore}/100</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">合规状态</CardTitle>
                </CardHeader>
                <CardContent>{renderComplianceStatus(auditResult.isCompliant, auditResult.overallScore)}</CardContent>
              </Card>
            </div>

            {/* 合规性进度 */}
            <Card>
              <CardHeader>
                <CardTitle>合规性概览</CardTitle>
                <CardDescription>最后更新: {new Date(auditResult.timestamp).toLocaleString()}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>总体合规性</span>
                      <span>{auditResult.overallScore}%</span>
                    </div>
                    <Progress value={auditResult.overallScore} className="h-3" />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {auditResult.compliantAgents} / {auditResult.totalAgents} 个智能体完全符合AG-UI协议
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agents" className="space-y-4">
            {auditResult.reports.map(renderAgentReport)}
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>改进建议</CardTitle>
                <CardDescription>基于审计结果的优化建议</CardDescription>
              </CardHeader>
              <CardContent>
                {auditResult.recommendations.length > 0 ? (
                  <ul className="space-y-2">
                    {auditResult.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 mt-0.5 text-yellow-500" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                    <p>所有智能体都符合AG-UI协议标准！</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
