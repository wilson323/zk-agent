// @ts-nocheck
"use client"

import { useState } from "react"
import { Layers, Info, FileText, BarChart3, Download, Copy, CheckCircle2, AlertCircle, Box } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import * as THREE from "three"

interface CADAnalysisResultProps {
  result: any
  className?: string
}

export function CADAnalysisResult({ result, className }: CADAnalysisResultProps) {
  const [activeTab, setActiveTab] = useState("summary")

  // 在组件顶部添加新的状态管理：
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"name" | "risk" | "category">("name")
  const [showOnlyIssues, setShowOnlyIssues] = useState(false)

  // 在组件顶部添加新的状态
  const [view3D, setView3D] = useState(false)
  // const [selectedDevice, setSelectedDevice] = useState<string | null>(null) // 已经存在
  const [filterOptions, setFilterOptions] = useState({
    category: "all",
    severity: "all",
    status: "all",
  })

  // 在CADAnalysisResult组件中添加缺失的高级可视化功能

  // 1. 在组件顶部添加新的状态管理：

  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null)
  const [comparisonMode, setComparisonMode] = useState(false)
  const [exportOptions, setExportOptions] = useState({
    format: "pdf",
    sections: ["summary", "devices", "risks"],
    includeCharts: true,
    includeRecommendations: true,
  })

  // 模拟数据，实际应用中应该使用传入的result
  const analysisData = {
    fileName: "engine-assembly.dwg",
    fileSize: "12.5 MB",
    fileType: "DWG",
    createdDate: "2023-05-15",
    lastModified: "2023-06-20",
    summary: {
      totalParts: 156,
      totalAssemblies: 8,
      totalLayers: 24,
      materialCount: 12,
      issues: [
        { severity: "high", message: "发现2个零件碰撞", count: 2 },
        { severity: "medium", message: "发现5个公差超标", count: 5 },
        { severity: "low", message: "发现3个非标准材料", count: 3 },
      ],
    },
    parts: [
      { id: "P001", name: "主轴", material: "钢", weight: "2.5kg", dimensions: "120x45x45mm", issues: 0 },
      { id: "P002", name: "连杆", material: "铝合金", weight: "0.8kg", dimensions: "85x25x15mm", issues: 1 },
      { id: "P003", name: "活塞", material: "铝合金", weight: "0.5kg", dimensions: "Ø40x60mm", issues: 2 },
      { id: "P004", name: "气缸", material: "铸铁", weight: "4.2kg", dimensions: "Ø80x150mm", issues: 0 },
      { id: "P005", name: "凸轮轴", material: "钢", weight: "1.8kg", dimensions: "250x30x30mm", issues: 0 },
    ],
    assemblies: [
      { id: "A001", name: "发动机总成", parts: 45, subAssemblies: 3, issues: 1 },
      { id: "A002", name: "传动系统", parts: 28, subAssemblies: 2, issues: 0 },
      { id: "A003", name: "冷却系统", parts: 18, subAssemblies: 1, issues: 2 },
    ],
    materials: {
      钢: 35,
      铝合金: 42,
      铸铁: 15,
      塑料: 25,
      橡胶: 18,
      铜: 8,
      其他: 13,
    },
    recommendations: [
      "建议优化P002连杆的材料选择，可以减轻重量",
      "A001发动机总成中的零件碰撞需要调整",
      "建议检查所有公差超标的零件，可能影响装配质量",
      "考虑将非标准材料替换为标准材料，以提高可制造性",
    ],
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // 可以添加一个复制成功的提示
  }

  const downloadReport = () => {
    // 实际应用中应该生成并下载报告
    console.log("下载报告")
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "text-destructive"
      case "medium":
        return "text-amber-500"
      case "low":
        return "text-emerald-500"
      default:
        return "text-muted-foreground"
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-destructive/10 text-destructive hover:bg-destructive/20"
      case "medium":
        return "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
      case "low":
        return "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
      default:
        return ""
    }
  }

  // 添加3D视图切换
  const toggle3DView = () => {
    setView3D(!view3D)
  }

  // 添加设备选择处理
  const handleDeviceSelect = (deviceId: string) => {
    setSelectedDevice(deviceId)
    // 在3D视图中高亮显示选中的设备
  }

  const reset3DView = () => {
    console.log("重置3D视角")
  }

  const export3DView = () => {
    console.log("导出3D视图")
  }

  const rotate3DView = (axis: string) => {
    console.log(`绕${axis}轴旋转3D视图`)
  }

  const exportFilteredData = () => {
    console.log("导出筛选后的数据")
  }

  const handleExport = async (format: "pdf" | "excel" | "json") => {
    try {
      const response = await fetch("/api/cad/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resultId: result.id,
          format,
          sections: ["summary", "devices", "risks", "recommendations"],
        }),
      })

      if (!response.ok) {throw new Error("导出失败")}

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `cad-analysis-${Date.now()}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("导出失败:", error)
    }
  }

  const handleShare = async () => {
    try {
      const response = await fetch("/api/sharing/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "cad_analysis",
          data: result,
          permissions: { view: true, download: false },
          expiresIn: 7 * 24 * 60 * 60 * 1000, // 7天
        }),
      })

      const { shareUrl } = await response.json()
      await navigator.clipboard.writeText(shareUrl)
      // 显示成功提示
    } catch (error) {
      console.error("分享失败:", error)
    }
  }

  const handle3DViewToggle = () => {
    setView3D(!view3D)

    if (!view3D) {
      // 初始化3D场景
      initializeThreeJSScene()
    }
  }

  const initializeThreeJSScene = () => {
    // Three.js场景初始化逻辑
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer()

    // 添加设备模型到场景
    result.devices?.forEach((device) => {
      const geometry = new THREE.BoxGeometry(1, 1, 1)
      const material = new THREE.MeshBasicMaterial({ color: getDeviceColor(device.category) })
      const cube = new THREE.Mesh(geometry, material)

      cube.position.set(device.location.x / 1000, device.location.y / 1000, device.location.z / 1000)

      scene.add(cube)
    })
  }

  const getDeviceColor = (category: string) => {
    switch (category) {
      case "surveillance":
        return 0x00ff00 // Green
      case "access_control":
        return 0xff0000 // Red
      case "fire_safety":
        return 0x0000ff // Blue
      default:
        return 0xffffff // White
    }
  }

  const handleAdvancedExport = async () => {
    try {
      const response = await fetch("/api/cad/export/advanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resultId: result.id,
          options: exportOptions,
          customizations: {
            branding: true,
            watermark: false,
            compression: "high",
          },
        }),
      })

      if (!response.ok) {throw new Error("高级导出失败")}

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `advanced-cad-analysis-${Date.now()}.${exportOptions.format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("高级导出失败:", error)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn("w-full", className)}
    >
      <Card className="shadow-md border-t-4 border-t-primary">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                CAD分析结果
              </CardTitle>
              <CardDescription className="mt-1">
                文件: {analysisData.fileName} ({analysisData.fileSize}) · 分析完成时间: {new Date().toLocaleString()}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(JSON.stringify(analysisData))}>
                <Copy className="h-4 w-4 mr-1" />
                复制
              </Button>
              <Button size="sm" onClick={downloadReport}>
                <Download className="h-4 w-4 mr-1" />
                下载报告
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <Badge variant="outline" className="bg-primary/10">
              {analysisData.fileType}
            </Badge>
            <Badge variant="outline">{analysisData.totalParts} 零件</Badge>
            <Badge variant="outline">{analysisData.totalAssemblies} 装配</Badge>
            <Badge variant="outline">{analysisData.totalLayers} 图层</Badge>
            <Badge variant="outline">{analysisData.materialCount} 材料</Badge>
            {analysisData.summary.issues.length > 0 && (
              <Badge variant="destructive">
                {analysisData.summary.issues.reduce((acc, issue) => acc + issue.count, 0)} 问题
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 mb-6">
              <TabsTrigger value="summary" className="flex items-center gap-1">
                <Info className="h-4 w-4" />
                <span className="hidden sm:inline">概述</span>
              </TabsTrigger>
              <TabsTrigger value="parts" className="flex items-center gap-1">
                <Layers className="h-4 w-4" />
                <span className="hidden sm:inline">零件</span>
              </TabsTrigger>
              <TabsTrigger value="materials" className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">材料</span>
              </TabsTrigger>
              <TabsTrigger value="recommendations" className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                <span className="hidden sm:inline">建议</span>
              </TabsTrigger>
              <TabsTrigger value="compliance" className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                <span className="hidden sm:inline">合规性</span>
              </TabsTrigger>
              <TabsTrigger value="3d-view" className="flex items-center gap-1">
                <Box className="h-4 w-4" />
                <span className="hidden sm:inline">3D视图</span>
              </TabsTrigger>
              {/* 2. 在TabsContent中添加新的性能分析标签页： */}
              <TabsTrigger value="performance" className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">性能分析</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">文件信息</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">文件名</dt>
                        <dd className="font-medium">{analysisData.fileName}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">文件大小</dt>
                        <dd className="font-medium">{analysisData.fileSize}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">文件类型</dt>
                        <dd className="font-medium">{analysisData.fileType}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">创建日期</dt>
                        <dd className="font-medium">{analysisData.createdDate}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">最后修改</dt>
                        <dd className="font-medium">{analysisData.lastModified}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">问题摘要</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analysisData.summary.issues.length > 0 ? (
                      <ul className="space-y-3">
                        {analysisData.summary.issues.map((issue, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <AlertCircle className={cn("h-5 w-5", getSeverityColor(issue.severity))} />
                            <span className="flex-1">{issue.message}</span>
                            <Badge className={getSeverityBadge(issue.severity)}>{issue.count}</Badge>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6">
                        <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-2" />
                        <p className="text-muted-foreground">未发现问题</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">装配概览</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analysisData.assemblies.map((assembly, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium flex items-center gap-2">
                            {assembly.issues > 0 && <AlertCircle className="h-4 w-4 text-destructive" />}
                            {assembly.name} <span className="text-muted-foreground text-sm">({assembly.id})</span>
                          </h4>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{assembly.parts} 零件</Badge>
                            <Badge variant="outline">{assembly.subAssemblies} 子装配</Badge>
                            {assembly.issues > 0 && <Badge variant="destructive">{assembly.issues} 问题</Badge>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">设备分布统计</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(analysisData.materials).map(([category, count], index) => (
                      <div key={index} className="text-center p-3 border rounded-lg">
                        <div className="text-2xl font-bold text-primary">{count}</div>
                        <div className="text-sm text-muted-foreground">{category}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="parts" className="space-y-4">
              <div className="flex flex-wrap gap-2 mb-4">
                <Select
                  value={filterOptions.category}
                  onValueChange={(value) => setFilterOptions((prev) => ({ ...prev, category: value }))}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="设备类别" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有类别</SelectItem>
                    <SelectItem value="surveillance">监控设备</SelectItem>
                    <SelectItem value="access_control">门禁设备</SelectItem>
                    <SelectItem value="fire_safety">消防设备</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filterOptions.severity}
                  onValueChange={(value) => setFilterOptions((prev) => ({ ...prev, severity: value }))}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="风险等级" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有等级</SelectItem>
                    <SelectItem value="critical">严重</SelectItem>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="low">低</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" size="sm" onClick={() => exportFilteredData()}>
                  导出筛选结果
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-1 border rounded-md text-sm"
                >
                  <option value="all">所有类别</option>
                  <option value="surveillance">监控设备</option>
                  <option value="access_control">门禁设备</option>
                  <option value="fire_safety">消防设备</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-1 border rounded-md text-sm"
                >
                  <option value="name">按名称排序</option>
                  <option value="risk">按风险排序</option>
                  <option value="category">按类别排序</option>
                </select>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showOnlyIssues}
                    onChange={(e) => setShowOnlyIssues(e.target.checked)}
                  />
                  仅显示有问题的项目
                </label>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">ID</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">名称</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">材料</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">重量</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">尺寸</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">问题</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {analysisData.parts.map((part, index) => (
                      <tr key={index} className={part.issues > 0 ? "bg-destructive/5" : ""}>
                        <td className="px-4 py-3 text-sm">{part.id}</td>
                        <td className="px-4 py-3 text-sm font-medium">{part.name}</td>
                        <td className="px-4 py-3 text-sm">{part.material}</td>
                        <td className="px-4 py-3 text-sm">{part.weight}</td>
                        <td className="px-4 py-3 text-sm">{part.dimensions}</td>
                        <td className="px-4 py-3 text-sm">
                          {part.issues > 0 ? (
                            <Badge variant="destructive">{part.issues}</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500">
                              无
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="materials" className="space-y-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">材料分布</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(analysisData.materials).map(([material, count], index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{material}</span>
                          <span className="font-medium">{count} 零件</span>
                        </div>
                        <Progress value={((count as number) / 156) * 100} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">材料成本分析</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="text-center text-muted-foreground">材料成本图表将在此显示</div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">优化建议</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {analysisData.recommendations.map((recommendation, index) => (
                      <AccordionItem key={index} value={`item-${index}`}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                            <span>建议 {index + 1}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="pl-7 pr-4 pb-2">
                            <p>{recommendation}</p>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">可制造性评分</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center py-6">
                    <div className="w-40 h-40 rounded-full border-8 border-primary flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-4xl font-bold">85</div>
                        <div className="text-sm text-muted-foreground">良好</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>材料选择</span>
                        <span className="font-medium">90%</span>
                      </div>
                      <Progress value={90} className="h-2" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>公差控制</span>
                        <span className="font-medium">75%</span>
                      </div>
                      <Progress value={75} className="h-2" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>装配性</span>
                        <span className="font-medium">85%</span>
                      </div>
                      <Progress value={85} className="h-2" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>成本效益</span>
                        <span className="font-medium">80%</span>
                      </div>
                      <Progress value={80} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="compliance" className="space-y-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">合规性评估</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">GB50348-2018 安全防范工程技术标准</h4>
                        <p className="text-sm text-muted-foreground">安防系统设计与施工规范</p>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-500">符合</Badge>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">GA/T75-1994 安全防范工程程序与要求</h4>
                        <p className="text-sm text-muted-foreground">工程实施程序规范</p>
                      </div>
                      <Badge variant="destructive">不符合</Badge>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">GB50116-2013 火灾自动报警系统设计规范</h4>
                        <p className="text-sm text-muted-foreground">消防报警系统标准</p>
                      </div>
                      <Badge className="bg-amber-500/10 text-amber-500">部分符合</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">合规性改进建议</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 border-l-4 border-l-destructive bg-destructive/5">
                      <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                      <div>
                        <h5 className="font-medium">设备安装高度不符合规范</h5>
                        <p className="text-sm text-muted-foreground">部分监控设备安装高度低于标准要求的3米</p>
                        <p className="text-xs text-muted-foreground mt-1">参考标准：GA/T75-1994</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 border-l-4 border-l-amber-500 bg-amber-500/5">
                      <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                      <div>
                        <h5 className="font-medium">应急照明配置不完整</h5>
                        <p className="text-sm text-muted-foreground">部分区域缺少应急照明设备</p>
                        <p className="text-xs text-muted-foreground mt-1">参考标准：GB50116-2013</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="3d-view" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    3D模型视图
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => reset3DView()}>
                        重置视角
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => export3DView()}>
                        导出视图
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[500px] border rounded-lg bg-muted/10 relative">
                    {/* 3D渲染容器 */}
                    <div id="cad-3d-viewer" className="w-full h-full" />

                    {/* 3D控制面板 */}
                    <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 space-y-2">
                      <Button variant="ghost" size="sm" onClick={() => rotate3DView("x")}>
                        旋转X轴
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => rotate3DView("y")}>
                        旋转Y轴
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => rotate3DView("z")}>
                        旋转Z轴
                      </Button>
                    </div>

                    {/* 设备信息面板 */}
                    {selectedDevice && (
                      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 max-w-sm">
                        <h4 className="font-medium mb-2">设备详情</h4>
                        {/* 显示选中设备的详细信息 */}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 2. 在TabsContent中添加新的性能分析标签页： */}
            <TabsContent value="performance" className="space-y-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">系统性能指标</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 border rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {result.statistics?.analysisTime?.toFixed(2) || "N/A"}s
                      </div>
                      <div className="text-sm text-muted-foreground">分析耗时</div>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {result.statistics?.accuracy?.toFixed(1) || "N/A"}%
                      </div>
                      <div className="text-sm text-muted-foreground">识别准确率</div>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {result.statistics?.confidence?.toFixed(1) || "N/A"}%
                      </div>
                      <div className="text-sm text-muted-foreground">置信度</div>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <div className="text-2xl font-bold text-primary">{result.statistics?.complexity || "N/A"}</div>
                      <div className="text-sm text-muted-foreground">复杂度</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  )
}
